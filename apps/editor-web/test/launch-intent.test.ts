import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { initialProject } from '@design-workbench/m0-contract';

const desktopPlugin = JSON.parse(readFileSync(new URL('../../../integrations/chatgpt-desktop/plugin.json', import.meta.url), 'utf8')) as {
  extensions: { 'com.openai': { interface: { defaultPrompt: string } } };
};

test('le projet initial est une page blanche neutre sans design fixe', () => {
  const project = initialProject();
  const page = project.snapshot.pages[0]!;
  assert.equal(project.snapshot.projectTitle, 'Nouveau projet');
  assert.equal(page.composition.content.length, 0);
  assert.equal(page.catalogPage, undefined);
  assert.equal(project.snapshot.theme.tokens['color.background'].value, '#ffffff');
  assert.equal(project.snapshot.designBrief.product, 'Interface à concevoir');
  assert.deepEqual(project.snapshot.designBrief.brandConstraints, []);
  assert.deepEqual(project.snapshot.designBrief.moments, []);
  assert.equal(project.snapshot.designBrief.signature, '');
});

test('le lancement suggéré par ChatGPT n’invente pas de page', () => {
  const prompt = desktopPlugin.extensions['com.openai'].interface.defaultPrompt;
  assert.match(prompt, /sans ajouter de composant/i);
  assert.match(prompt, /laisse l’aperçu blanc/i);
  assert.doesNotMatch(prompt, /dashboard|portfolio|page de présentation/i);
});
