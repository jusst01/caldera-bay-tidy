// CALDERA BAY — game/radio.js
// Fictional radio stations, WebAudio lookahead scheduler, 16-step oscillator loops.

let audioCtx = null;
let currentStation = 0;
let isPlaying = false;
let nextNoteTime = 0.0;
let stepIndex = 0;
let timerId = null;

const STATIONS = [
  {
    name: "RADIO CALDERA FM",
    subtitle: "Brisa de Ceniza — Los Faros",
    bpm: 110,
    wave: "sine",
    notes: [220, 247.09, 293.66, 329.63, 392.00, 329.63, 293.66, 247.09, 196.00, 220, 261.63, 293.66, 349.23, 293.66, 261.63, 220],
    bass: [110, 110, 146.83, 146.83, 196.00, 196.00, 146.83, 146.83, 98.00, 98.00, 130.81, 130.81, 174.61, 174.61, 130.81, 130.81]
  },
  {
    name: "ONDA NOCTURNA",
    subtitle: "Marea Baja — Violeta Ríos",
    bpm: 95,
    wave: "triangle",
    notes: [164.81, 196.00, 220.00, 246.94, 293.66, 246.94, 220.00, 196.00, 146.83, 164.81, 196.00, 220.00, 261.63, 220.00, 196.00, 164.81],
    bass: [82.41, 82.41, 110.00, 110.00, 146.83, 146.83, 110.00, 110.00, 73.42, 73.42, 98.00, 98.00, 130.81, 130.81, 98.00, 98.00]
  },
  {
    name: "CENIZA INDUSTRIAL",
    subtitle: "Turno de Noche — Fábrica 9",
    bpm: 125,
    wave: "sawtooth",
    notes: [130.81, 155.56, 174.61, 207.65, 233.08, 207.65, 174.61, 155.56, 116.54, 130.81, 155.56, 185.00, 220.00, 185.00, 155.56, 130.81],
    bass: [65.41, 65.41, 87.31, 87.31, 116.54, 116.54, 87.31, 87.31, 58.27, 58.27, 77.78, 77.78, 103.83, 103.83, 77.78, 77.78]
  }
];

export function initRadio(saveRef) {
  if (saveRef && typeof saveRef.radioStation === 'number') {
    currentStation = ((saveRef.radioStation % STATIONS.length) + STATIONS.length) % STATIONS.length;
  }
}

export function startRadio(saveRef) {
  if (isPlaying) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.05;
    stepIndex = 0;

    timerId = setInterval(() => {
      scheduler(saveRef);
    }, 25);
  } catch (e) {
    // Headless or blocked
  }
}

function scheduler(saveRef) {
  if (!isPlaying || !audioCtx) return;
  const horizon = 0.14;
  while (nextNoteTime < audioCtx.currentTime + horizon) {
    playStep(saveRef);
    advanceStep(saveRef);
  }
}

function playStep(saveRef) {
  const stationIdx = saveRef && typeof saveRef.radioStation === 'number' ? saveRef.radioStation : currentStation;
  const station = STATIONS[((stationIdx % STATIONS.length) + STATIONS.length) % STATIONS.length];

  const freqLead = station.notes[stepIndex];
  const freqBass = station.bass[stepIndex];

  playTone(freqLead, station.wave, 0.15, 0.08);
  playTone(freqBass, 'sine', 0.2, 0.05);
}

function playTone(freq, type, duration, gainVal) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(nextNoteTime);
    osc.stop(nextNoteTime + duration);
  } catch (e) {}
}

function advanceStep(saveRef) {
  const stationIdx = saveRef && typeof saveRef.radioStation === 'number' ? saveRef.radioStation : currentStation;
  const station = STATIONS[((stationIdx % STATIONS.length) + STATIONS.length) % STATIONS.length];
  const secondsPerBeat = 60.0 / station.bpm;
  const secondsPerStep = secondsPerBeat / 4;
  nextNoteTime += secondsPerStep;
  stepIndex = (stepIndex + 1) % 16;
}

export function cycleStation(saveRef) {
  currentStation = (currentStation + 1) % STATIONS.length;
  if (saveRef) {
    saveRef.radioStation = currentStation;
  }
  if (!isPlaying) {
    startRadio(saveRef);
  }
  return STATIONS[currentStation];
}

export function getCurrentStationInfo(saveRef) {
  const stationIdx = saveRef && typeof saveRef.radioStation === 'number' ? saveRef.radioStation : currentStation;
  const station = STATIONS[((stationIdx % STATIONS.length) + STATIONS.length) % STATIONS.length];
  return {
    index: stationIdx,
    name: station.name,
    subtitle: station.subtitle,
    playing: isPlaying
  };
}

export function stopRadio() {
  isPlaying = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (audioCtx && audioCtx.state !== 'closed') {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}
