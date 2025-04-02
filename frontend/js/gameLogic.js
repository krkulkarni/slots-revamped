// frontend/js/gameLogic.js

import { CONFIG } from './config.js'; // Import the main CONFIG object
import { GameState, getCurrentState, setCurrentState } from './state.js';
import * as API from './api.js';
import * as UI from './ui.js';
import * as Audio from './audio.js';
import { delay } from './utils.js';
import { removeInputListeners } from './input.js';
// Import interfaces from main.js to interact with visualization
import { getMachines, getReelTextures } from './main.js';
// Specific index constants (REEL_TEXTURE_...) are now accessed via CONFIG.

// --- Game State Variables (Keep Original) ---
let sessionInfo = {
    playerId: null, sessionId: null, selectedCueKey: null, selectedCueImageFile: null, // Store filename
    phaseOrder: [...CONFIG.PHASE_ORDER], probSequenceId: CONFIG.SELECTED_PROBABILITY_SEQUENCE_ID,
    ratingSequenceId: CONFIG.SELECTED_RATING_SEQUENCE_ID, probSwitchTrials: [...CONFIG.ACTIVE_PROBABILITY_SWITCHES],
    ratingPromptTrials: { craving: [...CONFIG.ACTIVE_RATING_PROMPTS.craving], mood: [...CONFIG.ACTIVE_RATING_PROMPTS.mood] },
};
let currentPhase = null; let currentPhaseIndex = -1; let globalTrial = 0; let phaseTrial = 0;
let totalWins = 0; let highProbMachine = 'left';
let machines = { left: { prob: CONFIG.HIGH_PROB }, right: { prob: CONFIG.LOW_PROB } };
// let sprites = {}; // No longer used - interact via getMachines()
let choiceStartTime = 0; let responseTime = null; let currentTrialData = {};
let isPaused = false; let pauseStateCache = null; let ratingQueue = [];
// --- End Game State Variables ---


// --- Initialization and Setup ---
export function initGame() {
    console.log("Game Logic Initialized.");
    // Ensure initial probabilities are set (can be randomized later)
    updateMachineProbabilities();
}

export function setPlayerId(id) {
     console.log(`Set Player ID: "${id}"`);
     sessionInfo.playerId = id;
}

export function setSelectedCue(cueKey) {
    console.log(`Set Selected Cue: "${cueKey}"`);
    sessionInfo.selectedCueKey = cueKey;
    // Store the FILENAME of the selected cue's image for reference/potential dynamic texture generation
    sessionInfo.selectedCueImageFile = CONFIG.AVAILABLE_CUES[cueKey]?.image;
    if (!sessionInfo.selectedCueImageFile) {
        console.error(`Image file not found for selected cue key: ${cueKey}`);
    }

    // NOTE: Actual machine texture handling based on CUE vs COIN happens
    // during handleChoice, using the pre-loaded textures.
    // We don't need to create sprites or set textures here anymore.
    console.log(`Selected cue image file: ${sessionInfo.selectedCueImageFile}`);
}

