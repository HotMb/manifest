import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Puck, createUsePuck, type Data } from '@puckeditor/core';
import { COLOR_TOKEN_NAMES, applyOperations, createHeroBlock, disconnectedProviderRegistry, makeEditCommand, stableStringify, validateSnapshot, type ColorTokenName, type M0Project, type Snapshot, type ApplyOpsCommand, type SuggestionProposal } from '@design-workbench/m0-contract';
import { createBrowserTransport, createMcpTransport, type EditorTransport } from '@design-workbench/host-adapters';
import { heroConfig } from './hero.tsx';
import { applyDesignHint, DESCRIPTION_PAUSE_MS, isAnalysisCurrent, type DesignHint, type LocalAnalysis } from './manifest-analysis.ts';
import { useLocalAnalysis } from './use-local-analysis.ts';
import { EMPTY_MODEL_SELECTION, modelSelectionDeclaration, selectedModel, selectProvider, selectModel, type ModelSelection } from './model-selection.ts';
import { ModelProviderPanel } from './model-provider-panel.tsx';
import { useModelSuggestions } from './use-model-suggestions.ts';
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
function PuckSync({ composition, epoch }: { composition: Snapshot['pages'][number]['composition']; epoch: string | number }) {
  const dispatch = usePuck((state) => state.dispatch);
  const latest = useRef(composition); latest.current = composition;
  useEffect(() => {
    dispatch({ type: 'setData', data: { content: latest.current.content } });
    dispatch({ type: 'setUi', ui: { itemSelector: latest.current.content.length ? { index: 0, zone: 'root:default-zone' } : null } });
  }, [dispatch, epoch]);
  return null;
}

