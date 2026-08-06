---
name: chatscan-block-explorer
description: Builds and extends the ChatScan Block Explorer for CrypterChat on the X11 Blockchain. Use when working on ChatScan, encrypted message indexing, HASH/ID records, explorer UI, or the crypterchat/chatscan repository.
disable-model-invocation: true
---

# ChatScan Block Explorer

## What ChatScan is

ChatScan is a blockchain-style explorer for **CrypterChat** encrypted messages on the **X11 Blockchain** (under development).

It does **not** show message contents. Every recorded message is exposed only as:

```text
{HASH}/{ID-number}
```

Example: `d700bc90e31d51c5ea22dbb03114e1791ef1da92d3ee06104216cdb9571327a8/14`

## Hard privacy rules

1. Never store, log, render, or accept plaintext message bodies.
2. API responses must set `content: null` and may include a short note that contents are E2EE.
3. Reject ingest payloads that include `content`, `message`, `plaintext`, `body`, `text`, or `payload`.
4. `hash` must be a 64-character hex SHA-256 digest.

## Repository layout

- `public/` — Webflow-derived explorer UI
- `server/` — Express API + message store
- `data/messages.json` — opaque hash/id records only
- `test/` — privacy and store invariants

## Local run

```bash
npm install
npm start
```

Open `http://localhost:3847`.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness / chain marker |
| GET | `/api/stats` | Network, 24h, fee, TPS |
| GET | `/api/messages` | List `{HASH}/{ID}` records |
| GET | `/api/messages/:ref` | Lookup by hash or `hash/id` |
| POST | `/api/messages` | Record `{ hash, protocol? }` only |

## UI constraints

Preserve the provided ChatScan/Webflow visual language:

- CrypterChat logo as a clear brand mark
- Banner, hero, network cards, Hash ID table, footer
- Status chips for Pending / Confirmed / Rejected
- Show refs as `{HASH}/{ID-number}`, never decrypted bodies

## X11 integration notes

- Default protocol label: `X11-C7`
- Chain field on public records: `X11`
- Keep adapters ready for future X11 node RPC; until then, local store is the source of truth for explorer demos

## Verification checklist

- [ ] `npm test` passes
- [ ] Ingesting plaintext fields returns `400 PLAINTEXT_FORBIDDEN`
- [ ] UI lists refs as `hash/id`
- [ ] Detail panel shows content as not viewable
