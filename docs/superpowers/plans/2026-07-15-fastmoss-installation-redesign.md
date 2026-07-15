# FastMoss Independent Installation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make npm and GitHub independent, equal-capability installation channels while allowing the FastMoss CLI and Agent Skill to be installed separately.

**Architecture:** `@fastmoss/cli` becomes a download-free launcher backed by exact-version, platform-specific npm packages. `@fastmoss/skill` becomes a standalone npm executable that copies the canonical Skill into Agent directories, while GitHub ships local shell/PowerShell installers and per-platform offline archives from the same binaries and Skill source.

**Tech Stack:** Node.js 18+ CommonJS, Node built-in test runner, npm optional dependencies, Verdaccio 6.8.0 for isolated-registry tests, Bash, PowerShell, GitHub Actions.

---

## Context And Constraints

- Design spec: `docs/superpowers/specs/2026-07-14-fastmoss-installation-redesign-design.md`
- Baseline on 2026-07-15: `cd fastmoss && npm test` passes 21 tests.
- Checked-in binaries report version `0.1.6`; do not bump the release version as part of this refactor.
- `fastmoss/package.json` remains the single release-version source.
- Never restore a GitHub download fallback in the npm launcher.
- Preserve unrelated worktree changes. At execution time, create an isolated worktree with `superpowers:using-git-worktrees`.

## File Map

### CLI launcher

- Create `fastmoss/lib/targets.js`: one target table shared by runtime and package generation.
- Replace `fastmoss/lib/runtime.js`: resolve and spawn the installed npm platform package.
- Modify `fastmoss/bin/fastmoss.js`: propagate returned exit code.
- Replace `fastmoss/test/fastmoss.test.js`: runtime and platform-resolution tests.
- Create `fastmoss/test/package.test.js`: published main-package contract tests.
- Modify `fastmoss/package.json`: only `fastmoss` bin, exact optional dependencies, no lifecycle scripts.
- Delete `fastmoss/bin/install-skill.js`, `fastmoss/bin/postinstall.js`, and `fastmoss/skills/`.

### Standalone Skill package

- Create `fastmoss-skill/lib/installer.js`: argument parsing, target resolution, atomic install/update, uninstall, and Agent handoff.
- Create `fastmoss-skill/bin/fastmoss-skill.js`: executable entry point.
- Create `fastmoss-skill/package.template.json`: versionless publish manifest template.
- Create `fastmoss-skill/test/installer.test.js`: installer behavior tests.
- Create `fastmoss-skill/README.md` and `fastmoss-skill/README.zh-CN.md`: npm package docs.

### Release generation and verification

- Create `package.json` and `package-lock.json`: repository-level test/build commands and pinned Verdaccio.
- Modify `.gitignore`: ignore generated `dist/`.
- Create `scripts/build-release-packages.js`: verify hashes and generate platform npm packages, Skill npm package, and GitHub staging trees.
- Create `scripts/run-tests.js`: discover only `*.test.js` unit/contract files so the registry integration script never runs implicitly.
- Create `scripts/pack-release.js`: create npm tarballs and release manifest in publish order.
- Create `scripts/create-release-archives.sh`: make `.tar.gz` and `.zip` GitHub archives.
- Create `test/release-packages.test.js`: generated-package and archive-staging contracts.
- Create `test/npm-install.integration.js`: local-registry end-to-end installation.

### GitHub installers and release

- Create `install.sh`: macOS/Linux local installer.
- Create `install.ps1`: Windows local installer.
- Create `test/install-sh.test.js`: Unix installer fixture tests.
- Create `test/install-powershell.ps1`: Windows installer smoke and checksum tests.
- Replace `.github/workflows/release.yml`: validate first, publish generated npm tarballs and GitHub archives independently.

### User-facing instructions

- Modify `README.md`, `README.zh-CN.md`, `fastmoss/README.md`, and `fastmoss/README.zh-CN.md`.
- Modify `skills/fastmoss-cli/SKILL.md` and `skills/fastmoss-cli/references/cli.md`.

## Task 1: Resolve CLI Binaries From Installed Platform Packages

**Files:**
- Create: `fastmoss/lib/targets.js`
- Replace: `fastmoss/lib/runtime.js`
- Modify: `fastmoss/bin/fastmoss.js`
- Replace: `fastmoss/test/fastmoss.test.js`

- [ ] **Step 1: Replace the runtime test file with failing platform-package tests**

Use this test shape. It defines the public function names used by all later tasks:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const path = require("node:path");

const {
  PLATFORM_TARGETS,
  resolvePlatformTarget,
} = require("../lib/targets");
const {
  resolvePlatformBinary,
  runCLI,
} = require("../lib/runtime");

for (const arg of ["--version", "-v", "version"]) {
  test(`runCLI handles ${arg} without resolving a binary`, async () => {
    let output = "";
    const code = await runCLI({
      version: "1.2.3",
      args: [arg],
      platform: "unsupported",
      arch: "unsupported",
      stdout: { write(chunk) { output += chunk; } },
    });
    assert.equal(code, 0);
    assert.equal(output, "1.2.3\n");
  });
}

test("target metadata maps every supported Node platform", () => {
  assert.deepEqual(resolvePlatformTarget({ platform: "darwin", arch: "arm64" }), {
    packageName: "@fastmoss/cli-darwin-arm64",
    packageDir: "cli-darwin-arm64",
    assetName: "fastmoss-darwin-arm64",
    binaryName: "fastmoss",
    os: "darwin",
    cpu: "arm64",
  });
  assert.equal(Object.keys(PLATFORM_TARGETS).length, 5);
});

test("resolvePlatformTarget rejects unsupported platforms", () => {
  assert.throws(
    () => resolvePlatformTarget({ platform: "linux", arch: "ppc64" }),
    /Unsupported platform: linux\/ppc64/,
  );
});

test("resolvePlatformBinary returns the binary from an exact-version package", () => {
  let checkedPath = "";
  const result = resolvePlatformBinary({
    version: "1.2.3",
    platform: "linux",
    arch: "x64",
    resolvePackageJSON() {
      return "/registry/@fastmoss/cli-linux-amd64/package.json";
    },
    readFileSync() {
      return JSON.stringify({ version: "1.2.3" });
    },
    accessSync(filePath) {
      checkedPath = filePath;
    },
  });
  assert.equal(
    result.binaryPath,
    path.join("/registry/@fastmoss/cli-linux-amd64", "bin", "fastmoss"),
  );
  assert.equal(checkedPath, result.binaryPath);
});

test("resolvePlatformBinary gives an npm-only repair command when missing", () => {
  assert.throws(
    () => resolvePlatformBinary({
      version: "1.2.3",
      platform: "darwin",
      arch: "arm64",
      resolvePackageJSON() {
        const error = new Error("not found");
        error.code = "MODULE_NOT_FOUND";
        throw error;
      },
    }),
    /npm install -g @fastmoss\/cli@1\.2\.3[\s\S]*--omit=optional/,
  );
});

test("resolvePlatformBinary rejects a platform package version mismatch", () => {
  assert.throws(
    () => resolvePlatformBinary({
      version: "1.2.3",
      platform: "win32",
      arch: "x64",
      resolvePackageJSON() {
        return "C:\\packages\\cli-windows-amd64\\package.json";
      },
      readFileSync() {
        return JSON.stringify({ version: "1.2.2" });
      },
      accessSync() {},
    }),
    /expected 1\.2\.3, found 1\.2\.2/,
  );
});

test("resolvePlatformBinary rejects a missing or non-executable binary", () => {
  assert.throws(
    () => resolvePlatformBinary({
      version: "1.2.3",
      platform: "linux",
      arch: "x64",
      resolvePackageJSON() {
        return "/registry/@fastmoss/cli-linux-amd64/package.json";
      },
      readFileSync() {
        return JSON.stringify({ version: "1.2.3" });
      },
      accessSync() {
        throw new Error("EACCES");
      },
    }),
    /missing or not executable[\s\S]*npm install -g @fastmoss\/cli@1\.2\.3/,
  );
});

test("runCLI forwards arguments, stdio, and the child exit code", async () => {
  const stdout = {};
  const stderr = {};
  let spawnCall;
  const codePromise = runCLI({
    version: "1.2.3",
    args: ["tools", "--json"],
    stdout,
    stderr,
    resolveBinary() {
      return { binaryPath: "/packages/fastmoss" };
    },
    spawnFn(binaryPath, args, options) {
      spawnCall = { binaryPath, args, options };
      const child = new EventEmitter();
      process.nextTick(() => child.emit("exit", 7, null));
      return child;
    },
  });
  assert.equal(await codePromise, 7);
  assert.deepEqual(spawnCall, {
    binaryPath: "/packages/fastmoss",
    args: ["tools", "--json"],
    options: { stdio: ["inherit", stdout, stderr] },
  });
});

