import { GameState, getCurrentState, setCurrentState } from './state.js';
import { CONFIG } from './config.js';
import { ensureAudioContext, playSound } from './audio.js';
import * as Game from './gameLogic.js';

// --- DOM Element References ---
let loadingScreen, playerIdScreen, cueSelectionScreen, instructionsScreen, phaseIntroScreen;
let ratingScreen, pauseScreen, endScreen, gameContainer, hudWins, hudTrial, accessDeniedScreen;
let playerIdInput, playerIdError, submitPlayerIdButton;
let cueOptionsContainer, cueSelectionError;
let startPracticeButton;
let phaseIntroTitle, phaseIntroText, continuePhaseButton;
let ratingPrompt, ratingSlider, ratingValueDisplay, ratingLabelMin, ratingLabelMax, submitRatingButton;
let finalScoreDisplay, redirectButton, debugJumpButton;

// --- Rating state ---
let currentRatingType = null;
let ratingCallback = null; // Function to call after rating submission

/**
 * Initializes UI elements and sets up initial visibility.
 */
export function initUI() {
    // Get references
    loadingScreen = document.getElementById('loading-screen');
    accessDeniedScreen = document.getElementById('access-denied-screen');
    playerIdScreen = document.getElementById('player-id-screen');
    cueSelectionScreen = document.getElementById('cue-selection-screen');
    instructionsScreen = document.getElementById('instructions-screen');
    phaseIntroScreen = document.getElementById('phase-intro-screen');
    ratingScreen = document.getElementById('rating-screen');
    pauseScreen = document.getElementById('pause-screen');
    endScreen = document.getElementById('end-screen');
    gameContainer = document.getElementById('game-container');
    hudWins = document.getElementById('hud-wins');
    hudTrial = document.getElementById('hud-trial');

    playerIdInput = document.getElementById('player-id-input');
    playerIdError = document.getElementById('player-id-error');
    submitPlayerIdButton = document.getElementById('submit-player-id');

    cueOptionsContainer = document.getElementById('cue-options');
    cueSelectionError = document.getElementById('cue-selection-error');

    startPracticeButton = document.getElementById('start-practice-button');

    phaseIntroTitle = document.getElementById('phase-intro-title');
    phaseIntroText = document.getElementById('phase-intro-text');
    continuePhaseButton = document.getElementById('continue-phase-button');

    ratingPrompt = document.getElementById('rating-prompt');
    ratingSlider = document.getElementById('rating-slider');
    ratingValueDisplay = document.getElementById('rating-value-display');
    ratingLabelMin = document.getElementById('rating-label-min');
    ratingLabelMax = document.getElementById('rating-label-max');
    submitRatingButton = document.getElementById('submit-rating-button');

    finalScoreDisplay = document.getElementById('final-score');
    redirectButton = document.getElementById('redirect-button');
    debugJumpButton = document.getElementById('debug-jump-button');


    // Initial setup
    hideAllOverlays();
    showOverlay('loading-screen'); // Start with loading

    // Add event listeners
    submitPlayerIdButton.addEventListener('click', handleSubmitPlayerId);
    startPracticeButton.addEventListener('click', handleStartPractice);
    continuePhaseButton.addEventListener('click', handleContinuePhase);
    ratingSlider.addEventListener('input', handleRatingSliderChange);
    submitRatingButton.addEventListener('click', handleSubmitRating);
    redirectButton.addEventListener('click', handleRedirect);
    debugJumpButton.addEventListener('click', handleDebugJump);

    setupCueSelection(); // Populate cue options

    console.log("UI Initialized");
}

/** Populates the cue selection screen */
function setupCueSelection() {
    cueOptionsContainer.innerHTML = ''; // Clear previous options
    Object.entries(CONFIG.AVAILABLE_CUES).forEach(([key, cueInfo]) => {
        const button = document.createElement('button');
        button.dataset.cueKey = key;
        // Use relative path from index.html
        button.innerHTML = `
            <img src="${CONFIG.ASSETS.IMAGES}${cueInfo.image}" alt="${cueInfo.name}">
            <span>${cueInfo.name}</span>
        `;
        button.addEventListener('click', () => handleCueSelection(key));
        cueOptionsContainer.appendChild(button);
    });
}

/** Hides all overlay divs */
export function hideAllOverlays() {
    const overlays = document.querySelectorAll('.overlay');
    overlays.forEach(overlay => overlay.classList.remove('visible'));
}

/** Shows a specific overlay by its ID */
export function showOverlay(overlayId) {
    hideAllOverlays(); // Ensure only one overlay is visible
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.classList.add('visible');
        // console.log(`Showing overlay: ${overlayId}`);
    } else {
        console.error(`Overlay with ID ${overlayId} not found.`);
    }
}

/** Hides a specific overlay by its ID */
export function hideOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

/** Shows error message */
export function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// --- Event Handlers ---

