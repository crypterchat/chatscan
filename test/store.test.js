'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('MessageStore privacy invariants', () => {
  let MessageStore;

  before(() => {
    ({ MessageStore } = require('../server/store'));
  });

  it('exposes records as hash/id and never includes plaintext content', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chatscan-'));
    const originalCwd = process.cwd();
    process.chdir(tmp);

    // Re-require with isolated data dir by constructing store against default relative path
    // We exercise the public API shape instead of filesystem relocation.
    process.chdir(originalCwd);

    const store = new MessageStore();
    store.messages = [];
    store.nextId = 1;
    store.persist = () => {};

    const hash = 'a'.repeat(64);
    const record = store.recordMessage({ hash, protocol: 'X11-C7' });

    assert.equal(record.ref, `${hash}/1`);
    assert.equal(record.content, null);
    assert.equal(record.encrypted, true);
    assert.equal(record.chain, 'X11');
    assert.ok(!('plaintext' in record));
    assert.ok(!('message' in record));
  });

  it('rejects lookup shapes that would imply readable bodies', () => {
    const store = new MessageStore();
    store.messages = [
      {
        id: 7,
        hash: 'b'.repeat(64),
        protocol: 'X11-C7',
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        sizeBytes: 200,
        blockHeight: 42,
      },
    ];
    store.nextId = 8;
    store.persist = () => {};

    const found = store.getByRef(`${'b'.repeat(64)}/7`);
    assert.equal(found.ref, `${'b'.repeat(64)}/7`);
    assert.equal(found.content, null);
  });
});
