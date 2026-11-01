import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDesignerMcpServer } from './mcp.ts';
import { createDesignerHttpServer } from './http.ts';

if (process.argv.includes('--stdio')) {
  await createDesignerMcpServer().connect(new StdioServerTransport());
  console.error('Design Workbench M0 : transport stdio local, stockage éphémère.');
} else {
  const token = process.env.M0_ACCESS_TOKEN;
  if (!token) throw new Error('Configurer M0_ACCESS_TOKEN hors Git avant de démarrer le transport HTTP. Aucun jeton n’est généré ou affiché automatiquement.');
  const port = Number(process.env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT invalide.');
  const server = createDesignerHttpServer({ token });
  server.listen(port, '127.0.0.1', () => console.error(`Design Workbench M0 disponible sur http://127.0.0.1:${port}/mcp ; stockage éphémère, aucune API fournisseur.`));
  const shutdown = () => { server.close(); server.closeAllConnections(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
