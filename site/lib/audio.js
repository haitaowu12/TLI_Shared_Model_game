const STORAGE_KEY = "sharedModelGame_audioMuted";

export class AudioManager {
  constructor() {
    this.ctx = null;
    this._muted = localStorage.getItem(STORAGE_KEY) === "true";
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setMuted(val) {
    this._muted = !!val;
    localStorage.setItem(STORAGE_KEY, String(this._muted));
    return this._muted;
  }

  isMuted() {
    return this._muted;
  }

  toggleMute() {
    return this.setMuted(!this._muted);
  }

  _ensureCtx() {
    if (this._muted) return false;
    if (!this.ctx) this.init();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  }

  _osc(type, freq, gainVal, duration, startDelay = 0) {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime + startDelay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(gainVal, t);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    return { osc, gain };
  }

  _oscSweep(type, freqStart, freqEnd, gainVal, duration, startDelay = 0) {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime + startDelay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(gainVal, t);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    return { osc, gain };
  }

  playClick() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playChipToggle() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playTimerTick() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playTimerUrgent() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(900, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playInterrupt(discType) {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    if (discType === "D") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.1);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } else if (discType === "i") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, t);
      osc.frequency.linearRampToValueAtTime(659, t + 0.15);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } else if (discType === "S") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(392, t);
      osc.frequency.linearRampToValueAtTime(523, t + 0.2);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } else if (discType === "C") {
      for (let i = 0; i < 2; i++) {
        const offset = i * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(880, t + offset);
        gain.gain.setValueAtTime(0.12, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.04);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      }
    }
  }

  playMeterPositive() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523, t);
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.1);
    osc1.onended = () => {
      osc1.disconnect();
      gain1.disconnect();
    };

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659, t + 0.1);
    gain2.gain.setValueAtTime(0.15, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t + 0.1);
    osc2.stop(t + 0.2);
    osc2.onended = () => {
      osc2.disconnect();
      gain2.disconnect();
    };
  }

  playMeterNegative() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(440, t);
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.12);
    osc1.onended = () => {
      osc1.disconnect();
      gain1.disconnect();
    };

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(330, t + 0.12);
    gain2.gain.setValueAtTime(0.15, t + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.25);
    osc2.onended = () => {
      osc2.disconnect();
      gain2.disconnect();
    };
  }

  playSubmit() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const notes = [440, 523, 659];
    const noteDur = 0.1;
    notes.forEach((freq, i) => {
      const offset = i * noteDur;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + offset);
      gain.gain.setValueAtTime(0.15, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + noteDur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + noteDur);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  playAmbientStart() {
    if (!this._ensureCtx()) return { osc1: null, osc2: null, gain: null };
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, t);
    gain.connect(this.ctx.destination);

    const osc1 = this.ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(110, t);
    osc1.connect(gain);
    osc1.start(t);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(111, t);
    osc2.connect(gain);
    osc2.start(t);

    return { osc1, osc2, gain };
  }

  playAmbientStop(nodes) {
    if (!nodes) return;
    try {
      if (nodes.osc1) {
        nodes.osc1.stop();
        nodes.osc1.disconnect();
      }
      if (nodes.osc2) {
        nodes.osc2.stop();
        nodes.osc2.disconnect();
      }
      if (nodes.gain) nodes.gain.disconnect();
    } catch (_) {}
  }

  playRoundStart() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const notes = [330, 440, 523];
    const noteDur = 0.133;
    notes.forEach((freq, i) => {
      const offset = i * noteDur;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + offset);
      gain.gain.setValueAtTime(0.15, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + noteDur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + noteDur);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }
}
