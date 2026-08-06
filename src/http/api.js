import { timingSafeEqual } from 'node:crypto';

import { networkSnapshot } from '../core/network.js';
import { RECORD_STATUS, parseRef, publicRecord } from '../core/records.js';
import { X11_ALGORITHM_ID, X11_ROUNDS } from '../core/x11.js';
import { badRequest, notFound, tooManyRequests, unauthorized } from '../util/errors.js';
import { readJsonBody, sendJson, writeHead } from './respond.js';

const MAX_PAGE_SIZE = 100;

/**
 * Public projection of a block.
 * @param {object} block
 */
export function publicBlock(block) {
  return {
    height: block.height,
    hash: block.hash,
    previousHash: block.previousHash,
    merkleRoot: block.merkleRoot,
    timestamp: new Date(block.timestamp).toISOString(),
    algorithm: block.algorithm,
    difficulty: block.difficulty,
    nonce: block.nonce,
    txCount: block.txCount,
    sizeBytes: block.sizeBytes,
    totalFees: block.totalFees,
    sealedBy: block.sealedBy,
    recordRefs: block.recordRefs,
  };
}

/**
 * Registers `/api/v1/*` routes.
 * @param {ReturnType<import('./router.js').createRouter>} router
 * @param {{ store: import('../store/store.js').ChatScanStore, node: import('../core/chain.js').ChatScanNode, config: import('../config.js').Config, limiter: import('./rate-limit.js').RateLimiter }} ctx
 */
