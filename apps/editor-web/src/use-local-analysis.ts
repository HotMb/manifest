import { useCallback, useEffect, useRef, useState } from 'react';
import { stableStringify, type Snapshot } from '@design-workbench/m0-contract';
import { analyzeDescription, DESCRIPTION_PAUSE_MS, isAnalysisCurrent, type LocalAnalysis } from './manifest-analysis.ts';

export type AnalysisPhase = 'idle' | 'typing' | 'paused' | 'ready';

export function useLocalAnalysis(description: string, snapshot: Snapshot | undefined, automatic: boolean, composing: boolean) {
  const [analysis, setAnalysis] = useState<LocalAnalysis>();
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const epoch = useRef(0);
  const current = useRef({ description, snapshot, composing });
  current.current = { description, snapshot, composing };
  const signature = snapshot ? stableStringify(snapshot) : '';

  const runNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    epoch.current++;
    const input = current.current;
    if (!input.description.trim() || !input.snapshot || input.composing) return;
    setAnalysis(analyzeDescription(input.description, input.snapshot));
    setPhase('ready');
  }, []);

  useEffect(() => {
    const generation = ++epoch.current;
    if (timer.current) clearTimeout(timer.current);
    setAnalysis(undefined);
    if (!description.trim() || !snapshot) { setPhase('idle'); return; }
    if (!automatic) { setPhase('paused'); return; }
    setPhase('typing');
    if (composing) return;
    timer.current = setTimeout(() => {
      if (generation !== epoch.current) return;
      const input = current.current;
      if (!input.snapshot || input.composing) return;
      setAnalysis(analyzeDescription(input.description, input.snapshot));
      setPhase('ready');
    }, DESCRIPTION_PAUSE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [description, signature, automatic, composing]);

  // Filter synchronously during render as well as cancelling the timer in the effect.
  // A new keystroke must not leave an old clickable hint eligible for one frame.
  const eligible = !composing && isAnalysisCurrent(analysis, description, snapshot);
  return { analysis: eligible ? analysis : undefined, phase: phase === 'ready' && !eligible ? (description.trim() ? 'typing' : 'idle') as AnalysisPhase : phase, runNow };
}
