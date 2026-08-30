/**
 * TRAFFIC ESCAPE — Sound Synthesizer & Audio Engine
 * Zero external dependencies or audio assets!
 * Features:
 * - Master, Engine, and FX gain buses routed into a DynamicsCompressor limiter.
 * - Safe Web Audio gesture unlock & suspended context handling.
 * - Persistent mute state with smooth gain ramping (no pops/clicks).
 * - Continuous dynamic engine sound with session token race-condition protection.
 * - Precise voice node tracking using source `onended` events.
 * - Distinct power-up expiry sounds for Boost vs Magnet.
 * - Balanced volume levels for crisp gameplay feedback.
 */

import { Storage } from './storage.js';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = Storage.getSoundEnabled();

    // Gain Buses & Compressor Limiter
    this.masterGain = null;
    this.engineBus = null;
    this.fxBus = null;
    this.limiter = null;

    // Pre-generated Noise Buffer for Crashes & Near-Misses
    this.noiseBuffer = null;

    // Rate Limiting & Precise Voice Node Accounting
    this.lastPlayTimes = new Map();
    this.activeNodeCount = 0;
    this.maxNodes = 24;

    // Engine Audio Nodes & Session Tracking
    this.engineRunning = false;
    this.engineSessionId = 0;
    this.engineStopTimer = null;
    this.engineSubOsc = null;
    this.engineMainOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.engineLfoOsc = null;
    this.engineLfoGain = null;

    this.isInitialized = false;
  }

  /**
   * Initializes Web Audio context, gain buses, dynamics compressor, and noise buffer.
   */
  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      // 1. DynamicsCompressor Limiter (Prevents clipping when voices accumulate)
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(12, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.limiter.connect(this.ctx.destination);

      // 2. Master Gain Bus
      this.masterGain = this.ctx.createGain();
      const initialVol = this.enabled ? 1.0 : 0.0001;
      this.masterGain.gain.setValueAtTime(initialVol, this.ctx.currentTime);
      this.masterGain.connect(this.limiter);

      // 3. Engine Bus (Well balanced underneath gameplay SFX)
      this.engineBus = this.ctx.createGain();
      this.engineBus.gain.setValueAtTime(0.20, this.ctx.currentTime);
      this.engineBus.connect(this.masterGain);

      // 4. Effects Bus
      this.fxBus = this.ctx.createGain();
      this.fxBus.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.fxBus.connect(this.masterGain);

      // 5. Pre-generate 1-second White Noise Buffer
      this.createNoiseBuffer();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API initialization failed:', e);
    }
  }

  /**
   * Pre-generates 1 second of white noise data into a reusable AudioBuffer.
   */
  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.0;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * Safely unlocks and resumes the AudioContext on user interaction.
   */
  unlock() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => console.warn('Could not resume AudioContext:', err));
    }
  }

  /**
   * Toggles mute state with smooth gain ramping (no clicks or pops).
   */
  toggleSound() {
    this.enabled = !this.enabled;
    Storage.setSoundEnabled(this.enabled);

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      const targetVol = this.enabled ? 1.0 : 0.0001;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(targetVol, now, 0.02);
    }
    return this.enabled;
  }

  /**
   * Rate limiting and voice capacity check.
   */
  canPlaySound(key, minIntervalMs = 40) {
    if (!this.enabled || !this.ctx) return false;
    if (this.activeNodeCount >= this.maxNodes) return false;

    const now = performance.now();
    const lastTime = this.lastPlayTimes.get(key) || 0;
    if (now - lastTime < minIntervalMs) {
      return false;
    }
    this.lastPlayTimes.set(key, now);
    return true;
  }

  /**
   * Helper to start an AudioBufferSourceNode or OscillatorNode with onended voice tracking.
   */
  startManagedSource(sourceNode, durationSec) {
    if (!this.ctx || !sourceNode) return;

    let ended = false;
    const onEnded = () => {
      if (!ended) {
        ended = true;
        this.activeNodeCount = Math.max(0, this.activeNodeCount - 1);
        try {
          sourceNode.disconnect();
        } catch (e) {}
      }
    };

    sourceNode.onended = onEnded;
    this.activeNodeCount++;

    const now = this.ctx.currentTime;
    sourceNode.start(now);
    if (durationSec && durationSec > 0) {
      sourceNode.stop(now + durationSec);
    }
  }

  // ==========================================================================
  // DYNAMIC ENGINE SOUND SYSTEM
  // ==========================================================================

  playIgnition() {
    if (!this.canPlaySound('ignition', 100)) return;
    this.unlock();

    const now = this.ctx.currentTime;

    // 1. Starter Relay Click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(750, now);
    clickOsc.frequency.exponentialRampToValueAtTime(250, now + 0.03);

    clickGain.gain.setValueAtTime(0.15, now);
    clickGain.gain.linearRampToValueAtTime(0.001, now + 0.03);

    clickOsc.connect(clickGain);
    clickGain.connect(this.fxBus);
    this.startManagedSource(clickOsc, 0.03);

    // 2. Ignition Pulse & Restrained Rev Sweep
    const revOsc = this.ctx.createOscillator();
    const revGain = this.ctx.createGain();

    revOsc.type = 'triangle';
    revOsc.frequency.setValueAtTime(75, now);
    revOsc.frequency.exponentialRampToValueAtTime(210, now + 0.18);
    revOsc.frequency.exponentialRampToValueAtTime(90, now + 0.38);

    revGain.gain.setValueAtTime(0.001, now);
    revGain.gain.linearRampToValueAtTime(0.25, now + 0.15);
    revGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    revOsc.connect(revGain);
    revGain.connect(this.fxBus);
    this.startManagedSource(revOsc, 0.38);
  }

  startEngine() {
    this.unlock();
    if (!this.ctx) return;

    // 1. Clear any pending delayed stop callbacks from previous session
    if (this.engineStopTimer) {
      clearTimeout(this.engineStopTimer);
      this.engineStopTimer = null;
    }

    // 2. Increment session token to invalidate old async callbacks
    this.engineSessionId++;

    // 3. Synchronously dismantle any existing engine nodes to avoid restart race conditions
    this.forceStopEngineNodes();

    const now = this.ctx.currentTime;

    // Smooth sports-car body layer (Triangle wave for warm low rumble)
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.setValueAtTime(54, now);

    // Main Harmonic Oscillator (Sine wave pitched an octave up for smooth body)
    this.engineMainOsc = this.ctx.createOscillator();
    this.engineMainOsc.type = 'sine';
    this.engineMainOsc.frequency.setValueAtTime(108, now);

    // Lowpass Filter for Warm Engine Character
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(190, now);
    this.engineFilter.Q.setValueAtTime(1.8, now);

    // Subtle LFO Modulation for motor chug texture
    this.engineLfoOsc = this.ctx.createOscillator();
    this.engineLfoOsc.type = 'sine';
    this.engineLfoOsc.frequency.setValueAtTime(12, now);

    this.engineLfoGain = this.ctx.createGain();
    this.engineLfoGain.gain.setValueAtTime(18, now);

    this.engineLfoOsc.connect(this.engineLfoGain);
    this.engineLfoGain.connect(this.engineFilter.frequency);

    // Engine Gain Node
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0001, now);
    this.engineGain.gain.linearRampToValueAtTime(0.18, now + 0.25);

    // Connect Nodes
    this.engineSubOsc.connect(this.engineFilter);
    this.engineMainOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.engineBus);

    this.engineSubOsc.start(now);
    this.engineMainOsc.start(now);
    this.engineLfoOsc.start(now);

    this.engineRunning = true;
  }

  updateEngine(gameSpeed, isBoosted = false) {
    if (!this.ctx || !this.engineRunning || !this.engineSubOsc) return;

    const now = this.ctx.currentTime;
    const speedRatio = Math.min(1.0, Math.max(0, (gameSpeed - 6.0) / 18.0));

    // Warm, non-harsh pitch curve (54Hz idle up to 145Hz max speed)
    let targetSubFreq = 54 + speedRatio * 91;
    let targetFilterCutoff = 190 + speedRatio * 560;
    let targetGain = 0.18 + speedRatio * 0.08;

    if (isBoosted) {
      targetSubFreq *= 1.30;
      targetFilterCutoff *= 1.50;
      targetGain = 0.28;
    }

    try {
      this.engineSubOsc.frequency.setTargetAtTime(targetSubFreq, now, 0.05);
      this.engineMainOsc.frequency.setTargetAtTime(targetSubFreq * 2.0, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(targetFilterCutoff, now, 0.05);
      this.engineLfoOsc.frequency.setTargetAtTime(10 + speedRatio * 12, now, 0.05);

      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
      }
    } catch (e) {}
  }

  pauseEngine() {
    if (!this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;
    try {
      this.engineGain.gain.cancelScheduledValues(now);
      this.engineGain.gain.setTargetAtTime(0.04, now, 0.08);
    } catch (e) {}
  }

  resumeEngine() {
    if (!this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;
    try {
      this.engineGain.gain.cancelScheduledValues(now);
      this.engineGain.gain.setTargetAtTime(0.22, now, 0.08);
    } catch (e) {}
  }

  stopEngine() {
    if (!this.ctx || !this.engineRunning) return;

    const currentSession = ++this.engineSessionId;
    const now = this.ctx.currentTime;

    if (this.engineGain) {
      try {
        this.engineGain.gain.cancelScheduledValues(now);
        this.engineGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
      } catch (e) {}
    }

    if (this.engineStopTimer) {
      clearTimeout(this.engineStopTimer);
    }

    this.engineStopTimer = setTimeout(() => {
      if (this.engineSessionId === currentSession) {
        this.forceStopEngineNodes();
      }
    }, 140);
  }

  /**
   * Synchronously stops and cleans up engine nodes safely.
   */
  forceStopEngineNodes() {
    if (this.engineSubOsc) {
      try {
        this.engineSubOsc.stop();
        this.engineSubOsc.disconnect();
      } catch (e) {}
      this.engineSubOsc = null;
    }
    if (this.engineMainOsc) {
      try {
        this.engineMainOsc.stop();
        this.engineMainOsc.disconnect();
      } catch (e) {}
      this.engineMainOsc = null;
    }
    if (this.engineLfoOsc) {
      try {
        this.engineLfoOsc.stop();
        this.engineLfoOsc.disconnect();
      } catch (e) {}
      this.engineLfoOsc = null;
    }
    if (this.engineLfoGain) {
      try { this.engineLfoGain.disconnect(); } catch (e) {}
      this.engineLfoGain = null;
    }
    if (this.engineFilter) {
      try { this.engineFilter.disconnect(); } catch (e) {}
      this.engineFilter = null;
    }
    if (this.engineGain) {
      try { this.engineGain.disconnect(); } catch (e) {}
      this.engineGain = null;
    }
    this.engineRunning = false;
  }

  // ==========================================================================
  // GAMEPLAY FEEDBACK SOUNDS
  // ==========================================================================

  playClick() {
    if (!this.canPlaySound('click', 30)) return;
    this.unlock();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.03);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.fxBus);

    this.startManagedSource(osc, 0.03);
  }

  playCountdownTick(isGo = false) {
    if (!this.canPlaySound('countdown', 50)) return;
    this.unlock();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (!isGo) {
      // 3, 2, 1 Ticks
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.05);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.fxBus);

      this.startManagedSource(osc, 0.05);
    } else {
      // "GO!" Cue
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.18);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.fxBus);

      this.startManagedSource(osc, 0.18);
    }
  }

  playSteer() {
    if (!this.canPlaySound('steer', 40)) return;
    this.unlock();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.035);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.fxBus);

    this.startManagedSource(osc, 0.035);
  }

  playCoin() {
    if (!this.canPlaySound('coin', 35)) return;
    this.unlock();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.045); // E6

    osc2.frequency.setValueAtTime(1318.51, now);
    osc2.frequency.setValueAtTime(1760.00, now + 0.045); // A6

    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.fxBus);

    this.startManagedSource(osc1, 0.16);
    this.startManagedSource(osc2, 0.16);
  }

  playPowerup(type) {
    if (!this.canPlaySound('powerup', 60)) return;
    this.unlock();

    const now = this.ctx.currentTime;
    const typeId = type && type.id ? type.id : type;

    if (typeId === 'shield') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.20);

      gain.gain.setValueAtTime(0.30, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.20);

      osc.connect(gain);
      gain.connect(this.fxBus);

      this.startManagedSource(osc, 0.20);
    } else if (typeId === 'boost') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(1380, now + 0.25);

      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.fxBus);

      this.startManagedSource(osc, 0.25);
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.22);

      gain.gain.setValueAtTime(0.30, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.fxBus);

      this.startManagedSource(osc, 0.22);
    }
  }

  playPowerupExpire(type = 'boost') {
    if (!this.canPlaySound('powerupExpire', 60)) return;
    this.unlock();

    const now = this.ctx.currentTime;

    if (type === 'boost') {
      // Short descending engine downshift cue
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.18);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.fxBus);

      this.startManagedSource(osc, 0.18);
    } else {
      // Softer magnetic descending shimmer
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.20);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(20, now);
      lfoGain.gain.setValueAtTime(25, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.20);

      osc.connect(gain);
      gain.connect(this.fxBus);

      this.startManagedSource(lfo, 0.20);
      this.startManagedSource(osc, 0.20);
    }
  }

  playNearMiss() {
    if (!this.canPlaySound('nearMiss', 60)) return;
    this.unlock();

    const now = this.ctx.currentTime;

    // Airy Whoosh using noise buffer
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.fxBus);

      this.startManagedSource(noise, 0.07);
    }

    // High pitch zap chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(1350, now + 0.07);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.fxBus);

    this.startManagedSource(osc, 0.07);
  }

  playShieldBreak() {
    if (!this.canPlaySound('shieldBreak', 100)) return;
    this.unlock();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.fxBus);

    this.startManagedSource(osc, 0.22);
  }

  playCrash() {
    if (!this.canPlaySound('crash', 150)) return;
    this.unlock();

    const now = this.ctx.currentTime;

    // 1. Noise buffer lowpass crash impact
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.linearRampToValueAtTime(90, now + 0.32);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.fxBus);

      this.startManagedSource(noise, 0.32);
    }

    // 2. Sub-bass rumble drop
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.linearRampToValueAtTime(28, now + 0.32);

    subGain.gain.setValueAtTime(0.40, now);
    subGain.gain.linearRampToValueAtTime(0.001, now + 0.32);

    subOsc.connect(subGain);
    subGain.connect(this.fxBus);

    this.startManagedSource(subOsc, 0.32);
  }

  playLevelUp() {
    if (!this.canPlaySound('levelUp', 200)) return;
    this.unlock();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);

      gain.gain.setValueAtTime(0.18, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.15);

      osc.connect(gain);
      gain.connect(this.fxBus);

      this.startManagedSource(osc, 0.15);
    });
  }
}

export const Audio = new SoundEngine();
