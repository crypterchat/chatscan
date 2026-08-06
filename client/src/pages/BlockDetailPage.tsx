import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, fetchBlockByReference } from "../lib/api";
import type { BlockRecord } from "../lib/types";
import { formatTimestamp } from "../lib/format";
import { Banner } from "../components/Banner";
import { Footer } from "../components/Footer";
import { StatusBadge } from "../components/StatusBadge";

const POLL_MS = 3000;

export function BlockDetailPage() {
  const { hash = "", id = "" } = useParams();
  const [record, setRecord] = useState<BlockRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchBlockByReference(hash, id);
      setRecord(result);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load this record.");
    }
  }, [hash, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!record || record.status !== "pending") return;
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [record, load]);

  function handleCopy() {
    navigator.clipboard?.writeText(`${hash}/${id}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <Banner />
      <div className="f-section-large">
        <div className="f-container-regular">
          <Link to="/" className="cs-back-link">
            ← Back to explorer
          </Link>

          {error && <div className="cs-error-state">{error}</div>}

          {!error && !record && <div className="cs-loading-state">Loading record…</div>}

          {record && (
            <div className="cs-detail-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div className="f-heading-detail-small f-margin-bottom-12">Message Record</div>
                  <h3 className="f-h3-heading" style={{ fontSize: 32, paddingTop: 0 }}>
                    Reference {record.id}
                  </h3>
                </div>
                <StatusBadge status={record.status} />
              </div>

              <div className="cs-detail-row">
                <div className="cs-detail-label">Reference</div>
                <div className="cs-detail-value cs-mono">
                  {record.hash}/{record.id}{" "}
                  <button type="button" onClick={handleCopy} className="f-button-secondary" style={{ minHeight: 32, padding: "4px 14px", marginLeft: 8 }}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="cs-detail-row">
                <div className="cs-detail-label">Message Hash</div>
                <div className="cs-detail-value cs-mono">{record.hash}</div>
              </div>

              <div className="cs-detail-row">
                <div className="cs-detail-label">Ledger ID</div>
                <div className="cs-detail-value">{record.id}</div>
              </div>

              <div className="cs-detail-row">
                <div className="cs-detail-label">Protocol</div>
                <div className="cs-detail-value">{record.protocol}</div>
              </div>

              <div className="cs-detail-row">
                <div className="cs-detail-label">Submitted</div>
                <div className="cs-detail-value">{formatTimestamp(record.createdAt)}</div>
              </div>

              {record.confirmedAt && (
                <div className="cs-detail-row">
                  <div className="cs-detail-label">Confirmed</div>
                  <div className="cs-detail-value">{formatTimestamp(record.confirmedAt)}</div>
                </div>
              )}

              {record.chainRef && (
                <div className="cs-detail-row">
                  <div className="cs-detail-label">X11 Chain Reference</div>
                  <div className="cs-detail-value cs-mono">{record.chainRef}</div>
                </div>
              )}

              <div className="cs-privacy-note">
                <span aria-hidden="true">🔒</span>
                <span>
                  Message content is end-to-end encrypted between CrypterChat clients and is never transmitted to or
                  stored by ChatScan. Only this hash/id reference is public.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
