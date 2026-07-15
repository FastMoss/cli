# FastMoss 独立安装实施计划

> **面向 Agent 执行者：** 必须使用子技能 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐个任务实施本计划。所有步骤使用复选框（`- [ ]`）跟踪状态。

**目标：** 将 npm 和 GitHub 建设为相互独立、能力对等的安装渠道，同时支持分别安装 FastMoss CLI 与 Agent Skill。

**架构：** `@fastmoss/cli` 改为不执行下载的启动器，由精确版本的平台专用 npm 包提供二进制。`@fastmoss/skill` 改为独立 npm 可执行包，把唯一来源的 Skill 复制到 Agent 目录；GitHub 则基于相同二进制和 Skill 源码发布本地 Shell/PowerShell 安装器及各平台离线压缩包。

**技术栈：** Node.js 18+ CommonJS、Node 内置测试运行器、npm optional dependencies、用于隔离 registry 测试的 Verdaccio 6.8.0、Bash、PowerShell、GitHub Actions。

---

## 背景与约束

- 设计规范：`docs/superpowers/specs/2026-07-14-fastmoss-installation-redesign-design.md`
- 2026-07-15 基线：`cd fastmoss && npm test` 的 21 个测试全部通过。
- 仓库内二进制报告版本为 `0.1.6`；本次重构不提升发布版本。
- `fastmoss/package.json` 继续作为唯一发布版本来源。
- npm 启动器中绝不能恢复 GitHub 下载兜底。
- 保留工作树中无关的用户改动。执行时使用 `superpowers:using-git-worktrees` 创建隔离工作树。

## 文件职责

### CLI 启动器

- 新建 `fastmoss/lib/targets.js`：供运行时和打包流程共用的唯一平台目标表。
- 替换 `fastmoss/lib/runtime.js`：解析并启动已安装的 npm 平台包。
- 修改 `fastmoss/bin/fastmoss.js`：传递子进程退出码。
- 替换 `fastmoss/test/fastmoss.test.js`：运行时与平台解析测试。
- 新建 `fastmoss/test/package.test.js`：主 npm 包发布契约测试。
- 修改 `fastmoss/package.json`：只保留 `fastmoss` bin，使用精确 optional dependencies，不包含 lifecycle scripts。
- 删除 `fastmoss/bin/install-skill.js`、`fastmoss/bin/postinstall.js` 和 `fastmoss/skills/`。

### 独立 Skill 包

- 新建 `fastmoss-skill/lib/installer.js`：参数解析、目标解析、原子安装/升级、卸载和 Agent handoff。
- 新建 `fastmoss-skill/bin/fastmoss-skill.js`：可执行入口。
- 新建 `fastmoss-skill/package.template.json`：不含版本号的发布 manifest 模板。
- 新建 `fastmoss-skill/test/installer.test.js`：安装器行为测试。
- 新建 `fastmoss-skill/README.md` 和 `fastmoss-skill/README.zh-CN.md`：npm 包文档。

### 发布物生成与验证

- 新建 `package.json` 和 `package-lock.json`：仓库级测试/构建命令及固定版本的 Verdaccio。
- 修改 `.gitignore`：忽略生成的 `dist/`。
- 新建 `scripts/build-release-packages.js`：校验哈希并生成平台 npm 包、Skill npm 包和 GitHub staging 目录。
- 新建 `scripts/run-tests.js`：只发现 `*.test.js` 单元/契约测试，避免隐式运行 registry 集成脚本。
- 新建 `scripts/pack-release.js`：按发布顺序生成 npm tarball 与发布 manifest。
- 新建 `scripts/create-release-archives.sh`：生成 `.tar.gz` 和 `.zip` GitHub 压缩包。
- 新建 `test/release-packages.test.js`：生成包与压缩包 staging 契约测试。
- 新建 `test/npm-install.integration.js`：本地 registry 端到端安装测试。

### GitHub 安装器与发布

