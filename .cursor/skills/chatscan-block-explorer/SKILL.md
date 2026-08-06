---
name: chatscan-block-explorer
description: Build and maintain the ChatScan Block Explorer for encrypted CrypterChat messages on the X11 Blockchain. Use when working on chatscan, message indexing, explorer UI, X11 blockchain integration, or hash/id message recording.
---

# ChatScan Block Explorer

## Overview

ChatScan is a blockchain-style explorer for end-to-end encrypted messages. It records messages as `{HASH}/{ID-number}` without ever storing or displaying message content.

## Architecture

```
public/          → Webflow UI (index.html, message.html, CSS, JS)
server/          → Express API + X11 blockchain adapter
data/            → Local JSON store (gitignored)
```

## Key Rules

1. **Never store or expose message content** — only SHA-256 hashes and metadata
2. **Explorer ID format**: `{hash}/{id}` (e.g. `/d700bc90.../1`)
3. **Protocols**: X11 Protocol, X11 Protocol C7, X11 Protocol ETH Bridge
4. **Statuses**: `pending`, `confirmed`, `rejected`

## API Integration (CrypterChat app)

Submit messages via `POST /api/messages`:

```json
{
  "hash": "<64-char-hex-sha256>",
  "protocol": "X11 Protocol C7",
  "sizeBytes": 1024
}
```

Or pass `encryptedPayload` — server hashes it and discards the payload.

## Development

```bash
npm install
npm start    # http://localhost:3000
```

## UI

The explorer UI is based on the ChatScan Webflow design. Custom styles live in `public/css/chatscan.webflow.css`. Dynamic data is loaded via `public/js/explorer.js` and `public/js/message.js`.

## X11 Blockchain

The adapter in `server/services/x11-blockchain.js` is the integration point for the X11 chain (under development). Extend it when the chain RPC/SDK becomes available.
