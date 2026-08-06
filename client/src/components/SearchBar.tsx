import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

export function SearchBar() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    const parts = trimmed.split("/");
    if (parts.length === 2 && parts[0] && /^\d+$/.test(parts[1])) {
      navigate(`/block/${parts[0]}/${parts[1]}`);
      return;
    }

    navigate(`/?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className="cs-search" onSubmit={handleSubmit} role="search">
      <input
        type="text"
        placeholder="Search by hash, id, or hash/id reference…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search ChatScan"
      />
      <button type="submit">Search</button>
    </form>
  );
}
