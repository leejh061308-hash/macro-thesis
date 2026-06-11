export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET?.trim() ?? "";
}

export function verifyAdminKey(key: string | null | undefined): boolean {
  const secret = getAdminSecret();
  if (!secret || secret.length < 8) return false;
  return key === secret;
}

export function getAdminKeyFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return request.headers.get("x-admin-key")?.trim() ?? null;
}

export function isAdminConfigured(): boolean {
  return getAdminSecret().length >= 8;
}
