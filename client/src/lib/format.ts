export function truncateHash(hash: string, edge = 10): string {
  if (hash.length <= edge * 2 + 3) return hash;
  return `${hash.slice(0, edge)}…${hash.slice(-edge)}`;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
