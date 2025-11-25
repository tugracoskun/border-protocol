export const AudioSys = {
    ctx: null,
    masterGain: null,
    heliNode: null,
    droneNode: null,
    radioStaticBuffer: null,

    init() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4;
        this.masterGain.connect(this.ctx.destination);
        this.createRadioStatic();
    },

    createBrownNoise() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 3.5;
        }
        return buffer;
    },

    createRadioStatic() {
        const duration = 0.3;
        const bufferSize = this.ctx.sampleRate * duration;
        this.radioStaticBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.radioStaticBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.1;
    },

    playRadioSquelch() {
        if(!this.ctx || !this.radioStaticBuffer) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.radioStaticBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 1500;
        src.connect(filter); filter.connect(this.masterGain);
        src.start();
    },

    startHeliSound() {
        if (!this.ctx) return;
        const noiseBuffer = this.createBrownNoise();
        const noise = this.ctx.createBufferSource(); noise.buffer = noiseBuffer; noise.loop = true;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 150;
        const modGain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 8;
        const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 0.3;
        lfo.connect(lfoGain); lfoGain.connect(modGain.gain);
        noise.connect(filter); filter.connect(modGain); modGain.connect(this.masterGain);
        noise.start();
        this.heliNode = { noise, lfo };
    },

    playMachineGun() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.08);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 800;
        osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
        osc.start(); osc.stop(this.ctx.currentTime + 0.09);
    },

    playExplosion(pitch = 300) {
        if (!this.ctx) return;
        const buffer = this.createBrownNoise();
        const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = pitch;
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);
        noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
        noise.start();
    },

    startDroneSound() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 150;
        const gain = this.ctx.createGain(); gain.gain.value = 0.05;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1000;
        osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
        osc.start();
        this.droneNode = { osc, gain, filter };
    },

    playDroneMotor(active) {
        if(active && !this.droneNode) this.startDroneSound();
        else if(!active && this.droneNode) {
            this.droneNode.osc.stop();
            this.droneNode = null;
        }
    },
    
    playClusterPop() {
         if (!this.ctx) return;
         const osc = this.ctx.createOscillator(); osc.type = 'square';
         osc.frequency.setValueAtTime(800, this.ctx.currentTime);
         osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
         const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
         gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
         osc.connect(gain); gain.connect(this.masterGain);
         osc.start(); osc.stop(this.ctx.currentTime + 0.15);
    }
};