import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import type { PracticeAnswerSource, PracticeAttempt, PracticeMessage } from '../lib/practice';
import { practiceApi } from '../lib/practice-api';
import { useProgress } from './useProgress';

export type PracticePhase = 'idle' | 'grading' | 'skipping' | 'streaming';

function errorCode(err: unknown): string {
  if (err instanceof ApiError) return err.code;
  if ((err as Error)?.name === 'AbortError') return 'aborted';
  return 'network_error';
}

export function usePracticeAttempt(attemptId: string | undefined) {
  const { mergeRemote } = useProgress();
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<PracticePhase>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<{ text: string; source: PracticeAnswerSource } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<PracticeMessage | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const load = useCallback(async () => {
    if (!attemptId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await practiceApi.get(attemptId);
      if (aliveRef.current) setAttempt(res.attempt);
    } catch (err) {
      if (aliveRef.current) setLoadError(errorCode(err));
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    abortRef.current?.abort();
    setAttempt(null);
    setPhase('idle');
    setActionError(null);
    setPendingAnswer(null);
    setPendingMessage(null);
    setStreamingText('');
    load();
  }, [load]);

  const applyGraded = useCallback(
    (res: { attempt: PracticeAttempt; progress?: Parameters<typeof mergeRemote>[0] }) => {
      setAttempt(res.attempt);
      if (res.progress) mergeRemote(res.progress, res.attempt.question.biteId ?? undefined);
    },
    [mergeRemote],
  );

  // Returns true when the answer was graded; false lets the composer restore the draft.
  const submitAnswer = useCallback(
    async (text: string, source: PracticeAnswerSource): Promise<boolean> => {
      if (!attempt || phase !== 'idle') return false;
      setActionError(null);
      setPendingAnswer({ text, source });
      setPhase('grading');
      try {
        const res = await practiceApi.answer(attempt.id, text, source);
        if (!aliveRef.current) return true;
        applyGraded(res);
        return true;
      } catch (err) {
        if (!aliveRef.current) return false;
        const code = errorCode(err);
        if (code === 'already_graded') {
          await load();
          return true;
        }
        setActionError(code);
        return false;
      } finally {
        if (aliveRef.current) {
          setPendingAnswer(null);
          setPhase('idle');
        }
      }
    },
    [attempt, phase, applyGraded, load],
  );

  const skip = useCallback(async () => {
    if (!attempt || phase !== 'idle') return;
    setActionError(null);
    setPhase('skipping');
    try {
      const res = await practiceApi.skip(attempt.id);
      if (aliveRef.current) applyGraded(res);
    } catch (err) {
      if (!aliveRef.current) return;
      const code = errorCode(err);
      if (code === 'already_graded') await load();
      else setActionError(code);
    } finally {
      if (aliveRef.current) setPhase('idle');
    }
  }, [attempt, phase, applyGraded, load]);

  const sendFollowup = useCallback(
    async (content: string): Promise<boolean> => {
      if (!attempt || phase !== 'idle' || attempt.status !== 'graded') return false;
      setActionError(null);
      const userMessage: PracticeMessage = { role: 'user', content, createdAt: new Date().toISOString() };
      setPendingMessage(userMessage);
      setStreamingText('');
      setPhase('streaming');
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const reply = await practiceApi.streamMessage(attempt.id, content, {
          signal: controller.signal,
          onDelta: (text) => {
            if (aliveRef.current) setStreamingText((prev) => prev + text);
          },
        });
        if (!aliveRef.current) return true;
        setAttempt((prev) =>
          prev ? { ...prev, messages: [...prev.messages, userMessage, { role: 'assistant', content: reply.content, createdAt: reply.createdAt }] } : prev,
        );
        return true;
      } catch (err) {
        if (!aliveRef.current) return false;
        const code = errorCode(err);
        if (code !== 'aborted') setActionError(code);
        return false;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (aliveRef.current) {
          setPendingMessage(null);
          setStreamingText('');
          setPhase('idle');
        }
      }
    },
    [attempt, phase],
  );

  const stopStreaming = useCallback(() => abortRef.current?.abort(), []);
  const clearError = useCallback(() => setActionError(null), []);

  return {
    attempt,
    loading,
    loadError,
    phase,
    actionError,
    pendingAnswer,
    pendingMessage,
    streamingText,
    reload: load,
    submitAnswer,
    skip,
    sendFollowup,
    stopStreaming,
    clearError,
  };
}
