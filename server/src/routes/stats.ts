import { Router } from "express";
import type { BlockStore } from "../store/blockStore.js";
import type { X11ChainAdapter } from "../chain/X11ChainAdapter.js";

export function createStatsRouter(store: BlockStore, chain: X11ChainAdapter): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const networkStats = await chain.getNetworkStats();
    return res.json({
      ...networkStats,
      totalIndexed: store.count(),
    });
  });

  return router;
}
