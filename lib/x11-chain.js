'use strict';

/**
 * X11 Blockchain adapter.
 *
 * ChatScan is designed to anchor message-hash records to the X11 Blockchain.
 * The X11 chain is currently under development, so this adapter runs in
 * "devnet" mode: it batches pending ledger entries into simulated blocks on
 * a fixed interval, mirroring the interface the live chain will expose.
 *
 * When the X11 network ships, point `X11_RPC_URL` at a node and replace the
 * devnet loop in `start()` with real `submitBatch` / `getBlock` RPC calls.
 * The rest of the application only depends on this module's public surface,
 * so nothing else has to change.
 */

const crypto = require('crypto');

const BLOCK_INTERVAL_MS = Number(process.env.X11_BLOCK_INTERVAL_MS || 15_000);

class X11Chain {
  constructor(ledger) {
    this.ledger = ledger;
    this.rpcUrl = process.env.X11_RPC_URL || null;
    this.mode = this.rpcUrl ? 'rpc' : 'devnet';
    this.height = 0;
    this.lastBlockHash = '0'.repeat(64);
    this.lastBlockAt = null;
    this._timer = null;
  }

  start() {
    // Live RPC mode is not available yet -- the X11 chain is under development.
    // Until then, the devnet loop stands in for block production.
    this._timer = setInterval(() => this._produceBlock(), BLOCK_INTERVAL_MS);
    this._timer.unref();
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
  }

  _produceBlock() {
    const pending = this.ledger.pending();
    if (pending.length === 0) return;

    this.height += 1;
    this.lastBlockHash = crypto
      .createHash('sha256')
      .update(this.lastBlockHash + pending.map((e) => e.ref).join(','))
      .digest('hex');
    this.lastBlockAt = new Date().toISOString();
    this.ledger.confirm(pending.map((e) => e.id), this.height);
  }

  status() {
    return {
      network: 'X11 Blockchain',
      mode: this.mode,
      note: this.mode === 'devnet' ? 'X11 chain is under development; running local devnet simulation.' : undefined,
      height: this.height,
      lastBlockHash: this.lastBlockHash,
      lastBlockAt: this.lastBlockAt,
      blockIntervalMs: BLOCK_INTERVAL_MS,
    };
  }
}

module.exports = { X11Chain };
