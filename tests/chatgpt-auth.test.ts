import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authTestHelpers, ChatGPTAuthManager, chatGPTAuthConstants } from '../services/api/src/chatgpt-auth/manager.ts';
import type { AuthFetch } from '../services/api/src/chatgpt-auth/manager.ts';
import { WindowsDpapiChatGPTCredentialVault, type ChatGPTCredentialVault, type StoredChatGPTCredentials, type StoredChatGPTRegistration } from '../services/api/src/chatgpt-auth/vault.ts';

const hostId = 'urn:uuid:123e4567-e89b-12d3-a456-426614174000';
const clientId = 'oaiapp_manifest_test';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const exportedJwk = publicKey.export({ format: 'jwk' });
const jwk = { ...exportedJwk, kid: 'manifest-test-key', alg: 'RS256', use: 'sig' };

class MemoryVault implements ChatGPTCredentialVault {
  credentials?: StoredChatGPTCredentials;
  registration?: StoredChatGPTRegistration;
  events: string[] = [];
  failClear = false;
  failLoad = false;
  async load() { if (this.failLoad) throw new Error('vault unavailable'); return this.credentials ? structuredClone(this.credentials) : undefined; }
  async save(credentials: StoredChatGPTCredentials) { this.events.push('credentials'); this.credentials = structuredClone(credentials); }
  async clear() { if (this.failClear) throw new Error('vault locked'); this.credentials = undefined; }
  async loadRegistration() { return this.registration ? structuredClone(this.registration) : undefined; }
  async saveRegistration(registration: StoredChatGPTRegistration) { this.events.push('registration'); this.registration = structuredClone(registration); }
  async clearRegistration() { this.registration = undefined; }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function discovery() {
  return new Response(JSON.stringify({
    issuer: chatGPTAuthConstants.issuer,
    authorization_endpoint: chatGPTAuthConstants.authorizeEndpoint,
    token_endpoint: chatGPTAuthConstants.tokenEndpoint,
    revocation_endpoint: 'https://auth.openai.com/api/accounts/oauth/revoke',
    jwks_uri: 'https://auth.openai.com/.well-known/jwks.json',
  }), { status: 200 });
}

function signedIdToken(nonce: string, audience = clientId, nowMs = Date.now(), extraClaims: Record<string, unknown> = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: chatGPTAuthConstants.issuer,
    aud: audience,
    sub: 'subject-test-opaque',
    nonce,
    iat: Math.floor(nowMs / 1000),
    exp: Math.floor(nowMs / 1000) + 3600,
    ...extraClaims,
  })).toString('base64url');
  const signingInput = `${header}.${claims}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), privateKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

function tokenResponse(nonce: string, scope = chatGPTAuthConstants.requestedScopes, nowMs = Date.now()) {
  return new Response(JSON.stringify({
    id_token: signedIdToken(nonce, clientId, nowMs),
    access_token: 'access-token-test',
    refresh_token: 'refresh-token-test',
    token_type: 'Bearer',
    expires_in: 3600,
    scope,
  }), { status: 200 });
}

async function beginCallback(manager: ChatGPTAuthManager, params: Record<string, string>) {
  const started = await manager.startSignIn();
  assert.equal(started.status, 'pending');
  assert.ok(started.authorizationUrl);
  const authorizationUrl = new URL(started.authorizationUrl!);
  const callback = new URL(authorizationUrl.searchParams.get('redirect_uri')!);
  for (const [key, value] of Object.entries({ state: authorizationUrl.searchParams.get('state')!, ...params })) callback.searchParams.set(key, value);
  return { started, authorizationUrl, callback, response: await fetch(callback) };
}

async function waitUntil(predicate: () => boolean, message: string) {
  for (let i = 0; i < 100; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail(message);
}

function fakeAuthFetch(options: {
  vault?: MemoryVault;
  onToken?: (body: URLSearchParams) => Promise<Response> | Response;
  onModels?: () => Response;
  onRevocation?: () => Response;
  onDiscovery?: () => Response;
  onJwks?: () => Response;
} = {}): AuthFetch {
  return async (url, init = {}) => {
    if (url === chatGPTAuthConstants.discoveryEndpoint) return options.onDiscovery?.() ?? discovery();
    if (url === 'https://auth.openai.com/.well-known/jwks.json') return options.onJwks?.() ?? new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    if (url === chatGPTAuthConstants.tokenEndpoint) {
      const body = new URLSearchParams(String(init.body ?? ''));
      if (body.get('grant_type') === 'authorization_code' && options.vault?.events.at(-1) !== 'registration') {
        return new Response(JSON.stringify({ error: 'registration was not saved first' }), { status: 500 });
      }
      if (options.onToken) return options.onToken(body);
      const nonce = activeNonce;
      return tokenResponse(nonce);
    }
    if (url === `${chatGPTAuthConstants.resource}/models`) return options.onModels?.() ?? new Response(JSON.stringify({ models: [] }), { status: 200 });
    if (url === 'https://auth.openai.com/api/accounts/oauth/revoke') return options.onRevocation?.() ?? new Response('', { status: 200 });
    throw new Error(`Unexpected test URL: ${url}`);
  };
}

let activeNonce = '';

test('plateforme non prise en charge retourne un état explicite sans persistance', async () => {
  const manager = new ChatGPTAuthManager({ supported: false });
  await manager.initialize();
  assert.deepEqual(manager.getStatus(), { status: 'unsupported', usageMode: 'none', errorCode: 'unsupported_platform' });
  assert.deepEqual(await manager.startSignIn(), { status: 'unsupported', errorCode: 'unsupported_platform' });
});

test('le coffre Windows chiffre les jetons factices avec DPAPI et les relit pour le compte courant', { skip: process.platform !== 'win32' }, async () => {
  const localAppData = await mkdtemp(join(tmpdir(), 'manifest-dpapi-test-'));
  const vault = new WindowsDpapiChatGPTCredentialVault(localAppData);
  const credentials: StoredChatGPTCredentials = {
    schemaVersion: 1, clientId, subject: 'subject-test-opaque', idToken: 'fixture-id-token-not-real',
    accessToken: 'fixture-access-token-not-real', refreshToken: 'fixture-refresh-token-not-real',
    grantedScopes: chatGPTAuthConstants.requestedScopes.split(' '), expiresAtMs: Date.now() + 60_000, hostId,
  };
  const registration: StoredChatGPTRegistration = { schemaVersion: 1, clientId, hostId };
  try {
    await vault.save(credentials);
    await vault.saveRegistration(registration);
    const ciphertext = await readFile(join(localAppData, 'Manifest', 'chatgpt-session.dpapi'), 'utf8');
    assert.doesNotMatch(ciphertext, /fixture-(?:id|access|refresh)-token-not-real/);
    assert.deepEqual(await vault.load(), credentials);
    assert.deepEqual(await vault.loadRegistration(), registration);
    await vault.clear();
    await vault.clearRegistration();
    assert.equal(await vault.load(), undefined);
    assert.equal(await vault.loadRegistration(), undefined);
  } finally {
    await rm(localAppData, { recursive: true, force: true });
  }
});

test('l’URL d’autorisation utilise les scopes SIWC, PKCE et loopback, sans id_token_hint', async () => {
  const vault = new MemoryVault();
  vault.registration = { schemaVersion: 1, clientId, hostId };
  vault.credentials = { schemaVersion: 1, clientId, subject: 'subject-test-opaque', idToken: 'private-id-token', grantedScopes: ['openid'], expiresAtMs: 0, hostId };
  const manager = new ChatGPTAuthManager({ vault, supported: true, hostId, fetchImpl: fakeAuthFetch() });
  await manager.initialize();
  const started = await manager.startSignIn();
  assert.equal(started.status, 'pending');
  const url = new URL(started.authorizationUrl!);
  assert.equal(url.origin, 'https://auth.openai.com');
  assert.equal(url.pathname, '/api/accounts/authorize');
  assert.equal(url.searchParams.get('client_id'), clientId);
  assert.equal(url.searchParams.get('ext_agent_host_id'), hostId);
  assert.equal(url.searchParams.get('resource'), chatGPTAuthConstants.resource);
  assert.equal(url.searchParams.get('redirect_uri')?.startsWith('http://127.0.0.1:'), true);
  assert.equal(new URL(url.searchParams.get('redirect_uri')!).pathname, '/auth/callback');
  assert.equal(url.searchParams.get('scope'), chatGPTAuthConstants.requestedScopes);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('code_challenge')?.length, 43);
  assert.equal(url.searchParams.has('id_token_hint'), false);
  assert.doesNotMatch(JSON.stringify(started), /private-id-token|access-token|refresh-token/);
  await manager.cancelSignIn();
});

test('la validation OIDC refuse un azp incohérent et les claims temporels mal formés', async () => {
  const now = Date.now();
  const tokenCases = [
    signedIdToken('nonce-test', clientId, now, { azp: 'different-client' }),
    signedIdToken('nonce-test', clientId, now, { nbf: 'not-a-date' }),
    signedIdToken('nonce-test', clientId, now, { iat: 'not-a-date' }),
  ];
  const discoveryDocument = {
    issuer: chatGPTAuthConstants.issuer,
    authorization_endpoint: chatGPTAuthConstants.authorizeEndpoint,
    token_endpoint: chatGPTAuthConstants.tokenEndpoint,
    revocation_endpoint: 'https://auth.openai.com/api/accounts/oauth/revoke',
    jwks_uri: 'https://auth.openai.com/.well-known/jwks.json',
  };
  for (const token of tokenCases) {
    await assert.rejects(
      authTestHelpers.verifyIdToken(token, clientId, 'nonce-test', discoveryDocument, async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }), now),
      /invalid_token/,
    );
  }
});

test('la registration est persistée avant l’échange et seuls les modèles visibility=list sont publiés', async () => {
  const vault = new MemoryVault();
  let tokenExchangeBody: URLSearchParams | undefined;
  const manager = new ChatGPTAuthManager({
    vault, supported: true, hostId,
    fetchImpl: async (url, init = {}) => {
      if (url === chatGPTAuthConstants.discoveryEndpoint) return discovery();
      if (url === chatGPTAuthConstants.tokenEndpoint) {
        tokenExchangeBody = new URLSearchParams(String(init.body));
        assert.equal(vault.events.at(-1), 'registration');
        activeNonce = nonceFromRedirect;
        return tokenResponse(activeNonce);
      }
      if (url === 'https://auth.openai.com/.well-known/jwks.json') return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
      if (url === `${chatGPTAuthConstants.resource}/models`) return new Response(JSON.stringify({ models: [
        { slug: 'gpt-visible', display_name: 'Visible GPT', visibility: 'list' },
        { slug: 'gpt-private', display_name: 'Hidden GPT', visibility: 'private' },
      ] }), { status: 200 });
      throw new Error(`Unexpected test URL: ${url}`);
    },
  });
  const started = await manager.startSignIn();
  const authorize = new URL(started.authorizationUrl!);
  const redirect = new URL(authorize.searchParams.get('redirect_uri')!);
  nonceFromRedirect = authorize.searchParams.get('nonce')!;
  redirect.searchParams.set('state', authorize.searchParams.get('state')!);
  redirect.searchParams.set('code', 'one-time-code-test');
  redirect.searchParams.set('client_id', clientId);
  const callbackResponse = await fetch(redirect);
  assert.equal(callbackResponse.status, 200);
  await waitUntil(() => manager.getStatus().status === 'connected', 'OAuth callback did not finish');
  assert.equal(vault.registration?.clientId, clientId);
  assert.ok(vault.credentials?.accessToken);
  assert.equal(tokenExchangeBody?.get('client_id'), clientId);
  assert.equal(tokenExchangeBody?.get('grant_type'), 'authorization_code');
  assert.equal(tokenExchangeBody?.get('resource'), chatGPTAuthConstants.resource);
  const verifier = tokenExchangeBody?.get('code_verifier') ?? '';
  assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url'), authorize.searchParams.get('code_challenge'));
  assert.deepEqual(manager.getStatus(), { status: 'connected', usageMode: 'chatgpt-plan' });
  assert.deepEqual(await manager.getVisibleModels(), [{ id: 'gpt-visible', label: 'Visible GPT' }]);
});

let nonceFromRedirect = '';

test('un consentement sans permission de forfait garde une identité mais bloque l’inférence', async () => {
  const vault = new MemoryVault();
  const manager = new ChatGPTAuthManager({
    vault, supported: true, hostId,
    fetchImpl: async (url, init = {}) => {
      if (url === chatGPTAuthConstants.discoveryEndpoint) return discovery();
      if (url === chatGPTAuthConstants.tokenEndpoint) return tokenResponse(nonceFromRedirect, 'openid profile email');
      if (url === 'https://auth.openai.com/.well-known/jwks.json') return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
      throw new Error(`Unexpected test URL: ${url}`);
    },
  });
  const started = await manager.startSignIn();
  const authorize = new URL(started.authorizationUrl!);
  nonceFromRedirect = authorize.searchParams.get('nonce')!;
  const callback = new URL(authorize.searchParams.get('redirect_uri')!);
  callback.searchParams.set('state', authorize.searchParams.get('state')!);
  callback.searchParams.set('code', 'one-time-code-test');
  callback.searchParams.set('client_id', clientId);
  assert.equal((await fetch(callback)).status, 200);
  await waitUntil(() => manager.getStatus().status === 'connected', 'identity-only callback did not finish');
  assert.deepEqual(manager.getStatus(), { status: 'connected', usageMode: 'none', errorCode: 'insufficient_scope' });
  await assert.rejects(manager.getAccessToken(), /insufficient_scope/);
});

test('les refresh simultanés sont sérialisés et remplacent le jeton de rotation', async () => {
  const vault = new MemoryVault();
  const now = Date.now();
  vault.registration = { schemaVersion: 1, clientId, hostId };
  vault.credentials = {
    schemaVersion: 1, clientId, subject: 'subject-test-opaque', idToken: 'stored-id-token', accessToken: 'old-access', refreshToken: 'old-refresh',
    grantedScopes: chatGPTAuthConstants.requestedScopes.split(' '), expiresAtMs: now + 1_000, hostId,
  };
  const gate = deferred<Response>();
  let tokenCalls = 0;
  const manager = new ChatGPTAuthManager({
    vault, supported: true, hostId, now: () => now,
    fetchImpl: async (url) => {
      if (url === chatGPTAuthConstants.discoveryEndpoint) return discovery();
      if (url === chatGPTAuthConstants.tokenEndpoint) { tokenCalls += 1; return gate.promise; }
      throw new Error(`Unexpected test URL: ${url}`);
    },
  });
  await manager.initialize();
  const first = manager.getAccessToken();
  const second = manager.getAccessToken();
  await waitUntil(() => tokenCalls === 1, 'refresh request was not started');
  gate.resolve(new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'rotated-refresh', expires_in: 3600 }), { status: 200 }));
  assert.deepEqual(await Promise.all([first, second]), ['new-access', 'new-access']);
  assert.equal(tokenCalls, 1);
  assert.equal(vault.credentials?.accessToken, 'new-access');
  assert.equal(vault.credentials?.refreshToken, 'rotated-refresh');
});

test('un jeton expiré ne reste pas annoncé comme utilisable et le statut tente son refresh', async () => {
  const vault = new MemoryVault();
  const now = Date.now();
  vault.credentials = {
    schemaVersion: 1, clientId, subject: 'subject-test-opaque', idToken: 'stored-id-token', accessToken: 'expired-access', refreshToken: 'refresh-token-test',
    grantedScopes: chatGPTAuthConstants.requestedScopes.split(' '), expiresAtMs: now - 1, hostId,
  };
  vault.registration = { schemaVersion: 1, clientId, hostId };
  const manager = new ChatGPTAuthManager({
    vault, supported: true, hostId, now: () => now,
    fetchImpl: async (url) => {
      if (url === chatGPTAuthConstants.discoveryEndpoint) return discovery();
      if (url === chatGPTAuthConstants.tokenEndpoint) return new Response(JSON.stringify({ access_token: 'refreshed-access', refresh_token: 'rotated-refresh', expires_in: 3600 }), { status: 200 });
      throw new Error(`Unexpected test URL: ${url}`);
    },
  });
  await manager.initialize();
  assert.deepEqual(manager.getStatus(), { status: 'connected', usageMode: 'none' });
  assert.deepEqual(await manager.getStatusAndRefresh(), { status: 'connected', usageMode: 'chatgpt-plan' });
  assert.equal(vault.credentials?.accessToken, 'refreshed-access');
  assert.equal(vault.credentials?.refreshToken, 'rotated-refresh');
});

test('une portée retirée au refresh bloque l’inférence et ne sauvegarde pas le nouveau jeton', async () => {
  const vault = new MemoryVault();
  const now = Date.now();
  vault.credentials = {
    schemaVersion: 1, clientId, subject: 'subject-test-opaque', idToken: 'stored-id-token', accessToken: 'expired-access', refreshToken: 'refresh-token-test',
    grantedScopes: chatGPTAuthConstants.requestedScopes.split(' '), expiresAtMs: now - 1, hostId,
  };
  vault.registration = { schemaVersion: 1, clientId, hostId };
  const original = structuredClone(vault.credentials);
  const manager = new ChatGPTAuthManager({
    vault, supported: true, hostId, now: () => now,
    fetchImpl: async (url) => {
      if (url === chatGPTAuthConstants.discoveryEndpoint) return discovery();
      if (url === chatGPTAuthConstants.tokenEndpoint) return new Response(JSON.stringify({ access_token: 'reduced-scope-access', refresh_token: 'rotated-refresh', expires_in: 3600, scope: 'openid profile email' }), { status: 200 });
      throw new Error(`Unexpected test URL: ${url}`);
    },
  });
  await manager.initialize();
  await assert.rejects(manager.getAccessToken(), /insufficient_scope/);
  assert.deepEqual(vault.credentials, original);
  assert.notEqual(manager.getStatus().usageMode, 'chatgpt-plan');
});

test('une erreur temporaire du coffre peut être retentée sans redémarrer le gestionnaire', async () => {
  const vault = new MemoryVault();
  vault.failLoad = true;
  const manager = new ChatGPTAuthManager({ vault, supported: true, hostId, fetchImpl: fakeAuthFetch() });
  assert.deepEqual(await manager.startSignIn(), { status: 'error', errorCode: 'storage_error' });
  vault.failLoad = false;
  assert.equal((await manager.startSignIn()).status, 'pending');
  await manager.cancelSignIn();
});

test('un coffre qui refuse son effacement ne confirme pas la déconnexion', async () => {
  const vault = new MemoryVault();
  vault.credentials = {
    schemaVersion: 1, clientId, subject: 'subject-test-opaque', idToken: 'stored-id-token', accessToken: 'access', refreshToken: 'refresh',
    grantedScopes: chatGPTAuthConstants.requestedScopes.split(' '), expiresAtMs: Date.now() + 120_000, hostId,
  };
  vault.failClear = true;
  const manager = new ChatGPTAuthManager({ vault, supported: true, hostId, fetchImpl: fakeAuthFetch() });
  await manager.initialize();
  assert.deepEqual(await manager.disconnect(), { status: 'error', revocation: 'failed', errorCode: 'storage_error' });
  assert.ok(vault.credentials);
  assert.equal(manager.getStatus().usageMode, 'chatgpt-plan');
  vault.failClear = false;
  assert.deepEqual(await manager.disconnect(), { status: 'disconnected', revocation: 'revoked' });
  assert.equal(vault.credentials, undefined);
});

test('annuler pendant l’échange empêche la sauvegarde tardive des jetons', async () => {
  const vault = new MemoryVault();
  const gate = deferred<Response>();
  const manager = new ChatGPTAuthManager({
    vault, supported: true, hostId,
    fetchImpl: async (url, init = {}) => {
      if (url === chatGPTAuthConstants.discoveryEndpoint) return discovery();
      if (url === chatGPTAuthConstants.tokenEndpoint) return gate.promise;
      if (url === 'https://auth.openai.com/.well-known/jwks.json') return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
      throw new Error(`Unexpected test URL: ${url}`);
    },
  });
  const started = await manager.startSignIn();
  const authorize = new URL(started.authorizationUrl!);
  nonceFromRedirect = authorize.searchParams.get('nonce')!;
  const callback = new URL(authorize.searchParams.get('redirect_uri')!);
  callback.searchParams.set('state', authorize.searchParams.get('state')!);
  callback.searchParams.set('code', 'one-time-code-test');
  callback.searchParams.set('client_id', clientId);
  assert.equal((await fetch(callback)).status, 200);
  await waitUntil(() => vault.events.includes('registration'), 'client registration was not persisted');
  await manager.cancelSignIn();
  gate.resolve(tokenResponse(nonceFromRedirect));
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(vault.credentials, undefined);
  assert.equal(manager.getStatus().status, 'disconnected');
});

test('disconnect efface la session locale même si la révocation échoue', async () => {
  const vault = new MemoryVault();
  vault.registration = { schemaVersion: 1, clientId, hostId };
  vault.credentials = {
    schemaVersion: 1, clientId, subject: 'subject-test-opaque', idToken: 'stored-id-token', accessToken: 'access', refreshToken: 'refresh',
    grantedScopes: chatGPTAuthConstants.requestedScopes.split(' '), expiresAtMs: Date.now() + 60_000, hostId,
  };
  const manager = new ChatGPTAuthManager({ vault, supported: true, hostId, fetchImpl: fakeAuthFetch({ onRevocation: () => new Response(JSON.stringify({ secret: 'ignored' }), { status: 503 }) }) });
  await manager.initialize();
  assert.deepEqual(await manager.disconnect(), { status: 'disconnected', revocation: 'failed' });
  assert.equal(vault.credentials, undefined);
  assert.deepEqual(manager.getStatus(), { status: 'disconnected', usageMode: 'none' });
});

test('les erreurs OAuth sont génériques et le statut ne divulgue jamais les credentials', async () => {
  const vault = new MemoryVault();
  const manager = new ChatGPTAuthManager({ vault, supported: true, hostId, fetchImpl: async () => new Response(JSON.stringify({ private: 'do-not-return' }), { status: 500 }) });
  const started = await manager.startSignIn();
  assert.equal(started.status, 'pending');
  const authorize = new URL(started.authorizationUrl!);
  const callback = new URL(authorize.searchParams.get('redirect_uri')!);
  callback.searchParams.set('state', 'attacker-state');
  callback.searchParams.set('code', 'bad-code');
  assert.equal((await fetch(callback)).status, 400);
  const status = manager.getStatus();
  assert.equal(status.status, 'pending');
  assert.doesNotMatch(JSON.stringify(status), /private|do-not-return|token-test/);
  await manager.cancelSignIn();
});