function ModelProposalCard({ proposal, eligible, previous: isPrevious, projectionError, saving, onKeep, onReject }: {
  proposal: SuggestionProposal;
  eligible: boolean;
  previous: boolean;
  projectionError: string;
  saving: boolean;
  onKeep: () => void;
  onReject: () => void;
}) {
  const ready = eligible && proposal.status === 'ready' && !projectionError;
  const previous = isPrevious || proposal.status === 'stale';
  return (
    <article className={`hint-card model-proposal${ready ? ' model-proposal--active' : ''}`} aria-label="Proposition du modèle">
      <div className="hint-category">Proposition du modèle<span>{ready ? 'Dans l’aperçu' : previous ? 'Proposition précédente' : 'Version à vérifier'}</span></div>
      <h3>{previous ? 'Un candidat précédent pour ta page' : 'Un candidat pour ta page'}</h3>
      <p>{proposal.explanation}</p>
      <p className="model-proposal__version">Basé sur le brouillon v{proposal.baseDraftVersion} · non approuvé</p>
      {projectionError && <p className="model-proposal__error" role="status">{projectionError}</p>}
      {previous && <p className="model-proposal__error" role="status">Ce candidat reste affiché pour référence. Il n’est plus applicable ; une nouvelle proposition est en préparation.</p>}
      <div className="proposal-actions">
        <button className="button button--primary" onClick={onKeep} disabled={!ready || saving} aria-busy={saving}>{saving ? 'Conservation…' : 'Conserver'}</button>
        <button className="button" onClick={onReject} disabled={saving}>Ignorer</button>
      </div>
    </article>
  );
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
  const [tab, setTab] = useState<'description' | 'page' | 'settings'>(() => window.matchMedia('(max-width: 1100px)').matches ? 'description' : 'page');
  const [workflowStep, setWorkflowStep] = useState<'describe' | 'compose' | 'transmit'>('describe');
  const [sidePanel, setSidePanel] = useState<'suggestions' | 'settings'>('suggestions');
  const [description, setDescription] = useState('');
  const [composing, setComposing] = useState(false);
  const [automaticAnalysis, setAutomaticAnalysis] = useState(false);
  const [localPreview, setLocalPreview] = useState<{ analysis: LocalAnalysis; hintId: string; snapshot: Snapshot }>();
  const [providerRegistry, setProviderRegistry] = useState(disconnectedProviderRegistry());
  const [providerRegistryLoading, setProviderRegistryLoading] = useState(true);
  const [providerRegistryUnavailable, setProviderRegistryUnavailable] = useState(false);
  const [modelSelection, setModelSelection] = useState<ModelSelection>(EMPTY_MODEL_SELECTION);
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
  const workflowFocus = useRef<'description' | 'page' | null>(null);
  const { analysis, phase: analysisPhase, runNow: analyzeNow } = useLocalAnalysis(description, working, automaticAnalysis, composing);

  useEffect(() => {
    const target = workflowFocus.current;
    if (!target) return;
    workflowFocus.current = null;
    if (target === 'description' && tab === 'description') descriptionInput.current?.focus();
    if (target === 'page' && tab === 'page') document.getElementById('page-preview')?.focus();
  }, [tab]);

  useEffect(() => {
    let disposed = false, current: EditorTransport | undefined;
    setLoading(true); setError(''); setRecoveryCode(undefined); setTransport(undefined);
    setProviderRegistry(disconnectedProviderRegistry()); setProviderRegistryLoading(true); setProviderRegistryUnavailable(false); setModelSelection(EMPTY_MODEL_SELECTION);
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
        if (current.readProviderRegistry) {
          void current.readProviderRegistry().then((registry) => {
            if (!disposed) setProviderRegistry(registry);
          }).catch(() => {
            if (!disposed) setProviderRegistryUnavailable(true);
          }).finally(() => {
            if (!disposed) setProviderRegistryLoading(false);
          });
        } else setProviderRegistryLoading(false);
      } catch (failure) { if (!disposed) { setError(message(failure)); setRecoveryCode(errorCode(failure)); } }
      finally { if (!disposed) setLoading(false); }
    })();
    return () => { disposed = true; void current?.close(); };
  }, [connectingEpoch]);

  const dirty = Boolean(working && confirmed && stableStringify(working) !== stableStringify(confirmed.snapshot));
  const activeModel = selectedModel(providerRegistry, modelSelection);
  const modelSuggestion = useModelSuggestions({
    transport, project: confirmed, snapshot: working, description, providerId: activeModel?.provider.id ?? null,
    modelId: activeModel?.model.id ?? null, automatic: automaticAnalysis, composing, dirty,
  });
  const modelProposal = modelSuggestion.proposal;
  const proposalProjection = { snapshot: modelSuggestion.previewSnapshot ?? working, error: modelProposal && modelSuggestion.phase === 'ready' && !modelSuggestion.previewSnapshot ? 'Cette proposition ne peut pas être affichée.' : '' };
  const proposalEligible = Boolean(modelProposal && modelProposal.status === 'ready' && modelSuggestion.phase === 'ready' && modelSuggestion.intent === description.trim() && modelProposal.baseDraftVersion === confirmed?.draftVersion && !dirty && !composing && modelSuggestion.providerId === activeModel?.provider.id && modelSuggestion.modelId === activeModel?.model.id && modelSuggestion.previewSnapshot);
  const previewingProposal = Boolean(proposalEligible && !proposalProjection.error);
  const previewingPreviousProposal = Boolean(modelProposal && !previewingProposal && modelSuggestion.previewSnapshot);
  const previewingLocalInsertion = Boolean(localPreview && !modelProposal && !composing && isAnalysisCurrent(localPreview.analysis, description, working));
  const previewingAnyProposal = previewingProposal || previewingPreviousProposal || previewingLocalInsertion;
  const canvasSnapshot = previewingProposal || previewingPreviousProposal ? proposalProjection.snapshot : previewingLocalInsertion ? localPreview!.snapshot : working;
  const hasWorkingHero = Boolean(working?.pages[0]?.composition.content.length);
  const hasCanvasHero = Boolean(canvasSnapshot?.pages[0]?.composition.content.length);
  useEffect(() => { if (localPreview && !previewingLocalInsertion) setLocalPreview(undefined); }, [localPreview, previewingLocalInsertion]);
  const proposalProvenance = useRef(new Map<string, { providerId: string; modelId: string }>());
  if (proposalEligible && modelProposal && modelSuggestion.providerId && modelSuggestion.modelId && !proposalProvenance.current.has(modelProposal.id)) {
    proposalProvenance.current.set(modelProposal.id, { providerId: modelSuggestion.providerId, modelId: modelSuggestion.modelId });
  }
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function edit(next: Snapshot, group: string, keepingLocalPreview = false) {
    if (savingRef.current || previewingProposal || previewingPreviousProposal || (previewingLocalInsertion && !keepingLocalPreview)) return;
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
    if (previewingAnyProposal || savingRef.current) return;
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
    if (previewingAnyProposal || savingRef.current) return;
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

  const workingSignature = working ? stableStringify(working) : '';
  useEffect(() => {
    if (!dirty || !transport || conflict || saving || composing || retryRef.current) return;
    const timer = setTimeout(() => { void save(); }, 900);
    return () => clearTimeout(timer);
  }, [dirty, workingSignature, confirmed?.draftVersion, transport, conflict, saving, composing]);

  async function keepModelProposal() {
    const proposal = modelSuggestion.proposal;
    if (!proposal || !transport?.keepSuggestionProposal || !confirmed || dirty || savingRef.current || !proposalEligible || proposalProjection.error) return;
    try {
      savingRef.current = true; setSaving(true); setError(''); setFeedback('');
      const decision = await transport.keepSuggestionProposal(proposal.id);
      const previous = workingRef.current;
      if (previous) setHistory((state) => ({ past: [...state.past.slice(-49), structuredClone(previous)], future: [] }));
      confirmedRef.current = decision.project; setConfirmed(decision.project);
      workingRef.current = decision.project.snapshot; setWorking(decision.project.snapshot);
      setSyncEpoch((value) => value + 1); setRecoveryCode(undefined); setConflict(false);
      modelSuggestion.suppressCurrent();
      setFeedback(`Proposition conservée et enregistrée dans le brouillon v${decision.project.draftVersion}.`);
    } catch (failure) {
      setError(message(failure)); setRecoveryCode(errorCode(failure));
      if (errorCode(failure) === 'VERSION_CONFLICT') { setConflict(true); modelSuggestion.clearProposal(); }
    } finally { savingRef.current = false; setSaving(false); }
  }

  async function rejectModelProposal() {
    const proposal = modelSuggestion.proposal;
    if (!proposal || !transport?.rejectSuggestionProposal || savingRef.current) return;
    try {
      await transport.rejectSuggestionProposal(proposal.id);
      if (proposalEligible) modelSuggestion.suppressCurrent();
      else modelSuggestion.clearPrevious();
      setFeedback('Proposition ignorée. Le brouillon reste inchangé.');
    } catch (failure) { setError(message(failure)); }
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
    if (!workingRef.current || !analysis || previewingAnyProposal || savingRef.current) return;
    if (analysis.description !== description.trim()) { setFeedback('La description a changé. Attends les nouvelles pistes avant de choisir.'); return; }
    try {
      const next = applyDesignHint(workingRef.current, analysis, hint.id);
      edit(next, `hint-${hint.id}`); setSyncEpoch((value) => value + 1);
      setFeedback('Piste locale appliquée. Elle sera enregistrée après une courte pause.');
    } catch (failure) { setError(message(failure)); }
  }

  function addFirstHero() {
    const current = workingRef.current;
    if (!current || current.pages[0]!.composition.content.length || previewingAnyProposal || savingRef.current || conflict) return;
    try {
      const next = applyOperations(current, [{ op: 'insert_block', pageId: current.pages[0]!.id, parentBlockId: null, slot: 'content', beforeBlockId: null, block: createHeroBlock() }]);
      edit(next, 'insert-hero'); setSyncEpoch((value) => value + 1);
      setSidePanel('settings'); setTab('settings'); setWorkflowStep('compose');
      setFeedback('Section d’accueil ajoutée. Elle sera enregistrée après une courte pause.');
    } catch (failure) { setError(message(failure)); }
  }

  function previewLocalHint(hint: DesignHint) {
    if (!workingRef.current || !analysis || previewingAnyProposal || savingRef.current) return;
    try {
      const snapshot = applyDesignHint(workingRef.current, analysis, hint.id);
      setLocalPreview({ analysis, hintId: hint.id, snapshot }); setTab('page'); setWorkflowStep('compose');
      setFeedback('Aperçu local temporaire. Le brouillon reste inchangé avant « Conserver la section ».');
    } catch (failure) { setError(message(failure)); }
  }

  function keepLocalInsertion() {
    if (!workingRef.current || !localPreview || !previewingLocalInsertion || savingRef.current || conflict) return;
    try {
      const next = applyDesignHint(workingRef.current, localPreview.analysis, localPreview.hintId);
      edit(next, 'keep-local-hero', true); setLocalPreview(undefined); setSyncEpoch((value) => value + 1);
      setFeedback('Section locale conservée. Elle sera enregistrée après une courte pause.');
    } catch (failure) { setError(message(failure)); }
  }

  function ignoreLocalInsertion() {
    setLocalPreview(undefined); setFeedback('Aperçu local ignoré. Le brouillon reste inchangé.');
  }

  function openReport(nextTab: 'report' | 'version') {
    if (nextTab === 'report') setWorkflowStep('transmit');
    setReportTab(nextTab); setReportFeedback(''); reportDialog.current?.showModal();
  }

  function navigateWorkflow(nextStep: 'describe' | 'compose' | 'transmit') {
    setWorkflowStep(nextStep);
    if (nextStep === 'transmit') { openReport('report'); return; }
    const target = nextStep === 'describe' ? 'description' : 'page';
    workflowFocus.current = target;
    setTab(target);
    if (tab === target) {
      workflowFocus.current = null;
      if (target === 'description') descriptionInput.current?.focus();
      else document.getElementById('page-preview')?.focus();
    }
  }

  function reportDocument() {
    const capturedProvenance = modelProposal ? proposalProvenance.current.get(modelProposal.id) : undefined;
    const proposalProvider = capturedProvenance && providerRegistry.providers.find((provider) => provider.id === capturedProvenance.providerId);
    const proposalModel = proposalProvider?.models.find((model) => model.id === capturedProvenance?.modelId);
    const localAnalysisIsCurrent = Boolean(analysis);
    return {
      format: 'manifest.design-report.v1',
      project: { projectId: confirmed?.projectId, draftVersion: confirmed?.draftVersion, contentHash: confirmed?.contentHash, snapshot: confirmed?.snapshot },
      workingCopy: { hasUncommittedChanges: dirty, snapshot: working, previewedProposal: previewingProposal ? proposalProjection.snapshot : null, previewedLocalInsertion: previewingLocalInsertion ? localPreview!.snapshot : null },
      brief: { description, persisted: false },
      modelSelection: modelSelectionDeclaration(providerRegistry, modelSelection),
      analysis: {
        source: capturedProvenance ? 'provider' : modelProposal ? 'unattributed' : localAnalysisIsCurrent ? 'local-rules' : 'none',
        status: modelProposal ? modelProposal.status : analysisPhase,
        upToDate: modelProposal ? previewingProposal : localAnalysisIsCurrent,
        model: capturedProvenance ? {
          providerId: capturedProvenance.providerId,
          provider: proposalProvider?.label ?? capturedProvenance.providerId,
          modelId: capturedProvenance.modelId,
          model: proposalModel?.label ?? capturedProvenance.modelId,
        } : null,
        provenanceStatus: capturedProvenance ? 'captured-at-first-eligible-preview' : modelProposal ? 'unavailable-in-proposal-contract' : localAnalysisIsCurrent ? 'local-rules' : 'none',
        recognized: modelProposal ? null : analysis ? analysis.recognized : null,
      },
      localAnalysis: analysis ? { source: 'local-rules', status: 'ready', upToDate: true, recognized: analysis.recognized } : null,
      modelSuggestion: modelProposal ? {
        id: modelProposal.id,
        jobId: modelProposal.jobId,
        generationId: modelProposal.generationId,
        baseDraftVersion: modelProposal.baseDraftVersion,
        providerId: capturedProvenance?.providerId ?? null,
        modelId: capturedProvenance?.modelId ?? null,
        provenanceStatus: capturedProvenance ? 'captured-at-first-eligible-preview' : 'unavailable-in-proposal-contract',
        status: modelProposal.status,
        eligibleForPreview: previewingProposal,
        operations: modelProposal.operations,
        explanation: modelProposal.explanation,
      } : null,
      capabilities: { approvedRevision: false, codeExport: false, modelInference: Boolean(modelProposal || activeModel) },
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

  const config = useMemo(() => canvasSnapshot ? heroConfig(canvasSnapshot.theme) : undefined, [canvasSnapshot?.theme]);
  const connectionLabel = transport?.kind === 'mcp' ? 'Connecté à l’hôte' : transport?.kind === 'browser-local' ? 'Diagnostic navigateur · sauvegarde locale' : 'Diagnostic navigateur · session locale';
  const saveLabel = saving ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' : transport?.kind === 'mcp' ? 'Version serveur chargée' : confirmed?.draftVersion ? 'Brouillon local enregistré' : 'Brouillon de départ';
  const reportAnalysisLabel = modelProposal ? `Proposition ${modelProposal.status} sur la version ${modelProposal.baseDraftVersion}${previewingProposal ? ' · visible dans l’aperçu' : ' · non éligible à l’aperçu courant'}.` : analysis ? `${analysis.recognized.length} indication(s) reconnue(s) par les règles locales.` : analysisPhase === 'typing' ? 'Lecture de la description en attente de la pause. Aucune analyse à jour.' : analysisPhase === 'paused' ? 'Lecture automatique suspendue.' : 'Aucune description analysée dans cette session.';
  const reportModelLabel = modelProposal
    ? (() => { const captured = proposalProvenance.current.get(modelProposal.id); const provider = captured && providerRegistry.providers.find((entry) => entry.id === captured.providerId); const model = provider?.models.find((entry) => entry.id === captured?.modelId); return captured ? `${provider?.label ?? captured.providerId} · ${model?.label ?? captured.modelId}` : 'Provenance du fournisseur non enregistrée avec cette proposition'; })()
    : analysis ? 'Pistes locales · règles M0' : activeModel ? 'Modèle sélectionné · aucune proposition' : 'Aucune source sélectionnée';
  const inputStatusTitle = composing ? 'Saisie en cours' : automaticAnalysis ? activeModel ? ({ typing: 'Le modèle attend ta pause', syncing: 'Mise à jour du brouillon', starting: 'Demande envoyée', running: 'Le modèle compose', ready: 'Proposition prête', stale: 'Proposition à actualiser', error: 'La proposition a échoué', paused: 'Suggestions suspendues', unavailable: 'Modèle indisponible', idle: 'Prêt à analyser' } as const)[modelSuggestion.phase] : ({ typing: 'Lecture après ta pause', paused: 'Suggestions suspendues', ready: 'Pistes locales prêtes', idle: 'Prêt à analyser' } as const)[analysisPhase] : 'Analyse à la demande';
  const inputStatusDetail = automaticAnalysis
    ? activeModel ? 'Après 1,5 s sans saisie, la description et le brouillon enregistré sont envoyés au modèle choisi.' : 'Après 1,5 s sans saisie, les règles locales proposent des pistes à appliquer.'
    : 'L’analyse automatique est désactivée. Lance une proposition quand tu le souhaites ; rien ne part à chaque frappe.';
  const suggestionPhase = activeModel ? modelSuggestion.phase : analysisPhase;
  const suggestionTitle = activeModel ? ({ idle: 'Prêt à proposer', typing: 'Lecture après ta pause', syncing: 'Enregistrement du brouillon', starting: 'Demande envoyée', running: 'Le modèle compose', ready: 'Proposition prête', stale: 'Proposition à recalculer', error: 'La proposition a échoué', paused: 'Suggestions suspendues', unavailable: 'Modèle indisponible' } as const)[modelSuggestion.phase] : ({ idle: 'Une intention, puis des pistes', typing: 'Lecture après ta pause', paused: 'Lecture automatique suspendue', ready: 'Analyse locale prête' } as const)[analysisPhase];
  const suggestionDetail = activeModel ? ({ idle: 'Écris une intention pour voir un candidat dans l’aperçu.', typing: 'Continue d’écrire. Aucun nouvel appel n’est lancé avant la pause.', syncing: 'Les réglages de la page sont enregistrés avant la génération.', starting: 'La demande part vers le modèle sélectionné.', running: 'La page reste disponible pendant la génération.', ready: 'Le candidat est visible à gauche et attend ton choix.', stale: modelSuggestion.error ?? 'La proposition ne correspond plus au brouillon courant.', error: modelSuggestion.error ?? 'Réessaie après avoir vérifié le fournisseur.', paused: 'La lecture automatique est suspendue. Tu peux proposer maintenant.', unavailable: modelSuggestion.error ?? 'Les pistes locales restent disponibles.' } as const)[modelSuggestion.phase] : analysis ? `${analysis.recognized.length} indication(s) reconnue(s).` : analysisPhase === 'typing' ? 'Les pistes locales apparaissent après la pause.' : 'Décris une couleur, une entrée ou les mots à afficher.';
  const showInspector = Boolean(description.trim() || modelProposal || sidePanel === 'settings');

  if (loading) return <main className="startup"><div className="workbench-mark" aria-hidden="true">m</div><h1>Ouverture de Manifest</h1><p role="status">Connexion et lecture du brouillon…</p></main>;
  if (!working || !confirmed || !config || !transport) return <main className="startup"><h1>{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' ? 'Brouillon local à reprendre' : 'L’atelier n’a pas pu s’ouvrir'}</h1><p role="alert">{error}</p>{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' && transport?.recoverExpired ? <button className="button button--primary" disabled={saving} aria-busy={saving} onClick={() => void recoverExpired()}>Reprendre le brouillon expiré</button> : <button className="button button--primary" onClick={() => setConnectingEpoch((value) => value + 1)}>Réessayer la connexion</button>}</main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="skip-link" href="#page-preview">Aller à l’aperçu</a>
        <div className="app-identity"><div className="workbench-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V6l8 7 8-7v12M4 6l8 12 8-12" /></svg></div><strong>manifest<span>.</span></strong></div>
        <div className="project-heading"><div className="project-heading__copy"><span>{working.projectTitle}<span className="project-divider" aria-hidden="true"> / </span>Accueil</span><small>Design · Espace de conception</small></div><span className="draft-badge">Brouillon</span><button className="version-button" onClick={() => openReport('version')} aria-label={`Voir la version ${confirmed.draftVersion}`}>v{confirmed.draftVersion}</button></div>
        <div className="topbar-actions"><button className="button save-button" onClick={() => void save()} disabled={saving || !dirty || conflict || Boolean(retryRef.current)} aria-busy={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button><button className="button report-button" onClick={() => openReport('report')}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h7l3 3V17.5H5zM12 2.5V6h3M8 9h4M8 12h4" /></svg>Préparer le rapport</button></div>
      </header>

      <nav className="workflow-bar" aria-label="Étapes de conception">
        <div className="workflow-steps">
          <button className="workflow-step" aria-current={workflowStep === 'describe' ? 'step' : undefined} onClick={() => navigateWorkflow('describe')}><span>01</span>Décrire</button>
          <button className="workflow-step" aria-current={workflowStep === 'compose' ? 'step' : undefined} onClick={() => navigateWorkflow('compose')}><span>02</span>Composer</button>
          <button className="workflow-step" aria-current={workflowStep === 'transmit' ? 'step' : undefined} onClick={() => navigateWorkflow('transmit')}><span>03</span>Transmettre</button>
        </div>
        <span className="workflow-state"><i aria-hidden="true" />{automaticAnalysis ? `Analyse après ${DESCRIPTION_PAUSE_MS / 1000} s de pause` : `À la demande · pause ${DESCRIPTION_PAUSE_MS / 1000} s`}</span>
      </nav>

      {error && <div className="error-banner" role="alert"><div><strong>{conflict ? 'Le brouillon a changé ailleurs' : 'Enregistrement à vérifier'}</strong><p>{error}</p></div><div className="error-banner__actions"><button className="button" onClick={downloadDraft}>Télécharger mes réglages</button><button className="button" disabled={saving} onClick={() => void verifySave()}>Vérifier la version enregistrée</button>{retryRef.current && !conflict && recoveryCode !== 'LOCAL_RECOVERY_EXPIRED' && <button className="button" disabled={saving} onClick={() => void save(true)}>Réessayer l’enregistrement en attente</button>}{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' && transport.recoverExpired && <button className="button" disabled={saving} onClick={() => void recoverExpired()}>Reprendre le brouillon expiré</button>}{conflict && <button className="button" disabled={saving} onClick={() => reloadDialog.current?.showModal()}>Recharger…</button>}</div></div>}

      <div className="mobile-tabs" role="group" aria-label="Zone de travail"><button aria-pressed={tab === 'description'} onClick={() => { setWorkflowStep('describe'); setTab('description'); }}>Description</button><button aria-pressed={tab === 'page'} onClick={() => { setWorkflowStep('compose'); setTab('page'); }}>Aperçu de la page</button><button aria-pressed={tab === 'settings' && sidePanel === 'suggestions'} onClick={() => { setTab('settings'); setSidePanel('suggestions'); }}>Suggestions</button><button aria-pressed={tab === 'settings' && sidePanel === 'settings'} onClick={() => { setTab('settings'); setSidePanel('settings'); }}>Réglages du bloc</button></div>

        <Puck config={config} data={canvasSnapshot!.pages[0]!.composition} onChange={onPuckChange} iframe={{ enabled: false }} permissions={{ drag: false, insert: false, delete: false, duplicate: false, edit: !previewingAnyProposal && !saving }} ui={{ itemSelector: hasCanvasHero ? { index: 0, zone: 'root:default-zone' } : null }} dictionary={dictionary}>
        <PuckSync composition={canvasSnapshot!.pages[0]!.composition} epoch={`${syncEpoch}:${previewingProposal || previewingPreviousProposal ? modelProposal?.generationId : previewingLocalInsertion ? 'local-insertion' : 'manual'}`} />
        <div className="workspace" data-mobile-tab={tab} data-inspector={showInspector ? 'visible' : 'hidden'}>
          <aside className="description-panel" aria-labelledby="description-title">
            <div className="panel-heading"><span className="panel-symbol" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 4h12M4 8h12M4 12h8M4 16h5" /></svg></span><h2 id="description-title">Décrivez votre interface</h2><span className="local-label">M0</span></div>
            <div className="description-body"><p>Un composant, une intention, un mouvement. Commencez avec vos mots.</p>
              <label className="sr-only" htmlFor="page-description">Description de la page</label>
              <div className="description-composer"><textarea ref={descriptionInput} id="page-description" className="description-input resize-none" value={description} onChange={(event) => { const next = event.target.value; setDescription(next); setWorkflowStep(next.trim() ? 'compose' : 'describe'); }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} maxLength={6000} placeholder="Décrivez la page et les composants que vous imaginez…" aria-describedby="description-help" /><div className="composer-foot"><span>{description.length.toLocaleString('fr-FR')} / 6 000</span>{description && <button className="text-button" onClick={() => { setDescription(''); setWorkflowStep('describe'); descriptionInput.current?.focus(); }}>Effacer</button>}</div></div>
              <div className="intent-status" role="status" aria-live="polite"><span className="intent-status__icon" aria-hidden="true"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg></span><span><strong>{inputStatusTitle}</strong><small>{inputStatusDetail}</small></span></div>
              <div className="analysis-preference"><label><input type="checkbox" checked={automaticAnalysis} onChange={(event) => setAutomaticAnalysis(event.target.checked)} />{activeModel ? 'Analyse automatique du modèle' : 'Analyse automatique locale'}</label><span>{(DESCRIPTION_PAUSE_MS / 1000).toLocaleString('fr-FR')} s</span></div>
              <button className="button analyze-button" onClick={() => { if (activeModel && ['starting', 'running'].includes(modelSuggestion.phase)) modelSuggestion.cancelCurrent(); else { analyzeNow(); modelSuggestion.runNow(); } }} disabled={['starting', 'running'].includes(modelSuggestion.phase) ? false : !description.trim() || composing}>{activeModel && ['starting', 'running'].includes(modelSuggestion.phase) ? 'Annuler la génération' : 'Proposer maintenant'}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 5l5 5-5 5" /></svg></button>
              <p id="description-help" className="description-help">Les pistes locales repèrent les couleurs, le fondu, une demande de Hero et les lignes « Titre : » ou « Texte : ». Sans activation automatique, le modèle n’est sollicité que si tu demandes une proposition.</p>
              <details className="model-provider-disclosure">
                <summary>{activeModel ? `${activeModel.provider.label} · ${activeModel.model.label}` : 'Suggestions par modèle'}</summary>
                <ModelProviderPanel registry={providerRegistry} selection={modelSelection} onChange={setModelSelection} loading={providerRegistryLoading} unavailable={providerRegistryUnavailable} />
              </details>
              <div className="description-examples"><span>Une direction à explorer</span><button onClick={() => { setDescription('Un fond clair avec un accent bleu.\nTitre : Des espaces qui nous ressemblent\nTexte : Un atelier indépendant pour imaginer vos lieux de vie.'); setWorkflowStep('compose'); descriptionInput.current?.focus(); }}>Page de présentation<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" /></svg></button><button onClick={() => { setDescription('Un fond sombre avec un accent vert et un fondu à l’entrée.'); setWorkflowStep('compose'); descriptionInput.current?.focus(); }}>Page sombre animée<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" /></svg></button></div>
            </div>
            <div className="description-footer"><span className="connection-dot" aria-hidden="true" /><span>Ton texte reste dans cette session.<br />Seuls les réglages de la page sont enregistrés.</span></div>
          </aside>
          <main id="page-preview" className="canvas-region" aria-label={previewingPreviousProposal ? 'Aperçu de la proposition précédente' : previewingProposal ? 'Aperçu de la proposition' : previewingLocalInsertion ? 'Aperçu de la piste locale' : 'Aperçu modifiable de la page'} tabIndex={-1}>
            <div className="workspace-toolbar"><div className="page-meta"><span className="page-indicator" aria-hidden="true" /><strong>{previewingPreviousProposal ? 'Proposition précédente' : previewingProposal ? 'Proposition' : previewingLocalInsertion ? 'Piste locale' : 'Aperçu'}</strong><span className={`live-label${previewingAnyProposal ? ' live-label--candidate' : ''}`}>{previewingProposal ? 'Candidat · non enregistré' : previewingPreviousProposal ? 'Version antérieure · lecture seule' : previewingLocalInsertion ? 'Règle locale · non enregistrée' : 'En direct'}</span></div><div className="segmented" aria-label="Format de l’aperçu"><button aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')} title="Aperçu ordinateur"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="10" rx="1" /><path d="M10 13v4M6 17h8" /></svg><span>Ordinateur</span></button><button aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')} title="Aperçu mobile"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="2" width="8" height="16" rx="1.5" /><path d="M9 15h2" /></svg><span>Mobile</span></button></div><div className="history-controls"><button className="button button--quiet" onClick={() => travel('past')} disabled={!history.past.length || previewingAnyProposal || saving}>Annuler</button><button className="button button--quiet" onClick={() => travel('future')} disabled={!history.future.length || previewingAnyProposal || saving}>Rétablir</button></div></div>
            <div className="canvas-ruler"><div className="browser-dots" aria-hidden="true"><i /><i /><i /></div><span className="canvas-route"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="5" width="6" height="5" rx="1" /><path d="M4 5V3a2 2 0 0 1 4 0v2" /></svg>manifest.local / accueil</span><span className="canvas-size">{viewport === 'desktop' ? 'Desktop · 100 %' : 'Mobile · 375 px'}</span></div>
            <div className="canvas-stage"><div className={`canvas-frame canvas-frame--${viewport}`} style={{ backgroundColor: canvasSnapshot!.theme.tokens['color.background'].value }}>{hasCanvasHero ? <Puck.Preview /> : <div className="empty-canvas" role="region" aria-label="Canevas vide" />}</div></div>
            <div className="canvas-bottom"><p>{previewingLocalInsertion ? 'Piste locale temporaire · le brouillon reste inchangé.' : previewingProposal ? 'Candidat temporaire · garde-le ou ignore-le.' : previewingPreviousProposal ? 'Proposition précédente · lecture seule, non applicable.' : hasWorkingHero ? 'Section d’accueil du brouillon.' : 'Canevas vide · aucun composant ajouté.'}</p>{previewingLocalInsertion ? <div className="proposal-actions"><button className="button button--primary" disabled={saving || conflict} onClick={keepLocalInsertion}>Conserver la section</button><button className="button" disabled={saving} onClick={ignoreLocalInsertion}>Ignorer l’aperçu local</button></div> : !previewingAnyProposal && (hasWorkingHero ? <button className="text-button" onClick={() => { setSidePanel('settings'); setTab('settings'); }}>Modifier le bloc<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" /></svg></button> : <button className="button" disabled={saving || conflict} onClick={addFirstHero}>Ajouter une section d’accueil</button>)}</div>
          </main>
          <aside className="inspector" aria-label="Panneau de conception">
            <div className="panel-heading"><span className="panel-symbol" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 4h10M5 10h10M5 16h10" /><circle cx="8" cy="4" r="2" /><circle cx="13" cy="10" r="2" /><circle cx="7" cy="16" r="2" /></svg></span><h2>Suggestions</h2><span className="hint-count">{(analysis?.hints.length ?? 0) + (modelProposal ? 1 : 0)} piste{(analysis?.hints.length ?? 0) + (modelProposal ? 1 : 0) === 1 ? '' : 's'}</span></div>
            <div className="inspector-tabs" role="group" aria-label="Panneau de conception"><button aria-pressed={sidePanel === 'suggestions'} onClick={() => setSidePanel('suggestions')}>Suggestions</button><button aria-pressed={sidePanel === 'settings'} onClick={() => setSidePanel('settings')}>Réglages</button></div>
            {sidePanel === 'suggestions' ? <div className="suggestions-panel" data-analysis-phase={suggestionPhase}>
              <div className={`analysis-state analysis-state--${suggestionPhase}`} role="status" aria-live="polite"><span className="analysis-indicator" aria-hidden="true" /><div><strong>{suggestionTitle}</strong><span>{suggestionDetail}</span></div></div>
              {modelProposal && <ModelProposalCard proposal={modelProposal} eligible={proposalEligible} previous={previewingPreviousProposal} projectionError={proposalProjection.error} saving={saving} onKeep={() => void keepModelProposal()} onReject={() => void rejectModelProposal()} />}
              {analysis?.hints.length ? <div className="hint-list">{analysis.hints.map((hint) => <article className={`hint-card hint-card--${hint.category}`} key={hint.id}><div className="hint-category">{hint.category === 'palette' ? 'Couleurs' : hint.category === 'motion' ? 'Mouvement' : hint.category === 'component' ? 'Composant' : 'Contenu'}<span>Règle locale</span></div><h3>{hint.title}</h3><p>{hint.description}</p>{hint.swatches && <div className="hint-swatches" aria-label={`Palette proposée : ${hint.swatches.join(', ')}`}>{hint.swatches.map((color, index) => <span style={{ backgroundColor: color }} key={`${color}-${index}`} />)}</div>}<button className="button hint-apply" onClick={() => hint.category === 'component' ? previewLocalHint(hint) : applyHint(hint)} disabled={previewingAnyProposal || saving}>{hint.category === 'component' ? 'Prévisualiser la section' : 'Appliquer '}{hint.category === 'component' ? '' : hint.category === 'palette' ? 'la palette' : hint.category === 'motion' ? 'l’animation' : 'le contenu'}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3l5 5-5 5" /></svg></button></article>)}</div> : !modelProposal && <div className="suggestions-empty"><div className="empty-diagram" aria-hidden="true"><span /><span /><span /></div><h3>{analysisPhase === 'ready' ? analysis?.recognized.length ? 'Ta page suit déjà ces indications.' : 'Précisons la direction.' : modelProposal ? 'Le candidat est prêt à examiner.' : 'La prochaine idée commence à gauche.'}</h3><p>{analysisPhase === 'ready' ? 'Essaie un fond sombre, un accent vert, un fondu, ou un titre explicite. Les pistes locales restent des choix à appliquer.' : 'Décris une couleur, une entrée ou les mots à afficher. Les pistes locales apparaissent après une pause.'}</p></div>}
              {hasWorkingHero && <section className="component-summary"><h3>Dans cette page</h3><div><span className="component-thumb" aria-hidden="true"><i /><i /></span><div><strong>Section d’accueil</strong><span>Hero · contenu modifiable</span></div><button className="text-button" onClick={() => setSidePanel('settings')}>Régler</button></div></section>}
              <p className="suggestions-disclosure">Les propositions de modèle prévisualisent un candidat avant conservation. Les règles locales restent disponibles ; l’export de code arrivera dans une étape ultérieure.</p>
            </div> : <div className="settings-panel">{hasCanvasHero ? <><div className="inspector-heading"><span className="selection-mark" aria-hidden="true" /><div><h3>Section d’accueil</h3><p>Contenu & apparence</p></div></div><div className="puck-fields"><Puck.Fields /></div></> : <div className="empty-settings"><h3>Aucun composant dans cette page</h3><p>Ajoute une section d’accueil depuis le canevas, ou décris un Hero pour examiner une piste locale.</p><button className="button" disabled={saving || conflict} onClick={addFirstHero}>Ajouter le premier Hero</button></div>}<fieldset className="theme-fields"><legend>Couleurs de la page</legend><p>Ces réglages s’appliquent au site, pas à l’atelier.</p>{COLOR_TOKEN_NAMES.map((name) => <label className="color-control" key={name}><span>{labels[name]}</span><span className="color-control__value"><code>{working.theme.tokens[name].value.toUpperCase()}</code><input type="color" aria-label={labels[name]} value={working.theme.tokens[name].value} disabled={saving || previewingAnyProposal} onChange={(event) => changeColor(name, event.target.value)} /></span></label>)}</fieldset><div className="inspector-note"><strong>Un changement reste un choix.</strong><p>{previewingAnyProposal ? 'L’aperçu du candidat est en lecture seule. Ignore-le ou attends la proposition suivante avant de modifier le bloc.' : 'Les réglages changent l’aperçu immédiatement et sont enregistrés après une courte pause.'}</p></div></div>}
          </aside>
        </div>
      </Puck>

      <footer className="statusbar"><span className="save-state" role="status" aria-live="polite"><span className="connection-dot" aria-hidden="true" />{feedback || saveLabel}</span><span>{connectionLabel}</span><button className="text-button footer-version" onClick={() => openReport('version')}>Brouillon v{confirmed.draftVersion}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg></button></footer>
      <dialog ref={reloadDialog} className="dialog" aria-labelledby="reload-title"><h2 id="reload-title">Recharger la version enregistrée ?</h2><p>Les réglages non enregistrés de cette page seront remplacés. Tu peux d’abord télécharger ton brouillon.</p><div className="dialog-actions"><button className="button" autoFocus onClick={() => reloadDialog.current?.close()}>Garder mes réglages</button><button className="button" onClick={downloadDraft}>Télécharger le brouillon</button><button className="button button--primary" disabled={saving} onClick={() => void reloadConfirmed()}>Recharger la version</button></div></dialog>
      <dialog ref={reportDialog} className="dialog report-dialog" aria-labelledby="report-title"><header className="report-header"><div><span>Manifest / état du projet</span><h2 id="report-title">Rapport & version</h2></div><button className="icon-button" aria-label="Fermer le rapport" autoFocus onClick={() => reportDialog.current?.close()}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M5 15L15 5" /></svg></button></header><div className="report-tabs" role="group" aria-label="Contenu du rapport"><button aria-pressed={reportTab === 'report'} onClick={() => setReportTab('report')}>Rapport de conception</button><button aria-pressed={reportTab === 'version'} onClick={() => setReportTab('version')}>Version du brouillon</button></div>{reportTab === 'report' ? <div className="report-content"><div className="report-summary"><span className="report-document-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h6" /></svg></span><div><h3>{working.projectTitle}</h3><p>Une page · {hasWorkingHero ? 'un composant' : 'aucun composant'} · trois couleurs</p></div></div><section className="report-section"><h3>Intention de conception</h3><p className={description ? '' : 'muted'}>{description || 'Aucune description saisie dans cette session.'}</p><small>Cette description est temporaire et n’a pas été enregistrée avec le brouillon.</small></section><section className="report-section"><h3>Palette actuelle</h3><div className="report-palette">{COLOR_TOKEN_NAMES.map((name) => <div key={name}><i style={{ backgroundColor: working.theme.tokens[name].value }} aria-hidden="true" /><span>{labels[name]}</span><code>{working.theme.tokens[name].value.toUpperCase()}</code></div>)}</div></section><section className="report-section"><h3>Analyse</h3><p>{reportModelLabel}</p><p>{reportAnalysisLabel}</p><small>Le rapport distingue la version enregistrée, la copie de travail et la proposition prévisualisée.</small></section></div> : <div className="report-content"><div className="version-card"><span>Version chargée</span><strong>v{confirmed.draftVersion}</strong><p>{dirty ? 'Des modifications restent à enregistrer.' : 'Le document ouvert correspond à cette version.'}</p></div><dl className="version-details"><div><dt>Projet</dt><dd>{working.projectTitle}</dd></div><div><dt>Conservation</dt><dd>{transport.kind === 'mcp' ? 'Serveur de qualification en mémoire' : transport.kind === 'browser-local' ? 'Ce navigateur · sept jours' : 'Cette session uniquement'}</dd></div><div><dt>Révision approuvée</dt><dd>Aucune — brouillon de travail</dd></div><div className="hash-detail"><dt>Empreinte du document enregistré</dt><dd><code>{confirmed.contentHash}</code></dd></div></dl><p className="report-limit">Cette étape ne crée pas encore d’historique de versions approuvées ni d’export de code. Le numéro ci-dessus suit les sauvegardes du brouillon.</p></div>}<footer className="report-footer"><p role="status" aria-live="polite">{reportFeedback || 'Un rapport de conception, prêt à être partagé.'}</p><div><button className="button" onClick={downloadReport}>Télécharger le rapport JSON</button><button className="button button--primary" onClick={() => void copyReport()}>Copier le rapport</button></div></footer></dialog>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Editor />);
