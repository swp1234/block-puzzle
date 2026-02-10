/**
 * Sound Engine - Web Audio API Based
 */

class SoundEngine {
    constructor() {
        this.enabled = this.loadSoundPreference();
        this.audioContext = null;
        this.masterGain = null;
        this.sfxGain = null;

        // Try to initialize audio context on first user interaction
        this.initializeAudioContext();
    }

    initializeAudioContext() {
        if (!this.audioContext) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
                this.masterGain = this.audioContext.createGain();
                this.sfxGain = this.audioContext.createGain();
                this.sfxGain.connect(this.masterGain);
                this.masterGain.connect(this.audioContext.destination);
                this.masterGain.gain.value = this.enabled ? 0.5 : 0;
            } catch (e) {
                console.warn('Web Audio API not supported');
            }
        }
    }

    init() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        this.saveSoundPreference();
        if (this.audioContext && this.masterGain) {
            this.masterGain.gain.value = this.enabled ? 0.5 : 0;
        }
        return this.enabled;
    }

    play(soundType) {
        if (!this.enabled || !this.audioContext || !this.sfxGain) return;

        try {
            switch(soundType) {
                case 'lock':
                    this.playLockSound();
                    break;
                case 'clear':
                    this.playClearSound();
                    break;
                case 'rotate':
                    this.playRotateSound();
                    break;
                case 'hold':
                    this.playHoldSound();
                    break;
                case 'levelup':
                    this.playLevelupSound();
                    break;
                case 'gameover':
                    this.playGameoverSound();
                    break;
            }
        } catch (e) {
            console.warn('Sound playback failed:', e);
        }
    }

    playSound(frequency, duration, type = 'sine', envelope = {}) {
        if (!this.audioContext || !this.sfxGain) return;

        const now = this.audioContext.currentTime;
        const endTime = now + duration;

        // Oscillator
        const osc = this.audioContext.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);

        // Gain (volume envelope)
        const gain = this.audioContext.createGain();
        gain.connect(this.sfxGain);

        const attack = envelope.attack || 0.01;
        const decay = envelope.decay || 0.05;
        const sustain = envelope.sustain || 0.3;
        const release = envelope.release || 0.1;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, now + attack);
        gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
        gain.gain.linearRampToValueAtTime(0, endTime);

        osc.connect(gain);
        osc.start(now);
        osc.stop(endTime);
    }

    playLockSound() {
        this.playSound(400, 0.1, 'sine', { attack: 0.01, decay: 0.08, sustain: 0.5, release: 0.01 });
    }

    playClearSound() {
        // Ascending tone
        const now = this.audioContext.currentTime;
        for (let i = 0; i < 3; i++) {
            const freq = 400 + (i * 100);
            const time = now + (i * 0.1);
            this.playSound(freq, 0.15, 'sine', { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.03 });
        }
    }

    playRotateSound() {
        this.playSound(600, 0.08, 'square', { attack: 0.01, decay: 0.06, sustain: 0.4, release: 0.01 });
    }

    playHoldSound() {
        this.playSound(500, 0.12, 'sine', { attack: 0.01, decay: 0.08, sustain: 0.5, release: 0.02 });
    }

    playLevelupSound() {
        const now = this.audioContext.currentTime;
        const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6
        for (let i = 0; i < frequencies.length; i++) {
            const time = now + (i * 0.15);
            this.playSound(frequencies[i], 0.2, 'sine', { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.05 });
        }
    }

    playGameoverSound() {
        const now = this.audioContext.currentTime;
        // Descending tone
        const freqs = [400, 300, 200];
        for (let i = 0; i < freqs.length; i++) {
            this.playSound(freqs[i], 0.3, 'sine', { attack: 0.05, decay: 0.15, sustain: 0.3, release: 0.1 });
        }
    }

    saveSoundPreference() {
        try {
            localStorage.setItem('sfx_enabled', this.enabled);
        } catch (e) {
            console.warn('Could not save sound preference', e);
        }
    }

    loadSoundPreference() {
        try {
            return localStorage.getItem('sfx_enabled') !== 'false';
        } catch (e) {
            console.warn('Could not load sound preference', e);
            return true;
        }
    }
}

// Global sound engine
window.sfx = new SoundEngine();
