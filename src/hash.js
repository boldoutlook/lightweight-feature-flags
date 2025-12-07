
/**
 * Simple deterministic string hash -> integer in [0, max).
 *
 * Based loosely on a 32-bit FNV-like hash.
 *
 * @param {string} str
 * @param {number} max
 * @returns {number}
 */
export function hashStringToInt(str, max) {
  let hash = 2166136261 >>> 0; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0; // FNV prime
  }
  return hash % max;
}
