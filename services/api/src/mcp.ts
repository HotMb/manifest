import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { PROJECT_ID, disconnectedProviderRegistry, MAX_LAUNCH_TEXT_LENGTH, validateEditorLaunchContext } from '@design-workbench/m0-contract';
import type { M0Project, M0CommandResult } from '@design-workbench/m0-contract';
import { MemoryProjectStore, publicError } from './domain.ts';
import { SuggestionJobException, type SuggestionJobManager } from './suggestion-jobs.ts';
import type { ChatGPTAuthManager } from './chatgpt-auth/manager.ts';

export const EDITOR_URI = 'ui://design/editor.html';
const defaultHtmlPath = fileURLToPath(new URL('../../../apps/editor-web/dist/index.html', import.meta.url));
const Id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const launchInput = z.object({
  userRequest: z.string().min(1).max(MAX_LAUNCH_TEXT_LENGTH).refine((value) => Boolean(value.trim())).optional().describe('Demande déjà envoyée par l’utilisateur, à préremplir dans Manifest. Ne pas inclure de texte non envoyé ni de secrets.'),
  assistantProposal: z.string().min(1).max(MAX_LAUNCH_TEXT_LENGTH).refine((value) => Boolean(value.trim())).optional().describe('Proposition de page déjà formulée par l’assistant, si elle existe. Ne pas en inventer une.'),
  backgroundColor: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional().describe('Couleur de fond explicitement demandée, au format #RRGGBB ; noir = #000000. Prévisualisée sans remplacer le brouillon.'),
}).strict();
const summarySchema = z.object({
  projectId: Id,
  draftVersion: z.number().int().nonnegative(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  storage: z.literal('memory-m0'),
  revisionId: z.null(),
  receiptId: z.string().nullable(),
}).strict();
const commandInput = z.object({
  projectId: Id,
  expectedDraftVersion: z.number().int().nonnegative(),
  idempotencyKey: Id,
  action: z.literal('apply_ops'),
  payload: z.object({ operations: z.array(z.unknown()).min(1).max(100) }).strict(),
}).strict();
const suggestionInput = z.object({
  projectId: Id,
  idempotencyKey: Id,
  expectedDraftVersion: z.number().int().nonnegative(),
  editorSessionId: Id,
  intentEpoch: z.number().int().nonnegative(),
  intent: z.string().min(1).max(12_000),
  provider: z.enum(['openai', 'anthropic', 'google', 'deepseek', 'custom']),
  model: z.string().min(1).max(200),
  mode: z.enum(['auto', 'direct', 'alternatives']),
  selectedPageId: Id,
  selectedBlockId: Id.nullable(),
}).strict();
const jobError = z.object({ code: z.string(), message: z.string(), requestId: Id, retryable: z.boolean(), details: z.record(z.string(), z.unknown()) }).strict();
const jobOutput = z.object({ jobId: Id, projectId: Id, type: z.literal('suggestion'), state: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled', 'outcome_unknown']), lastSeq: z.number().int().nonnegative(), proposalIds: z.array(Id).max(3), artifactId: Id.nullable(), error: jobError.nullable() }).strict();
const jobEvent = z.object({ jobId: Id, seq: z.number().int().positive(), type: z.enum(['queued', 'started', 'progress', 'proposal_ready', 'proposal_stale', 'usage', 'succeeded', 'failed', 'cancelled', 'outcome_unknown', 'proposal_kept', 'proposal_rejected']), timestamp: z.string(), data: z.record(z.string(), z.unknown()) }).strict();
const eventPage = z.object({ events: z.array(jobEvent).max(100), nextSeq: z.number().int().nonnegative(), state: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled', 'outcome_unknown']) }).strict();
const proposalOutput = z.object({ id: Id, jobId: Id, generationId: Id, editorSessionId: Id, intentEpoch: z.number().int().nonnegative(), baseDraftVersion: z.number().int().nonnegative(), mode: z.enum(['direct', 'alternatives']), operations: z.array(z.unknown()).min(1).max(100), explanation: z.string().min(1).max(1000), status: z.enum(['ready', 'kept', 'rejected', 'stale']) }).strict();
const providerRegistryOutput = z.object({
  schemaVersion: z.literal(1),
  providers: z.array(z.object({
    id: z.enum(['openai', 'anthropic', 'google', 'deepseek', 'custom']),
    label: z.string().min(1).max(120),
    protocol: z.enum(['openai-responses', 'anthropic-messages', 'google-generate-content', 'openai-compatible']),
    status: z.enum(['disconnected', 'configured', 'disabled', 'error']),
    models: z.array(z.object({
      id: z.string().min(1).max(200), label: z.string().min(1).max(160),
      providerId: z.enum(['openai', 'anthropic', 'google', 'deepseek', 'custom']),
      capabilities: z.array(z.enum(['structured-output', 'streaming', 'vision', 'tool-calling', 'code-generation'])),
      limits: z.object({ requestsPerMinute: z.number().positive().optional(), inputTokensPerMinute: z.number().positive().optional(), contextWindowTokens: z.number().positive().optional(), maxOutputTokens: z.number().positive().optional() }).strict().optional(),
      pricing: z.object({ currency: z.enum(['USD', 'EUR']), inputPerMillionTokens: z.number().positive().optional(), outputPerMillionTokens: z.number().positive().optional(), estimatedOnly: z.literal(true) }).strict().optional(),
    }).strict()).max(100),
    supportsBYOK: z.boolean(), secretConfigured: z.boolean(),
    errorCode: z.enum(['MISSING_CREDENTIAL', 'UNAUTHORIZED', 'RATE_LIMITED', 'UNAVAILABLE', 'UNKNOWN']).optional(),
  }).strict()).max(5),
}).strict();
const decisionOutput = z.object({ proposal: proposalOutput, project: z.object({ projectId: Id, draftVersion: z.number().int().nonnegative(), contentHash: z.string().regex(/^[a-f0-9]{64}$/), snapshot: z.unknown() }).strict() }).strict();
const authErrorCode = z.enum(['unsupported_platform', 'authorization_expired', 'consent_denied', 'invalid_callback', 'invalid_token', 'insufficient_scope', 'network_error', 'storage_error', 'revocation_failed', 'unknown']);
const startChatGPTSignInOutput = z.object({ status: z.enum(['pending', 'connected', 'unsupported', 'error']), authorizationUrl: z.string().url().optional(), expiresAt: z.string().datetime().optional(), errorCode: authErrorCode.optional() }).strict();
const chatGPTAuthStatusOutput = z.object({ status: z.enum(['disconnected', 'pending', 'connected', 'unsupported', 'error']), usageMode: z.enum(['chatgpt-plan', 'none']), errorCode: authErrorCode.optional() }).strict();
const disconnectChatGPTOutput = z.union([
  z.object({ status: z.literal('disconnected'), revocation: z.enum(['revoked', 'failed', 'not-connected']) }).strict(),
  z.object({ status: z.literal('error'), revocation: z.literal('failed'), errorCode: z.literal('storage_error') }).strict(),
]);
const cancelChatGPTSignInOutput = z.object({ status: z.literal('disconnected') }).strict();

function reply(project: M0Project | M0CommandResult) {
  return {
    content: [{ type: 'text' as const, text: `Projet ${project.projectId}, brouillon ${project.draftVersion}. Prototype M0 en mémoire ; aucune révision approuvée ni export.` }],
    structuredContent: {
      projectId: project.projectId,
      draftVersion: project.draftVersion,
      contentHash: project.contentHash,
      storage: 'memory-m0' as const,
      revisionId: null,
      receiptId: 'receiptId' in project ? project.receiptId : null,
    },
    _meta: { project },
  };
}
function failure(error: unknown) {
  const safe = error instanceof SuggestionJobException
    ? { code: error.code, message: error.message, requestId: `request-${randomUUID()}`, retryable: error.retryable, details: {} }
    : publicError(error);
  return { isError: true, content: [{ type: 'text' as const, text: `${safe.code}: ${safe.message}` }], _meta: { error: safe } };
}

export function createDesignerMcpServer(options: { store?: MemoryProjectStore; htmlPath?: string; suggestionJobs?: SuggestionJobManager; chatgptAuth?: ChatGPTAuthManager; refreshProviderRegistry?: () => Promise<void> } = {}) {
  if (options.suggestionJobs && (!options.store || !options.suggestionJobs.usesProjectStore(options.store))) throw new Error('Le serveur MCP et les suggestions doivent partager le même store de projet.');
  const store = options.store ?? new MemoryProjectStore();
  const htmlPath = options.htmlPath ?? defaultHtmlPath;
  const server = new McpServer({ name: 'manifest-m0', version: '0.0.0' }, {
    instructions: options.suggestionJobs
      ? 'Ouvrez open_designer en transmettant uniquement la demande utilisateur déjà envoyée dans userRequest. Si userRequest et assistantProposal sont tous deux fournis, userRequest est prioritaire ; transmettez assistantProposal seulement si une proposition existe déjà, ne l’inventez jamais. Sans demande ni proposition, ouvrez Manifest avec le champ vide et le canevas blanc. Manifest ne lit pas la conversation. Les suggestions sont des propositions en mémoire ; elles ne modifient jamais le brouillon sans action explicite.'
      : 'Ouvrez open_designer en transmettant uniquement la demande utilisateur déjà envoyée dans userRequest. Si userRequest et assistantProposal sont tous deux fournis, userRequest est prioritaire ; transmettez assistantProposal seulement si une proposition existe déjà, ne l’inventez jamais. Sans demande ni proposition, ouvrez Manifest avec le champ vide et le canevas blanc. Manifest ne lit pas la conversation. Les outils de données ne rouvrent pas la vue. Stockage éphémère en mémoire : aucune IA, approbation, export ou identité OAuth de production.',
  });
  registerAppResource(server, 'design-editor', EDITOR_URI, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
    contents: [{
      uri: EDITOR_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: await readFile(htmlPath, 'utf8'),
      _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } } },
    }],
  }));
  registerAppTool(server, 'open_designer', {
    title: 'Ouvrir l’atelier de design',
    description: 'Ouvre l’espace Manifest. Transmets la demande utilisateur explicitement envoyée dans userRequest ; si userRequest et assistantProposal sont tous deux fournis, Manifest privilégie userRequest. Transmets assistantProposal uniquement si elle a déjà été formulée, sans l’inventer. Sans demande ni proposition, le champ reste vide et le canevas reste blanc. backgroundColor ne change que si une couleur est explicitement demandée. Le lancement ne remplace pas le brouillon et ne lance pas de modèle.',
    inputSchema: launchInput,
    outputSchema: summarySchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: EDITOR_URI } },
  }, async (input) => {
    const project = store.read(PROJECT_ID);
    const result = reply(project);
    if (!Object.values(input).some((value) => value !== undefined)) return result;
    const launchContext = { id: `launch-${randomUUID()}`, projectId: PROJECT_ID, baseDraftVersion: project.draftVersion, ...input };
    validateEditorLaunchContext(launchContext);
    return { ...result, _meta: { ...result._meta, launchContext } };
  });
  registerAppTool(server, 'read_project', {
    title: 'Lire le brouillon',
    description: 'Lit le brouillon autorisé de la vue, sans ouvrir un nouvel éditeur.',
    inputSchema: z.object({ projectId: Id }).strict(),
    outputSchema: summarySchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async ({ projectId }) => {
    try { return reply(store.read(projectId)); } catch (error) { return failure(error); }
  });
  registerAppTool(server, 'commit_commands', {
    title: 'Enregistrer le brouillon M0',
    description: 'Applique atomiquement le lot manuel autorisé avec contrôle de version et de clé d’idempotence. Aucune approbation ou génération.',
    inputSchema: commandInput,
    outputSchema: summarySchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async (command) => {
    try { return reply(store.commit(command)); } catch (error) { return failure(error); }
  });
  registerAppTool(server, 'get_provider_registry', {
    title: 'Lire les fournisseurs configurés',
    description: 'Retourne le catalogue public des fournisseurs et modèles actifs dans cet atelier. Ne divulgue aucune clé ni valeur dérivée du secret.',
    inputSchema: z.object({}).strict(),
    outputSchema: providerRegistryOutput,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async () => {
    await options.refreshProviderRegistry?.();
    const registry = options.suggestionJobs?.getProviderRegistry() ?? disconnectedProviderRegistry();
    return { content: [{ type: 'text' as const, text: `${registry.providers.length} fournisseur(s) configuré(s).` }], structuredContent: registry, _meta: { registry } };
  });
  if (options.chatgptAuth) {
    const auth = options.chatgptAuth;
    registerAppTool(server, 'start_chatgpt_sign_in', {
      title: 'Connecter ChatGPT',
      description: 'Prépare une connexion Sign in with ChatGPT pour l’usage de forfait local. Affiche l’URL d’autorisation comme lien; l’utilisateur choisit lui-même de l’ouvrir. Ne retourne aucun jeton ni identité.',
      inputSchema: z.object({}).strict(),
      outputSchema: startChatGPTSignInOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: { ui: { visibility: ['app'] } },
    }, async () => {
      const result = await auth.startSignIn();
      const message = result.status === 'pending' ? 'Autorisation prête. Ouvre le lien pour continuer.' : result.status === 'connected' ? 'ChatGPT est déjà connecté.' : 'La connexion ChatGPT n’a pas démarré.';
      return { content: [{ type: 'text' as const, text: message }], structuredContent: result };
    });
    registerAppTool(server, 'get_chatgpt_auth_status', {
      title: 'Lire la connexion ChatGPT',
      description: 'Retourne uniquement l’état générique et le mode d’usage autorisé; aucun profil, jeton ou donnée de compte.',
      inputSchema: z.object({}).strict(),
      outputSchema: chatGPTAuthStatusOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['app'] } },
    }, async () => {
      const result = await auth.getStatusAndRefresh();
      return { content: [{ type: 'text' as const, text: `Connexion ChatGPT: ${result.status}; mode ${result.usageMode}.` }], structuredContent: result };
    });
    registerAppTool(server, 'cancel_chatgpt_sign_in', {
      title: 'Annuler la connexion ChatGPT',
      description: 'Ferme le callback loopback actif et invalide state/PKCE. Tout callback reçu ensuite est refusé.',
      inputSchema: z.object({}).strict(),
      outputSchema: cancelChatGPTSignInOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['app'] } },
    }, async () => {
      const result = await auth.cancelSignIn();
      return { content: [{ type: 'text' as const, text: 'Connexion annulée.' }], structuredContent: result };
    });
    registerAppTool(server, 'disconnect_chatgpt', {
      title: 'Déconnecter ChatGPT',
      description: 'Tente la révocation de la session puis efface localement les jetons. Si la révocation distante échoue, le statut local reste déconnecté.',
      inputSchema: z.object({}).strict(),
      outputSchema: disconnectChatGPTOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: { ui: { visibility: ['app'] } },
    }, async () => {
      const result = await auth.disconnect();
      const text = result.status === 'error'
        ? 'Échec de la suppression locale des identifiants. La connexion n’a pas été déconnectée.'
        : result.revocation === 'revoked'
          ? 'Connexion locale supprimée et révocation confirmée.'
          : result.revocation === 'failed'
            ? 'Connexion locale supprimée; la révocation distante n’a pas été confirmée.'
            : 'Aucune connexion ChatGPT active.';
      return { content: [{ type: 'text' as const, text }], structuredContent: result };
    });
  }
  if (options.suggestionJobs) {
    const suggestionJobs = options.suggestionJobs;
    registerAppTool(server, 'start_suggestion', {
      title: 'Proposer des réglages de design',
      description: 'Démarre une suggestion sur une version précise du brouillon. Retourne immédiatement un job ; la proposition ne sauvegarde jamais le brouillon.',
      inputSchema: suggestionInput,
      outputSchema: jobOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: { ui: { visibility: ['app'] } },
    }, async ({ projectId, ...input }) => {
      try {
        const job = suggestionJobs.start(projectId, input);
        return { content: [{ type: 'text' as const, text: `Suggestion ${job.state} (${job.jobId}).` }], structuredContent: job, _meta: { job } };
      } catch (error) { return failure(error); }
    });
    registerAppTool(server, 'get_job', {
      title: 'Lire l’état de la suggestion',
      description: 'Retourne le statut courant d’un job de suggestion.',
      inputSchema: z.object({ jobId: Id }).strict(),
      outputSchema: jobOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['app'] } },
    }, async ({ jobId }) => {
      try { const job = suggestionJobs.get(jobId); return { content: [{ type: 'text' as const, text: `Suggestion ${job.state} (${job.jobId}).` }], structuredContent: job, _meta: { job } }; }
      catch (error) { return failure(error); }
    });
    registerAppTool(server, 'get_job_updates', {
      title: 'Lire les événements de suggestion',
      description: 'Retourne un nombre borné d’événements après un curseur séquentiel.',
      inputSchema: z.object({ jobId: Id, afterSeq: z.number().int().nonnegative().default(0), limit: z.number().int().min(1).max(100).default(50) }).strict(),
      outputSchema: eventPage,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['app'] } },
    }, async ({ jobId, afterSeq, limit }) => {
      try { const page = suggestionJobs.getUpdates(jobId, afterSeq, limit); return { content: [{ type: 'text' as const, text: `${page.events.length} événement(s), état ${page.state}.` }], structuredContent: page, _meta: { page } }; }
      catch (error) { return failure(error); }
    });
    registerAppTool(server, 'cancel_job', {
      title: 'Annuler la suggestion',
      description: 'Annule idempotemment un job non terminal. Le fournisseur peut déjà avoir commencé à traiter la demande.',
      inputSchema: z.object({ jobId: Id }).strict(),
      outputSchema: jobOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: { ui: { visibility: ['app'] } },
    }, async ({ jobId }) => {
      try { const job = suggestionJobs.cancel(jobId); return { content: [{ type: 'text' as const, text: `Suggestion ${job.state} (${job.jobId}).` }], structuredContent: job, _meta: { job } }; }
      catch (error) { return failure(error); }
    });
    registerAppTool(server, 'read_proposal', {
      title: 'Lire la proposition',
      description: 'Lit une proposition complète réservée à la vue après son événement.',
      inputSchema: z.object({ proposalId: Id }).strict(),
      outputSchema: proposalOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['app'] } },
    }, async ({ proposalId }) => {
      try { const proposal = suggestionJobs.readProposal(proposalId); return { content: [{ type: 'text' as const, text: `Proposition ${proposal.status} (${proposal.id}).` }], structuredContent: proposal, _meta: { proposal } }; }
      catch (error) { return failure(error); }
    });
    registerAppTool(server, 'mark_proposal_stale', {
      title: 'Marquer la proposition comme ancienne',
      description: 'Rend une proposition non applicable lorsque la description ou le brouillon change, sans décider de la conserver ou de la rejeter.',
      inputSchema: z.object({ proposalId: Id }).strict(),
      outputSchema: proposalOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['app'] } },
    }, async ({ proposalId }) => {
      try {
        const proposal = suggestionJobs.markProposalStale(proposalId);
        return { content: [{ type: 'text' as const, text: `Proposition marquée comme ancienne (${proposal.id}).` }], structuredContent: proposal, _meta: { proposal } };
      } catch (error) { return failure(error); }
    });
    registerAppTool(server, 'keep_proposal', {
      title: 'Conserver la proposition',
      description: 'Applique une proposition prête à sa version source, avec contrôle de version et reçu idempotent. Ne l’exporte pas et ne crée pas de révision approuvée.',
      inputSchema: z.object({ proposalId: Id }).strict(),
      outputSchema: decisionOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['app'] } },
    }, async ({ proposalId }) => {
      try {
        const result = suggestionJobs.keepProposal(proposalId);
        return { content: [{ type: 'text' as const, text: `Proposition conservée dans le brouillon v${result.project.draftVersion}.` }], structuredContent: result, _meta: result };
      } catch (error) { return failure(error); }
    });
    registerAppTool(server, 'reject_proposal', {
      title: 'Ignorer la proposition',
      description: 'Marque comme ignorée une proposition encore accessible, sans modifier le brouillon.',
      inputSchema: z.object({ proposalId: Id }).strict(),
      outputSchema: proposalOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { ui: { visibility: ['app'] } },
    }, async ({ proposalId }) => {
      try {
        const proposal = suggestionJobs.rejectProposal(proposalId);
        return { content: [{ type: 'text' as const, text: `Proposition ignorée (${proposal.id}).` }], structuredContent: proposal, _meta: { proposal } };
      } catch (error) { return failure(error); }
    });
  }
  return server;
}
