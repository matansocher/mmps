import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ApiError } from '../../lib/api';
import { practiceErrorMessage } from '../../lib/practice';
import { practiceApi } from '../../lib/practice-api';
import { useVoiceRecorder, voiceErrorMessage, VOICE_MAX_SECONDS } from '../../hooks/useVoiceRecorder';
import { AppIcon } from '../AppIcon';

type ChatComposerProps = {
  readonly placeholder: string;
  readonly maxChars: number;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly allowVoice?: boolean;
  readonly autoFocus?: boolean;
  // Return false to restore the draft (e.g. the request failed).
  readonly onSubmit: (text: string, source: 'text' | 'voice') => Promise<boolean> | boolean;
  readonly onStop?: () => void;
  readonly prefill?: { readonly text: string; readonly nonce: number } | null;
  readonly footerAction?: ReactNode;
};

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ChatComposer({ placeholder, maxChars, disabled, busy, allowVoice = true, autoFocus, onSubmit, onStop, prefill, footerAction }: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [source, setSource] = useState<'text' | 'voice'>('text');
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recorder = useVoiceRecorder({
    onRecorded: async (audio) => {
      setTranscribing(true);
      setVoiceError(null);
      try {
        const { text } = await practiceApi.transcribe(audio);
        if (!text.trim()) {
          setVoiceError("We didn't catch any words. Try again a little closer to the mic.");
          return;
        }
        setValue((prev) => (prev.trim() ? `${prev.trimEnd()} ${text.trim()}` : text.trim()).slice(0, maxChars));
        setSource('voice');
        requestAnimationFrame(() => textareaRef.current?.focus());
      } catch (err) {
        setVoiceError(practiceErrorMessage(err instanceof ApiError ? err.code : 'practice_transcribe_failed'));
      } finally {
        setTranscribing(false);
      }
    },
  });

  useEffect(() => {
    if (prefill?.text) {
      setValue(prefill.text.slice(0, maxChars));
      setSource('text');
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [prefill, maxChars]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus && !disabled && window.matchMedia?.('(pointer: fine)').matches) textareaRef.current?.focus();
  }, [autoFocus, disabled]);

  const recording = recorder.state === 'recording';
  const locked = disabled || busy || transcribing || recording;
  const trimmed = value.trim();
  const canSend = !locked && trimmed.length > 0 && value.length <= maxChars;
  const recorderMessage = voiceError ?? voiceErrorMessage(recorder.error);

  const submit = async () => {
    if (!canSend) return;
    const text = trimmed;
    const sentSource = source;
    setValue('');
    setSource('text');
    const ok = await onSubmit(text, sentSource);
    if (ok === false) {
      setValue((current) => current || text);
      setSource(sentSource);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const remaining = maxChars - value.length;

  return (
    <form className={`composer${recording ? ' recording' : ''}`} onSubmit={handleSubmit}>
      {recorderMessage && (
        <p className="composer-note error" role="alert">
          {recorderMessage}
        </p>
      )}
      <div className="composer-box">
        {recording ? (
          <div className="composer-recording" role="status" aria-live="polite">
            <span className="rec-dot" aria-hidden="true" />
            <span>Listening…</span>
            <span className="rec-time">
              {formatSeconds(recorder.elapsed)} / {formatSeconds(VOICE_MAX_SECONDS)}
            </span>
            <button type="button" className="composer-link" onClick={recorder.cancel}>
              Cancel
            </button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="composer-input"
            value={value}
            rows={1}
            placeholder={transcribing ? 'Transcribing your answer…' : placeholder}
            aria-label={placeholder}
            disabled={disabled || transcribing}
            onChange={(e) => {
              setValue(e.target.value);
              if (!e.target.value.trim()) setSource('text');
            }}
            onKeyDown={handleKeyDown}
          />
        )}

        <div className="composer-actions">
          {allowVoice && recorder.supported && !busy && (
            <button
              type="button"
              className={`composer-icon-btn mic${recording ? ' active' : ''}`}
              aria-label={recording ? 'Stop recording and transcribe' : 'Answer by voice'}
              title={recording ? 'Stop recording' : 'Answer by voice'}
              disabled={disabled || transcribing}
              onClick={() => {
                setVoiceError(null);
                if (recording) recorder.stop();
                else recorder.start();
              }}
            >
              {transcribing ? <span className="spinner" aria-hidden="true" /> : <AppIcon name={recording ? 'stop' : 'mic'} size={20} />}
            </button>
          )}
          {busy && onStop ? (
            <button type="button" className="composer-icon-btn send" aria-label="Stop generating" title="Stop" onClick={onStop}>
              <AppIcon name="stop" size={18} />
            </button>
          ) : (
            !recording && (
              <button type="submit" className="composer-icon-btn send" aria-label="Send" title="Send (Enter)" disabled={!canSend}>
                {busy ? <span className="spinner" aria-hidden="true" /> : <AppIcon name="send" size={20} />}
              </button>
            )
          )}
        </div>
      </div>
      <div className="composer-foot">
        <span>{source === 'voice' ? 'Transcribed from voice — edit before sending' : 'Enter to send · Shift+Enter for a new line'}</span>
        {(remaining < 400 || footerAction) && (
          <span className="composer-foot-end">
            {remaining < 400 && <span className={remaining < 0 ? 'over' : ''}>{remaining}</span>}
            {footerAction}
          </span>
        )}
      </div>
    </form>
  );
}
