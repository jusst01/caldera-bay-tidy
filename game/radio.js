import * as THREE from './three.module.min.js';

const STATIONS = [
  { name: "RADIO CALDERA FM", track: "Brisa de Ceniza — Los Faros", bpm: 120, wave: 'sine', lead: [0, 2, 4, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28], bass: [0, 4, 7, 12] },
  { name: "ONDA NOCTURNA", track: "Marea Baja — Violeta Ríos", bpm: 90, wave: 'triangle', lead: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29, 31, 34, 36], bass: [0, 5, 7, 10] },
  { name: "CENIZA INDUSTRIAL", track: "Turno de Noche — Fábrica 9", bpm: 140, wave: 'square', lead: [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22], bass: [0, 1, 3, 4] }
];

let audioCtx = null;
let currentStation = 0;
let nextTick = 0;
let tickInterval = 0;

export function initRadio(save) {
  // Init
}

export function startRadio() {
  start();
}

export function cycleStation() {
  currentStation = (currentStation + 1) % STATIONS.length;
  // If save exists, update it.
  if (window.save) window.save.radioStation = currentStation;
}

// Internal start logic
let audioCtx = null;
let currentStation = 0;
let nextTick = 0;

function start() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  tick();
}
// ... (rest of the file)

function tick() {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const horizon = 0.14;

  while (nextTick < now + horizon) {
    playNote(nextTick);
    nextTick += 60 / (STATIONS[currentStation].bpm * 4);
  }

  setTimeout(tick, 25);
}

function playNote(time) {
  const station = STATIONS[currentStation];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = station.wave;
  // Simplified frequency calculation
  osc.frequency.value = 220 * Math.pow(2, (station.lead[Math.floor(time * 10) % station.lead.length] / 12));

  gain.gain.setValueAtTime(0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(time);
  osc.stop(time + 0.1);
}
