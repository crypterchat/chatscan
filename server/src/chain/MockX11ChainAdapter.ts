import { EventEmitter } from "node:events";
import type { NetworkStats } from "../types.js";
import type { SubmitOutcome, X11ChainAdapter } from "./X11ChainAdapter.js";

/**
 * Simulated X11 Blockchain client used until the real X11 network ships.
 *
 * It mimics realistic explorer behavior:
 *  - New submissions land as "pending".
 *  - After a short simulated confirmation window they flip to "confirmed"
 *    (~95% of the time) or "rejected" (~5%, e.g. simulated fork/orphan).
 *  - Network stats are derived from recent in-memory activity plus light
 *    randomization so the dashboard banner has believable movement.
 *
 * No message content ever passes through this adapter - only hashes and
 * ledger ids, matching the real X11 integration contract.
 */
export class MockX11ChainAdapter implements X11ChainAdapter {
  readonly name = "X11";
  readonly protocolVersion = "x11-dev-preview";

  private readonly emitter = new EventEmitter();
  private readonly pending = new Set<string>();
  private recentConfirmations: number[] = []; // epoch ms timestamps, for TPS estimate

  private readonly minConfirmMs: number;
  private readonly maxConfirmMs: number;
  private readonly rejectionRate: number;

  constructor(
    opts: { minConfirmMs?: number; maxConfirmMs?: number; rejectionRate?: number } = {}
  ) {
    this.minConfirmMs = opts.minConfirmMs ?? 2_000;
    this.maxConfirmMs = opts.maxConfirmMs ?? 8_000;
    this.rejectionRate = opts.rejectionRate ?? 0.05;
  }

  async submit(hash: string, id: number): Promise<SubmitOutcome> {
    const key = `${hash}/${id}`;
    this.pending.add(key);

    const delay = this.minConfirmMs + Math.random() * (this.maxConfirmMs - this.minConfirmMs);
    setTimeout(() => {
      if (!this.pending.has(key)) return;
      this.pending.delete(key);
      const rejected = Math.random() < this.rejectionRate;
      const status = rejected ? "rejected" : "confirmed";
      if (!rejected) {
        this.recentConfirmations.push(Date.now());
        this.pruneOldConfirmations();
      }
      this.emitter.emit("status", {
        hash,
        id,
        status,
        chainRef: rejected ? undefined : `x11-blk-${Math.floor(Date.now() / 1000)}-${id}`,
      });
    }, delay);

    return { status: "pending" };
  }

  onStatusUpdate(
    listener: (update: { hash: string; id: number; status: "confirmed" | "rejected"; chainRef?: string }) => void
  ): void {
    this.emitter.on("status", listener);
  }

  async getNetworkStats(): Promise<NetworkStats> {
    this.pruneOldConfirmations();
    const tps = this.recentConfirmations.length / 60;
    return {
      networkStatus: "online",
      chainName: this.name,
      chainVersion: this.protocolVersion,
      unconfirmedCount: this.pending.size,
      unconfirmedSizeBytes: this.pending.size * 1876, // avg simulated record size
      txCount24h: this.recentConfirmations.length,
      tps: Number(tps.toFixed(2)),
      avgFeeUsd: 0, // ChatScan messages are feeless; kept for UI parity with the original design
      updatedAt: new Date().toISOString(),
    };
  }

  private pruneOldConfirmations(): void {
    const cutoff = Date.now() - 60_000;
    this.recentConfirmations = this.recentConfirmations.filter((t) => t > cutoff);
  }
}
