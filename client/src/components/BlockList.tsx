import type { BlockRecord, BlockStatus } from "../lib/types";
import { BlockRow } from "./BlockRow";

const STATUS_FILTERS: { label: string; value: BlockStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Rejected", value: "rejected" },
];

interface Props {
  items: BlockRecord[];
  total: number;
  page: number;
  pageSize: number;
  status: BlockStatus | "all";
  loading: boolean;
  error: string | null;
  onStatusChange: (status: BlockStatus | "all") => void;
  onPageChange: (page: number) => void;
}

export function BlockList({ items, total, page, pageSize, status, loading, error, onStatusChange, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="f-career-wrapper">
      <div className="cs-status-tabs">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`cs-status-tab${status === filter.value ? " is-active" : ""}`}
            onClick={() => onStatusChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="f-margin-bottom-40">
        <div className="w-layout-grid f-career-table">
          <div className="f-career-position-block-title">
            <h6 className="f-heading-detail-small">Reference (hash / id)</h6>
          </div>

          {loading && <div className="cs-loading-state">Loading records…</div>}

          {!loading && error && <div className="cs-error-state">{error}</div>}

          {!loading && !error && items.length === 0 && (
            <div className="cs-empty-state">No message records match this search yet.</div>
          )}

          {!loading &&
            !error &&
            items.map((record) => <BlockRow key={`${record.hash}/${record.id}`} record={record} />)}
        </div>
      </div>

      {!loading && !error && total > pageSize && (
        <div className="cs-pagination">
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <div className="cs-pagination-label">
            Page {page} of {totalPages}
          </div>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