- 新建 `install.sh`：macOS/Linux 本地安装器。
- 新建 `install.ps1`：Windows 本地安装器。
- 新建 `test/install-sh.test.js`：Unix 安装器 fixture 测试。
- 新建 `test/install-powershell.ps1`：Windows 安装器冒烟与校验和测试。
- 替换 `.github/workflows/release.yml`：先验证，再独立发布生成的 npm tarball 和 GitHub 压缩包。

### 用户文档

- 修改 `README.md`、`README.zh-CN.md`、`fastmoss/README.md` 和 `fastmoss/README.zh-CN.md`。
- 修改 `skills/fastmoss-cli/SKILL.md` 和 `skills/fastmoss-cli/references/cli.md`。

## 任务 1：从已安装的平台包解析 CLI 二进制

**文件：**
- 新建：`fastmoss/lib/targets.js`
- 替换：`fastmoss/lib/runtime.js`
- 修改：`fastmoss/bin/fastmoss.js`
- 替换：`fastmoss/test/fastmoss.test.js`

- [ ] **步骤 1：用预期失败的平台包测试替换运行时测试文件**

使用以下测试结构。它定义后续任务统一使用的公共函数名：

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

- [ ] **步骤 2：运行测试，确认旧下载器 API 不满足新契约**

运行：

```bash
cd fastmoss
npm test
```

预期：失败，因为 `lib/targets.js` 和 `resolvePlatformBinary` 尚不存在。

- [ ] **步骤 3：创建共享平台目标表**

新建 `fastmoss/lib/targets.js`：

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

- [ ] **步骤 4：用包解析和进程转发替换下载器运行时**

将 `fastmoss/lib/runtime.js` 替换为：

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

修改 `fastmoss/bin/fastmoss.js`：

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

- [ ] **步骤 5：运行 CLI 测试**

运行：`cd fastmoss && npm test`

预期：所有新运行时测试通过，并且不会启动 HTTP 服务器。

- [ ] **步骤 6：提交运行时改动**

```bash
git add fastmoss/lib/targets.js fastmoss/lib/runtime.js fastmoss/bin/fastmoss.js fastmoss/test/fastmoss.test.js
git commit -m "feat: resolve CLI from npm platform packages"
```

## 任务 2：将主 npm 包改为仅包含 CLI

**文件：**
- 新建：`fastmoss/test/package.test.js`
- 修改：`fastmoss/package.json`
- 删除：`fastmoss/bin/install-skill.js`
- 删除：`fastmoss/bin/postinstall.js`
- 删除：`fastmoss/skills/fastmoss-cli/`

- [ ] **步骤 1：编写预期失败的包契约测试**

新建 `fastmoss/test/package.test.js`：

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

- [ ] **步骤 2：确认包契约测试失败**

运行：`cd fastmoss && npm test`

预期：失败，因为包仍暴露 `fastmoss-install-skill`，仍有 `postinstall`，并包含 `skills`。

- [ ] **步骤 3：替换包 manifest**

保持版本 `0.1.6`，采用以下契约：

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

删除两个废弃的 bin 脚本和重复的 `fastmoss/skills` 目录。不要修改唯一来源 `skills/fastmoss-cli`。

- [ ] **步骤 4：运行测试并检查 tarball**

运行：

```bash
cd fastmoss
npm test
npm pack --dry-run --json
```

预期：测试通过；tarball 中不出现 Skill 或废弃安装器文件。

- [ ] **步骤 5：提交仅包含 CLI 的主包**

```bash
git add fastmoss/package.json fastmoss/test/package.test.js
git add -A fastmoss/bin fastmoss/skills
git commit -m "refactor: make CLI npm package independent"
```

## 任务 3：构建独立 Skill 安装器

