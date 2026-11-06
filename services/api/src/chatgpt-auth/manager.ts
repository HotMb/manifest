import { createServer, type Server } from 'node:http';
import { createHash, randomBytes, timingSafeEqual, createPublicKey, verify as verifySignature } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChatGPTCredentialVault, StoredChatGPTCredentials, StoredChatGPTRegistration } from './vault.ts';

const ISSUER = 'https://auth.openai.com';
const RESOURCE = 'https://api.openai.com/v1';
const AUTHORIZE_ENDPOINT = `${ISSUER}/api/accounts/authorize`;
const TOKEN_ENDPOINT = `${ISSUER}/api/accounts/oauth/token`;
const DISCOVERY_ENDPOINT = `${ISSUER}/.well-known/openid-configuration`;
const REQUIRED_PLAN_SCOPES = ['resource.invoke', 'chatgpt.tokens.use.direct'] as const;
const REQUESTED_SCOPES = ['openid', 'profile', 'email', 'offline_access', ...REQUIRED_PLAN_SCOPES].join(' ');
const CALLBACK_PATH = '/auth/callback';
const CALLBACK_TTL_MS = 5 * 60_000;
const NETWORK_TIMEOUT_MS = 20_000;

export type ChatGPTAuthErrorCode =
  | 'unsupported_platform'
  | 'authorization_expired'
  | 'consent_denied'
  | 'invalid_callback'
  | 'invalid_token'
  | 'insufficient_scope'
  | 'network_error'
  | 'storage_error'
  | 'revocation_failed'
  | 'unknown';

export type ChatGPTAuthStatus = {
  status: 'disconnected' | 'pending' | 'connected' | 'unsupported' | 'error';
  usageMode: 'chatgpt-plan' | 'none';
  errorCode?: ChatGPTAuthErrorCode;
};

export type StartChatGPTSignInResult = {
  status: 'pending' | 'connected' | 'unsupported' | 'error';
  authorizationUrl?: string;
  expiresAt?: string;
  errorCode?: ChatGPTAuthErrorCode;
};

export type DisconnectChatGPTResult = {
  status: 'disconnected' | 'error';
  revocation: 'revoked' | 'failed' | 'not-connected';
  errorCode?: 'storage_error';
};

export type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type ChatGPTAuthManagerOptions = {
  vault?: ChatGPTCredentialVault;
  fetchImpl?: AuthFetch;
  localAppData?: string;
  supported?: boolean;
  now?: () => number;
  callbackPort?: number;
  hostId?: string;
};

type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string;
  jwks_uri: string;
};

type PendingAttempt = {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  requestedClientId: string;
  hostId: string;
  expiresAtMs: number;
  server: Server;
  authorizationUrl: string;
  timer: ReturnType<typeof setTimeout>;
  accepted?: boolean;
  cancelled?: boolean;
};

type TokenResponse = {
  id_token?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
  scope?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
};

class AuthFlowError extends Error {
  constructor(public readonly code: ChatGPTAuthErrorCode) { super(code); this.name = 'AuthFlowError'; }
}

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeToken = (value: unknown, max = 20_000): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\r\n\0]/.test(value);
const same = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
const randomUrlToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');
const pkceChallenge = (verifier: string): string => createHash('sha256').update(verifier, 'ascii').digest('base64url');
const formHeaders = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };

