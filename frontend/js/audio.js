import { CONFIG } from './config.js';

let audioContext = null;
const audioBuffers = {}; // Store decoded audio data
const activeSources = {}; // Store currently playing sound sources (for stopping loops)

// Define sound keys and their corresponding file paths
const SOUND_FILES = {
    select: `${CONFIG.ASSETS.AUDIO}select.wav`,
    rolling: `${CONFIG.ASSETS.AUDIO}rolling.wav`, // Assume loopable
    win: `${CONFIG.ASSETS.AUDIO}win.wav`,
    lose: `${CONFIG.ASSETS.AUDIO}lose.wav`,
    ratingPrompt: `${CONFIG.ASSETS.AUDIO}rating_prompt.wav`,
    ratingSubmit: `${CONFIG.ASSETS.AUDIO}rating_submit.wav`,
    buttonClick: `${CONFIG.ASSETS.AUDIO}button_click.wav`,
    // Add more sounds as needed
};

/**
 * Initializes the AudioContext, usually triggered by the first user interaction.
 */
export function ensureAudioContext() {
    if (audioContext === null && typeof window.AudioContext !== 'undefined') {
        try {
            audioContext = new window.AudioContext();
            console.log("AudioContext initialized.");
        } catch (e) {
            console.error("Error initializing AudioContext:", e);
        }
    }
    // For older Safari/iOS:
    else if (audioContext === null && typeof window.webkitAudioContext !== 'undefined') {
         try {
            audioContext = new window.webkitAudioContext();
            console.log("webkitAudioContext initialized.");
        } catch (e)
        {
            console.error("Error initializing webkitAudioContext:", e);
        }
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log("AudioContext resumed."));
    }
    return audioContext !== null;
}

/**
 * Loads all defined sound files.
 * @param {function} onComplete - Callback function when all sounds are loaded/failed.
 */
export async function loadSounds(onComplete) {
    if (!ensureAudioContext()) {
        console.warn("AudioContext not available, cannot load sounds.");
        if (onComplete) onComplete();
        return;
    }

    const soundKeys = Object.keys(SOUND_FILES);
    let soundsLoaded = 0;
    let soundsErrored = 0;

    console.log(">>> Starting sound loading...");

    if (soundKeys.length === 0) {
        console.log(">>> No sound files defined to load.");
        if (onComplete) onComplete();
        return;
    }

    soundKeys.forEach(key => {
        const url = SOUND_FILES[key];
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${url}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(decodedData => {
                audioBuffers[key] = decodedData;
                // console.log(`>>> Sound loaded: ${key}`);
                soundsLoaded++;
            })
            .catch(error => {
                console.error(`>>> Error loading sound ${key} from ${url}:`, error);
                soundsErrored++;
            })
            .finally(() => {
                if (soundsLoaded + soundsErrored === soundKeys.length) {
                    console.log(`>>> Sound loading finished. Loaded: ${soundsLoaded}, Errored: ${soundsErrored}`);
                    if (onComplete) onComplete();
                }
            });
    });
}

/**
 * Plays a loaded sound.
 * @param {string} key - The key of the sound to play (must match a key in SOUND_FILES).
 * @param {boolean} [loop=false] - Whether the sound should loop.
 * @param {number} [volume=1.0] - Playback volume (0.0 to 1.0).
 */
export function playSound(key, loop = false, volume = 1.0) {
    if (!audioContext || audioContext.state !== 'running') {
        // console.warn(`Cannot play sound "${key}", AudioContext not ready or running.`);
        // Try to initialize/resume again just in case
        if(ensureAudioContext() && audioContext.state !== 'running') {
             console.warn(`AudioContext still not running after trying to resume.`);
             return;
        } else if (!audioContext) {
            return; // Still no context
        }
    }

    const buffer = audioBuffers[key];
    if (!buffer) {
        console.warn(`Sound "${key}" not loaded or not found.`);
        return;
    }

    // Stop previous instance if it exists (especially important for loops)
    stopSound(key);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    // Create GainNode for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(clamp(volume, 0.0, 1.0), audioContext.currentTime);

    // Connect source -> gain -> destination
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    source.start(0);

    // Store reference to the source node if looping
    if (loop) {
        activeSources[key] = source;
    }

     // Clean up reference when sound finishes naturally (if not looping)
     if (!loop) {
         source.onended = () => {
             if (activeSources[key] === source) { // Avoid race conditions
                 delete activeSources[key];
             }
         };
     }
}

/**
 * Stops a currently playing sound, particularly useful for loops.
 * @param {string} key - The key of the sound to stop.
 */
export function stopSound(key) {
    if (activeSources[key]) {
        try {
            activeSources[key].stop(0); // Stop playback
            activeSources[key].disconnect(); // Disconnect nodes
        } catch (e) {
            // Ignore errors if the sound already stopped naturally
             // console.log(`Ignoring error stopping sound "${key}":`, e.message);
        }
        delete activeSources[key]; // Remove reference
        // console.log(`Stopped sound: ${key}`);
    }
}

/**
 * Clamps a value between a minimum and maximum. (Helper)
 * @param {number} value - The value to clamp.
 * @param {number} min - The minimum allowed value.
 * @param {number} max - The maximum allowed value.
 * @returns {number} The clamped value.
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}