import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Puck, createUsePuck, type Data } from '@puckeditor/core';
import { COLOR_TOKEN_NAMES, makeEditCommand, stableStringify, validateSnapshot, type ColorTokenName, type M0Project, type Snapshot, type ApplyOpsCommand } from '@design-workbench/m0-contract';
import { createBrowserTransport, createMcpTransport, type EditorTransport } from '@design-workbench/host-adapters';
import { heroConfig } from './hero.tsx';
import { applyDesignHint, DESCRIPTION_PAUSE_MS, type DesignHint } from './manifest-analysis.ts';
import { useLocalAnalysis } from './use-local-analysis.ts';
import '@puckeditor/core/no-external.css';
import 'virtual:editor-tokens.css';
import './style.css';
import './manifest.css';
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
  const [tab, setTab] = useState<'description' | 'page' | 'settings'>('page');
  const [sidePanel, setSidePanel] = useState<'suggestions' | 'settings'>('suggestions');
  const [description, setDescription] = useState('');
  const [composing, setComposing] = useState(false);
  const [automaticAnalysis, setAutomaticAnalysis] = useState(true);
  const [reportTab, setReportTab] = useState<'report' | 'version'>('report');
  const [reportFeedback, setReportFeedback] = useState('');
  const [history, setHistory] = useState<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const [feedback, setFeedback] = useState('');
  const workingRef = useRef(working); workingRef.current = working;
  const confirmedRef = useRef(confirmed); confirmedRef.current = confirmed;
  const savingRef = useRef(false);
  const retryRef = useRef<{ command: ApplyOpsCommand; snapshot: Snapshot } | undefined>(undefined);
  const lastEdit = useRef({ group: '', time: 0 });
  const reloadDialog = useRef<HTMLDialogElement>(null);
  const reportDialog = useRef<HTMLDialogElement>(null);
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  const { analysis, phase: analysisPhase, runNow: analyzeNow } = useLocalAnalysis(description, working, automaticAnalysis, composing);

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

  function applyHint(hint: DesignHint) {
    if (!workingRef.current || !analysis) return;
    if (analysis.description !== description.trim()) { setFeedback('La description a changé. Attends les nouvelles pistes avant de choisir.'); return; }
    try {
      const next = applyDesignHint(workingRef.current, analysis, hint.id);
      edit(next, `hint-${hint.id}`); setSyncEpoch((value) => value + 1);
      setFeedback('Piste locale appliquée à l’aperçu. Enregistre le brouillon pour la conserver.');
    } catch (failure) { setError(message(failure)); }
  }

  function openReport(nextTab: 'report' | 'version') {
    setReportTab(nextTab); setReportFeedback(''); reportDialog.current?.showModal();
  }

  function reportDocument() {
    return {
      format: 'manifest.design-report.v1',
      project: { projectId: confirmed?.projectId, draftVersion: confirmed?.draftVersion, contentHash: confirmed?.contentHash, snapshot: confirmed?.snapshot },
      workingCopy: { hasUncommittedChanges: dirty, snapshot: working },
      brief: { description, persisted: false },
      analysis: { source: 'local-rules', status: analysisPhase, upToDate: Boolean(analysis), model: null, recognized: analysis ? analysis.recognized : null },
      capabilities: { approvedRevision: false, codeExport: false, modelInference: false },
    };
  }

  async function copyReport() {
    try { await navigator.clipboard.writeText(JSON.stringify(reportDocument(), null, 2)); setReportFeedback('Rapport copié. Les réglages non enregistrés y sont identifiés séparément.'); }
    catch { setReportFeedback('La copie n’est pas disponible ici. Télécharge le rapport pour le conserver.'); }
  }

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(reportDocument(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'manifest-rapport-design.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setReportFeedback('Rapport préparé pour téléchargement. Il décrit un brouillon, sans code exporté.');
  }

  const config = useMemo(() => working ? heroConfig(working.theme) : undefined, [working?.theme]);
  const connectionLabel = transport?.kind === 'mcp' ? 'Connecté à l’hôte' : transport?.kind === 'browser-local' ? 'Diagnostic navigateur · sauvegarde locale' : 'Diagnostic navigateur · session locale';
  const saveLabel = saving ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' : transport?.kind === 'mcp' ? 'Version serveur chargée' : confirmed?.draftVersion ? 'Brouillon local enregistré' : 'Brouillon de départ';
  const reportAnalysisLabel = analysis ? `${analysis.recognized.length} indication(s) reconnue(s).` : analysisPhase === 'typing' ? 'Lecture de la description en attente de la pause. Aucune analyse à jour.' : analysisPhase === 'paused' ? 'Lecture automatique suspendue. Aucune analyse à jour.' : 'Aucune description analysée dans cette session.';

  if (loading) return <main className="startup"><div className="workbench-mark" aria-hidden="true">m</div><h1>Ouverture de Manifest</h1><p role="status">Connexion et lecture du brouillon…</p></main>;
  if (!working || !confirmed || !config || !transport) return <main className="startup"><h1>{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' ? 'Brouillon local à reprendre' : 'L’atelier n’a pas pu s’ouvrir'}</h1><p role="alert">{error}</p>{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' && transport?.recoverExpired ? <button className="button button--primary" disabled={saving} aria-busy={saving} onClick={() => void recoverExpired()}>Reprendre le brouillon expiré</button> : <button className="button button--primary" onClick={() => setConnectingEpoch((value) => value + 1)}>Réessayer la connexion</button>}</main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="skip-link" href="#page-preview">Aller à l’aperçu</a>
        <div className="app-identity"><div className="workbench-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V6l8 7 8-7v12M4 6l8 12 8-12" /></svg></div><strong>manifest<span>.</span></strong></div>
        <div className="project-heading"><span>{working.projectTitle}</span><span className="project-divider" aria-hidden="true">/</span><span>Accueil</span><button className="version-button" onClick={() => openReport('version')} aria-label={`Voir la version ${confirmed.draftVersion}`}>v{confirmed.draftVersion}</button></div>
        <div className="topbar-actions"><button className="button report-button" onClick={() => openReport('report')}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h7l3 3V17.5H5zM12 2.5V6h3M8 9h4M8 12h4" /></svg>Rapport & version</button><button className="button button--primary save-button" onClick={() => void save()} disabled={saving || !dirty || conflict || Boolean(retryRef.current)} aria-busy={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button></div>
      </header>

      {error && <div className="error-banner" role="alert"><div><strong>{conflict ? 'Le brouillon a changé ailleurs' : 'Enregistrement à vérifier'}</strong><p>{error}</p></div><div className="error-banner__actions"><button className="button" onClick={downloadDraft}>Télécharger mes réglages</button><button className="button" disabled={saving} onClick={() => void verifySave()}>Vérifier la version enregistrée</button>{retryRef.current && !conflict && recoveryCode !== 'LOCAL_RECOVERY_EXPIRED' && <button className="button" disabled={saving} onClick={() => void save(true)}>Réessayer l’enregistrement en attente</button>}{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' && transport.recoverExpired && <button className="button" disabled={saving} onClick={() => void recoverExpired()}>Reprendre le brouillon expiré</button>}{conflict && <button className="button" disabled={saving} onClick={() => reloadDialog.current?.showModal()}>Recharger…</button>}</div></div>}

      <div className="mobile-tabs" role="group" aria-label="Zone de travail"><button aria-pressed={tab === 'description'} onClick={() => setTab('description')}>Description</button><button aria-pressed={tab === 'page'} onClick={() => setTab('page')}>Aperçu de la page</button><button aria-pressed={tab === 'settings' && sidePanel === 'suggestions'} onClick={() => { setTab('settings'); setSidePanel('suggestions'); }}>Suggestions</button><button aria-pressed={tab === 'settings' && sidePanel === 'settings'} onClick={() => { setTab('settings'); setSidePanel('settings'); }}>Réglages du bloc</button></div>

      <Puck config={config} data={working.pages[0]!.composition} onChange={onPuckChange} iframe={{ enabled: false }} permissions={{ drag: false, insert: false, delete: false, duplicate: false }} ui={{ itemSelector: { index: 0, zone: 'root:default-zone' } }} dictionary={dictionary}>
        <PuckSync composition={working.pages[0]!.composition} epoch={syncEpoch} />
        <div className="workspace" data-mobile-tab={tab}>
          <aside className="description-panel" aria-labelledby="description-title">
            <div className="panel-heading"><span className="panel-symbol" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 4h12M4 8h12M4 12h8M4 16h5" /></svg></span><h2 id="description-title">Description</h2><span className="local-label">Local</span></div>
            <div className="description-body"><h3>Commence par une intention.</h3><p>Décris ta page. Observe les pistes, puis garde ce qui te ressemble.</p>
              <label className="sr-only" htmlFor="page-description">Description de la page</label>
              <div className="description-composer"><textarea ref={descriptionInput} id="page-description" className="description-input resize-none" value={description} onChange={(event) => setDescription(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} maxLength={6000} placeholder={'Un portfolio avec un fond clair et un accent bleu…\n\nTitre : Des espaces qui nous ressemblent'} aria-describedby="description-help" /><div className="composer-foot"><span>{description.length.toLocaleString('fr-FR')} / 6 000</span>{description && <button className="text-button" onClick={() => { setDescription(''); descriptionInput.current?.focus(); }}>Effacer</button>}</div></div>
              <div className="analysis-preference"><label><input type="checkbox" checked={automaticAnalysis} onChange={(event) => setAutomaticAnalysis(event.target.checked)} />Lire après une pause</label><span>{(DESCRIPTION_PAUSE_MS / 1000).toLocaleString('fr-FR')} s</span></div>
              <button className="button analyze-button" onClick={analyzeNow} disabled={!description.trim() || composing}>Analyser la description<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 5l5 5-5 5" /></svg></button>
              <p id="description-help" className="description-help">Cette première version utilise des règles locales : fond clair ou sombre, accent bleu, vert ou violet, fondu, et lignes « Titre : » ou « Texte : ». Aucun modèle n’est appelé.</p>
              <div className="description-examples"><span>Une direction à explorer</span><button onClick={() => { setDescription('Un fond clair avec un accent bleu.\nTitre : Des espaces qui nous ressemblent\nTexte : Un atelier indépendant pour imaginer vos lieux de vie.'); descriptionInput.current?.focus(); }}>Portfolio clair<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" /></svg></button><button onClick={() => { setDescription('Un fond sombre avec un accent vert et sans animation.'); descriptionInput.current?.focus(); }}>Page plus profonde<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" /></svg></button></div>
            </div>
            <div className="description-footer"><span className="connection-dot" aria-hidden="true" /><span>Ton texte reste dans cette session.<br />Seuls les réglages de la page sont enregistrés.</span></div>
          </aside>
          <main id="page-preview" className="canvas-region" aria-label="Aperçu modifiable de la page" tabIndex={-1}>
            <div className="workspace-toolbar"><div className="page-meta"><span className="page-indicator" aria-hidden="true" /><strong>Aperçu</strong><span className="live-label">En direct</span></div><div className="segmented" aria-label="Format de l’aperçu"><button aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')} title="Aperçu ordinateur"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="10" rx="1" /><path d="M10 13v4M6 17h8" /></svg><span>Ordinateur</span></button><button aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')} title="Aperçu mobile"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="2" width="8" height="16" rx="1.5" /><path d="M9 15h2" /></svg><span>Mobile</span></button></div><div className="history-controls"><button className="button button--quiet" onClick={() => travel('past')} disabled={!history.past.length}>Annuler</button><button className="button button--quiet" onClick={() => travel('future')} disabled={!history.future.length}>Rétablir</button></div></div>
            <div className="canvas-ruler"><div className="browser-dots" aria-hidden="true"><i /><i /><i /></div><span className="canvas-route"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="5" width="6" height="5" rx="1" /><path d="M4 5V3a2 2 0 0 1 4 0v2" /></svg>aperçu / accueil</span><span className="canvas-size">{viewport === 'desktop' ? 'Largeur disponible' : '375 px'}</span></div>
            <div className="canvas-stage"><div className={`canvas-frame canvas-frame--${viewport}`} style={{ backgroundColor: working.theme.tokens['color.background'].value }}><Puck.Preview /></div></div>
            <div className="canvas-bottom"><p>Une page. Un bloc. Un point de départ.</p><button className="text-button" onClick={() => { setSidePanel('settings'); setTab('settings'); }}>Modifier le bloc<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" /></svg></button></div>
          </main>
          <aside className="inspector" aria-label="Panneau de conception">
            <div className="panel-heading"><span className="panel-symbol" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 4h10M5 10h10M5 16h10" /><circle cx="8" cy="4" r="2" /><circle cx="13" cy="10" r="2" /><circle cx="7" cy="16" r="2" /></svg></span><h2>Conception</h2><span className="hint-count">{analysis?.hints.length ?? 0}</span></div>
            <div className="inspector-tabs" role="group" aria-label="Panneau de conception"><button aria-pressed={sidePanel === 'suggestions'} onClick={() => setSidePanel('suggestions')}>Suggestions</button><button aria-pressed={sidePanel === 'settings'} onClick={() => setSidePanel('settings')}>Réglages</button></div>
            {sidePanel === 'suggestions' ? <div className="suggestions-panel" data-analysis-phase={analysisPhase}>
              <div className={`analysis-state analysis-state--${analysisPhase}`} role="status" aria-live="polite"><span className="analysis-indicator" aria-hidden="true" /><div><strong>{analysisPhase === 'typing' ? 'Lecture après ta pause' : analysisPhase === 'ready' ? 'Analyse locale prête' : analysisPhase === 'paused' ? 'Lecture automatique suspendue' : 'Une intention, puis des pistes'}</strong><span>{analysisPhase === 'typing' ? 'Continue d’écrire, la page reste disponible.' : analysisPhase === 'ready' ? `${analysis?.recognized.length ?? 0} indication${analysis?.recognized.length === 1 ? '' : 's'} reconnue${analysis?.recognized.length === 1 ? '' : 's'}` : 'Aucun appel à un modèle.'}</span></div></div>
              {analysis?.hints.length ? <div className="hint-list">{analysis.hints.map((hint) => <article className="hint-card" key={hint.id}><div className="hint-category">{hint.category === 'palette' ? 'Couleurs' : hint.category === 'motion' ? 'Mouvement' : 'Contenu'}<span>Règle locale</span></div><h3>{hint.title}</h3><p>{hint.description}</p>{hint.swatches && <div className="hint-swatches" aria-label={`Palette proposée : ${hint.swatches.join(', ')}`}>{hint.swatches.map((color, index) => <span style={{ backgroundColor: color }} key={`${color}-${index}`} />)}</div>}<button className="button hint-apply" onClick={() => applyHint(hint)}>Appliquer {hint.category === 'palette' ? 'la palette' : hint.category === 'motion' ? 'l’animation' : 'le contenu'}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3l5 5-5 5" /></svg></button></article>)}</div> : <div className="suggestions-empty"><div className="empty-diagram" aria-hidden="true"><span /><span /><span /></div><h3>{analysisPhase === 'ready' ? analysis?.recognized.length ? 'Ta page suit déjà ces indications.' : 'Précisons la direction.' : 'La prochaine idée commence à gauche.'}</h3><p>{analysisPhase === 'ready' ? 'Essaie un fond sombre, un accent vert, un fondu, ou un titre explicite. Les pistes restent des choix à appliquer.' : 'Décris une couleur, une entrée ou les mots à afficher. Les pistes locales apparaissent après une pause.'}</p></div>}
              <section className="component-summary"><h3>Dans cette page</h3><div><span className="component-thumb" aria-hidden="true"><i /><i /></span><div><strong>Section d’accueil</strong><span>Hero · contenu modifiable</span></div><button className="text-button" onClick={() => setSidePanel('settings')}>Régler</button></div></section>
              <p className="suggestions-disclosure">Les suggestions de modèles et l’export de code ne sont pas encore connectés. Ces pistes locales passent par les mêmes règles de document que les réglages manuels.</p>
            </div> : <div className="settings-panel"><div className="inspector-heading"><span className="selection-mark" aria-hidden="true" /><div><h3>Section d’accueil</h3><p>Contenu & apparence</p></div></div><div className="puck-fields"><Puck.Fields /></div><fieldset className="theme-fields"><legend>Couleurs de la page</legend><p>Ces réglages s’appliquent au site, pas à l’atelier.</p>{COLOR_TOKEN_NAMES.map((name) => <label className="color-control" key={name}><span>{labels[name]}</span><span className="color-control__value"><code>{working.theme.tokens[name].value.toUpperCase()}</code><input type="color" aria-label={labels[name]} value={working.theme.tokens[name].value} onChange={(event) => changeColor(name, event.target.value)} /></span></label>)}</fieldset><div className="inspector-note"><strong>Un changement reste un choix.</strong><p>Les réglages changent l’aperçu immédiatement. Enregistre le brouillon pour les conserver.</p></div></div>}
          </aside>
        </div>
      </Puck>

      <footer className="statusbar"><span className="save-state" role="status" aria-live="polite"><span className="connection-dot" aria-hidden="true" />{feedback || saveLabel}</span><span>{connectionLabel}</span><button className="text-button footer-version" onClick={() => openReport('version')}>Brouillon v{confirmed.draftVersion}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg></button></footer>
      <dialog ref={reloadDialog} className="dialog" aria-labelledby="reload-title"><h2 id="reload-title">Recharger la version enregistrée ?</h2><p>Les réglages non enregistrés de cette page seront remplacés. Tu peux d’abord télécharger ton brouillon.</p><div className="dialog-actions"><button className="button" autoFocus onClick={() => reloadDialog.current?.close()}>Garder mes réglages</button><button className="button" onClick={downloadDraft}>Télécharger le brouillon</button><button className="button button--primary" disabled={saving} onClick={() => void reloadConfirmed()}>Recharger la version</button></div></dialog>
      <dialog ref={reportDialog} className="dialog report-dialog" aria-labelledby="report-title"><header className="report-header"><div><span>Manifest / état du projet</span><h2 id="report-title">Rapport & version</h2></div><button className="icon-button" aria-label="Fermer le rapport" autoFocus onClick={() => reportDialog.current?.close()}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M5 15L15 5" /></svg></button></header><div className="report-tabs" role="group" aria-label="Contenu du rapport"><button aria-pressed={reportTab === 'report'} onClick={() => setReportTab('report')}>Rapport de conception</button><button aria-pressed={reportTab === 'version'} onClick={() => setReportTab('version')}>Version du brouillon</button></div>{reportTab === 'report' ? <div className="report-content"><div className="report-summary"><span className="report-document-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h6" /></svg></span><div><h3>{working.projectTitle}</h3><p>Une page · un composant · trois couleurs</p></div></div><section className="report-section"><h3>Intention de conception</h3><p className={description ? '' : 'muted'}>{description || 'Aucune description saisie dans cette session.'}</p><small>Cette description est temporaire et n’a pas été enregistrée avec le brouillon.</small></section><section className="report-section"><h3>Palette actuelle</h3><div className="report-palette">{COLOR_TOKEN_NAMES.map((name) => <div key={name}><i style={{ backgroundColor: working.theme.tokens[name].value }} aria-hidden="true" /><span>{labels[name]}</span><code>{working.theme.tokens[name].value.toUpperCase()}</code></div>)}</div></section><section className="report-section"><h3>Analyse</h3><p>Règles locales · aucun modèle appelé.</p><p>{reportAnalysisLabel}</p><small>Le rapport sépare le document enregistré des réglages encore ouverts.</small></section></div> : <div className="report-content"><div className="version-card"><span>Version chargée</span><strong>v{confirmed.draftVersion}</strong><p>{dirty ? 'Des modifications restent à enregistrer.' : 'Le document ouvert correspond à cette version.'}</p></div><dl className="version-details"><div><dt>Projet</dt><dd>{working.projectTitle}</dd></div><div><dt>Conservation</dt><dd>{transport.kind === 'mcp' ? 'Serveur de qualification en mémoire' : transport.kind === 'browser-local' ? 'Ce navigateur · sept jours' : 'Cette session uniquement'}</dd></div><div><dt>Révision approuvée</dt><dd>Aucune — brouillon de travail</dd></div><div className="hash-detail"><dt>Empreinte du document enregistré</dt><dd><code>{confirmed.contentHash}</code></dd></div></dl><p className="report-limit">Cette étape ne crée pas encore d’historique de versions approuvées ni d’export de code. Le numéro ci-dessus suit les sauvegardes du brouillon.</p></div>}<footer className="report-footer"><p role="status" aria-live="polite">{reportFeedback || 'Un rapport de conception, prêt à être partagé.'}</p><div><button className="button" onClick={downloadReport}>Télécharger le rapport JSON</button><button className="button button--primary" onClick={() => void copyReport()}>Copier le rapport</button></div></footer></dialog>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Editor />);
