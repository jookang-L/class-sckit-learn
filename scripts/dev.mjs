import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(root, "apps", "web");
const nextBin = join(webDir, "node_modules", "next", "dist", "bin", "next");

function spawnProc(label, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    windowsHide: true,
  });

  child.on("error", (err) => {
    console.error(`[${label}] failed to start:`, err.message);
    shutdown(1);
  });

  return child;
}

const children = [
  spawnProc("api", process.execPath, [join(root, "scripts", "run-api.mjs")], root),
  spawnProc("web", process.execPath, [nextBin, "dev", "-p", "3000"], webDir),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill();
  }

  setTimeout(() => process.exit(code), 250);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (shuttingDown) return;
    shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (!existsSync(nextBin)) {
  console.error("[web] Next.js not found. Run: cd apps/web && npm install");
  process.exit(1);
}

console.log("[dev] Starting API (http://localhost:8000) and web (http://localhost:3000)...");
