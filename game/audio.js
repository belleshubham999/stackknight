// game/audio.js
class AudioController {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.init();
    }

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Generate a simple tone
    playTone(freq, type, duration, vol = 0.1) {
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // Specific SFX implementations based on spec
    playSpawn() {
        // Soft "pop": 440Hz sine, short
        this.playTone(440, 'sine', 0.1, 0.1);
    }

    playLand(size) {
        // Satisfying "thud": pitch varies by block size (lower = bigger)
        // Size 2 (small) -> higher pitch, Size 4 (large) -> lower pitch
        const baseFreq = 220;
        const freq = baseFreq - (size * 20);
        this.playTone(freq, 'sine', 0.2, 0.2);
    }

    playJump() {
        // "Boing": 660Hz -> 440Hz slide
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(660, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playPerfect() {
        // "Cha-ching!": 880Hz -> 1320Hz
        if (!this.enabled || !this.ctx) return;

        // Coin part 1
        this.playTone(880, 'square', 0.1, 0.05);

        setTimeout(() => {
            this.playTone(1320, 'square', 0.2, 0.05);
        }, 50);
    }

    playGameOver() {
        // Sad trombone: descending
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.4);
        osc.frequency.linearRampToValueAtTime(110, now + 0.8);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.8);
    }
}
