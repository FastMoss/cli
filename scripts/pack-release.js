const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");
const { npmCommand, spawnOptionsForCommand } = require("./npm-command");

const repoRoot = path.join(__dirname, "..");
const version = require("../fastmoss/package.json").version;
const destination = path.join(repoRoot, "dist", "publish", "npm");
const packages = [
  ...Object.values(PLATFORM_TARGETS).map((target) => ({
    kind: "platform",
    name: target.packageName,
    root: path.join(repoRoot, "platform-packages", target.packageDir),
  })),
  { kind: "cli", name: "@fastmoss/cli", root: path.join(repoRoot, "fastmoss") },
  {
    kind: "skill",
    name: "@fastmoss/skill",
    root: path.join(repoRoot, "fastmoss-skill"),
  },
];

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });

const manifest = packages.map((entry) => {
  const command = npmCommand();
  const result = spawnSync(
    command,
    ["pack", entry.root, "--json", "--pack-destination", destination],
    { cwd: repoRoot, encoding: "utf8", ...spawnOptionsForCommand(command) },
  );
  if (result.status !== 0) {
    throw new Error(`npm pack failed for ${entry.name}: ${result.stderr}`);
  }
  const packed = JSON.parse(result.stdout)[0];
  if (packed.name !== entry.name || packed.version !== version) {
    throw new Error(
      `Unexpected package identity: ${packed.name}@${packed.version}; expected ${entry.name}@${version}`,
    );
  }
  return {
    kind: entry.kind,
    name: entry.name,
    version,
    file: path.basename(packed.filename),
  };
});

fs.writeFileSync(
  path.join(destination, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
