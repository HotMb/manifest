import { createHash, randomUUID } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../../docs/spec/contracts/domain.schema.json' with { type: 'json' };
import { M0Error, applyOperations, initialProject, stableStringify, validateCommand, validateSnapshot } from '@design-workbench/m0-contract';
import type { M0Project, M0CommandResult } from '@design-workbench/m0-contract';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const snapshotSchema = ajv.compile({ ...schema, $ref: '#/$defs/Snapshot' });
const commandSchema = ajv.compile({ ...schema, $id: `${schema.$id}/command`, $ref: '#/$defs/Command' });
const sha256 = (value: unknown) => createHash('sha256').update(stableStringify(value)).digest('hex');

/** Single local principal / in-memory prototype. Not durable storage or production identity. */
export class MemoryProjectStore {
  private project: M0Project;
  private receipts = new Map<string, { requestHash: string; result: M0CommandResult }>();

  constructor(seed: M0Project = initialProject()) {
    validateSnapshot(seed.snapshot);
    if (!snapshotSchema(seed.snapshot)) throw new M0Error('INVALID_INPUT', 'Snapshot incompatible avec le contrat canonique.');
    this.project = { ...structuredClone(seed), contentHash: sha256(seed.snapshot) };
  }

  read(projectId: string): M0Project {
    if (projectId !== this.project.projectId) throw new M0Error('NOT_FOUND', 'Projet inaccessible.');
    return structuredClone(this.project);
  }

  /** No await/IO between CAS and assignment: atomic in this one-process prototype. */
  commit(command: unknown): M0CommandResult {
    validateCommand(command);
    if (!commandSchema(command)) throw new M0Error('INVALID_INPUT', 'Commande incompatible avec le contrat canonique.');
    this.read(command.projectId); // Authorization scope precedes replay lookup.
    const requestHash = sha256(command);
    const previous = this.receipts.get(command.idempotencyKey);
    if (previous) {
      if (previous.requestHash !== requestHash) throw new M0Error('IDEMPOTENCY_CONFLICT', 'Cette clé a déjà été utilisée pour une autre commande.');
      return structuredClone(previous.result);
    }
    if (command.expectedDraftVersion !== this.project.draftVersion) throw new M0Error('VERSION_CONFLICT', 'Le brouillon a changé. Rechargez le projet avant de réessayer.');
    // Keep all receipts for this process. A full store refuses new work, never evicts replay safety.
    if (this.receipts.size >= 1000) throw new M0Error('RATE_LIMITED', 'Limite du prototype atteinte. Les reçus ne sont pas supprimés silencieusement.');
    // Isoler la copie à cette frontière aussi : un helper remplacé ultérieurement
    // ne doit jamais recevoir le snapshot autoritatif mutable.
    const nextSnapshot = applyOperations(structuredClone(this.project.snapshot), command.payload.operations);
    if (!snapshotSchema(nextSnapshot)) throw new M0Error('INVALID_INPUT', 'Résultat incompatible avec le contrat canonique.');
    const contentHash = sha256(nextSnapshot);
    const next: M0Project = {
      projectId: this.project.projectId,
      draftVersion: this.project.draftVersion + (contentHash === this.project.contentHash ? 0 : 1),
      contentHash,
      snapshot: nextSnapshot,
    };
    const result: M0CommandResult = { ...next, revisionId: null, receiptId: `receipt-${randomUUID()}` };
    this.project = structuredClone(next);
    this.receipts.set(command.idempotencyKey, { requestHash, result: structuredClone(result) });
    return structuredClone(result);
  }
}

export function publicError(error: unknown) {
  const known = error instanceof M0Error;
  return {
    code: known ? error.code : 'INTERNAL_ERROR',
    message: known ? error.message : 'Le prototype a rencontré une erreur interne.',
    requestId: `request-${randomUUID()}`,
    retryable: false,
  };
}