**文件：**
- 新建：`fastmoss-skill/lib/installer.js`
- 新建：`fastmoss-skill/bin/fastmoss-skill.js`
- 新建：`fastmoss-skill/package.template.json`
- 新建：`fastmoss-skill/test/installer.test.js`
- 新建：`fastmoss-skill/README.md`
- 新建：`fastmoss-skill/README.zh-CN.md`

- [ ] **步骤 1：为参数解析、目标目录、替换、回滚和卸载编写预期失败的测试**

新建 `fastmoss-skill/test/installer.test.js`，使用真实临时目录：

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

- [ ] **步骤 2：运行 Skill 测试并确认失败**

运行：`node --test fastmoss-skill/test/*.test.js`

预期：失败，因为 `lib/installer.js` 尚不存在。

- [ ] **步骤 3：实现安装器 API**

新建 `fastmoss-skill/lib/installer.js`，采用以下导出与规则：

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

- [ ] **步骤 4：添加可执行入口和无版本号包模板**

新建 `fastmoss-skill/bin/fastmoss-skill.js`：

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

运行 `chmod +x fastmoss-skill/bin/fastmoss-skill.js`。

新建 `fastmoss-skill/package.template.json`：

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

在两个包 README 中写明 `npx -y @fastmoss/skill@latest`、四种 `--agent` 值、`uninstall`、`FASTMOSS_SKILL_DIR`，并明确声明该包既不包含也不安装 `@fastmoss/cli`。

- [ ] **步骤 5：运行 Skill 测试**

运行：`node --test fastmoss-skill/test/*.test.js`

预期：所有测试通过，包括回滚和保留非本安装器管理目录的测试。

- [ ] **步骤 6：提交独立安装器源码**

```bash
git add fastmoss-skill
git commit -m "feat: add standalone npm Skill installer"
```

## 任务 4：生成并验证 npm 发布包

**文件：**
- 新建：`package.json`
- 修改：`.gitignore`
- 新建：`scripts/run-tests.js`
- 新建：`scripts/build-release-packages.js`
- 新建：`scripts/pack-release.js`
- 新建：`test/release-packages.test.js`

- [ ] **步骤 1：添加预期失败的生成包契约测试**

新建 `test/release-packages.test.js`：

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

- [ ] **步骤 2：运行发布包测试并确认失败**

运行：`node --test test/release-packages.test.js`

预期：失败，因为 `scripts/build-release-packages.js` 尚不存在。

- [ ] **步骤 3：实现确定性的包生成流程**

新建 `scripts/build-release-packages.js`。它必须从 `fastmoss/package.json` 读取版本，解析并校验每条 SHA-256 记录，重新创建 `<outputRoot>/npm`，根据 `PLATFORM_TARGETS` 生成平台 manifest，将 Unix 二进制权限设为 `0755`，并基于 `fastmoss-skill/` 与唯一来源 `skills/fastmoss-cli` 构建 Skill 包。

使用以下辅助函数：

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

每个平台 manifest 为：

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

展开 `package.template.json` 并加入 `version` 生成 Skill manifest。导出 `buildReleasePackages`、`copyTree`、`parseChecksums` 和 `sha256`。直接执行脚本时写入仓库 `dist/`。

初始 npm 包生成函数如下：

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

在构建器末尾加入：

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

- [ ] **步骤 4：添加仓库级命令并忽略生成物**

新建根目录 `package.json`：

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

在 `.gitignore` 追加 `/dist/`。该私有 workspace 的版本号不是发布版本。

新建 `scripts/run-tests.js`，递归收集 `fastmoss/test`、`fastmoss-skill/test` 和 `test` 下仅以 `.test.js` 结尾的文件。完整文件如下：

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

找不到测试文件时抛出错误。该脚本不得包含 `test/npm-install.integration.js`。

- [ ] **步骤 5：实现 tarball 打包与发布顺序**

新建 `scripts/pack-release.js`，使用 `spawnSync("npm", ["pack", packageRoot, "--json", "--pack-destination", destination])`。严格按以下顺序打包：

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

