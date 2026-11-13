import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";

/** Debounced search box (server-side filtering). */
export function SearchInput({ value = "", onSearch, delay = 350, placeholder = "Search...", className = "" }) {
  const [v, setV] = useState(value);
  const first = useRef(true);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const t = setTimeout(() => {
      if (v !== value) onSearch(v);
    }, delay);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Input placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} className={className} />;
}
