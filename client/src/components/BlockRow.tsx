import { Link } from "react-router-dom";
import type { BlockRecord } from "../lib/types";
import { formatTimestamp, truncateHash } from "../lib/format";
import { StatusBadge } from "./StatusBadge";

export function BlockRow({ record }: { record: BlockRecord }) {
  return (
    <Link to={`/block/${record.hash}/${record.id}`} className="f-career-row-wrapper">
      <div className="w-layout-grid f-career-row">
        <div className="cs-row-meta">
          <div className="f-paragraph-regular cs-mono" title={record.hash}>
            Hash: {truncateHash(record.hash)}
            <span className="cs-reference-id">/{record.id}</span>
          </div>
          <div className="cs-timestamp">{formatTimestamp(record.createdAt)}</div>
        </div>
        <div>
          <div className="f-paragraph-regular f-text-color-gray-500">{record.protocol}</div>
        </div>
        <div style={{ justifySelf: "end" }}>
          <StatusBadge status={record.status} />
        </div>
      </div>
    </Link>
  );
}
