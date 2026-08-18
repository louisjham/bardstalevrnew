// Dice.js - Deterministic Dice & Range Utilities for The Bard's Tale VR
// Pure ES-module utilities for parsing dice notations, inclusive range rolls, and seeded PRNG.

/**
 * Converts a string seed into a 32-bit unsigned integer hash.
 * @param {string} str
 * @returns {number}
 */
function hashStringToUint32(str) {
  let hash = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

/**
 * Creates a deterministic, seeded pseudo-random number generator (PRNG) using the Mulberry32 algorithm.
 * Reusing the same seed produces the exact same sequence of values in [0, 1).
 *
 * @param {number|string} seed - Numeric or string seed value.
 * @returns {() => number} Deterministic RNG function returning floats in [0, 1).
 */
export function createSeededRng(seed) {
  let s = typeof seed === 'number' ? (seed >>> 0) : hashStringToUint32(String(seed));
  if (s === 0) s = 1;

  return function mulberry32() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Parses standard tabletop RPG dice notation string (e.g. "1d4", "4d4", "2d16+1", "3d4 + 3", "2d8 - 1").
 *
 * @param {string} notation - Dice notation string.
 * @returns {{ count: number, sides: number, modifier: number }}
 * @throws {Error} If the notation string is invalid.
 */
export function parseDiceNotation(notation) {
  if (typeof notation !== 'string' || notation.trim().length === 0) {
    throw new Error(`[Dice] Invalid dice notation: "${notation}". Expected format like "1d4", "2d8+1", or "4d4".`);
  }

  const trimmed = notation.trim();
  const match = trimmed.match(/^(\d+)\s*d\s*(\d+)(?:\s*([+-])\s*(\d+))?$/i);

  if (!match) {
    throw new Error(`[Dice] Invalid dice notation: "${notation}". Expected format like "1d4", "2d8+1", or "4d4".`);
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  let modifier = 0;

  if (match[3] && match[4]) {
    const sign = match[3] === '-' ? -1 : 1;
    modifier = sign * parseInt(match[4], 10);
  }

  if (count <= 0 || sides <= 0) {
    throw new Error(`[Dice] Dice count and sides must be positive integers. Received count=${count}, sides=${sides}.`);
  }

  return { count, sides, modifier };
}

/**
 * Rolls dice according to standard notation (e.g. "2d8+1", "1d4") using a supplied or default RNG.
 *
 * @param {string} notation - Dice notation string.
 * @param {() => number} [rng=Math.random] - RNG function returning numbers in [0, 1).
 * @returns {{ notation: string, rolls: number[], modifier: number, total: number }}
 */
export function rollDice(notation, rng = Math.random) {
  const { count, sides, modifier } = parseDiceNotation(notation);
  const rolls = [];
  let sum = 0;

  for (let i = 0; i < count; i++) {
    const roll = Math.floor(rng() * sides) + 1;
    rolls.push(roll);
    sum += roll;
  }

  const total = sum + modifier;

  return {
    notation,
    rolls,
    modifier,
    total
  };
}

/**
 * Rolls an integer value within a range inclusive of both endpoints [min, max].
 *
 * @param {{ min: number, max: number }} range - Object containing min and max numbers.
 * @param {() => number} [rng=Math.random] - RNG function returning numbers in [0, 1).
 * @returns {number} Rolled integer in [min, max] inclusive.
 * @throws {Error} If range is invalid or min > max.
 */
export function rollRangeInclusive(range, rng = Math.random) {
  if (!range || typeof range !== 'object') {
    throw new Error(`[Dice] rollRangeInclusive expected a range object { min, max }. Received: ${range}`);
  }

  const { min, max } = range;

  if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) {
    throw new Error(`[Dice] rollRangeInclusive range must contain numerical min and max. Received: min=${min}, max=${max}`);
  }

  if (min > max) {
    throw new Error(`[Dice] rollRangeInclusive min (${min}) cannot be greater than max (${max}).`);
  }

  if (min === max) {
    return min;
  }

  const span = max - min + 1;
  return min + Math.floor(rng() * span);
}