test("runCLI reports a child signal as an error", async () => {
  await assert.rejects(
    runCLI({
      version: "1.2.3",
      args: ["tools"],
      resolveBinary() {
        return { binaryPath: "/packages/fastmoss" };
      },
      spawnFn() {
        const child = new EventEmitter();
        process.nextTick(() => child.emit("exit", null, "SIGTERM"));
        return child;
      },
    }),
    /fastmoss exited with signal SIGTERM/,
  );
});
```

- [ ] **Step 2: Run the tests and verify the old downloader API fails the new contract**

Run:

```bash
cd fastmoss
npm test
```

Expected: FAIL because `lib/targets.js` and `resolvePlatformBinary` do not exist.

- [ ] **Step 3: Create the shared target table**

Create `fastmoss/lib/targets.js`:

```js
const PLATFORM_TARGETS = Object.freeze({
  "darwin:x64": Object.freeze({
    packageName: "@fastmoss/cli-darwin-amd64",
    packageDir: "cli-darwin-amd64",
    assetName: "fastmoss-darwin-amd64",
    binaryName: "fastmoss",
    os: "darwin",
    cpu: "x64",
  }),
  "darwin:arm64": Object.freeze({
    packageName: "@fastmoss/cli-darwin-arm64",
    packageDir: "cli-darwin-arm64",
    assetName: "fastmoss-darwin-arm64",
    binaryName: "fastmoss",
    os: "darwin",
    cpu: "arm64",
  }),
  "linux:x64": Object.freeze({
    packageName: "@fastmoss/cli-linux-amd64",
    packageDir: "cli-linux-amd64",
    assetName: "fastmoss-linux-amd64",
    binaryName: "fastmoss",
    os: "linux",
    cpu: "x64",
  }),
  "linux:arm64": Object.freeze({
    packageName: "@fastmoss/cli-linux-arm64",
    packageDir: "cli-linux-arm64",
    assetName: "fastmoss-linux-arm64",
    binaryName: "fastmoss",
    os: "linux",
    cpu: "arm64",
  }),
  "win32:x64": Object.freeze({
    packageName: "@fastmoss/cli-windows-amd64",
    packageDir: "cli-windows-amd64",
    assetName: "fastmoss-windows-amd64.exe",
    binaryName: "fastmoss.exe",
    os: "win32",
    cpu: "x64",
  }),
});

function resolvePlatformTarget({
  platform = process.platform,
  arch = process.arch,
} = {}) {
  const target = PLATFORM_TARGETS[`${platform}:${arch}`];
  if (!target) {
    const supported = Object.keys(PLATFORM_TARGETS)
      .map((key) => key.replace(":", "/"))
      .join(", ");
    throw new Error(
      `Unsupported platform: ${platform}/${arch}. Supported targets: ${supported}`,
    );
  }
  return target;
}

module.exports = { PLATFORM_TARGETS, resolvePlatformTarget };
```

- [ ] **Step 4: Replace the downloader runtime with package resolution and process forwarding**

Replace `fastmoss/lib/runtime.js` with:

```js
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolvePlatformTarget } = require("./targets");

function reinstallMessage(version) {
  return [
    `Run: npm install -g @fastmoss/cli@${version}`,
    "Do not install with --omit=optional.",
  ].join("\n");
}

function resolvePlatformBinary({
  version,
  platform = process.platform,
  arch = process.arch,
  resolvePackageJSON = (packageName) =>
    require.resolve(`${packageName}/package.json`),
  readFileSync = fs.readFileSync,
  accessSync = fs.accessSync,
} = {}) {
  const target = resolvePlatformTarget({ platform, arch });
  let packageJSONPath;
  try {
    packageJSONPath = resolvePackageJSON(target.packageName);
  } catch (error) {
    if (error && error.code !== "MODULE_NOT_FOUND") throw error;
    throw new Error([
      `FastMoss binary package for ${platform}/${arch} is missing: ${target.packageName}.`,
      reinstallMessage(version),
    ].join("\n"));
  }

  const platformPackage = JSON.parse(readFileSync(packageJSONPath, "utf8"));
  if (platformPackage.version !== version) {
    throw new Error([
      `FastMoss platform package version mismatch: expected ${version}, found ${platformPackage.version}.`,
      reinstallMessage(version),
    ].join("\n"));
  }

  const binaryPath = path.join(
    path.dirname(packageJSONPath),
    "bin",
    target.binaryName,
  );
  try {
    accessSync(
      binaryPath,
      platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK,
    );
  } catch {
    throw new Error([
      `FastMoss binary is missing or not executable: ${binaryPath}.`,
      reinstallMessage(version),
    ].join("\n"));
  }
  return { binaryPath, target };
}

async function runCLI({
  version,
  args = process.argv.slice(2),
  platform = process.platform,
  arch = process.arch,
  stdout = process.stdout,
  stderr = process.stderr,
  resolveBinary = resolvePlatformBinary,
  spawnFn = spawn,
} = {}) {
  if (args.length === 1 && ["--version", "-v", "version"].includes(args[0])) {
    stdout.write(`${version}\n`);
    return 0;
  }
  const { binaryPath } = resolveBinary({ version, platform, arch });
  return new Promise((resolve, reject) => {
    const child = spawnFn(binaryPath, args, {
      stdio: ["inherit", stdout, stderr],
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`fastmoss exited with signal ${signal}`));
        return;
      }
      resolve(code || 0);
    });
  });
}

module.exports = { reinstallMessage, resolvePlatformBinary, runCLI };
```

Modify `fastmoss/bin/fastmoss.js`:

```js
#!/usr/bin/env node

const packageJSON = require("../package.json");
const { runCLI } = require("../lib/runtime");

runCLI({ version: packageJSON.version })
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`fastmoss wrapper error: ${error.message}\n`);
    process.exitCode = 1;
  });
```

- [ ] **Step 5: Run the CLI tests**

Run: `cd fastmoss && npm test`

Expected: all new runtime tests PASS and no HTTP server is started.

- [ ] **Step 6: Commit the runtime change**

```bash
git add fastmoss/lib/targets.js fastmoss/lib/runtime.js fastmoss/bin/fastmoss.js fastmoss/test/fastmoss.test.js
git commit -m "feat: resolve CLI from npm platform packages"
```

## Task 2: Make The Main npm Package CLI-Only

**Files:**
- Create: `fastmoss/test/package.test.js`
- Modify: `fastmoss/package.json`
- Delete: `fastmoss/bin/install-skill.js`
- Delete: `fastmoss/bin/postinstall.js`
- Delete: `fastmoss/skills/fastmoss-cli/`

- [ ] **Step 1: Write the failing package-contract test**

Create `fastmoss/test/package.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const packageJSON = require("../package.json");
const { PLATFORM_TARGETS } = require("../lib/targets");

test("main package exposes only fastmoss and has no lifecycle installer", () => {
  assert.deepEqual(packageJSON.bin, { fastmoss: "bin/fastmoss.js" });
  assert.equal(packageJSON.scripts.postinstall, undefined);
  assert.equal(packageJSON.fastmoss, undefined);
  assert.equal(packageJSON.files.includes("skills"), false);
});

test("main package pins every platform package to its own version", () => {
  const expected = Object.fromEntries(
    Object.values(PLATFORM_TARGETS).map((target) => [
      target.packageName,
      packageJSON.version,
    ]),
  );
  assert.deepEqual(packageJSON.optionalDependencies, expected);
});

