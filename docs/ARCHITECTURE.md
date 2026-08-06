# ChatScan architecture

ChatScan is one Node process with no runtime dependencies: an HTTP server, an in-memory index, and an append-only log
on disk. `node src/index.js` is the whole deployment.

```
CrypterChat client                    ChatScan node
------------------                    -------------
encrypt(message)  ──▶ ciphertext
hash(ciphertext)  ──▶ digest ──POST──▶ validate ──▶ mempool ──▶ sealer ──▶ X11 block
                                          │                                  │
plaintext stays on the client             └──────────▶ index ◀───────────────┘
                                                        │
                                              explorer pages + REST API
```

## Modules

| Path | Responsibility |
| --- | --- |
| `src/config.js` | Reads every setting from the environment once, at startup |
| `src/core/x11.js` | The eleven-round X11 hash chain and canonical serialisation |
| `src/core/merkle.js` | Merkle root over the record hashes in a block |
| `src/core/records.js` | Record model: validation, hashing, `{HASH}/{ID-number}` references, public projection |
| `src/core/chain.js` | `ChatScanNode`: genesis, admission policy, block sealing |
| `src/core/network.js` | The status snapshot the dashboard and `/api/v1/status` share |
| `src/store/store.js` | In-memory index and aggregates, plus the event emitter behind the SSE stream |
| `src/store/chain-log.js` | Append-only JSONL log and replay |
| `src/http/*` | Router, REST API, SSE, static assets, server-rendered pages |
| `src/http/views/*` | The ChatScan UI, built from the Webflow design system |

## Message records

A record is the chain's unit of work - the encrypted-message equivalent of a transaction. It holds ciphertext
*metadata* only:

- `ciphertextHash` - digest of the encrypted payload, computed by the client
- `size` - ciphertext length in bytes
- `protocol`, `channelHash`, `nonce`, `fee`, `appVersion` - all optional except the protocol default

The record hash is `x11(canonical({ chainId, id, ciphertextHash, size, protocol, channelHash, nonce, receivedAt }))`,
and the explorer reference is `{hash}/{id}` where `id` is a monotonic ID-number starting at 1. Because the ID-number is
part of the preimage, the hash and the ID cannot be recombined into a different valid reference.

`publicRecord()` in `src/core/records.js` is the only projection used by the API and the pages. Adding a field to the
index does not expose it: it has to be listed there explicitly.

### Why content cannot leak

1. `normalizeSubmission()` runs a content-field denylist first, then an allowlist of the seven accepted fields.
2. The store has no field capable of holding content, and the chain log only ever serialises stored records.
3. Responses go through `publicRecord()` / `publicBlock()`.
4. Pages render through an escaping `html` tagged template (`src/util/html.js`), so untrusted text cannot become
   markup either.

`test/records.test.js` and `test/api.test.js` assert each of these.

## Admission and rejection

| Outcome | HTTP | Indexed | When |
| --- | --- | --- | --- |
| Accepted | 201 | yes, `pending` | Valid submission |
| Policy rejection | 202 | yes, `rejected` | Replayed ciphertext digest + nonce, or over the protocol's size ceiling |
| Structural rejection | 400 | no | Content field, unknown field, bad hash, bad size, unknown protocol |

Policy rejections stay in the index so the explorer can show them - matching the "Rejected" state in the design - while
structurally invalid submissions never enter it.

## Sealing

The sealer runs every `CHATSCAN_BLOCK_INTERVAL_MS`, and immediately when the mempool reaches
`CHATSCAN_MAX_RECORDS_PER_BLOCK`. It takes pending records oldest first, computes the merkle root, then searches for a
nonce whose X11 header hash has at least `CHATSCAN_DIFFICULTY_NIBBLES` leading zero nibbles. Sealed records move to
`confirmed` and gain `blockHeight`, `blockHash` and `indexInBlock`.

Genesis is height 0 with no records and a previous hash of 64 zeros. Each block's timestamp is forced past its parent's,
so ordering is monotonic even if the clock steps backwards.

## X11 hashing

X11 chains eleven distinct hash functions, feeding each digest into the next. The production X11 blockchain is still
under development and Node's OpenSSL build does not ship its reference primitives, so `src/core/x11.js` keeps the
eleven-round structure and the reference slot order while binding each slot to a stand-in digest:

| # | X11 slot | Digest used today |
| --- | --- | --- |
| 1 | blake | `blake2b512` |
| 2 | bmw | `sha3-512` |
| 3 | groestl | `sha512` |
| 4 | jh | `sm3` |
| 5 | keccak | `sha3-256` |
| 6 | skein | `blake2s256` |
| 7 | luffa | `sha384` |
| 8 | cubehash | `sha3-384` |
| 9 | shavite | `ripemd160` |
| 10 | simd | `sha512-256` |
| 11 | echo | `sha256` |

The output is 32 bytes, matching X11. Blocks record the algorithm identifier (`x11-dev-r11`) so stored data stays
interpretable, and `/api/v1/algorithm` publishes the current mapping. Migrating to the real chain means editing
`X11_ROUNDS` and bumping `X11_ALGORITHM_ID`; nothing else depends on the underlying digests.

## Persistence

Each accepted record and each sealed block is appended to `data/chain.jsonl` as one JSON line. Startup replays the file
in order to rebuild the index, so a restart keeps heights, references and confirmations. Writes are serialised through a
promise queue, so log order matches accept order. A corrupt line fails startup loudly rather than silently truncating
the chain. Set `CHATSCAN_PERSIST=false` for an ephemeral node (tests use this).

The index is held in memory, which is the main scaling limit: a node's working set is bounded by the number of records
it has ever seen. Moving the index behind a database would only touch `src/store/`.

## HTTP layer

- Pages are server rendered, so every record has a shareable URL and the explorer works without JavaScript.
  `public/js/app.js` only adds the dropdown cards, a copy button, and a live refresh driven by the SSE stream.
- Responses carry `Content-Security-Policy` (self only, no inline script or style), `X-Content-Type-Options`,
  `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer`.
- Static assets are served from `public/` with an extension allowlist and a resolved-path check against traversal.
- API clients get JSON errors; browsers get the explorer's error page. The choice is made from the path and `Accept`.
- Ingest is rate limited per client address, and key-gated once `CHATSCAN_INGEST_KEYS` is set.