export async function startSessionAndPractice() {
    console.log(">>> startSessionAndPractice called!");
    setCurrentState(GameState.LOADING); UI.showOverlay('loading');
    try {
        // --- Session data preparation and API call ---
        const sessionData = {
            player_id: sessionInfo.playerId,
            selected_cue: sessionInfo.selectedCueKey,
            phase_order: sessionInfo.phaseOrder.join(','),
            probability_sequence_id: sessionInfo.probSequenceId,
            rating_sequence_id: sessionInfo.ratingSequenceId,
        };
        console.log(">>> Sending sessionData:", JSON.stringify(sessionData, null, 2));
        if (!sessionData.player_id || sessionData.player_id.length === 0) throw new Error("Player ID empty.");
        if (!sessionData.selected_cue || !sessionData.phase_order || !sessionData.probability_sequence_id || !sessionData.rating_sequence_id) throw new Error("Missing session info.");

        const response = await API.startSession(sessionData);
        if (!response || !response.id) throw new Error("Invalid session response from backend.");
        sessionInfo.sessionId = response.id;
        console.log(`>>> Session started. Backend Session ID: ${sessionInfo.sessionId}`);
        // --- End API call ---

        // Randomize initial probabilities AFTER getting session ID confirmation
        highProbMachine = Math.random() < 0.5 ? 'left' : 'right';
        updateMachineProbabilities();
        console.log(`>>> Initial high prob machine: ${highProbMachine}`);

        // Start the first phase (Practice)
        startPhase('PRACTICE');
        console.log(">>> Successfully called startPhase('PRACTICE').");

    } catch (error) {
        console.error(">>> Error in startSessionAndPractice:", error);
        setCurrentState(GameState.ERROR);
        UI.showOverlay('player-id-screen');
        UI.showError('player-id-error', `Error starting session: ${error.message || 'Unknown error'}. Check backend connection.`);
        sessionInfo.sessionId = null;
    }
}
// --- End Initialization and Setup ---


// --- Phase Management (Keep Original Logic) ---
function startPhase(phaseKey) {
    console.log(`>>> startPhase: '${phaseKey}'`);
    currentPhase = phaseKey;
    phaseTrial = 0;
    isPaused = false; // Reset pause state on phase start

    let phaseName = "", winningDesc = "", phaseOrderIndex = -1;
    switch (currentPhase) {
        case 'PRACTICE':
            phaseName = "Practice Phase";
            winningDesc = `cue (${sessionInfo.selectedCueKey})`;
            phaseOrderIndex = -1;
            break;
        case 'ADDICTIVE_CUE':
            phaseOrderIndex = sessionInfo.phaseOrder.indexOf('ADDICTIVE_CUE');
            phaseName = `Task Block ${phaseOrderIndex + 1}`;
            winningDesc = `cue (${sessionInfo.selectedCueKey})`;
            break;
        case 'MONETARY':
            phaseOrderIndex = sessionInfo.phaseOrder.indexOf('MONETARY');
            phaseName = `Task Block ${phaseOrderIndex + 1}`;
            winningDesc = "a Coin";
            break;
        default:
            console.error("Unknown phase key:", phaseKey);
            setCurrentState(GameState.ERROR);
            return;
    }
    currentPhaseIndex = phaseOrderIndex;
    // UI function shows overlay and sets PHASE_INTRO state
    UI.showPhaseIntro(phaseName, winningDesc);
    console.log(`>>> Called UI.showPhaseIntro for: '${phaseKey}'`);
}

export function startNextPhaseBlock() {
    console.log("Continuing to next block...");
    // Reset machine visuals before starting the trial
    const machines = getMachines();
    if (machines.left) machines.left.resetVisuals();
    if (machines.right) machines.right.resetVisuals();

    setCurrentState(GameState.READY_FOR_TRIAL);
    startTrial(); // Start the first trial of the new block
}
// --- End Phase Management ---


// --- Trial Management ---
async function startTrial() {
    if (isPaused) { console.log("startTrial skipped: paused."); return; }
    if (globalTrial >= CONFIG.TOTAL_TRIALS) { endGame(); return; }

    globalTrial++;
    phaseTrial++;
    console.log(`--- Starting Trial: Global ${globalTrial}, Phase ${currentPhase} Trial ${phaseTrial} ---`);
    setCurrentState(GameState.FIXATION);
    currentTrialData = {}; // Reset trial data
    responseTime = null;
    ratingQueue = []; // Reset ratings queue
    UI.updateHUD(totalWins, globalTrial, CONFIG.TOTAL_TRIALS);

    // Check for probability switch before this trial starts
    let switched = checkAndApplyProbabilitySwitch(globalTrial);
    currentTrialData.left_machine_prob = machines.left.prob;
    currentTrialData.right_machine_prob = machines.right.prob;
    currentTrialData.probability_switched_this_trial = switched;

    // Reset machine visuals to START state via the machine instances
    const machineInstances = getMachines();
    if (machineInstances.left) machineInstances.left.resetVisuals();
    if (machineInstances.right) machineInstances.right.resetVisuals();
    // Machine and fixation visibility is now controlled by state changes in main.js

    await delay(CONFIG.FIXATION_DURATION * 1000);

    // Check if state changed during fixation (e.g., paused)
    if (getCurrentState() !== GameState.FIXATION) {
        console.log(`State changed during fixation (now ${getCurrentState()}), aborting trial start.`);
        return;
    }

    // Fixation ends, machines become visible via state change handler in main.js
    setCurrentState(GameState.WAITING_FOR_CHOICE);
    choiceStartTime = performance.now(); // Start response timer
    console.log("Waiting for player choice...");
}

