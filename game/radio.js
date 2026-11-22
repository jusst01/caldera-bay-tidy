import * as THREE from './three.module.min.js';

let audioCtx = null;
let currentStationIndex = 0;
let isPlaying = false;
let timerId = null;
let currentStep = 0;

const STATIONS = [
  { name: 'RADIO CALDERA FM', notes: [220, 247, 261, 293, 329, 349, 392, 440, 392, 349, 329, 293, 261, 247, 220, 196] },
  { name: 'ONDA NOCTURNA', notes: [110, 123, 130, 146, 164, 174, 196, 220, 196, 174, 164, 146, 130, 123, 110, 98] },
  { name: 'CENIZA INDUSTRIAL', notes: [80, 90, 100, 110, 120, 130, 140, 150, 140, 130, 120, 110, 100, 90, 80, 70] }
];

export function initRadio() {
  currentStationIndex = 0;
  isPlaying = false;
  currentStep = 0;
}

export function startRadio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  isPlaying = true;
  if (!timerId) {
    timerId = setInterval(tickRadio, 250);
  }
}

export function stopRadio() {
  isPlaying = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend();
  }
}

export function cycleStation() {
  currentStationIndex = (currentStationIndex + 1) % STATIONS.length;
  currentStep = 0;
  return getCurrentStationInfo();
}

export function getCurrentStationInfo(save) {
  const station = STATIONS[currentStationIndex];
  return { index: currentStationIndex, name: station.name };
}

function tickRadio() {
  if (!isPlaying || !audioCtx) return;
  const station = STATIONS[currentStationIndex];
  const freq = station.notes[currentStep];

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = currentStationIndex === 2 ? 'sawtooth' : (currentStationIndex === 1 ? 'triangle' : 'sine');
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
  }

  currentStep = (currentStep + 1) % 16;
}
