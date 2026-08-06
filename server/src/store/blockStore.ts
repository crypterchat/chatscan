import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { BlockRecord, BlockStatus } from "../types.js";

interface LedgerSnapshot {
  nextId: number;
  records: BlockRecord[];
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  status?: BlockStatus;
  /** Matches against hash (prefix/substring) or numeric id or a full "hash/id" reference. */
  query?: string;
}

export interface ListResult {
  total: number;
  page: number;
  pageSize: number;
  items: BlockRecord[];
}

const HASH_PATTERN = /^[a-f0-9]{16,128}$/i;

export function isValidHash(hash: unknown): hash is string {
  return typeof hash === "string" && HASH_PATTERN.test(hash);
}

/**
 * File-backed ledger of ChatScan block records.
 *
 * This is an interim index while the X11 Blockchain is under development.
 * Once X11 ships, this store's role narrows to a fast local cache in front
 * of chain queries - the on-disk format intentionally mirrors the public
 * record shape (hash + id + status only, never content) to make that
 * migration straightforward.
 */
export class BlockStore {
  private records = new Map<string, BlockRecord>(); // key: `${hash}/${id}`
  private nextId = 1;

  constructor(private readonly filePath: string) {
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const snapshot = JSON.parse(raw) as LedgerSnapshot;
      this.nextId = snapshot.nextId ?? 1;
      for (const record of snapshot.records ?? []) {
        this.records.set(`${record.hash}/${record.id}`, record);
      }
    } catch (err) {
      console.error(`[BlockStore] failed to load ledger from ${this.filePath}:`, err);
    }
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const snapshot: LedgerSnapshot = {
      nextId: this.nextId,
      records: Array.from(this.records.values()),
    };
    writeFileSync(this.filePath, JSON.stringify(snapshot, null, 2), "utf-8");
  }

  create(hash: string, protocol: string): BlockRecord {
    const record: BlockRecord = {
      id: this.nextId++,
      hash,
      protocol,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.records.set(`${record.hash}/${record.id}`, record);
    this.persist();
    return record;
  }

  updateStatus(hash: string, id: number, status: BlockStatus, chainRef?: string): BlockRecord | undefined {
    const key = `${hash}/${id}`;
    const record = this.records.get(key);
    if (!record) return undefined;
    record.status = status;
    record.chainRef = chainRef ?? record.chainRef;
    if (status === "confirmed") record.confirmedAt = new Date().toISOString();
    this.persist();
    return record;
  }

  getByReference(hash: string, id: number): BlockRecord | undefined {
    return this.records.get(`${hash}/${id}`);
  }

  count(): number {
    return this.records.size;
  }

  list(opts: ListOptions = {}): ListResult {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));

    let items = Array.from(this.records.values());

    if (opts.status) {
      items = items.filter((r) => r.status === opts.status);
    }

    if (opts.query) {
      const q = opts.query.trim().toLowerCase();
      const [maybeHash, maybeId] = q.split("/");
      items = items.filter((r) => {
        if (maybeId !== undefined) {
          return r.hash.toLowerCase() === maybeHash && String(r.id) === maybeId;
        }
        return r.hash.toLowerCase().includes(q) || String(r.id) === q;
      });
    }

    items.sort((a, b) => b.id - a.id);

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return { total, page, pageSize, items: paged };
  }
}
