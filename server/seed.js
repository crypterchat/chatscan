'use strict';

const fs = require('fs');
const path = require('path');
const { MessageStore } = require('./store');

const DATA_FILE = path.join(__dirname, '..', 'data', 'messages.json');

if (fs.existsSync(DATA_FILE)) {
  fs.unlinkSync(DATA_FILE);
}

const store = new MessageStore();
store.load();
// eslint-disable-next-line no-console
console.log(`Seeded ${store.messages.length} encrypted message records at ${DATA_FILE}`);