// --- Handle Choice (Major Changes) ---
export function handleChoice(choice) {
    if (getCurrentState() !== GameState.WAITING_FOR_CHOICE) {
        console.warn("handleChoice ignored: wrong state.");
        return;
    }
    responseTime = performance.now() - choiceStartTime;
    setCurrentState(GameState.ANIMATING); // Use ANIMATING state during spin
    console.log(`Choice: ${choice}, RT: ${responseTime.toFixed(1)} ms`);
    currentTrialData.choice = choice;
    currentTrialData.response_time_ms = responseTime;

    // --- Determine Win/Loss ---
    const chosenProb = machines[choice].prob;
    const isWin = Math.random() < chosenProb;
    const outcome = isWin ? 'WIN' : 'LOSS';
    // -------------------------

    let targetSymbolIndex;     // Index on the reel strip (0=START, 1=WIN, 2=LOSS)
    let reelTextureToUse;      // Which texture map to use (cue, coin, default)
    const textures = getReelTextures(); // Get loaded textures from main.js

    // --- Determine Target Symbol and Texture ---
    if (isWin) {
        totalWins++;
        UI.updateHUD(totalWins, globalTrial, CONFIG.TOTAL_TRIALS);
        // Use CONFIG object to access the index
        targetSymbolIndex = CONFIG.REEL_TEXTURE_WIN_INDEX; // Land on WIN symbol index

        switch (currentPhase) {
            case 'PRACTICE':
            case 'ADDICTIVE_CUE':
                currentTrialData.winning_cue_type = currentPhase === 'PRACTICE' ? 'PRACTICE_CUE' : 'ADDICTIVE_CUE';
                reelTextureToUse = textures.cue; // Use the CUE texture strip
                console.log("Outcome: CUE WIN");
                break;
            case 'MONETARY':
                currentTrialData.winning_cue_type = 'MONETARY';
                reelTextureToUse = textures.coin; // Use the COIN texture strip
                console.log("Outcome: COIN WIN");
                break;
            default: // Should not happen
                 console.error("Unknown phase in win condition:", currentPhase);
                 reelTextureToUse = textures.default; // Fallback
                 // Use CONFIG object to access the index
                 targetSymbolIndex = CONFIG.REEL_TEXTURE_LOSS_INDEX; // Land on loss if error
        }
    } else { // Loss
        // Use CONFIG object to access the index
        targetSymbolIndex = CONFIG.REEL_TEXTURE_LOSS_INDEX; // Land on LOSS symbol index
        currentTrialData.winning_cue_type = currentPhase === 'PRACTICE' ? 'PRACTICE_CUE' : currentPhase; // Context
        console.log("Outcome: LOSS");
        // Determine texture to show even on loss (consistent with phase)
        switch (currentPhase) {
            case 'PRACTICE': case 'ADDICTIVE_CUE':
                reelTextureToUse = textures.cue; break;
            case 'MONETARY':
                reelTextureToUse = textures.coin; break;
            default:
                reelTextureToUse = textures.default;
        }
    }
    // --- End Target/Texture Determination ---

    // Record outcome data
    currentTrialData.outcome = outcome;
    currentTrialData.outcome_image = isWin
        ? (currentPhase === 'MONETARY' ? CONFIG.COIN_IMAGE_FILE : sessionInfo.selectedCueImageFile)
        : CONFIG.LOSS_IMAGE_FILE; // Reference original symbol filename


    // --- Get Machine Instance and Validate Texture ---
    const machineInstances = getMachines();
    const machine = (choice === 'left') ? machineInstances.left : machineInstances.right;

    if (!machine) {
        console.error("CRITICAL: Chosen machine instance not found!");
        setCurrentState(GameState.ERROR); return;
    }
    if (!reelTextureToUse) {
        console.error(`CRITICAL: Reel texture for ${currentPhase}/${outcome} not loaded or determined! Falling back.`);
        reelTextureToUse = textures.default; // Fallback essential
        if (!reelTextureToUse) {
             console.error("CRITICAL: Default texture also missing!");
             setCurrentState(GameState.ERROR); return;
        }
    }
    // --- End Validation ---


    // --- Set Texture and Trigger Spin Animation ---
    machine.setTexture(reelTextureToUse); // Ensure correct texture is set

    Audio.playSound('rolling', true); // Start rolling sound (ensure audio.js is integrated)

    machine.spin(targetSymbolIndex, () => {
        // --- Spin Complete Callback ---
        Audio.stopSound('rolling'); // Stop rolling sound

        // Check if state changed during spin (e.g., paused)
        if (getCurrentState() !== GameState.ANIMATING) {
            console.warn("Spin complete callback ignored: State changed during spin.");
            return;
        }

        setCurrentState(GameState.OUTCOME_DISPLAY); // Signify outcome is now visible
        console.log(`Spin complete. Landed on index: ${machine.currentIndex}`);

        // Play win/loss sound
        if (isWin) Audio.playSound('win');
        else Audio.playSound('lose');

        // Wait for the configured outcome duration before proceeding
        setTimeout(() => {
             // Check state again in case of pause during timeout
             if (getCurrentState() !== GameState.OUTCOME_DISPLAY) {
                 console.warn("Outcome duration timeout ignored: State changed.");
                 return;
             }
             // Outcome display time finished
             logCurrentTrialData();      // Log data for the completed trial
             checkAndHandleRatings();    // Check if ratings are due, then proceed

        }, CONFIG.OUTCOME_DURATION * 1000);
        // --- End Spin Complete Callback ---
    });
    // --- End Spin Trigger ---
}
// --- End Handle Choice ---


