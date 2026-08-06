import { PROTOCOLS } from './records.js';
import { X11_ALGORITHM_ID, X11_ROUNDS } from './x11.js';

/**
 * Fee estimate in USD. The quote is a configured base rate scaled by mempool
 * pressure, so a backed-up node quotes a higher fee.
 * @param {{ pending: number }} stats
 * @param {import('../config.js').Config} config
 */
export function feeEstimate(stats, config) {
  const pressure = Math.min(stats.pending / Math.max(config.maxRecordsPerBlock, 1), 4);
  const estimate = config.feeQuoteUsd * (1 + pressure * 0.25);
  return {
    baseUsd: round(config.feeQuoteUsd, 3),
    estimateUsd: round(estimate, 3),
    pressure: round(pressure, 3),
  };
}

/**
 * Everything the explorer header and `/api/v1/status` need in one snapshot.
 * @param {object} args
 * @param {import('../store/store.js').ChatScanStore} args.store
 * @param {import('../config.js').Config} args.config
 * @param {number} [args.now]
 */
export function networkSnapshot({ store, config, now = Date.now() }) {
  const stats = store.stats(now);
  const tipAgeMs = stats.tipTimestamp === null ? null : Math.max(0, now - stats.tipTimestamp);
  const staleAfterMs = config.blockIntervalMs * 3;

  // An idle chain is healthy: the sealer only produces a block when records are
  // waiting, so a stale tip is only a problem while the mempool is backed up.
  let status = 'online';
  if (!config.sealerEnabled) status = 'paused';
  else if (tipAgeMs === null) status = 'syncing';
  else if (tipAgeMs > staleAfterMs && stats.pending > 0) status = 'degraded';

  const last24hBlocks = store.blocks.filter((block) => now - block.timestamp <= 24 * 60 * 60 * 1000).length;

  return {
    network: config.networkName,
    chainId: config.chainId,
    algorithm: X11_ALGORITHM_ID,
    algorithmRounds: X11_ROUNDS.map((round) => round.slot),
    status,
    sealer: {
      enabled: config.sealerEnabled,
      intervalMs: config.blockIntervalMs,
      maxRecordsPerBlock: config.maxRecordsPerBlock,
      difficultyNibbles: config.difficultyNibbles,
    },
    height: stats.height,
    tipHash: stats.tipHash,
    tipAgeMs,
    blocks: stats.blocks,
    fee: feeEstimate(stats, config),
    unconfirmed: { count: stats.pending, bytes: stats.pendingBytes },
    throughput: { records: stats.records, tps: round(stats.tps, 2) },
    last24h: {
      records: stats.last24hCount,
      bytes: stats.last24hBytes,
      fees: round(stats.last24hFees, 8),
      blocks: last24hBlocks,
    },
    perRecord: {
      averageSizeBytes: stats.averageSize,
      averageFee: stats.records > 0 ? round(stats.last24hFees / Math.max(stats.last24hCount, 1), 8) : 0,
      confirmed: stats.confirmed,
      rejected: stats.rejected,
    },
    protocols: Object.values(PROTOCOLS).map((protocol) => ({
      id: protocol.id,
      label: protocol.label,
      maxCiphertextBytes: protocol.maxCiphertextBytes,
    })),
    privacy: {
      contentIndexed: false,
      note: 'ChatScan indexes ciphertext metadata only. Message content is end-to-end encrypted and never leaves the CrypterChat clients.',
    },
  };
}

/**
 * @param {number} value
 * @param {number} digits
 */
function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
