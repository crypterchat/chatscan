const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "ChatScan",
    links: [
      { label: "Explorer", href: "/" },
      { label: "API status", href: "/api/health" },
      { label: "Source on GitHub", href: "https://github.com/crypterchat/chatscan" },
    ],
  },
  {
    title: "X11 Blockchain",
    links: [
      { label: "Protocol overview", href: "https://github.com/crypterchat/chatscan#the-x11-blockchain" },
      { label: "Development status", href: "https://github.com/crypterchat/chatscan#the-x11-blockchain" },
    ],
  },
  {
    title: "CrypterChat",
    links: [
      { label: "Download the app", href: "https://crypter.chat" },
      { label: "Privacy commitment", href: "https://crypter.chat" },
    ],
  },
];

export function Footer() {
  return (
    <div className="f-footer-regular">
      <div className="f-container-regular">
        <div className="w-layout-grid f-footer-top-grid">
          <div className="f-footer-content">
            <div className="f-margin-bottom-16">
              <a href="/" className="f-footer-logo w-inline-block">
                <strong style={{ color: "#160042", fontSize: 18 }}>CrypterChat</strong>
              </a>
            </div>
            <p className="f-paragraph-small-2">Communication in the safe way</p>
          </div>
        </div>

        <div className="w-layout-grid f-footer-large-grid">
          {FOOTER_COLUMNS.map((col) => (
            <div className="f-footer-block" key={col.title}>
              <div className="f-footer-title">{col.title}</div>
              {col.links.map((link) => (
                <a key={link.label} href={link.href} className="f-footer-link w-inline-block" target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <div>{link.label}</div>
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="f-footer-divider" />

        <div className="f-footer-bottom">
          <p className="f-footer-detail">CrypterChat LLC | Erickson Holding LTD</p>
          <div className="f-footer-menu">
            <a href="https://crypter.chat" target="_blank" rel="noreferrer" className="f-footer-link w-inline-block">
              <div>Go back to Crypter.chat</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
