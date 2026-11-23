import * as THREE from './three.module.min.js';

let audioContext = null;
let currentStationIndex = 0;
const stations = ['RADIO CALDERA FM', 'ONDA NOCTURNA', 'CENIZA INDUSTRIAL'];

function initRadio() {
  if (!audioContext) audioContext = new AudioContext();
}
function startRadio() {}
function cycleStation() {
  currentStationIndex = (currentStationIndex + 1) % stations.length;
}
function getCurrentStationInfo(save) {
  return { index: currentStationIndex, name: stations[currentStationIndex] };
}
function stopRadio() {
  if (audioContext) audioContext.close();
  audioContext = null;
}

export { initRadio, startRadio, cycleStation, getCurrentStationInfo, stopRadio };
