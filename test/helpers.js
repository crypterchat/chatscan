import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadConfig } from '../src/config.js';
import { ChatScanNode } from '../src/core/chain.js';
import { createServer } from '../src/http/server.js';
import { ChatScanStore } from '../src/store/store.js';

/** Creates a scratch data directory for one test. */
export function tempDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chatscan-test-'));
}

/**
 * Config for tests: no persistence and no background sealer unless asked.
 * @param {Record<string, string>} [overrides]
 */
export function testConfig(overrides = {}) {
  return loadConfig({
    CHATSCAN_DATA_DIR: tempDataDir(),
    CHATSCAN_PERSIST: 'false',
    CHATSCAN_SEALER_ENABLED: 'false',
    CHATSCAN_PORT: '0',
    CHATSCAN_DIFFICULTY_NIBBLES: '1',
    ...overrides,
  });
}

/**
 * A store plus node sharing one config.
 * @param {Record<string, string>} [overrides]
 */
export function testNode(overrides = {}) {
  const config = testConfig(overrides);
  const store = new ChatScanStore({ chainLogPath: config.chainLogPath, persist: config.persist }).replay();
  const node = new ChatScanNode({ store, config });
  node.ensureGenesis();
  return { config, store, node };
}

/**
 * Boots the HTTP server on an ephemeral port.
 * @param {Record<string, string>} [overrides]
 */
export async function startTestServer(overrides = {}) {
  const { config, store, node } = testNode(overrides);
  const server = createServer({ store, node, config });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());

  return {
    config,
    store,
    node,
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    /**
     * @param {string} pathname
     * @param {RequestInit} [init]
     */
    request(pathname, init) {
      return fetch(`http://127.0.0.1:${port}${pathname}`, init);
    },
    /** @param {object} record */
    submit(record, init = {}) {
      return fetch(`http://127.0.0.1:${port}/api/v1/records`, {
        method: 'POST',
        body: JSON.stringify(record),
        ...init,
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      });
    },
    async close() {
      node.stop();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

let counter = 0;

/**
 * A submission that passes validation. Each call is unique, so records do not
 * trip the replay check.
 * @param {Partial<{ ciphertextHash: string, size: number, protocol: string, channelHash: string, nonce: string, fee: number, appVersion: string }>} [overrides]
 */
export function sampleSubmission(overrides = {}) {
  counter += 1;
  return {
    ciphertextHash: String(counter).padStart(64, '0'),
    size: 512 + counter,
    protocol: 'C7',
    ...overrides,
  };
}
