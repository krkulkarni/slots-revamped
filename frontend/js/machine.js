// frontend/js/machine.js

import * as THREE from 'https://esm.sh/three@0.155.0';
import { CONFIG } from './config.js';

export class SlotMachine {
    constructor(baseTexture, initialReelTexture, gradientTexture, scene) {
        this.group = new THREE.Group();
        this.group.visible = false;

        const base = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial({ map: baseTexture, transparent: true })
        );
        this.group.add(base);

        this.reelMat = new THREE.MeshBasicMaterial({ map: null, transparent: true });
        this.reel = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.REEL_SIZE.width, CONFIG.REEL_SIZE.height),
            this.reelMat
        );
        this.reel.position.set(0, CONFIG.REEL_SIZE.yOffset, 0.01);
        this.group.add(this.reel);

        const topGrad = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.REEL_SIZE.width, CONFIG.REEL_SIZE.gradientHeight),
            new THREE.MeshBasicMaterial({ map: gradientTexture, transparent: true, depthWrite: false })
        );
        topGrad.position.set(0, CONFIG.REEL_SIZE.yOffset + CONFIG.REEL_SIZE.height / 2 - CONFIG.REEL_SIZE.gradientHeight / 2, 0.02);
        this.group.add(topGrad);

        const bottomGrad = new THREE.Mesh(
            new THREE.PlaneGeometry(CONFIG.REEL_SIZE.width, CONFIG.REEL_SIZE.gradientHeight),
            new THREE.MeshBasicMaterial({ map: gradientTexture, transparent: true, depthWrite: false })
        );
        bottomGrad.position.set(0, CONFIG.REEL_SIZE.yOffset - CONFIG.REEL_SIZE.height / 2 + CONFIG.REEL_SIZE.gradientHeight / 2, 0.02);
        bottomGrad.rotation.z = Math.PI;
        this.group.add(bottomGrad);

        scene.add(this.group);

        this.phase = 'idle';
        this.currentIndex = CONFIG.REEL_TEXTURE_START_INDEX;
        this.targetIndex = CONFIG.REEL_TEXTURE_START_INDEX;
        this.startTime = null;
        this.onComplete = null;
        this.currentTextureSource = null; // Will be set by setTexture

        // --- Constructor Validation ---
        console.log("SlotMachine Constructor: Received initialReelTexture:", initialReelTexture);
        if (initialReelTexture) {
            if (initialReelTexture instanceof THREE.Texture && typeof initialReelTexture.clone === 'function') {
                console.log("  Constructor: initialReelTexture looks valid. Calling setTexture.");
                try {
                    this.setTexture(initialReelTexture, true); // Force clone on initial set
                } catch (e) {
                     console.error("  Constructor: ERROR occurred during initial setTexture call:", e);
                     // Handle error state if needed
                }
            } else {
                console.error("  CRITICAL Constructor: initialReelTexture received is INVALID!", initialReelTexture);
                // Consider throwing an error or setting a default/error texture
                // throw new Error("Invalid initial texture provided to SlotMachine constructor.");
            }
        } else {
            console.warn("  Constructor: No initialReelTexture provided.");
            // The machine will have no reel texture until setTexture is called later
        }
        // --- End Constructor Validation ---
    }


    setTexture(texture, forceClone = false) {
        // --- Top-Level DEBUGGING ---
        console.log(`---> setTexture called. forceClone=${forceClone}. Received texture object:`, texture);
        if (texture) {
            console.log(`     instanceof THREE.Texture: ${texture instanceof THREE.Texture}`);
            console.log(`     typeof .clone: ${typeof texture?.clone}`);
            console.log(`     Source UUID: ${texture?.source?.uuid}`);
            console.log(`     Image:`, texture.image);
        } else {
            console.error("---> setTexture called with null or undefined texture! Aborting.");
            return;
        }
        // --- END Top-Level DEBUGGING ---

        if (this.currentTextureSource !== texture || forceClone) {
            console.log(`    setTexture: Cloning needed (Source changed: ${this.currentTextureSource !== texture}, Force: ${forceClone})`);
            this.currentTextureSource = texture;

            // --- Pre-Clone DEBUGGING ---
            if (!(texture instanceof THREE.Texture)) {
                console.error("    >>> FATAL ERROR in setTexture: Object is NOT a THREE.Texture right before clone!", texture);
                return; // Prevent crash
            }
            if (typeof texture.clone !== 'function') {
                console.error("    >>> FATAL ERROR in setTexture: Object is MISSING .clone function right before clone!", texture);
                return; // Prevent crash
            }
            // --- END Pre-Clone DEBUGGING ---

            let textureClone;
            try {
                 console.log(`    setTexture: Attempting texture.clone() on:`, texture); // Log object being cloned
                 textureClone = texture.clone(); // <<< The failing line (around 83)
                 console.log(`    setTexture: Cloning successful. Cloned object:`, textureClone);
            } catch (error) {
                 console.error(`    >>> FATAL ERROR during texture.clone():`, error);
                 console.error(`        Object being cloned was:`, texture); // Log again on error
                 return; // Prevent further errors
            }


            textureClone.needsUpdate = true;
            textureClone.wrapS = THREE.RepeatWrapping;
            textureClone.wrapT = THREE.RepeatWrapping;
            textureClone.repeat.set(1, 1 / CONFIG.REEL_SYMBOL_COUNT);
            textureClone.offset.y = this.indexToOffset(CONFIG.REEL_TEXTURE_START_INDEX);

            this.reelMat.map = textureClone;
            this.reelMat.needsUpdate = true;
            console.log(`    setTexture: Assigned CLONED texture to material map.`);

        } else {
             console.log(`    setTexture: Source texture same and no forceClone. Resetting offset on existing map.`);
             if (this.reelMat.map) {
                this.reelMat.map.offset.y = this.indexToOffset(CONFIG.REEL_TEXTURE_START_INDEX);
             }
        }

        this.currentIndex = CONFIG.REEL_TEXTURE_START_INDEX;
        this.phase = 'idle';
         console.log(`<--- setTexture finished.`);
    }


    indexToOffset(index) {
        const wrappedIndex = Math.round(index) % CONFIG.REEL_SYMBOL_COUNT;
        return (CONFIG.REEL_SYMBOL_COUNT - 1 - wrappedIndex) / CONFIG.REEL_SYMBOL_COUNT;
    }


    spin(targetLogicalIndex, onCompleteCallback) {
        if (this.phase !== 'idle') { /* ... */ return; }
        if (targetLogicalIndex < 0 || targetLogicalIndex >= CONFIG.REEL_SYMBOL_COUNT) { /* ... */ }
        console.log(`---> Spin called. Target: ${targetLogicalIndex}`); // DEBUG Spin start

        // Spin logic... (no changes needed here for this bug)
        const fullSpins = 7;
        const wrappedTarget = targetLogicalIndex % CONFIG.REEL_SYMBOL_COUNT;
        const wrappedCurrent = CONFIG.REEL_TEXTURE_START_INDEX % CONFIG.REEL_SYMBOL_COUNT;
        let delta = wrappedTarget - wrappedCurrent;
        if (delta <= 0 && wrappedTarget !== wrappedCurrent) { delta += CONFIG.REEL_SYMBOL_COUNT; }
        const logicalCurrentIndex = this.currentIndex;
        let logicalDelta = targetLogicalIndex - logicalCurrentIndex;
         if (logicalDelta <= 0 && targetLogicalIndex !== logicalCurrentIndex) { logicalDelta += CONFIG.REEL_SYMBOL_COUNT; }
        this.targetIndex = logicalCurrentIndex + fullSpins * CONFIG.REEL_SYMBOL_COUNT + logicalDelta;
        this.spinStartIndex = logicalCurrentIndex;
        this.onComplete = onCompleteCallback;
        this.phase = 'spinning';
        this.startTime = performance.now();
        console.log(`     Animating from logical ${this.spinStartIndex} to absolute ${this.targetIndex}`);
    }


    update(time) {
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

        if (this.phase === 'spinning') {
            const elapsedTime = time - this.startTime;
            const t = Math.min(elapsedTime / CONFIG.SPIN_DURATION, 1);
            const easedProgress = easeOutCubic(t);

            // Calculate the continuous visual index based on eased progress
            const visualIndex = this.spinStartIndex + (this.targetIndex - this.spinStartIndex) * easedProgress;

            if (this.reelMat.map) {
                // --- Calculate SMOOTH Texture Offset ---
                // Directly map the continuous visualIndex to the texture's V coordinate (Y offset)
                // V coordinate goes 0 (bottom) to 1 (top).
                // Logical index 0 (START) should map to offset (Count-1)/Count
                // Logical index 1 (WIN)   should map to offset (Count-2)/Count
                // Logical index 2 (LOSS)  should map to offset (Count-3)/Count = 0
                // Formula: rawOffset = (Count - 1 - visualIndex) / Count
                const rawOffset = (CONFIG.REEL_SYMBOL_COUNT - 1 - visualIndex) / CONFIG.REEL_SYMBOL_COUNT;

                // Texture offsets wrap. Use the fractional part to handle wrapping smoothly.
                // offset = rawOffset - Math.floor(rawOffset) ensures value is always [0, 1)
                const finalOffset = rawOffset - Math.floor(rawOffset);

                // Apply the calculated smooth offset
                this.reelMat.map.offset.y = finalOffset;
                // --- END Smooth Offset Calculation ---
            }

            // Check if animation is complete
            if (t >= 1) {
                this.currentIndex = this.targetIndex % CONFIG.REEL_SYMBOL_COUNT;
                // Set the final, exact offset based on the discrete target index
                if (this.reelMat.map) {
                    this.reelMat.map.offset.y = this.indexToOffset(this.currentIndex); // Use indexToOffset *only* for final landing
                }
                this.phase = 'idle';
                this.startTime = null;
                console.log(`Machine: Spin landed on index ${this.currentIndex}`);

                if (this.onComplete) {
                    this.onComplete();
                    this.onComplete = null;
                }
            }
        }
    }


    resetVisuals() {
        console.log("Machine: Resetting visuals to START");

        // Check if we have a valid source texture stored
        if (this.currentTextureSource &&
            this.currentTextureSource instanceof THREE.Texture &&
            typeof this.currentTextureSource.clone === 'function')
        {
            console.log("     Source texture appears valid. Calling setTexture(source, true).");
             try {
                 this.setTexture(this.currentTextureSource, true);
             } catch (error) {
                  console.error("     ERROR during setTexture call from resetVisuals:", error);
             }

        } else {
            console.warn("     Resetting visuals with invalid or missing source texture. Attempting fallback.");
            if (this.reelMat.map && this.reelMat.map instanceof THREE.Texture) {
                 console.log("     Fallback - Resetting offset on existing reelMat.map.");
                 this.reelMat.map.offset.y = this.indexToOffset(CONFIG.REEL_TEXTURE_START_INDEX);
            } else {
                console.error("     Cannot reset visuals - No valid texture source AND no valid reelMat.map found.");
            }
            this.currentIndex = CONFIG.REEL_TEXTURE_START_INDEX;
            this.phase = 'idle';
            this.startTime = null;
            this.onComplete = null;
        }

        // this.group.visible = true; // <<< DELETE THIS LINE <<<
        console.log(`<--- resetVisuals finished.`); // Keep this log if helpful
    }
}