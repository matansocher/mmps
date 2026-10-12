import type { GameEvent } from '../game/types';

const PRIORITY: readonly GameEvent[] = ['complete', 'tunnel', 'crumble', 'bridge', 'mirror', 'lever', 'key', 'lock', 'slide', 'push', 'blocked', 'move'];

export class GameAudio {
  private context: AudioContext | null = null;
  private muted = true;
  private readonly voices = new Set<AudioScheduledSourceNode>();

  async enable(enabled: boolean): Promise<void> {
    this.muted = !enabled;
    if (!enabled) {
      for (const voice of this.voices) voice.stop();
      this.voices.clear();
      return;
    }
    this.context ??= new AudioContext();
    if (this.context.state !== 'running') await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Audio playback is not available');
  }

  private voice(source: AudioScheduledSourceNode, output: AudioNode, duration: number, volume: number, delay = 0): void {
    const context = this.context!;
    const gain = context.createGain();
    const start = context.currentTime + delay;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.012, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    output.connect(gain);
    gain.connect(context.destination);
    this.voices.add(source);
    source.onended = () => {
      source.disconnect();
      if (output !== source) output.disconnect();
      gain.disconnect();
      this.voices.delete(source);
    };
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  private tone(from: number, to: number, duration: number, volume: number, delay = 0, type: OscillatorType = 'sine'): void {
    const context = this.context!;
    const source = context.createOscillator();
    source.type = type;
    source.frequency.setValueAtTime(from, context.currentTime + delay);
    source.frequency.exponentialRampToValueAtTime(to, context.currentTime + delay + duration);
    this.voice(source, source, duration, volume, delay);
  }

  private texture(frequency: number, duration: number, volume: number): void {
    const context = this.context!;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    source.connect(filter);
    this.voice(source, filter, duration, volume);
  }

  play(events: readonly GameEvent[]): void {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    switch (PRIORITY.find((event) => events.includes(event))) {
      case 'complete':
        [392, 494, 587, 784].forEach((frequency, index) => this.tone(frequency, frequency, 0.28, 0.035, index * 0.085));
        break;
      case 'move':
        this.texture(500, 0.055, 0.04);
        break;
      case 'push':
        this.texture(420, 0.16, 0.1);
        this.tone(115, 65, 0.14, 0.025, 0, 'triangle');
        break;
      case 'blocked':
        this.tone(105, 70, 0.07, 0.022);
        break;
      case 'crumble':
        this.texture(2100, 0.24, 0.1);
        this.tone(80, 40, 0.18, 0.025);
        break;
      case 'slide':
        this.texture(2800, 0.22, 0.045);
        break;
      case 'bridge':
        this.texture(650, 0.18, 0.07);
        this.tone(170, 105, 0.12, 0.03, 0.08, 'triangle');
        break;
      case 'lever':
      case 'lock':
        this.texture(1600, 0.045, 0.07);
        this.tone(210, 90, 0.08, 0.028, 0.025, 'triangle');
        break;
      case 'mirror':
      case 'key':
        this.tone(880, 880, 0.17, 0.025);
        this.tone(1320, 1320, 0.18, 0.018, 0.05);
        break;
      case 'tunnel':
        this.tone(220, 660, 0.16, 0.025);
        this.tone(440, 220, 0.18, 0.02, 0.08);
        break;
    }
  }

  async close(): Promise<void> {
    if (this.context) await this.context.close();
    this.context = null;
    this.voices.clear();
  }
}
