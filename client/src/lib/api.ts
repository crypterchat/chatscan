import type { BlockListResponse, BlockRecord, BlockStatus, NetworkStats } from "./types";

const API_BASE = import.meta.env.VITE_CHATSCAN_API_BASE ?? "/api";

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Request failed with status ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}

export function fetchStats(): Promise<NetworkStats> {
  return request<NetworkStats>("/stats");
}

export function fetchBlocks(params: { page?: number; pageSize?: number; status?: BlockStatus; q?: string }): Promise<BlockListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  return request<BlockListResponse>(`/blocks${qs ? `?${qs}` : ""}`);
}

export function fetchBlockByReference(hash: string, id: string | number): Promise<BlockRecord> {
  return request<BlockRecord>(`/blocks/${encodeURIComponent(hash)}/${encodeURIComponent(String(id))}`);
}

/** Records a new (already encrypted) message hash on the explorer. Never send plaintext here. */
export function submitMessageHash(hash: string, protocol?: string): Promise<BlockRecord> {
  return request<BlockRecord>("/blocks", {
    method: "POST",
    body: JSON.stringify({ hash, ...(protocol ? { protocol } : {}) }),
  });
}

export { ApiError };
