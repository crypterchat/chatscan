import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

function int(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function list(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Reads configuration from the environment once, at startup.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadConfig(env = process.env) {
  const dataDir = env.CHATSCAN_DATA_DIR
    ? path.resolve(env.CHATSCAN_DATA_DIR)
    : path.join(REPO_ROOT, 'data');

  return {
    repoRoot: REPO_ROOT,
    publicDir: path.join(REPO_ROOT, 'public'),
    dataDir,
    chainLogPath: path.join(dataDir, 'chain.jsonl'),

    host: env.CHATSCAN_HOST ?? '0.0.0.0',
    port: int(env.CHATSCAN_PORT ?? env.PORT, 3000),

    // Network identity. The X11 blockchain is still under development, so the
    // explorer talks to a local X11-compatible chain by default.
    networkName: env.CHATSCAN_NETWORK ?? 'x11-devnet',
    chainId: env.CHATSCAN_CHAIN_ID ?? 'x11:dev',

    // Consensus / sealing.
    blockIntervalMs: int(env.CHATSCAN_BLOCK_INTERVAL_MS, 15_000),
    maxRecordsPerBlock: int(env.CHATSCAN_MAX_RECORDS_PER_BLOCK, 64),
    difficultyNibbles: int(env.CHATSCAN_DIFFICULTY_NIBBLES, 2),
    sealerEnabled: bool(env.CHATSCAN_SEALER_ENABLED, true),
    sealedBy: env.CHATSCAN_SEALED_BY ?? 'chatscan-local-sealer',

    // Ingest limits. Only ciphertext *metadata* is ever accepted, so bodies are tiny.
    maxRequestBytes: int(env.CHATSCAN_MAX_REQUEST_BYTES, 16 * 1024),
    maxCiphertextBytes: int(env.CHATSCAN_MAX_CIPHERTEXT_BYTES, 4 * 1024 * 1024),
    ingestKeys: list(env.CHATSCAN_INGEST_KEYS),
    ingestRatePerMinute: int(env.CHATSCAN_INGEST_RATE_PER_MINUTE, 600),

    // Presentation-only values, surfaced in the explorer header.
    feeQuoteUsd: Number(env.CHATSCAN_FEE_QUOTE_USD ?? '21.546'),
    persist: bool(env.CHATSCAN_PERSIST, true),
    logLevel: env.CHATSCAN_LOG_LEVEL ?? 'info',
  };
}

/** @typedef {ReturnType<typeof loadConfig>} Config */
