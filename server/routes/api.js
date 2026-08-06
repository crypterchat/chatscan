const express = require('express');
const storage = require('../services/storage');
const x11 = require('../services/x11-blockchain');

const router = express.Router();

router.get('/stats', (_req, res) => {
  res.json(storage.getStats());
});

router.get('/messages', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status || undefined;

  const result = storage.listMessages({ limit, offset, status });
  res.json({
    messages: result.messages.map(formatMessage),
    total: result.total,
    limit,
    offset
  });
});

router.get('/messages/:hash/:id', (req, res) => {
  const message = storage.getMessage(req.params.hash, req.params.id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json(formatMessage(message));
});

router.post('/messages', (req, res) => {
  const result = x11.submitMessage(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json({
    ...formatMessage(result.message),
    explorerPath: result.explorerPath
  });
});

router.post('/messages/:hash/:id/confirm', (req, res) => {
  const result = x11.confirmMessage(req.params.hash, req.params.id);
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }
  res.json(formatMessage(result.message));
});

router.post('/messages/:hash/:id/reject', (req, res) => {
  const result = x11.rejectMessage(req.params.hash, req.params.id);
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }
  res.json(formatMessage(result.message));
});

function formatMessage(message) {
  return {
    id: message.id,
    hash: message.hash,
    explorerId: `${message.hash}/${message.id}`,
    protocol: message.protocol,
    status: message.status,
    timestamp: message.timestamp,
    sizeBytes: message.sizeBytes,
    encrypted: true
  };
}

module.exports = router;
