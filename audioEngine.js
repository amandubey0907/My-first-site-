/**
 * AudioEngine.js
 * Web Audio API & Live Spatial Sound Engine
 * Part of: Geospatial Proximity Audio Ecosystem (Proximate & Live Audio Task)
 */

class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.isInitialized = false;
    this.isPlaying = false;
    this.activeSourceType = 'synth'; // 'synth' | 'mic'

    // Core Audio Nodes
    this.masterGainNode = null;
    this.proximityGainNode = null;
    this.pannerNode = null;
    this.analyserNode = null;

    // Synthesizer Audio Nodes
    this.oscillator1 = null;
    this.oscillator2 = null;
    this.filterNode = null;

    // Live Mic Stream
    this.micStream = null;
    this.micSourceNode = null;
  }

  /**
   * Initialize AudioContext on user interaction
   */
  async init() {
    if (this.isInitialized) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    // Create Master & Proximity Gain Nodes
    this.masterGainNode = this.audioCtx.createGain();
    this.masterGainNode.gain.setValueAtTime(0.8, this.audioCtx.currentTime);

    this.proximityGainNode = this.audioCtx.createGain();
    this.proximityGainNode.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

    // Create Stereo Panner Node for Left/Right spatial audio
    if (this.audioCtx.createStereoPanner) {
      this.pannerNode = this.audioCtx.createStereoPanner();
    } else {
      console.warn("StereoPannerNode not supported in this browser, using bypass.");
      this.pannerNode = this.audioCtx.createGain();
    }

    // Create Analyser Node for live visualizer
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.85;

    // Routing Graph: Source -> ProximityGain -> Panner -> MasterGain -> Analyser -> Output
    this.proximityGainNode.connect(this.pannerNode);
    this.pannerNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioCtx.destination);

    this.isInitialized = true;
  }

  /**
   * Start Live Audio Stream from user's microphone
   */
  async startMicrophoneStream() {
    await this.init();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // Stop synth if running
    this.stopSynth();

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.micSourceNode = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micSourceNode.connect(this.proximityGainNode);
      this.activeSourceType = 'mic';
      this.isPlaying = true;
      return { success: true, message: "Live Microphone Connected" };
    } catch (err) {
      console.error("Microphone access error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Stop Live Microphone Stream
   */
  stopMicrophoneStream() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch (e) {}
      this.micSourceNode = null;
    }
  }

  /**
   * Start Synthesized Spatial Audio Beacon (Ambient Carrier Tone)
   */
  async startSynth(frequency = 220) {
    await this.init();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.stopMicrophoneStream();
    this.stopSynth();

    // Create dual harmonic oscillator for pleasant ambient sound beacon
    this.oscillator1 = this.audioCtx.createOscillator();
    this.oscillator2 = this.audioCtx.createOscillator();
    this.filterNode = this.audioCtx.createBiquadFilter();

    this.oscillator1.type = "sine";
    this.oscillator1.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

    this.oscillator2.type = "triangle";
    this.oscillator2.frequency.setValueAtTime(frequency * 1.5, this.audioCtx.currentTime);

    // Warm Low-pass filter
    this.filterNode.type = "lowpass";
    this.filterNode.frequency.setValueAtTime(800, this.audioCtx.currentTime);

    const oscMixGain = this.audioCtx.createGain();
    oscMixGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

    this.oscillator1.connect(this.filterNode);
    this.oscillator2.connect(this.filterNode);
    this.filterNode.connect(oscMixGain);
    oscMixGain.connect(this.proximityGainNode);

    this.oscillator1.start();
    this.oscillator2.start();

    this.activeSourceType = 'synth';
    this.isPlaying = true;
  }

  /**
   * Stop Synthesized Audio
   */
  stopSynth() {
    if (this.oscillator1) {
      try { this.oscillator1.stop(); this.oscillator1.disconnect(); } catch (e) {}
      this.oscillator1 = null;
    }
    if (this.oscillator2) {
      try { this.oscillator2.stop(); this.oscillator2.disconnect(); } catch (e) {}
      this.oscillator2 = null;
    }
    if (this.filterNode) {
      try { this.filterNode.disconnect(); } catch (e) {}
      this.filterNode = null;
    }
  }

  /**
   * Stop all playback
   */
  stopAll() {
    this.stopMicrophoneStream();
    this.stopSynth();
    this.isPlaying = false;
  }

  /**
   * Dynamically Update Proximity Gain & Stereo Panner
   * @param {number} gain - normalized volume [0.0 - 1.0]
   * @param {number} pan - stereo pan [-1.0 to 1.0]
   */
  updateSpatialParameters(gain, pan) {
    if (!this.isInitialized || !this.proximityGainNode) return;

    const now = this.audioCtx.currentTime;
    // Smooth transition to prevent audio popping / clipping
    this.proximityGainNode.gain.cancelScheduledValues(now);
    this.proximityGainNode.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, gain)), now + 0.05);

    if (this.pannerNode && this.pannerNode.pan) {
      this.pannerNode.pan.cancelScheduledValues(now);
      this.pannerNode.pan.linearRampToValueAtTime(Math.max(-1, Math.min(1, pan)), now + 0.05);
    }
  }

  /**
   * Set Master Volume [0.0 - 1.0]
   */
  setMasterVolume(val) {
    if (this.masterGainNode && this.audioCtx) {
      this.masterGainNode.gain.setValueAtTime(val, this.audioCtx.currentTime);
    }
  }

  /**
   * Get Byte Frequency Data for visualizer
   */
  getVisualizerData(dataArray) {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(dataArray);
    }
  }
}

// Export for module/browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioEngine;
}
