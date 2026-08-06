import type { BlockStatus } from "../lib/types";

const CONFIG: Record<BlockStatus, { label: string; iconClass: string; textColor: string }> = {
  confirmed: { label: "Confirmed", iconClass: "f-alert-success", textColor: "#0ebc6e" },
  pending: { label: "Pending", iconClass: "f-alert-pending", textColor: "#f93" },
  rejected: { label: "Rejected", iconClass: "f-alert-danger", textColor: "#ff2e2e" },
};

const ICONS: Record<BlockStatus, JSX.Element> = {
  confirmed: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM11.003 16L18.074 8.929L16.659 7.515L11.003 13.172L8.174 10.343L6.76 11.757L11.003 16Z"
        fill="currentColor"
      />
    </svg>
  ),
  pending: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM13 7V12.414L17 16.414L15.586 17.828L11 13.243V7H13Z"
        fill="currentColor"
      />
    </svg>
  ),
  rejected: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM14.828 15.657L12 12.828L9.172 15.657L8.343 14.828L11.172 12L8.343 9.172L9.172 8.343L12 11.172L14.828 8.343L15.657 9.172L12.828 12L15.657 14.828L14.828 15.657Z"
        fill="currentColor"
      />
    </svg>
  ),
};

export function StatusBadge({ status }: { status: BlockStatus }) {
  const config = CONFIG[status];
  return (
    <div className="f-alert-small" style={{ maxWidth: "none" }}>
      <div className="f-alert-wrapper">
        <div className={config.iconClass} style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, marginRight: 12 }}>
          <div className="f-alert-icon">{ICONS[status]}</div>
        </div>
      </div>
      <div className="f-paragraph-small" style={{ color: config.textColor, fontWeight: 600 }}>
        {config.label}
      </div>
    </div>
  );
}
