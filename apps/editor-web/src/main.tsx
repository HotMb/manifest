import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Puck, createUsePuck, type Data } from '@puckeditor/core';
import { renderCatalogPage } from '@design-workbench/catalog';
import { COLOR_TOKEN_NAMES, applyOperations, createHeroBlock, disconnectedProviderRegistry, makeEditCommand, stableStringify, validateSnapshot, type ColorTokenName, type M0Operation, type M0Project, type Snapshot, type ApplyOpsCommand, type SuggestionProposal, type EditorLaunchContext } from '@design-workbench/m0-contract';
import { createBrowserTransport, createMcpTransport, type ChatGPTAuthErrorCode, type ChatGPTAuthStatus, type EditorTransport } from '@design-workbench/host-adapters';
import { heroConfig } from './hero.tsx';
import { applyDesignHint, DESCRIPTION_PAUSE_MS, isAnalysisCurrent, type DesignHint, type LocalAnalysis } from './manifest-analysis.ts';
import { launchPreviewSnapshot } from './launch-preview.ts';
import { useLocalAnalysis } from './use-local-analysis.ts';
import { EMPTY_MODEL_SELECTION, defaultAllowedModelSelection, modelSelectionDeclaration, selectedModel, selectProvider, selectModel, type ModelSelection } from './model-selection.ts';
import { ModelProviderPanel } from './model-provider-panel.tsx';
import { ComponentExamples } from './component-examples.tsx';
import { useModelSuggestions } from './use-model-suggestions.ts';
import '@puckeditor/core/no-external.css';
import 'virtual:editor-tokens.css';
import '@design-workbench/catalog/styles.css';
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

type LocalPreview = { analysis: LocalAnalysis; operations: M0Operation[]; snapshot: Snapshot };
const INITIAL_CHATGPT_AUTH: ChatGPTAuthStatus = { status: 'disconnected', usageMode: 'none' };

function chatGPTAuthErrorMessage(code?: ChatGPTAuthErrorCode): string {
  switch (code) {
    case 'unsupported_platform': return 'La connexion avec ChatGPT n’est pas disponible dans cet hôte.';
    case 'authorization_expired': return 'Le lien d’autorisation a expiré. Relance la connexion.';
    case 'consent_denied': return 'L’autorisation a été refusée. Aucun usage du forfait ChatGPT n’est actif.';
    case 'invalid_callback': return 'Le retour d’autorisation n’a pas pu être vérifié. Relance la connexion.';
    case 'invalid_token': return 'La connexion ChatGPT a expiré ou n’est plus valide. Reconnecte ton compte.';
    case 'insufficient_scope': return 'L’autorisation ne permet pas l’usage du forfait ChatGPT. Recommence et accepte les accès demandés.';
    case 'network_error': return 'ChatGPT n’a pas répondu. Vérifie ta connexion puis réessaie.';
    case 'storage_error': return 'La connexion n’a pas pu être conservée sur cet appareil. Réessaie après vérification du stockage local.';
    case 'revocation_failed': return 'La déconnexion locale est faite, mais la révocation distante a échoué. Vérifie aussi les paramètres de ChatGPT.';
    case 'unknown': return 'La connexion n’a pas abouti. Tes descriptions et réglages sont conservés.';
    default: return 'La connexion n’a pas abouti. Tes descriptions et réglages sont conservés.';
  }
}

function modelUsageAllowed(selected: ReturnType<typeof selectedModel>, authStatus: ChatGPTAuthStatus) {
  return !selected || selected.provider.protocol !== 'openai-responses' || (authStatus.status === 'connected' && authStatus.usageMode === 'chatgpt-plan');
}

function allowedDefaultSelection(registry: ReturnType<typeof disconnectedProviderRegistry>, authStatus: ChatGPTAuthStatus): ModelSelection {
  return defaultAllowedModelSelection(registry, authStatus.status === 'connected' && authStatus.usageMode === 'chatgpt-plan');
}

