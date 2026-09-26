import type { Feedback } from '../../../../src/features/hells-kitchen/game/types';
import { readSettings, type Settings } from './storage';

export class GameAudio {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private ambience: GainNode | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private beat = 0;
  private pressure = 0;
  private voice: HTMLAudioElement | null = null;
  private lastVoice = 0;
  private lastCue = 0;
  private voiceIndex = 0;
  private settings: Settings = readSettings();

  async start(): Promise<void> {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = this.settings.music * 0.16;
        this.musicGain.connect(this.context.destination);
        this.ambience = this.context.createGain();
        this.ambience.gain.value = this.settings.effects * 0.02;
        this.ambience.connect(this.context.destination);
        const source = this.context.createBufferSource();
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 5, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
          last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025;
          data[i] = last * 9;
        }
        source.buffer = buffer;
        source.loop = true;
        source.connect(this.ambience);
        source.start();
      }
      await this.context.resume();
      if (!this.interval) this.interval = setInterval(() => this.music(), 420);
    } catch {
      /* Muted play stays available when browser audio is blocked. */
    }
  }

  setSettings(settings: Settings): void {
    this.settings = settings;
    if (this.musicGain) this.musicGain.gain.value = settings.music * 0.16;
    if (this.ambience) this.ambience.gain.value = settings.effects * 0.02;
    if (this.voice) this.voice.volume = settings.voice;
  }

  private note(frequency: number, duration: number, volume: number, delay = 0, music = false, type: OscillatorType = 'triangle'): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume * (music ? 1 : this.settings.effects), at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(music && this.musicGain ? this.musicGain : ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  private noise(duration: number, frequency: number, volume: number): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    gain.gain.value = volume * this.settings.effects;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  private music(): void {
    const progression = [110, 87.31, 98, 82.41];
    const root = progression[Math.floor(this.beat / 16) % 4];
    if (this.beat % 4 === 0) {
      this.note(root, 1.5, 0.5, 0, true, 'sine');
      this.note(root * 1.5, 1.3, 0.15, 0.02, true, 'sine');
    }
    const steps = [2, 3, 2.4, 3, 2, 3.6, 3, 2.4];
    this.note(root * steps[this.beat % 8], 0.35, 0.1 + this.pressure * 0.001, 0, true);
    if (this.pressure > 55 && this.beat % 2 === 0) this.note(55, 0.17, 0.2, 0, true, 'sine');
    this.beat++;
  }

  update(pressure: number, cooking: boolean): void {
    this.pressure = pressure;
    if (this.ambience) this.ambience.gain.setTargetAtTime(this.settings.effects * (cooking ? 0.09 : 0.025), this.context!.currentTime, 0.5);
  }

  cue(feedback: Feedback): void {
    if (feedback.id === this.lastCue) return;
    this.lastCue = feedback.id;
    switch (feedback.cue) {
      case 'click':
        this.noise(0.05, 1800, 0.13);
        break;
      case 'arrival':
        this.note(523, 0.45, 0.12);
        this.note(659, 0.5, 0.1, 0.12);
        break;
      case 'ready':
        this.note(1318, 0.5, 0.1);
        this.note(1760, 0.4, 0.06, 0.13);
        break;
      case 'serve':
        this.noise(0.14, 3200, 0.2);
        this.note(784, 0.5, 0.1, 0.07);
        break;
      case 'burn':
        this.noise(0.8, 700, 0.4);
        this.note(146, 0.5, 0.15);
        break;
      case 'success':
        [262, 330, 392, 523].forEach((n, i) => this.note(n, 1, 0.12, i * 0.14));
        break;
      case 'failure':
        [196, 164, 130].forEach((n, i) => this.note(n, 0.7, 0.13, i * 0.2));
        break;
    }
    if (feedback.cue !== 'click' && feedback.cue !== 'arrival' && Date.now() - this.lastVoice > 12000 && this.settings.voice > 0) {
      this.lastVoice = Date.now();
      this.voice?.pause();
      this.voice = new Audio(`${import.meta.env.BASE_URL}game-assets/voice-${feedback.cue}-${this.voiceIndex++ % 3}.wav`);
      this.voice.volume = this.settings.voice;
      void this.voice.play().catch(() => undefined);
    }
  }
  pause(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.voice?.pause();
    if (this.context) void this.context.suspend();
  }
}
