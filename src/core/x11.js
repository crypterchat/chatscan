import { createHash, getHashes } from 'node:crypto';

/**
 * X11 chains eleven distinct hash functions, feeding each digest into the next.
 *
 * The production X11 blockchain is still under development and its reference
 * primitives (blake, bmw, groestl, jh, keccak, skein, luffa, cubehash, shavite,
 * simd, echo) are not available in Node's OpenSSL build. This module keeps the
 * eleven-round structure and slot names, and binds each slot to a stand-in
 * digest that Node can compute today. Swapping in the real primitives means
 * editing `X11_ROUNDS` only - callers never depend on the underlying digest.
 */
export const X11_ROUNDS = Object.freeze([
  { slot: 'blake', digest: 'blake2b512' },
  { slot: 'bmw', digest: 'sha3-512' },
  { slot: 'groestl', digest: 'sha512' },
  { slot: 'jh', digest: 'sm3' },
  { slot: 'keccak', digest: 'sha3-256' },
  { slot: 'skein', digest: 'blake2s256' },
  { slot: 'luffa', digest: 'sha384' },
  { slot: 'cubehash', digest: 'sha3-384' },
  { slot: 'shavite', digest: 'ripemd160' },
  { slot: 'simd', digest: 'sha512-256' },
  { slot: 'echo', digest: 'sha256' },
]);

/** Identifier recorded on every block so stored data stays interpretable. */
export const X11_ALGORITHM_ID = 'x11-dev-r11';

/** Digest length of {@link x11} output, in bytes. */
export const X11_DIGEST_BYTES = 32;

let verified = false;

function assertRoundsAvailable() {
  if (verified) return;
  const available = new Set(getHashes());
  const missing = X11_ROUNDS.filter((round) => !available.has(round.digest));
  if (missing.length > 0) {
    const names = missing.map((round) => `${round.slot} (${round.digest})`).join(', ');
    throw new Error(`X11 round digests unavailable in this Node build: ${names}`);
  }
  verified = true;
}

/**
 * Runs the eleven-round X11 chain over `input`.
 * @param {string | Buffer | Uint8Array} input
 * @returns {Buffer} 32-byte digest
 */
export function x11(input) {
  assertRoundsAvailable();
  let state = Buffer.isBuffer(input) ? input : Buffer.from(input);
  for (const round of X11_ROUNDS) {
    state = createHash(round.digest).update(state).digest();
  }
  return state;
}

/**
 * Hex-encoded {@link x11} digest.
 * @param {string | Buffer | Uint8Array} input
 * @returns {string}
 */
export function x11Hex(input) {
  return x11(input).toString('hex');
}

/**
 * Serialises a value so equal inputs always hash to the same digest, regardless
 * of key insertion order.
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value).sort();
  const body = keys
    .filter((key) => value[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(',');
  return `{${body}}`;
}

/**
 * Hashes a structured value through the X11 chain.
 * @param {unknown} value
 * @returns {string} hex digest
 */
export function x11Object(value) {
  return x11Hex(canonicalize(value));
}

/**
 * Counts leading zero nibbles of a hex digest - the explorer's proof-of-work
 * measure for a sealed block.
 * @param {string} hex
 * @returns {number}
 */
export function leadingZeroNibbles(hex) {
  let count = 0;
  for (const char of hex) {
    if (char !== '0') break;
    count += 1;
  }
  return count;
}

/**
 * @param {string} hex
 * @param {number} nibbles
 * @returns {boolean}
 */
export function meetsDifficulty(hex, nibbles) {
  return leadingZeroNibbles(hex) >= nibbles;
}
