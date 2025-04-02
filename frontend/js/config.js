import { shuffleArray as importedShuffleArray } from './utils.js'; // Use named import

// Keep shuffleArray function definition here if not moved to utils.js yet
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

export const CONFIG = {
    // --- Security, Redirect, Debug ---
    REQUIRED_SECURITY_KEY: "YOUR_SECRET_KEY_12345", // !! CHANGE THIS !!
    REDIRECT_URL: "https://google.com",
    DEBUG_MODE: false, // Set via URL param ?debug=true
    // --------------------------------

    // --- Core Game Logic Config (Keep from Original) ---
    FIXATION_DURATION: 1.0, // Seconds for fixation cross
    OUTCOME_DURATION: 1.0,  // Seconds the winning/losing symbol stays visible after spin
    HIGH_PROB: 0.8,
    LOW_PROB: 0.2,
    RATING_SCALE_MIN: 0,
    RATING_SCALE_MAX: 100,
    PRACTICE_TRIALS: 5,
    ADDICTIVE_CUE_TRIALS: 60,
    MONETARY_TRIALS: 60,
    LEFT_KEY: 'ArrowLeft',
    RIGHT_KEY: 'ArrowRight',
    PAUSE_KEY_1: 'p', PAUSE_KEY_2: 'P', PAUSE_KEY_3: 'Escape',
    DEBUG_JUMP_KEY_MODIFIER_1: 'Control', DEBUG_JUMP_KEY_MODIFIER_2: 'Alt', DEBUG_JUMP_KEY: 'g',
    API_BASE_URL: 'http://localhost:8000/api',
    // -------------------------------------------------

    // --- Asset Paths ---
    ASSETS: { IMAGES: 'assets/images/', AUDIO: 'assets/audio/', },
    // -----------------

    // --- NEW Visualization Config ---
    MACHINE_SPACING: 1, // Visual spacing between the two machines centers (in ortho units)
    MASTER_SCALE_FACTOR: 1.35, // <<< ADD THIS LINE (1.0 = default size, >1 = bigger, <1 = smaller)
    REEL_SIZE: {          // Dimensions/positioning relative to the base 2x2 plane
        width: 0.55,
        height: 0.54,
        yOffset: 0.035,
        gradientHeight: 0.22
    },
    // Texture filenames
    BASE_TEXTURE_FILE: 'slot_machine_base.png',
    GRADIENT_TEXTURE_FILE: 'gradient.png',
    // --- REEL TEXTURES (Crucial for Texture Strategy) ---
    // Assumes 3 symbols vertically: [START, WIN, LOSS]
    REEL_TEXTURE_DEFAULT_FILE: 'reel_strip.png',      // Fallback (e.g., Beer)
    REEL_TEXTURE_CUE_FILE: 'reel_strip_cue.png',      // For Cue Wins
    REEL_TEXTURE_COIN_FILE: 'reel_strip_coin.png',    // For Coin Wins
    // -----------------------------------------------------
    REEL_TEXTURE_START_INDEX: 0, // Logical index of the 'START' symbol on strip
    REEL_TEXTURE_WIN_INDEX: 1,   // Logical index of the 'WIN' symbol (Cue or Coin) on strip
    REEL_TEXTURE_LOSS_INDEX: 2,  // Logical index of the 'LOSS' symbol on strip
    REEL_SYMBOL_COUNT: 3,        // Number of symbols on the reel strip texture
    // Animation Timing
    SPIN_DURATION: 1200, // ms, duration of the main spin animation
    // RESET_DURATION: 1000, // ms, (Removed - reset is instant now)
    // ---------------------------

    // --- Game Logic Image Files (Ensure these exist in assets/images/) ---
    AVAILABLE_CUES: {
        // Define cues available for selection
        'Liquor': { name: 'Liquor', image: 'cue_liquor.png' }, // Filename used to find actual cue image
        'Beer': { name: 'Beer', image: 'cue_beer.png' },
        'Wine': { name: 'Wine', image: 'cue_wine.png' },
    },
    // These are used IF you generate textures dynamically OR for reference
    COIN_IMAGE_FILE: 'outcome_coin.png', // Image of the coin symbol
    LOSS_IMAGE_FILE: 'outcome_loss.png', // Image of the loss symbol (e.g., No symbol)
    // -----------------------------------------------------------------------
    FIXATION_IMAGE_FILE: 'fixation.png', // Fixation cross image
    // ------------------------------------------------------------------

    // --- Sequences (Keep from Original) ---
    PROBABILITY_SWITCH_SEQUENCES: {
        'A': [16, 29, 40, 53, 66, 78, 91, 104, 116],
        'B': [17, 30, 43, 54, 67, 79, 92, 104, 117],
        'C': [18, 29, 42, 55, 67, 80, 91, 103, 116],
        'D': [16, 28, 41, 53, 66, 79, 90, 102, 114]
    },
    RATING_PROMPT_SEQUENCES: {
        'A': { craving: [8, 12, 16, 19, 22, 26, 29, 33, 36, 39, 43, 47, 51, 54, 57, 61, 64, 67, 71, 74, 77, 81, 84, 87, 90, 93, 97, 100, 104, 107, 110, 113, 117, 120, 123], mood: [10, 15, 21, 27, 32, 38, 44, 49, 56, 62, 68, 73, 79, 85, 91, 96, 102, 108, 114, 119, 125] },
        'B': { craving: [7, 10, 13, 17, 20, 24, 28, 31, 34, 37, 40, 44, 47, 51, 55, 58, 62, 65, 69, 72, 75, 79, 82, 86, 89, 92, 96, 100, 103, 106, 110, 113, 116, 120, 124], mood: [11, 16, 22, 27, 33, 39, 45, 50, 56, 61, 67, 73, 78, 84, 90, 95, 101, 108, 114, 119, 125] },
        'C': { craving: [9, 12, 16, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 57, 60, 63, 66, 70, 74, 77, 80, 84, 88, 91, 95, 98, 101, 104, 108, 111, 115, 119, 122], mood: [14, 19, 24, 30, 36, 42, 48, 54, 59, 65, 71, 76, 82, 87, 93, 99, 105, 110, 116, 121, 125] },
        'D': { craving: [8, 11, 14, 18, 21, 25, 28, 32, 35, 38, 42, 46, 49, 53, 56, 60, 64, 67, 70, 73, 77, 80, 83, 87, 91, 95, 99, 102, 105, 109, 113, 116, 120, 124], mood: [12, 17, 23, 29, 34, 40, 45, 51, 57, 62, 68, 74, 79, 85, 90, 96, 101, 107, 112, 118, 123] }
    }
    // ------------------------------------
};

