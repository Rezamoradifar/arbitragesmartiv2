// Next's hostname spelling differs from the managed preview's --host flag.
// Keep the ordinary Next runtime and translate only those preview arguments.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
// The supervised preview can inspect the exact production build without a
// second expensive dev compilation. Ordinary `npm run dev` stays development.
const command = process.argv.includes("--strictPort") && existsSync(new URL("../.next/BUILD_ID", import.meta.url)) ? "start" : "dev";
const args = process.argv
  .slice(2)
  .filter((arg) => arg !== "--strictPort")
  .map((arg) => (arg === "--host" ? "--hostname" : arg));
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    command,
    ...args,
  ],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