function genericHtml(message: string): string {
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Manifest</title><body><main><h1>Manifest</h1><p>${message}</p><p>Vous pouvez fermer cette fenêtre.</p></main></body></html>`;
}

async function readJson(response: Response, code: ChatGPTAuthErrorCode): Promise<Record<string, unknown>> {
  if (!response.ok) throw new AuthFlowError(code);
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > 1_000_000) throw new AuthFlowError(code);
  let value: unknown;
  try { value = await response.json(); } catch { throw new AuthFlowError(code); }
  if (!isRecord(value)) throw new AuthFlowError(code);
  return value;
}

async function verifyIdToken(
  token: string,
  clientId: string,
  nonce: string,
  discovery: Discovery,
  fetchImpl: AuthFetch,
  nowMs: number,
): Promise<string> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !part || part.length > 24_000)) throw new Error();
    const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8')) as unknown;
    const claims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as unknown;
    if (!isRecord(header) || !isRecord(claims) || header.alg !== 'RS256' || !safeToken(header.kid, 300)) throw new Error();
    const jwksResponse = await fetchImpl(discovery.jwks_uri, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS) });
    const jwks = await readJson(jwksResponse, 'network_error');
    if (!Array.isArray(jwks.keys) || jwks.keys.length > 50) throw new Error();
    const jwk = jwks.keys.find((key) => isRecord(key) && key.kid === header.kid && key.kty === 'RSA' && key.use !== 'enc' && (!key.alg || key.alg === 'RS256'));
    if (!isRecord(jwk)) throw new Error();
    const publicKey = createPublicKey({ key: jwk as import('node:crypto').JsonWebKey, format: 'jwk' });
    const signature = Buffer.from(parts[2]!, 'base64url');
    if (!verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, signature)) throw new Error();
    const audience = claims.aud;
    const audienceMatches = audience === clientId || (Array.isArray(audience) && audience.includes(clientId));
    const nowSeconds = Math.floor(nowMs / 1000);
    if (claims.iss !== discovery.issuer || !audienceMatches) throw new Error();
    if ((Array.isArray(audience) && audience.length > 1 && claims.azp !== clientId)
      || (claims.azp !== undefined && claims.azp !== clientId)) throw new Error();
    if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= nowSeconds) throw new Error();
    if (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf) || claims.nbf > nowSeconds)) throw new Error();
    if (claims.iat !== undefined && (typeof claims.iat !== 'number' || !Number.isFinite(claims.iat) || claims.iat > nowSeconds + 60)) throw new Error();
    if (claims.nonce !== nonce || !safeToken(claims.sub, 500)) throw new Error();
    return claims.sub;
  } catch (error) {
    if (error instanceof AuthFlowError) throw error;
    throw new AuthFlowError('invalid_token');
  }
}

export class ChatGPTAuthManager {
  private readonly fetchImpl: AuthFetch;
  private readonly now: () => number;
  private readonly localAppData?: string;
  private readonly supported: boolean;
  private readonly configuredVault?: ChatGPTCredentialVault;
  private readonly configuredHostId?: string;
  private credentials?: StoredChatGPTCredentials;
  private registration?: StoredChatGPTRegistration;
  private pending?: PendingAttempt;
  private refreshInFlight?: Promise<string>;
  private lastError?: ChatGPTAuthErrorCode;
  private callbackSuccess?: () => void;
  private initialized = false;

  constructor(options: ChatGPTAuthManagerOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as AuthFetch);
    this.now = options.now ?? Date.now;
    this.localAppData = options.localAppData ?? process.env.LOCALAPPDATA;
    this.configuredVault = options.vault;
    this.configuredHostId = options.hostId;
    this.supported = options.supported ?? (process.platform === 'win32' && Boolean(options.vault || this.localAppData));
    this.testCallbackPort = options.callbackPort;
  }

  private readonly testCallbackPort?: number;

  setOnChanged(callback: () => void): void { this.callbackSuccess = callback; }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!this.supported) { this.lastError = 'unsupported_platform'; return; }
    try {
      const credentials = await this.vault().load();
      const registration = await this.vault().loadRegistration();
      if (credentials && registration && credentials.clientId !== registration.clientId) throw new AuthFlowError('storage_error');
      this.credentials = credentials;
      this.registration = registration;
      this.lastError = undefined;
      this.initialized = true;
    } catch {
      this.credentials = undefined;
      this.registration = undefined;
      this.lastError = 'storage_error';
    }
  }

  getStatus(): ChatGPTAuthStatus {
    if (!this.supported) return { status: 'unsupported', usageMode: 'none', errorCode: 'unsupported_platform' };
    if (!this.initialized) return { status: 'disconnected', usageMode: 'none' };
    if (this.pending) return { status: 'pending', usageMode: this.canUseChatGPTPlan() ? 'chatgpt-plan' : 'none' };
    if (this.credentials) {
      const usageMode = this.canUseChatGPTPlan() ? 'chatgpt-plan' : 'none';
      return { status: 'connected', usageMode, ...(this.lastError ? { errorCode: this.lastError } : {}) };
    }
    if (this.lastError && this.lastError !== 'unsupported_platform') return { status: 'error', usageMode: 'none', errorCode: this.lastError };
    return { status: 'disconnected', usageMode: 'none' };
  }

  hasSavedRegistration(): boolean { return Boolean(this.registration); }

  private canUseChatGPTPlan(): boolean {
    const credentials = this.credentials;
    return Boolean(
      credentials?.accessToken
      && credentials.expiresAtMs > this.now() + 60_000
      && REQUIRED_PLAN_SCOPES.every((scope) => credentials.grantedScopes.includes(scope)),
    );
  }

  private hasChatGPTPlanScopes(): boolean {
    const credentials = this.credentials;
    return Boolean(credentials && REQUIRED_PLAN_SCOPES.every((scope) => credentials.grantedScopes.includes(scope)));
  }

  async startSignIn(): Promise<StartChatGPTSignInResult> {
    await this.initialize();
    if (!this.supported) return { status: 'unsupported', errorCode: 'unsupported_platform' };
    if (this.lastError === 'storage_error') return { status: 'error', errorCode: 'storage_error' };
    if (this.credentials && this.canUseChatGPTPlan()) return { status: 'connected' };
    if (this.pending) {
      return { status: 'pending', ...(!this.pending.accepted ? { authorizationUrl: this.pending.authorizationUrl } : {}), expiresAt: new Date(this.pending.expiresAtMs).toISOString() };
    }
    try {
      const hostId = await this.getHostId();
      const server = createServer();
      const pendingBase = {
        state: randomUrlToken(), nonce: randomUrlToken(), verifier: randomUrlToken(),
        requestedClientId: this.credentials?.clientId ?? this.registration?.clientId ?? 'dynamic_agent_client', hostId,
        expiresAtMs: this.now() + CALLBACK_TTL_MS, server,
      };
      await new Promise<void>((resolve, reject) => {
        server.once('error', () => reject(new AuthFlowError('network_error')));
        server.listen(this.testCallbackPort ?? 0, '127.0.0.1', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new AuthFlowError('network_error');
      const redirectUri = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`;
      const pending: PendingAttempt = { ...pendingBase, redirectUri, authorizationUrl: '', timer: setTimeout(() => this.expireAttempt(pendingBase.state), CALLBACK_TTL_MS) };
      pending.timer.unref?.();
      pending.authorizationUrl = this.buildAuthorizationUrl(pending);
      server.on('request', (request, response) => { void this.handleCallback(pending, request, response); });
      this.pending = pending;
      this.lastError = undefined;
      this.callbackSuccess?.();
      return { status: 'pending', authorizationUrl: pending.authorizationUrl, expiresAt: new Date(pending.expiresAtMs).toISOString() };
    } catch (error) {
      const code = this.errorCode(error);
      this.lastError = code;
      return { status: 'error', errorCode: code };
    }
  }

  private buildAuthorizationUrl(pending: PendingAttempt): string {
    const url = new URL(AUTHORIZE_ENDPOINT);
    url.searchParams.set('client_id', pending.requestedClientId);
    if (pending.requestedClientId === 'dynamic_agent_client') url.searchParams.set('agent_name_hint', 'Manifest');
    url.searchParams.set('ext_agent_host_id', pending.hostId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', pending.redirectUri);
    url.searchParams.set('scope', REQUESTED_SCOPES);
    url.searchParams.set('resource', RESOURCE);
    url.searchParams.set('state', pending.state);
    url.searchParams.set('nonce', pending.nonce);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', pkceChallenge(pending.verifier));
    return url.toString();
  }

  private async handleCallback(pending: PendingAttempt, request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse): Promise<void> {
    const headers = {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
    };
    const send = (status: number, message: string) => { if (!response.headersSent) { response.writeHead(status, headers); response.end(genericHtml(message)); } };
    if (this.pending !== pending) { send(410, 'Cette tentative de connexion n’est plus active.'); return; }
    if (pending.accepted) { send(410, 'Cette réponse de connexion a déjà été traitée.'); return; }
    if (request.method !== 'GET' || request.socket.remoteAddress?.replace(/^::ffff:/, '') !== '127.0.0.1') { send(400, 'La réponse de connexion n’est pas valide.'); return; }
    let callbackUrl: URL;
    try { callbackUrl = new URL(request.url ?? '', pending.redirectUri); } catch { send(400, 'La réponse de connexion n’est pas valide.'); return; }
    const expected = new URL(pending.redirectUri);
    const hostHeader = request.headers.host;
    const port = expected.port;
    if (callbackUrl.pathname !== CALLBACK_PATH || callbackUrl.host !== expected.host || hostHeader !== `127.0.0.1:${port}`) { send(404, 'La réponse de connexion n’est pas valide.'); return; }
    const query = callbackUrl.searchParams;
    if (['state', 'code', 'error', 'client_id'].some((key) => query.getAll(key).length > 1)) { send(400, 'La réponse de connexion n’est pas valide.'); return; }
    const state = query.get('state');
    if (!state || !same(state, pending.state)) { send(400, 'La réponse de connexion n’est pas valide.'); return; }
    const oauthError = query.get('error');
    const code = query.get('code');
    const issuedClientId = query.get('client_id');
    if (oauthError && oauthError !== 'access_denied') { send(400, 'La connexion n’a pas pu être terminée.'); this.finishAttempt(pending); this.lastError = 'invalid_callback'; this.callbackSuccess?.(); return; }
    if (oauthError === 'access_denied') {
      send(200, 'La connexion a été annulée.');
      this.finishAttempt(pending);
      this.lastError = this.credentials ? undefined : 'consent_denied';
      this.callbackSuccess?.();
      return;
    }
    if (!code || !safeToken(code, 4_000) || (pending.requestedClientId === 'dynamic_agent_client' && (!issuedClientId || issuedClientId === 'dynamic_agent_client')) || (issuedClientId && issuedClientId !== pending.requestedClientId && pending.requestedClientId !== 'dynamic_agent_client')) {
      send(400, 'La réponse de connexion n’est pas valide.');
      this.finishAttempt(pending);
      this.lastError = 'invalid_callback';
      this.callbackSuccess?.();
      return;
    }
    const clientId = pending.requestedClientId === 'dynamic_agent_client' ? issuedClientId! : pending.requestedClientId;
    if (!safeToken(clientId, 300) || clientId === 'dynamic_agent_client') {
      send(400, 'La réponse de connexion n’est pas valide.');
      this.finishAttempt(pending);
      this.lastError = 'invalid_callback';
      this.callbackSuccess?.();
      return;
    }
    send(200, 'Connexion terminée. Revenez dans Manifest.');
    pending.accepted = true;
    this.stopListener(pending);
    void this.completeAuthorization(pending, clientId, code).catch((error: unknown) => {
      this.finishAttempt(pending);
      this.lastError = this.errorCode(error);
      this.callbackSuccess?.();
    });
  }

  private finishAttempt(pending: PendingAttempt): void {
    if (this.pending === pending) this.pending = undefined;
    clearTimeout(pending.timer);
    this.stopListener(pending);
  }

  private stopListener(pending: PendingAttempt): void {
    clearTimeout(pending.timer);
    if (pending.server.listening) pending.server.close();
  }

  private expireAttempt(state: string): void {
    const pending = this.pending;
    if (!pending || pending.state !== state || pending.accepted) return;
    this.finishAttempt(pending);
    this.lastError = this.credentials ? undefined : 'authorization_expired';
    this.callbackSuccess?.();
  }

  private async completeAuthorization(pending: PendingAttempt, clientId: string, code: string): Promise<void> {
    const registration = { schemaVersion: 1 as const, clientId, hostId: pending.hostId };
    await this.vault().saveRegistration(registration);
    if (this.pending !== pending || pending.cancelled) return;
    this.registration = registration;
    const discovery = await this.getDiscovery();
    if (this.pending !== pending || pending.cancelled) return;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      code_verifier: pending.verifier,
      redirect_uri: pending.redirectUri,
      resource: RESOURCE,
    });
    const response = await this.fetchImpl(discovery.token_endpoint, {
      method: 'POST', headers: formHeaders, body: body.toString(), redirect: 'error', signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    }).catch(() => { throw new AuthFlowError('network_error'); });
    if (this.pending !== pending || pending.cancelled) return;
    const token = await readJson(response, response.status === 429 ? 'network_error' : 'invalid_token') as TokenResponse;
    if (!safeToken(token.id_token)) throw new AuthFlowError('invalid_token');
    if (this.credentials && this.credentials.clientId === clientId && this.credentials.subject) {
      const subject = await verifyIdToken(token.id_token, clientId, pending.nonce, discovery, this.fetchImpl, this.now());
      if (subject !== this.credentials.subject) throw new AuthFlowError('invalid_token');
    }
    const subject = await verifyIdToken(token.id_token, clientId, pending.nonce, discovery, this.fetchImpl, this.now());
    if (this.pending !== pending || pending.cancelled) return;
    const scopes = typeof token.scope === 'string' ? [...new Set(token.scope.split(/\s+/).filter(Boolean))].slice(0, 32) : [];
    const accessToken = safeToken(token.access_token) ? token.access_token : undefined;
    const refreshToken = safeToken(token.refresh_token) ? token.refresh_token : undefined;
    const expiresIn = typeof token.expires_in === 'number' && Number.isInteger(token.expires_in) && token.expires_in > 0 && token.expires_in <= 31_536_000 ? token.expires_in : 0;
    const next: StoredChatGPTCredentials = {
      schemaVersion: 1,
      clientId,
      subject,
      idToken: token.id_token,
      ...(accessToken ? { accessToken } : {}),
      ...(refreshToken ? { refreshToken } : {}),
      grantedScopes: scopes,
      expiresAtMs: accessToken && expiresIn ? this.now() + expiresIn * 1000 : 0,
      hostId: pending.hostId,
    };
    const previous = this.credentials;
    await this.vault().save(next);
    if (this.pending !== pending || pending.cancelled) {
      if (previous) await this.vault().save(previous);
      else await this.vault().clear();
      return;
    }
    this.credentials = next;
    this.lastError = this.canUseChatGPTPlan() ? undefined : 'insufficient_scope';
    this.finishAttempt(pending);
    this.callbackSuccess?.();
  }

  async getAccessToken(): Promise<string> {
    await this.initialize();
    if (!this.hasChatGPTPlanScopes() || !this.credentials?.accessToken) throw new AuthFlowError('insufficient_scope');
    if (this.credentials.expiresAtMs > this.now() + 60_000) return this.credentials.accessToken;
    if (!this.credentials.refreshToken) throw new AuthFlowError('authorization_expired');
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshCredentials().finally(() => { this.refreshInFlight = undefined; });
    }
    return this.refreshInFlight;
  }

  private async refreshCredentials(): Promise<string> {
    const credentials = this.credentials;
    if (!credentials?.refreshToken || !credentials.accessToken) throw new AuthFlowError('authorization_expired');
    const discovery = await this.getDiscovery();
    const response = await this.fetchImpl(discovery.token_endpoint, {
      method: 'POST', headers: formHeaders,
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: credentials.clientId, refresh_token: credentials.refreshToken, resource: RESOURCE }).toString(),
      redirect: 'error', signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    }).catch(() => { throw new AuthFlowError('network_error'); });
    const token = await readJson(response, response.status === 401 || response.status === 400 ? 'authorization_expired' : 'network_error') as TokenResponse;
    const accessToken = safeToken(token.access_token) ? token.access_token : undefined;
    const refreshToken = safeToken(token.refresh_token) ? token.refresh_token : credentials.refreshToken;
    const expiresIn = typeof token.expires_in === 'number' && Number.isInteger(token.expires_in) && token.expires_in > 0 && token.expires_in <= 31_536_000 ? token.expires_in : 0;
    if (!accessToken || !expiresIn) throw new AuthFlowError('invalid_token');
    const scopes = typeof token.scope === 'string' ? [...new Set(token.scope.split(/\s+/).filter(Boolean))].slice(0, 32) : credentials.grantedScopes;
    if (!REQUIRED_PLAN_SCOPES.every((scope) => scopes.includes(scope))) {
      this.lastError = 'insufficient_scope';
      throw new AuthFlowError('insufficient_scope');
    }
    const next: StoredChatGPTCredentials = { ...credentials, accessToken, refreshToken, grantedScopes: scopes, expiresAtMs: this.now() + expiresIn * 1000 };
    await this.vault().save(next);
    this.credentials = next;
    this.lastError = undefined;
    this.callbackSuccess?.();
    return accessToken;
  }

  async getVisibleModels(): Promise<Array<{ id: string; label: string }>> {
    const token = await this.getAccessToken();
    const response = await this.fetchImpl(`${RESOURCE}/models`, {
      method: 'GET', headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    }).catch(() => { throw new AuthFlowError('network_error'); });
    const payload = await readJson(response, response.status === 401 ? 'authorization_expired' : 'network_error');
    if (!Array.isArray(payload.models)) throw new AuthFlowError('network_error');
    const models: Array<{ id: string; label: string }> = [];
    for (const candidate of payload.models) {
      if (!isRecord(candidate) || candidate.visibility !== 'list' || !safeToken(candidate.slug, 200) || typeof candidate.display_name !== 'string') continue;
      const label = candidate.display_name.trim();
      if (!label || label.length > 160 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(candidate.slug)) continue;
      models.push({ id: candidate.slug, label });
      if (models.length >= 100) break;
    }
    return models;
  }

  async getStatusAndRefresh(): Promise<ChatGPTAuthStatus> {
    await this.initialize();
    if (!this.hasChatGPTPlanScopes()) return this.getStatus();
    try { await this.getAccessToken(); return this.getStatus(); }
    catch (error) { this.lastError = this.errorCode(error); return this.getStatus(); }
  }

  async disconnect(): Promise<DisconnectChatGPTResult> {
    await this.initialize();
    if (this.pending) this.finishAttempt(this.pending);
    const credentials = this.credentials;
    if (!credentials) {
      this.lastError = undefined;
      this.callbackSuccess?.();
      return { status: 'disconnected', revocation: 'not-connected' };
    }
    let revocation: DisconnectChatGPTResult['revocation'] = 'failed';
    try {
      if (credentials.refreshToken) {
        const discovery = await this.getDiscovery();
        const result = await this.fetchImpl(discovery.revocation_endpoint, {
          method: 'POST', headers: formHeaders,
          body: new URLSearchParams({ token: credentials.refreshToken, token_type_hint: 'refresh_token', client_id: credentials.clientId }).toString(),
          redirect: 'error', signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
        });
        if (result.status === 200) revocation = 'revoked';
      } else revocation = 'failed';
    } catch { revocation = 'failed'; }
    try { await this.vault().clear(); }
    catch {
      this.lastError = 'storage_error';
      this.callbackSuccess?.();
      return { status: 'error', revocation: 'failed', errorCode: 'storage_error' };
    }
    this.credentials = undefined;
    this.lastError = undefined;
    this.callbackSuccess?.();
    return { status: 'disconnected', revocation };
  }

  async cancelSignIn(): Promise<{ status: 'disconnected' }> {
    await this.initialize();
    if (this.pending) {
      this.pending.cancelled = true;
      this.finishAttempt(this.pending);
    }
    this.lastError = undefined;
    this.callbackSuccess?.();
    return { status: 'disconnected' };
  }

  private async getDiscovery(): Promise<Discovery> {
    const response = await this.fetchImpl(DISCOVERY_ENDPOINT, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS) }).catch(() => { throw new AuthFlowError('network_error'); });
    const value = await readJson(response, 'network_error');
    if (value.issuer !== ISSUER || value.authorization_endpoint !== AUTHORIZE_ENDPOINT || value.token_endpoint !== TOKEN_ENDPOINT || typeof value.revocation_endpoint !== 'string' || typeof value.jwks_uri !== 'string') throw new AuthFlowError('network_error');
    const revocation = new URL(value.revocation_endpoint);
    const jwks = new URL(value.jwks_uri);
    if (revocation.protocol !== 'https:' || revocation.hostname !== 'auth.openai.com' || jwks.protocol !== 'https:' || jwks.hostname !== 'auth.openai.com') throw new AuthFlowError('network_error');
    return value as Discovery;
  }

  private async getHostId(): Promise<string> {
    if (this.configuredHostId && /^urn:uuid:[0-9a-f-]{36}$/i.test(this.configuredHostId)) return this.configuredHostId;
    if (this.credentials?.hostId && /^urn:uuid:[0-9a-f-]{36}$/i.test(this.credentials.hostId)) return this.credentials.hostId;
    if (this.registration?.hostId && /^urn:uuid:[0-9a-f-]{36}$/i.test(this.registration.hostId)) return this.registration.hostId;
    if (!this.localAppData) throw new AuthFlowError('storage_error');
    const directory = join(this.localAppData, 'Manifest');
    const file = join(directory, 'chatgpt-host-id.txt');
    try {
      const existing = (await readFile(file, 'utf8')).trim();
      if (/^urn:uuid:[0-9a-f-]{36}$/i.test(existing)) return existing;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new AuthFlowError('storage_error');
    }
    const hostId = `urn:uuid:${randomBytes(16).toString('hex').replace(/^([a-f0-9]{8})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{12})$/, '$1-$2-$3-$4-$5')}`;
    try {
      await mkdir(directory, { recursive: true });
      const temporary = `${file}.${randomUrlToken(8)}.tmp`;
      await writeFile(temporary, `${hostId}\n`, { encoding: 'utf8', flag: 'wx' });
      try { await rename(temporary, file); }
      catch { await import('node:fs/promises').then(({ unlink }) => unlink(temporary)).catch(() => {}); }
      const persisted = (await readFile(file, 'utf8')).trim();
      if (!/^urn:uuid:[0-9a-f-]{36}$/i.test(persisted)) throw new Error();
      return persisted;
    } catch { throw new AuthFlowError('storage_error'); }
  }

  private vault(): ChatGPTCredentialVault {
    if (this.configuredVault) return this.configuredVault;
    throw new AuthFlowError('unsupported_platform');
  }

  private errorCode(error: unknown): ChatGPTAuthErrorCode {
    return error instanceof AuthFlowError ? error.code : 'unknown';
  }
}

export const chatGPTAuthConstants = {
  issuer: ISSUER,
  authorizeEndpoint: AUTHORIZE_ENDPOINT,
  tokenEndpoint: TOKEN_ENDPOINT,
  discoveryEndpoint: DISCOVERY_ENDPOINT,
  resource: RESOURCE,
  requestedScopes: REQUESTED_SCOPES,
  requiredPlanScopes: REQUIRED_PLAN_SCOPES,
  callbackPath: CALLBACK_PATH,
} as const;

export const authTestHelpers = { pkceChallenge, verifyIdToken };