export function registerApiRoutes(router, ctx) {
  const { store, node, config, limiter } = ctx;

  router.get('/healthz', (req, res) => {
    sendJson(res, 200, { status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  router.get('/api/v1/status', (req, res) => {
    sendJson(res, 200, networkSnapshot({ store, config }));
  });

  router.get('/api/v1/algorithm', (req, res) => {
    sendJson(res, 200, {
      algorithm: X11_ALGORITHM_ID,
      rounds: X11_ROUNDS.map((round, index) => ({ order: index + 1, slot: round.slot, digest: round.digest })),
      note: 'The X11 blockchain is under development. Slots keep the reference X11 order; digests are stand-ins until the reference primitives land.',
    });
  });

  router.post('/api/v1/records', async (req, res, { clientKey }) => {
    requireIngestKey(req, config);

    const decision = limiter.consume(clientKey);
    if (!decision.allowed) {
      throw tooManyRequests(`Ingest limit is ${limiter.limit} records per minute.`);
    }

    const body = await readJsonBody(req, config.maxRequestBytes);
    const { record, accepted } = node.submit(body);

    sendJson(res, accepted ? 201 : 202, {
      ref: record.ref,
      hash: record.hash,
      id: record.id,
      status: record.status,
      rejectionReason: record.rejectionReason,
      explorerUrl: `/tx/${record.ref}`,
      record: publicRecord(record),
    });
  });

  router.get('/api/v1/records', (req, res, { query }) => {
    const { limit, offset } = pagination(query);
    const status = optionalStatus(query.get('status'));
    const protocol = query.get('protocol')?.toUpperCase() || undefined;
    const channelHash = normalizeHexQuery(query.get('channel'));

    const { items, total } = store.listRecords({ limit, offset, status, protocol, channelHash });
    sendJson(res, 200, {
      total,
      limit,
      offset,
      records: items.map(publicRecord),
    });
  });

  router.get('/api/v1/records/:hash/:id', (req, res, { params }) => {
    const record = lookupRecord(store, `${params.hash}/${params.id}`);
    sendJson(res, 200, { record: publicRecord(record) });
  });

  router.get('/api/v1/blocks', (req, res, { query }) => {
    const { limit, offset } = pagination(query, 10);
    const { items, total } = store.listBlocks({ limit, offset });
    sendJson(res, 200, { total, limit, offset, blocks: items.map(publicBlock) });
  });

  router.get('/api/v1/blocks/:id', (req, res, { params }) => {
    const block = lookupBlock(store, params.id);
    sendJson(res, 200, {
      block: publicBlock(block),
      records: block.recordRefs
        .map((ref) => store.recordsByRef.get(ref))
        .filter(Boolean)
        .map(publicRecord),
    });
  });

  router.get('/api/v1/search', (req, res, { query }) => {
    const term = String(query.get('q') ?? '').trim();
    sendJson(res, 200, search(store, term));
  });

  router.get('/api/v1/stream', (req, res) => {
    writeHead(res, 200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write(`event: status\ndata: ${JSON.stringify(networkSnapshot({ store, config }))}\n\n`);

    const onRecord = (record) => write(res, 'record', publicRecord(record));
    const onBlock = (block) => write(res, 'block', publicBlock(block));
    const heartbeat = setInterval(() => {
      write(res, 'status', networkSnapshot({ store, config }));
    }, Math.max(2000, Math.min(config.blockIntervalMs, 10_000)));
    heartbeat.unref?.();

    store.on('record', onRecord);
    store.on('block', onBlock);

    const cleanup = () => {
      clearInterval(heartbeat);
      store.off('record', onRecord);
      store.off('block', onBlock);
    };
    req.on('close', cleanup);
    res.on('close', cleanup);
  });
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {string} event
 * @param {unknown} payload
 */
function write(res, event, payload) {
  if (res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Free-text lookup over the explorer index: a `{HASH}/{ID}` reference, a record
 * hash, a block hash, a block height, or an ID-number.
 * @param {import('../store/store.js').ChatScanStore} store
 * @param {string} term
 */
export function search(store, term) {
  if (!term) return { query: term, kind: 'empty', results: [] };
  const normalized = term.toLowerCase();

  const ref = parseRef(normalized);
  if (ref) {
    const record = store.getRecord(ref.hash, ref.id);
    return {
      query: term,
      kind: 'record-ref',
      results: record ? [{ type: 'record', url: `/tx/${record.ref}`, record: publicRecord(record) }] : [],
    };
  }

  if (/^[0-9a-f]{64}$/.test(normalized)) {
    const block = store.getBlockByHash(normalized);
    if (block) {
      return {
        query: term,
        kind: 'block-hash',
        results: [{ type: 'block', url: `/block/${block.height}`, block: publicBlock(block) }],
      };
    }
    const records = store.getRecordsByHash(normalized);
    return {
      query: term,
      kind: 'record-hash',
      results: records.map((record) => ({ type: 'record', url: `/tx/${record.ref}`, record: publicRecord(record) })),
    };
  }

  if (/^\d{1,15}$/.test(normalized)) {
    const value = Number.parseInt(normalized, 10);
    /** @type {object[]} */
    const results = [];
    const record = store.getRecordById(value);
    if (record) results.push({ type: 'record', url: `/tx/${record.ref}`, record: publicRecord(record) });
    const block = store.getBlockByHeight(value);
    if (block) results.push({ type: 'block', url: `/block/${block.height}`, block: publicBlock(block) });
    return { query: term, kind: 'number', results };
  }

  return { query: term, kind: 'unsupported', results: [] };
}

/**
 * @param {import('../store/store.js').ChatScanStore} store
 * @param {string} ref
 */
export function lookupRecord(store, ref) {
  const parsed = parseRef(ref);
  if (!parsed) {
    throw badRequest('invalid_ref', 'A record reference looks like {HASH}/{ID-number}, e.g. d700bc90.../42.');
  }
  const record = store.getRecord(parsed.hash, parsed.id);
  if (!record) throw notFound(`No message record indexed at ${ref}.`);
  return record;
}

/**
 * @param {import('../store/store.js').ChatScanStore} store
 * @param {string} idOrHash
 */
export function lookupBlock(store, idOrHash) {
  const value = String(idOrHash ?? '').toLowerCase();
  const block = /^\d{1,15}$/.test(value)
    ? store.getBlockByHeight(Number.parseInt(value, 10))
    : store.getBlockByHash(value);
  if (!block) throw notFound(`No block indexed at ${idOrHash}.`);
  return block;
}

/**
 * @param {URLSearchParams} query
 * @param {number} [defaultLimit]
 */
export function pagination(query, defaultLimit = 25) {
  const limit = clampInt(query.get('limit'), defaultLimit, 1, MAX_PAGE_SIZE);
  const offset = clampInt(query.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  return { limit, offset };
}

/**
 * @param {string | null} value
 */
function optionalStatus(value) {
  if (!value) return undefined;
  const status = value.toLowerCase();
  if (!Object.hasOwn(RECORD_STATUS, status)) {
    throw badRequest('invalid_status', `"status" must be one of: ${Object.keys(RECORD_STATUS).join(', ')}.`);
  }
  return status;
}

/** @param {string | null} value */
function normalizeHexQuery(value) {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw badRequest('invalid_channel', '"channel" must be a 64-character hex digest.');
  }
  return normalized;
}

/**
 * @param {string | null} raw
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
function clampInt(raw, fallback, min, max) {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Ingest is open when no keys are configured (local development) and key-gated
 * otherwise.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('../config.js').Config} config
 */
function requireIngestKey(req, config) {
  if (config.ingestKeys.length === 0) return;

  const header = String(req.headers.authorization ?? '');
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const presented = bearer || String(req.headers['x-chatscan-key'] ?? '');
  if (!presented) throw unauthorized();

  const matches = config.ingestKeys.some((key) => safeEqual(key, presented));
  if (!matches) throw unauthorized('The presented ingest key was not recognised.');
}

/**
 * @param {string} a
 * @param {string} b
 */
function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
