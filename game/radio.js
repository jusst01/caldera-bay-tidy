import * as THREE from './three.module.min.js';

let audioCtx = null;
let stationIndex = 0;
const stations = [
  { name: "RADIO CALDERA FM", track: "Brisa de Ceniza — Los Faros" },
  { name: "ONDA NOCTURNA", track: "Marea Baja — Violeta Ríos" },
  { name: "CENIZA INDUSTRIAL", track: "Turno de Noche — Fábrica 9" }
];

function initRadio() {}

function startRadio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function cycleStation() {
  stationIndex = (stationIndex + 1) % stations.length;
  return stations[stationIndex];
}

export { initRadio, startRadio, cycleStation };
