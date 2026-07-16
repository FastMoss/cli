const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { npmCommand, spawnOptionsForCommand } = require("../scripts/npm-command");

const repoRoot = path.join(__dirname, "..");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");
const mainPackage = require("../fastmoss/package.json");
const skillPackage = require("../fastmoss-skill/package.json");
const START = "<!-- FASTMOSS_INSTALLATION_START -->";
const END = "<!-- FASTMOSS_INSTALLATION_END -->";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
    ...spawnOptionsForCommand(command),
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function packFiles(packageRoot) {
  const result = run(npmCommand(), [
    "pack",
    path.join(repoRoot, packageRoot),
    "--dry-run",
    "--json",
  ]);
  return JSON.parse(result.stdout)[0].files.map((entry) => entry.path);
}

async function treeDigest(directory) {
  const entries = [];
  async function walk(current, relative = "") {
    const children = await fs.promises.readdir(current, { withFileTypes: true });
    for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
      if (child.name === ".DS_Store" || child.name === ".fastmoss-install.json") continue;
      const childPath = path.join(current, child.name);
      const childRelative = path.join(relative, child.name);
      if (child.isDirectory()) await walk(childPath, childRelative);
      else {
        entries.push([
          childRelative,
          crypto
            .createHash("sha256")
            .update(await fs.promises.readFile(childPath))
            .digest("hex"),
        ]);
      }
    }
  }
  await walk(directory);
  return entries;
}

function installationBlock(content) {
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return content.slice(start, end + END.length);
}

test("main CLI package contains no Skill, binary, downloader, or lifecycle script", () => {
  const files = packFiles("fastmoss");
  assert.equal(files.some((file) => file.startsWith("skills/")), false);
  assert.equal(files.some((file) => /fastmoss-(darwin|linux|windows)/.test(file)), false);
  assert.equal(mainPackage.scripts.postinstall, undefined);
  assert.deepEqual(mainPackage.bin, { fastmoss: "bin/fastmoss.js" });
});

test("each platform package contains only its matching binary", () => {
  for (const target of Object.values(PLATFORM_TARGETS)) {
    const root = `platform-packages/${target.packageDir}`;
    const manifest = require(path.join(repoRoot, root, "package.json"));
    const files = packFiles(root);
    assert.equal(manifest.version, mainPackage.version);
    assert.deepEqual(manifest.os, [target.os]);
    assert.deepEqual(manifest.cpu, [target.cpu]);
    assert.deepEqual(
      files.filter((file) => file.startsWith("bin/")),
      [`bin/${target.binaryName}`],
    );
  }
});

test("Skill package contains canonical Skill and no CLI dependency or binary", () => {
  const files = packFiles("fastmoss-skill");
  assert.equal(skillPackage.dependencies, undefined);
  assert.equal(skillPackage.optionalDependencies, undefined);
  assert.deepEqual(skillPackage.bin, {
    "fastmoss-skill": "bin/fastmoss-skill.js",
  });
  assert.equal(files.includes("skills/fastmoss-cli/SKILL.md"), true);
  assert.equal(files.some((file) => /fastmoss-(darwin|linux|windows)/.test(file)), false);
});

test("all npm manifests are public, exact-version, and have no git dependency", () => {
  const manifests = [
    mainPackage,
    skillPackage,
    ...Object.values(PLATFORM_TARGETS).map((target) =>
      require(path.join(repoRoot, "platform-packages", target.packageDir, "package.json")),
    ),
  ];
  for (const manifest of manifests) {
    assert.equal(manifest.private, false);
    const dependencyValues = Object.values({
      ...(manifest.dependencies || {}),
      ...(manifest.optionalDependencies || {}),
    });
    for (const value of dependencyValues) {
      assert.doesNotMatch(value, /git|github|^https?:/i);
    }
  }
  assert.deepEqual(
    mainPackage.optionalDependencies,
    Object.fromEntries(
      Object.values(PLATFORM_TARGETS).map((target) => [
        target.packageName,
        mainPackage.version,
      ]),
    ),
  );
});