// --- Probabilities and Ratings (Keep Original Logic) ---
function checkAndApplyProbabilitySwitch(trialNumToCheckBefore) {
    let switched = false;
    if (currentPhase !== 'PRACTICE' && sessionInfo.probSwitchTrials.includes(trialNumToCheckBefore - 1)) {
        highProbMachine = (highProbMachine === 'left') ? 'right' : 'left';
        updateMachineProbabilities();
        switched = true;
        console.log(`Probabilities switched before trial ${trialNumToCheckBefore}. High prob is now: ${highProbMachine}`);
    }
    return switched;
}

function updateMachineProbabilities() {
    machines.left.prob = (highProbMachine === 'left') ? CONFIG.HIGH_PROB : CONFIG.LOW_PROB;
    machines.right.prob = (highProbMachine === 'right') ? CONFIG.HIGH_PROB : CONFIG.LOW_PROB;
}

function checkAndHandleRatings() {
    if (currentPhase === 'PRACTICE') {
        proceedToNextTrial(); // No ratings in practice
        return;
    }
    ratingQueue = [];
    const trialNum = globalTrial; // Check against the trial that just finished
    if (sessionInfo.ratingPromptTrials.craving.includes(trialNum)) ratingQueue.push('CRAVING');
    if (sessionInfo.ratingPromptTrials.mood.includes(trialNum)) ratingQueue.push('MOOD');

    if (ratingQueue.length > 0) {
        console.log(`Rating(s) due after trial ${trialNum}: ${ratingQueue.join(', ')}`);
        promptNextRating(); // Start the rating process (shows UI overlay)
    } else {
        proceedToNextTrial(); // No ratings due, move on
    }
}

