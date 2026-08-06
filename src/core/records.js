import { badRequest } from '../util/errors.js';
import { x11Object } from './x11.js';

/**
 * Protocols the explorer indexes. `maxCiphertextBytes` is the per-protocol
 * ceiling enforced when a record is admitted to the mempool.
 */
export const PROTOCOLS = Object.freeze({
  C7: { id: 'C7', label: 'Protocol C7', maxCiphertextBytes: 4 * 1024 * 1024 },
  C7G: { id: 'C7G', label: 'Protocol C7 Group', maxCiphertextBytes: 8 * 1024 * 1024 },
  ETH: { id: 'ETH', label: 'ETH Protocol', maxCiphertextBytes: 128 * 1024 },
  X11: { id: 'X11', label: 'X11 Native', maxCiphertextBytes: 4 * 1024 * 1024 },
});

export const DEFAULT_PROTOCOL = 'C7';

export const RECORD_STATUS = Object.freeze({
  pending: 'pending',
  confirmed: 'confirmed',
  rejected: 'rejected',
});

/**
 * Fields a client may send. Everything else is refused, so plaintext can never
 * reach the index even by accident.
 */
export const ALLOWED_SUBMISSION_FIELDS = Object.freeze([
  'ciphertextHash',
  'size',
  'protocol',
  'channelHash',
  'nonce',
  'fee',
  'appVersion',
]);

/**
 * Field names that would carry message content. These are called out by name in
 * the error response so integrators immediately see what they did wrong.
 */
const CONTENT_FIELDS = Object.freeze([
  'body',
  'ciphertext',
  'content',
  'data',
  'message',
  'payload',
  'plaintext',
  'text',
  'attachment',
  'attachments',
  'subject',
  'preview',
]);

const HEX_64 = /^[0-9a-f]{64}$/;
const HEX_UP_TO_64 = /^[0-9a-f]{1,64}$/;
const APP_VERSION = /^[\w.+-]{1,32}$/;

/**
 * Canonical explorer reference for a message record: `{HASH}/{ID-number}`.
 * @param {string} hash
 * @param {number} id
 * @returns {string}
 */
export function formatRef(hash, id) {
  return `${hash}/${id}`;
}

/**
 * Parses a `{HASH}/{ID-number}` reference.
 * @param {string} ref
 * @returns {{ hash: string, id: number } | null}
 */
export function parseRef(ref) {
  if (typeof ref !== 'string') return null;
  const match = /^([0-9a-f]{64})\/(\d{1,15})$/.exec(ref.trim().toLowerCase());
  if (!match) return null;
  const id = Number.parseInt(match[2], 10);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return { hash: match[1], id };
}

/**
 * Validates and normalises a client submission.
 *
 * Only ciphertext *metadata* is accepted: a hash of the encrypted payload, its
 * byte length, and opaque routing hashes. Message content is never accepted,
 * stored, or served.
 *
 * @param {unknown} input
 * @param {{ maxCiphertextBytes: number }} limits
 * @returns {{ ciphertextHash: string, size: number, protocol: string, channelHash: string | null, nonce: string, fee: number, appVersion: string | null }}
 */
