import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Puck, createUsePuck, type Data } from '@puckeditor/core';
import { COLOR_TOKEN_NAMES, makeEditCommand, stableStringify, validateSnapshot, type ColorTokenName, type M0Project, type Snapshot, type ApplyOpsCommand } from '@design-workbench/m0-contract';
import { createBrowserTransport, createMcpTransport, type EditorTransport } from '@design-workbench/host-adapters';
import { heroConfig } from './hero.tsx';
import '@puckeditor/core/puck.css';
import 'virtual:editor-tokens.css';
import './style.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';

const usePuck = createUsePuck();
const labels: Record<ColorTokenName, string> = { 'color.background': 'Fond de la page', 'color.text': 'Texte', 'color.accent': 'Accent' };
const dictionary = {
  'header-publish': 'Enregistrer', 'header-preview': 'Aperçu', 'header-edit': 'Modifier',
  'label-page': 'Page', 'label-components': 'Composants', 'label-fields': 'Réglages',
  'actionbar-delete': 'Supprimer', 'actionbar-duplicate': 'Dupliquer', 'actionbar-drag': 'Déplacer',
  'field-empty': 'Sélectionne un bloc pour le modifier', 'viewport-switch': 'Afficher : {label}',
};

function message(error: unknown): string { return error instanceof Error ? error.message : 'Cette action n’a pas abouti. Tes réglages restent ouverts.'; }
function errorCode(error: unknown): string | undefined { return error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined; }

// External changes such as undo/reload enter Puck through its documented dispatcher.
// Ordinary onChange updates never dispatch back into the editor, avoiding a feedback loop.
function PuckSync({ composition, epoch }: { composition: Snapshot['pages'][number]['composition']; epoch: number }) {
  const dispatch = usePuck((state) => state.dispatch);
  const latest = useRef(composition); latest.current = composition;
  useEffect(() => { dispatch({ type: 'setData', data: { content: latest.current.content } }); }, [dispatch, epoch]);
  return null;
}

