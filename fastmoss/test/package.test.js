const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const packageJSON = require("../package.json");
const { PLATFORM_TARGETS } = require("../lib/targets");
const packageRoot = path.join(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmSpawnOptions = process.platform === "win32" ? { shell: true } : {};

test("CLI package exposes only the fastmoss command", () => {
  assert.deepEqual(packageJSON.bin, { fastmoss: "bin/fastmoss.js" });
  assert.equal(packageJSON.scripts.postinstall, undefined);
  assert.equal(packageJSON.fastmoss, undefined);
  assert.equal(packageJSON.files.includes("skills"), false);
});

test("all optional dependencies are exact and match the main version", () => {
  const expected = Object.fromEntries(
    Object.values(PLATFORM_TARGETS).map((target) => [
      target.packageName,
      packageJSON.version,
    ]),
  );
  assert.deepEqual(packageJSON.optionalDependencies, expected);
});

test("CLI package includes discovery keywords", () => {
  assert.deepEqual(packageJSON.keywords, [
    "fastmoss",
    "tiktok-shop",
    "ecommerce-research",
    "product-research",
    "creator-analytics",
    "shop-analytics",
    "advertising-analytics",
    "market-intelligence",
    "mcp",
    "ai-agent",
  ]);
});

test("runtime source contains no downloader or GitHub release fallback", () => {
  const content = [
    "package.json",
    "bin/fastmoss.js",
    "lib/runtime.js",
    "lib/targets.js",
  ]
    .map((file) => fs.readFileSync(path.join(packageRoot, file), "utf8"))
    .join("\n");
  for (const forbidden of [
    "node:http",
    "node:https",
    "github.com/FastMoss/cli/releases/download",
    "FASTMOSS_DOWNLOAD_BASE_URL",
    "FASTMOSS_CACHE_DIR",
    "FASTMOSS_SKIP_DOWNLOAD",
    "fastmoss-install-skill",
  ]) {
    assert.equal(content.includes(forbidden), false, forbidden);
  }
});

test("npm dry-run contains no Skill, Go binary, or lifecycle installer", () => {
  const result = spawnSync(npmCommand, ["pack", "--dry-run", "--json"], {
    cwd: packageRoot,
    encoding: "utf8",
    ...npmSpawnOptions,
  });
  assert.equal(result.status, 0, result.stderr);
  const files = JSON.parse(result.stdout)[0].files.map((entry) => entry.path);
  assert.equal(files.some((file) => file.startsWith("skills/")), false);
  assert.equal(files.includes("bin/postinstall.js"), false);
  assert.equal(files.includes("bin/install-skill.js"), false);
  assert.equal(
    files.some((file) => /^bin\/fastmoss-(darwin|linux|windows)/.test(file)),
    false,
  );
});
