import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { ChatBubble, TypingIndicator } from '../components/practice/ChatBubble';
import { ChatComposer } from '../components/practice/ChatComposer';
import { DifficultyBadge } from '../components/practice/DifficultyBadge';
import { GradeCard } from '../components/practice/GradeCard';
import { usePracticeAttempt } from '../hooks/usePracticeAttempt';
import { useProgress } from '../hooks/useProgress';
import { ApiError } from '../lib/api';
import { BITES, GUIDES } from '../lib/bites';
import type { PracticeAttempt } from '../lib/practice';
import { ANSWER_MAX_CHARS, FOLLOWUP_MAX_CHARS, practiceErrorMessage, scopeLabel } from '../lib/practice';
import { practiceApi } from '../lib/practice-api';

const GUIDE_LABELS = Object.fromEntries(Object.entries(GUIDES).map(([id, meta]) => [id, meta.label]));
const LESSON_TITLES: ReadonlyMap<string, string> = new Map(BITES.map((b) => [b.id, b.title]));

function suggestionsFor(attempt: PracticeAttempt): string[] {
  const grade = attempt.grade;
  if (!grade) return [];
  const list: string[] = [];
  if (grade.skipped) list.push('Walk me through the answer step by step');
  else if (grade.verdict !== 'correct') list.push('Why was my answer not fully correct?');
  list.push('Give me a real-world example');
  list.push('What would an interviewer ask next?');
  if (!grade.skipped && grade.verdict === 'correct') list.push('What are the trade-offs or edge cases?');
  else list.push('Explain it more simply');
  return list.slice(0, 3);
}

