import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BlockStore, isValidHash } from "./blockStore.js";

function withTempStore(fn: (store: BlockStore, dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "chatscan-test-"));
  const store = new BlockStore(join(dir, "ledger.json"));
  try {
    fn(store, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("isValidHash accepts hex digests only", () => {
  assert.equal(isValidHash("d700bc90e31d51c5ea22dbb03114e179"), true);
  assert.equal(isValidHash("not-a-hash"), false);
  assert.equal(isValidHash("hello world this is content"), false);
  assert.equal(isValidHash(12345), false);
});

test("create() assigns sequential ids and never stores content fields", () => {
  withTempStore((store) => {
    const a = store.create("a".repeat(64), "X11");
    const b = store.create("b".repeat(64), "X11");

    assert.equal(a.id, 1);
    assert.equal(b.id, 2);
    assert.equal(a.status, "pending");
    assert.deepEqual(Object.keys(a).sort(), ["confirmedAt", "createdAt", "hash", "id", "protocol", "status"].sort().filter((k) => k in a));
    assert.ok(!("content" in a));
    assert.ok(!("message" in a));
  });
});

test("getByReference retrieves records by hash/id", () => {
  withTempStore((store) => {
    const record = store.create("c".repeat(40), "X11");
    const found = store.getByReference(record.hash, record.id);
    assert.equal(found?.id, record.id);
    assert.equal(store.getByReference(record.hash, 9999), undefined);
  });
});

test("updateStatus transitions pending -> confirmed", () => {
  withTempStore((store) => {
    const record = store.create("d".repeat(40), "X11");
    const updated = store.updateStatus(record.hash, record.id, "confirmed", "x11-blk-1");
    assert.equal(updated?.status, "confirmed");
    assert.ok(updated?.confirmedAt);
    assert.equal(updated?.chainRef, "x11-blk-1");
  });
});

test("list() supports pagination, status filter, and hash/id query", () => {
  withTempStore((store) => {
    for (let i = 0; i < 25; i++) {
      store.create(`${i.toString().padStart(2, "0")}`.repeat(20), "X11");
    }
    const page1 = store.list({ page: 1, pageSize: 10 });
    assert.equal(page1.total, 25);
    assert.equal(page1.items.length, 10);

    const first = store.list({ page: 1, pageSize: 1 }).items[0];
    const byQuery = store.list({ query: `${first.hash}/${first.id}` });
    assert.equal(byQuery.items.length, 1);
    assert.equal(byQuery.items[0].id, first.id);
  });
});

test("persists and reloads from disk", () => {
  const dir = mkdtempSync(join(tmpdir(), "chatscan-test-"));
  const file = join(dir, "ledger.json");
  try {
    const store1 = new BlockStore(file);
    const record = store1.create("e".repeat(40), "X11");

    const store2 = new BlockStore(file);
    const reloaded = store2.getByReference(record.hash, record.id);
    assert.equal(reloaded?.id, record.id);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