export function normalizeSubmission(input, limits) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('invalid_body', 'Request body must be a JSON object.');
  }

  const submission = /** @type {Record<string, unknown>} */ (input);
  const keys = Object.keys(submission);

  const contentField = keys.find((key) => CONTENT_FIELDS.includes(key.toLowerCase()));
  if (contentField) {
    throw badRequest(
      'content_rejected',
      `ChatScan indexes ciphertext metadata only. Remove "${contentField}" and send "ciphertextHash" plus "size" instead.`,
      { field: contentField, allowed: ALLOWED_SUBMISSION_FIELDS },
    );
  }

  const unknownField = keys.find((key) => !ALLOWED_SUBMISSION_FIELDS.includes(key));
  if (unknownField) {
    throw badRequest('unknown_field', `Unsupported field "${unknownField}".`, {
      field: unknownField,
      allowed: ALLOWED_SUBMISSION_FIELDS,
    });
  }

  const ciphertextHash = normalizeHash(submission.ciphertextHash, 'ciphertextHash', true);
  const channelHash = normalizeHash(submission.channelHash, 'channelHash', false);

  const size = submission.size;
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw badRequest('invalid_size', '"size" must be the ciphertext length in bytes (a positive integer).', {
      field: 'size',
    });
  }
  if (size > limits.maxCiphertextBytes) {
    throw badRequest(
      'invalid_size',
      `"size" exceeds the node ceiling of ${limits.maxCiphertextBytes} bytes.`,
      { field: 'size', maxCiphertextBytes: limits.maxCiphertextBytes },
    );
  }

  const protocol = submission.protocol === undefined ? DEFAULT_PROTOCOL : String(submission.protocol).toUpperCase();
  if (!Object.hasOwn(PROTOCOLS, protocol)) {
    throw badRequest('unknown_protocol', `Unsupported protocol "${protocol}".`, {
      field: 'protocol',
      supported: Object.keys(PROTOCOLS),
    });
  }

  let nonce = submission.nonce;
  if (nonce === undefined) {
    nonce = '';
  } else if (typeof nonce !== 'string' || !HEX_UP_TO_64.test(nonce.toLowerCase())) {
    throw badRequest('invalid_nonce', '"nonce" must be a lowercase hex string of up to 64 characters.', {
      field: 'nonce',
    });
  } else {
    nonce = nonce.toLowerCase();
  }

  let fee = submission.fee;
  if (fee === undefined) {
    fee = 0;
  } else if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) {
    throw badRequest('invalid_fee', '"fee" must be a non-negative number.', { field: 'fee' });
  }

  let appVersion = submission.appVersion;
  if (appVersion === undefined) {
    appVersion = null;
  } else if (typeof appVersion !== 'string' || !APP_VERSION.test(appVersion)) {
    throw badRequest('invalid_app_version', '"appVersion" must be up to 32 characters of [A-Za-z0-9._+-].', {
      field: 'appVersion',
    });
  }

  return { ciphertextHash, size, protocol, channelHash, nonce, fee, appVersion };
}

/**
 * @param {unknown} value
 * @param {string} field
 * @param {boolean} required
 * @returns {string | null}
 */
function normalizeHash(value, field, required) {
  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw badRequest('missing_field', `"${field}" is required.`, { field });
  }
  if (typeof value !== 'string' || !HEX_64.test(value.toLowerCase())) {
    throw badRequest('invalid_hash', `"${field}" must be a 64-character hex digest (SHA-256 or X11).`, { field });
  }
  return value.toLowerCase();
}

/**
 * Derives the immutable record that the chain stores for one encrypted message.
 * @param {object} args
 * @param {number} args.id monotonic ID-number
 * @param {ReturnType<typeof normalizeSubmission>} args.submission
 * @param {string} args.chainId
 * @param {number} args.receivedAt epoch ms
 * @param {string} [args.status]
 * @param {string | null} [args.rejectionReason]
 */
export function createRecord({ id, submission, chainId, receivedAt, status = RECORD_STATUS.pending, rejectionReason = null }) {
  const preimage = {
    chainId,
    id,
    ciphertextHash: submission.ciphertextHash,
    size: submission.size,
    protocol: submission.protocol,
    channelHash: submission.channelHash,
    nonce: submission.nonce,
    receivedAt,
  };
  const hash = x11Object(preimage);

  return {
    id,
    hash,
    ref: formatRef(hash, id),
    ciphertextHash: submission.ciphertextHash,
    size: submission.size,
    protocol: submission.protocol,
    channelHash: submission.channelHash,
    nonce: submission.nonce,
    fee: submission.fee,
    appVersion: submission.appVersion,
    status,
    rejectionReason,
    receivedAt,
    confirmedAt: null,
    blockHeight: null,
    blockHash: null,
    indexInBlock: null,
  };
}

/**
 * Public projection of a record. Exists so no field can leak into an API
 * response unless it is listed here.
 * @param {ReturnType<typeof createRecord>} record
 */
export function publicRecord(record) {
  return {
    ref: record.ref,
    hash: record.hash,
    id: record.id,
    ciphertextHash: record.ciphertextHash,
    size: record.size,
    protocol: record.protocol,
    protocolLabel: PROTOCOLS[record.protocol]?.label ?? record.protocol,
    channelHash: record.channelHash,
    fee: record.fee,
    appVersion: record.appVersion,
    status: record.status,
    rejectionReason: record.rejectionReason,
    receivedAt: new Date(record.receivedAt).toISOString(),
    confirmedAt: record.confirmedAt ? new Date(record.confirmedAt).toISOString() : null,
    blockHeight: record.blockHeight,
    blockHash: record.blockHash,
    indexInBlock: record.indexInBlock,
    encrypted: true,
    contentAvailable: false,
  };
}
