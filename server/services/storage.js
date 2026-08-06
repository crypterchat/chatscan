const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(MESSAGES_FILE)) {
    const seed = createSeedMessages();
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ nextId: seed.length + 1, messages: seed }, null, 2));
  }
}

function readStore() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
}

function writeStore(store) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(store, null, 2));
}

function createSeedMessages() {
  const now = Date.now();
  return [
    {
      id: 1,
      hash: 'd700bc90e31d51c5ea22dbb03114e1791ef1da92d3ee06104216cdb9571327a8',
      protocol: 'X11 Protocol C7',
      status: 'pending',
      timestamp: now - 120000,
      sizeBytes: 2048
    },
    {
      id: 2,
      hash: 'a3f2c891b04e62d6fb33ecc14225f2802fe2eb03e4ff17215327deb0682438b9',
      protocol: 'X11 Protocol',
      status: 'confirmed',
      timestamp: now - 3600000,
      sizeBytes: 1536
    },
    {
      id: 3,
      hash: 'b8e1d790c20d40c4da11dba92003d0680de0ca81c2dd05093105cba8460216a7',
      protocol: 'X11 Protocol ETH Bridge',
      status: 'rejected',
      timestamp: now - 7200000,
      sizeBytes: 4096
    }
  ];
}

function generateHash(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function addMessage({ hash, protocol = 'X11 Protocol', sizeBytes = 0 }) {
  const store = readStore();
  const normalizedHash = hash.toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(normalizedHash)) {
    throw new Error('Invalid hash: must be a 64-character hex SHA-256 digest');
  }

  const id = store.nextId;
  const message = {
    id,
    hash: normalizedHash,
    protocol,
    status: 'pending',
    timestamp: Date.now(),
    sizeBytes: Number(sizeBytes) || 0
  };

  store.messages.unshift(message);
  store.nextId += 1;
  writeStore(store);
  return message;
}

function getMessage(hash, id) {
  const store = readStore();
  const numericId = Number(id);
  return store.messages.find(
    (m) => m.hash === hash.toLowerCase() && m.id === numericId
  ) || null;
}

function listMessages({ limit = 50, offset = 0, status } = {}) {
  const store = readStore();
  let messages = [...store.messages];

  if (status) {
    messages = messages.filter((m) => m.status === status);
  }

  const total = messages.length;
  messages = messages.slice(offset, offset + limit);

  return { messages, total };
}

function updateMessageStatus(hash, id, status) {
  const store = readStore();
  const numericId = Number(id);
  const message = store.messages.find(
    (m) => m.hash === hash.toLowerCase() && m.id === numericId
  );

  if (!message) return null;

  message.status = status;
  writeStore(store);
  return message;
}

function getStats() {
  const store = readStore();
  const messages = store.messages;
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  const last24h = messages.filter((m) => m.timestamp >= oneDayAgo);
  const lastHour = messages.filter((m) => m.timestamp >= oneHourAgo);
  const pending = messages.filter((m) => m.status === 'pending');
  const pendingBytes = pending.reduce((sum, m) => sum + (m.sizeBytes || 0), 0);

  const tps = lastHour.length > 0 ? (lastHour.length / 3600).toFixed(1) : '0.0';

  return {
    totalMessages: messages.length,
    messages24h: last24h.length,
    unconfirmedCount: pending.length,
    unconfirmedMb: (pendingBytes / (1024 * 1024)).toFixed(2),
    tps,
    atFee: 21.546,
    serverActive: true,
    network: 'X11 Blockchain'
  };
}

module.exports = {
  addMessage,
  getMessage,
  listMessages,
  updateMessageStatus,
  getStats,
  generateHash
};
