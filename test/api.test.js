'use strict';

const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

process.env.CHATSCAN_DATA = path.join(os.tmpdir(), `chatscan-test-${process.pid}.ndjson`);

const { server, ledger, chain } = require('../server');

let baseUrl;

test.before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  chain.stop();
  await new Promise((resolve) => server.close(resolve));
});

function randomHash() {
  return crypto.randomBytes(32).toString('hex');
}

test('records a message hash as {HASH}/{ID}', async () => {
  const hash = randomHash();
  const res = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash }),
  });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.record, `${hash}/${body.entry.id}`);
  assert.strictEqual(body.entry.status, 'pending');
  assert.strictEqual(body.entry.protocol, 'X11');
});

test('is idempotent for a repeated hash', async () => {
  const hash = randomHash();
  const first = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash }),
  });
  const second = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash }),
  });
  assert.strictEqual(first.status, 201);
  assert.strictEqual(second.status, 200);
  const a = await first.json();
  const b = await second.json();
  assert.strictEqual(a.entry.id, b.entry.id);
});

test('rejects plaintext message contents', async () => {
  const res = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash: randomHash(), content: 'secret plaintext' }),
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /end-to-end encrypted/);
});

test('rejects malformed hashes', async () => {
  const res = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash: 'not-a-hash' }),
  });
  assert.strictEqual(res.status, 400);
});

test('looks up records by id, hash, and hash/id reference', async () => {
  const hash = randomHash();
  const created = await (await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash }),
  })).json();
  const id = created.entry.id;

  for (const query of [String(id), hash, `${hash}/${id}`]) {
    const res = await fetch(`${baseUrl}/api/messages/${encodeURIComponent(query)}`);
    assert.strictEqual(res.status, 200, `lookup by ${query}`);
    const body = await res.json();
    assert.strictEqual(body.entry.hash, hash);
  }

  const missing = await fetch(`${baseUrl}/api/messages/999999`);
  assert.strictEqual(missing.status, 404);
});

test('never exposes anything but hashes in listings', async () => {
  const res = await fetch(`${baseUrl}/api/messages`);
  const body = await res.json();
  assert.ok(body.total >= 1);
  for (const entry of body.entries) {
    assert.deepStrictEqual(
      Object.keys(entry).sort(),
      ['block', 'hash', 'id', 'protocol', 'recordedAt', 'ref', 'status'],
    );
  }
});

test('x11 devnet adapter confirms pending entries into blocks', () => {
  const hash = randomHash();
  ledger.record(hash);
  assert.ok(ledger.pending().length >= 1);
  chain._produceBlock();
  const entry = ledger.find(hash);
  assert.strictEqual(entry.status, 'confirmed');
  assert.ok(entry.block >= 1);
  assert.strictEqual(ledger.pending().length, 0);
});

test('static server blocks path traversal', async () => {
  const res = await fetch(`${baseUrl}/..%2f..%2fetc%2fpasswd`);
  assert.strictEqual(res.status, 404);
});
