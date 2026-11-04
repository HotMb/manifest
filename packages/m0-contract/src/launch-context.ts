import { M0Error, PROJECT_ID } from './index.ts';

/** Explicitly sent by the host, never read from its conversation or unsent composer. */
export type EditorLaunchContext = {
  id: string;
  projectId: typeof PROJECT_ID;
  baseDraftVersion: number;
  userRequest?: string;
  assistantProposal?: string;
  backgroundColor?: string;
};

export const MAX_LAUNCH_TEXT_LENGTH = 6000;

export function validateEditorLaunchContext(value: unknown): asserts value is EditorLaunchContext {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new M0Error('INVALID_INPUT', 'Contexte de lancement incomplet.');
  const context = value as Record<string, unknown>;
  const allowed = ['id', 'projectId', 'baseDraftVersion', 'userRequest', 'assistantProposal', 'backgroundColor'];
  if (Object.keys(context).some((key) => !allowed.includes(key)) ||
      typeof context.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(context.id) ||
      context.projectId !== PROJECT_ID || !Number.isSafeInteger(context.baseDraftVersion) || Number(context.baseDraftVersion) < 0) {
    throw new M0Error('INVALID_INPUT', 'Cible ou version du lancement invalide.');
  }
  for (const key of ['userRequest', 'assistantProposal'] as const) {
    if (context[key] !== undefined && (typeof context[key] !== 'string' || !context[key].trim() || context[key].length > MAX_LAUNCH_TEXT_LENGTH)) {
      throw new M0Error('INVALID_INPUT', 'Le texte transmis doit contenir entre 1 et 6 000 caractères.');
    }
  }
  if (context.backgroundColor !== undefined && (typeof context.backgroundColor !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(context.backgroundColor))) {
    throw new M0Error('INVALID_INPUT', 'Couleur transmise attendue au format #RRGGBB.');
  }
  if (context.userRequest === undefined && context.assistantProposal === undefined && context.backgroundColor === undefined) {
    throw new M0Error('INVALID_INPUT', 'Aucune intention transmise.');
  }
}
