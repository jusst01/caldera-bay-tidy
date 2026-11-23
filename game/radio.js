import * as THREE from './three.module.min.js';

/**
 * RADIO SYSTEM - CALDERA BAY
 * Manages station switching and 16-step audio loops.
 */

// Audio infrastructure
let audioContext = null;
let masterGain = null;

// Station state
let currentStationIndex = 0;
let isPlaying = false;
let currentStep = 0;

// Station definitions: RADIO CALDERA FM, ONDA NOCTURNA, CENIZA INDUSTRIAL
// Each station possesses a unique 16-step gain modulation profile.
const stations = [
    {
        name: "RADIO CALDERA FM",
        steps: Array.from({ length: 16 }, (_, i) => Math.sin(i / 16 * Math.PI * 2) * 0.5 + 0.5)
    },
    {
        name: "ONDA NOCTURNA",
        steps: Array.from({ length: 16 }, (_, i) => Math.cos(i / 16 * Math.PI * 2) * 0.5 + 0.5)
    },
    {
        name: "CENIZA INDUSTRIAL",
        steps: Array.from({ length: 16 }, (_, i) => (i % 4) / 4)
    }
];

/**
 * Initializes the radio system, establishing the required audio context.
 * This implementation guarantees only a single audio context is created
 * and maintained throughout the lifecycle of the radio module.
 */
export function initRadio() {
    if (audioContext) {
        console.warn("Radio already initialized.");
        return;
    }

    // Audio context instantiation restricted to a single instance
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Setup gain node to manage master volume output
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.25;

    console.log("Radio system initialized.");
}

/**
 * Resumes the audio context if it was suspended and updates the playback status.
 * This allows the radio to resume playing after being stopped or suspended.
 */
export function startRadio() {
    if (!audioContext) {
        initRadio();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    isPlaying = true;
    console.log(`Started playback for ${stations[currentStationIndex].name}`);
}

/**
 * Cycles to the next radio station index, wrapping around to the first station
 * after the final one has been reached. Resets the step sequencer to zero.
 */
export function cycleStation() {
    currentStationIndex = (currentStationIndex + 1) % stations.length;
    currentStep = 0; // Reset step on station change
    console.log(`Station changed to: ${stations[currentStationIndex].name}`);
}

/**
 * Provides metadata about the currently selected radio station.
 * @param {boolean} save - Flag indicating if this station state should be persisted.
 * @returns {{index: number, name: string}} The index and name of the current station.
 */
export function getCurrentStationInfo(save) {
    return {
        index: currentStationIndex,
        name: stations[currentStationIndex].name
    };
}

/**
 * Halts the radio audio scheduler, silences the master audio output,
 * and suspends the underlying audio context.
 */
export function stopRadio() {
    if (audioContext) {
        audioContext.suspend();
        console.log("Radio audio suspended.");
    }
    isPlaying = false;
}

/**
 * Internal simulation loop for radio station audio modulation.
 * Operates as a 16-step sequencer affecting the master gain output.
 * Runs via requestAnimationFrame to ensure smooth synchronization.
 */
function updateLoop() {
    if (isPlaying && audioContext && masterGain) {
        const station = stations[currentStationIndex];
        const gainLevel = station.steps[currentStep];

        // Apply gain modulation based on the station's step data
        masterGain.gain.setTargetAtTime(gainLevel * 0.4, audioContext.currentTime, 0.05);

        // Advance the step index within the 16-step loop
        currentStep = (currentStep + 1) % 16;
    }

    // Schedule the next loop iteration
    requestAnimationFrame(updateLoop);
}

// Initialize the background simulation loop
updateLoop();
