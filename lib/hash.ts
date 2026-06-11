import { createHash } from "crypto";

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function createArticleId(url: string): string {
  return hashText(url);
}

export function createTitleHash(title: string): string {
  return hashText(title.trim().toLowerCase());
}
