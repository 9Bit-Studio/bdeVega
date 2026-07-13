import { spawn } from "node:child_process";

const child = spawn("pnpm", ["dev"], {
  cwd: import.meta.dirname + "/..",
  detached: true,
  stdio: "inherit",
});

let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  try {
    process.kill(-child.pid, signal);
  } catch {
    process.exit(0);
  }
  setTimeout(() => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      // The process group already exited.
    }
    process.exit(0);
  }, 4_000).unref();
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
child.once("exit", (code) => process.exit(code ?? 0));
