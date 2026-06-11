/** 요약이 한국어가 아닌 것으로 보이면 true */
export function isLikelyEnglish(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const korean = (trimmed.match(/[가-힣]/g) ?? []).length;
  const latin = (trimmed.match(/[a-zA-Z]/g) ?? []).length;

  if (korean >= 8) return false;
  return latin >= 12;
}
