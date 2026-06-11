"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";

interface TickerSearchProps {
  placeholder?: string;
  onSelect: (result: SearchResult) => void;
  showWatchlistAction?: boolean;
  onAddWatchlist?: (result: SearchResult) => void;
}

export default function TickerSearch({
  placeholder = "티커 검색 (AAPL, 005930, ^KS11...)",
  onSelect,
  showWatchlistAction = false,
  onAddWatchlist,
}: TickerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    onSelect(result);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral">
          ⌕
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-surface-border bg-surface-card py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-neutral focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral">
            ...
          </span>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-xl">
          {results.map((result) => (
            <li
              key={result.ticker}
              className="flex items-center justify-between border-b border-surface-border/50 px-4 py-3 last:border-0 hover:bg-surface-raised transition-colors"
            >
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="flex-1 text-left"
              >
                <span className="font-mono font-semibold text-accent">
                  {result.ticker}
                </span>
                <p className="text-xs text-gray-400 truncate max-w-[200px]">
                  {result.name}
                  {result.exchange ? ` · ${result.exchange}` : ""}
                </p>
              </button>
              {showWatchlistAction && onAddWatchlist && (
                <button
                  type="button"
                  onClick={() => {
                    onAddWatchlist(result);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="text-xs text-neutral hover:text-accent px-2 py-1 rounded border border-surface-border hover:border-accent/30 shrink-0"
                >
                  + 관심
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
