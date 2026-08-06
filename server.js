'use strict';

/**
 * ChatScan Block Explorer server.
 *
 * Serves the explorer UI and a small JSON API. Every message sent through
 * the CrypterChat app is recorded here as `{HASH}/{ID}`. Contents are
 * end-to-end encrypted and are never transmitted to, stored by, or viewable
 * from this service -- only hash digests are accepted.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { Ledger } = require('./lib/ledger');
const { X11Chain } = require('./lib/x11-chain');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = process.env.CHATSCAN_DATA || path.join(__dirname, 'data', 'ledger.ndjson');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 4096;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

const ledger = new Ledger(DATA_FILE);
const chain = new X11Chain(ledger);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, urlPath) {
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(PUBLIC_DIR, relative);
  // Prevent path traversal: the resolved file must stay inside PUBLIC_DIR.
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
    sendJson(res, 404, { error: 'Not found.' });
    return;
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found.' });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  });
}

async function handleApi(req, res, url) {
  // POST /api/messages -- record an encrypted message's hash digest.
  if (req.method === 'POST' && url.pathname === '/api/messages') {
    let payload;
    try {
      payload = await readJsonBody(req);
    } catch (err) {
      sendJson(res, err.statusCode || 400, { error: err.message });
      return;
    }
    const validation = Ledger.validateSubmission(payload);
    if (!validation.ok) {
      sendJson(res, 400, { error: validation.error });
      return;
    }
    const { entry, created } = ledger.record(validation.hash);
    sendJson(res, created ? 201 : 200, { record: entry.ref, entry });
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  if (url.pathname === '/api/stats') {
    sendJson(res, 200, { ledger: ledger.stats(), chain: chain.status() });
    return;
  }

  if (url.pathname === '/api/messages') {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 25, 1), 100);
    const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
    sendJson(res, 200, ledger.list({ limit, offset }));
    return;
  }

  // GET /api/messages/<id> | /api/messages/<hash> | /api/messages/<hash>/<id>
  const lookup = url.pathname.match(/^\/api\/messages\/(.+)$/);
  if (lookup) {
    const entry = ledger.find(decodeURIComponent(lookup[1]));
    if (!entry) {
      sendJson(res, 404, { error: 'No record found for that hash or ID.' });
      return;
    }
    sendJson(res, 200, { record: entry.ref, entry });
    return;
  }

  sendJson(res, 404, { error: 'Unknown API route.' });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch(() => sendJson(res, 500, { error: 'Internal server error.' }));
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  serveStatic(res, url.pathname);
});

if (require.main === module) {
  chain.start();
  server.listen(PORT, HOST, () => {
    console.log(`ChatScan Block Explorer listening on http://${HOST}:${PORT}`);
    console.log(`X11 chain adapter mode: ${chain.status().mode}`);
  });
}

module.exports = { server, ledger, chain };
