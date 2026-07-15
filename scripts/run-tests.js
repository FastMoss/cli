const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");

function collect(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(entryPath);
    return entry.isFile() && entry.name.endsWith(".test.js") ? [entryPath] : [];
  });
}

const files = [
  path.join(repoRoot, "fastmoss", "test"),
  path.join(repoRoot, "fastmoss-skill", "test"),
  path.join(repoRoot, "test"),
]
  .flatMap(collect)
  .sort();

if (files.length === 0) throw new Error("No .test.js files found");
const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: repoRoot,
  stdio: "inherit",
});
process.exitCode = result.status == null ? 1 : result.status;