使用以下代码完成该文件：

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

生成的 manifest 是发布流程消费的有序数组。

- [ ] **步骤 6：运行包测试并检查 tarball**

运行：

```bash
npm test
npm run build:release
npm run pack:release
node -e 'const m=require("./dist/publish/npm/manifest.json"); if(m.length!==7) process.exit(1)'
```

预期：测试通过，并生成 7 个 `.tgz` 文件。

- [ ] **步骤 7：提交包生成流程**

```bash
git add .gitignore package.json scripts/run-tests.js scripts/build-release-packages.js scripts/pack-release.js test/release-packages.test.js
git commit -m "build: generate independent npm release packages"
```

## 任务 5：添加 macOS 与 Linux 的 GitHub 安装器

**文件：**
- 新建：`install.sh`
- 新建：`test/install-sh.test.js`

- [ ] **步骤 1：为组件独立安装和校验和失败编写 fixture 测试**

新建 `test/install-sh.test.js`。其中 `createUnixInstallerFixture()` 辅助函数必须使用 `os.platform()` 和 `os.arch()` 选择宿主机资产名，创建一个输出 `0.1.6` 的可执行文件，将其 SHA-256 写入 `SHA256SUMS`，创建最小化的 `skills/fastmoss-cli/SKILL.md`，并复制 `install.sh`。

定义 `const unixTest = process.platform === "win32" ? test.skip : test;`，使 Windows 运行专用 PowerShell 测试，而不是依赖 Bash。

添加以下测试：

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

使用 `test.after()` 注册每个 fixture 根目录以递归清理。fixture 不得调用 npm 或访问网络。

- [ ] **步骤 2：运行 Unix 安装器测试并确认失败**

运行：`node --test test/install-sh.test.js`

预期：失败，因为 `install.sh` 尚不存在。

- [ ] **步骤 3：实现 `install.sh`**

Bash 脚本必须要求提供 `--cli`、`--skill` 或 `--all` 之一；接受 `--agent`、`--bin-dir` 和 `--skill-dir`；命令行参数优先于 `FASTMOSS_SKILL_AGENT`、`FASTMOSS_BIN_DIR` 和 `FASTMOSS_SKILL_DIR`。

使用以下校验和实现：

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

将 `Darwin/x86_64`、`Darwin/arm64`、`Linux/x86_64` 和 `Linux/aarch64` 映射到四个 Unix 发布资产。先校验选中的资产，再执行 `--version` 得到 `VERSION`；这个过程不会安装 CLI，也不依赖 Node。

除非提供 `--bin-dir`，否则使用 `install -m 0755` 将 CLI 安装到 `${FASTMOSS_BIN_DIR:-$HOME/.local/bin}`。当目标目录不在 `$PATH` 时输出 PATH 配置命令，但绝不修改 shell 配置文件。

使用以下 Skill 原子安装函数：

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

未指定自定义 Skill 目录时，默认使用 `$CODEX_HOME`/`~/.codex`、`$CLAUDE_HOME`/`~/.claude` 和 `$AGENTS_HOME`/`~/.agents`。输出已安装的 `SKILL.md` 路径和当前 Agent handoff。

运行 `chmod +x install.sh`，确保 clone 和压缩包用户可以直接执行。

- [ ] **步骤 4：运行 Unix 测试和语法校验**

运行：

```bash
bash -n install.sh
node --test test/install-sh.test.js
```

预期：语法检查和全部 fixture 测试通过。

- [ ] **步骤 5：提交 Unix 安装器**

```bash
git add install.sh test/install-sh.test.js
git commit -m "feat: add offline GitHub installer for Unix"
```

## 任务 6：添加 Windows 安装与 GitHub 离线压缩包

**文件：**
- 新建：`install.ps1`
- 新建：`test/install-powershell.ps1`
- 修改：`scripts/build-release-packages.js`
- 修改：`test/release-packages.test.js`
- 新建：`scripts/create-release-archives.sh`