test("npm tarball contains no Skill or downloader entry point", () => {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const files = JSON.parse(result.stdout)[0].files.map((entry) => entry.path);
  assert.equal(files.some((file) => file.startsWith("skills/")), false);
  assert.equal(files.includes("bin/install-skill.js"), false);
  assert.equal(files.includes("bin/postinstall.js"), false);
});
```

- [ ] **Step 2: Verify the package test fails**

Run: `cd fastmoss && npm test`

Expected: FAIL because the package still exposes `fastmoss-install-skill`, has
`postinstall`, and includes `skills`.

- [ ] **Step 3: Replace the package manifest**

Keep version `0.1.6` and use this contract:

```json
{
  "name": "@fastmoss/cli",
  "version": "0.1.6",
  "description": "FastMoss CLI for npm and npx",
  "license": "UNLICENSED",
  "private": false,
  "bin": {
    "fastmoss": "bin/fastmoss.js"
  },
  "files": [
    "bin",
    "lib",
    "README.md",
    "README.zh-CN.md"
  ],
  "scripts": {
    "test": "node --test ./test/*.test.js"
  },
  "optionalDependencies": {
    "@fastmoss/cli-darwin-amd64": "0.1.6",
    "@fastmoss/cli-darwin-arm64": "0.1.6",
    "@fastmoss/cli-linux-amd64": "0.1.6",
    "@fastmoss/cli-linux-arm64": "0.1.6",
    "@fastmoss/cli-windows-amd64": "0.1.6"
  },
  "engines": {
    "node": ">=18"
  }
}
```

Delete the two obsolete bin scripts and the duplicate `fastmoss/skills`
directory. Do not touch canonical `skills/fastmoss-cli`.

- [ ] **Step 4: Run tests and inspect the tarball**

Run:

```bash
cd fastmoss
npm test
npm pack --dry-run --json
```

Expected: tests PASS; no Skill or obsolete installer file appears.

- [ ] **Step 5: Commit the CLI-only package**

```bash
git add fastmoss/package.json fastmoss/test/package.test.js
git add -A fastmoss/bin fastmoss/skills
git commit -m "refactor: make CLI npm package independent"
```

## Task 3: Build The Standalone Skill Installer

**Files:**
- Create: `fastmoss-skill/lib/installer.js`
- Create: `fastmoss-skill/bin/fastmoss-skill.js`
- Create: `fastmoss-skill/package.template.json`
- Create: `fastmoss-skill/test/installer.test.js`
- Create: `fastmoss-skill/README.md`
- Create: `fastmoss-skill/README.zh-CN.md`

- [ ] **Step 1: Write failing tests for parsing, targets, replacement, rollback, and uninstall**

Create `fastmoss-skill/test/installer.test.js` with real temporary directories:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  INSTALL_MANIFEST,
  parseArgs,
  resolveSkillRoots,
  installSkill,
  uninstallSkill,
} = require("../lib/installer");

async function fixture() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-skill-"));
  const source = path.join(root, "source", "fastmoss-cli");
  await fs.promises.mkdir(path.join(source, "references"), { recursive: true });
  await fs.promises.writeFile(path.join(source, "SKILL.md"), "# FastMoss\n");
  await fs.promises.writeFile(path.join(source, "references", "cli.md"), "# CLI\n");
  return { root, source };
}

test("parseArgs defaults to an all-agent install", () => {
  assert.deepEqual(parseArgs([]), {
    action: "install",
    agent: "",
    help: false,
    version: false,
  });
  assert.equal(parseArgs(["uninstall", "--agent", "codex"]).action, "uninstall");
  assert.throws(() => parseArgs(["--agent", "unknown"]), /Unsupported agent/);
});

test("resolveSkillRoots defaults to all global Agent directories", () => {
  const homeDir = path.resolve("demo-home");
  assert.deepEqual(resolveSkillRoots({ env: {}, homeDir }), [
    path.join(homeDir, ".codex", "skills"),
    path.join(homeDir, ".claude", "skills"),
    path.join(homeDir, ".agents", "skills"),
  ]);
  const codexHome = path.resolve("custom-codex");
  assert.deepEqual(resolveSkillRoots({
    agent: "codex",
    env: { CODEX_HOME: codexHome },
    homeDir,
  }), [path.join(codexHome, "skills")]);
});

test("installSkill replaces legacy content and writes a manifest", async () => {
  const { root, source } = await fixture();
  const skillRoot = path.join(root, "skills");
  const target = path.join(skillRoot, "fastmoss-cli");
  let output = "";
  try {
    await fs.promises.mkdir(target, { recursive: true });
    await fs.promises.writeFile(path.join(target, "old.txt"), "old\n");
    const result = await installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: skillRoot },
      homeDir: root,
      stdout: { write(chunk) { output += chunk; } },
      uniqueId: () => "test",
    });
    assert.deepEqual(result.installed, [target]);
    assert.equal(fs.existsSync(path.join(target, "old.txt")), false);
    const manifest = JSON.parse(
      await fs.promises.readFile(path.join(target, INSTALL_MANIFEST), "utf8"),
    );
    assert.deepEqual(
      { package: manifest.package, skill: manifest.skill, version: manifest.version },
      { package: "@fastmoss/skill", skill: "fastmoss-cli", version: "1.2.3" },
    );
    assert.match(output, /Agent action: Read/);
    assert.match(output, /SKILL\.md/);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("installSkill restores old content when final rename fails", async () => {
  const { root, source } = await fixture();
  const skillRoot = path.join(root, "skills");
  const target = path.join(skillRoot, "fastmoss-cli");
  try {
    await fs.promises.mkdir(target, { recursive: true });
    await fs.promises.writeFile(path.join(target, "SKILL.md"), "old\n");
    const fsPromises = {
      ...fs.promises,
      async rename(from, to) {
        if (from.includes(".tmp-test") && to === target) {
          throw new Error("injected rename failure");
        }
        return fs.promises.rename(from, to);
      },
    };
    await assert.rejects(installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: skillRoot },
      homeDir: root,
      fsPromises,
      uniqueId: () => "test",
    }), /injected rename failure/);
    assert.equal(
      await fs.promises.readFile(path.join(target, "SKILL.md"), "utf8"),
      "old\n",
    );
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("uninstallSkill removes managed targets and preserves unowned targets", async () => {
  const { root, source } = await fixture();
  const managedRoot = path.join(root, "managed");
  const unownedRoot = path.join(root, "unowned");
  try {
    await installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: managedRoot },
      homeDir: root,
    });
    await fs.promises.mkdir(path.join(unownedRoot, "fastmoss-cli"), {
      recursive: true,
    });
    await uninstallSkill({
      env: { FASTMOSS_SKILL_DIR: managedRoot },
      homeDir: root,
    });
    assert.equal(fs.existsSync(path.join(managedRoot, "fastmoss-cli")), false);
    await uninstallSkill({
      env: { FASTMOSS_SKILL_DIR: unownedRoot },
      homeDir: root,
    });
    assert.equal(fs.existsSync(path.join(unownedRoot, "fastmoss-cli")), true);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("installSkill surfaces the destination on a permission failure", async () => {
  const { root, source } = await fixture();
  const lockedRoot = path.join(root, "locked");
  const permissionError = new Error(`EACCES: permission denied, mkdir '${lockedRoot}'`);
  permissionError.code = "EACCES";
  try {
    await assert.rejects(installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: lockedRoot },
      homeDir: root,
      fsPromises: {
        ...fs.promises,
        async mkdir() {
          throw permissionError;
        },
      },
    }), new RegExp(lockedRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run Skill tests and verify they fail**

Run: `node --test fastmoss-skill/test/*.test.js`

Expected: FAIL because `lib/installer.js` does not exist.

- [ ] **Step 3: Implement the installer API**

Create `fastmoss-skill/lib/installer.js` with these exports and rules:

```js
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SKILL_NAME = "fastmoss-cli";
const INSTALL_MANIFEST = ".fastmoss-install.json";
const PACKAGE_NAME = "@fastmoss/skill";
const AGENTS = new Set(["codex", "claude", "agents", "all"]);

function parseArgs(args = []) {
  const result = { action: "install", agent: "", help: false, version: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "install" || arg === "uninstall") result.action = arg;
    else if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--version" || arg === "-v") result.version = true;
    else if (arg === "--agent" || arg === "-a") {
      const value = String(args[index + 1] || "").toLowerCase();
      if (!AGENTS.has(value)) throw new Error(`Unsupported agent: ${value}`);
      result.agent = value;
      index += 1;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return result;
}

function resolveSkillRoots({
  agent = "",
  env = process.env,
  homeDir = os.homedir(),
} = {}) {
  if (String(env.FASTMOSS_SKILL_DIR || "").trim()) {
    return [path.resolve(env.FASTMOSS_SKILL_DIR)];
  }
  const selected = String(agent || env.FASTMOSS_SKILL_AGENT || "all").toLowerCase();
  if (!AGENTS.has(selected)) throw new Error(`Unsupported agent: ${selected}`);
  const roots = {
    codex: path.join(env.CODEX_HOME || path.join(homeDir, ".codex"), "skills"),
    claude: path.join(env.CLAUDE_HOME || path.join(homeDir, ".claude"), "skills"),
    agents: path.join(env.AGENTS_HOME || path.join(homeDir, ".agents"), "skills"),
  };
  return selected === "all" ? Object.values(roots) : [roots[selected]];
}

async function exists(filePath, fsPromises = fs.promises) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function installOne({
  sourceSkillDir,
  targetRoot,
  version,
  fsPromises,
  uniqueId,
}) {
  const target = path.join(targetRoot, SKILL_NAME);
  const id = uniqueId();
  const temporary = `${target}.tmp-${id}`;
  const backup = `${target}.backup-${id}`;
  await fsPromises.mkdir(targetRoot, { recursive: true });
  await fsPromises.rm(temporary, { recursive: true, force: true });
  await fsPromises.rm(backup, { recursive: true, force: true });
  await fsPromises.cp(sourceSkillDir, temporary, {
    recursive: true,
    filter(source) { return path.basename(source) !== ".DS_Store"; },
  });
  if (!(await exists(path.join(temporary, "SKILL.md"), fsPromises))) {
    await fsPromises.rm(temporary, { recursive: true, force: true });
    throw new Error(`FastMoss Skill payload is missing SKILL.md: ${sourceSkillDir}`);
  }
  await fsPromises.writeFile(
    path.join(temporary, INSTALL_MANIFEST),
    `${JSON.stringify({
      package: PACKAGE_NAME,
      skill: SKILL_NAME,
      version,
      installedAt: new Date().toISOString(),
    }, null, 2)}\n`,
  );
  const hadTarget = await exists(target, fsPromises);
  if (hadTarget) await fsPromises.rename(target, backup);
  try {
    await fsPromises.rename(temporary, target);
  } catch (error) {
    if (hadTarget && (await exists(backup, fsPromises))) {
      await fsPromises.rename(backup, target);
    }
    throw error;
  } finally {
    await fsPromises.rm(temporary, { recursive: true, force: true });
  }
  await fsPromises.rm(backup, { recursive: true, force: true });
  return target;
}

async function installSkill({
  sourceSkillDir,
  version,
  agent = "",
  env = process.env,
  homeDir = os.homedir(),
  stdout = process.stdout,
  fsPromises = fs.promises,
  uniqueId = () => `${process.pid}-${Date.now()}`,
} = {}) {
  if (!(await exists(path.join(sourceSkillDir, "SKILL.md"), fsPromises))) {
    throw new Error(`FastMoss Skill payload is missing SKILL.md: ${sourceSkillDir}`);
  }
  const installed = [];
  for (const targetRoot of resolveSkillRoots({ agent, env, homeDir })) {
    installed.push(await installOne({
      sourceSkillDir,
      targetRoot,
      version,
      fsPromises,
      uniqueId,
    }));
  }
  for (const target of installed) {
    stdout.write(`Installed FastMoss Skill: ${path.join(target, "SKILL.md")}\n`);
  }
  stdout.write(
    "Agent action: Read the matching installed SKILL.md path above now and use it in this conversation.\n",
  );
  stdout.write(
    "If this client cannot load newly installed skills in the current session, start a new conversation.\n",
  );
  return { installed };
}

async function uninstallSkill({
  agent = "",
  env = process.env,
  homeDir = os.homedir(),
  stdout = process.stdout,
  fsPromises = fs.promises,
} = {}) {
  const removed = [];
  for (const targetRoot of resolveSkillRoots({ agent, env, homeDir })) {
    const target = path.join(targetRoot, SKILL_NAME);
    const manifestPath = path.join(target, INSTALL_MANIFEST);
    if (!(await exists(manifestPath, fsPromises))) {
      stdout.write(`Skipped unmanaged FastMoss Skill: ${target}\n`);
      continue;
    }
    const manifest = JSON.parse(await fsPromises.readFile(manifestPath, "utf8"));
    if (manifest.package !== PACKAGE_NAME || manifest.skill !== SKILL_NAME) {
      stdout.write(`Skipped unmanaged FastMoss Skill: ${target}\n`);
      continue;
    }
    await fsPromises.rm(target, { recursive: true, force: true });
    removed.push(target);
    stdout.write(`Removed FastMoss Skill: ${target}\n`);
  }
  return { removed };
}

module.exports = {
  INSTALL_MANIFEST,
  SKILL_NAME,
  installSkill,
  parseArgs,
  resolveSkillRoots,
  uninstallSkill,
};
```

- [ ] **Step 4: Add executable and versionless package template**

Create `fastmoss-skill/bin/fastmoss-skill.js`:

```js
#!/usr/bin/env node

const path = require("node:path");
const packageJSON = require("../package.json");
const { installSkill, parseArgs, uninstallSkill } = require("../lib/installer");

const USAGE = `Usage: fastmoss-skill [install|uninstall] [--agent codex|claude|agents|all]
`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return process.stdout.write(USAGE);
  if (options.version) return process.stdout.write(`${packageJSON.version}\n`);
  if (options.action === "uninstall") {
    await uninstallSkill({ agent: options.agent });
    return;
  }
  await installSkill({
    agent: options.agent,
    sourceSkillDir: path.join(__dirname, "..", "skills", "fastmoss-cli"),
    version: packageJSON.version,
  });
}

main().catch((error) => {
  process.stderr.write(`fastmoss-skill error: ${error.message}\n`);
  process.exitCode = 1;
});
```

Run `chmod +x fastmoss-skill/bin/fastmoss-skill.js`.

Create `fastmoss-skill/package.template.json`:

```json
{
  "name": "@fastmoss/skill",
  "description": "Install the FastMoss Agent Skill from npm",
  "license": "UNLICENSED",
  "private": false,
  "bin": {
    "fastmoss-skill": "bin/fastmoss-skill.js"
  },
  "files": [
    "bin",
    "lib",
    "skills",
    "README.md",
    "README.zh-CN.md"
  ],
  "engines": {
    "node": ">=18"
  }
}
```

Write both package READMEs with `npx -y @fastmoss/skill@latest`, the four
`--agent` values, `uninstall`, `FASTMOSS_SKILL_DIR`, and an explicit statement
that this package neither contains nor installs `@fastmoss/cli`.

- [ ] **Step 5: Run Skill tests**

Run: `node --test fastmoss-skill/test/*.test.js`

Expected: all tests PASS, including rollback and unowned-directory preservation.

- [ ] **Step 6: Commit standalone installer source**

```bash
git add fastmoss-skill
git commit -m "feat: add standalone npm Skill installer"
```

## Task 4: Generate And Verify npm Release Packages

**Files:**
- Create: `package.json`
- Modify: `.gitignore`
- Create: `scripts/run-tests.js`
- Create: `scripts/build-release-packages.js`
- Create: `scripts/pack-release.js`
- Create: `test/release-packages.test.js`

- [ ] **Step 1: Add a failing generated-package contract test**

Create `test/release-packages.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { buildReleasePackages } = require("../scripts/build-release-packages");
const mainPackage = require("../fastmoss/package.json");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");

const repoRoot = path.join(__dirname, "..");

test("buildReleasePackages creates exact-version platform and Skill packages", async () => {
  const outputRoot = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "fastmoss-release-"),
  );
  try {
    await buildReleasePackages({ repoRoot, outputRoot });
    for (const target of Object.values(PLATFORM_TARGETS)) {
      const packageRoot = path.join(outputRoot, "npm", target.packageDir);
      const manifest = JSON.parse(
        await fs.promises.readFile(path.join(packageRoot, "package.json"), "utf8"),
      );
      assert.equal(manifest.name, target.packageName);
      assert.equal(manifest.version, mainPackage.version);
      assert.deepEqual(manifest.os, [target.os]);
      assert.deepEqual(manifest.cpu, [target.cpu]);
      assert.equal(
        fs.existsSync(path.join(packageRoot, "bin", target.binaryName)),
        true,
      );
    }
    const skillRoot = path.join(outputRoot, "npm", "skill");
    const skillManifest = JSON.parse(
      await fs.promises.readFile(path.join(skillRoot, "package.json"), "utf8"),
    );
    assert.equal(skillManifest.name, "@fastmoss/skill");
    assert.equal(skillManifest.version, mainPackage.version);
    assert.equal(skillManifest.dependencies, undefined);
    assert.equal(
      fs.existsSync(path.join(skillRoot, "skills", "fastmoss-cli", "SKILL.md")),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(skillRoot, "skills", "fastmoss-cli", ".DS_Store")),
      false,
    );
  } finally {
    await fs.promises.rm(outputRoot, { recursive: true, force: true });
  }
});

test("main optional dependencies match generated targets and version", () => {
  const expected = Object.fromEntries(
    Object.values(PLATFORM_TARGETS).map((target) => [
      target.packageName,
      mainPackage.version,
    ]),
  );
  assert.deepEqual(mainPackage.optionalDependencies, expected);
});
```

- [ ] **Step 2: Run the release-package test and verify it fails**

Run: `node --test test/release-packages.test.js`

Expected: FAIL because `scripts/build-release-packages.js` does not exist.

- [ ] **Step 3: Implement deterministic package generation**

Create `scripts/build-release-packages.js`. It must read the version from
`fastmoss/package.json`, parse and verify every SHA-256 entry, recreate
`<outputRoot>/npm`, generate platform manifests from `PLATFORM_TARGETS`, chmod
Unix binaries to `0755`, and build the Skill package from `fastmoss-skill/`
plus canonical `skills/fastmoss-cli`.

Use these helpers:

```js
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");

async function copyTree(source, destination) {
  await fs.promises.cp(source, destination, {
    recursive: true,
    filter(filePath) { return path.basename(filePath) !== ".DS_Store"; },
  });
}

function parseChecksums(content) {
  return new Map(content.trim().split(/\r?\n/).map((line) => {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
    if (!match) throw new Error(`Invalid SHA256SUMS line: ${line}`);
    return [match[2], match[1]];
  }));
}

async function sha256(filePath) {
  const content = await fs.promises.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}
```

Each platform manifest is:

```js
const manifest = {
  name: target.packageName,
  version,
  description: `FastMoss CLI binary for ${target.os}/${target.cpu}`,
  license: mainPackage.license,
  private: false,
  os: [target.os],
  cpu: [target.cpu],
  files: ["bin"],
};
```

Build the Skill manifest by spreading `package.template.json` and adding
`version`. Export `buildReleasePackages`, `copyTree`, `parseChecksums`, and
`sha256`. Direct execution writes to repository `dist/`.

The initial npm-generation function is:

```js
async function buildReleasePackages({
  repoRoot = path.join(__dirname, ".."),
  outputRoot = path.join(repoRoot, "dist"),
} = {}) {
  const mainPackage = JSON.parse(await fs.promises.readFile(
    path.join(repoRoot, "fastmoss", "package.json"),
    "utf8",
  ));
  const version = mainPackage.version;
  const checksums = parseChecksums(await fs.promises.readFile(
    path.join(repoRoot, "release-assets", "SHA256SUMS"),
    "utf8",
  ));

  await fs.promises.rm(outputRoot, { recursive: true, force: true });
  await fs.promises.mkdir(path.join(outputRoot, "npm"), { recursive: true });

  for (const target of Object.values(PLATFORM_TARGETS)) {
    if (mainPackage.optionalDependencies[target.packageName] !== version) {
      throw new Error(
        `${target.packageName} must be pinned to ${version} in fastmoss/package.json`,
      );
    }
    const assetPath = path.join(repoRoot, "release-assets", target.assetName);
    if ((await sha256(assetPath)) !== checksums.get(target.assetName)) {
      throw new Error(`SHA-256 mismatch for ${target.assetName}`);
    }
    const packageRoot = path.join(outputRoot, "npm", target.packageDir);
    await fs.promises.mkdir(path.join(packageRoot, "bin"), { recursive: true });
    const manifest = {
      name: target.packageName,
      version,
      description: `FastMoss CLI binary for ${target.os}/${target.cpu}`,
      license: mainPackage.license,
      private: false,
      os: [target.os],
      cpu: [target.cpu],
      files: ["bin"],
    };
    await fs.promises.writeFile(
      path.join(packageRoot, "package.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    const binaryPath = path.join(packageRoot, "bin", target.binaryName);
    await fs.promises.copyFile(assetPath, binaryPath);
    if (target.os !== "win32") await fs.promises.chmod(binaryPath, 0o755);
  }

  const skillRoot = path.join(outputRoot, "npm", "skill");
  const template = JSON.parse(await fs.promises.readFile(
    path.join(repoRoot, "fastmoss-skill", "package.template.json"),
    "utf8",
  ));
  await fs.promises.mkdir(skillRoot, { recursive: true });
  await fs.promises.writeFile(
    path.join(skillRoot, "package.json"),
    `${JSON.stringify({ ...template, version }, null, 2)}\n`,
  );
  for (const directory of ["bin", "lib"]) {
    await copyTree(
      path.join(repoRoot, "fastmoss-skill", directory),
      path.join(skillRoot, directory),
    );
  }
  for (const readme of ["README.md", "README.zh-CN.md"]) {
    await fs.promises.copyFile(
      path.join(repoRoot, "fastmoss-skill", readme),
      path.join(skillRoot, readme),
    );
  }
  await copyTree(
    path.join(repoRoot, "skills", "fastmoss-cli"),
    path.join(skillRoot, "skills", "fastmoss-cli"),
  );
  await fs.promises.chmod(
    path.join(skillRoot, "bin", "fastmoss-skill.js"),
    0o755,
  );
  return { checksums, version };
}
```

Finish the builder with:

```js
if (require.main === module) {
  buildReleasePackages().catch((error) => {
    process.stderr.write(`build release packages error: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildReleasePackages,
  copyTree,
  parseChecksums,
  sha256,
};
```

- [ ] **Step 4: Add repository commands and ignore generated output**

Create root `package.json`:

```json
{
  "name": "fastmoss-release-workspace",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "build:release": "node scripts/build-release-packages.js",
    "pack:release": "node scripts/pack-release.js",
    "test": "node scripts/run-tests.js",
    "test:integration": "node test/npm-install.integration.js"
  },
  "engines": {
    "node": ">=18"
  }
}
```

Append `/dist/` to `.gitignore`. The private workspace version is not a
release version.

Create `scripts/run-tests.js` so it recursively collects only files ending in
`.test.js` under `fastmoss/test`, `fastmoss-skill/test`, and `test`. Use the
complete file:

```js
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

const testFiles = [
  path.join(repoRoot, "fastmoss", "test"),
  path.join(repoRoot, "fastmoss-skill", "test"),
  path.join(repoRoot, "test"),
].flatMap(collect).sort();

if (testFiles.length === 0) {
  throw new Error("No .test.js files found");
}

const result = spawnSync(
  process.execPath,
  ["--test", ...testFiles],
  { cwd: repoRoot, stdio: "inherit" },
);
process.exitCode = result.status || 0;
```

Throw when no test files are found. This script must not include
`test/npm-install.integration.js`.

- [ ] **Step 5: Implement tarball packing and publish order**

Create `scripts/pack-release.js` using
`spawnSync("npm", ["pack", packageRoot, "--json", "--pack-destination", destination])`.
Pack in this exact order:

```js
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");

const repoRoot = path.join(__dirname, "..");

const packageRoots = [
  ...Object.values(PLATFORM_TARGETS).map((target) => ({
    kind: "platform",
    name: target.packageName,
    root: path.join(repoRoot, "dist", "npm", target.packageDir),
  })),
  { kind: "cli", name: "@fastmoss/cli", root: path.join(repoRoot, "fastmoss") },
  {
    kind: "skill",
    name: "@fastmoss/skill",
    root: path.join(repoRoot, "dist", "npm", "skill"),
  },
];
```

Complete the file with:

```js
const destination = path.join(repoRoot, "dist", "publish", "npm");
const version = require("../fastmoss/package.json").version;
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });

const manifest = packageRoots.map((entry) => {
  const result = spawnSync(
    "npm",
    ["pack", entry.root, "--json", "--pack-destination", destination],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`npm pack failed for ${entry.name}: ${result.stderr}`);
  }
  const packed = JSON.parse(result.stdout)[0];
  if (packed.name !== entry.name || packed.version !== version) {
    throw new Error(
      `Unexpected package identity for ${entry.name}: ${packed.name}@${packed.version}`,
    );
  }
  return {
    kind: entry.kind,
    name: packed.name,
    version: packed.version,
    file: path.basename(packed.filename),
  };
});

fs.writeFileSync(
  path.join(destination, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
```

The resulting manifest is the ordered array consumed by publishing.

- [ ] **Step 6: Run package tests and inspect tarballs**

Run:

```bash
npm test
npm run build:release
npm run pack:release
node -e 'const m=require("./dist/publish/npm/manifest.json"); if(m.length!==7) process.exit(1)'
```

Expected: tests PASS and seven `.tgz` files exist.

- [ ] **Step 7: Commit package generation**

```bash
git add .gitignore package.json scripts/run-tests.js scripts/build-release-packages.js scripts/pack-release.js test/release-packages.test.js
git commit -m "build: generate independent npm release packages"
```

## Task 5: Add The macOS And Linux GitHub Installer

**Files:**
- Create: `install.sh`
- Create: `test/install-sh.test.js`

- [ ] **Step 1: Write fixture tests for separate components and checksum failure**

Create `test/install-sh.test.js`. Its `createUnixInstallerFixture()` helper
must use `os.platform()` and `os.arch()` to choose the host asset name, create
an executable that prints `0.1.6`, write its SHA-256 to `SHA256SUMS`, create a
minimal `skills/fastmoss-cli/SKILL.md`, and copy `install.sh`.

Define `const unixTest = process.platform === "win32" ? test.skip : test;` so
Windows runs the dedicated PowerShell suite instead of requiring Bash.

Add these tests:

```js
unixTest("install.sh --all installs CLI and Skill without npm", async () => {
  const fixture = await createUnixInstallerFixture();
  const binDir = path.join(fixture.root, "bin");
  const skillRoot = path.join(fixture.root, "skills-target");
  const result = spawnSync("bash", [
    path.join(fixture.root, "install.sh"),
    "--all",
    "--bin-dir", binDir,
    "--skill-dir", skillRoot,
  ], {
    env: { ...process.env, PATH: "/usr/bin:/bin" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(binDir, "fastmoss")), true);
  assert.equal(
    fs.existsSync(path.join(skillRoot, "fastmoss-cli", "SKILL.md")),
    true,
  );
  assert.match(result.stdout, /Agent action: Read/);
});

unixTest("install.sh --cli never creates a Skill directory", async () => {
  const fixture = await createUnixInstallerFixture();
  const binDir = path.join(fixture.root, "bin");
  const skillRoot = path.join(fixture.root, "skills-target");
  const result = spawnSync("bash", [
    path.join(fixture.root, "install.sh"),
    "--cli",
    "--bin-dir", binDir,
    "--skill-dir", skillRoot,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(skillRoot), false);
});

unixTest("install.sh rejects a checksum mismatch", async () => {
  const fixture = await createUnixInstallerFixture();
  await fs.promises.appendFile(fixture.assetPath, "tampered\n");
  const result = spawnSync("bash", [
    path.join(fixture.root, "install.sh"),
    "--all",
    "--bin-dir", path.join(fixture.root, "bin"),
    "--skill-dir", path.join(fixture.root, "skills-target"),
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /checksum mismatch/i);
  assert.doesNotMatch(result.stdout, /Installed FastMoss/);
});

unixTest("install.sh reports an unwritable destination", async () => {
  const fixture = await createUnixInstallerFixture();
  const notDirectory = path.join(fixture.root, "not-a-directory");
  await fs.promises.writeFile(notDirectory, "file\n");
  const result = spawnSync("bash", [
    path.join(fixture.root, "install.sh"),
    "--cli",
    "--bin-dir", path.join(notDirectory, "bin"),
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /not-a-directory/);
  assert.doesNotMatch(result.stdout, /Installed FastMoss/);
});
```

Register each fixture root with `test.after()` for recursive cleanup. The
fixture must not invoke npm or access the network.

- [ ] **Step 2: Run Unix installer tests and verify they fail**

Run: `node --test test/install-sh.test.js`

Expected: FAIL because `install.sh` does not exist.

- [ ] **Step 3: Implement `install.sh`**

The Bash script must require one of `--cli`, `--skill`, or `--all`; accept
`--agent`, `--bin-dir`, and `--skill-dir`; and let command-line values override
`FASTMOSS_SKILL_AGENT`, `FASTMOSS_BIN_DIR`, and `FASTMOSS_SKILL_DIR`.

Use this checksum implementation:

```bash
die() {
  printf '%s\n' "fastmoss installer error: $*" >&2
  exit 1
}

verify_asset() {
  local asset_name="$1"
  local asset_path="${SCRIPT_DIR}/release-assets/${asset_name}"
  local expected actual
  expected="$(awk -v name="${asset_name}" '$2 == name { print $1 }' \
    "${SCRIPT_DIR}/release-assets/SHA256SUMS")"
  [ -n "${expected}" ] || die "checksum not found for ${asset_name}"
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "${asset_path}" | awk '{ print $1 }')"
  else
    actual="$(shasum -a 256 "${asset_path}" | awk '{ print $1 }')"
  fi
  [ "${actual}" = "${expected}" ] || die "checksum mismatch for ${asset_name}"
}
```

Map `Darwin/x86_64`, `Darwin/arm64`, `Linux/x86_64`, and `Linux/aarch64` to
the four Unix release assets. Verify the selected asset before executing it,
then derive `VERSION` with `--version`; this does not install CLI or require
Node.

Install the CLI with `install -m 0755` into
`${FASTMOSS_BIN_DIR:-$HOME/.local/bin}` unless `--bin-dir` is present. Print a
PATH command when the target is absent from `$PATH`; never edit shell files.

Use this atomic Skill function:

```bash
install_skill_root() {
  local root="$1"
  local target="${root}/fastmoss-cli"
  local temporary="${target}.tmp-$$"
  local backup="${target}.backup-$$"
  mkdir -p "${root}"
  rm -rf "${temporary}" "${backup}"
  mkdir -p "${temporary}"
  cp -R "${SCRIPT_DIR}/skills/fastmoss-cli/." "${temporary}/"
  find "${temporary}" -name .DS_Store -delete
  [ -f "${temporary}/SKILL.md" ] || die "Skill payload is missing SKILL.md"
  printf '{\n  "package": "@fastmoss/skill",\n  "skill": "fastmoss-cli",\n  "version": "%s"\n}\n' \
    "${VERSION}" > "${temporary}/.fastmoss-install.json"
  if [ -e "${target}" ]; then mv "${target}" "${backup}"; fi
  if ! mv "${temporary}" "${target}"; then
    [ ! -e "${backup}" ] || mv "${backup}" "${target}"
    die "failed to install Skill to ${target}"
  fi
  rm -rf "${backup}"
  printf '%s\n' "Installed FastMoss Skill: ${target}"
}
```

Without a custom Skill directory, default to `$CODEX_HOME`/`~/.codex`,
`$CLAUDE_HOME`/`~/.claude`, and `$AGENTS_HOME`/`~/.agents`. Print the installed
`SKILL.md` path and current-Agent handoff.

Run `chmod +x install.sh` so clone and archive users can execute it directly.

- [ ] **Step 4: Run Unix tests and syntax validation**

Run:

```bash
bash -n install.sh
node --test test/install-sh.test.js
```

Expected: syntax check and all fixture tests PASS.

- [ ] **Step 5: Commit the Unix installer**

```bash
git add install.sh test/install-sh.test.js
git commit -m "feat: add offline GitHub installer for Unix"
```

## Task 6: Add Windows Installation And GitHub Offline Archives

**Files:**
- Create: `install.ps1`
- Create: `test/install-powershell.ps1`
- Modify: `scripts/build-release-packages.js`
- Modify: `test/release-packages.test.js`
- Create: `scripts/create-release-archives.sh`

- [ ] **Step 1: Add failing GitHub staging assertions**

Extend `test/release-packages.test.js`:

```js
test("buildReleasePackages creates one self-contained GitHub tree per target", async () => {
  const outputRoot = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "fastmoss-github-"),
  );
  try {
    await buildReleasePackages({ repoRoot, outputRoot });
    for (const target of Object.values(PLATFORM_TARGETS)) {
      const bundle = path.join(outputRoot, "github", target.packageDir);
      assert.equal(
        fs.existsSync(path.join(bundle, "release-assets", target.assetName)),
        true,
      );
      assert.equal(
        fs.existsSync(path.join(bundle, "skills", "fastmoss-cli", "SKILL.md")),
        true,
      );
      assert.equal(
        fs.existsSync(path.join(
          bundle,
          target.os === "win32" ? "install.ps1" : "install.sh",
        )),
        true,
      );
      const checksumLines = (
        await fs.promises.readFile(
          path.join(bundle, "release-assets", "SHA256SUMS"),
          "utf8",
        )
      ).trim().split(/\r?\n/);
      assert.equal(checksumLines.length, 1);
      assert.match(checksumLines[0], new RegExp(`${target.assetName}$`));
    }
  } finally {
    await fs.promises.rm(outputRoot, { recursive: true, force: true });
  }
});

test("GitHub installers contain no package-manager or download command", async () => {
  const installers = (
    await Promise.all(["install.sh", "install.ps1"].map((file) =>
      fs.promises.readFile(path.join(repoRoot, file), "utf8"),
    ))
  ).join("\n");
  assert.doesNotMatch(
    installers,
    /\bnpm\b|\bnpx\b|\bcurl\b|\bwget\b|Invoke-WebRequest|Start-BitsTransfer/,
  );
});
```

- [ ] **Step 2: Verify staging test fails**

Run: `node --test test/release-packages.test.js`

Expected: FAIL because `<outputRoot>/github` is not generated.

- [ ] **Step 3: Implement the PowerShell installer**

Create `install.ps1` with:

```powershell
param(
  [switch]$Cli,
  [switch]$Skill,
  [switch]$All,
  [ValidateSet("codex", "claude", "agents", "all")]
  [string]$Agent,
  [string]$BinDir,
  [string]$SkillDir
)
```

Reject non-AMD64 Windows, select `fastmoss-windows-amd64.exe`, verify
`Get-FileHash -Algorithm SHA256` before executing it, derive the version with
`& $AssetPath --version`, and copy it to
`$env:LOCALAPPDATA\FastMoss\bin\fastmoss.exe` unless overridden.

Use this target resolver:

```powershell
function Get-SkillRoots {
  if ($SkillDir) { return @([IO.Path]::GetFullPath($SkillDir)) }
  if ($env:FASTMOSS_SKILL_DIR) {
    return @([IO.Path]::GetFullPath($env:FASTMOSS_SKILL_DIR))
  }
  $selected = if ($Agent) {
    $Agent
  } elseif ($env:FASTMOSS_SKILL_AGENT) {
    $env:FASTMOSS_SKILL_AGENT
  } else {
    "all"
  }
  $roots = @{
    codex = Join-Path $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }) "skills"
    claude = Join-Path $(if ($env:CLAUDE_HOME) { $env:CLAUDE_HOME } else { Join-Path $HOME ".claude" }) "skills"
    agents = Join-Path $(if ($env:AGENTS_HOME) { $env:AGENTS_HOME } else { Join-Path $HOME ".agents" }) "skills"
  }
  if ($selected -eq "all") {
    return @($roots.codex, $roots.claude, $roots.agents)
  }
  return @($roots[$selected])
}
```

Use sibling `.tmp-$PID` and `.backup-$PID` directories for replacement. Write
the same manifest and Agent handoff as `install.sh`. Do not call npm,
`Invoke-WebRequest`, or any network API.

- [ ] **Step 4: Add Windows smoke and checksum tests**

Create `test/install-powershell.ps1`. It must:

1. Create a temporary tree containing `install.ps1`, the Windows asset,
   canonical Skill, and `SHA256SUMS`.
2. Run `-All` with temporary `-BinDir` and `-SkillDir`.
3. Assert executable, `SKILL.md`, and manifest exist.
4. Append one byte to the fixture asset.
5. Run `-Cli` again and require nonzero exit plus `checksum mismatch`.
6. Remove the temporary tree in `finally`.

Use `throw` for assertions so GitHub Actions fails immediately.

- [ ] **Step 5: Generate GitHub staging trees**

Extend `buildReleasePackages()` after npm generation:

```js
const bundleRoot = path.join(outputRoot, "github", target.packageDir);
await fs.promises.mkdir(path.join(bundleRoot, "release-assets"), {
  recursive: true,
});
await fs.promises.copyFile(
  path.join(repoRoot, "release-assets", target.assetName),
  path.join(bundleRoot, "release-assets", target.assetName),
);
if (target.os !== "win32") {
  await fs.promises.chmod(
    path.join(bundleRoot, "release-assets", target.assetName),
    0o755,
  );
}
await fs.promises.writeFile(
  path.join(bundleRoot, "release-assets", "SHA256SUMS"),
  `${checksums.get(target.assetName)}  ${target.assetName}\n`,
);
await copyTree(path.join(repoRoot, "skills"), path.join(bundleRoot, "skills"));
const installerName = target.os === "win32" ? "install.ps1" : "install.sh";
await fs.promises.copyFile(
  path.join(repoRoot, installerName),
  path.join(bundleRoot, installerName),
);
```

Write `README.txt` with `./install.sh --all` or `.\install.ps1 -All`.

- [ ] **Step 6: Add archive creation**

Create `scripts/create-release-archives.sh`. Read the version with
`node -p "require('./fastmoss/package.json').version"`, recreate
`dist/publish/github`, and emit exactly four `.tar.gz` files and one `.zip`:

```text
fastmoss-v0.1.6-darwin-amd64.tar.gz
fastmoss-v0.1.6-darwin-arm64.tar.gz
fastmoss-v0.1.6-linux-amd64.tar.gz
fastmoss-v0.1.6-linux-arm64.tar.gz
fastmoss-v0.1.6-windows-amd64.zip
```

Use `tar -C <bundle> -czf` for Unix and run `zip -qr` from inside the Windows
bundle. Reject missing or empty output.

Run `chmod +x scripts/create-release-archives.sh`.

- [ ] **Step 7: Run cross-channel packaging checks**

Run:

```bash
node --test test/release-packages.test.js test/install-sh.test.js
bash -n install.sh scripts/create-release-archives.sh
npm run build:release
bash scripts/create-release-archives.sh
find dist/publish/github -maxdepth 1 -type f -print
```

Expected: all tests PASS and five archives exist. Run
`pwsh -File test/install-powershell.ps1` when PowerShell is available;
Windows CI is the required platform verification.

- [ ] **Step 8: Commit Windows and GitHub bundle support**

```bash
git add install.ps1 test/install-powershell.ps1 scripts/build-release-packages.js scripts/create-release-archives.sh test/release-packages.test.js
git commit -m "feat: add Windows installer and GitHub offline bundles"
```

## Task 7: Prove npm Installation Against An Isolated Registry

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `test/npm-install.integration.js`
- Modify: `fastmoss/test/package.test.js`

- [ ] **Step 1: Pin Verdaccio and create the lockfile**

Add:

```json
{
  "devDependencies": {
    "verdaccio": "6.8.0"
  }
}
```

Run: `npm install --package-lock-only`

Expected: lockfile pins Verdaccio 6.8.0; published packages gain no dependency.

- [ ] **Step 2: Write the isolated-registry integration script**

Create `test/npm-install.integration.js` as a standalone Node script. It must:

1. Reserve an available localhost port.
2. Create a temporary Verdaccio config with no uplinks.
3. Start `node_modules/.bin/verdaccio` and poll `/-/ping` until it returns 200
   or a 10-second deadline expires.
4. Register user `ci` through `PUT /-/user/org.couchdb.user:ci`.
5. Write the returned token and local registry to a temporary `.npmrc`.
6. Run `npm run build:release`.
7. Publish all platform directories, `fastmoss/`, then generated Skill.
8. Test CLI-only and Skill-only paths with separate prefixes and homes.
9. Stop Verdaccio and remove temporary files in `finally`.

Generate the registry policy with runtime paths:

```js
const verdaccioConfig = [
  `storage: ${JSON.stringify(path.join(tempRoot, "storage"))}`,
  "auth:",
  "  htpasswd:",
  `    file: ${JSON.stringify(path.join(tempRoot, "htpasswd"))}`,
  "    max_users: 1000",
  "uplinks: {}",
  "packages:",
  '  "@*/*":',
  "    access: $all",
  "    publish: $authenticated",
  "    unpublish: $authenticated",
  "    proxy: false",
  '  "**":',
  "    access: $all",
  "    publish: $authenticated",
  "    unpublish: $authenticated",
  "    proxy: false",
  "log:",
  "  type: stdout",
  "  format: pretty",
  "  level: warn",
  "",
].join("\n");
await fs.promises.writeFile(configPath, verdaccioConfig);
```

After user creation returns `{ token }`, write:

```js
const userResponse = await fetch(
  `${registryURL}-/user/org.couchdb.user:ci`,
  {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      _id: "org.couchdb.user:ci",
      name: "ci",
      password: "ci-password",
      email: "ci@example.com",
      type: "user",
      roles: [],
    }),
  },
);
assert.equal(userResponse.status, 201);
const { token } = await userResponse.json();
const registryHost = registryURL.replace(/^https?:/, "");
const npmrc = [
  `registry=${registryURL}`,
  `@fastmoss:registry=${registryURL}`,
  `${registryHost}:_authToken=${token}`,
  "always-auth=true",
  "",
].join("\n");
await fs.promises.writeFile(npmrcPath, npmrc);
```

Set this environment for npm children:

```js
const isolatedEnv = {
  ...process.env,
  NPM_CONFIG_USERCONFIG: npmrcPath,
  npm_config_registry: registryURL,
  HTTP_PROXY: "http://127.0.0.1:9",
  HTTPS_PROXY: "http://127.0.0.1:9",
  http_proxy: "http://127.0.0.1:9",
  https_proxy: "http://127.0.0.1:9",
  NO_PROXY: "127.0.0.1,localhost",
  no_proxy: "127.0.0.1,localhost",
};
```

CLI-only assertions:

```js
run("npm", ["install", "-g", "@fastmoss/cli@latest"], {
  ...isolatedEnv,
  HOME: cliHome,
  USERPROFILE: cliHome,
  npm_config_prefix: cliPrefix,
});
const fastmossCommand = process.platform === "win32"
  ? path.join(cliPrefix, "fastmoss.cmd")
  : path.join(cliPrefix, "bin", "fastmoss");
