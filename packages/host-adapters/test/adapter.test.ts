import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProject, makeEditCommand, hashSnapshot, type M0Project, type ApplyOpsCommand } from '@design-workbench/m0-contract';
import { createBrowserTransport, launchContextFromToolResult, projectFromToolResult, readProjectValue, verifiedProject } from '../src/index.ts';
import { heroProject } from '../../../tests/fixtures/m0-project.ts';

function edit(project: M0Project, title: string, key: string) {
  const snapshot = structuredClone(project.snapshot);
  snapshot.pages[0]!.composition.content[0]!.props.title = title;
  return makeEditCommand(project, snapshot, key);
}
function localFixture(project: M0Project | null = heroProject()) {
  const values = new Map<string, string>();
  // These scenarios exercise an existing populated draft, not the new-project template.
  if (project) values.set('design-workbench:m0:project-m0:v1', JSON.stringify({ expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, project }));
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  let queue: Promise<unknown> = Promise.resolve();
  const runExclusive = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task); queue = next.catch(() => undefined); return next;
  };
  return { values, storage, runExclusive };
}

async function populatedMemoryTransport() {
  const transport = createBrowserTransport({ storage: null });
  const empty = await transport.read();
  await transport.commit(makeEditCommand(empty, heroProject().snapshot, 'fixture-hero-insertion'));
  return transport;
}

test('un nouveau brouillon mémoire ou local sans record démarre réellement vide', async () => {
  for (const transport of [createBrowserTransport({ storage: null }), createBrowserTransport(localFixture(null))]) {
    const project = await transport.read();
    assert.deepEqual(project.snapshot.pages[0]!.composition.content, []);
    assert.equal(project.draftVersion, 0);
    assert.equal(project.contentHash, await hashSnapshot(project.snapshot));
  }
});

