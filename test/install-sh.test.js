const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const unixTest = process.platform === "win32" ? test.skip : test;
const templateRoot = path.join(__dirname, "..");
const fixtureRoots = [];

function hostAssetName() {
  const key = `${os.platform()}:${os.arch()}`;
  const names = {
    "darwin:x64": "fastmoss-darwin-amd64",
    "darwin:arm64": "fastmoss-darwin-arm64",
    "linux:x64": "fastmoss-linux-amd64",
    "linux:arm64": "fastmoss-linux-arm64",
  };
  if (!names[key]) throw new Error(`unsupported test host: ${key}`);
  return names[key];
}

async function fixture({ includeAsset = true, includeSkill = true } = {}) {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-install-"));
  fixtureRoots.push(root);
  await fs.promises.copyFile(
    path.join(templateRoot, "install.sh"),
    path.join(root, "install.sh"),
  );
  await fs.promises.chmod(path.join(root, "install.sh"), 0o755);
  await fs.promises.writeFile(
    path.join(root, ".fastmoss-release.json"),
    `${JSON.stringify({ schemaVersion: 1, version: "1.2.3" }, null, 2)}\n`,
  );
  if (includeSkill) {
    await fs.promises.mkdir(path.join(root, "skills", "fastmoss-cli"), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(root, "skills", "fastmoss-cli", "SKILL.md"),
      "# FastMoss\n",
    );
  }
  let assetPath = "";
  if (includeAsset) {
    const assetName = hostAssetName();
    const assets = path.join(root, "release-assets");
    await fs.promises.mkdir(assets, { recursive: true });
    assetPath = path.join(assets, assetName);
    await fs.promises.writeFile(assetPath, "#!/usr/bin/env sh\nprintf '1.2.3\\n'\n");
    await fs.promises.chmod(assetPath, 0o755);
    const checksum = crypto
      .createHash("sha256")
      .update(await fs.promises.readFile(assetPath))
      .digest("hex");
    await fs.promises.writeFile(
      path.join(assets, "SHA256SUMS"),
      `${checksum}  ${assetName}\n`,
    );
  }
  return { root, assetPath };
}

test.after(async () => {
  await Promise.all(
    fixtureRoots.map((root) => fs.promises.rm(root, { recursive: true, force: true })),
  );
});

unixTest("--cli installs only the verified local binary", async () => {
  const { root } = await fixture({ includeSkill: false });
  const binDir = path.join(root, "bin-target");
  const skillDir = path.join(root, "skill-target");
  const result = spawnSync(
    "bash",
    [path.join(root, "install.sh"), "--cli", "--bin-dir", binDir, "--skill-dir", skillDir],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(binDir, "fastmoss")), true);
  assert.equal(fs.existsSync(skillDir), false);
});

unixTest("--skill works without any release binary", async () => {
  const { root } = await fixture({ includeAsset: false });
  const binDir = path.join(root, "bin-target");
  const skillDir = path.join(root, "skill-target");
  const result = spawnSync(
    "bash",
    [path.join(root, "install.sh"), "--skill", "--bin-dir", binDir, "--skill-dir", skillDir],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(binDir), false);
  assert.equal(fs.existsSync(path.join(skillDir, "fastmoss-cli", "SKILL.md")), true);
  assert.match(result.stdout, /Agent action: Read/);
});

unixTest("--all installs both components from local files", async () => {
  const { root } = await fixture();
  const binDir = path.join(root, "bin-target");
  const skillDir = path.join(root, "skill-target");
  const result = spawnSync(
    "bash",
    [path.join(root, "install.sh"), "--all", "--bin-dir", binDir, "--skill-dir", skillDir],
    { env: { ...process.env, PATH: "/usr/bin:/bin" }, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(binDir, "fastmoss")), true);
  assert.equal(fs.existsSync(path.join(skillDir, "fastmoss-cli", "SKILL.md")), true);
});

unixTest("a checksum mismatch fails before writing the CLI", async () => {
  const { root, assetPath } = await fixture();
  await fs.promises.appendFile(assetPath, "tampered\n");
  const binDir = path.join(root, "bin-target");
  const result = spawnSync(
    "bash",
    [path.join(root, "install.sh"), "--cli", "--bin-dir", binDir],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /checksum mismatch/i);
  assert.equal(fs.existsSync(path.join(binDir, "fastmoss")), false);
});

unixTest("command-line destinations override environment values", async () => {
  const { root } = await fixture();
  const argumentRoot = path.join(root, "argument-skills");
  const environmentRoot = path.join(root, "environment-skills");
  const result = spawnSync(
    "bash",
    [path.join(root, "install.sh"), "--skill", "--skill-dir", argumentRoot, "--agent", "codex"],
    {
      env: {
        ...process.env,
        FASTMOSS_SKILL_DIR: environmentRoot,
        FASTMOSS_SKILL_AGENT: "agents",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(argumentRoot, "fastmoss-cli", "SKILL.md")), true);
  assert.equal(fs.existsSync(environmentRoot), false);
});

unixTest("target parent path as a file returns the path in the error", async () => {
  const { root } = await fixture();
  const binDir = path.join(root, "not-a-dir");
  await fs.promises.writeFile(binDir, "file\n");
  const result = spawnSync(
    "bash",
    [path.join(root, "install.sh"), "--cli", "--bin-dir", binDir],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(binDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

unixTest("installer source does not invoke package managers or downloaders", async () => {
  const source = await fs.promises.readFile(path.join(templateRoot, "install.sh"), "utf8");
  assert.doesNotMatch(source, /\b(npm|npx|curl|wget)\b/);
});

unixTest("generated staging installs a real local asset when present", async (t) => {
  const markerPath = path.join(templateRoot, ".fastmoss-release.json");
  const assetPath = path.join(templateRoot, "release-assets", hostAssetName());
  if (!fs.existsSync(markerPath) || !fs.existsSync(assetPath)) {
    t.skip("real staged release assets are not present in the upstream template");
    return;
  }
  const assetPrefix = (await fs.promises.readFile(assetPath)).subarray(0, 8).toString("utf8");
  if (assetPrefix.startsWith("fixture:")) {
    t.skip("staged release asset is a fixture, not an executable binary");
    return;
  }
  const binDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-real-bin-"));
  fixtureRoots.push(binDir);
  const result = spawnSync(
    "bash",
    [path.join(templateRoot, "install.sh"), "--cli", "--bin-dir", binDir],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const version = JSON.parse(await fs.promises.readFile(markerPath, "utf8")).version;
  const run = spawnSync(path.join(binDir, "fastmoss"), ["--version"], { encoding: "utf8" });
  assert.equal(run.stdout.trim(), version);
});
