export function getTimingLabel(score: number): {
  label: string;
  color: "accent" | "bullish" | "neutral" | "bearish";
} {
  if (score >= 90) return { label: "매우 매력적", color: "accent" };
  if (score >= 80) return { label: "매력적", color: "bullish" };
  if (score >= 70) return { label: "관심 구간", color: "bullish" };
  if (score >= 60) return { label: "중립", color: "neutral" };
  if (score >= 50) return { label: "신중", color: "neutral" };
  return { label: "관망", color: "bearish" };
}

export function getCompanyLabel(score: number): string {
  if (score >= 90) return "우수";
  if (score >= 80) return "양호";
  if (score >= 70) return "보통";
  if (score >= 60) return "미흡";
  return "주의";
}

export function getEntryEnvironmentLabel(score: number): string {
  if (score >= 85) return "매우 우호적";
  if (score >= 75) return "우호적";
  if (score >= 65) return "보통";
  if (score >= 55) return "신중";
  return "불리";
}
