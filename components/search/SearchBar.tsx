"use client";

import { usePathname, useRouter } from "next/navigation";
import TickerSearch from "@/components/search/TickerSearch";
import { notifyWatchlistUpdated } from "@/lib/watchlist-events";
import type { SearchResult } from "@/lib/types";

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (result: SearchResult) => {
    router.push(`/stocks/${encodeURIComponent(result.ticker)}`);
  };

  const handleAddWatchlist = async (result: SearchResult) => {
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: result.ticker }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "관심종목 추가에 실패했습니다.");
      return;
    }

    notifyWatchlistUpdated();

    if (pathname !== "/stocks") {
      router.push("/stocks");
    }
  };

  return (
    <TickerSearch
      placeholder="티커 검색 · 선택 시 상세 · + 관심으로 추가"
      onSelect={handleSelect}
      showWatchlistAction
      onAddWatchlist={handleAddWatchlist}
    />
  );
}