const versionResult = run(fastmossCommand, ["--version"], isolatedEnv);
assert.equal(versionResult.stdout.trim(), mainPackage.version);
assert.equal(fs.existsSync(path.join(cliHome, ".agents", "skills")), false);
```

Skill-only assertions using the documented command:

```js
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const skillResult = run(npxCommand, ["-y", "@fastmoss/skill@latest"], {
  ...isolatedEnv,
  HOME: skillHome,
  USERPROFILE: skillHome,
  npm_config_prefix: skillPrefix,
});
for (const agentDir of [".codex", ".claude", ".agents"]) {
  assert.equal(
    fs.existsSync(path.join(
      skillHome,
      agentDir,
      "skills",
      "fastmoss-cli",
      "SKILL.md",
    )),
    true,
  );
}
assert.match(skillResult.stdout, /Agent action: Read/);
const unexpectedCLI = process.platform === "win32"
  ? path.join(skillPrefix, "fastmoss.cmd")
  : path.join(skillPrefix, "bin", "fastmoss");
assert.equal(fs.existsSync(unexpectedCLI), false);
```

- [ ] **Step 3: Run isolated installation**

Run:

```bash
npm ci
npm run test:integration
```

Expected: PASS. Verdaccio sees only localhost requests and cannot proxy.

- [ ] **Step 4: Add static network-regression assertions**

Extend `fastmoss/test/package.test.js` to scan only `package.json`, `bin/`, and
`lib/` and reject:

```js
const forbidden = [
  "github.com/FastMoss/cli/releases/download",
  "FASTMOSS_DOWNLOAD_BASE_URL",
  "node:http",
  "node:https",
];
```

README links to the separate GitHub channel are allowed.

- [ ] **Step 5: Run all npm-channel checks**

Run:

```bash
npm test
npm run build:release
npm run pack:release
npm run test:integration
```

Expected: all commands PASS and seven npm tarballs are generated.

- [ ] **Step 6: Commit isolated npm verification**

```bash
git add package.json package-lock.json test/npm-install.integration.js fastmoss/test/package.test.js
git commit -m "test: verify npm installs without GitHub access"
```

## Task 8: Update The Canonical Skill And Installation Documentation

**Files:**
- Modify: `skills/fastmoss-cli/SKILL.md`
- Modify: `skills/fastmoss-cli/references/cli.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `fastmoss/README.md`
- Modify: `fastmoss/README.zh-CN.md`
- Modify: `fastmoss-skill/README.md`
- Modify: `fastmoss-skill/README.zh-CN.md`
- Modify: `test/release-packages.test.js`