function promptNextRating() {
    if (ratingQueue.length === 0) {
        proceedToNextTrial(); // All ratings for this point done
        return;
    }
    const ratingType = ratingQueue.shift();
    let promptText = (ratingType === 'CRAVING')
        ? `How strong is your craving for ${sessionInfo.selectedCueKey} right now?`
        : "How is your mood right now?";

    // UI function shows rating screen, sets state, and takes callback
    UI.showRatingScreen(ratingType, promptText, handleRatingSubmission);
}

function handleRatingSubmission(type, value) {
    console.log(`Rating submitted: ${type}, Value: ${value}`);
    const ratingData = {
        player_id: sessionInfo.playerId,
        trial_number_before_rating: globalTrial,
        rating_type: type,
        rating_value: value,
    };
    API.logRatingData(ratingData).catch(err => console.error("Error logging rating:", err)); // Log async
    promptNextRating(); // Check if another rating is queued
}
// --- End Probabilities and Ratings ---


// --- Proceed to Next Trial (Keep Original Logic) ---
function proceedToNextTrial() {
    console.log(">>> proceedToNextTrial called.");

    if (globalTrial >= CONFIG.TOTAL_TRIALS) {
        console.log("Game total trials reached, ending game.");
        endGame();
        return;
    }

    let phaseEnded = false;
    let currentPhaseTrialLimit = 0;
    switch(currentPhase) {
        case 'PRACTICE': currentPhaseTrialLimit = CONFIG.PRACTICE_TRIALS; break;
        case 'ADDICTIVE_CUE': currentPhaseTrialLimit = CONFIG.ADDICTIVE_CUE_TRIALS; break;
        case 'MONETARY': currentPhaseTrialLimit = CONFIG.MONETARY_TRIALS; break;
    }
    // Only end phase if limit > 0 to handle debug scenarios with 0 trials
    phaseEnded = (phaseTrial >= currentPhaseTrialLimit && currentPhaseTrialLimit > 0);

    if(phaseEnded) {
        console.log(`Phase ${currentPhase} ended after phase trial ${phaseTrial}.`);
        const nextPhaseIndex = currentPhaseIndex + 1;
        if (nextPhaseIndex < sessionInfo.phaseOrder.length) {
            const nextPhaseKey = sessionInfo.phaseOrder[nextPhaseIndex];
            console.log(`Proceeding to next phase: ${nextPhaseKey}`);
            startPhase(nextPhaseKey); // Shows phase intro screen
        } else {
            console.log("All task phases completed, ending game.");
            endGame();
        }
    } else {
        // Continue within the same phase
        setCurrentState(GameState.READY_FOR_TRIAL);
        // Use timeout to allow state updates/rendering before starting next trial logic
        setTimeout(startTrial, 50);
    }
}
// --- End Proceed ---


// --- Data Logging (Keep Original Logic) ---
function logCurrentTrialData() {
    if (!sessionInfo.playerId) {
         console.error("Cannot log trial data: Player ID is missing.");
         // Potentially store locally or queue? For now, just skip.
         return;
    }
    if (!currentTrialData.choice) {
         console.warn(`Log trial ${globalTrial}: choice missing.`);
         // Set a default if needed by backend schema, e.g., 'NO_RESPONSE'
         currentTrialData.choice = 'NO_RESPONSE';
    }
     const trialPayload = {
        player_id: sessionInfo.playerId,
        trial_number_global: globalTrial,
        trial_number_phase: phaseTrial,
        phase: currentPhase,
        is_practice: currentPhase === 'PRACTICE',
        winning_cue_type: currentTrialData.winning_cue_type || 'N/A', // From handleChoice
        left_machine_prob: currentTrialData.left_machine_prob,
        right_machine_prob: currentTrialData.right_machine_prob,
        probability_switched_this_trial: currentTrialData.probability_switched_this_trial || false,
        choice: currentTrialData.choice,
        response_time_ms: currentTrialData.response_time_ms,
        outcome: currentTrialData.outcome || 'N/A',
        // outcome_image: currentTrialData.outcome_image || 'N/A' // May not be needed if backend doesn't use it
    };
    API.logTrialData(trialPayload).catch(error => {
         console.error(`Failed to log trial ${globalTrial} data:`, error);
         // Consider retry or local storage strategy for critical data
    });
}
// --- End Data Logging ---


