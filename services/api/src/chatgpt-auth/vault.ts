import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';

export type StoredChatGPTCredentials = {
  schemaVersion: 1;
  clientId: string;
  subject: string;
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  grantedScopes: string[];
  expiresAtMs: number;
  hostId: string;
};

export type StoredChatGPTRegistration = { schemaVersion: 1; clientId: string; hostId: string };

export interface ChatGPTCredentialVault {
  load(): Promise<StoredChatGPTCredentials | undefined>;
  save(credentials: StoredChatGPTCredentials): Promise<void>;
  clear(): Promise<void>;
  loadRegistration(): Promise<StoredChatGPTRegistration | undefined>;
  saveRegistration(registration: StoredChatGPTRegistration): Promise<void>;
  clearRegistration(): Promise<void>;
}

export class CredentialVaultUnavailableError extends Error {
  constructor() { super('Le coffre local sécurisé n’est pas disponible.'); this.name = 'CredentialVaultUnavailableError'; }
}

const protectScript = [
  "$ErrorActionPreference='Stop'",
  "$plain=[Console]::In.ReadToEnd()",
  "if ([string]::IsNullOrWhiteSpace($plain)) { exit 2 }",
  "$secure=ConvertTo-SecureString $plain -AsPlainText -Force",
  "[Console]::Out.Write((ConvertFrom-SecureString $secure))",
].join('; ');

const unprotectScript = [
  "$ErrorActionPreference='Stop'",
  "$cipher=[Console]::In.ReadToEnd()",
  "if ([string]::IsNullOrWhiteSpace($cipher)) { exit 2 }",
  "$secure=ConvertTo-SecureString $cipher",
  "$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)",
  "try { [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)) }",
  "finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }",
].join('\n');

function runPowerShell(script: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      // The desktop host can inject user or bundled PowerShell modules that
      // redefine security type data. Restrict this sensitive helper to the
      // Windows in-box modules used for DPAPI.
      env: {
        ...process.env,
        PSModulePath: join(process.env.SystemRoot ?? process.env.WINDIR ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'Modules'),
      },
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { output += chunk; });
    child.once('error', () => reject(new CredentialVaultUnavailableError()));
    child.once('close', (code) => {
      if (code !== 0 || !output.trim()) reject(new CredentialVaultUnavailableError());
      else resolve(output.trim());
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input, 'utf8');
  });
}

function validCredentials(value: unknown): value is StoredChatGPTCredentials {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.schemaVersion === 1
    && typeof record.clientId === 'string' && record.clientId.length > 0 && record.clientId.length <= 300
    && typeof record.subject === 'string' && record.subject.length > 0 && record.subject.length <= 500
    && typeof record.idToken === 'string' && record.idToken.length > 0 && record.idToken.length <= 20_000
    && (record.accessToken === undefined || (typeof record.accessToken === 'string' && record.accessToken.length > 0 && record.accessToken.length <= 20_000))
    && (record.refreshToken === undefined || (typeof record.refreshToken === 'string' && record.refreshToken.length > 0 && record.refreshToken.length <= 20_000))
    && Array.isArray(record.grantedScopes) && record.grantedScopes.length <= 32
    && record.grantedScopes.every((scope) => typeof scope === 'string' && scope.length > 0 && scope.length <= 160)
    && Number.isSafeInteger(record.expiresAtMs) && Number(record.expiresAtMs) >= 0
    && typeof record.hostId === 'string' && /^urn:uuid:[0-9a-f-]{36}$/i.test(record.hostId);
}

/** Windows current-user DPAPI vault. The ciphertext is stored outside the plugin/repository. */
export class WindowsDpapiChatGPTCredentialVault implements ChatGPTCredentialVault {
  private readonly filePath: string;
  private readonly registrationFilePath: string;

  constructor(localAppData = process.env.LOCALAPPDATA) {
    if (process.platform !== 'win32' || !localAppData) throw new CredentialVaultUnavailableError();
    this.filePath = join(localAppData, 'Manifest', 'chatgpt-session.dpapi');
    this.registrationFilePath = join(localAppData, 'Manifest', 'chatgpt-registration.dpapi');
  }

  async load(): Promise<StoredChatGPTCredentials | undefined> {
    let ciphertext: string;
    try { ciphertext = (await readFile(this.filePath, 'utf8')).trim(); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw new CredentialVaultUnavailableError();
    }
    if (!ciphertext || ciphertext.length > 100_000) throw new CredentialVaultUnavailableError();
    const plaintext = await runPowerShell(unprotectScript, ciphertext);
    let parsed: unknown;
    try { parsed = JSON.parse(plaintext); } catch { throw new CredentialVaultUnavailableError(); }
    if (!validCredentials(parsed)) throw new CredentialVaultUnavailableError();
    return parsed;
  }

  async save(credentials: StoredChatGPTCredentials): Promise<void> {
    if (!validCredentials(credentials)) throw new CredentialVaultUnavailableError();
    await this.writeEncrypted(this.filePath, credentials);
  }

  async clear(): Promise<void> {
    try { await unlink(this.filePath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new CredentialVaultUnavailableError();
    }
  }

  async loadRegistration(): Promise<StoredChatGPTRegistration | undefined> {
    let ciphertext: string;
    try { ciphertext = (await readFile(this.registrationFilePath, 'utf8')).trim(); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw new CredentialVaultUnavailableError();
    }
    if (!ciphertext || ciphertext.length > 20_000) throw new CredentialVaultUnavailableError();
    const plaintext = await runPowerShell(unprotectScript, ciphertext);
    let parsed: unknown;
    try { parsed = JSON.parse(plaintext); } catch { throw new CredentialVaultUnavailableError(); }
    if (!isRegistration(parsed)) throw new CredentialVaultUnavailableError();
    return parsed;
  }

  async saveRegistration(registration: StoredChatGPTRegistration): Promise<void> {
    if (!isRegistration(registration)) throw new CredentialVaultUnavailableError();
    await this.writeEncrypted(this.registrationFilePath, registration);
  }

  async clearRegistration(): Promise<void> {
    try { await unlink(this.registrationFilePath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new CredentialVaultUnavailableError();
    }
  }

  private async writeEncrypted(filePath: string, value: unknown): Promise<void> {
    const ciphertext = await runPowerShell(protectScript, JSON.stringify(value));
    const directory = dirname(filePath);
    await mkdir(directory, { recursive: true });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, `${ciphertext}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      await rename(temporaryPath, filePath);
    } catch {
      try { await unlink(temporaryPath); } catch { /* temp may not exist */ }
      throw new CredentialVaultUnavailableError();
    }
  }
}

function isRegistration(value: unknown): value is StoredChatGPTRegistration {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.schemaVersion === 1
    && typeof record.clientId === 'string' && record.clientId.length > 0 && record.clientId.length <= 300 && record.clientId !== 'dynamic_agent_client'
    && typeof record.hostId === 'string' && /^urn:uuid:[0-9a-f-]{36}$/i.test(record.hostId);
}

export function createWindowsDpapiVault(): ChatGPTCredentialVault {
  return new WindowsDpapiChatGPTCredentialVault();
}
