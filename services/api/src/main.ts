import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDesignerMcpServer } from './mcp.ts';
import { createDesignerHttpServer } from './http.ts';
import { MemoryProjectStore } from './domain.ts';
import { createSuggestionRuntime } from './provider-runtime.ts';
import { ChatGPTAuthManager } from './chatgpt-auth/manager.ts';
import { createWindowsDpapiVault } from './chatgpt-auth/vault.ts';

const store = new MemoryProjectStore();

if (process.argv.includes('--stdio')) {
  let chatgptAuth: ChatGPTAuthManager;
  try { chatgptAuth = new ChatGPTAuthManager({ vault: createWindowsDpapiVault() }); }
  catch { chatgptAuth = new ChatGPTAuthManager({ supported: false }); }
  await chatgptAuth.initialize();
  const suggestionJobs = createSuggestionRuntime(store, process.env, undefined, chatgptAuth);
  await createDesignerMcpServer({
    store,
    suggestionJobs,
    chatgptAuth,
    ...(suggestionJobs ? { refreshProviderRegistry: () => suggestionJobs.refreshProviderRegistry() } : {}),
  }).connect(new StdioServerTransport());
  console.error(`Manifest M0 : transport stdio local, stockage éphémère, connexion ChatGPT disponible sur demande${suggestionJobs ? ', propositions de modèle activées' : ''}.`);
} else {
  const token = process.env.M0_ACCESS_TOKEN;
  if (!token) throw new Error('Configurer M0_ACCESS_TOKEN hors Git avant de démarrer le transport HTTP. Aucun jeton n’est généré ou affiché automatiquement.');
  const port = Number(process.env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT invalide.');
  const suggestionJobs = createSuggestionRuntime(store);
  const server = createDesignerHttpServer({ token, store, suggestionJobs });
  server.listen(port, '127.0.0.1', () => console.error(`Manifest M0 disponible sur http://127.0.0.1:${port}/mcp ; stockage éphémère${suggestionJobs ? ', suggestions fournisseur configurées' : ', aucune API fournisseur'}.`));
  const shutdown = () => { server.close(); server.closeAllConnections(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