// --- Game Control (Keep Original Logic) ---
export function pauseGame() {
    const currentState = getCurrentState();
    // Prevent pausing in non-interactive/critical states
    const nonPausableStates = [
        GameState.LOADING, GameState.ERROR, GameState.ACCESS_DENIED,
        GameState.PLAYER_ID_INPUT, GameState.CUE_SELECTION, GameState.ENDED,
        GameState.RATING_CRAVING, GameState.RATING_MOOD, GameState.PHASE_INTRO,
        GameState.INSTRUCTIONS
    ];
    if (isPaused || nonPausableStates.includes(currentState)) {
        console.log(`Pause ignored, already paused or in non-pausable state (${currentState})`);
        return;
    }

    isPaused = true;
    pauseStateCache = currentState;
    setCurrentState(GameState.PAUSED);
    Audio.stopSound('rolling'); // Stop sounds if paused mid-spin
    UI.togglePauseOverlay(true); // Show pause screen
    console.log("Game Paused.");
}

export function resumeGame() {
     if (!isPaused || getCurrentState() !== GameState.PAUSED) {
         console.log("Resume called but game was not paused or not in PAUSED state.");
         return;
     }
     isPaused = false;
     const restoredState = pauseStateCache;
     pauseStateCache = null;
     console.log(`Attempting to resume game. State before pause was: ${restoredState}`);
     UI.togglePauseOverlay(false); // Hide pause screen

    // Restore appropriate state or action based on where pause occurred
    switch(restoredState) {
        case GameState.ANIMATING:
        case GameState.OUTCOME_DISPLAY:
            // The spin/outcome timeout callbacks check state, flow should resume via them.
            // If callbacks were missed, check ratings explicitly.
            console.log("Resuming after animation/outcome. Checking ratings/next trial logic.");
            checkAndHandleRatings(); // Check if ratings needed or proceed
            break;
        case GameState.WAITING_FOR_CHOICE:
            console.log("Resuming to WAITING_FOR_CHOICE.");
            setCurrentState(GameState.WAITING_FOR_CHOICE);
            choiceStartTime = performance.now(); // Reset RT timer
            break;
        case GameState.FIXATION:
             // Easiest might be to restart the trial from fixation start
             console.log("Resuming during fixation. Restarting current trial.");
             globalTrial--; phaseTrial--; // Decrement counters as startTrial will increment
             setCurrentState(GameState.READY_FOR_TRIAL); // Go to ready state first
             setTimeout(startTrial, 50); // Start trial again
             break;
        case GameState.READY_FOR_TRIAL:
             // If paused just before trial start, simply start it
             console.log("Resuming from READY_FOR_TRIAL.");
             setCurrentState(GameState.READY_FOR_TRIAL); // Ensure state is correct
             setTimeout(startTrial, 50);
             break;
        default:
             // For other potential states, just restore the state
             console.log(`Resuming to state: ${restoredState}`);
             setCurrentState(restoredState);
    }
}

async function endGame() {
    console.log("--- Game Ended ---");
    setCurrentState(GameState.ENDED);
    removeInputListeners(); // Disable game controls
    try {
        if(sessionInfo.playerId && sessionInfo.sessionId) { // Check sessionId too?
             console.log("Attempting to mark session as complete on backend...");
             // Backend API might need sessionId instead of/as well as playerId
             await API.endSession(sessionInfo.playerId); // Assuming API takes playerId
             console.log("Session marked as complete on backend.");
        } else {
             console.warn("Cannot mark session complete: Player ID or Session ID is missing.");
        }
    }
    catch (error) { console.error("Failed to mark session as complete on backend:", error); }

    UI.showEndScreen(totalWins); // Show the end screen UI
    Audio.playSound('win'); // Play a final sound (optional)
}
// --- End Game Control ---