function localPreviewOperations(analysis: LocalAnalysis): M0Operation[] {
  // Prefer a complete page candidate over separately recognized hints. A
  // dashboard recipe and a title can each be valid alone, but combining the
  // recipe's CatalogPage with an inserted legacy Hero is an invalid page.
  const fullPageCandidate = analysis.hints.find((hint) => hint.id === 'sales-cloud-dashboard')
    ?? analysis.hints.find((hint) => hint.id === 'insert-hero');
  const hints = fullPageCandidate ? [fullPageCandidate] : analysis.hints;
  const seen = new Set<string>();
  return hints.flatMap((hint) => hint.operations).filter((operation) => {
    const signature = stableStringify(operation);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

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
  const [compactPanel, setCompactPanel] = useState<'describe' | 'preview' | 'suggestions'>('describe');
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [motionPreviewOverride, setMotionPreviewOverride] = useState(false);
  const [description, setDescription] = useState('');
  const [composing, setComposing] = useState(false);
  // Manifest always reacts to a settled description. A selected provider uses
  // the same debounce; without one, the disclosed local rules remain available.
  const automaticAnalysis = true;
  const [localPreview, setLocalPreview] = useState<LocalPreview>();
  const [providerRegistry, setProviderRegistry] = useState(disconnectedProviderRegistry());
  const [providerRegistryLoading, setProviderRegistryLoading] = useState(true);
  const [providerRegistryUnavailable, setProviderRegistryUnavailable] = useState(false);
  const [modelSelection, setModelSelection] = useState<ModelSelection>(EMPTY_MODEL_SELECTION);
  const [chatGPTAuthStatus, setChatGPTAuthStatus] = useState<ChatGPTAuthStatus>(INITIAL_CHATGPT_AUTH);
  const [chatGPTAuthLoading, setChatGPTAuthLoading] = useState(true);
  const [chatGPTAuthBusy, setChatGPTAuthBusy] = useState(false);
  const [chatGPTAuthorizationUrl, setChatGPTAuthorizationUrl] = useState<string>();
  const [chatGPTAuthorizationExpiresAt, setChatGPTAuthorizationExpiresAt] = useState<string>();
  const [chatGPTAuthNotice, setChatGPTAuthNotice] = useState('');
  const [chatGPTAuthError, setChatGPTAuthError] = useState('');
  const [chatGPTPollEpoch, setChatGPTPollEpoch] = useState(0);
  const [reportTab, setReportTab] = useState<'report' | 'version'>('report');
  const [reportFeedback, setReportFeedback] = useState('');
  const [history, setHistory] = useState<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      setSystemReducedMotion(preference.matches);
      if (!preference.matches) setMotionPreviewOverride(false);
    };
    preference.addEventListener('change', syncPreference);
    return () => preference.removeEventListener('change', syncPreference);
  }, []);
  const workingRef = useRef(working); workingRef.current = working;
  const confirmedRef = useRef(confirmed); confirmedRef.current = confirmed;
  const savingRef = useRef(false);
  const retryRef = useRef<{ command: ApplyOpsCommand; snapshot: Snapshot } | undefined>(undefined);
  const lastEdit = useRef({ group: '', time: 0 });
  const reloadDialog = useRef<HTMLDialogElement>(null);
  const reportDialog = useRef<HTMLDialogElement>(null);
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  const chatGPTAuthGeneration = useRef(0);
  const [launchContext, setLaunchContext] = useState<EditorLaunchContext>();
  const [launchCandidate, setLaunchCandidate] = useState<{ snapshot: Snapshot; baseSignature: string }>();
  const [launchFeedback, setLaunchFeedback] = useState('');
  const [pendingLaunchText, setPendingLaunchText] = useState<string>();
  const [pendingLaunchBackground, setPendingLaunchBackground] = useState<string>();
  const handledLaunch = useRef(new Set<string>());
  const descriptionEdited = useRef(false);
  const launchBusy = Boolean(launchCandidate || pendingLaunchBackground);
  const { analysis, phase: analysisPhase, runNow: analyzeNow } = useLocalAnalysis(description, working, automaticAnalysis, composing || launchBusy);

  useEffect(() => {
    let disposed = false, current: EditorTransport | undefined;
    setLoading(true); setError(''); setRecoveryCode(undefined); setTransport(undefined);
    setProviderRegistry(disconnectedProviderRegistry()); setProviderRegistryLoading(true); setProviderRegistryUnavailable(false); setModelSelection(EMPTY_MODEL_SELECTION);
    setChatGPTAuthStatus(INITIAL_CHATGPT_AUTH); setChatGPTAuthLoading(true); setChatGPTAuthBusy(false);
    setChatGPTAuthorizationUrl(undefined); setChatGPTAuthorizationExpiresAt(undefined); setChatGPTAuthNotice(''); setChatGPTAuthError('');
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
        let authForModels = Promise.resolve(INITIAL_CHATGPT_AUTH);
        if (current.getChatGPTAuthStatus) {
          authForModels = current.getChatGPTAuthStatus().then((status) => {
            if (!disposed) setChatGPTAuthStatus(status);
            return status;
          }).catch((failure) => {
            if (!disposed) {
              const code = errorCode(failure) as ChatGPTAuthErrorCode | undefined;
              setChatGPTAuthStatus({ status: 'error', usageMode: 'none', ...(code ? { errorCode: code } : {}) });
              setChatGPTAuthError(chatGPTAuthErrorMessage(code));
            }
            return { status: 'error', usageMode: 'none' } as ChatGPTAuthStatus;
          }).finally(() => { if (!disposed) setChatGPTAuthLoading(false); });
        } else setChatGPTAuthLoading(false);
        if (current.readProviderRegistry) {
          void authForModels.then((auth) => current!.readProviderRegistry!().then((registry) => ({ auth, registry }))).then(({ auth, registry }) => {
            if (!disposed) {
              setProviderRegistry(registry);
              // Auto-select only if there is exactly one configured choice
              // across every provider; otherwise require the user to choose.
              setModelSelection(allowedDefaultSelection(registry, auth));
            }
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

  async function refreshProviderRegistryFor(auth: ChatGPTAuthStatus = chatGPTAuthStatus, current: EditorTransport | undefined = transport) {
    if (!current?.readProviderRegistry) return;
    setProviderRegistryLoading(true); setProviderRegistryUnavailable(false);
    try {
      const registry = await current.readProviderRegistry();
      setProviderRegistry(registry);
      setModelSelection((selection) => {
        const selected = selectedModel(registry, selection);
        return modelUsageAllowed(selected, auth) ? (selected ? selection : allowedDefaultSelection(registry, auth)) : allowedDefaultSelection(registry, auth);
      });
    } catch {
      setProviderRegistryUnavailable(true);
    } finally {
      setProviderRegistryLoading(false);
    }
  }

  async function startChatGPTAuth() {
    if (!transport?.startChatGPTSignIn || chatGPTAuthBusy) return;
    const generation = ++chatGPTAuthGeneration.current;
    setChatGPTAuthBusy(true); setChatGPTAuthError(''); setChatGPTAuthNotice('');
    try {
      const result = await transport.startChatGPTSignIn();
      if (generation !== chatGPTAuthGeneration.current) return;
      if (result.status === 'pending') {
        setChatGPTAuthStatus({ status: 'pending', usageMode: 'none' });
        setChatGPTAuthorizationUrl(result.authorizationUrl);
        setChatGPTAuthorizationExpiresAt(result.expiresAt);
        setChatGPTAuthNotice('Autorisation en attente. Ouvre le lien dans ton navigateur, puis reviens ici.');
        setChatGPTPollEpoch((epoch) => epoch + 1);
      } else if (result.status === 'connected') {
        const status = await transport.getChatGPTAuthStatus?.() ?? { status: 'connected', usageMode: 'chatgpt-plan' as const };
        if (generation !== chatGPTAuthGeneration.current) return;
        setChatGPTAuthStatus(status); setChatGPTAuthorizationUrl(undefined); setChatGPTAuthorizationExpiresAt(undefined);
        setChatGPTAuthNotice(status.usageMode === 'chatgpt-plan' ? 'ChatGPT est prêt pour les suggestions.' : 'Le compte est connecté, mais l’usage du forfait n’est pas autorisé.');
        await refreshProviderRegistryFor(status, transport);
      } else if (result.status === 'unsupported') {
        setChatGPTAuthStatus({ status: 'unsupported', usageMode: 'none', ...(result.errorCode ? { errorCode: result.errorCode } : {}) });
        setChatGPTAuthError(chatGPTAuthErrorMessage(result.errorCode));
      } else {
        setChatGPTAuthStatus({ status: 'error', usageMode: 'none', ...(result.errorCode ? { errorCode: result.errorCode } : {}) });
        setChatGPTAuthError(chatGPTAuthErrorMessage(result.errorCode));
      }
    } catch (failure) {
      if (generation === chatGPTAuthGeneration.current) {
        const code = errorCode(failure) as ChatGPTAuthErrorCode | undefined;
        setChatGPTAuthStatus({ status: 'error', usageMode: 'none', ...(code && ['unsupported_platform', 'authorization_expired', 'consent_denied', 'invalid_callback', 'invalid_token', 'insufficient_scope', 'network_error', 'storage_error', 'revocation_failed', 'unknown'].includes(code) ? { errorCode: code } : {}) });
        setChatGPTAuthError(chatGPTAuthErrorMessage(code));
      }
    } finally {
      if (generation === chatGPTAuthGeneration.current) setChatGPTAuthBusy(false);
    }
  }

  async function cancelChatGPTAuth() {
    if (!transport?.cancelChatGPTSignIn || chatGPTAuthBusy) return;
    const generation = ++chatGPTAuthGeneration.current;
    setChatGPTAuthBusy(true); setChatGPTAuthError(''); setChatGPTAuthNotice('Annulation en cours…');
    try {
      await transport.cancelChatGPTSignIn();
      if (generation !== chatGPTAuthGeneration.current) return;
      setChatGPTAuthStatus(INITIAL_CHATGPT_AUTH); setChatGPTAuthorizationUrl(undefined); setChatGPTAuthorizationExpiresAt(undefined);
      setChatGPTAuthNotice('Autorisation annulée. Aucun accès au forfait ChatGPT n’est actif.');
      await refreshProviderRegistryFor(INITIAL_CHATGPT_AUTH, transport);
    } catch {
      if (generation === chatGPTAuthGeneration.current) {
        setChatGPTAuthError('Manifest n’a pas pu confirmer l’annulation. Le lien reste actif ; réessaie ou termine l’autorisation dans le navigateur.');
        setChatGPTAuthNotice('Annulation non confirmée.');
        setChatGPTPollEpoch((epoch) => epoch + 1);
      }
    } finally {
      if (generation === chatGPTAuthGeneration.current) setChatGPTAuthBusy(false);
    }
  }

  async function disconnectChatGPTAuth() {
    if (!transport?.disconnectChatGPT || chatGPTAuthBusy) return;
    const generation = ++chatGPTAuthGeneration.current;
    setChatGPTAuthBusy(true); setChatGPTAuthError(''); setChatGPTAuthNotice('Déconnexion en cours…');
    try {
      const result = await transport.disconnectChatGPT();
      if (generation !== chatGPTAuthGeneration.current) return;
      if (result.status === 'error') {
        setChatGPTAuthError('Manifest n’a pas pu effacer les identifiants locaux. La connexion ChatGPT reste active ; réessaie la déconnexion.');
        setChatGPTAuthNotice('Déconnexion non terminée.');
        return;
      }
      setChatGPTAuthStatus(INITIAL_CHATGPT_AUTH); setChatGPTAuthorizationUrl(undefined); setChatGPTAuthorizationExpiresAt(undefined);
      setModelSelection((selection) => selection.providerId === 'openai' ? EMPTY_MODEL_SELECTION : selection);
      setChatGPTAuthError(result.revocation === 'failed' ? chatGPTAuthErrorMessage('revocation_failed') : '');
      setChatGPTAuthNotice(result.revocation === 'failed' ? 'Déconnexion locale terminée.' : 'ChatGPT est déconnecté.');
      await refreshProviderRegistryFor(INITIAL_CHATGPT_AUTH, transport);
    } catch (failure) {
      if (generation === chatGPTAuthGeneration.current) {
        const code = errorCode(failure) as ChatGPTAuthErrorCode | undefined;
        setChatGPTAuthError(chatGPTAuthErrorMessage(code));
        setChatGPTAuthNotice('La déconnexion n’a pas été confirmée.');
        try {
          const status = await transport.getChatGPTAuthStatus?.();
          if (status && generation === chatGPTAuthGeneration.current) setChatGPTAuthStatus(status);
        } catch { /* Keep the last confirmed state visible. */ }
      }
    } finally {
      if (generation === chatGPTAuthGeneration.current) setChatGPTAuthBusy(false);
    }
  }

  async function retryChatGPTAuthStatus() {
    if (!transport?.getChatGPTAuthStatus || chatGPTAuthBusy) return;
    if (chatGPTAuthStatus.status === 'pending') {
      setChatGPTAuthError(''); setChatGPTPollEpoch((epoch) => epoch + 1); return;
    }
    setChatGPTAuthBusy(true); setChatGPTAuthLoading(true); setChatGPTAuthError('');
    try {
      const status = await transport.getChatGPTAuthStatus();
      setChatGPTAuthStatus(status); setChatGPTAuthLoading(false);
      if (status.status === 'connected' && status.usageMode === 'chatgpt-plan') await refreshProviderRegistryFor(status, transport);
      else if (status.status === 'error') setChatGPTAuthError(chatGPTAuthErrorMessage(status.errorCode));
    } catch (failure) {
      const code = errorCode(failure) as ChatGPTAuthErrorCode | undefined;
      setChatGPTAuthStatus({ status: 'error', usageMode: 'none' }); setChatGPTAuthError(chatGPTAuthErrorMessage(code));
    } finally { setChatGPTAuthLoading(false); setChatGPTAuthBusy(false); }
  }

  useEffect(() => {
    if (!transport?.getChatGPTAuthStatus || chatGPTAuthStatus.status !== 'pending') return;
    let stopped = false, timer: ReturnType<typeof setTimeout> | undefined, failures = 0;
    const generation = chatGPTAuthGeneration.current;
    const deadline = chatGPTAuthorizationExpiresAt ? Date.parse(chatGPTAuthorizationExpiresAt) : Date.now() + 5 * 60_000;
    const poll = async () => {
      if (stopped || generation !== chatGPTAuthGeneration.current) return;
      if (Date.now() >= deadline) {
        setChatGPTAuthStatus({ status: 'disconnected', usageMode: 'none', errorCode: 'authorization_expired' });
        setChatGPTAuthorizationUrl(undefined); setChatGPTAuthorizationExpiresAt(undefined);
        setChatGPTAuthError(chatGPTAuthErrorMessage('authorization_expired')); return;
      }
      try {
        const status = await transport!.getChatGPTAuthStatus!();
        if (stopped || generation !== chatGPTAuthGeneration.current) return;
        failures = 0;
        if (status.status === 'connected') {
          setChatGPTAuthStatus(status); setChatGPTAuthorizationUrl(undefined); setChatGPTAuthorizationExpiresAt(undefined);
          if (status.usageMode === 'chatgpt-plan') {
            setChatGPTAuthError(''); setChatGPTAuthNotice('ChatGPT est prêt pour les suggestions.');
            await refreshProviderRegistryFor(status, transport);
          } else setChatGPTAuthError(chatGPTAuthErrorMessage('insufficient_scope'));
          return;
        }
        if (status.status === 'disconnected') {
          setChatGPTAuthStatus(status); setChatGPTAuthorizationUrl(undefined); setChatGPTAuthorizationExpiresAt(undefined);
          setChatGPTAuthError(status.errorCode ? chatGPTAuthErrorMessage(status.errorCode) : '');
          setChatGPTAuthNotice(status.errorCode ? '' : 'L’autorisation s’est terminée sans connexion.'); return;
        }
        if (status.status === 'error' || status.status === 'unsupported') {
          setChatGPTAuthStatus(status); setChatGPTAuthorizationUrl(undefined); setChatGPTAuthorizationExpiresAt(undefined);
          setChatGPTAuthError(chatGPTAuthErrorMessage(status.errorCode)); return;
        }
        timer = setTimeout(poll, 1500);
      } catch {
        failures += 1;
        if (failures >= 3) {
          setChatGPTAuthError('Manifest ne peut pas vérifier le retour pour le moment. Le lien est conservé ; tu peux réessayer la vérification.'); return;
        }
        timer = setTimeout(poll, Math.min(1500 * 2 ** failures, 8000));
      }
    };
    timer = setTimeout(poll, 1200);
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [transport, chatGPTAuthStatus.status, chatGPTAuthorizationExpiresAt, chatGPTPollEpoch]);

  useEffect(() => transport?.subscribeLaunchContext?.(setLaunchContext), [transport]);
  useEffect(() => {
    if (!launchContext || !confirmed || !workingRef.current || handledLaunch.current.has(launchContext.id)) return;
    handledLaunch.current.add(launchContext.id);
    setLaunchCandidate(undefined); setLocalPreview(undefined); setPendingLaunchText(undefined); setPendingLaunchBackground(undefined);
    modelSuggestion.cancelCurrent(); modelSuggestion.clearProposal();
    if (launchContext.projectId !== confirmed.projectId || launchContext.baseDraftVersion !== confirmed.draftVersion) {
      setLaunchFeedback('La demande reçue concerne une ancienne version. Le brouillon reste ouvert ; son fond n’a pas été remplacé.');
      return;
    }
    // The explicit user brief is authoritative. An assistant proposal is only
    // a fallback when the host did not send a user request.
    const text = launchContext.userRequest?.trim() ? launchContext.userRequest : launchContext.assistantProposal;
    if (text) {
      if (!descriptionEdited.current) setDescription(text);
      else setPendingLaunchText(text);
    }
    if (stableStringify(workingRef.current) !== stableStringify(confirmed.snapshot)) {
      setPendingLaunchBackground(launchContext.backgroundColor);
      setLaunchFeedback(launchContext.backgroundColor ? 'Demande reçue. Enregistre tes modifications avant de reprendre le fond proposé.' : 'Demande reçue. Tes modifications de page restent ouvertes.');
      return;
    }
    if (launchContext.backgroundColor) {
      try {
        setLaunchCandidate({ snapshot: launchPreviewSnapshot(workingRef.current, launchContext.backgroundColor), baseSignature: stableStringify(workingRef.current) });
        setLaunchFeedback('Le fond demandé est affiché dans l’aperçu. Tu peux le conserver ou l’ignorer.');
      } catch (failure) { setLaunchFeedback(message(failure)); }
    } else setLaunchFeedback(text ? 'Demande reçue du chat. Tu peux la modifier ici.' : 'Aucune demande transmise par le chat.');
  }, [launchContext, confirmed]);

  const dirty = Boolean(working && confirmed && stableStringify(working) !== stableStringify(confirmed.snapshot));
  const selectedProviderModel = selectedModel(providerRegistry, modelSelection);
  const activeModel = modelUsageAllowed(selectedProviderModel, chatGPTAuthStatus) ? selectedProviderModel : undefined;
  const modelSuggestion = useModelSuggestions({
    transport, project: confirmed, snapshot: working, description, providerId: activeModel?.provider.id ?? null,
    modelId: activeModel?.model.id ?? null, automatic: automaticAnalysis && !launchBusy, composing: composing || launchBusy, dirty,
  });
  // A previous model preview belongs to that provider selection. When the user
  // returns to local rules, it must not mask a fresh local candidate.
  const modelProposal = activeModel ? modelSuggestion.proposal : undefined;
  const proposalProjection = { snapshot: modelSuggestion.previewSnapshot ?? working, error: modelProposal && modelSuggestion.phase === 'ready' && !modelSuggestion.previewSnapshot ? 'Cette proposition ne peut pas être affichée.' : '' };
  const proposalEligible = Boolean(!launchBusy && modelProposal && modelProposal.status === 'ready' && modelSuggestion.phase === 'ready' && modelSuggestion.intent === description.trim() && modelProposal.baseDraftVersion === confirmed?.draftVersion && !dirty && !composing && modelSuggestion.providerId === activeModel?.provider.id && modelSuggestion.modelId === activeModel?.model.id && modelSuggestion.previewSnapshot);
  const previewingProposal = Boolean(proposalEligible && !proposalProjection.error);
  const previewingPreviousProposal = Boolean(!launchBusy && modelProposal && !previewingProposal && modelSuggestion.previewSnapshot);
  const previewingLocalCandidate = Boolean(!launchBusy && localPreview && !activeModel && !modelProposal && !composing && isAnalysisCurrent(localPreview.analysis, description, working));
  const previewingLaunch = Boolean(launchCandidate && working && launchCandidate.baseSignature === stableStringify(working));
  const previewingAnyProposal = previewingLaunch || previewingProposal || previewingPreviousProposal || previewingLocalCandidate;
  useEffect(() => {
    if (!activeModel) modelSuggestion.clearPrevious();
  }, [activeModel?.provider.id, activeModel?.model.id, modelSuggestion.clearPrevious]);
  useEffect(() => {
    if (launchCandidate && working && launchCandidate.baseSignature !== stableStringify(working)) {
      setLaunchCandidate(undefined);
      setLaunchFeedback('Le brouillon a changé. L’ancien aperçu du fond a été retiré.');
    }
  }, [launchCandidate, working]);
  const canvasSnapshot = previewingLaunch ? launchCandidate!.snapshot : previewingProposal || previewingPreviousProposal ? proposalProjection.snapshot : previewingLocalCandidate ? localPreview!.snapshot : working;
  const hasWorkingHero = Boolean(working?.pages[0]?.composition.content.length);
  const hasCanvasHero = Boolean(canvasSnapshot?.pages[0]?.composition.content.length);
  const hasWorkingCatalog = Boolean(working?.pages[0]?.catalogPage);
  const canvasCatalog = canvasSnapshot?.pages[0]?.catalogPage;
  const hasCanvasCatalog = Boolean(canvasCatalog);
  const reducePreviewMotion = systemReducedMotion && !motionPreviewOverride;
  useEffect(() => { if (!hasCanvasCatalog) setMotionPreviewOverride(false); }, [hasCanvasCatalog]);
  useEffect(() => { if (localPreview && !previewingLocalCandidate) setLocalPreview(undefined); }, [localPreview, previewingLocalCandidate]);
  useEffect(() => {
    if (!analysis || !working || !analysis.hints.length || activeModel || modelProposal || launchBusy || composing) return;
    if (!isAnalysisCurrent(analysis, description, working)) return;
    const operations = localPreviewOperations(analysis);
    if (!operations.length) return;
    try {
      const snapshot = applyOperations(working, operations);
      if (stableStringify(snapshot) === stableStringify(working)) return;
      setLocalPreview((previous) => previous?.analysis.description === analysis.description && previous.analysis.baseSignature === analysis.baseSignature
        ? previous
        : { analysis, operations, snapshot });
    } catch {
      // Rules that cannot be safely projected stay suggestions; no partial or free-form code runs.
    }
  }, [analysis, working, activeModel, modelProposal, launchBusy, composing, description]);
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
    if (savingRef.current || previewingProposal || previewingPreviousProposal || ((previewingLaunch || previewingLocalCandidate) && !keepingLocalPreview)) return;
    const previous = workingRef.current;
    if (!previous || stableStringify(previous) === stableStringify(next)) return;
    const now = Date.now();
    const grouped = lastEdit.current.group === group && now - lastEdit.current.time < 650;
    lastEdit.current = { group, time: now };
    setHistory((state) => ({ past: grouped ? state.past : [...state.past.slice(-49), structuredClone(previous)], future: [] }));
    workingRef.current = next; setWorking(next); setFeedback('');
    if (!conflict && !retryRef.current) setError('');
  }

  function updateDescription(next: string) {
    if (launchCandidate || pendingLaunchBackground) {
      setLaunchCandidate(undefined);
      setPendingLaunchBackground(undefined);
      setLaunchFeedback('Ta nouvelle description remplace le fond reçu. La lecture automatique reprend après une pause.');
    }
    setDescription(next);
    descriptionEdited.current = true;
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
      setFeedback('Section d’accueil ajoutée. Elle sera enregistrée après une courte pause.');
    } catch (failure) { setError(message(failure)); }
  }

  function previewLocalHint(hint: DesignHint) {
    if (!workingRef.current || !analysis || previewingAnyProposal || savingRef.current) return;
    try {
      const snapshot = applyDesignHint(workingRef.current, analysis, hint.id);
      setLocalPreview({ analysis, operations: hint.operations, snapshot });
      setFeedback('Aperçu local temporaire. Le brouillon reste inchangé avant conservation.');
    } catch (failure) { setError(message(failure)); }
  }

  function keepLocalCandidate() {
    if (!workingRef.current || !localPreview || !previewingLocalCandidate || savingRef.current || conflict) return;
    try {
      if (!isAnalysisCurrent(localPreview.analysis, description, workingRef.current)) throw new Error('La description ou la page a changé depuis cet aperçu.');
      const next = applyOperations(workingRef.current, localPreview.operations);
      edit(next, 'keep-local-candidate', true); setLocalPreview(undefined); setSyncEpoch((value) => value + 1);
      setFeedback('Proposition locale conservée. Elle sera enregistrée après une courte pause.');
    } catch (failure) { setError(message(failure)); }
  }

  function ignoreLocalCandidate() {
    setLocalPreview(undefined); setFeedback('Proposition locale ignorée. Le brouillon reste inchangé.');
  }

  function openReport(nextTab: 'report' | 'version') {
    setReportTab(nextTab); setReportFeedback(''); reportDialog.current?.showModal();
  }

  function resumeLaunchBackground() {
    const current = workingRef.current, base = confirmedRef.current;
    if (!pendingLaunchBackground || !current || !base || savingRef.current || conflict || previewingAnyProposal || stableStringify(current) !== stableStringify(base.snapshot)) return;
    try {
      setLaunchCandidate({ snapshot: launchPreviewSnapshot(current, pendingLaunchBackground), baseSignature: stableStringify(current) });
      setPendingLaunchBackground(undefined);
      setLaunchFeedback('Fond reçu repris sur le brouillon actuel. Tu peux le conserver ou l’ignorer.');
    } catch (failure) { setLaunchFeedback(message(failure)); }
  }

  function keepLaunchCandidate() {
    if (!previewingLaunch || !launchCandidate || savingRef.current || conflict) return;
    edit(launchCandidate.snapshot, 'launch-background', true);
    setLaunchCandidate(undefined); setSyncEpoch((value) => value + 1);
    setLaunchFeedback('Fond conservé. Tu peux l’annuler depuis la barre de l’aperçu.');
  }

  function reportDocument() {
    const capturedProvenance = modelProposal ? proposalProvenance.current.get(modelProposal.id) : undefined;
    const proposalProvider = capturedProvenance && providerRegistry.providers.find((provider) => provider.id === capturedProvenance.providerId);
    const proposalModel = proposalProvider?.models.find((model) => model.id === capturedProvenance?.modelId);
    const localAnalysisIsCurrent = Boolean(analysis);
    return {
      format: 'manifest.design-report.v1',
      project: { projectId: confirmed?.projectId, draftVersion: confirmed?.draftVersion, contentHash: confirmed?.contentHash, snapshot: confirmed?.snapshot },
      workingCopy: { hasUncommittedChanges: dirty, snapshot: working, previewedProposal: previewingProposal ? proposalProjection.snapshot : null, previewedLocalCandidate: previewingLocalCandidate ? localPreview!.snapshot : null, previewedLaunch: previewingLaunch ? launchCandidate!.snapshot : null },
      brief: { description, persisted: false, receivedFromChat: launchContext ?? null },
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

  async function retryProviderRegistry() {
    await refreshProviderRegistryFor(chatGPTAuthStatus, transport);
  }

  const config = useMemo(() => canvasSnapshot ? heroConfig(canvasSnapshot.theme) : undefined, [canvasSnapshot?.theme]);
  const chatGPTAuthEnabled = Boolean(transport?.kind === 'mcp' && transport.startChatGPTSignIn && transport.getChatGPTAuthStatus && transport.cancelChatGPTSignIn && transport.disconnectChatGPT);
  const connectionLabel = transport?.kind === 'mcp' ? 'Connecté à l’hôte' : transport?.kind === 'browser-local' ? 'Diagnostic navigateur · sauvegarde locale' : 'Diagnostic navigateur · session locale';
  const saveLabel = saving ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' : transport?.kind === 'mcp' ? 'Version serveur chargée' : confirmed?.draftVersion ? 'Brouillon local enregistré' : 'Brouillon de départ';
  const reportAnalysisLabel = modelProposal ? `Proposition ${modelProposal.status} sur la version ${modelProposal.baseDraftVersion}${previewingProposal ? ' · visible dans l’aperçu' : ' · non éligible à l’aperçu courant'}.` : analysis ? `${analysis.recognized.length} indication(s) reconnue(s) par les règles locales.` : analysisPhase === 'typing' ? 'Lecture de la description en attente de la pause. Aucune analyse à jour.' : analysisPhase === 'paused' ? 'Lecture automatique suspendue.' : 'Aucune description analysée dans cette session.';
  const reportModelLabel = modelProposal
    ? (() => { const captured = proposalProvenance.current.get(modelProposal.id); const provider = captured && providerRegistry.providers.find((entry) => entry.id === captured.providerId); const model = provider?.models.find((entry) => entry.id === captured?.modelId); return captured ? `${provider?.label ?? captured.providerId} · ${model?.label ?? captured.modelId}` : 'Provenance du fournisseur non enregistrée avec cette proposition'; })()
    : analysis ? 'Pistes locales · règles M0' : activeModel ? 'Modèle sélectionné · aucune proposition' : 'Aucune source sélectionnée';
  const inputStatusTitle = composing ? 'Saisie en cours' : activeModel ? ({ typing: 'Le modèle attend ta pause', syncing: 'Mise à jour du brouillon', starting: 'Demande envoyée', running: 'Le modèle compose', ready: 'Proposition prête', stale: 'Proposition à actualiser', error: 'La proposition a échoué', paused: 'Suggestions suspendues', unavailable: 'Modèle indisponible', idle: 'Prêt à analyser' } as const)[modelSuggestion.phase] : ({ typing: 'Lecture après ta pause', paused: 'Suggestions suspendues', ready: 'Pistes locales prêtes', idle: 'Prêt à analyser' } as const)[analysisPhase];
  const configuredModelCount = providerRegistry.providers.filter((provider) => provider.status === 'configured').reduce((count, provider) => count + provider.models.length, 0);
  const inputStatusDetail = activeModel
    ? activeModel.provider.protocol === 'openai-responses'
      ? `Après 1,5 s, ${activeModel.model.label} utilise l’autorisation de ton forfait ChatGPT, selon ses limites.`
      : `Après 1,5 s, envoi au modèle ${activeModel.provider.label} (${activeModel.model.label}) ; l’API peut être facturée séparément.`
    : providerRegistryLoading
      ? 'Vérification du fournisseur configuré…'
      : providerRegistryUnavailable
        ? 'Le registre du fournisseur est indisponible ; aucune inférence modèle ne peut démarrer.'
        : configuredModelCount > 0
          ? modelSelection.providerId
            ? 'Choisis un modèle pour activer l’analyse IA ; les pistes locales restent limitées.'
            : 'Choisis un fournisseur et un modèle pour activer l’analyse IA ; les pistes locales restent limitées.'
          : 'Aucune API de modèle configurée : après 1,5 s, seules des pistes locales limitées seront proposées.';
  const suggestionPhase = activeModel ? modelSuggestion.phase : analysisPhase;
  const suggestionTitle = activeModel ? ({ idle: 'Prêt à proposer', typing: 'Lecture après ta pause', syncing: 'Enregistrement du brouillon', starting: 'Demande envoyée', running: 'Le modèle compose', ready: 'Proposition prête', stale: 'Proposition à recalculer', error: 'La proposition a échoué', paused: 'Suggestions suspendues', unavailable: 'Modèle indisponible' } as const)[modelSuggestion.phase] : ({ idle: 'Une intention, puis des pistes', typing: 'Lecture après ta pause', paused: 'Lecture automatique suspendue', ready: 'Analyse locale prête' } as const)[analysisPhase];
  const suggestionDetail = activeModel ? ({ idle: 'Écris une intention pour voir un candidat dans l’aperçu.', typing: 'Continue d’écrire. Aucun nouvel appel n’est lancé avant la pause.', syncing: 'Les réglages de la page sont enregistrés avant la génération.', starting: 'La demande part vers le modèle sélectionné.', running: 'La page reste disponible pendant la génération.', ready: 'Le candidat est visible à gauche et attend ton choix.', stale: modelSuggestion.error ?? 'La proposition ne correspond plus au brouillon courant.', error: modelSuggestion.error ?? 'Réessaie après avoir vérifié le fournisseur.', paused: 'La lecture automatique est suspendue. Tu peux proposer maintenant.', unavailable: modelSuggestion.error ?? 'Les pistes locales restent disponibles.' } as const)[modelSuggestion.phase] : analysis ? `${analysis.recognized.length} indication(s) reconnue(s).` : analysisPhase === 'typing' ? 'Les pistes locales apparaissent après la pause.' : 'Décris une couleur, une entrée ou les mots à afficher.';

  if (loading) return <main className="startup"><div className="workbench-mark" aria-hidden="true">m</div><h1>Ouverture de Manifest</h1><p role="status">Connexion et lecture du brouillon…</p></main>;
  if (!working || !confirmed || !config || !transport) return <main className="startup"><h1>{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' ? 'Brouillon local à reprendre' : 'L’atelier n’a pas pu s’ouvrir'}</h1><p role="alert">{error}</p>{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' && transport?.recoverExpired ? <button className="button button--primary" disabled={saving} aria-busy={saving} onClick={() => void recoverExpired()}>Reprendre le brouillon expiré</button> : <button className="button button--primary" onClick={() => setConnectingEpoch((value) => value + 1)}>Réessayer la connexion</button>}</main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="skip-link" href="#page-preview" onClick={(event) => {
          if (window.matchMedia('(max-width: 559px)').matches) {
            event.preventDefault();
            setCompactPanel('preview');
            requestAnimationFrame(() => document.getElementById('page-preview')?.focus());
          }
        }}>Aller à l’aperçu</a>
        <div className="app-identity"><div className="workbench-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V6l8 7 8-7v12M4 6l8 12 8-12" /></svg></div><strong>manifest<span>.</span></strong></div>
        <div className="project-heading"><div className="project-heading__copy"><span>{working.projectTitle}<span className="project-divider" aria-hidden="true"> / </span>Accueil</span><small>Design · Espace de conception</small></div><span className="draft-badge">Brouillon</span><button className="version-button" onClick={() => openReport('version')} aria-label={`Voir la version ${confirmed.draftVersion}`}>v{confirmed.draftVersion}</button></div>
        <div className="topbar-actions"><button className="button save-button" onClick={() => void save()} disabled={saving || !dirty || conflict || Boolean(retryRef.current)} aria-busy={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button><button className="button report-button" onClick={() => openReport('report')}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h7l3 3V17.5H5zM12 2.5V6h3M8 9h4M8 12h4" /></svg>Préparer le rapport</button></div>
      </header>

      {error && <div className="error-banner" role="alert"><div><strong>{conflict ? 'Le brouillon a changé ailleurs' : 'Enregistrement à vérifier'}</strong><p>{error}</p></div><div className="error-banner__actions"><button className="button" onClick={downloadDraft}>Télécharger mes réglages</button><button className="button" disabled={saving} onClick={() => void verifySave()}>Vérifier la version enregistrée</button>{retryRef.current && !conflict && recoveryCode !== 'LOCAL_RECOVERY_EXPIRED' && <button className="button" disabled={saving} onClick={() => void save(true)}>Réessayer l’enregistrement en attente</button>}{recoveryCode === 'LOCAL_RECOVERY_EXPIRED' && transport.recoverExpired && <button className="button" disabled={saving} onClick={() => void recoverExpired()}>Reprendre le brouillon expiré</button>}{conflict && <button className="button" disabled={saving} onClick={() => reloadDialog.current?.showModal()}>Recharger…</button>}</div></div>}

      <div className="workbench-content">
        <Puck config={config} data={canvasSnapshot!.pages[0]!.composition} onChange={onPuckChange} iframe={{ enabled: false }} permissions={{ drag: false, insert: false, delete: false, duplicate: false, edit: !previewingAnyProposal && !saving }} ui={{ itemSelector: hasCanvasHero ? { index: 0, zone: 'root:default-zone' } : null }} dictionary={dictionary}>
        <PuckSync composition={canvasSnapshot!.pages[0]!.composition} epoch={`${syncEpoch}:${previewingLaunch ? launchContext?.id : previewingProposal || previewingPreviousProposal ? modelProposal?.generationId : previewingLocalCandidate ? `${localPreview!.analysis.baseSignature}:${localPreview!.analysis.description}` : 'manual'}`} />
        <div className="workspace" data-mobile-panel={compactPanel}>
          <nav className="workspace-mobile-nav" aria-label="Panneaux de l’atelier">
            <button type="button" aria-pressed={compactPanel === 'describe'} aria-controls="workspace-description" onClick={() => setCompactPanel('describe')}>Décrire</button>
            <button type="button" aria-pressed={compactPanel === 'preview'} aria-controls="page-preview" onClick={() => setCompactPanel('preview')}>Aperçu</button>
            <button type="button" aria-pressed={compactPanel === 'suggestions'} aria-controls="workspace-suggestions" onClick={() => setCompactPanel('suggestions')}>Suggestions</button>
          </nav>
          <aside id="workspace-description" className="description-panel" aria-labelledby="description-title">
            <div className="panel-heading"><span className="panel-symbol" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 4h12M4 8h12M4 12h8M4 16h5" /></svg></span><h2 id="description-title">Décrivez votre interface</h2><span className="local-label">M0</span></div>
            <div className="description-body"><p>Décris la page ; son aperçu et les suggestions restent dans cet espace.</p><p className="launch-status" role="status">{launchFeedback || 'Aucune demande transmise par le chat. Écris ici pour commencer.'}</p>{pendingLaunchBackground && <div className="pending-launch"><button className="button" disabled={dirty || saving || previewingAnyProposal} onClick={resumeLaunchBackground}>Reprendre le fond reçu</button><button className="text-button" onClick={() => { setPendingLaunchBackground(undefined); setLaunchFeedback('Fond reçu ignoré. Le brouillon reste inchangé.'); }}>Ignorer le fond reçu</button></div>}{pendingLaunchText && <div className="pending-launch"><p>Une nouvelle demande est arrivée. Ton texte est conservé.</p><button className="button" onClick={() => { updateDescription(pendingLaunchText); setPendingLaunchText(undefined); }}>Utiliser la demande reçue</button></div>}
              <label className="sr-only" htmlFor="page-description">Description de la page</label>
              <div className="description-composer"><textarea ref={descriptionInput} id="page-description" className="description-input resize-none" value={description} onChange={(event) => updateDescription(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} maxLength={6000} placeholder="Décrivez la page et les composants que vous imaginez…" aria-describedby="description-help" /><div className="composer-foot"><span>{description.length.toLocaleString('fr-FR')} / 6 000</span>{description && <button className="text-button" onClick={() => { updateDescription(''); descriptionInput.current?.focus(); }}>Effacer</button>}</div></div>
              <div className="intent-status" role="status" aria-live="polite"><span className="intent-status__icon" aria-hidden="true"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg></span><span><strong>{inputStatusTitle}</strong><small>{inputStatusDetail}</small></span></div>
              <div className="analysis-preference" role="note"><span>{activeModel ? activeModel.provider.protocol === 'openai-responses' ? 'Suggestions du forfait ChatGPT' : `Suggestions ${activeModel.provider.label}` : 'Suggestions locales'}</span><span>après {(DESCRIPTION_PAUSE_MS / 1000).toLocaleString('fr-FR')} s de pause</span></div>
              <button className="button analyze-button" onClick={() => { if (activeModel && ['starting', 'running'].includes(modelSuggestion.phase)) modelSuggestion.cancelCurrent(); else { analyzeNow(); modelSuggestion.runNow(); } }} disabled={launchBusy || (['starting', 'running'].includes(modelSuggestion.phase) ? false : !description.trim() || composing)}>{activeModel && ['starting', 'running'].includes(modelSuggestion.phase) ? 'Annuler la génération' : 'Proposer maintenant'}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 5l5 5-5 5" /></svg></button>
              <p id="description-help" className="description-help">Après 1,5 s sans frappe, Manifest actualise l’aperçu. Sans modèle configuré, seules des pistes locales limitées et un exemple de ventes synthétiques sont disponibles. Un modèle choisi peut composer les éléments du catalogue : navigation, nuages, graphiques, fondu et glissement. Les animations absentes du catalogue ne sont pas exécutées ; Manifest indique la limite et propose une alternative.</p>
              <details className="model-provider-disclosure">
                <summary>{activeModel ? `${activeModel.provider.label} · ${activeModel.model.label}` : 'Suggestions par modèle'}</summary>
                <ModelProviderPanel registry={providerRegistry} selection={modelSelection} onChange={setModelSelection} loading={providerRegistryLoading} unavailable={providerRegistryUnavailable} onRetry={() => void retryProviderRegistry()} authEnabled={chatGPTAuthEnabled} authStatus={chatGPTAuthStatus} authLoading={chatGPTAuthLoading} authBusy={chatGPTAuthBusy} authorizationUrl={chatGPTAuthorizationUrl} authNotice={chatGPTAuthNotice} authError={chatGPTAuthError} onStartAuth={() => void startChatGPTAuth()} onCancelAuth={() => void cancelChatGPTAuth()} onDisconnectAuth={() => void disconnectChatGPTAuth()} onRetryAuth={() => void retryChatGPTAuthStatus()} />
              </details>
              <div className="description-examples"><span>Une direction à explorer</span><button onClick={() => { updateDescription('Un fond clair avec un accent bleu.\nTitre : Des espaces qui nous ressemblent\nTexte : Un atelier indépendant pour imaginer vos lieux de vie.'); descriptionInput.current?.focus(); }}>Page de présentation<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" /></svg></button><button onClick={() => { updateDescription('Un fond sombre avec un accent vert et un fondu à l’entrée.'); descriptionInput.current?.focus(); }}>Page sombre animée<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" /></svg></button></div>
            </div>
            <section className="page-controls settings-panel" aria-label="Contenu et couleurs de la page">{hasCanvasHero ? <><div className="inspector-heading"><span className="selection-mark" aria-hidden="true" /><div><h3>Contenu sélectionné</h3><p>Contenu & apparence</p></div></div><div className="puck-fields"><Puck.Fields /></div></> : null}<fieldset className="theme-fields"><legend>Couleurs de la page</legend><p>Ces réglages s’appliquent au site, pas à l’atelier.</p>{COLOR_TOKEN_NAMES.map((name) => <label className="color-control" key={name}><span>{labels[name]}</span><span className="color-control__value"><code>{canvasSnapshot!.theme.tokens[name].value.toUpperCase()}</code><input type="color" aria-label={labels[name]} value={canvasSnapshot!.theme.tokens[name].value} disabled={saving || previewingAnyProposal} onChange={(event) => changeColor(name, event.target.value)} /></span></label>)}</fieldset><div className="inspector-note"><strong>Un changement reste un choix.</strong><p>{previewingAnyProposal ? 'L’aperçu du candidat est en lecture seule. Ignore-le ou attends la proposition suivante avant de modifier le bloc.' : 'Les réglages changent l’aperçu immédiatement et sont enregistrés après une courte pause.'}</p></div></section>
            <div className="description-footer"><span className="connection-dot" aria-hidden="true" /><span>Ton texte reste dans cette session.<br />Seuls les réglages de la page sont enregistrés.</span></div>
          </aside>
          <main id="page-preview" className="canvas-region" aria-label={previewingLaunch ? 'Aperçu du fond demandé' : previewingPreviousProposal ? 'Aperçu de la proposition précédente' : previewingProposal ? 'Aperçu de la proposition' : previewingLocalCandidate ? 'Aperçu du candidat local' : 'Aperçu modifiable de la page'} tabIndex={-1}>
            <div className="workspace-toolbar"><div className="page-meta"><span className="page-indicator" aria-hidden="true" /><strong>{previewingLaunch ? 'Fond demandé' : previewingPreviousProposal ? 'Proposition précédente' : previewingProposal ? 'Proposition' : previewingLocalCandidate ? 'Candidat local' : 'Aperçu'}</strong><span className={`live-label${previewingAnyProposal ? ' live-label--candidate' : ''}`}>{previewingLaunch ? 'À conserver' : previewingProposal ? 'Candidat · non enregistré' : previewingPreviousProposal ? 'Version antérieure · lecture seule' : previewingLocalCandidate ? 'Règles locales · non enregistré' : 'En direct'}</span></div><div className="segmented" aria-label="Format de l’aperçu"><button aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')} title="Aperçu ordinateur"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="10" rx="1" /><path d="M10 13v4M6 17h8" /></svg><span>Ordinateur</span></button><button aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')} title="Aperçu mobile"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="2" width="8" height="16" rx="1.5" /><path d="M9 15h2" /></svg><span>Mobile</span></button></div><div className="history-controls"><button className="button button--quiet" onClick={() => travel('past')} disabled={!history.past.length || previewingAnyProposal || saving}>Annuler</button><button className="button button--quiet" onClick={() => travel('future')} disabled={!history.future.length || previewingAnyProposal || saving}>Rétablir</button></div></div>
            <div className="canvas-ruler"><div className="browser-dots" aria-hidden="true"><i /><i /><i /></div><span className="canvas-route"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="5" width="6" height="5" rx="1" /><path d="M4 5V3a2 2 0 0 1 4 0v2" /></svg><span>manifest.local / accueil</span></span><span className="canvas-size">{viewport === 'desktop' ? 'Desktop · 100 %' : 'Mobile · 375 px'}</span>{systemReducedMotion && hasCanvasCatalog && <div className="motion-preview-control"><span role="status" aria-live="polite">{motionPreviewOverride ? 'Aperçu animé' : 'Mouvement réduit'}</span><button className="text-button" aria-label={motionPreviewOverride ? 'Réduire les animations dans l’aperçu' : 'Lire les animations dans l’aperçu'} aria-pressed={motionPreviewOverride} onClick={() => setMotionPreviewOverride((enabled) => !enabled)}>{motionPreviewOverride ? 'Réduire' : 'Lire'}</button></div>}</div>
            <div className="canvas-stage"><div className={`canvas-frame canvas-frame--${viewport}`} style={{ backgroundColor: canvasSnapshot!.theme.tokens['color.background'].value }}>{hasCanvasCatalog ? <div className="catalog-canvas" data-motion-preview={motionPreviewOverride ? 'enabled' : undefined}>{renderCatalogPage(canvasCatalog!, { prefersReducedMotion: reducePreviewMotion })}</div> : hasCanvasHero ? <Puck.Preview /> : <div className="empty-canvas" role="region" aria-label="Canevas vide" />}</div></div>
            <div className="canvas-bottom"><p>{previewingLaunch ? 'Fond reçu du chat · aperçu temporaire.' : previewingLocalCandidate ? 'Candidat local temporaire · le brouillon reste inchangé.' : previewingProposal ? 'Candidat temporaire · garde-le ou ignore-le.' : previewingPreviousProposal ? 'Proposition précédente · lecture seule, non applicable.' : hasWorkingCatalog ? 'Page catalogue du brouillon.' : hasWorkingHero ? 'Section d’accueil du brouillon.' : 'Canevas vide · aucun composant ajouté.'}</p>{previewingLaunch ? <div className="proposal-actions"><button className="button button--primary" disabled={saving || conflict} onClick={keepLaunchCandidate}>Conserver le fond</button><button className="button" onClick={() => { setLaunchCandidate(undefined); setLaunchFeedback('Fond proposé ignoré. Le brouillon reste inchangé.'); }}>Ignorer le fond</button></div> : previewingLocalCandidate ? <div className="proposal-actions"><button className="button button--primary" disabled={saving || conflict} onClick={keepLocalCandidate}>Conserver la proposition locale</button><button className="button" disabled={saving} onClick={ignoreLocalCandidate}>Ignorer la proposition locale</button></div> : !previewingAnyProposal && (hasWorkingCatalog ? <span>La page catalogue reste visible dans ce canevas.</span> : hasWorkingHero ? <span>Le contenu et les couleurs sont à gauche.</span> : <button className="button" disabled={saving || conflict} onClick={addFirstHero}>Ajouter une section d’accueil</button>)}</div>
          </main>
          <aside id="workspace-suggestions" className="inspector" aria-label="Panneau de conception">
            <div className="panel-heading"><span className="panel-symbol" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 4h10M5 10h10M5 16h10" /><circle cx="8" cy="4" r="2" /><circle cx="13" cy="10" r="2" /><circle cx="7" cy="16" r="2" /></svg></span><h2>Suggestions</h2><span className="hint-count">{(analysis?.hints.length ?? 0) + (modelProposal ? 1 : 0)} piste{(analysis?.hints.length ?? 0) + (modelProposal ? 1 : 0) === 1 ? '' : 's'}</span></div>
            <div className="suggestions-panel" data-analysis-phase={suggestionPhase}>
              <div className={`analysis-state analysis-state--${suggestionPhase}`} role="status" aria-live="polite"><span className="analysis-indicator" aria-hidden="true" /><div><strong>{suggestionTitle}</strong><span>{suggestionDetail}</span></div></div>
              {modelProposal && !launchBusy && <ModelProposalCard proposal={modelProposal} eligible={proposalEligible} previous={previewingPreviousProposal} projectionError={proposalProjection.error} saving={saving} onKeep={() => void keepModelProposal()} onReject={() => void rejectModelProposal()} />}
              {analysis?.hints.length ? <div className="hint-list">{analysis.hints.map((hint) => <article className={`hint-card hint-card--${hint.category}`} key={hint.id}><div className="hint-category">{hint.category === 'palette' ? 'Couleurs' : hint.category === 'motion' ? 'Mouvement' : hint.category === 'component' ? 'Composant' : 'Contenu'}<span>Règle locale</span></div><h3>{hint.title}</h3><p>{hint.description}</p>{hint.swatches && <div className="hint-swatches" aria-label={`Palette proposée : ${hint.swatches.join(', ')}`}>{hint.swatches.map((color, index) => <span style={{ backgroundColor: color }} key={`${color}-${index}`} />)}</div>}<button className="button hint-apply" onClick={() => hint.category === 'component' ? previewLocalHint(hint) : applyHint(hint)} disabled={previewingAnyProposal || saving}>{hint.category === 'component' ? 'Prévisualiser la section' : 'Appliquer '}{hint.category === 'component' ? '' : hint.category === 'palette' ? 'la palette' : hint.category === 'motion' ? 'l’animation' : 'le contenu'}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3l5 5-5 5" /></svg></button></article>)}</div> : !modelProposal && <div className="suggestions-empty"><div className="empty-diagram" aria-hidden="true"><span /><span /><span /></div><h3>{analysisPhase === 'ready' ? analysis?.recognized.length ? 'Ta page suit déjà ces indications.' : 'Précisons la direction.' : modelProposal ? 'Le candidat est prêt à examiner.' : 'La prochaine idée commence à gauche.'}</h3><p>{analysisPhase === 'ready' ? 'Aucune piste locale applicable : la page reste inchangée. Le catalogue reconnaît actuellement le Hero, la navigation, les nuages, les graphiques, le fondu et le glissement. Un modèle configuré reste limité à ces mêmes capacités ; essaie un exemple à droite ou reformule ton intention.' : 'Décris la page et ses mouvements. Les règles locales et le modèle configuré actualisent leur candidat après une pause.'}</p></div>}
              {(hasWorkingHero || hasWorkingCatalog) && <section className="component-summary"><h3>Dans cette page</h3><div><span className="component-thumb" aria-hidden="true"><i /><i /></span><div><strong>{hasWorkingCatalog ? 'Page catalogue' : 'Section d’accueil'}</strong><span>{hasWorkingCatalog ? 'Menu · nuages · graphiques synthétiques' : 'Hero · contenu modifiable'}</span></div></div></section>}
              <p className="suggestions-disclosure">Les modèles utilisent des opérations vérifiées et la release locale du catalogue. Aucun JSX, CSS ou JavaScript libre n’est exécuté ; chaque candidat reste à prévisualiser et à conserver explicitement.</p>
            </div>
            <ComponentExamples />

          </aside>
        </div>
        </Puck>
      </div>

      <footer className="statusbar"><span className="save-state" role="status" aria-live="polite"><span className="connection-dot" aria-hidden="true" />{feedback || saveLabel}</span><span>{connectionLabel}</span><button className="text-button footer-version" onClick={() => openReport('version')}>Brouillon v{confirmed.draftVersion}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg></button></footer>
      <dialog ref={reloadDialog} className="dialog" aria-labelledby="reload-title"><h2 id="reload-title">Recharger la version enregistrée ?</h2><p>Les réglages non enregistrés de cette page seront remplacés. Tu peux d’abord télécharger ton brouillon.</p><div className="dialog-actions"><button className="button" autoFocus onClick={() => reloadDialog.current?.close()}>Garder mes réglages</button><button className="button" onClick={downloadDraft}>Télécharger le brouillon</button><button className="button button--primary" disabled={saving} onClick={() => void reloadConfirmed()}>Recharger la version</button></div></dialog>
      <dialog ref={reportDialog} className="dialog report-dialog" aria-labelledby="report-title"><header className="report-header"><div><span>Manifest / état du projet</span><h2 id="report-title">Rapport & version</h2></div><button className="icon-button" aria-label="Fermer le rapport" autoFocus onClick={() => reportDialog.current?.close()}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M5 15L15 5" /></svg></button></header><div className="report-tabs" role="group" aria-label="Contenu du rapport"><button aria-pressed={reportTab === 'report'} onClick={() => setReportTab('report')}>Rapport de conception</button><button aria-pressed={reportTab === 'version'} onClick={() => setReportTab('version')}>Version du brouillon</button></div>{reportTab === 'report' ? <div className="report-content"><div className="report-summary"><span className="report-document-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h6" /></svg></span><div><h3>{working.projectTitle}</h3><p>Une page · {hasWorkingHero ? 'un composant' : 'aucun composant'} · trois couleurs</p></div></div><section className="report-section"><h3>Intention de conception</h3><p className={description ? '' : 'muted'}>{description || 'Aucune description saisie dans cette session.'}</p><small>Cette description est temporaire et n’a pas été enregistrée avec le brouillon.</small></section><section className="report-section"><h3>Palette actuelle</h3><div className="report-palette">{COLOR_TOKEN_NAMES.map((name) => <div key={name}><i style={{ backgroundColor: working.theme.tokens[name].value }} aria-hidden="true" /><span>{labels[name]}</span><code>{working.theme.tokens[name].value.toUpperCase()}</code></div>)}</div></section><section className="report-section"><h3>Analyse</h3><p>{reportModelLabel}</p><p>{reportAnalysisLabel}</p><small>Le rapport distingue la version enregistrée, la copie de travail et la proposition prévisualisée.</small></section></div> : <div className="report-content"><div className="version-card"><span>Version chargée</span><strong>v{confirmed.draftVersion}</strong><p>{dirty ? 'Des modifications restent à enregistrer.' : 'Le document ouvert correspond à cette version.'}</p></div><dl className="version-details"><div><dt>Projet</dt><dd>{working.projectTitle}</dd></div><div><dt>Conservation</dt><dd>{transport.kind === 'mcp' ? 'Serveur de qualification en mémoire' : transport.kind === 'browser-local' ? 'Ce navigateur · sept jours' : 'Cette session uniquement'}</dd></div><div><dt>Révision approuvée</dt><dd>Aucune — brouillon de travail</dd></div><div className="hash-detail"><dt>Empreinte du document enregistré</dt><dd><code>{confirmed.contentHash}</code></dd></div></dl><p className="report-limit">Cette étape ne crée pas encore d’historique de versions approuvées ni d’export de code. Le numéro ci-dessus suit les sauvegardes du brouillon.</p></div>}<footer className="report-footer"><p role="status" aria-live="polite">{reportFeedback || 'Un rapport de conception, prêt à être partagé.'}</p><div><button className="button" onClick={downloadReport}>Télécharger le rapport JSON</button><button className="button button--primary" onClick={() => void copyReport()}>Copier le rapport</button></div></footer></dialog>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Editor />);
