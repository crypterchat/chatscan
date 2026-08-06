# ChatScan Block Explorer

ChatScan is a block explorer for **encrypted messages** instead of coin transfers. Every message sent through
CrypterChat is recorded on the chain and addressed in the explorer as:

```
{HASH}/{ID-number}
```

for example `d700bc90e31d51c5ea22dbb03114e1791ef1da92d3ee06104216cdb9571327a8/42`.

Message **content is never viewable**. CrypterChat encrypts messages end-to-end on the client, so the only thing
ChatScan ever receives is a digest of the ciphertext, its byte length, and opaque routing metadata. The ingest API
refuses any request that carries message content, and the explorer has no code path that could render it.

The explorer targets the **X11 blockchain**, which is still under development. Until the reference X11 primitives are
available, the node runs a local X11-compatible chain (`x11-devnet`) that keeps the eleven-round hash structure - see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#x11-hashing).

## Quick start

Requires **Node.js 20.11 or newer**. There are no dependencies to install.

```bash
git clone https://github.com/crypterchat/chatscan.git
cd chatscan
npm start                        # http://localhost:3000
```

In a second terminal, fill the explorer with demo traffic:

```bash
npm run seed                     # 40 encrypted message records (one is a deliberate replay)
npm run send -- "hello world"    # one message; the plaintext never leaves your machine
```

Then open <http://localhost:3000>.

Run the test suite (64 tests, no network access needed):

```bash
npm test
```

## What the explorer shows

| Page | What it does |
| --- | --- |
| `/` | Live dashboard: fee estimate, unconfirmed records, throughput, latest records and blocks |
| `/tx/{HASH}/{ID-number}` | One message record: reference, ciphertext digest, size, protocol, block, status |
| `/block/{height}` | One sealed X11 block and the records inside it |
| `/blocks` | Paged list of sealed blocks |
| `/search?q=` | Lookup by reference, record hash, block hash, height or ID-number |
| `/privacy` | The exact fields ChatScan stores, and everything it refuses |

`/record/{HASH}/{ID-number}` is an alias of `/tx/...`.

## Recording a message

A CrypterChat client encrypts the message, hashes the ciphertext, and submits **metadata only**:

```bash
curl -X POST http://localhost:3000/api/v1/records \
  -H 'content-type: application/json' \
  -d '{
        "ciphertextHash": "3f2a...64 hex chars...b1",
        "size": 1024,
        "protocol": "C7",
        "channelHash": "9c81...64 hex chars...0e",
        "nonce": "8f14e45fceea167a5a36dedd4bea2543",
        "fee": 0.00042,
        "appVersion": "cc-1.0"
      }'
```

```json
{
  "ref": "d700bc90...27a8/42",
  "hash": "d700bc90...27a8",
  "id": 42,
  "status": "pending",
  "explorerUrl": "/tx/d700bc90...27a8/42"
}
```

Sending a `content`, `body`, `text`, `message`, `plaintext`, `payload` or `attachment` field fails with HTTP 400 and
`"code": "content_rejected"`. See [docs/API.md](docs/API.md) for the full REST reference, and
`scripts/send-message.js` for a working client that encrypts locally and submits only the digest.

## Configuration

Every setting is an environment variable; the defaults run a self-contained local node.

| Variable | Default | Purpose |
| --- | --- | --- |
| `CHATSCAN_PORT` | `3000` | HTTP port (`PORT` also works) |
| `CHATSCAN_HOST` | `0.0.0.0` | Bind address |
| `CHATSCAN_NETWORK` | `x11-devnet` | Network name shown in the UI |
| `CHATSCAN_CHAIN_ID` | `x11:dev` | Chain identifier mixed into record hashes |
| `CHATSCAN_DATA_DIR` | `./data` | Where the append-only chain log lives |
| `CHATSCAN_PERSIST` | `true` | Set to `false` for an in-memory node |
| `CHATSCAN_BLOCK_INTERVAL_MS` | `15000` | How often the sealer runs |
| `CHATSCAN_MAX_RECORDS_PER_BLOCK` | `64` | Seals early once the mempool is this full |
| `CHATSCAN_DIFFICULTY_NIBBLES` | `2` | Leading zero nibbles required of a block hash |
| `CHATSCAN_SEALER_ENABLED` | `true` | Set to `false` to index without sealing |
| `CHATSCAN_INGEST_KEYS` | _(empty)_ | Comma-separated keys; ingest is open when unset |
| `CHATSCAN_INGEST_RATE_PER_MINUTE` | `600` | Per-client ingest limit |
| `CHATSCAN_MAX_REQUEST_BYTES` | `16384` | Request body ceiling |
| `CHATSCAN_MAX_CIPHERTEXT_BYTES` | `4194304` | Largest ciphertext length a record may declare |
| `CHATSCAN_FEE_QUOTE_USD` | `21.546` | Base fee quote shown as "AT Fee" |

Copy [.env.example](.env.example) if you prefer to keep them in a file and export it with your process manager.

## Project layout

```
src/core/      X11 hashing, merkle roots, record model, chain and sealer
src/store/     In-memory index plus the append-only chain log
src/http/      Router, REST API, SSE stream, static assets, server-rendered pages
src/http/views ChatScan UI (Webflow design system, rendered server side)
public/        Stylesheet, progressive-enhancement script, images
scripts/       Demo client and seeder
test/          node:test suite
docs/          API reference and architecture notes
```

The UI is built from the ChatScan Webflow design (`chatscan.webflow.io`): the same `f-*` component classes and tokens,
rendered server side so every record has a shareable URL and the explorer works without JavaScript.

## Licence

MIT - see [LICENSE](LICENSE).