// --- Debug Go To Trial (Keep Original Logic) ---
export function goToTrial(targetTrial) {
    if (!CONFIG.DEBUG_MODE) { console.warn("goToTrial ignored: not debug mode."); return; }
    if (isPaused) { resumeGame(); } // Ensure unpaused first

    targetTrial = parseInt(targetTrial, 10);
    if (isNaN(targetTrial) || targetTrial < 1 || targetTrial > CONFIG.TOTAL_TRIALS) {
        alert(`Invalid trial number. Must be 1-${CONFIG.TOTAL_TRIALS}.`); return;
    }
    console.log(`--- DEBUG JUMP to Trial ${targetTrial} ---`);

    // --- Logic for determining phase, phase trial, updating game state vars ---
    let trialCountAccumulator = 0; let newPhase = null; let newPhaseIndex = -1; let newPhaseTrial = 0;
    trialCountAccumulator += CONFIG.PRACTICE_TRIALS;
    if (targetTrial <= trialCountAccumulator) { newPhase = 'PRACTICE'; newPhaseIndex = -1; newPhaseTrial = targetTrial; }
    else {
        const phase1Key = sessionInfo.phaseOrder[0]; const phase1Trials = (phase1Key === 'ADDICTIVE_CUE') ? CONFIG.ADDICTIVE_CUE_TRIALS : CONFIG.MONETARY_TRIALS;
        trialCountAccumulator += phase1Trials;
        if (targetTrial <= trialCountAccumulator) { newPhase = phase1Key; newPhaseIndex = 0; newPhaseTrial = targetTrial - CONFIG.PRACTICE_TRIALS; }
        else { const phase2Key = sessionInfo.phaseOrder[1]; newPhase = phase2Key; newPhaseIndex = 1; newPhaseTrial = targetTrial - CONFIG.PRACTICE_TRIALS - phase1Trials; }
    }
    console.log(`Calculated Phase: ${newPhase}, Phase Trial: ${newPhaseTrial}`);
    globalTrial = targetTrial - 1;
    phaseTrial = newPhaseTrial - 1;
    currentPhase = newPhase;
    currentPhaseIndex = newPhaseIndex;
    // --- End Phase/Trial Calculation ---


    // --- Logic for recalculating probabilities ---
    highProbMachine = Math.random() < 0.5 ? 'left' : 'right'; // Re-randomize start
    updateMachineProbabilities();
    console.log(`Debug Jump: Initial high prob: ${highProbMachine}`);
    for (let i = CONFIG.PRACTICE_TRIALS; i < targetTrial - 1; i++) {
         if (sessionInfo.probSwitchTrials.includes(i)) {
             highProbMachine = (highProbMachine === 'left') ? 'right' : 'left';
             console.log(`Debug Jump: Simulating switch after trial ${i}. High prob: ${highProbMachine}`);
         }
    }
    updateMachineProbabilities();
    console.log(`Debug Jump: Probabilities for trial ${targetTrial}: Left=${machines.left.prob}, Right=${machines.right.prob}`);
    // --- End Probability Recalculation ---


    // Reset visuals using new method, update UI, clear ratings
    const machineInstances = getMachines();
    if (machineInstances.left) machineInstances.left.resetVisuals();
    if (machineInstances.right) machineInstances.right.resetVisuals();
    UI.updateHUD(totalWins, targetTrial, CONFIG.TOTAL_TRIALS); // Update HUD immediately
    UI.hideAllOverlays(); // Ensure no UI overlays are showing
    ratingQueue = []; // Cancel any pending ratings

    // Set state and start the target trial
    setCurrentState(GameState.READY_FOR_TRIAL);
    setTimeout(startTrial, 50); // Start after short delay
}
// --- End Debug ---