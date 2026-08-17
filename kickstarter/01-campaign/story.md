# ChatScan Block Explorer

## The problem

Most “private” messengers still leave a readable trail: who talked, when, and sometimes what. Blockchain explorers for crypto show transaction amounts and addresses in the clear. That model does not work for private chat.

People who value privacy need a public audit trail that proves a message existed — without ever exposing the message itself.

## The solution

**ChatScan** is a blockchain-style explorer for **CrypterChat**, designed for the **X11 Blockchain** (under development).

Every encrypted message is recorded as:

```text
{HASH}/{ID-number}
```

Example:

```text
d700bc90e31d51c5ea22dbb03114e1791ef1da92d3ee06104216cdb9571327a8/14
```

- The **hash** is a commitment to the encrypted payload.
- The **ID** is the explorer’s sequential record number.
- The **message body is never stored or shown** on ChatScan.

If you open a record, you see protocol, status, chain metadata, and size — not the conversation.

## Why it matters

- **Privacy by design:** end-to-end encryption stays end-to-end.
- **Public accountability:** anyone can verify that a message commitment was recorded.
- **Decentralized path:** built for CrypterChat contributors on X11.
- **Familiar UX:** looks like a block explorer, but for chat commitments — not wallets.

## What exists today (working demo)

We already shipped an open-source ChatScan prototype:

- Live explorer UI (CrypterChat-branded)
- API that lists and records `HASH/ID` entries
- Hard rejection of plaintext message fields
- Network / 24h / value-per-TX status panels
- GitHub: https://github.com/crypterchat/chatscan

## What your pledge funds

1. **X11 node integration** — connect ChatScan to the developing X11 chain (RPC, confirmations, fees).
2. **Production explorer** — search, pagination, status filters, mobile layout hardening.
3. **CrypterChat app bridge** — automatic hash posting from the messenger (no plaintext path).
4. **Security review** — independent review of hash commitment + API surface.
5. **Docs & contributor onboarding** — so the community can run and extend ChatScan.

## Timeline (stretch-aware)

| Milestone | Target |
|-----------|--------|
| Public explorer hardening | Month 1 |
| X11 testnet adapter | Months 2–3 |
| CrypterChat client bridge | Months 3–4 |
| Security review + docs | Month 5 |
| Mainnet-ready explorer | Month 6 |

## Risks & challenges (honest)

- **X11 is under development** — shipping depends on chain readiness; we will ship against a local/test adapter first so ChatScan stays usable.
- **Software campaigns are hard on Kickstarter** — Apps success rates are low; we set a **minimum viable goal** and ship incremental public releases.
- **Privacy expectations are strict** — we will never display message contents; if a feature requires plaintext, we will not build it.

## Who we are

**CrypterChat** — communication in the safe way.  
ChatScan.org | Blockchain (Chat) Explorer  
Open source: https://github.com/crypterchat/chatscan

## Call to action

If you believe private messaging deserves a public explorer that still protects content, back ChatScan.

Pledge → unlock early explorer access, contributor badges, and help fund the X11 integration path.

**For the people who value online privacy.**
