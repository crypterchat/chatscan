'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

describe('ChatScan API', () => {
  let app;
  let server;
  let base;

  before(async () => {
    ({ app } = require('../server/index'));
    const { store } = require('../server/store');
    store.messages = [];
    store.nextId = 1;
    store.persist = () => {};
    store.startedAt = Date.now();

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        base = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  async function json(path, options) {
    const res = await fetch(`${base}${path}`, options);
    const body = await res.json();
    return { res, body };
  }

  it('records hash/id and never returns content', async () => {
    const hash = 'c'.repeat(64);
    const { res, body } = await json('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash, protocol: 'X11-C7' }),
    });
    assert.equal(res.status, 201);
    assert.equal(body.ref, `${hash}/1`);
    assert.equal(body.content, null);
    assert.equal(body.encrypted, true);
  });

  it('rejects plaintext fields', async () => {
    const { res, body } = await json('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hash: 'd'.repeat(64),
        message: 'should-not-be-accepted',
      }),
    });
    assert.equal(res.status, 400);
    assert.equal(body.code, 'PLAINTEXT_FORBIDDEN');
  });
});
