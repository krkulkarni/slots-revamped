/**
 * Delays execution for a specified duration.
 * @param {number} ms - The delay duration in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Linear interpolation between two values.
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Interpolation factor (0 to 1).
 * @returns {number} The interpolated value.
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value - The value to clamp.
 * @param {number} min - The minimum allowed value.
 * @param {number} max - The maximum allowed value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * Returns a random element from an array.
 * @param {Array<T>} arr - The array to choose from.
 * @returns {T | undefined} A random element, or undefined if the array is empty.
 */
export function getRandomElement(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffles an array in place using the Fisher-Yates (Durstenfeld) algorithm.
 * @param {Array<any>} array - The array to shuffle.
 * @returns {Array<any>} The shuffled array.
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}