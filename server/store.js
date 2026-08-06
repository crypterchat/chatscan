'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

/**
 * ChatScan stores only opaque message commitments for the X11 chain.
 * Format exposed to clients: `{HASH}/{ID-number}`
 * Plaintext message contents are never stored or returned.
 */
class MessageStore {
  constructor() {
    this.messages = [];
    this.nextId = 1;
    this.startedAt = Date.now();
  }

  load() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      this.seed();
      this.persist();
      return;
    }
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    this.messages = Array.isArray(raw.messages) ? raw.messages : [];
    this.nextId = Number(raw.nextId) || this.messages.length + 1;
  }

  persist() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ nextId: this.nextId, messages: this.messages }, null, 2)
    );
  }

  toPublic(record) {
    return {
      id: record.id,
      hash: record.hash,
      ref: `${record.hash}/${record.id}`,
      protocol: record.protocol,
      status: record.status,
      timestamp: record.timestamp,
      sizeBytes: record.sizeBytes,
      blockHeight: record.blockHeight,
      chain: 'X11',
      encrypted: true,
      content: null,
      contentNote: 'End-to-end encrypted. Message contents are not viewable on ChatScan.',
    };
  }

  recordMessage({ hash, protocol }) {
    const id = this.nextId++;
    const record = {
      id,
      hash,
      protocol,
      status: 'pending',
      timestamp: new Date().toISOString(),
      sizeBytes: 256 + Math.floor(Math.random() * 512),
      blockHeight: null,
    };
    this.messages.unshift(record);
    this.persist();
    return this.toPublic(record);
  }

  listMessages({ limit = 50, offset = 0, status } = {}) {
    let rows = this.messages;
    if (status) {
      rows = rows.filter((m) => m.status === status);
    }
    const slice = rows.slice(offset, offset + limit).map((m) => this.toPublic(m));
    return {
      total: rows.length,
      limit,
      offset,
      messages: slice,
    };
  }

  getByRef(ref) {
    const decoded = decodeURIComponent(ref);
    if (decoded.includes('/')) {
      const [hash, idPart] = decoded.split('/');
      const id = Number(idPart);
      const found = this.messages.find((m) => m.hash === hash.toLowerCase() && m.id === id);
      return found ? this.toPublic(found) : null;
    }
    const hash = decoded.toLowerCase();
    const matches = this.messages.filter((m) => m.hash === hash).map((m) => this.toPublic(m));
    if (!matches.length) return null;
    return { hash, count: matches.length, records: matches };
  }

  getStats() {
    const confirmed = this.messages.filter((m) => m.status === 'confirmed').length;
    const pending = this.messages.filter((m) => m.status === 'pending').length;
    const rejected = this.messages.filter((m) => m.status === 'rejected').length;
    const unconfirmedBytes = this.messages
      .filter((m) => m.status === 'pending')
      .reduce((sum, m) => sum + (m.sizeBytes || 0), 0);
    const uptimeSec = Math.max(1, (Date.now() - this.startedAt) / 1000);
    const tps = Number((this.messages.length / uptimeSec).toFixed(3));

    return {
      chain: 'X11',
      serverActive: true,
      atFeeUsd: Number((18 + Math.random() * 8).toFixed(3)),
      unconfirmedTxs: pending,
      unconfirmedSizeMb: Number((unconfirmedBytes / (1024 * 1024)).toFixed(2)),
      txCounts: this.messages.length,
      tps,
      confirmed,
      pending,
      rejected,
      valuePerTx: 'opaque (E2EE)',
      networkStatus: pending > 20 ? 'Congested' : 'Healthy',
      status24h: {
        messages: this.messages.length,
        confirmed,
        pending,
        rejected,
      },
    };
  }

  seed() {
    const protocols = ['X11-C7', 'Protocol C7', 'X11 Bridge'];
    const statuses = ['pending', 'confirmed', 'rejected', 'confirmed', 'pending', 'confirmed'];
    for (let i = 0; i < 12; i += 1) {
      const hash = crypto.randomBytes(32).toString('hex');
      const id = this.nextId++;
      const status = statuses[i % statuses.length];
      this.messages.push({
        id,
        hash,
        protocol: protocols[i % protocols.length],
        status,
        timestamp: new Date(Date.now() - i * 90_000).toISOString(),
        sizeBytes: 180 + i * 37,
        blockHeight: status === 'confirmed' ? 1_000_000 + i : null,
      });
    }
    // Stable demo hashes matching the original Webflow mock for familiarity
    this.messages.unshift({
      id: this.nextId++,
      hash: 'd700bc90e31d51c5ea22dbb03114e1791ef1da92d3ee06104216cdb9571327a8',
      protocol: 'Protocol C7',
      status: 'pending',
      timestamp: new Date().toISOString(),
      sizeBytes: 412,
      blockHeight: null,
    });
    this.messages.unshift({
      id: this.nextId++,
      hash: 'd700bc90e31d51c5ea22dbb03114e1791ef1da92d3ee06104216cdb9571327a8',
      protocol: 'ETH Protocol',
      status: 'rejected',
      timestamp: new Date(Date.now() - 30_000).toISOString(),
      sizeBytes: 288,
      blockHeight: null,
    });
  }
}

const store = new MessageStore();

module.exports = { store, MessageStore };