- [ ] **Step 1: Invoke Skill authoring guidance**

Use `skill-creator` and `superpowers:writing-skills` before editing the
deployed Skill. Preserve all tool-selection and tool-calling behavior; only
installation and startup wording is in scope.

- [ ] **Step 2: Add a failing documentation-contract test**

Add to `test/release-packages.test.js`:

```js
test("active docs use independent npm commands and no old Skill installer", async () => {
  const files = [
    "README.md",
    "README.zh-CN.md",
    "fastmoss/README.md",
    "fastmoss/README.zh-CN.md",
    "skills/fastmoss-cli/SKILL.md",
    "skills/fastmoss-cli/references/cli.md",
  ];
  const content = (
    await Promise.all(files.map((file) =>
      fs.promises.readFile(path.join(repoRoot, file), "utf8"),
    ))
  ).join("\n");
  assert.match(content, /npm install -g @fastmoss\/cli@latest/);
  assert.match(content, /npx -y @fastmoss\/skill@latest/);
  assert.doesNotMatch(content, /npx skills add FastMoss\/cli/);
  assert.doesNotMatch(content, /fastmoss-install-skill/);
  assert.doesNotMatch(content, /--allow-scripts=@fastmoss\/cli/);
});
```

- [ ] **Step 3: Verify documentation test fails**

