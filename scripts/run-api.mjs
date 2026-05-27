import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "apps", "api");

function resolvePython() {
  const candidates =
    process.platform === "win32"
      ? [join(apiDir, ".venv", "Scripts", "python.exe")]
      : [join(apiDir, ".venv", "bin", "python"), join(apiDir, ".venv", "bin", "python3")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  console.warn(
    "[api] apps/api/.venv not found. Run: cd apps/api && python -m venv .venv && pip install -r requirements.txt"
  );
  return process.platform === "win32" ? "python" : "python3";
}

const python = resolvePython();
const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
  { cwd: apiDir, stdio: "inherit", env: process.env, windowsHide: true }
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
