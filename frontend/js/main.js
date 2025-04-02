import * as THREE from 'https://esm.sh/three@0.155.0';
import { GameState, getCurrentState, setCurrentState, addStateChangeListener } from './state.js';
import { CONFIG } from './config.js';
import * as UI from './ui.js';
import * as Game from './gameLogic.js';
import * as Input from './input.js';
import * as Audio from './audio.js';
import { SlotMachine } from './machine.js'; // Import the new machine class

// --- Module Scope Variables ---
let scene, camera, renderer, clock;
let leftMachine, rightMachine;
let baseTex, gradTex, fixationTexture; // Shared textures
let reelTextures = { // Store different reel textures
    default: null,
    cue: null,
    coin: null
};
let fixationSprite;
let loadingManager;
let providedPlayerId = null;
// --- End Module Scope Variables ---

/** Parse URL parameters */
function getUrlParams() {
    return new URLSearchParams(window.location.search);
}

/** Apply debug overrides from URL params */
function applyDebugOverrides(urlParams) {
    console.log("Checking for debug overrides...");
    let overridden = false;

    const debugPractice = parseInt(urlParams.get('debugPractice'), 10);
    const debugCue = parseInt(urlParams.get('debugCue'), 10);
    const debugMonetary = parseInt(urlParams.get('debugMonetary'), 10);

    if (!isNaN(debugPractice) && debugPractice >= 0) {
        console.log(`DEBUG OVERRIDE: Practice Trials = ${debugPractice}`);
        CONFIG.PRACTICE_TRIALS = debugPractice;
        overridden = true;
    }
     if (!isNaN(debugCue) && debugCue > 0) { // Task phases need at least 1 trial
        console.log(`DEBUG OVERRIDE: Addictive Cue Trials = ${debugCue}`);
        CONFIG.ADDICTIVE_CUE_TRIALS = debugCue;
        overridden = true;
    }
      if (!isNaN(debugMonetary) && debugMonetary > 0) {
        console.log(`DEBUG OVERRIDE: Monetary Trials = ${debugMonetary}`);
        CONFIG.MONETARY_TRIALS = debugMonetary;
        overridden = true;
    }

    if (overridden) {
        CONFIG.TOTAL_TRIALS = CONFIG.PRACTICE_TRIALS + CONFIG.ADDICTIVE_CUE_TRIALS + CONFIG.MONETARY_TRIALS;
        console.log(`DEBUG OVERRIDE: New Total Trials = ${CONFIG.TOTAL_TRIALS}`);
    }
}

/** Initialize the entire application */
function initializeApp() {
    console.log("Initializing Application...");
    setCurrentState(GameState.LOADING);
    // Initialize UI elements first to show loading/denial messages
    UI.initUI();

    // --- Security Check, Debug Overrides ---
    const urlParams = getUrlParams();
    providedPlayerId = urlParams.get('playerId');
    CONFIG.DEBUG_MODE = urlParams.get('debug') === 'true'; // Set global flag
    const securityKey = urlParams.get('key');

    if (!securityKey || securityKey !== CONFIG.REQUIRED_SECURITY_KEY) {
         console.error("Access Denied: Invalid or missing security key.");
         setCurrentState(GameState.ACCESS_DENIED);
         UI.showOverlay('access-denied-screen'); // Show denial message
         hideLoadingOverlay(); // Hide 'Loading...' overlay
         return; // Stop initialization
    }
    console.log("Security key validated.");
    if (CONFIG.DEBUG_MODE) {
        console.log("DEBUG MODE ACTIVE");
        applyDebugOverrides(urlParams);
    }
    // --- End Security/Debug ---


    // --- Three.js Setup ---
    const canvas = document.getElementById('slot-canvas'); // Use new canvas ID
    if (!canvas) {
        console.error("Canvas element #slot-canvas not found!");
        handleLoadingError("Initialization Error");
        return;
    }
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        scene = new THREE.Scene();
        // scene.background = null; // Use CSS background #111 via alpha:true
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1; // Position camera to view scene
        clock = new THREE.Clock();
    } catch (error) {
        console.error("Three.js initialization failed:", error);
        handleLoadingError("Graphics Initialization Error");
        return;
    }
    // --- End Three.js Setup ---


    // --- Asset Loading ---
    loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const assetsPath = CONFIG.ASSETS.IMAGES;

    // Load textures needed for the machines and fixation
    baseTex = textureLoader.load(`${assetsPath}${CONFIG.BASE_TEXTURE_FILE}`);
    gradTex = textureLoader.load(`${assetsPath}${CONFIG.GRADIENT_TEXTURE_FILE}`);
    fixationTexture = textureLoader.load(`${assetsPath}${CONFIG.FIXATION_IMAGE_FILE}`);

    // Load the different reel textures
    reelTextures.default = textureLoader.load(`${assetsPath}${CONFIG.REEL_TEXTURE_DEFAULT_FILE}`);
    reelTextures.cue = textureLoader.load(`${assetsPath}${CONFIG.REEL_TEXTURE_CUE_FILE}`);
    reelTextures.coin = textureLoader.load(`${assetsPath}${CONFIG.REEL_TEXTURE_COIN_FILE}`);

    // Check textures are assigned after loading
    loadingManager.onLoad = handleLoadingComplete;
    loadingManager.onError = handleLoadingError; // Use dedicated error handler
    // --- End Asset Loading ---

    // --- Load Sounds ---
    // Audio loads in parallel. Ensure context is resumed on first interaction.
    Audio.loadSounds(() => {
        console.log("Audio loading finished.");
        // Optionally check for errors here if loadSounds provides status
    });
    // --- End Sounds ---

    // --- Resize Listener ---
    window.addEventListener('resize', layoutMachines, false);
    // --- End Resize Listener ---

    // --- Start Render Loop ---
    animate();
    // --- End Render Loop ---
}