Run: `node --test test/release-packages.test.js`

Expected: FAIL on the old `skills add`, `fastmoss-install-skill`, and
`--allow-scripts` instructions.

- [ ] **Step 4: Update canonical Skill startup**

In `skills/fastmoss-cli/SKILL.md`, replace the missing/update CLI block with:

````markdown
If the FastMoss CLI is not installed, the command is not found, or the user
asks to update it, install the current npm release:

```bash
npm install -g @fastmoss/cli@latest
```

This installs only the CLI. Do not reinstall this Skill unless the user also
asks to install or update the Agent Skill.
````

In `skills/fastmoss-cli/references/cli.md`, use the same exact command and
state that the CLI package does not install Agent Skills.

- [ ] **Step 5: Rewrite installation sections in all four product READMEs**

Use this first English installation block:

````markdown
Install only the CLI:

```bash
npm install -g @fastmoss/cli@latest
```

Install only the Agent Skill:

```bash
npx -y @fastmoss/skill@latest
```
````

The Chinese equivalent uses “只安装 CLI” and “只安装 Agent Skill”. Add the
GitHub clone commands and Windows switches from the design spec. Replace the
old Binary Download/Cache sections with a short npm package architecture
section: npm installs one matching platform package and never downloads from
GitHub. Keep API key, command reference, and tool catalog content unchanged.

