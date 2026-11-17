import type { WeaponId } from './types';

export type AudioCombatKind = WeaponId | 'kick_left' | 'kick_right';

export class RoadRushAudio {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private muted = false;
  private unlocked = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(
        mute ? 0 : 0.05,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public unlock(): void {
    if (this.unlocked) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.setupEngineSynth();
      this.unlocked = true;
    } catch {
      // Audio unavailable in restricted headless context
    }
  }

  private setupEngineSynth(): void {
    if (!this.ctx || this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 58;
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 29;

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;

    this.engineGain.gain.value = 0;

    this.engineOsc.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
    this.engineSubOsc.start();
  }

  public updateEngine(speedKmh: number, throttle: boolean, active: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineGain || !this.engineFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
      return;
    }

    const rpmNorm = Math.min(1, speedKmh / 250);
    const freq = 52 + rpmNorm * 135 + (throttle ? 12 : 0);
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(220 + rpmNorm * 680, now, 0.05);
    this.engineGain.gain.setTargetAtTime(throttle ? 0.065 : 0.032, now, 0.06);
  }

  public playAttackSwing(weapon: AudioCombatKind): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitchJitter = 0.92 + Math.random() * 0.16;

    if (weapon === 'rod') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    } else if (weapon === 'chain') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.22);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
    } else if (weapon === 'ball') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(195 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(62, now + 0.24);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    } else if (weapon === 'kick_left' || weapon === 'kick_right') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.13);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    } else {
      // Brick whoosh
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280 * pitchJitter, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playHitImpact(weapon: AudioCombatKind, knockout: boolean): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = weapon === 'brick' || weapon === 'kick_left' || weapon === 'kick_right' ? 'square' : 'triangle';
    const baseFreq =
      weapon === 'rod'
        ? 760
        : weapon === 'chain'
          ? 480
          : weapon === 'ball'
            ? 310
            : weapon === 'kick_left' || weapon === 'kick_right'
              ? 150
              : 190;
    osc.frequency.setValueAtTime(baseFreq * (0.94 + Math.random() * 0.12), now);
    osc.frequency.exponentialRampToValueAtTime(55, now + (knockout ? 0.34 : 0.18));

    gain.gain.setValueAtTime(knockout ? 0.26 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (knockout ? 0.36 : 0.2));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playCollision(intensity: number): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.18);
    gain.gain.setValueAtTime(Math.min(0.22, 0.08 + intensity * 0.12), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playCountdownBeep(finalGo: boolean): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = finalGo ? 880 : 440;
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (finalGo ? 0.28 : 0.14));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playPickup(kind: 'booster' | 'petrol'): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (kind === 'booster') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    }

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playFinishSting(won: boolean): void {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = won ? [523.25, 659.25, 783.99, 1046.5] : [392, 349.23, 293.66];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + idx * 0.11;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public dispose(): void {
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.ctx = null;
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }
}