- [ ] **步骤 1：添加预期失败的 GitHub staging 断言**

扩展 `test/release-packages.test.js`：

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

- [ ] **步骤 2：确认 staging 测试失败**

运行：`node --test test/release-packages.test.js`

预期：失败，因为尚未生成 `<outputRoot>/github`。

- [ ] **步骤 3：实现 PowerShell 安装器**

新建 `install.ps1`，参数如下：

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

拒绝非 AMD64 Windows，选择 `fastmoss-windows-amd64.exe`，执行前使用 `Get-FileHash -Algorithm SHA256` 校验，通过 `& $AssetPath --version` 获取版本；除非显式覆盖，否则复制到 `$env:LOCALAPPDATA\FastMoss\bin\fastmoss.exe`。

使用以下目标目录解析器：

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

使用同级 `.tmp-$PID` 和 `.backup-$PID` 目录完成替换。写入与 `install.sh` 相同的 manifest 和 Agent handoff。不得调用 npm、`Invoke-WebRequest` 或任何网络 API。

- [ ] **步骤 4：添加 Windows 冒烟与校验和测试**

新建 `test/install-powershell.ps1`。它必须：

1. 创建包含 `install.ps1`、Windows 资产、唯一 Skill 和 `SHA256SUMS` 的临时目录树。
2. 使用临时 `-BinDir` 和 `-SkillDir` 运行 `-All`。
3. 断言可执行文件、`SKILL.md` 和 manifest 存在。
4. 向 fixture 资产追加一个字节。
5. 再次运行 `-Cli`，要求返回非零退出码且输出包含 `checksum mismatch`。
6. 在 `finally` 中删除临时目录树。

断言使用 `throw`，确保 GitHub Actions 立即失败。

- [ ] **步骤 5：生成 GitHub staging 目录树**

在 npm 包生成后扩展 `buildReleasePackages()`：

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

在 `README.txt` 中写入 `./install.sh --all` 或 `.\install.ps1 -All`。

- [ ] **步骤 6：添加压缩包生成脚本**

新建 `scripts/create-release-archives.sh`。使用 `node -p "require('./fastmoss/package.json').version"` 读取版本，重新创建 `dist/publish/github`，并严格生成 4 个 `.tar.gz` 和 1 个 `.zip`：

```text
fastmoss-v0.1.6-darwin-amd64.tar.gz
fastmoss-v0.1.6-darwin-arm64.tar.gz
fastmoss-v0.1.6-linux-amd64.tar.gz
fastmoss-v0.1.6-linux-arm64.tar.gz
fastmoss-v0.1.6-windows-amd64.zip
```

Unix 使用 `tar -C <bundle> -czf`，Windows bundle 内运行 `zip -qr`。输出缺失或为空时失败。

运行 `chmod +x scripts/create-release-archives.sh`。

- [ ] **步骤 7：运行跨渠道打包检查**

运行：

```bash
node --test test/release-packages.test.js test/install-sh.test.js
bash -n install.sh scripts/create-release-archives.sh
npm run build:release
bash scripts/create-release-archives.sh
find dist/publish/github -maxdepth 1 -type f -print
```

预期：所有测试通过并生成 5 个压缩包。存在 PowerShell 时运行 `pwsh -File test/install-powershell.ps1`；Windows CI 是必需的平台验证。

- [ ] **步骤 8：提交 Windows 与 GitHub bundle 支持**

```bash
git add install.ps1 test/install-powershell.ps1 scripts/build-release-packages.js scripts/create-release-archives.sh test/release-packages.test.js
git commit -m "feat: add Windows installer and GitHub offline bundles"
```

## 任务 7：使用隔离 registry 验证 npm 安装

**文件：**
- 修改：`package.json`
- 新建：`package-lock.json`
- 新建：`test/npm-install.integration.js`
- 修改：`fastmoss/test/package.test.js`

