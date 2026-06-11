const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORTS = [3000, 3001, 3002, 3003, 3004];

if (process.platform === "win32") {
  for (const port of PORTS) {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { if ($_ -gt 0) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"`,
        { stdio: "ignore" }
      );
    } catch {
      // ignore
    }
  }
}

const nextDir = path.join(process.cwd(), ".next");
try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next cache");
} catch {
  // ignore
}

console.log("Reset complete. Starting dev server...");
