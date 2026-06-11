import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "yahoo-finance2", "pg", "undici"],
};

export default nextConfig;
