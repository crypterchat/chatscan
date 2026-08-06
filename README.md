# ChatScan Block Explorer

ChatScan is the blockchain (chat) explorer for **CrypterChat** on the **X11 Blockchain**.

It tracks encrypted messages as opaque commitments:

```text
{HASH}/{ID-number}
```

Message contents are end-to-end encrypted and are **not** viewable on ChatScan.

## Quick start

```bash
npm install
npm start
```

Open [http://localhost:3847](http://localhost:3847).

## Features

- Webflow-derived ChatScan explorer UI
- Live Hash ID index (`hash/id`)
- Network / 24H / Value-per-TX status panels
- Ingest API that accepts only ciphertext hashes
- Explicit rejection of plaintext message fields
- Designed for CrypterChat ↔ X11 integration

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Service + X11 marker |
| `GET /api/stats` | Fees, unconfirmed pool, TPS |
| `GET /api/messages` | List encrypted message records |
| `GET /api/messages/:ref` | Lookup by hash or `hash/id` |
| `POST /api/messages` | Record `{ hash, protocol? }` |

## Privacy

ChatScan never stores or returns message bodies. Public records always include:

- `content: null`
- `encrypted: true`
- `contentNote` explaining E2EE

## Agent skill

Project skill for Cursor agents:

`.cursor/skills/chatscan-block-explorer/SKILL.md`

## License

MIT © CrypterChat