/** Hides the initial loading overlay */
function hideLoadingOverlay() {
     const loadingOverlay = document.getElementById('loading');
     if (loadingOverlay) loadingOverlay.style.display = 'none';
}

/** Handles texture loading errors */
function handleLoadingError(url) {
    console.error(`Error loading asset: ${url || 'Unknown error'}`);
    const loadingOverlay = document.getElementById('loading');
    if (loadingOverlay) {
        loadingOverlay.textContent = 'Error loading assets. Please refresh.';
        loadingOverlay.style.display = 'flex'; // Ensure it's visible
    }
     // Show general error overlay?
    // UI.showOverlay('error-screen'); // Assuming an error overlay exists
    setCurrentState(GameState.ERROR);
}


/** Function called when all assets managed by loadingManager are loaded */
function handleLoadingComplete() {
    console.log(">>> All textures loaded via LoadingManager.");
    hideLoadingOverlay();

    // --- !! Texture Verification !! ---
    let texturesValid = true;
    for (const key in reelTextures) {
        const texture = reelTextures[key];
        if (!texture || !(texture instanceof THREE.Texture) || typeof texture.clone !== 'function') {
            console.error(`CRITICAL: Loaded reel texture '${key}' is invalid!`, texture);
            texturesValid = false;
        } else {
            console.log(`Texture '${key}' verified successfully.`);
        }
    }
    // Specifically check the default texture needed for initialization
    const initialTexture = reelTextures.default;
    if (!initialTexture || !(initialTexture instanceof THREE.Texture) || typeof initialTexture.clone !== 'function') {
         console.error("CRITICAL: Default reel texture (reelTextures.default) is invalid!");
         texturesValid = false;
    }

    if (!texturesValid) {
        handleLoadingError("One or more essential textures failed to load correctly.");
        return; // Stop initialization
    }
    // --- End Texture Verification ---


    // --- Create Machine Instances ---
    try {
        // Now we are more confident initialTexture is valid
        leftMachine = new SlotMachine(baseTex, initialTexture, gradTex, scene);
        rightMachine = new SlotMachine(baseTex, initialTexture, gradTex, scene);
    } catch (error) {
        console.error("Error creating SlotMachine instances:", error);
        handleLoadingError("Machine Creation Error");
        return;
    }
    // --- End Machine Instances ---

    // --- Create Fixation Sprite ---
    try {
        if (!fixationTexture) throw new Error("Fixation texture not loaded!");
        const fixationMaterial = new THREE.SpriteMaterial({ map: fixationTexture });
        fixationSprite = new THREE.Sprite(fixationMaterial);
        const fixationScale = 0.15; // Adjust size as needed
        fixationSprite.scale.set(fixationScale, fixationScale, 1);
        fixationSprite.position.set(0, 0, 0.5); // Position in center, slightly in front
        fixationSprite.visible = false; // Start hidden
        scene.add(fixationSprite);
    } catch (error) {
        console.error("Error creating fixation sprite:", error);
        handleLoadingError("Fixation Sprite Error");
        return;
    }
    // --- End Fixation Sprite ---

    // --- Perform Initial Layout ---
    layoutMachines();
    // --------------------------

    // --- Initialize Game Systems ---
    // Ensure audio context can be resumed by user interaction
    Audio.ensureAudioContext();
    Game.initGame(); // Initialize game logic state
    Input.initInputListeners(); // Setup keyboard listeners
    addStateChangeListener(handleStateChange); // Add listener for game state changes
    // --- End Game Systems ---

    // --- Setup Player ID and Start Game Flow ---
    if (providedPlayerId) {
         const playerIdInput = document.getElementById('player-id-input');
         if (playerIdInput) {
             playerIdInput.value = providedPlayerId; // Pre-fill from URL
             console.log(`Pre-filled Player ID: ${providedPlayerId}`);
         }
    }
    // Move to the first interactive state
    setCurrentState(GameState.PLAYER_ID_INPUT);
    UI.showOverlay('player-id-screen');
    // --------------------------------------
}