- [ ] **步骤 1：固定 Verdaccio 版本并创建 lockfile**

添加：

```json
{
  "devDependencies": {
    "verdaccio": "6.8.0"
  }
}
```

运行：`npm install --package-lock-only`

预期：lockfile 固定 Verdaccio 6.8.0；发布包不增加任何依赖。

- [ ] **步骤 2：编写隔离 registry 集成脚本**

新建独立 Node 脚本 `test/npm-install.integration.js`。它必须：

1. 预留一个可用 localhost 端口。
2. 创建不含 uplink 的临时 Verdaccio 配置。
3. 启动 `node_modules/.bin/verdaccio`，轮询 `/-/ping`，直到返回 200 或超过 10 秒期限。
4. 通过 `PUT /-/user/org.couchdb.user:ci` 注册用户 `ci`。
5. 将返回的 token 和本地 registry 写入临时 `.npmrc`。
6. 运行 `npm run build:release`。
7. 依次发布所有平台目录、`fastmoss/` 和生成的 Skill。
8. 使用相互独立的 prefix 与 home 测试仅 CLI 和仅 Skill 两条路径。
9. 在 `finally` 中停止 Verdaccio 并删除临时文件。

使用运行时路径生成 registry 策略：

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

创建用户并返回 `{ token }` 后，写入：

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

为 npm 子进程设置以下环境：

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

仅 CLI 路径断言：

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

使用文档命令执行仅 Skill 路径断言：

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

- [ ] **步骤 3：运行隔离安装**

运行：

```bash
npm ci
npm run test:integration
```

预期：通过。Verdaccio 只收到 localhost 请求，并且无法代理外部 registry。

- [ ] **步骤 4：添加静态网络回归断言**

扩展 `fastmoss/test/package.test.js`，只扫描 `package.json`、`bin/` 和 `lib/`，并拒绝：

```js
const forbidden = [
  "github.com/FastMoss/cli/releases/download",
  "FASTMOSS_DOWNLOAD_BASE_URL",
  "node:http",
  "node:https",
];
```

README 中指向独立 GitHub 渠道的链接允许存在。

- [ ] **步骤 5：运行全部 npm 渠道检查**

运行：

```bash
npm test
npm run build:release
npm run pack:release
npm run test:integration
```

预期：所有命令通过，并生成 7 个 npm tarball。

- [ ] **步骤 6：提交隔离 npm 验证**

```bash
git add package.json package-lock.json test/npm-install.integration.js fastmoss/test/package.test.js
git commit -m "test: verify npm installs without GitHub access"
```

## 任务 8：更新唯一来源的 Skill 与安装文档

**文件：**
- 修改：`skills/fastmoss-cli/SKILL.md`
- 修改：`skills/fastmoss-cli/references/cli.md`
- 修改：`README.md`
- 修改：`README.zh-CN.md`
- 修改：`fastmoss/README.md`
- 修改：`fastmoss/README.zh-CN.md`
- 修改：`fastmoss-skill/README.md`
- 修改：`fastmoss-skill/README.zh-CN.md`
- 修改：`test/release-packages.test.js`

- [ ] **步骤 1：调用 Skill 编写指导**

编辑已部署 Skill 前使用 `skill-creator` 和 `superpowers:writing-skills`。保留所有工具选择与工具调用行为；本任务只修改安装和启动说明。

- [ ] **步骤 2：添加预期失败的文档契约测试**

在 `test/release-packages.test.js` 中添加：

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

- [ ] **步骤 3：确认文档测试失败**

运行：`node --test test/release-packages.test.js`

预期：因旧的 `skills add`、`fastmoss-install-skill` 和 `--allow-scripts` 说明而失败。

- [ ] **步骤 4：更新唯一来源 Skill 的启动检查**

在 `skills/fastmoss-cli/SKILL.md` 中，将 CLI 缺失/升级段落替换为：

