import { applyOperations, createHeroBlock, stableStringify, type M0Operation, type Snapshot } from '@design-workbench/m0-contract';

export const DESCRIPTION_PAUSE_MS = 1500;

export type DesignHint = {
  id: string;
  title: string;
  description: string;
  category: 'palette' | 'content' | 'motion' | 'component';
  operations: M0Operation[];
  swatches?: string[];
};

export type LocalAnalysis = {
  description: string;
  baseSignature: string;
  source: 'local-rules';
  hints: DesignHint[];
  recognized: string[];
};

export function isAnalysisCurrent(analysis: LocalAnalysis | undefined, description: string, snapshot: Snapshot | undefined): boolean {
  return Boolean(analysis && snapshot && analysis.description === description.trim() && analysis.baseSignature === stableStringify(snapshot));
}

/** A small, disclosed local ruleset. It is not a model response or a server Proposal. */
export function analyzeDescription(description: string, snapshot: Snapshot): LocalAnalysis {
  const input = description.trim();
  const normalized = input.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const hints: DesignHint[] = [], recognized: string[] = [];
  const page = snapshot.pages[0]!, hero = page.composition.content[0];
  let background = snapshot.theme.tokens['color.background'].value;
  let text = snapshot.theme.tokens['color.text'].value;
  let accent = snapshot.theme.tokens['color.accent'].value;
  const dark = /\b(fond sombre|fond noir|theme sombre|page sombre)\b/.test(normalized);
  const light = /\b(fond clair|fond blanc|theme clair|page claire)\b/.test(normalized);
  if (dark !== light) {
    background = dark ? '#172026' : '#ffffff'; text = dark ? '#f3f1eb' : '#1c2533';
    recognized.push(dark ? 'fond sombre' : 'fond clair');
  }
  const accentNames: [RegExp, string, string][] = [
    [/\b(accent bleu|couleur bleue)\b/, '#2454c6', 'accent bleu'],
    [/\b(accent vert|couleur verte)\b/, '#33715b', 'accent vert'],
    [/\b(accent violet|couleur violette)\b/, '#7955c3', 'accent violet'],
  ];
  const accents = accentNames.filter(([pattern]) => pattern.test(normalized));
  if (accents.length === 1) { accent = accents[0]![1]; recognized.push(accents[0]![2]); }
  const before = snapshot.theme.tokens;
  if (background !== before['color.background'].value || text !== before['color.text'].value || accent !== before['color.accent'].value) {
    hints.push({
      id: 'palette', title: dark && !light ? 'Une palette plus profonde' : 'Une palette à ton intention',
      description: 'Ajuster le fond, le texte et l’accent de la page. Les couleurs de l’atelier restent indépendantes.',
      category: 'palette', swatches: [background, text, accent],
      operations: [{ op: 'update_theme', tokens: { 'color.background': { kind: 'color', value: background }, 'color.text': { kind: 'color', value: text }, 'color.accent': { kind: 'color', value: accent } } }],
    });
  }
  const withoutMotion = /\b(sans animation|aucune animation|sans mouvement)\b/.test(normalized);
  const fade = !withoutMotion && /\b(fondu|animation douce|entree douce)\b/.test(normalized);
  if (withoutMotion || fade) {
    recognized.push(withoutMotion ? 'sans animation' : 'fondu');
    const animation = withoutMotion ? 'none' : 'fade';
    if (hero && hero.props.animation !== animation) hints.push({
      id: 'motion', title: withoutMotion ? 'Laisser parler la composition' : 'Une entrée en fondu',
      description: withoutMotion ? 'Retirer l’animation d’entrée pour un contenu immédiatement stable.' : 'Utiliser le fondu disponible pour la section, avec respect du mouvement réduit.',
      category: 'motion', operations: [{ op: 'update_props', pageId: page.id, blockId: hero.props.id, props: { animation } }],
    });
  }
  const requestedTitle = input.match(/^titre\s*[:=]\s*(.+)$/im)?.[1]?.trim();
  const requestedBody = input.match(/^(?:texte|presentation)\s*[:=]\s*(.+)$/im)?.[1]?.trim();
  const props: { title?: string; body?: string } = {};
  if (requestedTitle && requestedTitle.length <= 200) { recognized.push('titre explicite'); if (requestedTitle !== hero?.props.title) props.title = requestedTitle; }
  if (requestedBody && requestedBody.length <= 1200) { recognized.push('texte explicite'); if (requestedBody !== hero?.props.body) props.body = requestedBody; }
  const requestsHero = /\bhero\b|(?:section|bandeau) d[’']accueil/.test(normalized);
  if (!hero && (requestsHero || Object.keys(props).length)) {
    const block = createHeroBlock();
    Object.assign(block.props, props);
    block.props.animation = fade ? 'fade' : 'none';
    recognized.push('section d’accueil');
    const palette = hints.find((hint) => hint.id === 'palette');
    hints.push({
      id: 'insert-hero', title: 'Une première section d’accueil', category: 'component',
      description: 'Prévisualiser le Hero M0 avec tes indications explicites. Cette piste vient des règles locales, sans appel de modèle.',
      operations: [...(palette?.operations ?? []), { op: 'insert_block', pageId: page.id, parentBlockId: null, slot: 'content', beforeBlockId: null, block }],
    });
  } else if (hero && Object.keys(props).length) hints.push({
    id: 'content', title: 'Tes mots, dans la page', description: 'Reprendre le titre ou le texte que tu as indiqué explicitement dans ta description.',
    category: 'content', operations: [{ op: 'update_props', pageId: page.id, blockId: hero.props.id, props }],
  });
  return { description: input, baseSignature: stableStringify(snapshot), source: 'local-rules', hints, recognized };
}

export function applyDesignHint(snapshot: Snapshot, analysis: LocalAnalysis, hintId: string): Snapshot {
  if (analysis.baseSignature !== stableStringify(snapshot)) throw new Error('La page a changé depuis cette analyse. Attends une nouvelle lecture de la description.');
  const hint = analysis.hints.find((item) => item.id === hintId);
  if (!hint) throw new Error('Cette piste n’est plus disponible.');
  return applyOperations(snapshot, hint.operations);
}
