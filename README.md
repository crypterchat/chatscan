# ChatScan Block Explorer

ChatScan is the block explorer for **CrypterChat**. It works like a blockchain explorer, but instead of tracking cryptocurrency transactions it tracks **end-to-end encrypted messages**.

Every message sent through the CrypterChat app is recorded in ChatScan as:

```
{HASH}/{ID-number}
```

- **HASH** — the 64-character hex digest of the encrypted message. The CrypterChat client computes this locally; the plaintext never leaves the sender's device.
- **ID-number** — a sequential ledger ID assigned by ChatScan when the record is accepted.

Message contents are **never viewable**: the API only accepts hash digests, and requests that include content-like fields (`content`, `message`, `body`, `text`, `plaintext`, `payload`) are rejected outright.

## X11 Blockchain

ChatScan is designed to anchor its records to the **X11 Blockchain**, which is currently under development. Until the network ships, the bundled adapter (`lib/x11-chain.js`) runs a local devnet simulation: it batches pending records into blocks on a fixed interval, using the same interface the live chain will expose. When X11 goes live, set `X11_RPC_URL` and wire the adapter's block loop to the real node — nothing else in the app needs to change.

## Running

Requires Node.js 18+. There are no npm dependencies.

```bash
npm start          # serves the explorer on http://localhost:3000
npm test           # runs the API test suite
```

Configuration (environment variables):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `CHATSCAN_DATA` | `data/ledger.ndjson` | Append-only ledger file |
| `X11_BLOCK_INTERVAL_MS` | `15000` | Devnet block interval |
| `X11_RPC_URL` | unset | Future: live X11 node RPC endpoint |

## API

| Method & path | Description |
|---|---|
| `POST /api/messages` | Record a message. Body: `{"hash": "<64-hex digest>"}`. Returns `{"record": "{HASH}/{ID}", ...}`. Idempotent per hash. |
| `GET /api/messages` | List recent records (`limit`, `offset`). |
| `GET /api/messages/<query>` | Look up by ID, by hash, or by full `hash/id` reference. |
| `GET /api/stats` | Ledger totals, TPS, and X11 chain status. |

Example:

```bash
curl -s -X POST http://localhost:3000/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"hash":"d700bc90e31d51c5ea22dbb03114e1791ef1da92d3ee06104216cdb9571327a8"}'
```

## Project layout

```
server.js            HTTP server: static UI + JSON API (no dependencies)
lib/ledger.js        Append-only {HASH}/{ID} ledger (NDJSON persistence)
lib/x11-chain.js     X11 Blockchain adapter (devnet simulation until X11 ships)
public/              Explorer UI (Webflow-based chatscan design)
test/api.test.js     API and privacy-guarantee tests
```

## Privacy guarantees

1. Only 64-hex digests are accepted — the server refuses any payload carrying plaintext-like fields.
2. The ledger stores nothing but `id`, `hash`, `ref`, `protocol`, `status`, `block`, and `recordedAt`.
3. Records are immutable: the ledger is append-only and duplicate hashes return the original record.