// --- Dynamic Setup (Keep from Original) ---
const probSeqIds = Object.keys(CONFIG.PROBABILITY_SWITCH_SEQUENCES);
const ratingSeqIds = Object.keys(CONFIG.RATING_PROMPT_SEQUENCES);
CONFIG.SELECTED_PROBABILITY_SEQUENCE_ID = probSeqIds[Math.floor(Math.random() * probSeqIds.length)];
CONFIG.SELECTED_RATING_SEQUENCE_ID = ratingSeqIds[Math.floor(Math.random() * ratingSeqIds.length)];
CONFIG.ACTIVE_PROBABILITY_SWITCHES = CONFIG.PROBABILITY_SWITCH_SEQUENCES[CONFIG.SELECTED_PROBABILITY_SEQUENCE_ID];
CONFIG.ACTIVE_RATING_PROMPTS = CONFIG.RATING_PROMPT_SEQUENCES[CONFIG.SELECTED_RATING_SEQUENCE_ID];
const taskPhases = ['ADDICTIVE_CUE', 'MONETARY'];
CONFIG.PHASE_ORDER = shuffleArray([...taskPhases]); // Use the function defined above or imported
CONFIG.TOTAL_TRIALS = CONFIG.PRACTICE_TRIALS + CONFIG.ADDICTIVE_CUE_TRIALS + CONFIG.MONETARY_TRIALS;
// --- End Dynamic Setup ---

// --- Log final configuration selection ---
console.log("CONFIG Initialized (Merged):");
console.log(` - Total Trials (Base): ${CONFIG.TOTAL_TRIALS}`);
console.log(` - Phase Order: Practice, ${CONFIG.PHASE_ORDER.join(', ')}`);
console.log(` - Selected Probability Sequence ID: ${CONFIG.SELECTED_PROBABILITY_SEQUENCE_ID}`);
console.log(` - Selected Rating Sequence ID: ${CONFIG.SELECTED_RATING_SEQUENCE_ID}`);
// ----------------------------
