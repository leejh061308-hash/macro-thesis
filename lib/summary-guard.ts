function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(text: string): Set<string> {
  const normalized = normalize(text);
  const grams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    grams.add(normalized.slice(i, i + 2));
  }
  return grams;
}

function overlapRatio(a: string, b: string): number {
  const aGrams = bigrams(a);
  const bGrams = bigrams(b);
  if (aGrams.size === 0 || bGrams.size === 0) return 0;

  let overlap = 0;
  for (const gram of aGrams) {
    if (bGrams.has(gram)) overlap++;
  }

  return overlap / aGrams.size;
}

export function containsLongSubstring(
  source: string,
  generated: string,
  minLength = 20
): boolean {
  const sourceNorm = normalize(source);
  const generatedNorm = normalize(generated);
  if (sourceNorm.length < minLength || generatedNorm.length === 0) return false;

  const maxWindow = Math.min(sourceNorm.length, 120);
  for (let len = maxWindow; len >= minLength; len--) {
    for (let i = 0; i <= sourceNorm.length - len; i++) {
      const fragment = sourceNorm.slice(i, i + len);
      if (generatedNorm.includes(fragment)) return true;
    }
  }

  return false;
}

export function isTooSimilarToSource(
  source: string,
  generated: string,
  threshold = 0.42
): boolean {
  if (!source.trim() || !generated.trim()) return false;
  if (containsLongSubstring(source, generated)) return true;
  return overlapRatio(source, generated) >= threshold;
}

function isWeakBrief(text: string, minKorean = 20): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return (trimmed.match(/[가-힣]/g) ?? []).length < minKorean;
}

export function isWeakHeadlineSummary(summary: string): boolean {
  return isWeakBrief(summary, 40);
}

export function isWeakNewsSummaryParts(
  summary: string,
  marketImpact: string
): boolean {
  if (isWeakBrief(summary, 20)) return true;
  if (isWeakBrief(marketImpact, 15)) return true;
  return false;
}
