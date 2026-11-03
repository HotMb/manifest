import { createHash } from 'node:crypto';
import fixture from '../../docs/spec/contracts/examples/snapshot.json' with { type: 'json' };
import { PROJECT_ID, stableStringify, validateSnapshot, type M0Project } from '@design-workbench/m0-contract';

/** Existing populated M0 project: tests must request it explicitly, never seed new users with it. */
export function heroProject(): M0Project {
  const snapshot: unknown = structuredClone(fixture);
  validateSnapshot(snapshot);
  return { projectId: PROJECT_ID, draftVersion: 0, contentHash: createHash('sha256').update(stableStringify(snapshot)).digest('hex'), snapshot };
}