function handleSubmitPlayerId() {
    ensureAudioContext(); playSound('buttonClick');
    const playerId = playerIdInput.value.trim();

    if (playerId && playerId.length > 0) {
        playerIdError.textContent = ''; // Clear error
        console.log("Player ID submitted:", playerId);
        Game.setPlayerId(playerId); // Pass ID to game logic
        setCurrentState(GameState.CUE_SELECTION);
        showOverlay('cue-selection-screen');
    } else {
        playerIdError.textContent = 'Player ID cannot be empty.';
        console.warn("Attempted to submit empty Player ID.");
    }
}

function handleCueSelection(cueKey) {
    ensureAudioContext(); playSound('buttonClick');
    console.log("Cue selected:", cueKey);
    cueSelectionError.textContent = ''; // Clear error
    Game.setSelectedCue(cueKey); // Pass selected cue to game logic
    setCurrentState(GameState.INSTRUCTIONS);
    showOverlay('instructions-screen');
}

function handleStartPractice() {
     console.log(">>> ui.js: handleStartPractice called!");
     ensureAudioContext(); playSound('buttonClick');
     hideOverlay('instructions-screen');
     // Game logic will start the session with the backend and then the practice phase
     Game.startSessionAndPractice();
}

function handleContinuePhase() {
     ensureAudioContext(); playSound('buttonClick');
     console.log("Continue Phase button clicked");
     hideOverlay('phase-intro-screen');
     // Game logic will start the next trial (first of the new phase)
     Game.startNextPhaseBlock();
}

function handleRatingSliderChange() {
    ratingValueDisplay.textContent = ratingSlider.value;
}

function handleSubmitRating() {
    ensureAudioContext(); playSound('ratingSubmit');
    const value = parseInt(ratingSlider.value, 10);
    console.log(`Rating submitted: Type=${currentRatingType}, Value=${value}`);
    hideOverlay('rating-screen');

    if (ratingCallback) {
        ratingCallback(currentRatingType, value); // Pass data back to gameLogic
    } else {
        console.error("Rating callback was not set!");
    }
    // Reset for next time
    currentRatingType = null;
    ratingCallback = null;
}

function handleRedirect() {
    console.log(`Redirecting to: ${CONFIG.REDIRECT_URL}`);
    playSound('buttonClick');
    window.location.href = CONFIG.REDIRECT_URL; // Perform the redirect
}

function handleDebugJump() {
     if (!CONFIG.DEBUG_MODE) return; // Should not be clickable if not debug, but double-check

     playSound('buttonClick');
     const targetTrialStr = prompt(`DEBUG: Enter trial number to jump to (1-${CONFIG.TOTAL_TRIALS}):`);
     if (targetTrialStr === null) return; // User cancelled

     const targetTrial = parseInt(targetTrialStr, 10);
     if (!isNaN(targetTrial) && targetTrial >= 1 && targetTrial <= CONFIG.TOTAL_TRIALS) {
         console.log(`DEBUG: Attempting to jump to trial ${targetTrial}`);
         // Game logic handles resuming if paused and jumping
         Game.goToTrial(targetTrial);
     } else {
         alert(`Invalid trial number. Please enter a number between 1 and ${CONFIG.TOTAL_TRIALS}.`);
     }
     // Ensure game resumes if jump prompt is cancelled while paused
     if (getCurrentState() === GameState.PAUSED && targetTrialStr === null) {
         Game.resumeGame();
     }
}

// --- UI Update Functions ---

export function updateHUD(wins, trial, totalTrials) {
    hudWins.textContent = `Wins: ${wins}`;
    hudTrial.textContent = `Trial: ${trial} / ${totalTrials}`;
}

export function showPhaseIntro(phaseName, winningImageDesc) {
    phaseIntroTitle.textContent = `${phaseName} Starting`;
    phaseIntroText.textContent = `In this block, the winning image will be the ${winningImageDesc}. Press Continue or Enter to begin.`;
    setCurrentState(GameState.PHASE_INTRO); // Set state BEFORE showing overlay
    showOverlay('phase-intro-screen');
    playSound('buttonClick'); // Or a different notification sound
}

export function showRatingScreen(type, promptText, callback) {
    currentRatingType = type;
    ratingCallback = callback; // Store the function to call on submit

    ratingPrompt.textContent = promptText;
    ratingSlider.value = 50; // Reset slider
    ratingValueDisplay.textContent = '50';

    // Set appropriate labels based on rating type
    if (type === 'CRAVING') {
        ratingLabelMin.textContent = "Not at all";
        ratingLabelMax.textContent = "Very Strong";
        setCurrentState(GameState.RATING_CRAVING); // Set specific rating state
    } else { // MOOD
        ratingLabelMin.textContent = "Very Negative";
        ratingLabelMax.textContent = "Very Positive";
        setCurrentState(GameState.RATING_MOOD); // Set specific rating state
    }

    showOverlay('rating-screen');
    playSound('ratingPrompt');
}

export function showEndScreen(totalWins) {
    finalScoreDisplay.textContent = `You achieved a total of ${totalWins} wins.`;
    // State is set in gameLogic before calling this
    showOverlay('end-screen');
    // End sound played in gameLogic
}

export function togglePauseOverlay(isPaused) {
     if(isPaused) {
         showOverlay('pause-screen');
         // Debug button visibility handled by state change listener in main.js now
     } else {
         hideOverlay('pause-screen');
     }
}