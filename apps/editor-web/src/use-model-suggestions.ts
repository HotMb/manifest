import { useCallback, useEffect, useRef, useState } from 'react';
import { applyOperations, type M0Project, type SuggestionProposal, type ModelProviderId, stableStringify } from '@design-workbench/m0-contract';
import type { EditorTransport } from '@design-workbench/host-adapters';
import { DESCRIPTION_PAUSE_MS } from './manifest-analysis.ts';

export type ModelSuggestionPhase = 'idle' | 'typing' | 'syncing' | 'starting' | 'running' | 'ready' | 'stale' | 'error' | 'paused' | 'unavailable';
export type ModelSuggestionState = { phase: ModelSuggestionPhase; proposal?: SuggestionProposal; previewSnapshot?: M0Project['snapshot']; error?: string; intent?: string; providerId?: ModelProviderId; modelId?: string };

const terminal = (state: string) => ['succeeded', 'failed', 'cancelled', 'outcome_unknown'].includes(state);
const pause = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function useModelSuggestions({
  transport, project, snapshot, description, providerId, modelId, automatic, composing, dirty,
}: {
  transport: EditorTransport | undefined;
  project: M0Project | undefined;
  snapshot: M0Project['snapshot'] | undefined;
  description: string;
  providerId: ModelProviderId | null;
  modelId: string | null;
  automatic: boolean;
  composing: boolean;
  dirty: boolean;
}) {
  const [state, setState] = useState<ModelSuggestionState>({ phase: 'idle' });
  const [manualRequest, setManualRequest] = useState(0);
  const consumedManual = useRef(0);
  const requestEpoch = useRef(0);
  const jobRef = useRef<{ jobId: string; epoch: number } | undefined>(undefined);
  const proposalRef = useRef<SuggestionProposal | undefined>(undefined);
  const previewRef = useRef<{ proposal: SuggestionProposal; snapshot: M0Project['snapshot'] } | undefined>(undefined);
  const selectionRef = useRef<string | undefined>(undefined);
  const suppressed = useRef('');
  const sessionId = useRef<string | undefined>(undefined);
  const intentEpoch = useRef(0);
  const snapshotSignature = snapshot ? stableStringify(snapshot) : '';
  const intent = description.trim();

  const runNow = useCallback(() => { suppressed.current = ''; setManualRequest((value) => value + 1); }, []);
  const clearProposal = useCallback(() => {
    proposalRef.current = undefined;
    previewRef.current = undefined;
    setState((current) => ({ phase: current.phase === 'ready' ? 'idle' : current.phase, intent: current.intent }));
  }, []);

  const cancelCurrent = useCallback(() => {
    const activeJob = jobRef.current;
    jobRef.current = undefined;
    requestEpoch.current += 1;
    proposalRef.current = undefined;
    if (activeJob) void transport?.cancelSuggestion?.(activeJob.jobId).catch(() => undefined);
    const previous = previewRef.current;
    setState({
      phase: 'paused', intent,
      ...(previous ? { proposal: { ...previous.proposal, status: 'stale' }, previewSnapshot: previous.snapshot } : {}),
    });
  }, [transport, intent]);

  useEffect(() => {
    const epoch = ++requestEpoch.current;
    const forced = manualRequest !== consumedManual.current;
    consumedManual.current = manualRequest;
    const selectionKey = `${providerId ?? ''}\u0000${modelId ?? ''}`;
    if (selectionRef.current !== undefined && selectionRef.current !== selectionKey) {
      // A candidate belongs to the provider/model that made it. It must not
      // shadow local rules or a newly selected provider after switching source.
      proposalRef.current = undefined;
      previewRef.current = undefined;
    }
    selectionRef.current = selectionKey;
    const suppressionKey = `${intent}\u0000${providerId ?? ''}\u0000${modelId ?? ''}`;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const isCurrent = () => requestEpoch.current === epoch;
    const transportReady = Boolean(transport?.kind === 'mcp' && transport.startSuggestion && transport.getSuggestionJob && transport.getSuggestionUpdates && transport.readSuggestionProposal);
    const previousPreview = () => {
      const previous = previewRef.current;
      return previous ? { proposal: { ...previous.proposal, status: 'stale' as const }, previewSnapshot: previous.snapshot } : {};
    };
    const updateWithPrevious = (phase: ModelSuggestionPhase, extra: Partial<ModelSuggestionState> = {}) => {
      setState({ phase, intent, ...previousPreview(), ...extra });
    };

    if (!intent) { previewRef.current = undefined; setState({ phase: 'idle' }); return; }
    if (!forced && suppressed.current === suppressionKey) { updateWithPrevious('idle'); return; }
    if (!automatic && !forced) { updateWithPrevious('paused'); return; }
    if (!providerId || !modelId) { updateWithPrevious('idle'); return; }
    if (!transportReady) { updateWithPrevious('unavailable', { error: 'Les suggestions par modèle sont disponibles dans l’atelier connecté. Les règles locales restent actives ici.' }); return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { updateWithPrevious('error', { error: 'Aucune connexion réseau n’est disponible. Ton texte reste dans l’éditeur.' }); return; }
    if (composing) { updateWithPrevious('typing'); return; }
    if (!project || !snapshot || dirty || stableStringify(project.snapshot) !== snapshotSignature) {
      updateWithPrevious('syncing'); return;
    }

    updateWithPrevious('typing');
    const delay = forced ? 0 : DESCRIPTION_PAUSE_MS;
    timeout = setTimeout(() => {
      void (async () => {
        if (!isCurrent()) return;
        const activeTransport = transport!;
        const session = sessionId.current ??= globalThis.crypto.randomUUID();
        const currentIntentEpoch = ++intentEpoch.current;
        updateWithPrevious('starting', { providerId, modelId });
        try {
          const job = await activeTransport.startSuggestion!({
            idempotencyKey: globalThis.crypto.randomUUID(),
            expectedDraftVersion: project.draftVersion,
            editorSessionId: session,
            intentEpoch: currentIntentEpoch,
            intent,
            provider: providerId,
            model: modelId,
            mode: 'auto',
            selectedPageId: project.snapshot.pages[0]!.id,
            selectedBlockId: null,
          });
          if (!isCurrent()) { await activeTransport.cancelSuggestion?.(job.jobId); return; }
          jobRef.current = { jobId: job.jobId, epoch };
          updateWithPrevious('running', { providerId, modelId });
          let cursor = 0, currentJob = job;
          while (!terminal(currentJob.state) && isCurrent()) {
            await pause(450);
            if (!isCurrent()) break;
            const page = await activeTransport.getSuggestionUpdates!(job.jobId, cursor, 50);
            cursor = page.nextSeq;
            currentJob = await activeTransport.getSuggestionJob!(job.jobId);
            if (isCurrent() && currentJob.state === 'running') updateWithPrevious('running', { providerId, modelId });
          }
          if (!isCurrent()) return;
          if (jobRef.current?.epoch === epoch) jobRef.current = undefined;
          if (currentJob.state === 'succeeded' && currentJob.proposalIds[0]) {
            const proposal = await activeTransport.readSuggestionProposal!(currentJob.proposalIds[0]);
            if (!isCurrent()) { await activeTransport.markSuggestionProposalStale?.(proposal.id); return; }
            const current = proposal.editorSessionId === session
              && proposal.intentEpoch === currentIntentEpoch
              && proposal.baseDraftVersion === project.draftVersion
              && proposal.status === 'ready';
            const previewSnapshot = applyOperations(project.snapshot, proposal.operations);
            previewRef.current = { proposal, snapshot: previewSnapshot };
            proposalRef.current = proposal;
            setState(current
              ? { phase: 'ready', intent, proposal, previewSnapshot, providerId, modelId }
              : { phase: 'stale', intent, proposal: { ...proposal, status: 'stale' }, previewSnapshot, providerId, modelId, error: 'Le brouillon ou la description a changé. Cette proposition précédente n’est pas applicable.' });
          } else if (currentJob.state === 'failed') {
            updateWithPrevious('error', { error: currentJob.error?.message ?? 'Le modèle n’a pas pu terminer cette proposition.' });
          } else if (currentJob.state === 'outcome_unknown') {
            updateWithPrevious('error', { error: 'Le résultat du modèle n’a pas pu être confirmé. Vérifie la connexion avant de relancer.' });
          } else if (currentJob.state === 'cancelled') {
            updateWithPrevious('paused');
          }
        } catch (failure) {
          if (!isCurrent()) return;
          if (jobRef.current?.epoch === epoch) jobRef.current = undefined;
          const detail = failure instanceof Error ? failure.message : 'La proposition n’a pas pu être chargée.';
          updateWithPrevious('error', { error: detail });
        }
      })();
    }, delay);

    return () => {
      if (timeout) clearTimeout(timeout);
      if (requestEpoch.current === epoch) requestEpoch.current += 1;
      const previousProposal = proposalRef.current;
      if (previousProposal && transport?.markSuggestionProposalStale) {
        proposalRef.current = undefined;
        void transport.markSuggestionProposalStale(previousProposal.id).catch(() => undefined);
      }
      const activeJob = jobRef.current;
      if (activeJob?.epoch === epoch) {
        jobRef.current = undefined;
        void transport?.cancelSuggestion?.(activeJob.jobId).catch(() => undefined);
      }
    };
  }, [transport, project?.draftVersion, snapshotSignature, intent, providerId, modelId, automatic, composing, dirty, manualRequest]);

  const suppressCurrent = useCallback(() => {
    suppressed.current = `${intent}\u0000${providerId ?? ''}\u0000${modelId ?? ''}`;
    clearProposal();
  }, [clearProposal, intent, providerId, modelId]);
  const clearPrevious = useCallback(() => {
    proposalRef.current = undefined;
    previewRef.current = undefined;
    setState((current) => ({ phase: current.phase === 'ready' ? 'idle' : current.phase, intent: current.intent }));
  }, []);
  return { ...state, runNow, clearProposal, clearPrevious, cancelCurrent, suppressCurrent };
}