test('mémoire : deux sauvegardes concurrentes sur une base ne gagnent pas toutes les deux', async () => {
  const transport = await populatedMemoryTransport(), project = await transport.read();
  const results = await Promise.allSettled([
    transport.commit(edit(project, 'Premier choix', 'first-command')),
    transport.commit(edit(project, 'Deuxième choix', 'second-command')),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const failure = results.find((r) => r.status === 'rejected');
  assert.equal(failure?.status === 'rejected' ? failure.reason.code : undefined, 'VERSION_CONFLICT');
  assert.equal((await transport.read()).draftVersion, project.draftVersion + 1);
});

test('rejouer la même clé retourne le résultat initial sans nouvelle version', async () => {
  const transport = await populatedMemoryTransport(), project = await transport.read();
  const command = edit(project, 'Une seule version', 'same-key');
  const first = await transport.commit(command), second = await transport.commit(command);
  assert.deepEqual(first, second);
  assert.equal(second.draftVersion, project.draftVersion + 1);
  await assert.rejects(transport.commit(edit(project, 'Autre contenu', 'same-key')), { code: 'IDEMPOTENCY_CONFLICT' });
});

test('le replay considère le contenu sémantique malgré un ordre différent des clés JSON', async () => {
  const transport = await populatedMemoryTransport(), project = await transport.read();
  const command = edit(project, 'Même intention', 'reordered-key');
  const result = await transport.commit(command);
  const reordered: ApplyOpsCommand = { payload: command.payload, action: command.action, idempotencyKey: command.idempotencyKey, expectedDraftVersion: command.expectedDraftVersion, projectId: command.projectId };
  assert.notEqual(JSON.stringify(command), JSON.stringify(reordered));
  assert.deepEqual(await transport.commit(reordered), result);
  assert.equal((await transport.read()).draftVersion, project.draftVersion + 1);
});

test('la limite de reçus refuse de nouveaux effets sans évincer un ancien replay', async () => {
  const transport = createBrowserTransport({ storage: null });
  const base = await transport.read();
  const first = makeEditCommand(base, base.snapshot, 'receipt-0');
  for (let index = 0; index < 1000; index++) {
    await transport.commit(makeEditCommand(base, base.snapshot, `receipt-${index}`));
  }
  await assert.rejects(transport.commit(makeEditCommand(base, base.snapshot, 'receipt-over-limit')), { code: 'RATE_LIMITED' });
  assert.deepEqual(await transport.commit(first), base);
});

test('stockage local : le verrou partagé protège deux vues et la réouverture retrouve le brouillon', async () => {
  const fixture = localFixture();
  const first = createBrowserTransport(fixture), second = createBrowserTransport(fixture);
  const base = await first.read();
  const results = await Promise.allSettled([
    first.commit(edit(base, 'Atelier enregistré', 'local-first')),
    second.commit(edit(base, 'Ancien onglet', 'local-second')),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const reopened = createBrowserTransport(fixture);
  assert.equal(reopened.kind, 'browser-local');
  assert.equal((await reopened.read()).snapshot.pages[0]!.composition.content[0]!.props.title, 'Atelier enregistré');
});

test('un brouillon local illisible n’est pas écrasé par la fixture', async () => {
  const fixture = localFixture(), first = createBrowserTransport(fixture);
  await first.commit(edit(await first.read(), 'Document initial', 'prepare-corruption'));
  const key = [...fixture.values.keys()][0]!;
  fixture.values.set(key, '{not-json');
  const next = createBrowserTransport(fixture);
  await assert.rejects(next.read(), { code: 'LOCAL_RECOVERY_INVALID' });
  assert.equal(fixture.values.get(key), '{not-json');
});

test('expiration locale : aucun remplacement silencieux et reprise explicite du même contenu et version', async () => {
  const fixture = localFixture(); let time = 100;
  const transport = createBrowserTransport({ ...fixture, now: () => time });
  const saved = await transport.commit(edit(await transport.read(), 'À conserver sept jours', 'expiry-1'));
  const before = [...fixture.values.values()][0]!;
  time += 7 * 24 * 60 * 60 * 1000 + 1;
  await assert.rejects(transport.read(), { code: 'LOCAL_RECOVERY_EXPIRED' });
  await assert.rejects(transport.commit(edit(saved, 'Vue expirée', 'expiry-2')), { code: 'LOCAL_RECOVERY_EXPIRED' });
  assert.equal([...fixture.values.values()][0], before);
  const recovered = await transport.recoverExpired!();
  assert.deepEqual(recovered, saved);
  assert.deepEqual(await transport.read(), saved);
  assert.equal((await transport.commit(edit(recovered, 'Après reprise explicite', 'expiry-3'))).draftVersion, 2);
  const record = JSON.parse([...fixture.values.values()][0]!);
  assert.equal(record.expiresAt, time + 7 * 24 * 60 * 60 * 1000);
});

test('le hash du document reçu est vérifié et pas seulement sa forme', async () => {
  const project = initialProject();
  const wrongHash = { ...project, contentHash: '0'.repeat(64) };
  assert.equal(readProjectValue(wrongHash).contentHash, '0'.repeat(64));
  await assert.rejects(verifiedProject(wrongHash), { code: 'CONTENT_HASH_MISMATCH' });
  assert.deepEqual(await verifiedProject(project), project);
});

test('un stockage au hash incohérent est refusé par read, commit et la reprise sans être écrasé', async () => {
  const fixture = localFixture(), transport = createBrowserTransport(fixture);
  const saved = await transport.commit(edit(await transport.read(), 'Document intact', 'integrity-1'));
  const key = [...fixture.values.keys()][0]!;
  const record = JSON.parse(fixture.values.get(key)!);
  record.project.snapshot.pages[0].composition.content[0].props.title = 'Contenu altéré';
  record.expiresAt = 0;
  fixture.values.set(key, JSON.stringify(record));
  const corrupted = fixture.values.get(key);
  await assert.rejects(transport.read(), { code: 'LOCAL_RECOVERY_INVALID' });
  await assert.rejects(transport.commit(edit(saved, 'Ne doit pas écrire', 'integrity-2')), { code: 'LOCAL_RECOVERY_INVALID' });
  await assert.rejects(transport.recoverExpired!(), { code: 'LOCAL_RECOVERY_INVALID' });
  assert.equal(fixture.values.get(key), corrupted);
});

test('un reçu en mémoire ne confirme pas un record persistant supprimé', async () => {
  const fixture = localFixture(), transport = createBrowserTransport(fixture);
  const command = edit(await transport.read(), 'À retrouver', 'missing-receipt');
  await transport.commit(command);
  fixture.values.clear();
  await assert.rejects(transport.commit(command), { code: 'LOCAL_RECOVERY_INVALID' });
  assert.equal(fixture.values.size, 0);
});

test('un reçu en mémoire ne confirme pas un record persistant corrompu', async () => {
  const fixture = localFixture(), transport = createBrowserTransport(fixture);
  const command = edit(await transport.read(), 'Contenu original', 'corrupt-receipt');
  await transport.commit(command);
  const key = [...fixture.values.keys()][0]!, record = JSON.parse(fixture.values.get(key)!);
  record.project.contentHash = '0'.repeat(64);
  const corrupted = JSON.stringify(record); fixture.values.set(key, corrupted);
  await assert.rejects(transport.commit(command), { code: 'LOCAL_RECOVERY_INVALID' });
  assert.equal(fixture.values.get(key), corrupted);
});

test('un reçu en mémoire ne confirme pas un record expiré et ne renouvelle pas implicitement sa durée', async () => {
  const fixture = localFixture(); let time = 100;
  const transport = createBrowserTransport({ ...fixture, now: () => time });
  const command = edit(await transport.read(), 'Brouillon expiré', 'expired-receipt');
  await transport.commit(command);
  const stored = [...fixture.values.values()][0]!;
  time += 7 * 24 * 60 * 60 * 1000 + 1;
  await assert.rejects(transport.commit(command), { code: 'LOCAL_RECOVERY_EXPIRED' });
  assert.equal([...fixture.values.values()][0], stored);
});

test('un reçu ne confirme pas une régression de version ni un autre hash à version égale', async () => {
  const fixture = localFixture(), transport = createBrowserTransport(fixture);
  const command = edit(await transport.read(), 'Version confirmée', 'regressed-receipt');
  const saved = await transport.commit(command);
  const key = [...fixture.values.keys()][0]!, original = JSON.parse(fixture.values.get(key)!);
  const lower = JSON.stringify({ ...original, project: initialProject() }); fixture.values.set(key, lower);
  await assert.rejects(transport.commit(command), { code: 'LOCAL_RECOVERY_INVALID' });
  assert.equal(fixture.values.get(key), lower);
  const other = structuredClone(saved);
  other.snapshot.pages[0]!.composition.content[0]!.props.title = 'Autre génération valide';
  other.contentHash = await hashSnapshot(other.snapshot);
  const different = JSON.stringify({ ...original, project: other }); fixture.values.set(key, different);
  await assert.rejects(transport.commit(command), { code: 'LOCAL_RECOVERY_INVALID' });
  assert.equal(fixture.values.get(key), different);
});

test('erreur de stockage : aucun accusé de sauvegarde n’est fabriqué', async () => {
  const fixture = localFixture();
  const transport = createBrowserTransport({ ...fixture, storage: { ...fixture.storage, setItem() { throw new Error('quota exceeded'); } } });
  await assert.rejects(transport.commit(edit(await transport.read(), 'Échec de quota', 'quota-1')), { code: 'LOCAL_STORAGE_UNAVAILABLE' });
  assert.equal((await transport.read()).draftVersion, 0);
});

test('un refus MCP dans _meta.error conserve son code de conflit', () => {
  assert.throws(() => projectFromToolResult({ isError: true, _meta: { error: { code: 'VERSION_CONFLICT', message: 'Une autre version existe.' } } }), { code: 'VERSION_CONFLICT' });
});

test('aucun résultat MCP résumé ou projet étranger n’est pris pour un document complet', () => {
  assert.throws(() => projectFromToolResult({ structuredContent: { projectId: 'project-m0', draftVersion: 0 } }), { code: 'INVALID_RESPONSE' });
  assert.throws(() => readProjectValue({ ...initialProject(), projectId: 'project-other' }), { code: 'INVALID_RESPONSE' });
  assert.deepEqual(projectFromToolResult({ _meta: { project: initialProject() }, structuredContent: { projectId: 'project-m0' } }), initialProject());
});

test('lancement : seul le contexte explicite validé de l’hôte est transmis à la vue', () => {
  const launch = { id: 'launch-one', projectId: 'project-m0', baseDraftVersion: 3, userRequest: 'Un fond noir', assistantProposal: 'Page sombre', backgroundColor: '#000000' };
  const result = { _meta: { launchContext: launch } };
  assert.deepEqual(launchContextFromToolResult(result), launch);
  const clone = launchContextFromToolResult(result)!;
  clone.userRequest = 'Une retouche locale';
  assert.equal(launch.userRequest, 'Un fond noir');
  assert.equal(launchContextFromToolResult({ _meta: { project: initialProject() } }), undefined);
  assert.equal(launchContextFromToolResult({ structuredContent: { launchContext: launch } }), undefined);
  assert.equal(launchContextFromToolResult({ isError: true, _meta: { launchContext: launch } }), undefined);
  for (const invalid of [{ ...launch, projectId: 'foreign' }, { ...launch, baseDraftVersion: -1 }, { ...launch, userRequest: 'x'.repeat(6001) }, { ...launch, backgroundColor: 'black' }, { ...launch, conversation: [] }]) {
    assert.throws(() => launchContextFromToolResult({ _meta: { launchContext: invalid } }), { code: 'INVALID_INPUT' });
  }
});
