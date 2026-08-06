# ChatScan Block Explorer

A blockchain-style explorer for encrypted messages sent through [CrypterChat](https://crypter.chat). Built for the **X11 Blockchain** (under development).

Every message is recorded as `{HASH}/{ID-number}`. Message contents are **never stored or viewable** — only cryptographic hashes and metadata are indexed.

## Features

- Real-time network stats (transaction count, TPS, unconfirmed messages)
- Message list with `{hash}/{id}` explorer links
- Message detail pages at `/{hash}/{id}`
- REST API for CrypterChat app integration
- X11 Blockchain adapter for message submission

## Quick Start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## API

### Submit a message (from CrypterChat app)

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"hash":"<sha256-hex>","protocol":"X11 Protocol C7","sizeBytes":1024}'
```

Or provide an encrypted payload — only its SHA-256 hash is stored:

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"encryptedPayload":"<encrypted-blob>","protocol":"X11 Protocol"}'
```

### List messages

```
GET /api/messages?limit=50&offset=0&status=pending
```

### Get message by hash/id

```
GET /api/messages/{hash}/{id}
```

### Network stats

```
GET /api/stats
```

## Message Format

| Field | Description |
|-------|-------------|
| `hash` | SHA-256 hash of the encrypted message |
| `id` | Sequential message ID on the X11 chain |
| `explorerId` | `{hash}/{id}` — the public explorer identifier |
| `protocol` | X11 protocol variant |
| `status` | `pending`, `confirmed`, or `rejected` |
| `encrypted` | Always `true` — content is never exposed |

## Privacy

ChatScan records **metadata only**. Encrypted message bodies are hashed at submission time and immediately discarded. The explorer cannot decrypt or display message content.

## License

MIT — see [LICENSE](LICENSE)
