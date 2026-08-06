import type { NetworkStats } from "../lib/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function Header({ stats }: { stats: NetworkStats | null }) {
  const online = stats?.networkStatus === "online";

  return (
    <div className="f-margin-bottom-64">
      <div className="w-layout-grid f-header-grid-asymmetrical">
        <div className="f-max-width-large">
          <div className="f-margin-bottom-12">
            <div className="f-logo" aria-hidden="true">
              <svg viewBox="0 0 124 28" role="img" aria-label="CrypterChat">
                <text x="0" y="21" fontFamily="Arial, sans-serif" fontWeight={700} fontSize="22" fill="#160042">
                  CrypterChat
                </text>
              </svg>
            </div>
            <div className="f-heading-detail-small">ChatScan.org | X11 Blockchain (Chat) Explorer</div>
          </div>

          <div className="f-breadcrumb">
            <div className="f-breadcrumb-wrapper">
              <div className="f-breadcrumb-link" style={{ cursor: "default" }}>
                Fee: Feeless protocol
              </div>
              <div className="f-breadcrumb-seperator w-embed">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="f-breadcrumb-link" style={{ cursor: "default" }}>
                Unconfirmed: {stats ? stats.unconfirmedCount.toLocaleString() : "—"}
                {stats ? ` (${formatBytes(stats.unconfirmedSizeBytes)})` : ""}
              </div>
              <div className="f-breadcrumb-seperator w-embed">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="f-breadcrumb-link" style={{ cursor: "default" }}>
                24H Tx: {stats ? stats.txCount24h.toLocaleString() : "—"} ({stats ? stats.tps : "—"} TPS)
              </div>
            </div>
          </div>

          <h3 className="f-h3-heading">For the people who value online privacy</h3>
        </div>

        <div>
          <div className="f-margin-bottom-32">
            <div className="f-toggle-wrap">
              <div className={`f-toggle-regular${online ? "" : " is-off"}`} role="status" aria-live="polite">
                <div className="f-toggle-thumb" />
              </div>
              <div>{online ? "Network Online" : "Connecting to X11…"}</div>
            </div>
            <p className="f-paragraph-large" style={{ marginTop: 16 }}>
              <sub>
                ChatScan is the public block explorer for CrypterChat's end-to-end encrypted messaging protocol.
                Every message sent through the app is recorded here as a <code className="cs-mono">hash/id</code>{" "}
                reference on the X11 Blockchain (currently under development) - the content itself is never
                stored, transmitted, or viewable by ChatScan.
              </sub>
            </p>
          </div>
          <div className="f-button-wrapper">
            <a href="https://crypter.chat" target="_blank" rel="noreferrer" className="f-button-neutral w-inline-block">
              <div>Download the CC app</div>
            </a>
            <a
              href="https://github.com/crypterchat/chatscan"
              target="_blank"
              rel="noreferrer"
              className="f-button-facebook w-inline-block"
            >
              <div>About X11 Blockchain</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
