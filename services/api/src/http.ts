import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createDesignerMcpServer } from './mcp.ts';
import { MemoryProjectStore } from './domain.ts';

const MAX_BODY_BYTES = 65_536;
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(value));
}
function validToken(header: string | undefined, expected: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  const provided = Buffer.from(header.slice(7)), secret = Buffer.from(expected);
  return provided.length === secret.length && timingSafeEqual(provided, secret);
}
async function readBody(req: IncomingMessage): Promise<unknown> {
  const declared = Number(req.headers['content-length']);
  if (declared > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
    chunks.push(bytes);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('INVALID_JSON'); }
}

/** Loopback-only bearer-authenticated development transport, explicitly not OAuth. */
export function createDesignerHttpServer(options: { token: string; store?: MemoryProjectStore; htmlPath?: string }) {
  if (options.token.length < 32 || /\s/.test(options.token)) throw new Error('M0_ACCESS_TOKEN doit contenir au moins 32 caractères sans espace.');
  const store = options.store ?? new MemoryProjectStore();
  return createServer(async (req, res) => {
    const host = req.headers.host;
    const port = (req.socket.localAddress && req.socket.localPort) || 0;
    if (!host || ![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) { json(res, 403, { code: 'FORBIDDEN', message: 'Hôte local attendu.' }); return; }
    const allowedOrigins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) { json(res, 403, { code: 'FORBIDDEN', message: 'Origine non autorisée.' }); return; }
    const url = new URL(req.url ?? '/', `http://${host}`);
    if (req.method === 'GET' && url.pathname === '/health') { json(res, 200, { status: 'ok', mode: 'memory-m0', productionReady: false }); return; }
    if (url.pathname !== '/mcp') { json(res, 404, { code: 'NOT_FOUND' }); return; }
    if (!validToken(req.headers.authorization, options.token)) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="design-workbench-m0"');
      json(res, 401, { code: 'UNAUTHENTICATED', message: 'Jeton de développement requis.' }); return;
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); json(res, 405, { code: 'METHOD_NOT_ALLOWED' }); return; }
    const contentType = req.headers['content-type']?.split(';')[0]?.trim();
    if (contentType !== 'application/json') { json(res, 415, { code: 'INVALID_INPUT', message: 'JSON attendu.' }); return; }
    let body: unknown;
    try { body = await readBody(req); }
    catch (error) { json(res, error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 400, { code: 'INVALID_INPUT', message: 'Corps JSON invalide ou trop volumineux.' }); return; }
    const server = createDesignerMcpServer({ store, htmlPath: options.htmlPath });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) json(res, 500, { code: 'INTERNAL_ERROR' });
      else if (!res.writableEnded) res.end();
    }
  });
}
