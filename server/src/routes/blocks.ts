import { Router } from "express";
import type { BlockStore } from "../store/blockStore.js";
import { isValidHash } from "../store/blockStore.js";
import type { X11ChainAdapter } from "../chain/X11ChainAdapter.js";
import { formatReference } from "../types.js";

const ALLOWED_CREATE_FIELDS = new Set(["hash", "protocol"]);
// Defense-in-depth: ChatScan must never accept plaintext. Reject any request
// body that even looks like it's trying to carry message content, in
// addition to only ever reading the allow-listed fields above.
const FORBIDDEN_FIELD_HINTS = ["content", "message", "plaintext", "body", "text", "msg", "payload"];

export function createBlocksRouter(store: BlockStore, chain: X11ChainAdapter): Router {
  const router = Router();

  chain.onStatusUpdate(({ hash, id, status, chainRef }) => {
    store.updateStatus(hash, id, status, chainRef);
  });

  router.post("/", async (req, res) => {
    const body = req.body ?? {};

    const suspiciousField = Object.keys(body).find((key) =>
      FORBIDDEN_FIELD_HINTS.includes(key.toLowerCase())
    );
    if (suspiciousField) {
      return res.status(400).json({
        error: `Field "${suspiciousField}" is not accepted. ChatScan only indexes message hashes - never plaintext or ciphertext content.`,
      });
    }

    const unknownField = Object.keys(body).find((key) => !ALLOWED_CREATE_FIELDS.has(key));
    if (unknownField) {
      return res.status(400).json({ error: `Unknown field "${unknownField}".` });
    }

    const { hash, protocol } = body as { hash?: unknown; protocol?: unknown };

    if (!isValidHash(hash)) {
      return res.status(400).json({
        error: "`hash` must be a hex-encoded digest of the encrypted message (16-128 hex characters).",
      });
    }

    const protocolTag = typeof protocol === "string" && protocol.trim() ? protocol.trim().slice(0, 32) : chain.name;

    const record = store.create(hash, protocolTag);

    const outcome = await chain.submit(record.hash, record.id);
    const updated = store.updateStatus(record.hash, record.id, outcome.status, outcome.chainRef) ?? record;

    return res.status(201).json({ ...updated, reference: formatReference(updated.hash, updated.id) });
  });

  router.get("/", (req, res) => {
    const { page, pageSize, status, q } = req.query;

    const result = store.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status: typeof status === "string" && ["pending", "confirmed", "rejected"].includes(status) ? (status as any) : undefined,
      query: typeof q === "string" ? q : undefined,
    });

    return res.json({
      ...result,
      items: result.items.map((r) => ({ ...r, reference: formatReference(r.hash, r.id) })),
    });
  });

  router.get("/:hash/:id", (req, res) => {
    const { hash, id } = req.params;
    const numericId = Number(id);

    if (!isValidHash(hash) || !Number.isInteger(numericId)) {
      return res.status(400).json({ error: "Invalid reference. Expected format: {hash}/{id}." });
    }

    const record = store.getByReference(hash, numericId);
    if (!record) {
      return res.status(404).json({ error: `No record found for reference ${formatReference(hash, numericId)}.` });
    }

    return res.json({ ...record, reference: formatReference(record.hash, record.id) });
  });

  return router;
}