- [ ] **Step 6: Finalize standalone Skill package READMEs**

Document default `all`, all four `--agent` values, `FASTMOSS_SKILL_DIR`,
`uninstall`, current-Agent handoff, and the possible next-session limitation.
Do not imply that Skill installation installs CLI.

- [ ] **Step 7: Run Skill and docs verification**

Run:

```bash
npm test
rg -n "npx skills add FastMoss/cli|fastmoss-install-skill|--allow-scripts=@fastmoss/cli|FASTMOSS_DOWNLOAD_BASE_URL" \
  README.md README.zh-CN.md fastmoss/README.md fastmoss/README.zh-CN.md \
  fastmoss/package.json fastmoss/bin fastmoss/lib \
  fastmoss-skill/README.md fastmoss-skill/README.zh-CN.md skills
```

Expected: tests PASS and `rg` returns no matches.

- [ ] **Step 8: Commit docs and canonical Skill**

```bash
git add README.md README.zh-CN.md fastmoss/README.md fastmoss/README.zh-CN.md fastmoss-skill/README.md fastmoss-skill/README.zh-CN.md skills/fastmoss-cli test/release-packages.test.js
git commit -m "docs: document independent CLI and Skill installs"
```

## Task 9: Replace The Release Workflow

**Files:**
- Replace: `.github/workflows/release.yml`
- Modify: `test/release-packages.test.js`