export function PracticeChatPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { remote } = useProgress();
  const { attempt, loading, loadError, phase, actionError, pendingAnswer, pendingMessage, streamingText, reload, submitAnswer, skip, sendFollowup, stopStreaming, clearError } =
    usePracticeAttempt(remote ? attemptId : undefined);

  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const [nextLoading, setNextLoading] = useState(false);
  const [nextError, setNextError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      stickToBottom.current = distance < 160;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setNextError(null);
    setNextLoading(false);
    setPrefill(null);
    stickToBottom.current = true;
  }, [attemptId]);

  const messageCount = attempt?.messages.length ?? 0;
  useLayoutEffect(() => {
    if (!attempt) return;
    if (phase === 'grading' || phase === 'skipping' || pendingMessage) stickToBottom.current = true;
    if (!stickToBottom.current) return;
    endRef.current?.scrollIntoView({ block: 'end', behavior: phase === 'streaming' ? 'auto' : 'smooth' });
  }, [attempt, attempt?.status, messageCount, phase, pendingMessage, streamingText]);

  const suggestions = useMemo(() => (attempt && attempt.messages.length === 0 ? suggestionsFor(attempt) : []), [attempt]);

  const nextQuestion = async () => {
    if (!attempt || nextLoading) return;
    setNextLoading(true);
    setNextError(null);
    try {
      const res = await practiceApi.start(attempt.scope);
      navigate(`/practice/${res.attempt.id}`);
    } catch (err) {
      setNextError(err instanceof ApiError ? err.code : 'network_error');
      setNextLoading(false);
    }
  };

  if (!remote) {
    return (
      <div className="empty">
        <div className="big">
          <AppIcon name="chat" />
        </div>
        <p>{practiceErrorMessage('no_identity')}</p>
        <Link className="btn" to="/">
          Back to Today
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="empty">
        <div className="big">
          <AppIcon name="unknown" />
        </div>
        <p>{practiceErrorMessage(loadError)}</p>
        <div className="empty-actions">
          {loadError !== 'attempt_not_found' && (
            <button type="button" className="btn" onClick={reload}>
              <AppIcon name="refresh" size={17} /> Try again
            </button>
          )}
          <Link className="btn primary" to="/practice">
            New question
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !attempt) {
    return (
      <div className="practice-chat">
        <div className="practice-skeleton" aria-busy="true" aria-label="Loading question">
          <div className="skeleton-row" />
          <div className="skeleton-row tall" />
        </div>
      </div>
    );
  }

  const graded = attempt.status === 'graded' && attempt.grade;
  const busy = phase !== 'idle';
  const answerText = attempt.answer ?? pendingAnswer?.text ?? null;
  const answerSource = attempt.answerSource ?? pendingAnswer?.source ?? null;
  const showSkipBubble = attempt.grade?.skipped && !attempt.answer;
  const errorCode = actionError ?? nextError;

  return (
    <div className="practice-chat">
      <div className="reader-top practice-top">
        <Link className="back-link" to="/practice">
          ← Practice
        </Link>
        <span className="practice-scope-chip" title="Practicing from">
          {scopeLabel(attempt.scope, GUIDE_LABELS, LESSON_TITLES)}
        </span>
      </div>

      <div className="chat-thread" aria-live="polite">
        <ChatBubble
          role="question"
          meta={
            <>
              <AppIcon name={attempt.question.guide} size={14} />
              {GUIDE_LABELS[attempt.question.guide]}
              {attempt.question.lessonTitle ? ` · ${attempt.question.lessonTitle}` : ''}
              <DifficultyBadge difficulty={attempt.question.difficulty} />
            </>
          }
          text={attempt.question.text}
        />

        {answerText && (
          <ChatBubble role="user" text={answerText} meta={answerSource === 'voice' ? <><AppIcon name="mic" size={13} /> Voice answer</> : 'Your answer'} />
        )}
        {showSkipBubble && <ChatBubble role="user" text="I'm not sure — show me the answer." meta="Skipped" />}

        {phase === 'grading' && <TypingIndicator label="Grading your answer…" />}
        {phase === 'skipping' && <TypingIndicator label="Fetching the best answer…" />}

        {graded && attempt.grade && (
          <div className="chat-row assistant grade-row">
            <div className="chat-avatar" aria-hidden="true">
              <AppIcon name="sparkle" size={16} />
            </div>
            <GradeCard grade={attempt.grade} question={attempt.question} />
          </div>
        )}

        {attempt.messages.map((m, i) => (
          <ChatBubble key={`${m.createdAt}-${i}`} role={m.role} text={m.content} />
        ))}

        {pendingMessage && <ChatBubble role="user" text={pendingMessage.content} />}
        {phase === 'streaming' && (streamingText ? <ChatBubble role="assistant" text={streamingText} streaming /> : <TypingIndicator label="Thinking…" />)}

        {graded && suggestions.length > 0 && !busy && (
          <div className="chat-suggestions" aria-label="Suggested follow-ups">
            {suggestions.map((s) => (
              <button key={s} type="button" className="chip suggestion-chip" onClick={() => setPrefill({ text: s, nonce: Date.now() })}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} className="chat-end" />
      </div>

      <div className="chat-dock">
        {errorCode && (
          <div className="practice-error dock-error" role="alert">
            <span>{practiceErrorMessage(errorCode)}</span>
            <button
              type="button"
              className="composer-link"
              onClick={() => {
                clearError();
                setNextError(null);
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {graded ? (
          <>
            <div className="next-bar">
              <button type="button" className="btn primary" disabled={nextLoading || phase === 'streaming'} onClick={nextQuestion}>
                {nextLoading ? <span className="spinner" aria-hidden="true" /> : <AppIcon name="refresh" size={17} />}
                Next question
              </button>
              <Link className="btn subtle" to="/practice">
                Change topics
              </Link>
            </div>
            <ChatComposer
              key={`followup-${attempt.id}`}
              placeholder="Ask the tutor about this question…"
              maxChars={FOLLOWUP_MAX_CHARS}
              busy={phase === 'streaming'}
              disabled={nextLoading}
              onSubmit={(text) => sendFollowup(text)}
              onStop={stopStreaming}
              prefill={prefill}
            />
          </>
        ) : (
          <>
            <ChatComposer
              key={`answer-${attempt.id}`}
              placeholder="Type your answer, or tap the mic to say it…"
              maxChars={ANSWER_MAX_CHARS}
              busy={busy}
              autoFocus
              onSubmit={submitAnswer}
              footerAction={
                <button type="button" className="composer-skip" disabled={busy} onClick={skip} title="Show me the answer">
                  <AppIcon name="skip" size={15} /> I don't know
                </button>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
