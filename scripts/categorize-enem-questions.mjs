import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const yearArguments = process.argv.filter((argument) =>
  /^--year=\d{4}$/.test(argument),
);
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts/extract-enem.mjs"),
    "--reuse-images",
    ...yearArguments,
  ],
  {
    cwd: root,
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
