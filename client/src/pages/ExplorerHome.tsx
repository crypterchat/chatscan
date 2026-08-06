import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchBlocks, fetchStats } from "../lib/api";
import type { BlockListResponse, BlockStatus, NetworkStats } from "../lib/types";
import { Banner } from "../components/Banner";
import { Header } from "../components/Header";
import { StatsCards } from "../components/StatsCards";
import { SearchBar } from "../components/SearchBar";
import { BlockList } from "../components/BlockList";
import { Footer } from "../components/Footer";

const PAGE_SIZE = 10;
const STATS_POLL_MS = 5000;
const LIST_POLL_MS = 5000;

export function ExplorerHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const status = (searchParams.get("status") as BlockStatus | null) ?? "all";

  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [list, setList] = useState<BlockListResponse>({ total: 0, page: 1, pageSize: PAGE_SIZE, items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const result = await fetchBlocks({
        page,
        pageSize: PAGE_SIZE,
        status: status === "all" ? undefined : status,
        q: q || undefined,
      });
      setList(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load message records.");
    } finally {
      setLoading(false);
    }
  }, [page, status, q]);

  useEffect(() => {
    setLoading(true);
    loadList();
    const interval = setInterval(loadList, LIST_POLL_MS);
    return () => clearInterval(interval);
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const result = await fetchStats();
        if (!cancelled) setStats(result);
      } catch {
        // Stats are best-effort; the explorer still works without the banner numbers.
      }
    }
    loadStats();
    const interval = setInterval(loadStats, STATS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  return (
    <>
      <Banner />
      <div className="f-section-large">
        <div className="f-container-regular">
          <Header stats={stats} />
          <div className="f-margin-bottom-64">
            <StatsCards stats={stats} />
          </div>
        </div>
      </div>

      <div className="f-section-large" style={{ paddingTop: 0 }}>
        <div className="f-container-regular">
          <div className="f-margin-bottom-32">
            <SearchBar />
          </div>

          {q && (
            <p className="f-paragraph-small f-text-color-gray-500 f-margin-bottom-16">
              Showing results for &ldquo;{q}&rdquo; -{" "}
              <button
                type="button"
                onClick={() => updateParams({ q: undefined, page: undefined })}
                style={{ border: "none", background: "none", color: "#642eff", cursor: "pointer", padding: 0 }}
              >
                clear
              </button>
            </p>
          )}

          <BlockList
            items={list.items}
            total={list.total}
            page={list.page}
            pageSize={list.pageSize}
            status={status}
            loading={loading}
            error={error}
            onStatusChange={(next) => updateParams({ status: next === "all" ? undefined : next, page: undefined })}
            onPageChange={(next) => updateParams({ page: String(next) })}
          />

          <div className="cs-privacy-note" style={{ marginTop: 40 }}>
            <span aria-hidden="true">🔒</span>
            <span>
              ChatScan only ever indexes the cryptographic hash of an end-to-end encrypted message and its ledger
              id. Message content is generated, encrypted, and decrypted entirely on end-user devices - it is never
              sent to, stored by, or viewable through ChatScan or the X11 Blockchain.
            </span>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
