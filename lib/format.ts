export function formatPrice(price: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatChange(change: number, percent: number): string {
  const isUp = percent >= 0;
  const sign = isUp ? "+" : "-";
  return `${sign}${Math.abs(change).toFixed(2)} (${sign}${Math.abs(percent).toFixed(2)}%)`;
}

export function formatLargeNumber(value: number | null): string {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

export function formatRatio(value: number | null, suffix = ""): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}${suffix}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}분 전`;
  }
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffHours < 48) return "어제";

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
