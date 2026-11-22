// game/radio.js
import * as THREE from './three.module.min.js';

let audioCtx = null;
let currentStation = 0;
const stations = [
    { name: "RADIO CALDERA FM", lead: [440, 466, 494, 523, 587, 622, 659, 698, 740, 784, 831, 880, 932, 988, 1047, 1109], bass: [110, 110, 110, 110, 110, 110, 110, 110, 55, 55, 55, 55, 55, 55, 55, 55] },
    { name: "ONDA NOCTURNA", lead: [220, 233, 247, 262, 294, 311, 330, 349, 370, 392, 415, 440, 466, 494, 523, 554], bass: [55, 55, 55, 55, 55, 55, 55, 55, 27, 27, 27, 27, 27, 27, 27, 27] },
    { name: "CENIZA INDUSTRIAL", lead: [880, 932, 988, 1047, 1175, 1245, 1319, 1397, 1480, 1568, 1661, 1760, 1865, 1976, 2093, 2217], bass: [220, 220, 220, 220, 220, 220, 220, 220, 110, 110, 110, 110, 110, 110, 110, 110] }
];

let nextTickTime = 0;
let step = 0;

function scheduleTone(time, freq, type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.2);
}

function scheduler() {
    while (nextTickTime < audioCtx.currentTime + 0.14) {
        const s = stations[currentStation];
        scheduleTone(nextTickTime, s.lead[step], 'sine');
        scheduleTone(nextTickTime, s.bass[step], 'square');
        nextTickTime += 0.25;
        step = (step + 1) % 16;
    }
    setTimeout(scheduler, 25);
}

export function initRadio() {
    currentStation = 0;
}

export function startRadio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        nextTickTime = audioCtx.currentTime;
        scheduler();
    }
}

export function cycleStation() {
    currentStation = (currentStation + 1) % stations.length;
}
