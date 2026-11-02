import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProject } from '@design-workbench/m0-contract';
import { analyzeDescription, applyDesignHint, isAnalysisCurrent } from '../src/manifest-analysis.ts';

test('une description non reconnue ne prétend pas produire une proposition de modèle', () => {
  const result = analyzeDescription('Une expérience raffinée et singulière', initialProject().snapshot);
  assert.equal(result.source, 'local-rules');
  assert.deepEqual(result.hints, []);
});
test('la piste de palette ne change que les tokens du document', () => {
  const before = initialProject().snapshot;
  const analysis = analyzeDescription('Un fond sombre avec un accent vert', before);
  const next = applyDesignHint(before, analysis, 'palette');
  assert.equal(next.theme.tokens['color.background'].value, '#172026');
  assert.equal(next.theme.tokens['color.accent'].value, '#33715b');
  assert.deepEqual(next.pages, before.pages);
  assert.notEqual(next, before);
});
test('une indication explicite de titre est transmise comme texte sans interprétation', () => {
  const before = initialProject().snapshot;
  const analysis = analyzeDescription('Titre: Des lieux pour vivre ensemble', before);
  const next = applyDesignHint(before, analysis, 'content');
  assert.equal(next.pages[0]!.composition.content[0]!.props.title, 'Des lieux pour vivre ensemble');
  assert.deepEqual(next.theme, before.theme);
});
test('une piste périmée ne remplace pas une modification manuelle', () => {
  const before = initialProject().snapshot;
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
