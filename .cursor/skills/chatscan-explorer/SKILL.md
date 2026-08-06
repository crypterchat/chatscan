---
name: chatscan-explorer
description: Guides work on the ChatScan Block Explorer - adding or changing pages, REST endpoints, record fields, the X11 chain, or the Webflow-derived UI. Use when editing anything under src/, public/ or test/ in the chatscan repository, when adding a field to a message record, when touching the ingest API, or when a change could affect what the explorer stores or displays.
---

# Working on the ChatScan Block Explorer

ChatScan indexes **end-to-end encrypted CrypterChat messages** on the X11 blockchain. Each message is addressed as
`{HASH}/{ID-number}` and its content is never viewable. Read [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md)
before a non-trivial change.

## Non-negotiables

1. **Never accept or store message content.** The ingest allowlist lives in `ALLOWED_SUBMISSION_FIELDS`
   (`src/core/records.js`) and the denylist of content-carrying field names sits directly above it. A new field must be
   metadata that a client can compute without revealing the message.
2. **Never bypass the public projections.** API responses and pages must go through `publicRecord()` and
   `publicBlock()`. Adding a stored field does not expose it until it is listed there on purpose.
3. **Keep `{HASH}/{ID-number}` canonical.** Build references with `formatRef()` and parse them with `parseRef()`; do not
   hand-roll string splits. `/tx/...` and `/record/...` must both resolve.
4. **Zero runtime dependencies.** `package.json` has no `dependencies` block and `node src/index.js` must work straight
   after a clone. Use `node:` built-ins; use `node:test` for tests.
5. **Escape everything.** Render markup with the `html` tagged template from `src/util/html.js`. Only pass
   codebase-authored markup through `raw()`, never request data.

## Where things go

| Change | Files to touch |
| --- | --- |
| New record field | `src/core/records.js` (allowlist, validation, `createRecord`, `publicRecord`), `docs/API.md`, `test/records.test.js` |
| New REST endpoint | `src/http/api.js`, `docs/API.md`, `test/api.test.js` |
| New page | `src/http/views/pages.js` (view), `src/http/pages.js` (route), `test/pages.test.js` |
| New UI component | `src/http/views/components.js`, styles in `public/css/chatscan.css` |
| Consensus or sealing | `src/core/chain.js`, `test/chain.test.js` |
| Index or persistence | `src/store/`, `test/store.test.js` |
| New setting | `src/config.js`, `.env.example`, the README configuration table |

## UI conventions

The design comes from the ChatScan Webflow export. Reuse the existing `f-*` classes (`f-section-large`,
`f-container-regular`, `f-feature-card-filled`, `f-career-row-wrapper`, `f-alert-small`, `f-button-secondary`) rather
than inventing new ones; add a rule to the "Explorer additions" section of `public/css/chatscan.css` only when nothing
fits. Pages are server rendered and must work with JavaScript disabled - `public/js/app.js` is progressive enhancement
only. The Content-Security-Policy forbids inline `<script>` and inline `style` attributes, so put behaviour in
`public/js/app.js` and styling in the stylesheet.

## Verifying a change

```bash
npm test                                    # 63 tests, no network needed
npm start                                   # explorer on http://localhost:3000
npm run seed                                # demo traffic, including one rejected record
npm run send -- "hello"                     # one message; plaintext stays local
curl -s localhost:3000/api/v1/status        # network snapshot
```

Add a test with every behaviour change. When touching privacy-sensitive code, assert the negative too - that a content
field is refused, or that a response has no content key - the way `test/records.test.js` and `test/api.test.js` do.

## X11 notes

The X11 blockchain is still under development. `src/core/x11.js` keeps the eleven reference slots
(blake, bmw, groestl, jh, keccak, skein, luffa, cubehash, shavite, simd, echo) and binds each to a digest Node can
compute today. To adopt the real primitives, edit `X11_ROUNDS`, bump `X11_ALGORITHM_ID`, and leave every caller alone.
Blocks store the identifier they were sealed under, so an existing chain log stays interpretable.