````markdown
If the FastMoss CLI is not installed, the command is not found, or the user
asks to update it, install the current npm release:

```bash
npm install -g @fastmoss/cli@latest
```

This installs only the CLI. Do not reinstall this Skill unless the user also
asks to install or update the Agent Skill.
````

在 `skills/fastmoss-cli/references/cli.md` 中使用完全相同的命令，并声明 CLI 包不会安装 Agent Skill。

- [ ] **步骤 5：重写四份产品 README 的安装章节**

英文文档首先使用以下安装区块：

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

中文文档对应使用“只安装 CLI”和“只安装 Agent Skill”。加入设计规范中的 GitHub clone 命令和 Windows 参数。将旧的 Binary Download/Cache 章节替换为简短的 npm 包架构说明：npm 只安装一个匹配的平台包，绝不从 GitHub 下载。API Key、命令参考和工具目录内容保持不变。

- [ ] **步骤 6：完善独立 Skill 包 README**

记录默认值 `all`、四种 `--agent` 值、`FASTMOSS_SKILL_DIR`、`uninstall`、当前 Agent handoff，以及可能需要下一会话生效的限制。不得暗示安装 Skill 会安装 CLI。

- [ ] **步骤 7：运行 Skill 与文档验证**

运行：

```bash
npm test
rg -n "npx skills add FastMoss/cli|fastmoss-install-skill|--allow-scripts=@fastmoss/cli|FASTMOSS_DOWNLOAD_BASE_URL" \
  README.md README.zh-CN.md fastmoss/README.md fastmoss/README.zh-CN.md \
  fastmoss/package.json fastmoss/bin fastmoss/lib \
  fastmoss-skill/README.md fastmoss-skill/README.zh-CN.md skills
```

预期：测试通过，`rg` 不返回任何匹配。

- [ ] **步骤 8：提交文档与唯一来源 Skill**

```bash
git add README.md README.zh-CN.md fastmoss/README.md fastmoss/README.zh-CN.md fastmoss-skill/README.md fastmoss-skill/README.zh-CN.md skills/fastmoss-cli test/release-packages.test.js
git commit -m "docs: document independent CLI and Skill installs"
```

## 任务 9：替换发布工作流

**文件：**
- 替换：`.github/workflows/release.yml`
- 修改：`test/release-packages.test.js`

- [ ] **步骤 1：添加预期失败的工作流断言**

添加：

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

- [ ] **步骤 2：确认工作流测试失败**

运行：`node --test test/release-packages.test.js`

预期：失败，因为当前工作流先发布 GitHub，并直接从 `fastmoss/` 发布 npm 包。

- [ ] **步骤 3：将工作流替换为验证、构建和独立发布任务**

保留 `v*` tag 触发器。为 `workflow_dispatch` 添加必填的 `release_tag` 输入。定义工作流级 `RELEASE_TAG` 表达式：手动运行时使用 `inputs.release_tag`，tag push 时使用 `github.ref_name`。`test`、`build-release` 和 `publish-github` 中的每次 checkout 都必须设置 `ref: ${{ env.RELEASE_TAG }}`。实现以下任务：

1. `test`：矩阵包含 `ubuntu-latest`、`macos-latest` 和 `windows-latest`；执行 checkout、Node 20、`npm ci`、`npm test` 和 `npm run test:integration`。Windows 还要运行 `test/install-powershell.ps1`。
2. `build-release`：依赖 `test`，在 Ubuntu 上运行；验证 `fastmoss/package.json` 等于所选 tag，执行构建、打包和压缩命令，再上传 `dist/publish`。
3. `publish-npm`：依赖 `build-release`，下载 artifact，配置 npmjs，并按 manifest 顺序发布 7 个 tarball。
4. `publish-github`：依赖 `build-release`，checkout 对应 tag，下载 artifact，并发布原始 `release-assets/*` 与 `dist/publish/github/*`。

