'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const { store } = require('./store');

const PORT = Number(process.env.PORT) || 3847;
const app = express();

app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

/** Never accept or echo plaintext message bodies. */
function rejectPlaintext(req, res, next) {
  const forbidden = ['content', 'message', 'plaintext', 'body', 'text', 'payload'];
  for (const key of forbidden) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
      return res.status(400).json({
        error: 'Message contents are end-to-end encrypted and must not be submitted to ChatScan.',
        code: 'PLAINTEXT_FORBIDDEN',
      });
    }
  }
  return next();
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'chatscan',
    chain: 'X11',
    serverActive: true,
  });
});

app.get('/api/stats', (_req, res) => {
  res.json(store.getStats());
});

app.get('/api/messages', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json(store.listMessages({ limit, offset, status }));
});

app.get('/api/messages/:ref', (req, res) => {
  const record = store.getByRef(req.params.ref);
  if (!record) {
    return res.status(404).json({ error: 'Message record not found', code: 'NOT_FOUND' });
  }
  return res.json(record);
});

app.post('/api/messages', rejectPlaintext, (req, res) => {
  const hash = typeof req.body?.hash === 'string' ? req.body.hash.trim().toLowerCase() : '';
  const protocol =
    typeof req.body?.protocol === 'string' && req.body.protocol.trim()
      ? req.body.protocol.trim()
      : 'X11-C7';

  if (!/^[a-f0-9]{64}$/.test(hash)) {
    return res.status(400).json({
      error: 'hash must be a 64-character lowercase hex SHA-256 digest',
      code: 'INVALID_HASH',
    });
  }

  const record = store.recordMessage({ hash, protocol });
  return res.status(201).json(record);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

if (require.main === module) {
  store.load();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`ChatScan Block Explorer listening on http://localhost:${PORT}`);
  });
}

module.exports = { app };