test("release assets and platform package payloads share exact bytes", async () => {
  for (const target of Object.values(PLATFORM_TARGETS)) {
    const releaseAsset = await fs.promises.readFile(
      path.join(repoRoot, "release-assets", target.assetName),
    );
    const npmAsset = await fs.promises.readFile(
      path.join(repoRoot, "platform-packages", target.packageDir, "bin", target.binaryName),
    );
    assert.equal(
      crypto.createHash("sha256").update(releaseAsset).digest("hex"),
      crypto.createHash("sha256").update(npmAsset).digest("hex"),
    );
  }
});

test("README installation blocks are aligned and rendered", async () => {
  const english = await Promise.all(
    ["README.md", "fastmoss/README.md", "fastmoss-skill/README.md"].map((file) =>
      fs.promises.readFile(path.join(repoRoot, file), "utf8"),
    ),
  );
  const chinese = await Promise.all(
    ["README.zh-CN.md", "fastmoss/README.zh-CN.md", "fastmoss-skill/README.zh-CN.md"].map(
      (file) => fs.promises.readFile(path.join(repoRoot, file), "utf8"),
    ),
  );
  assert.equal(new Set(english.map(installationBlock)).size, 1);
  assert.equal(new Set(chinese.map(installationBlock)).size, 1);
  for (const content of [...english, ...chinese]) {
    assert.equal(content.includes("{{FASTMOSS_INSTALLATION}}"), false);
  }
});

test("public root Skill and npm Skill payload are identical", async () => {
  assert.deepEqual(
    await treeDigest(path.join(repoRoot, "skills", "fastmoss-cli")),
    await treeDigest(path.join(repoRoot, "fastmoss-skill", "skills", "fastmoss-cli")),
  );
});

test("release files do not reference removed installers or download fallbacks", async () => {
  const forbidden = [
    "npx skills add",
    "fastmoss-install-skill",
    "--allow-scripts",
    "github.com/FastMoss/cli/releases/download",
    "node:http",
    "node:https",
    "FASTMOSS_DOWNLOAD_BASE_URL",
    "FASTMOSS_CACHE_DIR",
    "FASTMOSS_SKIP_DOWNLOAD",
    "postinstall",
  ];
  const roots = ["fastmoss", "fastmoss-skill/bin", "fastmoss-skill/lib", "scripts", "install.sh", "install.ps1"];
  const files = [];
  function collect(relative) {
    const fullPath = path.join(repoRoot, relative);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(fullPath)) collect(path.join(relative, child));
    } else if (!relative.endsWith(".test.js")) {
      files.push(relative);
    }
  }
  for (const root of roots) collect(root);
  for (const file of files) {
    const content = await fs.promises.readFile(path.join(repoRoot, file), "utf8");
    for (const value of forbidden) assert.equal(content.includes(value), false, `${file}: ${value}`);
  }
});

test("release pack script creates seven ordered npm tarballs", () => {
  run("node", ["scripts/pack-release.js"]);
  const manifest = require(path.join(repoRoot, "dist", "publish", "npm", "manifest.json"));
  assert.deepEqual(manifest.map((entry) => entry.kind), [
    "platform",
    "platform",
    "platform",
    "platform",
    "platform",
    "cli",
    "skill",
  ]);
  assert.equal(manifest.length, 7);
});

const archiveTest = process.platform === "win32" ? test.skip : test;
archiveTest("release archive script creates five offline bundles", () => {
  run("bash", ["scripts/create_release_archives.sh"]);
  const outputDir = path.join(repoRoot, "dist", "publish", "github");
  const files = fs.readdirSync(outputDir).sort();
  assert.equal(files.filter((file) => file.endsWith(".tar.gz")).length, 4);
  assert.equal(files.filter((file) => file.endsWith(".zip")).length, 1);
  assert.equal(files.length, 5);
  for (const file of files) {
    if (file.endsWith(".tar.gz")) {
      const listing = run("tar", ["-tzf", path.join(outputDir, file)]).stdout;
      assert.match(listing, /README\.txt/);
      assert.match(listing, /install\.sh/);
      assert.doesNotMatch(listing, /install\.ps1/);
    } else {
      const listing = run("unzip", ["-l", path.join(outputDir, file)]).stdout;
      assert.match(listing, /README\.txt/);
      assert.match(listing, /install\.ps1/);
      assert.doesNotMatch(listing, /install\.sh/);
    }
  }
});
