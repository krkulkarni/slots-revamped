/**
 * Enum for game states.
 * @readonly
 * @enum {string}
 */
export const GameState = Object.freeze({
    LOADING: 'LOADING',
    ERROR: 'ERROR', // Generic error state
    ACCESS_DENIED: 'ACCESS_DENIED', // Specific error for security key fail
    PLAYER_ID_INPUT: 'PLAYER_ID_INPUT',
    CUE_SELECTION: 'CUE_SELECTION',
    INSTRUCTIONS: 'INSTRUCTIONS',
    PHASE_INTRO: 'PHASE_INTRO',
    READY_FOR_TRIAL: 'READY_FOR_TRIAL', // Between phases or after ratings
    FIXATION: 'FIXATION',
    WAITING_FOR_CHOICE: 'WAITING_FOR_CHOICE',
    ANIMATING: 'ANIMATING', // Handle pull, shutter, reel spin
    OUTCOME_DISPLAY: 'OUTCOME_DISPLAY',
    RATING_CRAVING: 'RATING_CRAVING',
    RATING_MOOD: 'RATING_MOOD',
    PAUSED: 'PAUSED',
    ENDED: 'ENDED'
});

let currentState = GameState.LOADING;
const stateChangeListeners = [];

/**
 * Gets the current game state.
 * @returns {GameState} The current state.
 */
export function getCurrentState() {
    return currentState;
}

/**
 * Sets the current game state and notifies listeners.
 * @param {GameState} newState - The new state to set.
 */
export function setCurrentState(newState) {
    if (newState === currentState) return; // No change

    if (!Object.values(GameState).includes(newState)) {
        console.error(`Attempted to set invalid state: ${newState}`);
        return;
    }

    const oldState = currentState;
    currentState = newState;
    // console.log(`State changed: ${oldState} -> ${newState}`); // Optional: Log state changes

    // Notify listeners
    stateChangeListeners.forEach(listener => listener(newState, oldState));
}

/**
 * Adds a listener function to be called when the game state changes.
 * @param {function(GameState, GameState)} listener - The function to call (receives newState, oldState).
 */
export function addStateChangeListener(listener) {
    if (typeof listener === 'function' && !stateChangeListeners.includes(listener)) {
        stateChangeListeners.push(listener);
    }
}

/**
 * Removes a state change listener.
 * @param {function(GameState, GameState)} listener - The listener function to remove.
 */
export function removeStateChangeListener(listener) {
    const index = stateChangeListeners.indexOf(listener);
    if (index > -1) {
        stateChangeListeners.splice(index, 1);
    }
}