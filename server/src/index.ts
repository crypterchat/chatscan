import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { BlockStore } from "./store/blockStore.js";
import { MockX11ChainAdapter } from "./chain/MockX11ChainAdapter.js";
import { createBlocksRouter } from "./routes/blocks.js";
import { createStatsRouter } from "./routes/stats.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 4000);
const DATA_FILE = process.env.CHATSCAN_DATA_FILE ?? join(__dirname, "..", "data", "ledger.json");
const ALLOWED_ORIGIN = process.env.CHATSCAN_CORS_ORIGIN ?? "http://localhost:5173";

const store = new BlockStore(DATA_FILE);

// Swap this line for a real client once the X11 Blockchain is live - every
// other module only depends on the X11ChainAdapter interface.
const chain = new MockX11ChainAdapter();

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));
// Small body limit: valid requests only ever carry a hash + short protocol tag.
app.use(express.json({ limit: "8kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", chain: chain.name, protocolVersion: chain.protocolVersion });
});

app.use("/api/blocks", createBlocksRouter(store, chain));
app.use("/api/stats", createStatsRouter(store, chain));

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[ChatScan API]", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`ChatScan Block Explorer API listening on http://localhost:${PORT}`);
  console.log(`Indexing chain: ${chain.name} (${chain.protocolVersion})`);
});