/** Position and scale machines based on window size */
function layoutMachines() {
    if (!renderer || !camera || !leftMachine || !rightMachine) return; // Safety check

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    renderer.setSize(windowWidth, windowHeight);

    const aspect = windowWidth / windowHeight;

    // Adjust camera to match aspect ratio
    camera.left = -aspect;
    camera.right = aspect;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();

    // --- Calculate Scale & Spacing ---

    // Base size calculation: Let's aim for the machine height to be a fraction of the camera's ortho height.
    // The base machine mesh has a height of 2 (PlaneGeometry(2, 2)).
    // The camera's ortho height (top - bottom) is 1 - (-1) = 2.
    // So, a base scale of 0.4 makes the machine 0.4 * 2 = 0.8 units high in ortho view (80% of camera height).
    const machineVisualHeight = 2; // Based on PlaneGeometry(2, 2) for the base mesh
    const baseScale = 0.8 / machineVisualHeight; // Makes machine base height 80% of camera ortho height

    // Apply the master scale factor from config
    const finalScale = baseScale * CONFIG.MASTER_SCALE_FACTOR;

    // Calculate positioning based on spacing config and aspect ratio.
    // CONFIG.MACHINE_SPACING is distance between centers in ortho units (before aspect scaling).
    const xPos = (CONFIG.MACHINE_SPACING / 2) * aspect; // Scale horizontal spacing by aspect ratio

    // Apply scale and position
    leftMachine.group.scale.set(finalScale, finalScale, 1);
    rightMachine.group.scale.set(finalScale, finalScale, 1);

    // Set position based on calculated spacing from center
    leftMachine.group.position.set(-xPos, 0, 0);
    rightMachine.group.position.set(xPos, 0, 0);

    console.log(`Layout: Aspect=${aspect.toFixed(2)}, BaseScale=${baseScale.toFixed(2)}, MasterFactor=${CONFIG.MASTER_SCALE_FACTOR}, FinalScale=${finalScale.toFixed(2)}, XPos=${xPos.toFixed(2)}`);
}

/** Main Render Loop */
function animate() {
    // Use the function itself as the callback for requestAnimationFrame
    requestAnimationFrame(animate);

    const time = performance.now();
    // const delta = clock.getDelta(); // Delta time if needed for physics/complex animation

    // Update machine animations
    if (leftMachine) leftMachine.update(time);
    if (rightMachine) rightMachine.update(time);

    // Render the scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

/** React to game state changes - Controls visibility */
function handleStateChange(newState, oldState) {
    console.log(`State changed from ${oldState} to ${newState}`);

    // Show/hide fixation sprite
    if (fixationSprite) {
        fixationSprite.visible = (newState === GameState.FIXATION); // Correct: Fixation visible ONLY in FIXATION state
    }

    // Determine if machines should be visible based on the current game state
    const machinesAreVisible = !(
        newState === GameState.FIXATION ||         // <<< CORRECT: Hides machines during FIXATION
        newState === GameState.LOADING ||
        newState === GameState.ERROR ||
        newState === GameState.ACCESS_DENIED ||
        newState === GameState.PLAYER_ID_INPUT ||
        newState === GameState.CUE_SELECTION ||
        newState === GameState.INSTRUCTIONS ||
        newState === GameState.PHASE_INTRO ||
        newState === GameState.RATING_CRAVING ||
        newState === GameState.RATING_MOOD ||
        newState === GameState.ENDED
    );

    // Update visibility of machine groups
    if (leftMachine) leftMachine.group.visible = machinesAreVisible;
    if (rightMachine) rightMachine.group.visible = machinesAreVisible;
    console.log(`Machines visible: ${machinesAreVisible}`); // Add log for debugging visibility

     // Reset machines visually when entering WAITING state after animation/outcome/ratings/fixation
     if (newState === GameState.WAITING_FOR_CHOICE && (oldState === GameState.OUTCOME_DISPLAY || oldState === GameState.RATING_MOOD || oldState === GameState.RATING_CRAVING || oldState === GameState.READY_FOR_TRIAL || oldState === GameState.FIXATION) ) {
        console.log("Resetting machine visuals for WAITING_FOR_CHOICE state."); // Add log
        if (leftMachine) leftMachine.resetVisuals();
        if (rightMachine) rightMachine.resetVisuals();
     }


    // Handle debug button visibility (keep from original)
    if (newState === GameState.PAUSED && CONFIG.DEBUG_MODE) {
         const debugJumpBtn = document.getElementById('debug-jump-button');
         if (debugJumpBtn) debugJumpBtn.style.display = 'inline-block';
     } else if (oldState === GameState.PAUSED) {
         const debugJumpBtn = document.getElementById('debug-jump-button');
         if (debugJumpBtn) debugJumpBtn.style.display = 'none';
     }

    // Ensure audio context can be resumed on interaction states (keep from original)
     if (newState !== GameState.LOADING && newState !== GameState.ACCESS_DENIED) {
        Audio.ensureAudioContext();
    }
}

// --- Exports for GameLogic ---
// Allow gameLogic to get machine instances and textures
export function getMachines() {
    return { left: leftMachine, right: rightMachine };
}
export function getReelTextures() {
    // Provides access to the loaded reel textures object
    return reelTextures;
}
// --- End Exports ---


// --- Start the application ---
// Use DOMContentLoaded to ensure HTML is parsed before running script
document.addEventListener('DOMContentLoaded', initializeApp);