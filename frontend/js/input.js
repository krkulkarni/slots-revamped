import { GameState, getCurrentState, setCurrentState } from './state.js';
import { CONFIG } from './config.js';
import * as Game from './gameLogic.js';
import { ensureAudioContext, playSound } from './audio.js';
import * as UI from './ui.js'; // Import UI to trigger debug button click


let keydownListener = null;

export function initInputListeners() {
    if (keydownListener) {
        window.removeEventListener('keydown', keydownListener);
    }

    keydownListener = (event) => {
        const state = getCurrentState();
        // console.log(`>>> Input Listener: Key='${event.key}', State='${state}', Ctrl=${event.ctrlKey}, Alt=${event.altKey}`); // Debug log
        ensureAudioContext(); // Ensure audio is ready on interaction

        // --- Pause Handling (Keep Original) ---
        if (event.key === CONFIG.PAUSE_KEY_1 || event.key === CONFIG.PAUSE_KEY_2 || event.key === CONFIG.PAUSE_KEY_3) {
            const nonPausableStates = [
                GameState.LOADING, GameState.ERROR, GameState.ACCESS_DENIED,
                GameState.PLAYER_ID_INPUT, GameState.CUE_SELECTION, GameState.ENDED,
                GameState.RATING_CRAVING, GameState.RATING_MOOD, GameState.PHASE_INTRO,
                GameState.INSTRUCTIONS
            ];
            if (nonPausableStates.includes(state)) {
                console.log(`Pause ignored in state: ${state}`);
                event.preventDefault(); return;
            }
            if (state !== GameState.PAUSED) { Game.pauseGame(); }
            else { Game.resumeGame(); }
            event.preventDefault(); return;
        }
        // --- End Pause Handling ---

        // --- Debug Jump Key Handling (Keep Original) ---
        if (CONFIG.DEBUG_MODE &&
            event.key.toLowerCase() === CONFIG.DEBUG_JUMP_KEY.toLowerCase() &&
            (event.ctrlKey || event.metaKey) && event.altKey) {
                console.log("Debug jump key combination detected!");
                event.preventDefault();
                if (getCurrentState() !== GameState.PAUSED) { Game.pauseGame(); }
                const debugBtn = document.getElementById('debug-jump-button');
                if (debugBtn) { debugBtn.click(); }
                else { console.warn("Debug jump button not found in DOM."); }
                return;
        }
        // --- End Debug Jump ---


        // --- State-Specific Input (Only if NOT paused) ---
        if (state === GameState.PAUSED) return; // Ignore other game input if paused

        switch (state) {
            case GameState.WAITING_FOR_CHOICE:
                // Calls to Game.handleChoice remain the same.
                // handleChoice now triggers the new spin animation.
                if (event.key === CONFIG.LEFT_KEY) {
                    playSound('select');
                    Game.handleChoice('left');
                } else if (event.key === CONFIG.RIGHT_KEY) {
                     playSound('select');
                     Game.handleChoice('right');
                }
                break;

             case GameState.PLAYER_ID_INPUT: // Keep Original
                if (event.key === 'Enter') {
                    event.preventDefault();
                    document.getElementById('submit-player-id').click();
                }
                break;

             case GameState.INSTRUCTIONS: // Keep Original
                 if (event.key === 'Enter') {
                     event.preventDefault();
                     document.getElementById('start-practice-button').click();
                 }
                 break;

             case GameState.PHASE_INTRO: // Keep Original
                 if (event.key === 'Enter') {
                    event.preventDefault();
                     document.getElementById('continue-phase-button').click();
                 }
                 break;

            // No specific key actions needed for other states like ANIMATING, etc.
            // Rating screen uses its own button, handled by UI.js
            default:
                break;
        }
    };

    window.addEventListener('keydown', keydownListener);
    console.log("Input listeners initialized.");
}

// Keep removeInputListeners function original
export function removeInputListeners() {
    if (keydownListener) {
        window.removeEventListener('keydown', keydownListener);
        keydownListener = null;
        console.log("Input listeners removed.");
    }
}