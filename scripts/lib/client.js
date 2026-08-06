import { createCipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Minimal stand-in for the CrypterChat client side of the flow.
 *
 * The plaintext is encrypted locally and only the ciphertext digest and its
 * length are ever handed to ChatScan. Neither the plaintext nor the ciphertext
 * leaves this process.
 *
 * @param {string} plaintext
 * @returns {{ ciphertextHash: string, size: number }}
 */
export function sealMessage(plaintext) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const envelope = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);

  return {
    ciphertextHash: createHash('sha256').update(envelope).digest('hex'),
    size: envelope.length,
  };
}

/**
 * Derives an opaque channel identifier from a conversation name.
 * @param {string} conversation
 */
export function channelHash(conversation) {
  return createHash('sha256').update(`chatscan:channel:${conversation}`).digest('hex');
}

/**
 * Posts one message record to a ChatScan node.
 * @param {object} args
 * @param {string} args.baseUrl
 * @param {object} args.record
 * @param {string} [args.ingestKey]
 */
export async function submitRecord({ baseUrl, record, ingestKey }) {
  const response = await fetch(new URL('/api/v1/records', baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(ingestKey ? { authorization: `Bearer ${ingestKey}` } : {}),
    },
    body: JSON.stringify(record),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`ChatScan rejected the record: ${message}`);
  }
  return payload;
}

/** Reads the shared CLI options for the demo scripts. */
export function scriptOptions(env = process.env) {
  return {
    baseUrl: env.CHATSCAN_URL ?? 'http://127.0.0.1:3000',
    ingestKey: env.CHATSCAN_INGEST_KEY,
  };
}
