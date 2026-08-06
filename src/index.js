import process from 'node:process';

import { loadConfig } from './config.js';
import { ChatScanNode } from './core/chain.js';
import { createServer } from './http/server.js';
import { ChatScanStore } from './store/store.js';

/**
 * Wires up a ChatScan node: replay the chain log, start the sealer, serve HTTP.
 * @param {import('./config.js').Config} [config]
 */
export function createApp(config = loadConfig()) {
  const store = new ChatScanStore({ chainLogPath: config.chainLogPath, persist: config.persist }).replay();
  const node = new ChatScanNode({ store, config });
  node.ensureGenesis();
  const server = createServer({ store, node, config });
  return { config, store, node, server };
}

/** Starts the explorer and installs shutdown handlers. */
export async function main() {
  const app = createApp();
  const { config, node, server, store } = app;

  node.start();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : config.port;
  console.log(`ChatScan Block Explorer listening on http://${config.host}:${port}`);
  console.log(`  network: ${config.networkName} (${config.chainId})`);
  console.log(`  height:  ${store.tip()?.height ?? 0}`);
  console.log(`  records: ${store.records.length}`);
  console.log(`  sealer:  ${config.sealerEnabled ? `every ${config.blockIntervalMs}ms` : 'disabled'}`);
  console.log(`  ingest:  ${config.ingestKeys.length > 0 ? 'key required' : 'open (no CHATSCAN_INGEST_KEYS set)'}`);

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down.`);
    node.stop();
    await new Promise((resolve) => server.close(resolve));
    await store.flush();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  return app;
}

const isEntryPoint = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isEntryPoint) {
  main().catch((error) => {
    console.error('ChatScan failed to start:', error);
    process.exit(1);
  });
}
