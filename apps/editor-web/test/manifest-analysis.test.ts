import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProject } from '@design-workbench/m0-contract';
import { heroProject } from '../../../tests/fixtures/m0-project.ts';
import { analyzeDescription, applyDesignHint, isAnalysisCurrent } from '../src/manifest-analysis.ts';

test('une description non reconnue ne prétend pas produire une proposition de modèle', () => {
  const result = analyzeDescription('Une expérience raffinée et singulière', initialProject().snapshot);
  assert.equal(result.source, 'local-rules');
  assert.deepEqual(result.hints, []);
});
test('la piste de palette ne change que les tokens du document', () => {
  const before = heroProject().snapshot;
  const analysis = analyzeDescription('Un fond sombre avec un accent vert', before);
  const next = applyDesignHint(before, analysis, 'palette');
  assert.equal(next.theme.tokens['color.background'].value, '#172026');
  assert.equal(next.theme.tokens['color.accent'].value, '#33715b');
  assert.deepEqual(next.pages, before.pages);
  assert.notEqual(next, before);
});
test('une indication explicite de titre est transmise comme texte sans interprétation', () => {
  const before = heroProject().snapshot;
  const analysis = analyzeDescription('Titre: Des lieux pour vivre ensemble', before);
  const next = applyDesignHint(before, analysis, 'content');
  assert.equal(next.pages[0]!.composition.content[0]!.props.title, 'Des lieux pour vivre ensemble');
  assert.deepEqual(next.theme, before.theme);
});
test('une piste périmée ne remplace pas une modification manuelle', () => {
  const before = heroProject().snapshot;
  const analysis = analyzeDescription('Un fond sombre', before);
  const changed = structuredClone(before);
  changed.pages[0]!.composition.content[0]!.props.title = 'Une nouvelle intention';
  assert.throws(() => applyDesignHint(changed, analysis, 'palette'), /page a changé/);
  assert.equal(changed.theme.tokens['color.background'].value, '#ffffff');
});
test('une nouvelle intention invalide immédiatement les pistes de la précédente', () => {
  const snapshot = initialProject().snapshot;
  const analysis = analyzeDescription('Un fond sombre', snapshot);
  assert.equal(isAnalysisCurrent(analysis, 'Un fond sombre', snapshot), true);
  assert.equal(isAnalysisCurrent(analysis, 'Un fond clair', snapshot), false);
  assert.equal(isAnalysisCurrent(analysis, '', snapshot), false);
});
test('les locks du domaine sont respectés par les pistes locales', () => {
  const before = initialProject().snapshot;
  before.locks = [{ pageId: before.pages[0]!.id, blockId: null, properties: ['theme'] }];
  const analysis = analyzeDescription('Un fond sombre', before);
  assert.throws(() => applyDesignHint(before, analysis, 'palette'), { code: 'LOCKED_TARGET' });
});
test('des intentions de fond contradictoires ne choisissent pas arbitrairement une palette', () => {
  const analysis = analyzeDescription('Je veux un fond sombre, ou un fond clair', initialProject().snapshot);
  assert.equal(analysis.hints.some((hint) => hint.id === 'palette'), false);
});

test('une page vide accepte une piste de palette ou de mouvement sans inventer de bloc', () => {
  const before = initialProject().snapshot;
  const analysis = analyzeDescription('Un fond sombre avec un fondu', before);
  assert.equal(analysis.hints.some((hint) => hint.id === 'motion' || hint.id === 'insert-hero'), false);
  assert.equal(applyDesignHint(before, analysis, 'palette').pages[0]!.composition.content.length, 0);
});

test('une demande explicite de Hero préfigure une insertion canonique et laisse sa base vide intacte', () => {
  const before = initialProject().snapshot;
  const analysis = analyzeDescription('Une section d’accueil avec un fond sombre et un fondu.\nTitre : Mon premier espace', before);
  const hint = analysis.hints.find((entry) => entry.id === 'insert-hero')!;
  assert.equal(hint.category, 'component');
  const insertion = hint.operations.find((operation) => operation.op === 'insert_block')!;
  assert.equal(insertion.parentBlockId, null);
  assert.equal(insertion.slot, 'content');
  assert.equal(insertion.beforeBlockId, null);
  const preview = applyDesignHint(before, analysis, hint.id);
  assert.equal(before.pages[0]!.composition.content.length, 0);
  assert.equal(preview.pages[0]!.composition.content[0]!.props.title, 'Mon premier espace');
  assert.equal(preview.pages[0]!.composition.content[0]!.props.animation, 'fade');
  assert.equal(preview.theme.tokens['color.background'].value, '#172026');
});

test('la piste d’insertion périmée ne remplace pas un Hero ajouté manuellement entretemps', () => {
  const before = initialProject().snapshot;
  const analysis = analyzeDescription('Un Hero\nTitre : Premier candidat', before);
  const inserted = applyDesignHint(before, analysis, 'insert-hero');
  inserted.pages[0]!.composition.content[0]!.props.title = 'Ma section ajoutée';
  assert.throws(() => applyDesignHint(inserted, analysis, 'insert-hero'), /page a changé/);
  assert.equal(inserted.pages[0]!.composition.content[0]!.props.title, 'Ma section ajoutée');
});

test('le tableau de bord comprend un fondu vers le haut et préserve la vitesse demandée', () => {
  const before = initialProject().snapshot;
  const analysis = analyzeDescription('Un tableau de bord de ventes avec des nuages. Fais apparaître les graphiques en fondu et vers le haut. Accélère x2.', before);
  const hint = analysis.hints.find((entry) => entry.id === 'sales-cloud-dashboard')!;
  const preview = applyDesignHint(before, analysis, hint.id);
  const charts = preview.pages[0]!.catalogPage!.nodes.filter((node) => node.component.id === 'sales-chart');
  assert.equal(charts.length, 2);
  for (const chart of charts) {
    assert.equal(chart.motion?.id, 'fade-slide-up');
    assert.equal(chart.motion?.config.durationMs, 280);
  }
  assert.ok(analysis.recognized.includes('fondu avec montée'));
});

test('un déplacement vers le haut sans demande de fondu ne choisit pas un fondu composé', () => {
  const before = initialProject().snapshot;
  const analysis = analyzeDescription('Un tableau de bord de ventes avec des nuages. Les graphiques glissent vers le haut.', before);
  const hint = analysis.hints.find((entry) => entry.id === 'sales-cloud-dashboard')!;
  const preview = applyDesignHint(before, analysis, hint.id);
  const charts = preview.pages[0]!.catalogPage!.nodes.filter((node) => node.component.id === 'sales-chart');
  assert.ok(charts.every((chart) => chart.motion?.id === 'slide-up'));
});

test('des directions contradictoires ne choisissent pas arbitrairement une direction', () => {
  const before = initialProject().snapshot;
  const analysis = analyzeDescription('Un tableau de bord de ventes avec des nuages. Fais apparaître les graphiques vers le haut et vers le bas.', before);
  const hint = analysis.hints.find((entry) => entry.id === 'sales-cloud-dashboard')!;
  const preview = applyDesignHint(before, analysis, hint.id);
  const charts = preview.pages[0]!.catalogPage!.nodes.filter((node) => node.component.id === 'sales-chart');
  assert.ok(charts.every((chart) => chart.motion?.id === 'fade-in'));
  assert.ok(analysis.recognized.includes('directions de mouvement contradictoires'));
});
