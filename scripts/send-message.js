#!/usr/bin/env node
/**
 * Sends one encrypted message record to a running ChatScan node.
 *
 *   node scripts/send-message.js "hello from crypterchat" [conversation] [protocol]
 *
 * The message is encrypted in this process; ChatScan only receives the
 * ciphertext digest and its byte length.
 */
import { randomBytes } from 'node:crypto';
import process from 'node:process';

import { channelHash, scriptOptions, sealMessage, submitRecord } from './lib/client.js';

const [text = 'hello from crypterchat', conversation = 'demo', protocol = 'C7'] = process.argv.slice(2);
const { baseUrl, ingestKey } = scriptOptions();

const sealed = sealMessage(text);
const response = await submitRecord({
  baseUrl,
  ingestKey,
  record: {
    ciphertextHash: sealed.ciphertextHash,
    size: sealed.size,
    protocol,
    channelHash: channelHash(conversation),
    nonce: randomBytes(16).toString('hex'),
    fee: 0.00042,
    appVersion: 'cc-demo-1.0',
  },
});

console.log(`recorded ${response.ref}`);
console.log(`status   ${response.status}${response.rejectionReason ? ` (${response.rejectionReason})` : ''}`);
console.log(`explorer ${new URL(response.explorerUrl, baseUrl).href}`);
