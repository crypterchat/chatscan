# ChatScan REST API

Base path: `/api/v1`. Every response is JSON. Errors use:

```json
{ "error": { "code": "content_rejected", "message": "...", "field": "content" } }
```

## Privacy contract

The ingest endpoint accepts a **closed** set of fields. Anything else is refused before the record reaches the index,
so message content cannot be stored even by mistake:

- A request carrying `content`, `body`, `text`, `message`, `plaintext`, `payload`, `data`, `ciphertext`, `subject`,
  `preview`, `attachment` or `attachments` fails with `400 content_rejected`.
- Any other unrecognised field fails with `400 unknown_field`.
- No response includes message content, and `contentAvailable` is always `false`.

## `POST /api/v1/records`

Records one encrypted message. Requires `Content-Type: application/json`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `ciphertextHash` | string | yes | 64 lowercase hex chars. Digest of the encrypted payload, computed on the client |
| `size` | integer | yes | Ciphertext length in bytes, `1..CHATSCAN_MAX_CIPHERTEXT_BYTES` |
| `protocol` | string | no | `C7` (default), `C7G`, `ETH`, `X11` |
| `channelHash` | string | no | 64 hex chars. Opaque conversation identifier |
| `nonce` | string | no | Up to 64 hex chars. Distinguishes repeat sends of an identical ciphertext |
| `fee` | number | no | Non-negative fee paid for inclusion |
| `appVersion` | string | no | Up to 32 chars of `[A-Za-z0-9._+-]` |

Authentication: none while `CHATSCAN_INGEST_KEYS` is unset. Once set, send
`Authorization: Bearer <key>` or `X-ChatScan-Key: <key>`.

**201 Created** - the record entered the mempool:

```json
{
  "ref": "d700bc90...27a8/42",
  "hash": "d700bc90...27a8",
  "id": 42,
  "status": "pending",
  "rejectionReason": null,
  "explorerUrl": "/tx/d700bc90...27a8/42",
  "record": { "...": "see the record object below" }
}
```

**202 Accepted** - the submission was well formed but violated chain policy. It is still indexed, with
`status: "rejected"` and a `rejectionReason` of `replay-detected` (this ciphertext digest and nonce were already
recorded) or `protocol-size-exceeded`.

Other statuses: `400` validation failure, `401` bad ingest key, `413` body over `CHATSCAN_MAX_REQUEST_BYTES`,
`429` over `CHATSCAN_INGEST_RATE_PER_MINUTE`.

## `GET /api/v1/records`

Newest first. Query: `limit` (1-100, default 25), `offset`, `status` (`pending`, `confirmed`, `rejected`),
`protocol`, `channel` (64 hex chars).

```json
{ "total": 128, "limit": 25, "offset": 0, "records": [ { "...": "record object" } ] }
```

## `GET /api/v1/records/{HASH}/{ID-number}`

The record object for one reference. `400 invalid_ref` if the reference is malformed, `404` if it is unknown.

```json
{
  "record": {
    "ref": "d700bc90...27a8/42",
    "hash": "d700bc90...27a8",
    "id": 42,
    "ciphertextHash": "3f2a...b1",
    "size": 1024,
    "protocol": "C7",
    "protocolLabel": "Protocol C7",
    "channelHash": "9c81...0e",
    "fee": 0.00042,
    "appVersion": "cc-1.0",
    "status": "confirmed",
    "rejectionReason": null,
    "receivedAt": "2026-08-06T12:00:00.000Z",
    "confirmedAt": "2026-08-06T12:00:15.000Z",
    "blockHeight": 7,
    "blockHash": "00a1...9f",
    "indexInBlock": 3,
    "encrypted": true,
    "contentAvailable": false
  }
}
```

## `GET /api/v1/blocks`

Newest first. Query: `limit` (1-100, default 10), `offset`.

## `GET /api/v1/blocks/{height|hash}`

One block plus the records it sealed.

```json
{
  "block": {
    "height": 7,
    "hash": "00a1...9f",
    "previousHash": "00b2...c4",
    "merkleRoot": "7de1...aa",
    "timestamp": "2026-08-06T12:00:15.000Z",
    "algorithm": "x11-dev-r11",
    "difficulty": 2,
    "nonce": 431,
    "txCount": 12,
    "sizeBytes": 24576,
    "totalFees": 0.00504,
    "sealedBy": "chatscan-local-sealer",
    "recordRefs": ["d700bc90...27a8/42"]
  },
  "records": [ { "...": "record object" } ]
}
```

## `GET /api/v1/search?q=`

Resolves a `{HASH}/{ID-number}` reference, a 64-hex record or block hash, a block height, or a record ID-number.
`kind` is one of `record-ref`, `record-hash`, `block-hash`, `number`, `empty`, `unsupported`.

```json
{
  "query": "1",
  "kind": "number",
  "results": [{ "type": "record", "url": "/tx/d700bc90...27a8/1", "record": { "...": "" } }]
}
```

## `GET /api/v1/status`

Network snapshot: height, tip hash, sealer settings, fee estimate, unconfirmed count and bytes, throughput, 24-hour
totals, per-record averages, supported protocols, and the privacy statement. This is what the dashboard header renders.

## `GET /api/v1/algorithm`

The eleven X11 rounds in order, with the digest currently bound to each slot.

## `GET /api/v1/stream`

Server-sent events. Emits `status` on connect and on a heartbeat, `record` when a message is indexed, and `block` when
one is sealed. Payloads are the same public objects used elsewhere, so no content is ever streamed.

```bash
curl -N http://localhost:3000/api/v1/stream
```

## `GET /healthz`

Liveness probe: `{ "status": "ok", "uptimeSeconds": 42 }`.
