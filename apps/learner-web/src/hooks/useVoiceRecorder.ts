import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceRecorderState = 'idle' | 'recording' | 'error';
export type VoiceRecorderError = 'unsupported' | 'permission_denied' | 'no_audio' | 'failed';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
export const VOICE_MAX_SECONDS = 180;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

type Options = {
  readonly onRecorded: (audio: Blob) => void;
};

export function useVoiceRecorder({ onRecorded }: Options) {
  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [error, setError] = useState<VoiceRecorderError | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stop();
  }, [stop]);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    setError(null);
    if (!isVoiceSupported()) {
      setError('unsupported');
      setState('error');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as DOMException)?.name;
      setError(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission_denied' : 'failed');
      setState('error');
      return;
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError('unsupported');
      setState('error');
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    cancelledRef.current = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      cleanup();
      setElapsed(0);
      if (cancelledRef.current) {
        setState('idle');
        return;
      }
      if (blob.size === 0) {
        setError('no_audio');
        setState('error');
        return;
      }
      setState('idle');
      onRecordedRef.current(blob);
    };

    recorder.start(250);
    setElapsed(0);
    setState('recording');
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      if (seconds >= VOICE_MAX_SECONDS) stop();
    }, 250);
  }, [cleanup, stop]);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      cleanup();
    },
    [cleanup],
  );

  return { state, error, elapsed, start, stop, cancel, supported: isVoiceSupported() };
}

export function voiceErrorMessage(error: VoiceRecorderError | null): string | null {
  switch (error) {
    case 'unsupported':
      return "Voice recording isn't supported in this browser. Type your answer instead.";
    case 'permission_denied':
      return 'Microphone access was blocked. Allow it in your settings to answer by voice.';
    case 'no_audio':
      return "We didn't catch any audio. Try recording again.";
    case 'failed':
      return "Couldn't start the microphone. Try again or type your answer.";
    default:
      return null;
  }
}