npm 发布使用生成的 manifest：

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

`publish-npm` 和 `publish-github` 只依赖 `build-release`，彼此之间绝不依赖。仅在 `publish-npm` 中设置 `NODE_AUTH_TOKEN`。

- [ ] **步骤 4：运行本地发布检查**

运行：

```bash
npm test
npm run build:release
npm run pack:release
bash scripts/create-release-archives.sh
git diff --check
```

预期：所有检查通过，YAML 不存在空白字符错误。

- [ ] **步骤 5：提交工作流**

```bash
git add .github/workflows/release.yml test/release-packages.test.js
git commit -m "ci: publish npm and GitHub channels independently"
```

## 任务 10：完整验证与审查

**文件：**
- 验证任务 1-9 修改的全部文件。
- 只修改本任务发现的失败所必需的文件。

- [ ] **步骤 1：运行完整本地验证**

运行：

```bash
npm ci
npm test
npm run test:integration
npm run build:release
npm run pack:release
bash scripts/create-release-archives.sh
```

预期：每条命令都以 0 退出。

- [ ] **步骤 2：检查发布载荷边界**

运行：

```bash
node -e 'const m=require("./dist/publish/npm/manifest.json"); console.log(m.map(x => `${x.kind} ${x.name} ${x.version} ${x.file}`).join("\n"))'
find dist/publish/github -maxdepth 1 -type f -print | sort
npm pack fastmoss --dry-run --json
npm pack dist/npm/skill --dry-run --json
```

预期：

- 7 个 npm 条目：5 个平台包、1 个 CLI 包、1 个 Skill 包。
- 5 个 GitHub 压缩包。
- CLI tarball 不包含 Skill、`postinstall` 或下载器。
- Skill tarball 包含唯一来源的 Skill，但不包含 CLI 二进制或 CLI 依赖。

- [ ] **步骤 3：扫描被禁止的现行行为**

运行：

```bash
rg -n "github\.com/FastMoss/cli/releases/download|node:http|node:https|FASTMOSS_DOWNLOAD_BASE_URL|FASTMOSS_SKIP_DOWNLOAD" \
  fastmoss/package.json fastmoss/bin fastmoss/lib
rg -n "fastmoss-install-skill|npx skills add FastMoss/cli|--allow-scripts=@fastmoss/cli" \
  README.md README.zh-CN.md fastmoss/README.md fastmoss/README.zh-CN.md \
  fastmoss-skill/README.md fastmoss-skill/README.zh-CN.md skills
```

预期：两条命令都没有匹配。包含防回归字符串的测试以及历史规范/计划被有意排除。

- [ ] **步骤 4：验证源码唯一性和仓库整洁性**

运行：

```bash
test ! -d fastmoss/skills
test -f skills/fastmoss-cli/SKILL.md
git diff --check
git status --short
```

预期：只存在预期的实现改动，`dist/` 已被忽略，并且只有一份可编辑 Skill 目录树。

- [ ] **步骤 5：请求代码审查**

调用 `superpowers:requesting-code-review`。对照设计中的 8 项验收标准、平台精确版本、回滚安全性和意外网络兜底进行审查。

- [ ] **步骤 6：使用 TDD 修复审查发现**

对每条接受的发现，先新增或更新一个失败测试并确认其失败，再实施最小改动，最后重新运行步骤 1。

- [ ] **步骤 7：存在审查修复时提交**

```bash
git add -u
git add .github fastmoss fastmoss-skill install.sh install.ps1 package.json package-lock.json scripts skills test README.md README.zh-CN.md
git commit -m "fix: address installation redesign review"
```

审查不需要代码改动时跳过该提交。绝不添加 `dist/`。

- [ ] **步骤 8：完成开发分支**

先调用 `superpowers:verification-before-completion`，再调用 `superpowers:finishing-a-development-branch`。报告准确的测试命令、结果、分支名称以及合并/PR 选项。
