# Video recording notes

## Files

| File | Use |
|------|-----|
| `chatscan-kickstarter-campaign.mp4` | **Upload this to Kickstarter** (title card + live demo + end card) |
| `chatscan-kickstarter-demo.mp4` | Raw trimmed UI walkthrough (no cards) |
| `script.md` | Voiceover script — record VO separately and mix in CapCut/DaVinci |

## What the campaign video shows

1. Title card — ChatScan / CrypterChat × X11
2. Live explorer demo — hero, network status, HASH/ID table, detail panel (“content not viewable”), ingest new hash
3. End card — back on Kickstarter CTA

## Before you upload

- [ ] Add voiceover from `script.md` (video is silent)
- [ ] Optional: replace localhost URL with chatscan.org when you have a public deploy
- [ ] Optional: extend to 60–90s with more product story B-roll

## Test status (same session)

- `npm test` — 4/4 passed
- API health OK; plaintext ingest rejected; HASH/ID records return `content: null`
- UI HTTP 200 on `:3847`
