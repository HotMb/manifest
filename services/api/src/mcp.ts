import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { PROJECT_ID } from '@design-workbench/m0-contract';
import type { M0Project, M0CommandResult } from '@design-workbench/m0-contract';
import { MemoryProjectStore, publicError } from './domain.ts';
import { SuggestionJobException, type SuggestionJobManager } from './suggestion-jobs.ts';

export const EDITOR_URI = 'ui://design/editor.html';
const defaultHtmlPath = fileURLToPath(new URL('../../../apps/editor-web/dist/index.html', import.meta.url));
const Id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
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
const jobEvent = z.object({ jobId: Id, seq: z.number().int().positive(), type: z.enum(['queued', 'started', 'progress', 'proposal_ready', 'usage', 'succeeded', 'failed', 'cancelled', 'outcome_unknown']), timestamp: z.string(), data: z.record(z.string(), z.unknown()) }).strict();
const eventPage = z.object({ events: z.array(jobEvent).max(100), nextSeq: z.number().int().nonnegative(), state: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled', 'outcome_unknown']) }).strict();
const proposalOutput = z.object({ id: Id, jobId: Id, generationId: Id, editorSessionId: Id, intentEpoch: z.number().int().nonnegative(), baseDraftVersion: z.number().int().nonnegative(), mode: z.enum(['direct', 'alternatives']), operations: z.array(z.unknown()).min(1).max(100), explanation: z.string().min(1).max(1000), status: z.enum(['ready', 'kept', 'rejected', 'stale']) }).strict();

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

export function createDesignerMcpServer(options: { store?: MemoryProjectStore; htmlPath?: string; suggestionJobs?: SuggestionJobManager } = {}) {
  const store = options.store ?? new MemoryProjectStore();
  const htmlPath = options.htmlPath ?? defaultHtmlPath;
  const server = new McpServer({ name: 'design-workbench-m0', version: '0.0.0' }, {
    instructions: options.suggestionJobs
      ? 'Prototype local de qualification. Ouvrez open_designer pour modifier le bloc Hero. Les suggestions sont des propositions en mémoire ; elles ne modifient jamais le brouillon sans une action explicite. Le stockage des jobs est éphémère.'
      : 'Prototype local de qualification. Ouvrez open_designer pour modifier le bloc Hero. Les outils de données ne rouvrent pas la vue. Stockage éphémère en mémoire : aucune IA, approbation, export ou identité OAuth de production.',
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
    description: 'Ouvre le prototype local à un bloc. Les changements sont en mémoire et ne constituent pas une approbation.',
    inputSchema: z.object({}).strict(),
    outputSchema: summarySchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: EDITOR_URI } },
  }, async () => reply(store.read(PROJECT_ID)));
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
  }
  return server;
}
