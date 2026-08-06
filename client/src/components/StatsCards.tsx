import type { NetworkStats } from "../lib/types";

export function StatsCards({ stats }: { stats: NetworkStats | null }) {
  const cards = [
    {
      label: "Chain",
      value: stats ? `${stats.chainName} · ${stats.chainVersion}` : "—",
      caption: "Network status",
    },
    {
      label: "Indexed Messages",
      value: stats ? stats.totalIndexed.toLocaleString() : "—",
      caption: "All-time total",
    },
    {
      label: "Throughput",
      value: stats ? `${stats.tps} TPS` : "—",
      caption: "Confirmations / second",
    },
  ];

  return (
    <div className="w-layout-grid f-grid-three-column">
      {cards.map((card) => (
        <div className="f-feature-card-filled" key={card.label}>
          <div className="f-heading-detail-small f-margin-bottom-12">{card.label}</div>
          <div className="cs-stat-value">{card.value}</div>
          <div className="cs-stat-label" style={{ marginTop: 8 }}>
            {card.caption}
          </div>
        </div>
      ))}
    </div>
  );
}