function Editor() {
  const [transport, setTransport] = useState<EditorTransport>();
  const [confirmed, setConfirmed] = useState<M0Project>();
  const [working, setWorking] = useState<Snapshot>();
  const [loading, setLoading] = useState(true);
  const [connectingEpoch, setConnectingEpoch] = useState(0);
  const [error, setError] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncEpoch, setSyncEpoch] = useState(0);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [tab, setTab] = useState<'page' | 'settings'>('page');
  const [history, setHistory] = useState<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const [feedback, setFeedback] = useState('');
  const workingRef = useRef(working); workingRef.current = working;
  const confirmedRef = useRef(confirmed); confirmedRef.current = confirmed;
  const savingRef = useRef(false);
  const retryRef = useRef<{ command: ApplyOpsCommand; snapshot: Snapshot } | undefined>(undefined);
  const lastEdit = useRef({ group: '', time: 0 });
  const reloadDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let disposed = false, current: EditorTransport | undefined;
    setLoading(true); setError(''); setRecoveryCode(undefined); setTransport(undefined);
    const isEmbedded = window.parent !== window || new URLSearchParams(location.search).get('host') === 'mcp';
    (async () => {
      try {
        current = isEmbedded ? await createMcpTransport() : createBrowserTransport();
        if (disposed) { await current.close(); return; }
        setTransport(current);
        const project = await current.read();
        if (disposed) return;
        setTransport(current); setConfirmed(project); setWorking(project.snapshot);
        setHistory({ past: [], future: [] }); setConflict(false); retryRef.current = undefined;
      } catch (failure) { if (!disposed) { setError(message(failure)); setRecoveryCode(errorCode(failure)); } }
      finally { if (!disposed) setLoading(false); }
    })();
    return () => { disposed = true; void current?.close(); };
  }, [connectingEpoch]);

  const dirty = Boolean(working && confirmed && stableStringify(working) !== stableStringify(confirmed.snapshot));
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function edit(next: Snapshot, group: string) {
    const previous = workingRef.current;
    if (!previous || stableStringify(previous) === stableStringify(next)) return;
    const now = Date.now();
    const grouped = lastEdit.current.group === group && now - lastEdit.current.time < 650;
    lastEdit.current = { group, time: now };
    setHistory((state) => ({ past: grouped ? state.past : [...state.past.slice(-49), structuredClone(previous)], future: [] }));
    workingRef.current = next; setWorking(next); setFeedback('');
    if (!conflict && !retryRef.current) setError('');
  }

  function onPuckChange(data: Data) {
    const current = workingRef.current, hero = data.content[0];
    if (!current || !hero || hero.type !== 'Hero' || data.content.length !== 1) return;
    const next = structuredClone(current);
    const props = hero.props;
    if (typeof props.id !== 'string' || typeof props.title !== 'string' || typeof props.body !== 'string' || !COLOR_TOKEN_NAMES.includes(props.backgroundToken) || !['none', 'fade'].includes(props.animation)) {
      setError('Le bloc contient un réglage non pris en charge. La dernière composition reste ouverte.'); return;
    }
    next.pages[0]!.composition.content[0]!.props = { id: props.id, title: props.title, body: props.body, backgroundToken: props.backgroundToken, animation: props.animation };
    edit(next, 'hero');
  }

  function changeColor(name: ColorTokenName, value: string) {
    const current = workingRef.current;
    if (!current) return;
    const next = structuredClone(current);
    next.theme.tokens[name].value = value;
    edit(next, name);
  }

  function travel(direction: 'past' | 'future') {
    const current = workingRef.current, target = history[direction].at(-1);
    if (!current || !target) return;
    setHistory((state) => direction === 'past'
      ? { past: state.past.slice(0, -1), future: [...state.future, current] }
      : { past: [...state.past, current], future: state.future.slice(0, -1) });
    lastEdit.current = { group: '', time: 0 };
    workingRef.current = target; setWorking(target); setSyncEpoch((value) => value + 1); setFeedback('');
  }

  async function save(replayPending = false) {
    const current = workingRef.current, base = confirmedRef.current;
    if (!current || !base || !transport || savingRef.current || conflict) return;
    try {
      const pending = retryRef.current;
      if (replayPending && !pending) return;
      if (!replayPending) {
        validateSnapshot(current);
        if (pending) { setError('Réessaie l’enregistrement en attente avant d’envoyer tes nouveaux réglages.'); return; }
      }
      const capture = structuredClone(replayPending ? pending!.snapshot : current);
      const command = replayPending ? pending!.command : makeEditCommand(base, capture, crypto.randomUUID());
      retryRef.current = { command, snapshot: capture };
      savingRef.current = true; setSaving(true); setError(''); setFeedback('');
      const project = await transport.commit(command);
      confirmedRef.current = project; setConfirmed(project); retryRef.current = undefined;
      setRecoveryCode(undefined);
      const newerEdits = workingRef.current && stableStringify(workingRef.current) !== stableStringify(capture);
      setFeedback(newerEdits ? 'Les réglages envoyés sont enregistrés. D’autres modifications restent à enregistrer.' : transport.kind === 'mcp' ? 'Enregistrement confirmé par le serveur.' : transport.kind === 'browser-local' ? 'Brouillon enregistré dans ce navigateur.' : 'Brouillon conservé pour cette session.');
    } catch (failure) {
      setError(message(failure));
      setRecoveryCode(errorCode(failure));
      if (errorCode(failure) === 'VERSION_CONFLICT') setConflict(true);
    } finally { savingRef.current = false; setSaving(false); }
  }

  async function verifySave() {
    if (!transport || savingRef.current) return;
    try {
      savingRef.current = true; setSaving(true);
      const project = await transport.read(), pending = retryRef.current;
      const previous = confirmedRef.current;
      if (pending && stableStringify(project.snapshot) === stableStringify(pending.snapshot)) {
        confirmedRef.current = project; setConfirmed(project); retryRef.current = undefined;
        setConflict(false); setError(''); setRecoveryCode(undefined); setFeedback('La version enregistrée est vérifiée. Tes réglages ouverts sont conservés.');
      } else if (previous && project.draftVersion === previous.draftVersion && project.contentHash === previous.contentHash) {
        confirmedRef.current = project; setConfirmed(project); setConflict(false); setRecoveryCode(undefined);
        if (pending) {
          setError('L’enregistrement en attente n’est pas confirmé. Réessaie cette même sauvegarde ; tes nouveaux réglages resteront ouverts.'); setFeedback('');
        } else { setError(''); setFeedback('La version enregistrée est vérifiée. Tes réglages ouverts sont conservés.'); }
      } else { setConflict(true); setError('Une autre version a été enregistrée. Télécharge tes réglages avant de recharger la version enregistrée.'); }
    } catch (failure) { setError(message(failure)); setRecoveryCode(errorCode(failure)); }
    finally { savingRef.current = false; setSaving(false); }
  }

  async function recoverExpired() {
    if (!transport?.recoverExpired || savingRef.current) return;
    try {
      savingRef.current = true; setSaving(true);
      const project = await transport.recoverExpired();
      const previous = confirmedRef.current;
      if (workingRef.current && previous && (project.draftVersion !== previous.draftVersion || project.contentHash !== previous.contentHash)) {
        setRecoveryCode(undefined); setConflict(true); setFeedback('');
        setError('Le brouillon expiré a été repris, mais une autre version avait été enregistrée. Tes réglages restent ouverts ; vérifie la version ou télécharge-les avant de recharger.');
        return;
      }
      confirmedRef.current = project; setConfirmed(project);
      if (!workingRef.current) {
        workingRef.current = project.snapshot; setWorking(project.snapshot);
        setHistory({ past: [], future: [] }); setSyncEpoch((value) => value + 1);
      }
      setRecoveryCode(undefined); setConflict(false);
      setError(retryRef.current ? 'Le brouillon a été repris. Réessaie maintenant l’enregistrement en attente.' : '');
      setFeedback('Brouillon repris explicitement. Son contenu et sa version sont conservés pour sept jours supplémentaires.');
    } catch (failure) { setError(message(failure)); setRecoveryCode(errorCode(failure)); }
    finally { savingRef.current = false; setSaving(false); }
  }

  async function reloadConfirmed() {
    if (!transport || savingRef.current) return;
    try {
      savingRef.current = true; setSaving(true);
      const project = await transport.read();
      setConfirmed(project); confirmedRef.current = project; setWorking(project.snapshot); workingRef.current = project.snapshot;
      setHistory({ past: [], future: [] }); setSyncEpoch((value) => value + 1); retryRef.current = undefined;
      setConflict(false); setError(''); setRecoveryCode(undefined); setFeedback('Version enregistrée rechargée.'); reloadDialog.current?.close();
    } catch (failure) { setError(message(failure)); setRecoveryCode(errorCode(failure)); reloadDialog.current?.close(); }
    finally { savingRef.current = false; setSaving(false); }
  }

  function downloadDraft() {
    if (!workingRef.current) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(workingRef.current, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'design-workbench-brouillon.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback('Le brouillon JSON a été préparé pour téléchargement. Ce fichier ne contient pas de code exporté.');
  }

  const config = useMemo(() => working ? heroConfig(working.theme) : undefined, [working?.theme]);
  const connectionLabel = transport?.kind === 'mcp' ? 'Connecté à l’hôte' : transport?.kind === 'browser-local' ? 'Diagnostic navigateur · sauvegarde locale' : 'Diagnostic navigateur · session locale';
  const saveLabel = saving ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' : transport?.kind === 'mcp' ? 'Version serveur chargée' : confirmed?.draftVersion ? 'Brouillon local enregistré' : 'Brouillon de départ';

  if (loading) return <main className="startup"><div className="workbench-mark" aria-hidden="true">W</div><h1>Ouverture de l’atelier</h1><p role="status">Connexion et lecture du brouillon…</p></main>;
  if (!working || !confirmed || !config || !transport) return <main className="startup"><h1>{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' ? 'Brouillon local à reprendre' : 'L’atelier n’a pas pu s’ouvrir'}</h1><p role="alert">{error}</p>{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' && transport?.recoverExpired ? <button className="button button--primary" disabled={saving} aria-busy={saving} onClick={() => void recoverExpired()}>Reprendre le brouillon expiré</button> : <button className="button button--primary" onClick={() => setConnectingEpoch((value) => value + 1)}>Réessayer la connexion</button>}</main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="skip-link" href="#page-preview">Aller à l’aperçu</a>
        <div className="app-identity"><div className="workbench-mark" aria-hidden="true">W</div><div><strong>Design Workbench</strong><span>Atelier de composition</span></div></div>
        <div className="project-heading"><span>{working.projectTitle}</span><small>Accueil <span aria-hidden="true">/</span> Brouillon</small></div>
        <button className="button button--primary save-button" onClick={() => void save()} disabled={saving || !dirty || conflict || Boolean(retryRef.current)} aria-busy={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>
      </header>

      <div className="connection-line"><span><i className="connection-dot" aria-hidden="true" />{connectionLabel}</span><span className="version-label">Version {confirmed.draftVersion}</span></div>
      <section className="scope-note" aria-label="Périmètre du prototype"><span className="scope-note__label">Premier atelier</span><p>Un bloc à explorer. Modifie son contenu et ses couleurs ; les suggestions IA et l’export de code seront ajoutés ensuite.</p></section>

      {error && <div className="error-banner" role="alert"><div><strong>{conflict ? 'Le brouillon a changé ailleurs' : 'Enregistrement à vérifier'}</strong><p>{error}</p></div><div className="error-banner__actions"><button className="button" onClick={downloadDraft}>Télécharger mes réglages</button><button className="button" disabled={saving} onClick={() => void verifySave()}>Vérifier la version enregistrée</button>{retryRef.current && !conflict && recoveryCode !== 'LOCAL_RECOVERY_EXPIRED' && <button className="button" disabled={saving} onClick={() => void save(true)}>Réessayer l’enregistrement en attente</button>}{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' && transport.recoverExpired && <button className="button" disabled={saving} onClick={() => void recoverExpired()}>Reprendre le brouillon expiré</button>}{conflict && <button className="button" disabled={saving} onClick={() => reloadDialog.current?.showModal()}>Recharger…</button>}</div></div>}

      <div className="workspace-toolbar"><div className="page-meta"><span className="page-indicator" aria-hidden="true" /><strong>Page d’accueil</strong><span>1 bloc</span></div><div className="workspace-actions"><div className="segmented" aria-label="Format de l’aperçu"><button aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}>Ordinateur</button><button aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}>Mobile</button></div><div className="history-controls"><button className="button button--quiet" onClick={() => travel('past')} disabled={!history.past.length}>Annuler</button><button className="button button--quiet" onClick={() => travel('future')} disabled={!history.future.length}>Rétablir</button></div></div></div>
      <div className="mobile-tabs" role="group" aria-label="Zone de travail"><button aria-pressed={tab === 'page'} onClick={() => setTab('page')}>Aperçu de la page</button><button aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>Réglages du bloc</button></div>

      <Puck config={config} data={working.pages[0]!.composition} onChange={onPuckChange} iframe={{ enabled: false }} permissions={{ drag: false, insert: false, delete: false, duplicate: false }} ui={{ itemSelector: { index: 0, zone: 'root:default-zone' } }} dictionary={dictionary}>
        <PuckSync composition={working.pages[0]!.composition} epoch={syncEpoch} />
        <div className="workspace" data-mobile-tab={tab}>
          <main id="page-preview" className="canvas-region" aria-label="Aperçu modifiable de la page" tabIndex={-1}>
            <div className="canvas-ruler"><span>/</span><span>{viewport === 'desktop' ? 'Largeur disponible' : '375 px · aperçu mobile'}</span><span>Accueil</span></div>
            <div className="canvas-stage"><div className={`canvas-frame canvas-frame--${viewport}`}><Puck.Preview /></div></div>
            <p className="canvas-caption">Sélectionne la section pour retrouver ses réglages. La page utilise ses propres couleurs.</p>
          </main>
          <aside className="inspector" aria-label="Réglages du bloc">
            <div className="inspector-heading"><span className="selection-mark" aria-hidden="true" /><div><h2>Section d’accueil</h2><p>Contenu & apparence</p></div></div>
            <div className="puck-fields"><Puck.Fields /></div>
            <fieldset className="theme-fields"><legend>Couleurs de la page</legend><p>Ces réglages s’appliquent au site, pas à l’atelier.</p>{COLOR_TOKEN_NAMES.map((name) => <label className="color-control" key={name}><span>{labels[name]}</span><span className="color-control__value"><code>{working.theme.tokens[name].value.toUpperCase()}</code><input type="color" aria-label={labels[name]} value={working.theme.tokens[name].value} onChange={(event) => changeColor(name, event.target.value)} /></span></label>)}</fieldset>
            <div className="inspector-note"><strong>Garde le contrôle</strong><p>Les réglages changent l’aperçu immédiatement. Enregistre le brouillon pour les conserver.</p></div>
          </aside>
        </div>
      </Puck>

      <footer className="statusbar"><span role="status" aria-live="polite">{feedback || saveLabel}</span><span>{transport.kind === 'mcp' ? 'Serveur de qualification · stockage en mémoire' : transport.kind === 'browser-local' ? 'Brouillon local · conservation 7 jours' : 'Conservation jusqu’à la fermeture de cette page'}</span></footer>
      <dialog ref={reloadDialog} className="dialog" aria-labelledby="reload-title"><h2 id="reload-title">Recharger la version enregistrée ?</h2><p>Les réglages non enregistrés de cette page seront remplacés. Tu peux d’abord télécharger ton brouillon.</p><div className="dialog-actions"><button className="button" autoFocus onClick={() => reloadDialog.current?.close()}>Garder mes réglages</button><button className="button" onClick={downloadDraft}>Télécharger le brouillon</button><button className="button button--primary" disabled={saving} onClick={() => void reloadConfirmed()}>Recharger la version</button></div></dialog>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Editor />);
