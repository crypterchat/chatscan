/**
 * Core domain types for the ChatScan Block Explorer.
 *
 * ChatScan never stores or exposes plaintext message content. Every record
 * only ever carries the ciphertext hash and a sequential ledger id, mirroring
 * how a cryptocurrency explorer indexes transaction hashes without knowing
 * what they represent.
 */

export type BlockStatus = "pending" | "confirmed" | "rejected";

export interface BlockRecord {
  /** Sequential ledger id, unique per record. Combined with `hash` this forms the public reference `{hash}/{id}`. */
  id: number;
  /** Hash of the end-to-end encrypted message ciphertext. Content is never derivable from this value. */
  hash: string;
  /** Protocol/version tag reported by the submitting client (e.g. "X11", "C7"). */
  protocol: string;
  status: BlockStatus;
  createdAt: string;
  confirmedAt?: string;
  /** Opaque reference returned by the chain adapter (e.g. block height / tx pointer on X11). */
  chainRef?: string;
}

export interface NetworkStats {
  networkStatus: "online" | "degraded" | "offline";
  chainName: string;
  chainVersion: string;
  unconfirmedCount: number;
  unconfirmedSizeBytes: number;
  txCount24h: number;
  tps: number;
  avgFeeUsd: number;
  updatedAt: string;
}

/** Public, URL-safe reference string in the required `{HASH}/{ID-number}` format. */
export function formatReference(hash: string, id: number): string {
  return `${hash}/${id}`;
}
