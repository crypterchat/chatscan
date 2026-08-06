'use strict';

/**
 * Append-only ledger for ChatScan.
 *
 * Each entry records an end-to-end encrypted message as `{HASH}/{ID}`.
 * Only the hash digest is ever accepted or stored -- message contents
 * never reach this process, so they can never be viewed here.
 *
 * Entries are persisted as newline-delimited JSON (NDJSON) so the file
 * behaves like an append-only journal and survives restarts.
 */

const fs = require('fs');
const path = require('path');

// 64 hex chars: the digest width of SHA-256 and of X11 (11 chained hashes, 256-bit output).
const HASH_RE = /^[0-9a-f]{64}$/;

// Field names that would indicate a client is trying to submit plaintext.
// Requests carrying any of these are rejected to enforce E2E privacy.
const FORBIDDEN_FIELDS = ['content', 'message', 'body', 'text', 'plaintext', 'payload'];

class Ledger {
  constructor(filePath) {
    this.filePath = filePath;
    this.entries = [];
    this.byHash = new Map();
    this.nextId = 1;
    this._load();
  }

  _load() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      return;
    }
    const lines = fs.readFileSync(this.filePath, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const entry = JSON.parse(line);
      this.entries.push(entry);
      this.byHash.set(entry.hash, entry);
      if (entry.id >= this.nextId) this.nextId = entry.id + 1;
    }
  }

  _append(entry) {
    fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n');
  }

  _rewrite() {
    const tmp = this.filePath + '.tmp';
    fs.writeFileSync(tmp, this.entries.map((e) => JSON.stringify(e)).join('\n') + (this.entries.length ? '\n' : ''));
    fs.renameSync(tmp, this.filePath);
  }

  static validateSubmission(payload) {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, error: 'Request body must be a JSON object.' };
    }
    for (const field of FORBIDDEN_FIELDS) {
      if (field in payload) {
        return {
          ok: false,
          error: `Field "${field}" is not accepted. ChatScan records hash digests only; message contents are end-to-end encrypted and must never be submitted.`,
        };
      }
    }
    const hash = typeof payload.hash === 'string' ? payload.hash.trim().toLowerCase() : '';
    if (!HASH_RE.test(hash)) {
      return { ok: false, error: 'Field "hash" must be a 64-character hex digest.' };
    }
    return { ok: true, hash };
  }

  /**
   * Record a message hash. Returns the new entry, or the existing one if
   * this hash was already recorded (idempotent).
   */
  record(hash) {
    const existing = this.byHash.get(hash);
    if (existing) return { entry: existing, created: false };

    const entry = {
      id: this.nextId++,
      hash,
      ref: `${hash}/${this.nextId - 1}`,
      protocol: 'X11',
      status: 'pending',
      block: null,
      recordedAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    this.byHash.set(entry.hash, entry);
    this._append(entry);
    return { entry, created: true };
  }

  /** Mark entries as confirmed in an X11 block (called by the chain adapter). */
  confirm(ids, blockHeight) {
    let changed = false;
    const idSet = new Set(ids);
    for (const entry of this.entries) {
      if (idSet.has(entry.id) && entry.status === 'pending') {
        entry.status = 'confirmed';
        entry.block = blockHeight;
        changed = true;
      }
    }
    if (changed) this._rewrite();
  }

  pending() {
    return this.entries.filter((e) => e.status === 'pending');
  }

  list({ limit = 25, offset = 0 } = {}) {
    const sorted = [...this.entries].reverse();
    return {
      total: this.entries.length,
      entries: sorted.slice(offset, offset + limit),
    };
  }

  /** Look up by numeric id, by hash, or by full "hash/id" reference. */
  find(query) {
    const q = String(query).trim().toLowerCase();
    if (/^\d+$/.test(q)) {
      return this.entries.find((e) => e.id === Number(q)) || null;
    }
    if (HASH_RE.test(q)) {
      return this.byHash.get(q) || null;
    }
    const refMatch = q.match(/^([0-9a-f]{64})\/(\d+)$/);
    if (refMatch) {
      const entry = this.byHash.get(refMatch[1]);
      return entry && entry.id === Number(refMatch[2]) ? entry : null;
    }
    return null;
  }

  stats() {
    const pending = this.entries.filter((e) => e.status === 'pending').length;
    const confirmed = this.entries.length - pending;
    const now = Date.now();
    const lastMinute = this.entries.filter((e) => now - Date.parse(e.recordedAt) < 60_000).length;
    return {
      total: this.entries.length,
      pending,
      confirmed,
      tps: Number((lastMinute / 60).toFixed(2)),
    };
  }
}

module.exports = { Ledger, HASH_RE };
