import type { NetworkStats } from "../types.js";

/**
 * ChatScan is built to index the X11 Blockchain, which is currently under
 * development. This interface is the seam between ChatScan's ledger/API
 * layer and the actual chain client. Swap `MockX11ChainAdapter` for a real
 * implementation (e.g. one that talks to an X11 full node RPC endpoint)
 * once the network is live, without touching any other ChatScan code.
 */
export interface SubmitOutcome {
  status: "pending" | "confirmed" | "rejected";
  /** Opaque pointer into the chain (block height, slot, tx index, etc). */
  chainRef?: string;
}

export interface X11ChainAdapter {
  readonly name: string;
  readonly protocolVersion: string;

  /**
   * Submit a message hash + ledger id pair to the chain for inclusion.
   * Implementations MUST NOT accept or forward plaintext message content -
   * only the hash of the ciphertext ever crosses this boundary.
   */
  submit(hash: string, id: number): Promise<SubmitOutcome>;

  /** Subscribe to asynchronous status transitions (pending -> confirmed/rejected). */
  onStatusUpdate(
    listener: (update: { hash: string; id: number; status: "confirmed" | "rejected"; chainRef?: string }) => void
  ): void;

  getNetworkStats(): Promise<NetworkStats>;
}
