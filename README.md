# ChatScan Block Explorer

ChatScan is the public **block explorer for CrypterChat**. Like a cryptocurrency
explorer tracks transactions, ChatScan tracks every end-to-end encrypted
message sent through the CrypterChat app - but only ever as an opaque
reference:

```
{HASH}/{ID-number}
```

**Message content is never stored, transmitted, or viewable through ChatScan.**
Clients only ever submit the hash of an already-encrypted ciphertext plus a
sequential ledger id; the API rejects any request that even looks like it's
carrying plaintext (see [`server/src/routes/blocks.ts`](server/src/routes/blocks.ts)).

ChatScan is built to index the **X11 Blockchain**, which is currently under
development. A pluggable chain-adapter interface
([`server/src/chain/X11ChainAdapter.ts`](server/src/chain/X11ChainAdapter.ts))
keeps the rest of the app decoupled from the chain client, so the mock
implementation used today can be swapped for a real X11 RPC client without
touching the API, store, or UI.

## Project layout

```
chatscan/
├── server/   Express + TypeScript API and ledger index
└── client/   Vite + React + TypeScript explorer UI
```

### `server/` - ChatScan API

- `src/types.ts` - the `BlockRecord` shape: `id`, `hash`, `protocol`,
  `status`, timestamps, and an optional chain reference. No content field
  exists anywhere in the schema.
- `src/chain/X11ChainAdapter.ts` - interface the rest of the app depends on.
- `src/chain/MockX11ChainAdapter.ts` - simulates the X11 network (pending →
  confirmed/rejected transitions, network stats) until the real chain ships.
- `src/store/blockStore.ts` - file-backed ledger index with hash/id lookup,
  search, pagination, and status filtering. Validates that submitted hashes
  look like hex digests, not arbitrary strings.
- `src/routes/blocks.ts` - `POST /api/blocks` (submit a hash), `GET
  /api/blocks` (list/search), `GET /api/blocks/:hash/:id` (single record).
  The POST handler allow-lists `hash`/`protocol` fields and explicitly
  rejects any `content`/`message`/`plaintext`/`body`/`text`/`msg`/`payload`
  field as defense-in-depth.
- `src/routes/stats.ts` - `GET /api/stats` network/banner stats.

Run it:

```bash
cd server
npm install
cp .env.example .env   # optional, defaults work out of the box
npm run dev             # http://localhost:4000
```

Run tests: `npm test`. Build for production: `npm run build && npm start`.

### `client/` - ChatScan explorer UI

A Vite + React + TypeScript single-page app, styled after the original
ChatScan Webflow design (see `src/styles/chatscan.css` for the ported design
system). Pages:

- **Explorer home** (`/`) - live network stats banner, search, status
  filters (All / Pending / Confirmed / Rejected), and a paginated list of
  `{hash}/{id}` records.
- **Record detail** (`/block/:hash/:id`) - full reference, protocol, status,
  timestamps, and chain reference for a single record, plus a persistent
  reminder that content is never shown because it was never stored.

Run it:

```bash
cd client
npm install
cp .env.example .env   # optional; defaults to the /api dev proxy
npm run dev             # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:4000` (see
`vite.config.ts`), so run the `server` alongside it for a working app.

Build for production: `npm run build` (outputs to `client/dist`, deployable
to any static host in front of the `server` API).

## Recording a message on ChatScan

Whenever CrypterChat sends an end-to-end encrypted message, the client
(never ChatScan) computes a hash of the ciphertext and posts it:

```bash
curl -X POST http://localhost:4000/api/blocks \
  -H 'Content-Type: application/json' \
  -d '{"hash": "<hex-encoded ciphertext hash>", "protocol": "X11"}'
```

The API assigns the next ledger id, forwards `(hash, id)` to the configured
`X11ChainAdapter`, and returns the public reference:

```json
{ "id": 42, "hash": "d700bc90e3...", "status": "pending", "reference": "d700bc90e3.../42" }
```

That reference - and only that reference - is what ChatScan ever displays.

## The X11 Blockchain

X11 is CrypterChat's in-development blockchain. ChatScan currently talks to
`MockX11ChainAdapter`, a local simulator that mimics realistic confirmation
timing and network stats so the explorer is fully functional today. Once X11
ships, point `server/src/index.ts` at a real adapter implementing
`X11ChainAdapter` - no other code needs to change.

## Security notes

- The API never accepts or persists message content; only hex hashes and
  metadata are stored (see `isValidHash` in `server/src/store/blockStore.ts`).
- Request bodies are capped at 8 KB and CORS is restricted to a configurable
  origin (`CHATSCAN_CORS_ORIGIN`).
- `npm audit` currently flags a moderate/high advisory range for
  `react-router` in the client; the installed version (`7.18.2`) is the
  patched release per the [upstream advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2),
  and the flagged issue only affects unstable RSC APIs, which this app does
  not use.
