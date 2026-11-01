import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createDesignerMcpServer, EDITOR_URI } from '../services/api/src/mcp.ts';

test('la ressource MCP livre le vrai build autonome, sans dépendance réseau de présentation', async (t) => {
  const html = readFileSync(fileURLToPath(new URL('../apps/editor-web/dist/index.html', import.meta.url)), 'utf8');
  assert.match(html, /<html[^>]*lang="fr"/);
  assert.match(html, /id="root"/);
  assert.doesNotMatch(html, /<script[^>]+\bsrc\s*=\s*["']/i);
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet["'][^>]*href=["'](?:https?:|\/)/i);
  assert.doesNotMatch(html, /url\(["']?(?:https?:|\/)[^)]+\.woff2?/i);
  const server = createDesignerMcpServer();
  const client = new Client({ name: 'm0-build-proof', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const response = await client.readResource({ uri: EDITOR_URI });
  assert.equal(response.contents[0]?.mimeType, 'text/html;profile=mcp-app');
  assert.equal(response.contents[0]?.text, html);
  assert.deepEqual((response.contents[0]?._meta?.ui as { csp: unknown }).csp, { connectDomains: [], resourceDomains: [] });
});