- [ ] **Step 1: Add failing workflow assertions**

Add:

```js
test("release workflow validates before independent channel publishing", async () => {
  const workflow = await fs.promises.readFile(
    path.join(repoRoot, ".github", "workflows", "release.yml"),
    "utf8",
  );
  for (const required of [
    "npm ci",
    "npm run test:integration",
    "npm run build:release",
    "npm run pack:release",
    "scripts/create-release-archives.sh",
    "dist/publish/npm",
    "dist/publish/github",
  ]) {
    const escaped = required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(workflow, new RegExp(escaped));
  }
  assert.doesNotMatch(workflow, /needs:\s*publish-release/);
});
```

- [ ] **Step 2: Verify workflow test fails**

Run: `node --test test/release-packages.test.js`

Expected: FAIL because the current workflow publishes GitHub first and
publishes directly from `fastmoss/`.

- [ ] **Step 3: Replace workflow with validation, build, and independent publishers**

Keep the `v*` tag trigger. Add required `release_tag` input for
`workflow_dispatch`. Define one workflow-level `RELEASE_TAG` expression that
uses `inputs.release_tag` for manual runs and `github.ref_name` for tag pushes.
Every checkout in `test`, `build-release`, and `publish-github` must set
`ref: ${{ env.RELEASE_TAG }}`. Implement:

1. `test`: matrix of `ubuntu-latest`, `macos-latest`, and `windows-latest`;
   checkout, Node 20, `npm ci`, `npm test`, and `npm run test:integration`.
   On Windows also run `test/install-powershell.ps1`.
2. `build-release`: needs `test`, runs Ubuntu, verifies
   `fastmoss/package.json` equals selected tag, runs build, pack, and archive
   commands, then uploads `dist/publish`.
3. `publish-npm`: needs `build-release`, downloads artifact, configures
   npmjs, and publishes seven tarballs in manifest order.
4. `publish-github`: needs `build-release`, checks out the tagged repository,
   downloads the artifact, and publishes raw `release-assets/*` plus
   `dist/publish/github/*`.

Use the generated manifest for npm:

```bash
node - <<'NODE'
const { spawnSync } = require("node:child_process");
const manifest = require("./dist/publish/npm/manifest.json");
for (const entry of manifest) {
  const result = spawnSync(
    "npm",
    ["publish", `dist/publish/npm/${entry.file}`, "--access", "public"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
NODE
```

`publish-npm` and `publish-github` depend only on `build-release`, never on
each other. Set `NODE_AUTH_TOKEN` only in `publish-npm`.

- [ ] **Step 4: Run local release checks**

Run:

```bash
npm test
npm run build:release
npm run pack:release
bash scripts/create-release-archives.sh
git diff --check
```

Expected: all checks PASS and YAML has no whitespace errors.

- [ ] **Step 5: Commit workflow**

```bash
git add .github/workflows/release.yml test/release-packages.test.js
git commit -m "ci: publish npm and GitHub channels independently"
```

## Task 10: Full Verification And Review

**Files:**
- Verify all files changed by Tasks 1-9.
- Modify only files required by failures found here.

- [ ] **Step 1: Run complete local verification**

Run:

```bash
npm ci
npm test
npm run test:integration
npm run build:release
npm run pack:release
bash scripts/create-release-archives.sh
```

Expected: every command exits 0.

- [ ] **Step 2: Inspect release payload boundaries**

Run:

```bash
node -e 'const m=require("./dist/publish/npm/manifest.json"); console.log(m.map(x => `${x.kind} ${x.name} ${x.version} ${x.file}`).join("\n"))'
find dist/publish/github -maxdepth 1 -type f -print | sort
npm pack fastmoss --dry-run --json
npm pack dist/npm/skill --dry-run --json
```

Expected:

- Seven npm entries: five platform, one CLI, one Skill.
- Five GitHub archives.
- CLI tarball has no Skill, `postinstall`, or downloader.
- Skill tarball has canonical Skill but no CLI binary or dependency.

- [ ] **Step 3: Scan for forbidden active behavior**

Run:

```bash
rg -n "github\.com/FastMoss/cli/releases/download|node:http|node:https|FASTMOSS_DOWNLOAD_BASE_URL|FASTMOSS_SKIP_DOWNLOAD" \
  fastmoss/package.json fastmoss/bin fastmoss/lib
rg -n "fastmoss-install-skill|npx skills add FastMoss/cli|--allow-scripts=@fastmoss/cli" \
  README.md README.zh-CN.md fastmoss/README.md fastmoss/README.zh-CN.md \
  fastmoss-skill/README.md fastmoss-skill/README.zh-CN.md skills
```

Expected: neither command matches. Tests containing guard strings and
historical specs/plans are intentionally excluded.

- [ ] **Step 4: Verify source uniqueness and repository hygiene**

Run:

```bash
test ! -d fastmoss/skills
test -f skills/fastmoss-cli/SKILL.md
git diff --check
git status --short
```

Expected: only intended implementation changes are present, `dist/` is
ignored, and there is one editable Skill tree.

- [ ] **Step 5: Request code review**

Invoke `superpowers:requesting-code-review`. Review against all eight design
acceptance criteria, exact platform versions, rollback safety, and accidental
network fallback.

- [ ] **Step 6: Fix review findings with TDD**

For each accepted finding, add or update a failing test first, verify the
failure, make the smallest implementation change, and rerun Step 1.

- [ ] **Step 7: Commit review fixes when present**

```bash
git add -u
git add .github fastmoss fastmoss-skill install.sh install.ps1 package.json package-lock.json scripts skills test README.md README.zh-CN.md
git commit -m "fix: address installation redesign review"
```

Skip this commit when review requires no code changes. Never add `dist/`.

- [ ] **Step 8: Finish the development branch**

Invoke `superpowers:verification-before-completion`, then
`superpowers:finishing-a-development-branch`. Report exact test commands,
results, branch name, and merge/PR choices.
