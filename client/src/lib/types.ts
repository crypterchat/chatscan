export type BlockStatus = "pending" | "confirmed" | "rejected";

export interface BlockRecord {
  id: number;
  hash: string;
  protocol: string;
  status: BlockStatus;
  createdAt: string;
  confirmedAt?: string;
  chainRef?: string;
  reference: string;
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
  totalIndexed: number;
}

export interface BlockListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: BlockRecord[];
}
