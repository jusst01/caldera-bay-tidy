import * as THREE from './three.module.min.js';

let audioCtx = null;
let currentStation = 0;
const stations = ['RADIO CALDERA FM', 'ONDA NOCTURNA', 'CENIZA INDUSTRIAL'];

export function initRadio() {
  if (!audioCtx) audioCtx = new AudioContext();
}

export function startRadio() {
  if (!audioCtx) initRadio();
}

export function cycleStation() {
  currentStation = (currentStation + 1) % stations.length;
}

export function getCurrentStationInfo(save) {
  return { index: currentStation, name: stations[currentStation] };
}

export function stopRadio() {
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}
