// Radio static/tuning sound generator using Web Audio API

class TuningSound {
  private audioContext: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isPlaying = false;
  private sweepInterval: number | null = null;

  // Create white noise buffer
  private createNoiseBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds of noise
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // White noise with some character (slightly colored)
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }

    return buffer;
  }

  // Initialize audio context (must be called after user interaction)
  private initAudio() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
    }
  }

  // Start playing radio static
  start() {
    if (typeof window === 'undefined') return;
    if (this.isPlaying) return;

    this.initAudio();
    if (!this.audioContext) return;

    try {
      // Create noise source
      this.noiseNode = this.audioContext.createBufferSource();
      this.noiseNode.buffer = this.createNoiseBuffer();
      this.noiseNode.loop = true;

      // Create filter to shape the noise (make it sound more like radio static)
      this.filterNode = this.audioContext.createBiquadFilter();
      this.filterNode.type = 'bandpass';
      this.filterNode.frequency.value = 2000;
      this.filterNode.Q.value = 0.5;

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.06; // Very subtle background static

      // Connect nodes
      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Start the noise
      this.noiseNode.start();
      this.isPlaying = true;

      // Add frequency sweeps to simulate radio tuning
      this.startSweeps();
    } catch (e) {
      console.error('Failed to start tuning sound:', e);
    }
  }

  // Add sweeping effect
  private startSweeps() {
    if (!this.filterNode || !this.audioContext) return;

    const sweep = () => {
      if (!this.filterNode || !this.audioContext || !this.isPlaying) return;

      // Random sweep parameters
      const startFreq = 500 + Math.random() * 3000;
      const endFreq = 500 + Math.random() * 3000;
      const duration = 0.3 + Math.random() * 0.5;

      // Perform the sweep
      this.filterNode.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
      this.filterNode.frequency.linearRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);

      // Also modulate the gain slightly
      if (this.gainNode) {
        const gainVariation = 0.04 + Math.random() * 0.04;
        this.gainNode.gain.setValueAtTime(gainVariation, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.06, this.audioContext.currentTime + duration);
      }
    };

    // Initial sweep
    sweep();

    // Random sweeps every 0.5-1.5 seconds
    this.sweepInterval = window.setInterval(() => {
      if (Math.random() > 0.3) { // 70% chance of sweep
        sweep();
      }
    }, 500 + Math.random() * 1000);
  }

  // Stop the static sound
  stop() {
    if (!this.isPlaying) return;

    // Clear sweep interval
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }

    // Fade out
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.audioContext.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
    }

    // Stop and disconnect after fade
    setTimeout(() => {
      if (this.noiseNode) {
        try {
          this.noiseNode.stop();
          this.noiseNode.disconnect();
        } catch (e) {
          // Ignore if already stopped
        }
        this.noiseNode = null;
      }
      if (this.filterNode) {
        this.filterNode.disconnect();
        this.filterNode = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      this.isPlaying = false;
    }, 150);
  }

  // Check if currently playing
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// Singleton instance
let tuningSoundInstance: TuningSound | null = null;

export function getTuningSound(): TuningSound {
  if (typeof window === 'undefined') {
    throw new Error('TuningSound can only be used in browser');
  }

  if (!tuningSoundInstance) {
    tuningSoundInstance = new TuningSound();
  }

  return tuningSoundInstance;
}

export type { TuningSound };
