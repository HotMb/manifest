import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { PROJECT_ID } from '@design-workbench/m0-contract';
import type { M0Project, M0CommandResult } from '@design-workbench/m0-contract';
import { MemoryProjectStore, publicError } from './domain.ts';

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
  const safe = publicError(error);
  return { isError: true, content: [{ type: 'text' as const, text: `${safe.code}: ${safe.message}` }], _meta: { error: safe } };
}

export function createDesignerMcpServer(options: { store?: MemoryProjectStore; htmlPath?: string } = {}) {
  const store = options.store ?? new MemoryProjectStore();
  const htmlPath = options.htmlPath ?? defaultHtmlPath;
  const server = new McpServer({ name: 'design-workbench-m0', version: '0.0.0' }, {
    instructions: 'Prototype local de qualification. Ouvrez open_designer pour modifier le bloc Hero. Les outils de données ne rouvrent pas la vue. Stockage éphémère en mémoire : aucune IA, approbation, export ou identité OAuth de production.',
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
  return server;
}
