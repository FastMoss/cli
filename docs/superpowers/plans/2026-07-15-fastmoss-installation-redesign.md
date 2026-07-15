# FastMoss CLI 与 Skill 双渠道安装实施计划

> **面向 Agent 执行者：** 必须使用子技能 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，逐个任务实施本计划。所有步骤使用复选框（`- [ ]`）跟踪状态。

**目标：** 让 npm 与 GitHub 成为能力对等且互不依赖的安装渠道，并让 FastMoss CLI 与 Agent Skill 可以分别安装、升级和验证。

**架构：** `fastmoss-mcp` 是唯一可编辑上游，负责 CLI launcher、独立 Skill 安装器、README 模板、公开仓库模板和 staging 生成脚本；`fastmoss-release` 只保存 `dist/public-release-repo` 同步后的公开产物。npm CLI 通过五个精确版本的可选平台包获得二进制，npm Skill 通过一次性可执行包安装 canonical Skill；GitHub clone 和离线归档只读取仓库内文件。

**技术栈：** Go 1.25、Node.js 18+ CommonJS、Node 内置测试运行器、npm optional dependencies、Verdaccio 6.8.0、Bash、PowerShell、GitHub Actions。

---

## 执行边界

- 设计规范位于 `fastmoss-release/docs/superpowers/specs/2026-07-14-fastmoss-installation-redesign-design.md`，实现必须逐项满足其中 14 条验收标准。
- 任务 1 至任务 11 的源码改动全部发生在 `fastmoss-mcp`；不要直接手工维护 `fastmoss-release` 中的公开文件。
- 任务 12 才运行 staging 同步，并只提交同步产生的公开内容；`fastmoss-release/docs/superpowers` 必须保留。
- 所有版本示例中的 `X.Y.Z` 表示发布负责人选定的合法 semver。单元测试 fixture 固定使用 `1.2.3`，实现阶段不自动 tag、push、`npm publish` 或创建 GitHub Release。
- 执行前使用 `superpowers:using-git-worktrees` 为两个仓库建立隔离工作树。下面路径均相对于对应仓库根目录。
- 保留两个仓库中与本计划无关的用户改动，不回退、不覆盖、不加入本计划的提交。

## 最终文件职责

### `fastmoss-mcp` 上游源码

- `packaging/npm/fastmoss/`：`@fastmoss/cli` launcher、平台映射、测试和 README 正文模板；不包含二进制、Skill、下载器或 lifecycle script。
- `packaging/npm/fastmoss-skill/`：`@fastmoss/skill` 安装器源码、包 manifest 模板、测试和 README 正文模板；canonical Skill 不在此目录手工维护。
- `skills/fastmoss-cli/`：唯一可编辑 Skill 源码。
- `templates/readme/installation.md`、`templates/readme/installation.zh-CN.md`：英文和中文安装区块唯一来源。
- `templates/public-release-repo/`：公开仓库根文件、安装器、测试、npm workspace 和 release workflow 模板。
- `scripts/render_release_readmes.js`：把安装片段注入三类 README，仅向 staging 写最终 README。
- `scripts/stage_public_release_repo.js`：从模板、二进制和 canonical Skill 组装完整公开 staging。
- `scripts/prepare_cli_release.sh`：校验版本、构建二进制、验证 staging 并原子替换 `dist/public-release-repo`。
- `scripts/sync_public_release_repo.sh`：只把已验证 staging 同步到公开仓库，保留 `.git` 与 `docs/superpowers`。

### 生成后的 `fastmoss-release`

```text
fastmoss-release/
├── .fastmoss-release.json
├── .github/workflows/release.yml
├── README.md
├── README.zh-CN.md
├── package.json
├── package-lock.json
├── fastmoss/
├── fastmoss-skill/
├── platform-packages/
│   ├── cli-darwin-amd64/
│   ├── cli-darwin-arm64/
│   ├── cli-linux-amd64/
│   ├── cli-linux-arm64/
│   └── cli-windows-amd64/
├── skills/fastmoss-cli/
├── release-assets/
├── install.sh
├── install.ps1
├── scripts/
└── test/
```

`platform-packages/` 是 workflow 发布五个平台 npm 包的直接输入，不作为用户文档中的安装入口。`dist/`、`node_modules/` 和 GitHub 离线归档属于公开仓库运行时生成物，不提交。

## 任务 1：将 npm CLI 改为纯平台包 launcher

**仓库：** `fastmoss-mcp`

**文件：**
- 新建：`packaging/npm/fastmoss/lib/targets.js`
- 替换：`packaging/npm/fastmoss/lib/runtime.js`
- 修改：`packaging/npm/fastmoss/bin/fastmoss.js`
- 替换：`packaging/npm/fastmoss/test/fastmoss.test.js`
- 新建：`packaging/npm/fastmoss/test/package.test.js`
- 修改：`packaging/npm/fastmoss/package.json`
- 删除：`packaging/npm/fastmoss/bin/postinstall.js`
- 删除：`packaging/npm/fastmoss/bin/install-skill.js`
- 删除：`packaging/npm/fastmoss/skills/`
- 删除：`packaging/npm/fastmoss/.npmignore`

- [ ] **步骤 1：先写平台解析与进程透传失败测试**

将 `packaging/npm/fastmoss/test/fastmoss.test.js` 改为覆盖以下公共 API：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");

const { PLATFORM_TARGETS, resolvePlatformTarget } = require("../lib/targets");
const { resolvePlatformBinary, runCLI } = require("../lib/runtime");

test("all five supported Node targets map to npm packages and release assets", () => {
  assert.equal(Object.keys(PLATFORM_TARGETS).length, 5);
  assert.deepEqual(resolvePlatformTarget({ platform: "darwin", arch: "arm64" }), {
    packageName: "@fastmoss/cli-darwin-arm64",
    packageDir: "cli-darwin-arm64",
    assetName: "fastmoss-darwin-arm64",
    binaryName: "fastmoss-darwin-arm64",
    buildPath: "darwin-arm64/fastmoss",
    os: "darwin",
    cpu: "arm64",
  });
  assert.equal(
    resolvePlatformTarget({ platform: "win32", arch: "x64" }).binaryName,
    "fastmoss-windows-amd64.exe",
  );
});

test("unsupported targets fail without a download fallback", () => {
  assert.throws(
    () => resolvePlatformTarget({ platform: "linux", arch: "ppc64" }),
    /Unsupported platform: linux\/ppc64/,
  );
});

test("--version returns the main package version without resolving a binary", async () => {
  let output = "";
  const result = await runCLI({
    version: "1.2.3",
    args: ["--version"],
    platform: "unsupported",
    arch: "unsupported",
    stdout: { write(chunk) { output += chunk; } },
  });
  assert.deepEqual(result, { code: 0, signal: null });
  assert.equal(output, "1.2.3\n");
});

test("resolvePlatformBinary requires an exact-version platform package", () => {
  const packageJSONPath = "/registry/@fastmoss/cli-linux-amd64/package.json";
  let accessMode;
  const result = resolvePlatformBinary({
    version: "1.2.3",
    platform: "linux",
    arch: "x64",
    resolvePackageJSON() { return packageJSONPath; },
    readFileSync() { return JSON.stringify({ version: "1.2.3" }); },
    accessSync(_filePath, mode) { accessMode = mode; },
  });
  assert.equal(
    result.binaryPath,
    path.join(path.dirname(packageJSONPath), "bin", "fastmoss-linux-amd64"),
  );
  assert.equal(accessMode, fs.constants.X_OK);
});

test("missing package error contains only the npm repair command", () => {
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
    /@fastmoss\/cli-darwin-arm64[\s\S]*npm install -g @fastmoss\/cli@1\.2\.3[\s\S]*--omit=optional/,
  );
});

test("platform package version mismatch fails before spawning", () => {
  assert.throws(
    () => resolvePlatformBinary({
      version: "1.2.3",
      platform: "win32",
      arch: "x64",
      resolvePackageJSON() { return "C:\\pkg\\package.json"; },
      readFileSync() { return JSON.stringify({ version: "1.2.2" }); },
      accessSync() {},
    }),
    /expected 1\.2\.3, found 1\.2\.2/,
  );
});

test("runCLI forwards arguments and inherited stdio", async () => {
  let call;
  const child = new EventEmitter();
  const promise = runCLI({
    version: "1.2.3",
    args: ["help"],
    resolveBinary() { return { binaryPath: "/tmp/fastmoss" }; },
    spawnFn(binaryPath, args, options) {
      call = { binaryPath, args, options };
      process.nextTick(() => child.emit("exit", 7, null));
      return child;
    },
  });
  assert.deepEqual(await promise, { code: 7, signal: null });
  assert.deepEqual(call, {
    binaryPath: "/tmp/fastmoss",
    args: ["help"],
    options: { stdio: "inherit" },
  });
});

test("runCLI reports the child signal to the entry point", async () => {
  const child = new EventEmitter();
  const promise = runCLI({
    version: "1.2.3",
    args: ["help"],
    resolveBinary() { return { binaryPath: "/tmp/fastmoss" }; },
    spawnFn() {
      process.nextTick(() => child.emit("exit", null, "SIGTERM"));
      return child;
    },
  });
  assert.deepEqual(await promise, { code: null, signal: "SIGTERM" });
});
```

- [ ] **步骤 2：运行测试并确认旧下载器不满足契约**

运行：

```bash
cd packaging/npm/fastmoss
npm test
```

预期：失败，原因至少包含 `lib/targets.js` 不存在；不得先修改实现来制造假通过。

- [ ] **步骤 3：创建五个平台的唯一映射表**

新建 `packaging/npm/fastmoss/lib/targets.js`：

```js
const PLATFORM_TARGETS = Object.freeze({
  "darwin:x64": Object.freeze({
    packageName: "@fastmoss/cli-darwin-amd64",
    packageDir: "cli-darwin-amd64",
    assetName: "fastmoss-darwin-amd64",
    binaryName: "fastmoss-darwin-amd64",
    buildPath: "darwin-amd64/fastmoss",
    os: "darwin",
    cpu: "x64",
  }),
  "darwin:arm64": Object.freeze({
    packageName: "@fastmoss/cli-darwin-arm64",
    packageDir: "cli-darwin-arm64",
    assetName: "fastmoss-darwin-arm64",
    binaryName: "fastmoss-darwin-arm64",
    buildPath: "darwin-arm64/fastmoss",
    os: "darwin",
    cpu: "arm64",
  }),
  "linux:x64": Object.freeze({
    packageName: "@fastmoss/cli-linux-amd64",
    packageDir: "cli-linux-amd64",
    assetName: "fastmoss-linux-amd64",
    binaryName: "fastmoss-linux-amd64",
    buildPath: "linux-amd64/fastmoss",
    os: "linux",
    cpu: "x64",
  }),
  "linux:arm64": Object.freeze({
    packageName: "@fastmoss/cli-linux-arm64",
    packageDir: "cli-linux-arm64",
    assetName: "fastmoss-linux-arm64",
    binaryName: "fastmoss-linux-arm64",
    buildPath: "linux-arm64/fastmoss",
    os: "linux",
    cpu: "arm64",
  }),
  "win32:x64": Object.freeze({
    packageName: "@fastmoss/cli-windows-amd64",
    packageDir: "cli-windows-amd64",
    assetName: "fastmoss-windows-amd64.exe",
    binaryName: "fastmoss-windows-amd64.exe",
    buildPath: "windows-amd64/fastmoss.exe",
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

- [ ] **步骤 4：用本地平台包解析替换全部下载逻辑**

将 `packaging/npm/fastmoss/lib/runtime.js` 替换为：

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
    if (!error || error.code !== "MODULE_NOT_FOUND") throw error;
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
  resolveBinary = resolvePlatformBinary,
  spawnFn = spawn,
} = {}) {
  if (args.length === 1 && ["--version", "-v", "version"].includes(args[0])) {
    stdout.write(`${version}\n`);
    return { code: 0, signal: null };
  }

  const { binaryPath } = resolveBinary({ version, platform, arch });
  return new Promise((resolve, reject) => {
    const child = spawnFn(binaryPath, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

module.exports = { reinstallMessage, resolvePlatformBinary, runCLI };
```

将 `packaging/npm/fastmoss/bin/fastmoss.js` 改为：

```js
#!/usr/bin/env node

const packageJSON = require("../package.json");
const { runCLI } = require("../lib/runtime");

runCLI({ version: packageJSON.version })
  .then(({ code, signal }) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code == null ? 1 : code;
  })
  .catch((error) => {
    process.stderr.write(`fastmoss wrapper error: ${error.message}\n`);
    process.exitCode = 1;
  });
```

- [ ] **步骤 5：写主包边界失败测试并收紧 manifest**

新建 `packaging/npm/fastmoss/test/package.test.js`，断言：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const packageJSON = require("../package.json");
const { PLATFORM_TARGETS } = require("../lib/targets");
const packageRoot = path.join(__dirname, "..");

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

test("runtime source contains no downloader or GitHub release fallback", () => {
  const content = [
    "package.json",
    "bin/fastmoss.js",
    "lib/runtime.js",
    "lib/targets.js",
  ].map((file) => fs.readFileSync(path.join(packageRoot, file), "utf8")).join("\n");
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
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: packageRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const files = JSON.parse(result.stdout)[0].files.map((entry) => entry.path);
  assert.equal(files.some((file) => file.startsWith("skills/")), false);
  assert.equal(files.includes("bin/postinstall.js"), false);
  assert.equal(files.includes("bin/install-skill.js"), false);
  assert.equal(files.some((file) => /^bin\/fastmoss-(darwin|linux|windows)/.test(file)), false);
});
```

保持当前版本号不变，把 `packaging/npm/fastmoss/package.json` 调整为以下结构；任务 8 的准备脚本负责在发布时统一更新版本和五个依赖值：

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

- [ ] **步骤 6：删除旧下载器和 CLI 包内 Skill 副本**

删除任务文件列表中的两个 bin、`skills/` 和 `.npmignore`。不要删除 `skills/fastmoss-cli` canonical source。

- [ ] **步骤 7：运行 CLI 测试与 tarball 检查**

运行：

```bash
cd packaging/npm/fastmoss
npm test
npm pack --dry-run --json
```

预期：测试全通过；tarball 只包含 launcher、runtime、targets、manifest 和当时存在的 README，不含 Skill、平台二进制、下载器或 lifecycle script。

- [ ] **步骤 8：提交 CLI npm 包重构**

```bash
git add packaging/npm/fastmoss/package.json \
  packaging/npm/fastmoss/bin/fastmoss.js \
  packaging/npm/fastmoss/lib \
  packaging/npm/fastmoss/test
git add -A packaging/npm/fastmoss/bin packaging/npm/fastmoss/skills packaging/npm/fastmoss/.npmignore
git commit -m "refactor: make npm CLI self-contained"
```

## 任务 2：实现独立的 npm Skill 安装器

**仓库：** `fastmoss-mcp`

**文件：**
- 新建：`packaging/npm/fastmoss-skill/lib/installer.js`
- 新建：`packaging/npm/fastmoss-skill/bin/fastmoss-skill.js`
- 新建：`packaging/npm/fastmoss-skill/package.template.json`
- 新建：`packaging/npm/fastmoss-skill/test/installer.test.js`

- [ ] **步骤 1：先写参数、默认目录、升级、回滚和卸载失败测试**

新建 `packaging/npm/fastmoss-skill/test/installer.test.js`。测试使用真实临时目录，并至少包含：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  INSTALL_MANIFEST,
  installSkill,
  parseArgs,
  resolveSkillRoots,
  uninstallSkill,
} = require("../lib/installer");

async function fixture() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-skill-"));
  const source = path.join(root, "payload", "fastmoss-cli");
  await fs.promises.mkdir(path.join(source, "references"), { recursive: true });
  await fs.promises.writeFile(path.join(source, "SKILL.md"), "# FastMoss\n");
  await fs.promises.writeFile(path.join(source, "references", "cli.md"), "# CLI\n");
  return { root, source };
}

test("empty args mean non-interactive install for all agents", () => {
  assert.deepEqual(parseArgs([]), {
    action: "install",
    agent: "all",
    help: false,
    version: false,
  });
  assert.equal(parseArgs(["uninstall", "--agent", "codex"]).action, "uninstall");
  assert.throws(() => parseArgs(["--agent", "unknown"]), /Unsupported agent/);
  assert.throws(() => parseArgs(["--agent"]), /requires a value/);
});

test("default roots include Codex, Claude, and Agents even when absent", () => {
  const homeDir = path.resolve("demo-home");
  assert.deepEqual(resolveSkillRoots({ agent: "all", env: {}, homeDir }), [
    path.join(homeDir, ".codex", "skills"),
    path.join(homeDir, ".claude", "skills"),
    path.join(homeDir, ".agents", "skills"),
  ]);
});

test("FASTMOSS_SKILL_DIR is the only destination when set", () => {
  assert.deepEqual(resolveSkillRoots({
    agent: "codex",
    env: { FASTMOSS_SKILL_DIR: "/tmp/custom-skills" },
    homeDir: "/tmp/home",
  }), [path.resolve("/tmp/custom-skills")]);
});

test("install replaces a legacy directory and writes ownership metadata", async () => {
  const { root, source } = await fixture();
  const skillRoot = path.join(root, "skills");
  const target = path.join(skillRoot, "fastmoss-cli");
  let output = "";
  try {
    await fs.promises.mkdir(target, { recursive: true });
    await fs.promises.writeFile(path.join(target, "legacy.txt"), "legacy\n");
    const result = await installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: skillRoot },
      homeDir: root,
      stdout: { write(chunk) { output += chunk; } },
      uniqueId: () => "test",
    });
    assert.deepEqual(result.installed, [target]);
    assert.equal(fs.existsSync(path.join(target, "legacy.txt")), false);
    const manifest = JSON.parse(
      await fs.promises.readFile(path.join(target, INSTALL_MANIFEST), "utf8"),
    );
    assert.deepEqual(
      { package: manifest.package, skill: manifest.skill, version: manifest.version },
      { package: "@fastmoss/skill", skill: "fastmoss-cli", version: "1.2.3" },
    );
    assert.match(output, new RegExp(path.join(target, "SKILL.md").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(output, /Agent action: Read/);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("failed final rename restores the previous directory", async () => {
  const { root, source } = await fixture();
  const skillRoot = path.join(root, "skills");
  const target = path.join(skillRoot, "fastmoss-cli");
  try {
    await fs.promises.mkdir(target, { recursive: true });
    await fs.promises.writeFile(path.join(target, "SKILL.md"), "old\n");
    const injected = {
      ...fs.promises,
      async rename(from, to) {
        if (from.endsWith(".tmp-test") && to === target) {
          const error = new Error("injected rename failure");
          error.code = "EACCES";
          throw error;
        }
        return fs.promises.rename(from, to);
      },
    };
    await assert.rejects(installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: skillRoot },
      fsPromises: injected,
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

test("uninstall removes only a valid FastMoss-managed directory", async () => {
  const { root, source } = await fixture();
  const managedRoot = path.join(root, "managed");
  const unmanagedRoot = path.join(root, "unmanaged");
  try {
    await installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: managedRoot },
    });
    await fs.promises.mkdir(path.join(unmanagedRoot, "fastmoss-cli"), { recursive: true });
    await uninstallSkill({ env: { FASTMOSS_SKILL_DIR: managedRoot } });
    await uninstallSkill({ env: { FASTMOSS_SKILL_DIR: unmanagedRoot } });
    assert.equal(fs.existsSync(path.join(managedRoot, "fastmoss-cli")), false);
    assert.equal(fs.existsSync(path.join(unmanagedRoot, "fastmoss-cli")), true);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
```

再添加以下边界用例，不得省略：payload 缺少 `SKILL.md` 时一个目标也不写；无效 JSON manifest 被视为 unmanaged；权限错误包含失败路径且不建议 `sudo`；三个 HOME 变量指向同一目录时去重；`--help` 与 `--version` 不写用户目录。

- [ ] **步骤 2：运行 Skill 测试并确认失败**

运行：

```bash
node --test packaging/npm/fastmoss-skill/test/*.test.js
```

预期：失败，因为 `lib/installer.js` 尚不存在。

- [ ] **步骤 3：实现非交互参数和目标目录解析**

在 `installer.js` 中定义以下常量和解析函数：

```js
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SKILL_NAME = "fastmoss-cli";
const PACKAGE_NAME = "@fastmoss/skill";
const INSTALL_MANIFEST = ".fastmoss-install.json";
const AGENTS = new Set(["codex", "claude", "agents", "all"]);

function parseArgs(args = []) {
  const result = { action: "install", agent: "all", help: false, version: false };
  let actionSeen = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "install" || arg === "uninstall") {
      if (actionSeen) throw new Error("Only one action may be specified");
      result.action = arg;
      actionSeen = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--version" || arg === "-v") {
      result.version = true;
    } else if (arg === "--agent" || arg === "-a") {
      const value = String(args[index + 1] || "").toLowerCase();
      if (!value) throw new Error(`${arg} requires a value`);
      if (!AGENTS.has(value)) throw new Error(`Unsupported agent: ${value}`);
      result.agent = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return result;
}

function resolveSkillRoots({
  agent = "all",
  env = process.env,
  homeDir = os.homedir(),
} = {}) {
  const override = String(env.FASTMOSS_SKILL_DIR || "").trim();
  if (override) return [path.resolve(override)];
  if (!AGENTS.has(agent)) throw new Error(`Unsupported agent: ${agent}`);
  const roots = {
    codex: path.join(env.CODEX_HOME || path.join(homeDir, ".codex"), "skills"),
    claude: path.join(env.CLAUDE_HOME || path.join(homeDir, ".claude"), "skills"),
    agents: path.join(env.AGENTS_HOME || path.join(homeDir, ".agents"), "skills"),
  };
  const selected = agent === "all" ? Object.values(roots) : [roots[agent]];
  return [...new Set(selected.map((root) => path.resolve(root)))];
}
```

- [ ] **步骤 4：实现原子安装、回滚和安全卸载**

继续在 `installer.js` 中实现：

```js
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
  try {
    await fsPromises.mkdir(targetRoot, { recursive: true });
    await fsPromises.rm(temporary, { recursive: true, force: true });
    await fsPromises.rm(backup, { recursive: true, force: true });
    await fsPromises.cp(sourceSkillDir, temporary, {
      recursive: true,
      filter(source) { return path.basename(source) !== ".DS_Store"; },
    });
    if (!(await exists(path.join(temporary, "SKILL.md"), fsPromises))) {
      throw new Error(`FastMoss Skill payload is missing SKILL.md: ${sourceSkillDir}`);
    }
    await fsPromises.writeFile(
      path.join(temporary, INSTALL_MANIFEST),
      `${JSON.stringify({
        schemaVersion: 1,
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
      if (hadTarget && await exists(backup, fsPromises)) {
        await fsPromises.rename(backup, target);
      }
      throw error;
    }
    await fsPromises.rm(backup, { recursive: true, force: true });
    return target;
  } catch (error) {
    await fsPromises.rm(temporary, { recursive: true, force: true });
    error.message = `${error.message}\nTarget: ${target}`;
    throw error;
  }
}

async function installSkill({
  sourceSkillDir,
  version,
  agent = "all",
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
    "Agent action: Read the installed fastmoss-cli/SKILL.md now and use it in this conversation.\n",
  );
  stdout.write(
    "If this client cannot load newly installed skills in the current session, start a new conversation.\n",
  );
  return { installed };
}

async function readOwnedManifest(manifestPath, fsPromises) {
  try {
    const manifest = JSON.parse(await fsPromises.readFile(manifestPath, "utf8"));
    return manifest.package === PACKAGE_NAME && manifest.skill === SKILL_NAME;
  } catch {
    return false;
  }
}

async function uninstallSkill({
  agent = "all",
  env = process.env,
  homeDir = os.homedir(),
  stdout = process.stdout,
  fsPromises = fs.promises,
} = {}) {
  const removed = [];
  for (const targetRoot of resolveSkillRoots({ agent, env, homeDir })) {
    const target = path.join(targetRoot, SKILL_NAME);
    const owned = await readOwnedManifest(
      path.join(target, INSTALL_MANIFEST),
      fsPromises,
    );
    if (!owned) {
      stdout.write(`Skipped unmanaged or missing FastMoss Skill: ${target}\n`);
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
  PACKAGE_NAME,
  SKILL_NAME,
  installSkill,
  parseArgs,
  resolveSkillRoots,
  uninstallSkill,
};
```

- [ ] **步骤 5：添加 npx 可执行入口和无版本号 manifest 模板**

新建 `packaging/npm/fastmoss-skill/bin/fastmoss-skill.js`：

```js
#!/usr/bin/env node

const path = require("node:path");
const packageJSON = require("../package.json");
const { installSkill, parseArgs, uninstallSkill } = require("../lib/installer");

const USAGE = `Usage: fastmoss-skill [install|uninstall] [--agent codex|claude|agents|all]

Environment:
  FASTMOSS_SKILL_DIR  Override the destination skills root.
`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }
  if (options.version) {
    process.stdout.write(`${packageJSON.version}\n`);
    return;
  }
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

新建 `packaging/npm/fastmoss-skill/package.template.json`：

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

设置入口可执行权限：

```bash
chmod +x packaging/npm/fastmoss-skill/bin/fastmoss-skill.js
```

- [ ] **步骤 6：运行 Skill 单元测试**

运行：

```bash
node --test packaging/npm/fastmoss-skill/test/*.test.js
```

预期：全部通过；测试过程中不调用 npm、CLI 或网络。

- [ ] **步骤 7：提交独立 Skill 安装器**

```bash
git add packaging/npm/fastmoss-skill
git commit -m "feat: add standalone npm Skill installer"
```

## 任务 3：建立三类 README 的唯一安装片段

**仓库：** `fastmoss-mcp`

**文件：**
- 新建：`templates/readme/installation.md`
- 新建：`templates/readme/installation.zh-CN.md`
- 重命名：`templates/public-release-repo/README.md` -> `templates/public-release-repo/README.template.md`
- 重命名：`templates/public-release-repo/README.zh-CN.md` -> `templates/public-release-repo/README.zh-CN.template.md`
- 重命名：`packaging/npm/fastmoss/README.md` -> `packaging/npm/fastmoss/README.template.md`
- 重命名：`packaging/npm/fastmoss/README.zh-CN.md` -> `packaging/npm/fastmoss/README.zh-CN.template.md`
- 新建：`packaging/npm/fastmoss-skill/README.template.md`
- 新建：`packaging/npm/fastmoss-skill/README.zh-CN.template.md`
- 新建：`scripts/render_release_readmes.js`
- 新建：`scripts/render_release_readmes_test.js`

- [ ] **步骤 1：先写 README 渲染失败测试**

新建 `scripts/render_release_readmes_test.js`，通过临时输出目录调用 `renderReleaseReadmes()`，断言：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { renderReleaseReadmes } = require("./render_release_readmes");

const rootDir = path.join(__dirname, "..");
const START = "<!-- FASTMOSS_INSTALLATION_START -->";
const END = "<!-- FASTMOSS_INSTALLATION_END -->";

function installationBlock(content) {
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return content.slice(start, end + END.length);
}

test("one canonical fragment renders all six release README files", async () => {
  const outputDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-readme-"));
  try {
    await renderReleaseReadmes({ rootDir, outputDir });
    const english = await Promise.all([
      "README.md",
      "fastmoss/README.md",
      "fastmoss-skill/README.md",
    ].map((file) => fs.promises.readFile(path.join(outputDir, file), "utf8")));
    const chinese = await Promise.all([
      "README.zh-CN.md",
      "fastmoss/README.zh-CN.md",
      "fastmoss-skill/README.zh-CN.md",
    ].map((file) => fs.promises.readFile(path.join(outputDir, file), "utf8")));
    assert.equal(new Set(english.map(installationBlock)).size, 1);
    assert.equal(new Set(chinese.map(installationBlock)).size, 1);
    for (const content of [...english, ...chinese]) {
      assert.equal(content.includes("{{FASTMOSS_INSTALLATION}}"), false);
      for (const command of [
        "npm install -g @fastmoss/cli@latest",
        "npx -y @fastmoss/skill@latest",
        "git clone --depth 1 https://github.com/FastMoss/cli.git",
        "./install.sh --cli",
        "./install.sh --skill",
        "./install.sh --all",
        ".\\install.ps1 -Cli",
        ".\\install.ps1 -Skill",
        ".\\install.ps1 -All",
      ]) assert.match(content, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true });
  }
});

test("every body template contains exactly one placeholder", async () => {
  const templates = [
    "templates/public-release-repo/README.template.md",
    "templates/public-release-repo/README.zh-CN.template.md",
    "packaging/npm/fastmoss/README.template.md",
    "packaging/npm/fastmoss/README.zh-CN.template.md",
    "packaging/npm/fastmoss-skill/README.template.md",
    "packaging/npm/fastmoss-skill/README.zh-CN.template.md",
  ];
  for (const file of templates) {
    const content = await fs.promises.readFile(path.join(rootDir, file), "utf8");
    assert.equal(content.split("{{FASTMOSS_INSTALLATION}}").length - 1, 1, file);
  }
});
```

- [ ] **步骤 2：运行渲染测试并确认失败**

运行：

```bash
node scripts/render_release_readmes_test.js
```

预期：失败，因为 canonical fragment 和 renderer 尚不存在。

- [ ] **步骤 3：编写英文 canonical 安装区块**

新建 `templates/readme/installation.md`，内容固定为：

````markdown
<!-- FASTMOSS_INSTALLATION_START -->
## Installation

The CLI and Agent Skill are independent. Installing either one never installs the other.

### npm

Install only the CLI:

```bash
npm install -g @fastmoss/cli@latest
```

Run it temporarily without a global install:

```bash
npx -y @fastmoss/cli@latest
```

Install or update only the Agent Skill:

```bash
npx -y @fastmoss/skill@latest
```

The Skill command is non-interactive, so it can be pasted into an Agent conversation for the Agent to execute. By default it installs `fastmoss-cli` for Codex, Claude, and generic Agents, then prints the installed `SKILL.md` paths and a current-conversation handoff.

Target or remove a specific installation:

```bash
npx -y @fastmoss/skill@latest --agent codex
npx -y @fastmoss/skill@latest --agent claude
npx -y @fastmoss/skill@latest --agent agents
npx -y @fastmoss/skill@latest --agent all
npx -y @fastmoss/skill@latest uninstall --agent all
```

Set `FASTMOSS_SKILL_DIR` to install into one custom skills root. npm installation uses only the configured npm registry and does not download from GitHub.

### GitHub clone

```bash
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
./install.sh --cli
./install.sh --skill
./install.sh --all
```

On Windows PowerShell:

```powershell
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
.\install.ps1 -Cli
.\install.ps1 -Skill
.\install.ps1 -All
```

`--all` and `-All` run the two independent installers in sequence. Clone and GitHub Release bundles install only from local files after download; they do not invoke npm or fetch additional files.
<!-- FASTMOSS_INSTALLATION_END -->
````

- [ ] **步骤 4：编写中文 canonical 安装区块**

新建 `templates/readme/installation.zh-CN.md`，内容固定为：

````markdown
<!-- FASTMOSS_INSTALLATION_START -->
## 安装

CLI 与 Agent Skill 相互独立，安装其中一个不会自动安装另一个。

### npm

只安装 CLI：

```bash
npm install -g @fastmoss/cli@latest
```

不做全局安装，临时运行 CLI：

```bash
npx -y @fastmoss/cli@latest
```

只安装或更新 Agent Skill：

```bash
npx -y @fastmoss/skill@latest
```

Skill 命令全程非交互，可以直接发送到 Agent 聊天框由 Agent 执行。默认会把 `fastmoss-cli` 安装到 Codex、Claude 和通用 Agents 三个目录，并输出实际 `SKILL.md` 路径和当前会话加载提示。

指定 Agent 或卸载：

```bash
npx -y @fastmoss/skill@latest --agent codex
npx -y @fastmoss/skill@latest --agent claude
npx -y @fastmoss/skill@latest --agent agents
npx -y @fastmoss/skill@latest --agent all
npx -y @fastmoss/skill@latest uninstall --agent all
```

设置 `FASTMOSS_SKILL_DIR` 后只安装到一个自定义 skills 根目录。npm 安装只使用用户配置的 npm registry，不会从 GitHub 下载文件。

### GitHub clone

```bash
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
./install.sh --cli
./install.sh --skill
./install.sh --all
```

Windows PowerShell：

```powershell
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
.\install.ps1 -Cli
.\install.ps1 -Skill
.\install.ps1 -All
```

`--all` 和 `-All` 只是依次执行两个独立安装动作。clone 或下载 GitHub Release 离线包后，安装过程只读取本地文件，不调用 npm，也不继续下载其他文件。
<!-- FASTMOSS_INSTALLATION_END -->
````

- [ ] **步骤 5：将三类 README 改为正文模板**

使用 `git mv` 完成四个现有 README 的重命名。每个模板只保留一个 `{{FASTMOSS_INSTALLATION}}`：

- 公开仓库模板在产品介绍之后放置占位符，保留 API Key、命令和工具目录正文。
- CLI npm 模板删除旧 `Binary Download`、`Cache Directory`、`postinstall` 和 GitHub 下载说明，改为一句：`The npm package resolves an exact-version platform package and never downloads a binary at install time or runtime.`；中文写对应说明。
- Skill npm 模板写清包只负责安装 Skill、不依赖 CLI、不检查 CLI，并在占位符之后说明 `--help`、`--version`、manifest 与安全卸载行为。
- 六个模板中不得出现 `npx skills add FastMoss/cli`、`fastmoss-install-skill`、`--allow-scripts` 或旧下载环境变量。

- [ ] **步骤 6：实现只向 staging 输出 README 的 renderer**

新建 `scripts/render_release_readmes.js`：

```js
const fs = require("node:fs");
const path = require("node:path");

const PLACEHOLDER = "{{FASTMOSS_INSTALLATION}}";
const TARGETS = [
  {
    template: "templates/public-release-repo/README.template.md",
    fragment: "templates/readme/installation.md",
    output: "README.md",
  },
  {
    template: "templates/public-release-repo/README.zh-CN.template.md",
    fragment: "templates/readme/installation.zh-CN.md",
    output: "README.zh-CN.md",
  },
  {
    template: "packaging/npm/fastmoss/README.template.md",
    fragment: "templates/readme/installation.md",
    output: "fastmoss/README.md",
  },
  {
    template: "packaging/npm/fastmoss/README.zh-CN.template.md",
    fragment: "templates/readme/installation.zh-CN.md",
    output: "fastmoss/README.zh-CN.md",
  },
  {
    template: "packaging/npm/fastmoss-skill/README.template.md",
    fragment: "templates/readme/installation.md",
    output: "fastmoss-skill/README.md",
  },
  {
    template: "packaging/npm/fastmoss-skill/README.zh-CN.template.md",
    fragment: "templates/readme/installation.zh-CN.md",
    output: "fastmoss-skill/README.zh-CN.md",
  },
];

async function renderReleaseReadmes({
  rootDir = path.join(__dirname, ".."),
  outputDir,
} = {}) {
  if (!outputDir) throw new Error("outputDir is required");
  for (const target of TARGETS) {
    const template = await fs.promises.readFile(
      path.join(rootDir, target.template),
      "utf8",
    );
    const occurrences = template.split(PLACEHOLDER).length - 1;
    if (occurrences !== 1) {
      throw new Error(`${target.template} must contain exactly one ${PLACEHOLDER}`);
    }
    const fragment = (await fs.promises.readFile(
      path.join(rootDir, target.fragment),
      "utf8",
    )).trim();
    const rendered = template.replace(PLACEHOLDER, fragment);
    if (rendered.includes(PLACEHOLDER)) {
      throw new Error(`placeholder remains in ${target.output}`);
    }
    const outputPath = path.join(outputDir, target.output);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, `${rendered.trimEnd()}\n`);
  }
}

if (require.main === module) {
  const outputDir = process.argv[2];
  renderReleaseReadmes({ outputDir }).catch((error) => {
    process.stderr.write(`render README error: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { PLACEHOLDER, TARGETS, renderReleaseReadmes };
```

- [ ] **步骤 7：运行 README 对齐测试**

运行：

```bash
node scripts/render_release_readmes_test.js
```

预期：测试通过；临时输出中的三份英文安装区块逐字一致，三份中文安装区块逐字一致。

- [ ] **步骤 8：提交 README 唯一来源**

```bash
git add templates/readme templates/public-release-repo/README*.md \
  packaging/npm/fastmoss/README*.md \
  packaging/npm/fastmoss-skill/README*.md \
  scripts/render_release_readmes.js \
  scripts/render_release_readmes_test.js
git commit -m "docs: render aligned npm and GitHub installation guides"
```

## 任务 4：实现 GitHub clone 与离线包安装器

**仓库：** `fastmoss-mcp`

**文件：**
- 新建：`templates/public-release-repo/install.sh`
- 新建：`templates/public-release-repo/install.ps1`
- 新建：`templates/public-release-repo/test/install-sh.test.js`
- 新建：`templates/public-release-repo/test/install-powershell.ps1`

- [ ] **步骤 1：先写 Unix 独立安装路径失败测试**

新建 `templates/public-release-repo/test/install-sh.test.js`。使用 `node:test`、真实临时目录和 `spawnSync("bash", ...)`，fixture 固定包含：

```js
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
  await Promise.all(fixtureRoots.map((root) =>
    fs.promises.rm(root, { recursive: true, force: true })));
});
```

在同一文件加入这些明确断言：

```js
unixTest("--cli installs only the verified local binary", async () => {
  const { root } = await fixture({ includeSkill: false });
  const binDir = path.join(root, "bin-target");
  const skillDir = path.join(root, "skill-target");
  const result = spawnSync("bash", [
    path.join(root, "install.sh"),
    "--cli",
    "--bin-dir", binDir,
    "--skill-dir", skillDir,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(binDir, "fastmoss")), true);
  assert.equal(fs.existsSync(skillDir), false);
});

unixTest("--skill works without any release binary", async () => {
  const { root } = await fixture({ includeAsset: false });
  const binDir = path.join(root, "bin-target");
  const skillDir = path.join(root, "skill-target");
  const result = spawnSync("bash", [
    path.join(root, "install.sh"),
    "--skill",
    "--bin-dir", binDir,
    "--skill-dir", skillDir,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(binDir), false);
  assert.equal(
    fs.existsSync(path.join(skillDir, "fastmoss-cli", "SKILL.md")),
    true,
  );
  assert.match(result.stdout, /Agent action: Read/);
});

unixTest("--all installs both components from local files", async () => {
  const { root } = await fixture();
  const binDir = path.join(root, "bin-target");
  const skillDir = path.join(root, "skill-target");
  const result = spawnSync("bash", [
    path.join(root, "install.sh"),
    "--all",
    "--bin-dir", binDir,
    "--skill-dir", skillDir,
  ], {
    env: { ...process.env, PATH: "/usr/bin:/bin" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(binDir, "fastmoss")), true);
  assert.equal(
    fs.existsSync(path.join(skillDir, "fastmoss-cli", "SKILL.md")),
    true,
  );
});

unixTest("a checksum mismatch fails before writing the CLI", async () => {
  const { root, assetPath } = await fixture();
  await fs.promises.appendFile(assetPath, "tampered\n");
  const binDir = path.join(root, "bin-target");
  const result = spawnSync("bash", [
    path.join(root, "install.sh"), "--cli", "--bin-dir", binDir,
  ], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /checksum mismatch/i);
  assert.equal(fs.existsSync(path.join(binDir, "fastmoss")), false);
});

unixTest("command-line destinations override environment values", async () => {
  const { root } = await fixture();
  const argumentRoot = path.join(root, "argument-skills");
  const environmentRoot = path.join(root, "environment-skills");
  const result = spawnSync("bash", [
    path.join(root, "install.sh"),
    "--skill",
    "--skill-dir", argumentRoot,
    "--agent", "codex",
  ], {
    env: {
      ...process.env,
      FASTMOSS_SKILL_DIR: environmentRoot,
      FASTMOSS_SKILL_AGENT: "agents",
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(argumentRoot, "fastmoss-cli", "SKILL.md")), true);
  assert.equal(fs.existsSync(environmentRoot), false);
});
```

再添加两个用例：目标父路径是普通文件时返回非零并显示该路径；脚本源码不匹配 `npm|npx|curl|wget`。这些用例保证 clone 后的安装阶段既不调用包管理器，也不继续下载。

再添加一个仅在生成后的公开 staging 中运行的真实资产测试：当测试根目录存在 `.fastmoss-release.json` 和宿主平台 release asset 时，执行仓库根 `install.sh --cli --bin-dir <temp>`，随后运行 `<temp>/fastmoss --version`，断言输出等于 marker version。上游模板目录没有 release asset 时使用 `test.skip`；`prepare_cli_release.sh` 和公开仓库 CI 中不得跳过。

- [ ] **步骤 2：运行 Unix 安装器测试并确认失败**

运行：

```bash
node --test templates/public-release-repo/test/install-sh.test.js
```

预期：失败，因为 `install.sh` 尚不存在。

- [ ] **步骤 3：实现纯本地 Unix 安装器**

新建 `templates/public-release-repo/install.sh`，完整行为如下：

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE=""
AGENT="${FASTMOSS_SKILL_AGENT:-all}"
BIN_DIR="${FASTMOSS_BIN_DIR:-${HOME}/.local/bin}"
SKILL_DIR="${FASTMOSS_SKILL_DIR:-}"

die() {
  printf '%s\n' "fastmoss installer error: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: ./install.sh --cli|--skill|--all [options]

Options:
  --agent codex|claude|agents|all
  --bin-dir PATH
  --skill-dir PATH
  -h, --help
EOF
}

set_mode() {
  [ -z "${MODE}" ] || die "choose only one of --cli, --skill, or --all"
  MODE="$1"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --cli) set_mode cli ;;
    --skill) set_mode skill ;;
    --all) set_mode all ;;
    --agent)
      [ "$#" -ge 2 ] || die "--agent requires a value"
      AGENT="$2"
      shift
      ;;
    --bin-dir)
      [ "$#" -ge 2 ] || die "--bin-dir requires a value"
      BIN_DIR="$2"
      shift
      ;;
    --skill-dir)
      [ "$#" -ge 2 ] || die "--skill-dir requires a value"
      SKILL_DIR="$2"
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
  shift
done

[ -n "${MODE}" ] || die "choose --cli, --skill, or --all"
case "${AGENT}" in codex|claude|agents|all) ;; *) die "unsupported agent: ${AGENT}" ;; esac

MARKER="${SCRIPT_DIR}/.fastmoss-release.json"
[ -f "${MARKER}" ] || die "release marker not found: ${MARKER}"
VERSION="$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "${MARKER}")"
[ -n "${VERSION}" ] || die "release version not found in ${MARKER}"

resolve_asset() {
  local system machine
  system="$(uname -s)"
  machine="$(uname -m)"
  case "${system}/${machine}" in
    Darwin/x86_64) printf '%s\n' fastmoss-darwin-amd64 ;;
    Darwin/arm64) printf '%s\n' fastmoss-darwin-arm64 ;;
    Linux/x86_64|Linux/amd64) printf '%s\n' fastmoss-linux-amd64 ;;
    Linux/aarch64|Linux/arm64) printf '%s\n' fastmoss-linux-arm64 ;;
    *) die "unsupported platform: ${system}/${machine}" ;;
  esac
}

verify_asset() {
  local asset_name="$1"
  local asset_path="${SCRIPT_DIR}/release-assets/${asset_name}"
  local checksum_file="${SCRIPT_DIR}/release-assets/SHA256SUMS"
  local expected actual
  [ -f "${asset_path}" ] || die "release asset not found: ${asset_path}"
  [ -f "${checksum_file}" ] || die "checksum file not found: ${checksum_file}"
  expected="$(awk -v name="${asset_name}" '$2 == name { print $1 }' "${checksum_file}")"
  [ -n "${expected}" ] || die "checksum not found for ${asset_name}"
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "${asset_path}" | awk '{ print $1 }')"
  elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "${asset_path}" | awk '{ print $1 }')"
  else
    die "missing checksum tool: need sha256sum or shasum"
  fi
  [ "${actual}" = "${expected}" ] || die "checksum mismatch for ${asset_name}"
}

install_cli() {
  local asset_name asset_path target
  asset_name="$(resolve_asset)"
  asset_path="${SCRIPT_DIR}/release-assets/${asset_name}"
  verify_asset "${asset_name}"
  mkdir -p "${BIN_DIR}" || die "cannot create CLI directory: ${BIN_DIR}"
  target="${BIN_DIR}/fastmoss"
  install -m 0755 "${asset_path}" "${target}" || die "cannot install CLI to ${target}"
  printf '%s\n' "Installed FastMoss CLI: ${target}"
  case ":${PATH}:" in
    *":${BIN_DIR}:"*) ;;
    *) printf '%s\n' "Add ${BIN_DIR} to PATH, for example: export PATH=\"${BIN_DIR}:\$PATH\"" ;;
  esac
}

skill_roots() {
  if [ -n "${SKILL_DIR}" ]; then
    printf '%s\n' "${SKILL_DIR}"
    return
  fi
  case "${AGENT}" in
    codex) printf '%s\n' "${CODEX_HOME:-${HOME}/.codex}/skills" ;;
    claude) printf '%s\n' "${CLAUDE_HOME:-${HOME}/.claude}/skills" ;;
    agents) printf '%s\n' "${AGENTS_HOME:-${HOME}/.agents}/skills" ;;
    all)
      printf '%s\n' \
        "${CODEX_HOME:-${HOME}/.codex}/skills" \
        "${CLAUDE_HOME:-${HOME}/.claude}/skills" \
        "${AGENTS_HOME:-${HOME}/.agents}/skills" | awk '!seen[$0]++'
      ;;
  esac
}

install_skill_root() {
  local root="$1"
  local source="${SCRIPT_DIR}/skills/fastmoss-cli"
  local target="${root}/fastmoss-cli"
  local temporary="${target}.tmp-$$"
  local backup="${target}.backup-$$"
  [ -f "${source}/SKILL.md" ] || die "Skill payload is missing SKILL.md: ${source}"
  mkdir -p "${root}" || die "cannot create Skill directory: ${root}"
  rm -rf "${temporary}" "${backup}"
  mkdir -p "${temporary}" || die "cannot create temporary Skill directory: ${temporary}"
  cp -R "${source}/." "${temporary}/" || die "cannot copy Skill payload to ${temporary}"
  find "${temporary}" -name .DS_Store -delete
  cat > "${temporary}/.fastmoss-install.json" <<EOF
{
  "schemaVersion": 1,
  "package": "@fastmoss/skill",
  "skill": "fastmoss-cli",
  "version": "${VERSION}"
}
EOF
  if [ -e "${target}" ]; then
    mv "${target}" "${backup}" || die "cannot back up existing Skill: ${target}"
  fi
  if ! mv "${temporary}" "${target}"; then
    [ ! -e "${backup}" ] || mv "${backup}" "${target}"
    die "cannot install Skill to ${target}"
  fi
  rm -rf "${backup}"
  printf '%s\n' "Installed FastMoss Skill: ${target}/SKILL.md"
}

install_skill() {
  local root
  while IFS= read -r root; do
    [ -n "${root}" ] || continue
    install_skill_root "${root}"
  done < <(skill_roots)
  printf '%s\n' "Agent action: Read the installed fastmoss-cli/SKILL.md now and use it in this conversation."
  printf '%s\n' "If this client cannot load newly installed skills in the current session, start a new conversation."
}

case "${MODE}" in
  cli) install_cli ;;
  skill) install_skill ;;
  all) install_cli; install_skill ;;
esac
```

设置可执行权限：

```bash
chmod +x templates/public-release-repo/install.sh
```

- [ ] **步骤 4：运行 Unix 安装器测试**

运行：

```bash
bash -n templates/public-release-repo/install.sh
node --test templates/public-release-repo/test/install-sh.test.js
```

预期：语法检查与全部 Unix fixture 测试通过。

- [ ] **步骤 5：实现 PowerShell 安装器失败测试**

新建 `templates/public-release-repo/test/install-powershell.ps1`。脚本必须在临时目录创建 marker、Windows AMD64 fixture asset、`SHA256SUMS` 和最小 Skill，然后依次断言：

```powershell
$ErrorActionPreference = "Stop"
$TemplateRoot = Split-Path -Parent $PSScriptRoot
$Root = Join-Path ([IO.Path]::GetTempPath()) ("fastmoss-install-" + [Guid]::NewGuid())

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

try {
  New-Item -ItemType Directory -Force -Path $Root | Out-Null
  Copy-Item (Join-Path $TemplateRoot "install.ps1") (Join-Path $Root "install.ps1")
  @{ schemaVersion = 1; version = "1.2.3" } |
    ConvertTo-Json | Set-Content (Join-Path $Root ".fastmoss-release.json")
  $AssetDir = Join-Path $Root "release-assets"
  New-Item -ItemType Directory -Force -Path $AssetDir | Out-Null
  $AssetPath = Join-Path $AssetDir "fastmoss-windows-amd64.exe"
  Copy-Item "$env:SystemRoot\System32\where.exe" $AssetPath
  $Hash = (Get-FileHash -Algorithm SHA256 $AssetPath).Hash.ToLowerInvariant()
  "$Hash  fastmoss-windows-amd64.exe" | Set-Content (Join-Path $AssetDir "SHA256SUMS")
  $SkillSource = Join-Path $Root "skills\fastmoss-cli"
  New-Item -ItemType Directory -Force -Path $SkillSource | Out-Null
  "# FastMoss" | Set-Content (Join-Path $SkillSource "SKILL.md")

  $SkillDir = Join-Path $Root "skill-target"
  & (Join-Path $Root "install.ps1") -Skill -SkillDir $SkillDir
  Assert-True (Test-Path (Join-Path $SkillDir "fastmoss-cli\SKILL.md")) "Skill-only install failed"

  $BinDir = Join-Path $Root "bin-target"
  & (Join-Path $Root "install.ps1") -Cli -BinDir $BinDir
  Assert-True (Test-Path (Join-Path $BinDir "fastmoss.exe")) "CLI-only install failed"

  Add-Content $AssetPath "tampered"
  $Output = & powershell -NoProfile -File (Join-Path $Root "install.ps1") -Cli -BinDir $BinDir 2>&1
  Assert-True ($LASTEXITCODE -ne 0) "Checksum mismatch should fail"
  Assert-True (($Output -join "`n") -match "checksum mismatch") "Checksum failure message missing"
} finally {
  Remove-Item -Recurse -Force $Root -ErrorAction SilentlyContinue
}
```

测试中的 fixture executable 只用于验证复制，不执行。脚本还要检测自身是否运行在生成后的公开 staging：若测试根目录存在 `.fastmoss-release.json`，则另建临时 `BinDir` 执行根目录真实 `install.ps1 -Cli`，运行安装后的 `fastmoss.exe --version`，并断言输出等于 marker version；上游模板目录没有真实 asset 时跳过此段。再加入源码扫描，拒绝 `npm`、`npx`、`Invoke-WebRequest`、`Start-BitsTransfer` 和 `curl`。

- [ ] **步骤 6：实现纯本地 PowerShell 安装器**

新建 `templates/public-release-repo/install.ps1`。参数和优先级固定为：

```powershell
[CmdletBinding()]
param(
  [switch]$Cli,
  [switch]$Skill,
  [switch]$All,
  [ValidateSet("codex", "claude", "agents", "all")]
  [string]$Agent,
  [string]$BinDir,
  [string]$SkillDir
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Fail([string]$Message) { throw "fastmoss installer error: $Message" }

$ModeCount = @($Cli, $Skill, $All).Where({ $_ }).Count
if ($ModeCount -ne 1) { Fail "choose exactly one of -Cli, -Skill, or -All" }

$MarkerPath = Join-Path $ScriptDir ".fastmoss-release.json"
if (-not (Test-Path $MarkerPath -PathType Leaf)) { Fail "release marker not found: $MarkerPath" }
$Release = Get-Content $MarkerPath -Raw | ConvertFrom-Json
$Version = [string]$Release.version
if (-not $Version) { Fail "release version not found in $MarkerPath" }

$SelectedAgent = if ($Agent) {
  $Agent
} elseif ($env:FASTMOSS_SKILL_AGENT) {
  $env:FASTMOSS_SKILL_AGENT
} else {
  "all"
}
if (@("codex", "claude", "agents", "all") -notcontains $SelectedAgent) {
  Fail "unsupported agent: $SelectedAgent"
}

$SelectedBinDir = if ($BinDir) {
  $BinDir
} elseif ($env:FASTMOSS_BIN_DIR) {
  $env:FASTMOSS_BIN_DIR
} else {
  Join-Path $env:LOCALAPPDATA "FastMoss\bin"
}
$SelectedSkillDir = if ($SkillDir) { $SkillDir } else { $env:FASTMOSS_SKILL_DIR }
```

继续实现以下完整函数契约：

```powershell
function Install-Cli {
  $Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  if ($Architecture -ne "X64") { Fail "unsupported Windows architecture: $Architecture" }
  $AssetName = "fastmoss-windows-amd64.exe"
  $AssetPath = Join-Path $ScriptDir "release-assets\$AssetName"
  $ChecksumPath = Join-Path $ScriptDir "release-assets\SHA256SUMS"
  if (-not (Test-Path $AssetPath -PathType Leaf)) { Fail "release asset not found: $AssetPath" }
  if (-not (Test-Path $ChecksumPath -PathType Leaf)) { Fail "checksum file not found: $ChecksumPath" }
  $ChecksumLine = Get-Content $ChecksumPath | Where-Object { $_ -match "\s+$([Regex]::Escape($AssetName))$" } | Select-Object -First 1
  if (-not $ChecksumLine) { Fail "checksum not found for $AssetName" }
  $Expected = ($ChecksumLine -split "\s+")[0].ToLowerInvariant()
  $Actual = (Get-FileHash -Algorithm SHA256 $AssetPath).Hash.ToLowerInvariant()
  if ($Expected -ne $Actual) { Fail "checksum mismatch for $AssetName" }
  New-Item -ItemType Directory -Force -Path $SelectedBinDir | Out-Null
  $Target = Join-Path $SelectedBinDir "fastmoss.exe"
  Copy-Item -Force $AssetPath $Target
  Write-Output "Installed FastMoss CLI: $Target"
  if (($env:PATH -split ";") -notcontains $SelectedBinDir) {
    Write-Output "Add $SelectedBinDir to PATH."
  }
}

function Get-SkillRoots {
  if ($SelectedSkillDir) { return @([IO.Path]::GetFullPath($SelectedSkillDir)) }
  $Roots = @{
    codex = Join-Path $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }) "skills"
    claude = Join-Path $(if ($env:CLAUDE_HOME) { $env:CLAUDE_HOME } else { Join-Path $HOME ".claude" }) "skills"
    agents = Join-Path $(if ($env:AGENTS_HOME) { $env:AGENTS_HOME } else { Join-Path $HOME ".agents" }) "skills"
  }
  if ($SelectedAgent -eq "all") {
    return @($Roots.codex, $Roots.claude, $Roots.agents) | Select-Object -Unique
  }
  return @($Roots[$SelectedAgent])
}

function Install-SkillRoot([string]$Root) {
  $Source = Join-Path $ScriptDir "skills\fastmoss-cli"
  if (-not (Test-Path (Join-Path $Source "SKILL.md") -PathType Leaf)) {
    Fail "Skill payload is missing SKILL.md: $Source"
  }
  $Target = Join-Path $Root "fastmoss-cli"
  $Temporary = "$Target.tmp-$PID"
  $Backup = "$Target.backup-$PID"
  New-Item -ItemType Directory -Force -Path $Root | Out-Null
  Remove-Item -Recurse -Force $Temporary, $Backup -ErrorAction SilentlyContinue
  Copy-Item -Recurse $Source $Temporary
  Get-ChildItem -Recurse -Force $Temporary -Filter ".DS_Store" |
    Remove-Item -Force -ErrorAction SilentlyContinue
  @{
    schemaVersion = 1
    package = "@fastmoss/skill"
    skill = "fastmoss-cli"
    version = $Version
  } | ConvertTo-Json | Set-Content (Join-Path $Temporary ".fastmoss-install.json")
  $HadTarget = Test-Path $Target
  if ($HadTarget) { Move-Item $Target $Backup }
  try {
    Move-Item $Temporary $Target
  } catch {
    if ($HadTarget -and (Test-Path $Backup)) { Move-Item $Backup $Target }
    throw
  } finally {
    Remove-Item -Recurse -Force $Temporary -ErrorAction SilentlyContinue
  }
  Remove-Item -Recurse -Force $Backup -ErrorAction SilentlyContinue
  Write-Output "Installed FastMoss Skill: $(Join-Path $Target 'SKILL.md')"
}

function Install-Skill {
  foreach ($Root in Get-SkillRoots) { Install-SkillRoot $Root }
  Write-Output "Agent action: Read the installed fastmoss-cli/SKILL.md now and use it in this conversation."
  Write-Output "If this client cannot load newly installed skills in the current session, start a new conversation."
}

if ($Cli) { Install-Cli }
if ($Skill) { Install-Skill }
if ($All) { Install-Cli; Install-Skill }
```

- [ ] **步骤 7：运行 PowerShell 测试**

在安装了 PowerShell 的开发机运行：

```bash
pwsh -NoProfile -File templates/public-release-repo/test/install-powershell.ps1
```

预期：全部断言通过。若本机没有 `pwsh`，记录该限制，但 Windows GitHub Actions 门禁在任务 10 中必须执行此测试。

- [ ] **步骤 8：提交 GitHub 安装器模板**

```bash
git add templates/public-release-repo/install.sh \
  templates/public-release-repo/install.ps1 \
  templates/public-release-repo/test/install-sh.test.js \
  templates/public-release-repo/test/install-powershell.ps1
git commit -m "feat: add offline GitHub CLI and Skill installers"
```

## 任务 5：从上游源码生成确定性的公开仓库 staging

**仓库：** `fastmoss-mcp`

**文件：**
- 新建：`scripts/stage_public_release_repo.js`
- 新建：`scripts/stage_public_release_repo_test.js`

- [ ] **步骤 1：先写 staging 结构和源码唯一性失败测试**

新建 `scripts/stage_public_release_repo_test.js`。测试使用真实上游模板与 canonical Skill，但为五个平台创建小型 fixture 资产：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { PLATFORM_TARGETS } = require("../packaging/npm/fastmoss/lib/targets");
const { stagePublicReleaseRepo } = require("./stage_public_release_repo");

const rootDir = path.join(__dirname, "..");

async function createBuildFixture() {
  const buildDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-build-"));
  const releaseDir = path.join(buildDir, "github-release");
  await fs.promises.mkdir(releaseDir, { recursive: true });
  const checksumLines = [];
  for (const target of Object.values(PLATFORM_TARGETS)) {
    const content = Buffer.from(`fixture:${target.assetName}\n`);
    await fs.promises.writeFile(path.join(releaseDir, target.assetName), content);
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    checksumLines.push(`${checksum}  ${target.assetName}`);
  }
  await fs.promises.writeFile(
    path.join(releaseDir, "SHA256SUMS"),
    `${checksumLines.join("\n")}\n`,
  );
  return buildDir;
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
      else entries.push([
        childRelative,
        crypto.createHash("sha256").update(await fs.promises.readFile(childPath)).digest("hex"),
      ]);
    }
  }
  await walk(directory);
  return entries;
}

test("staging contains both npm products, five platform packages, and GitHub assets", async () => {
  const buildDir = await createBuildFixture();
  const outputDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-stage-"));
  const version = require("../packaging/npm/fastmoss/package.json").version;
  try {
    await fs.promises.writeFile(path.join(outputDir, "stale.txt"), "stale\n");
    await stagePublicReleaseRepo({ rootDir, buildDir, outputDir, version });
    assert.equal(fs.existsSync(path.join(outputDir, "stale.txt")), false);
    const marker = JSON.parse(
      await fs.promises.readFile(path.join(outputDir, ".fastmoss-release.json"), "utf8"),
    );
    assert.deepEqual(marker, { schemaVersion: 1, version });
    assert.equal(
      require(path.join(outputDir, "fastmoss", "package.json")).version,
      version,
    );
    assert.equal(
      require(path.join(outputDir, "fastmoss-skill", "package.json")).version,
      version,
    );
    assert.equal(fs.existsSync(path.join(outputDir, "fastmoss", "skills")), false);
    for (const target of Object.values(PLATFORM_TARGETS)) {
      const packageRoot = path.join(outputDir, "platform-packages", target.packageDir);
      const manifest = require(path.join(packageRoot, "package.json"));
      assert.equal(manifest.name, target.packageName);
      assert.equal(manifest.version, version);
      assert.deepEqual(manifest.os, [target.os]);
      assert.deepEqual(manifest.cpu, [target.cpu]);
      assert.equal(
        fs.existsSync(path.join(packageRoot, "bin", target.binaryName)),
        true,
      );
      assert.deepEqual(
        await fs.promises.readFile(path.join(packageRoot, "bin", target.binaryName)),
        await fs.promises.readFile(path.join(buildDir, "github-release", target.assetName)),
      );
    }
  } finally {
    await fs.promises.rm(buildDir, { recursive: true, force: true });
    await fs.promises.rm(outputDir, { recursive: true, force: true });
  }
});

test("all generated Skill copies match the canonical source", async () => {
  const buildDir = await createBuildFixture();
  const outputDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-stage-skill-"));
  const version = require("../packaging/npm/fastmoss/package.json").version;
  try {
    await stagePublicReleaseRepo({ rootDir, buildDir, outputDir, version });
    const canonical = await treeDigest(path.join(rootDir, "skills", "fastmoss-cli"));
    assert.deepEqual(
      await treeDigest(path.join(outputDir, "skills", "fastmoss-cli")),
      canonical,
    );
    assert.deepEqual(
      await treeDigest(path.join(outputDir, "fastmoss-skill", "skills", "fastmoss-cli")),
      canonical,
    );
  } finally {
    await fs.promises.rm(buildDir, { recursive: true, force: true });
    await fs.promises.rm(outputDir, { recursive: true, force: true });
  }
});
```

再添加三个用例：checksum 缺失或错误时拒绝 staging；CLI 主包 optional dependency 版本与参数版本不一致时拒绝；输出 README 不残留占位符且公开模板的 `.template.md` 文件不进入 staging。

- [ ] **步骤 2：运行 staging 测试并确认失败**

运行：

```bash
node scripts/stage_public_release_repo_test.js
```

预期：失败，因为 staging generator 尚不存在。

- [ ] **步骤 3：实现通用复制、checksum 和 JSON 辅助函数**

新建 `scripts/stage_public_release_repo.js`，先加入：

```js
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { PLATFORM_TARGETS } = require("../packaging/npm/fastmoss/lib/targets");
const { renderReleaseReadmes } = require("./render_release_readmes");

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

async function copyTree(source, destination, { filter = () => true } = {}) {
  await fs.promises.cp(source, destination, {
    recursive: true,
    filter(sourcePath) {
      return path.basename(sourcePath) !== ".DS_Store" && filter(sourcePath);
    },
  });
}

async function readJSON(filePath) {
  return JSON.parse(await fs.promises.readFile(filePath, "utf8"));
}

async function writeJSON(filePath, value) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseChecksums(content) {
  const checksums = new Map();
  for (const line of content.trim().split(/\r?\n/)) {
    const match = line.match(/^([a-f0-9]{64})\s+([^/\\]+)$/);
    if (!match) throw new Error(`Invalid SHA256SUMS line: ${line}`);
    if (checksums.has(match[2])) throw new Error(`Duplicate checksum: ${match[2]}`);
    checksums.set(match[2], match[1]);
  }
  return checksums;
}

async function sha256(filePath) {
  const content = await fs.promises.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}
```

- [ ] **步骤 4：实现 CLI、Skill 与平台包 staging**

继续加入：

```js
async function stageCLI({ rootDir, outputDir, version }) {
  const source = path.join(rootDir, "packaging", "npm", "fastmoss");
  const destination = path.join(outputDir, "fastmoss");
  const manifest = await readJSON(path.join(source, "package.json"));
  if (manifest.version !== version) {
    throw new Error(`CLI package version ${manifest.version} does not match ${version}`);
  }
  const expectedDependencies = Object.fromEntries(
    Object.values(PLATFORM_TARGETS).map((target) => [target.packageName, version]),
  );
  const actualDependencies = manifest.optionalDependencies || {};
  const actualNames = Object.keys(actualDependencies).sort();
  const expectedNames = Object.keys(expectedDependencies).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames) ||
      expectedNames.some((name) => actualDependencies[name] !== version)) {
    throw new Error("CLI optionalDependencies must pin all platform packages to the release version");
  }
  await fs.promises.mkdir(destination, { recursive: true });
  await writeJSON(path.join(destination, "package.json"), manifest);
  for (const directory of ["bin", "lib", "test"]) {
    await copyTree(path.join(source, directory), path.join(destination, directory));
  }
  await fs.promises.chmod(path.join(destination, "bin", "fastmoss.js"), 0o755);
}

async function stageSkill({ rootDir, outputDir, version }) {
  const source = path.join(rootDir, "packaging", "npm", "fastmoss-skill");
  const destination = path.join(outputDir, "fastmoss-skill");
  const template = await readJSON(path.join(source, "package.template.json"));
  if (template.version !== undefined || template.dependencies !== undefined) {
    throw new Error("Skill package template must not declare version or dependencies");
  }
  await fs.promises.mkdir(destination, { recursive: true });
  await writeJSON(path.join(destination, "package.json"), { ...template, version });
  for (const directory of ["bin", "lib", "test"]) {
    await copyTree(path.join(source, directory), path.join(destination, directory));
  }
  await copyTree(
    path.join(rootDir, "skills", "fastmoss-cli"),
    path.join(destination, "skills", "fastmoss-cli"),
  );
  await fs.promises.chmod(
    path.join(destination, "bin", "fastmoss-skill.js"),
    0o755,
  );
}

async function stageAssetsAndPlatformPackages({
  buildDir,
  outputDir,
  version,
}) {
  const sourceReleaseDir = path.join(buildDir, "github-release");
  const checksumPath = path.join(sourceReleaseDir, "SHA256SUMS");
  const checksums = parseChecksums(await fs.promises.readFile(checksumPath, "utf8"));
  if (checksums.size !== Object.keys(PLATFORM_TARGETS).length) {
    throw new Error(`Expected five checksums, found ${checksums.size}`);
  }
  const releaseDir = path.join(outputDir, "release-assets");
  await fs.promises.mkdir(releaseDir, { recursive: true });
  await fs.promises.copyFile(checksumPath, path.join(releaseDir, "SHA256SUMS"));

  for (const target of Object.values(PLATFORM_TARGETS)) {
    const sourceAsset = path.join(sourceReleaseDir, target.assetName);
    const actual = await sha256(sourceAsset);
    if (checksums.get(target.assetName) !== actual) {
      throw new Error(`SHA-256 mismatch for ${target.assetName}`);
    }
    await fs.promises.copyFile(
      sourceAsset,
      path.join(releaseDir, target.assetName),
    );
    const packageRoot = path.join(
      outputDir,
      "platform-packages",
      target.packageDir,
    );
    await writeJSON(path.join(packageRoot, "package.json"), {
      name: target.packageName,
      version,
      description: `FastMoss CLI binary for ${target.os}/${target.cpu}`,
      license: "UNLICENSED",
      private: false,
      os: [target.os],
      cpu: [target.cpu],
      files: ["bin"],
    });
    const binaryPath = path.join(packageRoot, "bin", target.binaryName);
    await fs.promises.mkdir(path.dirname(binaryPath), { recursive: true });
    await fs.promises.copyFile(sourceAsset, binaryPath);
    if (target.os !== "win32") {
      await fs.promises.chmod(binaryPath, 0o755);
      await fs.promises.chmod(path.join(releaseDir, target.assetName), 0o755);
    }
  }
}
```

- [ ] **步骤 5：实现完整公开仓库组装入口**

完成 `stage_public_release_repo.js`：

```js
async function stagePublicReleaseRepo({
  rootDir = path.join(__dirname, ".."),
  buildDir = path.join(rootDir, "dist"),
  outputDir,
  version,
} = {}) {
  if (!outputDir) throw new Error("outputDir is required");
  if (!SEMVER.test(String(version || ""))) throw new Error(`Invalid semver: ${version}`);
  await fs.promises.rm(outputDir, { recursive: true, force: true });
  await fs.promises.mkdir(outputDir, { recursive: true });

  await copyTree(
    path.join(rootDir, "templates", "public-release-repo"),
    outputDir,
    { filter(sourcePath) { return !sourcePath.endsWith(".template.md"); } },
  );
  await stageCLI({ rootDir, outputDir, version });
  await stageSkill({ rootDir, outputDir, version });
  await copyTree(
    path.join(rootDir, "skills", "fastmoss-cli"),
    path.join(outputDir, "skills", "fastmoss-cli"),
  );
  await stageAssetsAndPlatformPackages({ buildDir, outputDir, version });
  await renderReleaseReadmes({ rootDir, outputDir });
  await writeJSON(path.join(outputDir, ".fastmoss-release.json"), {
    schemaVersion: 1,
    version,
  });
  return { outputDir, version };
}

if (require.main === module) {
  const [version, outputDir, buildDir] = process.argv.slice(2);
  stagePublicReleaseRepo({ version, outputDir, buildDir }).catch((error) => {
    process.stderr.write(`stage public release error: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  SEMVER,
  copyTree,
  parseChecksums,
  sha256,
  stagePublicReleaseRepo,
};
```

- [ ] **步骤 6：运行 staging 测试**

运行：

```bash
node scripts/stage_public_release_repo_test.js
```

预期：全部通过；fixture staging 同时包含两个用户 npm 包、五个平台包、公开 canonical Skill、安装器和五个平台资产。

- [ ] **步骤 7：提交 staging generator**

```bash
git add scripts/stage_public_release_repo.js scripts/stage_public_release_repo_test.js
git commit -m "build: generate public release staging from upstream"
```

## 任务 6：在公开模板中实现 tarball、离线归档和包边界验证

**仓库：** `fastmoss-mcp`

**文件：**
- 修改：`templates/public-release-repo/.gitignore`
- 新建：`templates/public-release-repo/package.json`
- 新建：`templates/public-release-repo/package-lock.json`
- 新建：`templates/public-release-repo/scripts/run-tests.js`
- 新建：`templates/public-release-repo/scripts/pack-release.js`
- 新建：`templates/public-release-repo/scripts/create_release_archives.sh`
- 新建：`templates/public-release-repo/test/release-packages.test.js`
- 修改：`scripts/stage_public_release_repo_test.js`

- [ ] **步骤 1：先写公开包内容失败测试**

新建 `templates/public-release-repo/test/release-packages.test.js`。该测试在生成后的公开仓库运行，首先定义：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");
const mainPackage = require("../fastmoss/package.json");
const skillPackage = require("../fastmoss-skill/package.json");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function packFiles(packageRoot) {
  const result = run("npm", ["pack", packageRoot, "--dry-run", "--json"]);
  return JSON.parse(result.stdout)[0].files.map((entry) => entry.path);
}
```

加入以下契约测试：

```js
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
      require(path.join(
        repoRoot,
        "platform-packages",
        target.packageDir,
        "package.json",
      )),
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
    Object.fromEntries(Object.values(PLATFORM_TARGETS).map((target) => [
      target.packageName,
      mainPackage.version,
    ])),
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
```

再添加：三份同语言 README 安装区块逐字相同；全部 README 无占位符；公开 root Skill 与 Skill npm payload 的 tree digest 相同；公开现行文件不引用旧脚本、旧命令或下载环境变量。

- [ ] **步骤 2：添加公开仓库测试发现器**

新建 `templates/public-release-repo/scripts/run-tests.js`：

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

const files = [
  path.join(repoRoot, "fastmoss", "test"),
  path.join(repoRoot, "fastmoss-skill", "test"),
  path.join(repoRoot, "test"),
].flatMap(collect).sort();

if (files.length === 0) throw new Error("No .test.js files found");
const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: repoRoot,
  stdio: "inherit",
});
process.exitCode = result.status == null ? 1 : result.status;
```

- [ ] **步骤 3：实现七个 npm tarball 的固定发布顺序**

新建 `templates/public-release-repo/scripts/pack-release.js`：

```js
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");

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
  { kind: "skill", name: "@fastmoss/skill", root: path.join(repoRoot, "fastmoss-skill") },
];

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });

const manifest = packages.map((entry) => {
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
```

- [ ] **步骤 4：实现五个平台完整离线归档**

新建 `templates/public-release-repo/scripts/create_release_archives.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="${ROOT_DIR}/.fastmoss-release.json"
VERSION="$(node -p "require('${MARKER}').version")"
OUTPUT_DIR="${ROOT_DIR}/dist/publish/github"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

create_bundle() {
  local key="$1"
  local asset="$2"
  local installer="$3"
  local archive="$4"
  local bundle="${WORK_DIR}/fastmoss-v${VERSION}-${key}"
  mkdir -p "${bundle}/release-assets" "${bundle}/skills"
  cp "${ROOT_DIR}/.fastmoss-release.json" "${bundle}/"
  cp "${ROOT_DIR}/${installer}" "${bundle}/${installer}"
  cp -R "${ROOT_DIR}/skills/fastmoss-cli" "${bundle}/skills/fastmoss-cli"
  cp "${ROOT_DIR}/release-assets/${asset}" "${bundle}/release-assets/${asset}"
  awk -v name="${asset}" '$2 == name' \
    "${ROOT_DIR}/release-assets/SHA256SUMS" > "${bundle}/release-assets/SHA256SUMS"
  [ -s "${bundle}/release-assets/SHA256SUMS" ] || {
    printf '%s\n' "checksum missing for ${asset}" >&2
    exit 1
  }
  if [ "${installer}" = "install.sh" ]; then
    chmod +x "${bundle}/install.sh" "${bundle}/release-assets/${asset}"
    printf '%s\n' "Run ./install.sh --cli, --skill, or --all." > "${bundle}/README.txt"
    tar -C "${WORK_DIR}" -czf "${OUTPUT_DIR}/${archive}" "$(basename "${bundle}")"
  else
    printf '%s\n' "Run .\\install.ps1 -Cli, -Skill, or -All." > "${bundle}/README.txt"
    (cd "${WORK_DIR}" && zip -qr "${OUTPUT_DIR}/${archive}" "$(basename "${bundle}")")
  fi
  [ -s "${OUTPUT_DIR}/${archive}" ] || {
    printf '%s\n' "archive was not created: ${archive}" >&2
    exit 1
  }
}

create_bundle darwin-amd64 fastmoss-darwin-amd64 install.sh "fastmoss-v${VERSION}-darwin-amd64.tar.gz"
create_bundle darwin-arm64 fastmoss-darwin-arm64 install.sh "fastmoss-v${VERSION}-darwin-arm64.tar.gz"
create_bundle linux-amd64 fastmoss-linux-amd64 install.sh "fastmoss-v${VERSION}-linux-amd64.tar.gz"
create_bundle linux-arm64 fastmoss-linux-arm64 install.sh "fastmoss-v${VERSION}-linux-arm64.tar.gz"
create_bundle windows-amd64 fastmoss-windows-amd64.exe install.ps1 "fastmoss-v${VERSION}-windows-amd64.zip"
```

设置可执行权限，并在 `release-packages.test.js` 中增加 Unix-only archive 测试：`process.platform === "win32"` 时使用 `test.skip`，其他平台执行脚本后断言恰好生成四个 `.tar.gz` 和一个 `.zip`；使用 `tar -tzf`/`unzip -l` 检查每个归档只含对应平台资产、Skill、marker、checksum、README 和对应安装器。Windows runner 仍运行包内容、npm 隔离安装和 PowerShell 安装测试，归档生成只由 Ubuntu `build-release` job 执行一次。

```bash
chmod +x templates/public-release-repo/scripts/create_release_archives.sh
```

- [ ] **步骤 5：添加公开仓库 npm scripts 与忽略项**

新建 `templates/public-release-repo/package.json`：

```json
{
  "name": "fastmoss-public-release-workspace",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "test": "node scripts/run-tests.js",
    "test:integration": "node test/npm-install.integration.js",
    "pack:release": "node scripts/pack-release.js",
    "archive:release": "bash scripts/create_release_archives.sh"
  },
  "devDependencies": {
    "verdaccio": "6.8.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

将 `templates/public-release-repo/.gitignore` 设为：

```gitignore
.DS_Store
node_modules/
dist/
```

生成 lockfile：

```bash
cd templates/public-release-repo
npm install --package-lock-only --ignore-scripts
```

预期：`package-lock.json` 固定 `verdaccio@6.8.0`，不创建需要提交的 `node_modules/`。

- [ ] **步骤 6：让上游 staging 测试覆盖新公开模板**

在 `scripts/stage_public_release_repo_test.js` 的 staging 结构测试中追加：

```js
for (const file of [
  "package.json",
  "package-lock.json",
  "scripts/run-tests.js",
  "scripts/pack-release.js",
  "scripts/create_release_archives.sh",
  "test/release-packages.test.js",
]) {
  assert.equal(fs.existsSync(path.join(outputDir, file)), true, file);
}
```

- [ ] **步骤 7：生成 fixture staging 并运行公开测试**

运行：

```bash
node scripts/stage_public_release_repo_test.js
node scripts/stage_public_release_repo.js \
  "$(node -p "require('./packaging/npm/fastmoss/package.json').version")" \
  "$(mktemp -d)/public-release-repo" \
  "$(pwd)/dist"
```

第二条命令此时依赖 `dist/github-release` 中已有且 checksum 正确的构建产物；若当前产物陈旧，先执行：

```bash
VERSION="$(node -p "require('./packaging/npm/fastmoss/package.json').version")" \
  ./scripts/build_cli.sh prod
```

并按任务 8 中的 checksum 命令生成 `dist/github-release/SHA256SUMS`。把输出目录保存到 `STAGING` 后执行：

```bash
(
  cd "${STAGING}"
  npm ci
  npm test
  npm run pack:release
  npm run archive:release
)
```

预期：包测试通过，`dist/publish/npm/manifest.json` 有 7 个有序条目，GitHub 输出有 5 个归档。

- [ ] **步骤 8：提交公开打包与归档流水线**

```bash
git add templates/public-release-repo/.gitignore \
  templates/public-release-repo/package.json \
  templates/public-release-repo/package-lock.json \
  templates/public-release-repo/scripts \
  templates/public-release-repo/test/release-packages.test.js \
  scripts/stage_public_release_repo_test.js
git commit -m "build: package npm releases and GitHub offline archives"
```

## 任务 7：使用隔离 npm registry 验证完全不依赖 GitHub

**仓库：** `fastmoss-mcp`

**文件：**
- 新建：`templates/public-release-repo/test/npm-install.integration.js`
- 修改：`templates/public-release-repo/test/release-packages.test.js`

- [ ] **步骤 1：先写隔离 registry 集成脚本**

新建 `templates/public-release-repo/test/npm-install.integration.js`。脚本必须只连接 localhost，不配置 uplink，并按以下结构实现：

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const mainPackage = require("../fastmoss/package.json");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");

function run(command, args, { env = process.env, cwd = repoRoot } = {}) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result;
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForRegistry(url, child) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Verdaccio exited before startup");
    try {
      const response = await fetch(`${url}-/ping`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Verdaccio did not start within 10 seconds");
}
```

主流程先创建无 uplink 的 Verdaccio 配置：

```js
const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-registry-"));
const port = await freePort();
const registryURL = `http://127.0.0.1:${port}/`;
const configPath = path.join(tempRoot, "verdaccio.yaml");
const npmrcPath = path.join(tempRoot, ".npmrc");
const config = [
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
await fs.promises.writeFile(configPath, config);

const verdaccioBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "verdaccio.cmd" : "verdaccio",
);
const verdaccio = spawn(verdaccioBin, ["--config", configPath, "--listen", `127.0.0.1:${port}`], {
  cwd: repoRoot,
  stdio: ["ignore", "pipe", "pipe"],
});
```

注册用户并写临时 npmrc：

```js
await waitForRegistry(registryURL, verdaccio);
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
await fs.promises.writeFile(npmrcPath, [
  `registry=${registryURL}`,
  `@fastmoss:registry=${registryURL}`,
  `${registryHost}:_authToken=${token}`,
  "always-auth=true",
  "",
].join("\n"));

const isolatedEnv = {
  ...process.env,
  NPM_CONFIG_USERCONFIG: npmrcPath,
  npm_config_registry: registryURL,
  HTTP_PROXY: "http://127.0.0.1:9",
  HTTPS_PROXY: "http://127.0.0.1:9",
  http_proxy: "http://127.0.0.1:9",
  https_proxy: "http://127.0.0.1:9",
  ALL_PROXY: "http://127.0.0.1:9",
  all_proxy: "http://127.0.0.1:9",
  NO_PROXY: "127.0.0.1,localhost",
  no_proxy: "127.0.0.1,localhost",
};
```

发布顺序必须与正式 workflow 相同：

```js
for (const target of Object.values(PLATFORM_TARGETS)) {
  run("npm", ["publish", `platform-packages/${target.packageDir}`, "--access", "public"], {
    env: isolatedEnv,
  });
}
run("npm", ["publish", "fastmoss", "--access", "public"], { env: isolatedEnv });
run("npm", ["publish", "fastmoss-skill", "--access", "public"], { env: isolatedEnv });
```

真实安装断言固定为：

```js
const cliHome = path.join(tempRoot, "cli-home");
const cliPrefix = path.join(tempRoot, "cli-prefix");
run("npm", ["install", "-g", "@fastmoss/cli@latest"], {
  env: {
    ...isolatedEnv,
    HOME: cliHome,
    USERPROFILE: cliHome,
    npm_config_prefix: cliPrefix,
  },
});
const fastmossCommand = process.platform === "win32"
  ? path.join(cliPrefix, "fastmoss.cmd")
  : path.join(cliPrefix, "bin", "fastmoss");
const versionResult = run(fastmossCommand, ["--version"], { env: isolatedEnv });
assert.equal(versionResult.stdout.trim(), mainPackage.version);
const helpResult = run(fastmossCommand, ["help"], { env: isolatedEnv });
assert.match(helpResult.stdout, /fastmoss|Usage|Commands/i);
for (const directory of [".codex", ".claude", ".agents"]) {
  assert.equal(fs.existsSync(path.join(cliHome, directory, "skills")), false);
}

const skillHome = path.join(tempRoot, "skill-home");
const skillPrefix = path.join(tempRoot, "skill-prefix");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const skillResult = run(npxCommand, ["-y", "@fastmoss/skill@latest"], {
  env: {
    ...isolatedEnv,
    HOME: skillHome,
    USERPROFILE: skillHome,
    npm_config_prefix: skillPrefix,
  },
});
for (const directory of [".codex", ".claude", ".agents"]) {
  assert.equal(
    fs.existsSync(path.join(
      skillHome,
      directory,
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

最后使用 `try/finally`：向 Verdaccio 发送 `SIGTERM`，等待退出，删除临时目录。不得吞掉 Verdaccio 的 stderr；失败时将日志附加到抛出的错误。

- [ ] **步骤 2：增加 npm 包静态网络回归断言**

在 `release-packages.test.js` 中递归扫描 `fastmoss/package.json`、`fastmoss/bin`、`fastmoss/lib`、`fastmoss-skill/package.json`、`fastmoss-skill/bin` 和 `fastmoss-skill/lib`，拒绝：

```js
const forbidden = [
  "github.com/FastMoss/cli/releases/download",
  "node:http",
  "node:https",
  "FASTMOSS_DOWNLOAD_BASE_URL",
  "FASTMOSS_CACHE_DIR",
  "FASTMOSS_SKIP_DOWNLOAD",
  "postinstall",
];
```

测试文件本身不在扫描范围内；README 中介绍 GitHub clone 的 URL 是允许的。

- [ ] **步骤 3：生成完整 staging 并运行 npm 隔离测试**

在任务 8 完成前可通过当前版本和手工构建 fixture 先验证脚本。完整命令为：

```bash
VERSION="$(node -p "require('./packaging/npm/fastmoss/package.json').version")"
VERSION="${VERSION}" ./scripts/build_cli.sh prod

(
  cd dist/github-release
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 fastmoss-darwin-amd64 fastmoss-darwin-arm64 \
      fastmoss-linux-amd64 fastmoss-linux-arm64 fastmoss-windows-amd64.exe \
      > SHA256SUMS
  else
    sha256sum fastmoss-darwin-amd64 fastmoss-darwin-arm64 \
      fastmoss-linux-amd64 fastmoss-linux-arm64 fastmoss-windows-amd64.exe \
      > SHA256SUMS
  fi
)

STAGING="$(mktemp -d)/public-release-repo"
node scripts/stage_public_release_repo.js "${VERSION}" "${STAGING}" "$(pwd)/dist"
(
  cd "${STAGING}"
  npm ci
  npm test
  npm run test:integration
)
```

预期：CLI 和 Skill 两条安装路径均只访问本地 registry；CLI 不写 Skill，Skill 不写 CLI，并且 `fastmoss --version` 与 `fastmoss help` 都成功。

- [ ] **步骤 4：提交隔离 npm 验证**

```bash
git add templates/public-release-repo/test/npm-install.integration.js \
  templates/public-release-repo/test/release-packages.test.js
git commit -m "test: verify npm installs without GitHub access"
```

## 任务 8：实现原子 staging 准备脚本并删除旧入口

**仓库：** `fastmoss-mcp`

**文件：**
- 修改：`scripts/build_cli.sh`
- 修改：`scripts/build_cli_layout_test.sh`
- 新建：`scripts/prepare_cli_release.sh`
- 新建：`scripts/prepare_cli_release_test.sh`
- 删除：`scripts/prepare_npm_release.sh`
- 删除：`scripts/prepare_npm_release_test.sh`
- 删除：`scripts/export_public_release_repo.sh`
- 删除：`scripts/export_public_release_repo_test.sh`

- [ ] **步骤 1：先扩展构建布局测试，确保 build 脚本职责单一**

修改 `scripts/build_cli_layout_test.sh`，保留现有五个平台断言，并新增：

```bash
assert_missing "${TMP_DIR}/prod-dist/github-release/SHA256SUMS"
assert_missing "${TMP_DIR}/prod-dist/public-release-repo"
```

这明确 `build_cli.sh` 只编译和复制二进制，不更新 npm manifest、不复制 Skill、不渲染 README、不生成 staging。

- [ ] **步骤 2：让 build 脚本拒绝缺失的发布版本**

在 `scripts/build_cli.sh` 中保持 test 构建允许默认 `dev`，但 prod 模式增加：

```bash
if [[ "${ENVIRONMENT}" == "prod" && -z "${VERSION:-}" ]]; then
  echo "VERSION is required for prod builds" >&2
  exit 1
fi

VERSION_VALUE="${VERSION:-dev}"
```

在布局测试调用 prod 时使用 `VERSION=1.2.3`，并在测试前加入一次无 `VERSION` 调用，断言非零且输出 `VERSION is required`。

- [ ] **步骤 3：先写 prepare 脚本失败测试**

新建 `scripts/prepare_cli_release_test.sh`。该测试建立最小 fake root，fixture build script 生成五个小文件，fixture renderer/stager 使用真实上游脚本或复制当前脚本；测试至少覆盖：

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_PATH="${ROOT_DIR}/scripts/prepare_cli_release.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

assert_contains() {
  local haystack="$1"
  local needle="$2"
  [[ "${haystack}" == *"${needle}"* ]] || {
    echo "expected output to contain: ${needle}" >&2
    echo "actual output: ${haystack}" >&2
    exit 1
  }
}

output="$(${SCRIPT_PATH} 2>&1 || true)"
assert_contains "${output}" "usage: ./scripts/prepare_cli_release.sh <version>"

for invalid in "1" "v1.2.3" "01.2.3" "1.2"; do
  if FASTMOSS_ROOT_DIR="${TMP_DIR}/unused" "${SCRIPT_PATH}" "${invalid}" >/dev/null 2>&1; then
    echo "expected invalid semver to fail: ${invalid}" >&2
    exit 1
  fi
done
```

fixture 成功场景断言：

- CLI package version 与五个 optional dependency 值全部更新为 `1.2.3`。
- build script 接收到 `VERSION=1.2.3`、`OUTPUT_DIR=<temporary-build-dir>` 和参数 `prod`。
- staging marker 为 `{ "schemaVersion": 1, "version": "1.2.3" }`。
- 目标 `dist/public-release-repo` 在全部验证结束后才出现。
- 输出包含 `Prepared FastMoss CLI and Skill release staging for 1.2.3`。

fixture 失败场景预先写入 `dist/public-release-repo/keep.txt`，令 stager 或验证命令失败，随后断言 `keep.txt` 仍存在且内容未变。再令 checksum 错误、README 占位符残留、Skill npm package 缺失分别失败。

- [ ] **步骤 4：运行 prepare 测试并确认失败**

运行：

```bash
bash scripts/prepare_cli_release_test.sh
```

预期：失败，因为 `prepare_cli_release.sh` 尚不存在。

- [ ] **步骤 5：实现统一版本更新与 checksum 辅助函数**

新建 `scripts/prepare_cli_release.sh`，开头固定为：

```bash
#!/usr/bin/env bash
set -euo pipefail

VERSION_VALUE="${1:-}"
if [[ -z "${VERSION_VALUE}" ]]; then
  echo "usage: ./scripts/prepare_cli_release.sh <version>" >&2
  exit 1
fi
if [[ ! "${VERSION_VALUE}" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]]; then
  echo "invalid semver: ${VERSION_VALUE}" >&2
  exit 1
fi

ROOT_DIR="${FASTMOSS_ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
CLI_PACKAGE="${ROOT_DIR}/packaging/npm/fastmoss/package.json"
BUILD_SCRIPT="${ROOT_DIR}/scripts/build_cli.sh"
STAGE_SCRIPT="${ROOT_DIR}/scripts/stage_public_release_repo.js"
OUTPUT_ROOT="${ROOT_DIR}/dist"
FINAL_STAGE="${OUTPUT_ROOT}/public-release-repo"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/fastmoss-release.XXXXXX")"
BUILD_DIR="${WORK_DIR}/build"
TEMP_STAGE="${WORK_DIR}/public-release-repo"
trap 'rm -rf "${WORK_DIR}"' EXIT
```

使用 Node 结构化更新 manifest：

```bash
node - "${CLI_PACKAGE}" "${VERSION_VALUE}" <<'NODE'
const fs = require("node:fs");
const filePath = process.argv[2];
const version = process.argv[3];
const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
manifest.version = version;
manifest.optionalDependencies = Object.fromEntries(
  Object.keys(manifest.optionalDependencies || {}).map((name) => [name, version]),
);
if (Object.keys(manifest.optionalDependencies).length !== 5) {
  throw new Error("CLI package must declare five optional platform dependencies");
}
fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
```

checksum 函数固定排序：

```bash
write_checksums() {
  local release_dir="$1"
  local assets=(
    fastmoss-darwin-amd64
    fastmoss-darwin-arm64
    fastmoss-linux-amd64
    fastmoss-linux-arm64
    fastmoss-windows-amd64.exe
  )
  local asset
  for asset in "${assets[@]}"; do
    [[ -f "${release_dir}/${asset}" ]] || {
      echo "missing release asset: ${release_dir}/${asset}" >&2
      exit 1
    }
  done
  (
    cd "${release_dir}"
    : > SHA256SUMS
    for asset in "${assets[@]}"; do
      if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "${asset}" >> SHA256SUMS
      elif command -v sha256sum >/dev/null 2>&1; then
        sha256sum "${asset}" >> SHA256SUMS
      else
        echo "missing checksum tool: need shasum or sha256sum" >&2
        exit 1
      fi
    done
  )
}
```

- [ ] **步骤 6：实现构建、验证和最终原子替换**

脚本后半段固定按此顺序执行：

```bash
VERSION="${VERSION_VALUE}" OUTPUT_DIR="${BUILD_DIR}" "${BUILD_SCRIPT}" prod
write_checksums "${BUILD_DIR}/github-release"
node "${STAGE_SCRIPT}" "${VERSION_VALUE}" "${TEMP_STAGE}" "${BUILD_DIR}"

(
  cd "${TEMP_STAGE}/fastmoss"
  npm test
  npm pack --dry-run --json >/dev/null
)
node --test "${TEMP_STAGE}/fastmoss-skill/test/"*.test.js
(
  cd "${TEMP_STAGE}"
  npm ci
  npm test
  npm run test:integration
  npm run pack:release
  npm run archive:release
)

node - "${TEMP_STAGE}" "${VERSION_VALUE}" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[2];
const version = process.argv[3];
const marker = JSON.parse(fs.readFileSync(path.join(root, ".fastmoss-release.json"), "utf8"));
const cli = JSON.parse(fs.readFileSync(path.join(root, "fastmoss", "package.json"), "utf8"));
const skill = JSON.parse(fs.readFileSync(path.join(root, "fastmoss-skill", "package.json"), "utf8"));
if (marker.schemaVersion !== 1 || marker.version !== version) throw new Error("invalid release marker");
if (cli.version !== version || skill.version !== version) throw new Error("package version mismatch");
for (const file of ["README.md", "README.zh-CN.md", "fastmoss/README.md", "fastmoss-skill/README.md"]) {
  if (fs.readFileSync(path.join(root, file), "utf8").includes("{{FASTMOSS_INSTALLATION}}")) {
    throw new Error(`README placeholder remains: ${file}`);
  }
}
NODE

rm -rf "${TEMP_STAGE}/node_modules" "${TEMP_STAGE}/dist"
mkdir -p "${OUTPUT_ROOT}"
NEXT_STAGE="${OUTPUT_ROOT}/.public-release-repo.next.$$"
OLD_STAGE="${OUTPUT_ROOT}/.public-release-repo.old.$$"
rm -rf "${NEXT_STAGE}" "${OLD_STAGE}"
mv "${TEMP_STAGE}" "${NEXT_STAGE}"
if [[ -e "${FINAL_STAGE}" ]]; then mv "${FINAL_STAGE}" "${OLD_STAGE}"; fi
if ! mv "${NEXT_STAGE}" "${FINAL_STAGE}"; then
  [[ ! -e "${OLD_STAGE}" ]] || mv "${OLD_STAGE}" "${FINAL_STAGE}"
  exit 1
fi
rm -rf "${OLD_STAGE}"
echo "Prepared FastMoss CLI and Skill release staging for ${VERSION_VALUE}"
echo "Staging: ${FINAL_STAGE}"
```

fixture 必须复制公开 workspace 的 `package.json` 与 `package-lock.json`，因此 prepare 测试和真实准备都使用 `npm ci`。prepare 在写入 marker 前运行隔离 registry 安装测试，确保同步器不会接受未经 npm 实装验证的 staging。

`.fastmoss-release.json` 会先写入临时候选目录，供安装器、离线归档和结构测试读取；候选目录只有在全部测试通过后才会原子替换 `dist/public-release-repo`。prepare 失败时临时候选目录由 trap 清理，旧的正式 staging 与其 marker 保持不变。

- [ ] **步骤 7：运行 prepare 测试和真实准备**

运行：

```bash
bash scripts/build_cli_layout_test.sh
bash scripts/prepare_cli_release_test.sh
./scripts/prepare_cli_release.sh \
  "$(node -p "require('./packaging/npm/fastmoss/package.json').version")"
```

预期：测试通过，真实命令生成完整 `dist/public-release-repo`；失败时旧 staging 不变。

- [ ] **步骤 8：删除被替代的旧脚本和测试**

删除：

```text
scripts/prepare_npm_release.sh
scripts/prepare_npm_release_test.sh
scripts/export_public_release_repo.sh
scripts/export_public_release_repo_test.sh
```

运行：

```bash
rg -n "prepare_npm_release\.sh|export_public_release_repo\.sh" \
  README.md scripts packaging templates skills \
  --glob '!scripts/prepare_cli_release_test.sh'
```

预期：当前仍可能在 `README.md` 中匹配，任务 11 会替换该发布文档；脚本和包源码中不得匹配。

- [ ] **步骤 9：提交新准备流程和旧入口清理**

```bash
git add scripts/build_cli.sh scripts/build_cli_layout_test.sh \
  scripts/prepare_cli_release.sh scripts/prepare_cli_release_test.sh
git add -A scripts/prepare_npm_release.sh scripts/prepare_npm_release_test.sh \
  scripts/export_public_release_repo.sh scripts/export_public_release_repo_test.sh
git commit -m "build: prepare validated public release staging"
```

## 任务 9：将同步脚本收敛为纯 staging 消费者

**仓库：** `fastmoss-mcp`

**文件：**
- 替换：`scripts/sync_public_release_repo.sh`
- 替换：`scripts/sync_public_release_repo_test.sh`

- [ ] **步骤 1：先写 staging-only 同步失败测试**

将 `scripts/sync_public_release_repo_test.sh` 替换为 fixture 测试。基础辅助函数如下：

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_PATH="${ROOT_DIR}/scripts/sync_public_release_repo.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

assert_file() {
  [[ -f "$1" ]] || { echo "expected file: $1" >&2; exit 1; }
}

assert_missing() {
  [[ ! -e "$1" ]] || { echo "expected missing path: $1" >&2; exit 1; }
}

assert_contains() {
  [[ "$1" == *"$2"* ]] || {
    echo "expected output to contain: $2" >&2
    echo "actual output: $1" >&2
    exit 1
  }
}

output="$(${SCRIPT_PATH} 2>&1 || true)"
assert_contains "${output}" "usage: ./scripts/sync_public_release_repo.sh <public-repo-dir>"

FAKE_ROOT="${TMP_DIR}/workspace/fastmoss-mcp"
STAGING="${FAKE_ROOT}/dist/public-release-repo"
PUBLIC_REPO="${TMP_DIR}/workspace/fastmoss-release"
mkdir -p "${STAGING}/fastmoss" "${STAGING}/fastmoss-skill" \
  "${STAGING}/platform-packages/cli-darwin-amd64" \
  "${STAGING}/platform-packages/cli-darwin-arm64" \
  "${STAGING}/platform-packages/cli-linux-amd64" \
  "${STAGING}/platform-packages/cli-linux-arm64" \
  "${STAGING}/platform-packages/cli-windows-amd64" \
  "${STAGING}/skills/fastmoss-cli" \
  "${STAGING}/release-assets" "${STAGING}/.github/workflows" \
  "${PUBLIC_REPO}/.git" "${PUBLIC_REPO}/docs/superpowers" \
  "${PUBLIC_REPO}/stale"

cat > "${STAGING}/.fastmoss-release.json" <<'EOF'
{
  "schemaVersion": 1,
  "version": "1.2.3"
}
EOF
cat > "${STAGING}/fastmoss/package.json" <<'EOF'
{
  "name": "@fastmoss/cli",
  "version": "1.2.3"
}
EOF
cat > "${STAGING}/fastmoss-skill/package.json" <<'EOF'
{
  "name": "@fastmoss/skill",
  "version": "1.2.3"
}
EOF
for package_dir in \
  cli-darwin-amd64 cli-darwin-arm64 cli-linux-amd64 \
  cli-linux-arm64 cli-windows-amd64; do
  cat > "${STAGING}/platform-packages/${package_dir}/package.json" <<'EOF'
{
  "name": "@fastmoss/fixture-platform",
  "version": "1.2.3"
}
EOF
done
printf '# FastMoss\n' > "${STAGING}/README.md"
printf '# FastMoss\n' > "${STAGING}/skills/fastmoss-cli/SKILL.md"
for asset in \
  fastmoss-darwin-amd64 fastmoss-darwin-arm64 fastmoss-linux-amd64 \
  fastmoss-linux-arm64 fastmoss-windows-amd64.exe; do
  printf 'asset\n' > "${STAGING}/release-assets/${asset}"
  printf 'fixture  %s\n' "${asset}" >> "${STAGING}/release-assets/SHA256SUMS"
done
printf 'name: release\n' > "${STAGING}/.github/workflows/release.yml"
printf '[core]\n' > "${PUBLIC_REPO}/.git/config"
printf '# design\n' > "${PUBLIC_REPO}/docs/superpowers/design.md"
printf 'stale\n' > "${PUBLIC_REPO}/stale/file.txt"
```

成功路径：

```bash
output="$(FASTMOSS_ROOT_DIR="${FAKE_ROOT}" "${SCRIPT_PATH}" "${PUBLIC_REPO}" 2>&1)"
assert_contains "${output}" "Synchronized validated public release staging 1.2.3"
assert_file "${PUBLIC_REPO}/.git/config"
assert_file "${PUBLIC_REPO}/docs/superpowers/design.md"
assert_file "${PUBLIC_REPO}/README.md"
assert_file "${PUBLIC_REPO}/fastmoss/package.json"
assert_file "${PUBLIC_REPO}/fastmoss-skill/package.json"
assert_file "${PUBLIC_REPO}/skills/fastmoss-cli/SKILL.md"
assert_missing "${PUBLIC_REPO}/stale/file.txt"
```

再为每个场景创建独立 fixture，并明确断言非零：

```bash
# 缺失 marker。
rm "${STAGING}/.fastmoss-release.json"
output="$(FASTMOSS_ROOT_DIR="${FAKE_ROOT}" "${SCRIPT_PATH}" "${PUBLIC_REPO}" 2>&1 || true)"
assert_contains "${output}" "release marker not found"

# marker 与 CLI package 版本不一致。
# 目标 basename 不是 fastmoss-release。
# 目标没有 .git。
# 目标等于 /。
# 目标等于 FASTMOSS_ROOT_DIR。
# staging 缺少 fastmoss-skill/package.json、skills/fastmoss-cli/SKILL.md
# 或 .github/workflows/release.yml 中任意一项。
```

最后使用 `rg -F` 分别静态扫描脚本，断言不包含 `git commit`、`git tag`、`git push`、`npm publish`、`gh release`、`prepare_cli_release.sh` 或 `stage_public_release_repo.js`。

- [ ] **步骤 2：运行同步测试并确认旧脚本失败**

运行：

```bash
bash scripts/sync_public_release_repo_test.sh
```

预期：失败，因为旧脚本会隐式调用已删除的 export 脚本，也不会保留 `docs/superpowers` 或验证 marker。

- [ ] **步骤 3：实现路径和 staging 结构验证**

将 `scripts/sync_public_release_repo.sh` 替换为：

```bash
#!/usr/bin/env bash
set -euo pipefail

PUBLIC_REPO_DIR="${1:-}"
if [[ -z "${PUBLIC_REPO_DIR}" ]]; then
  echo "usage: ./scripts/sync_public_release_repo.sh <public-repo-dir>" >&2
  exit 1
fi

ROOT_DIR="${FASTMOSS_ROOT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
STAGING_DIR="${ROOT_DIR}/dist/public-release-repo"

absolute_path() {
  node -e 'const path=require("node:path"); console.log(path.resolve(process.argv[1]))' "$1"
}

ROOT_ABS="$(absolute_path "${ROOT_DIR}")"
STAGING_ABS="$(absolute_path "${STAGING_DIR}")"
TARGET_ABS="$(absolute_path "${PUBLIC_REPO_DIR}")"

[[ "${TARGET_ABS}" != "/" ]] || { echo "refusing to sync to /" >&2; exit 1; }
[[ "${TARGET_ABS}" != "${ROOT_ABS}" ]] || {
  echo "refusing to sync over fastmoss-mcp source root" >&2
  exit 1
}
[[ "${TARGET_ABS}" != "${STAGING_ABS}" ]] || {
  echo "refusing to sync staging onto itself" >&2
  exit 1
}
[[ "$(basename "${TARGET_ABS}")" == "fastmoss-release" ]] || {
  echo "public repo target must be named fastmoss-release: ${TARGET_ABS}" >&2
  exit 1
}
[[ -d "${TARGET_ABS}/.git" ]] || {
  echo "public repo .git directory not found: ${TARGET_ABS}/.git" >&2
  exit 1
}
[[ -d "${STAGING_ABS}" ]] || {
  echo "validated staging not found: ${STAGING_ABS}" >&2
  exit 1
}

required=(
  .fastmoss-release.json
  README.md
  fastmoss/package.json
  fastmoss-skill/package.json
  platform-packages/cli-darwin-amd64/package.json
  platform-packages/cli-darwin-arm64/package.json
  platform-packages/cli-linux-amd64/package.json
  platform-packages/cli-linux-arm64/package.json
  platform-packages/cli-windows-amd64/package.json
  skills/fastmoss-cli/SKILL.md
  release-assets/SHA256SUMS
  release-assets/fastmoss-darwin-amd64
  release-assets/fastmoss-darwin-arm64
  release-assets/fastmoss-linux-amd64
  release-assets/fastmoss-linux-arm64
  release-assets/fastmoss-windows-amd64.exe
  .github/workflows/release.yml
)
for relative in "${required[@]}"; do
  [[ -f "${STAGING_ABS}/${relative}" ]] || {
    echo "staging is incomplete: ${relative}" >&2
    exit 1
  }
done

VERSION="$(node - "${STAGING_ABS}" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[2];
const marker = JSON.parse(fs.readFileSync(path.join(root, ".fastmoss-release.json"), "utf8"));
const cli = JSON.parse(fs.readFileSync(path.join(root, "fastmoss", "package.json"), "utf8"));
const skill = JSON.parse(fs.readFileSync(path.join(root, "fastmoss-skill", "package.json"), "utf8"));
const platformDirs = [
  "cli-darwin-amd64",
  "cli-darwin-arm64",
  "cli-linux-amd64",
  "cli-linux-arm64",
  "cli-windows-amd64",
];
if (marker.schemaVersion !== 1) throw new Error("unsupported release marker schema");
if (!marker.version || marker.version !== cli.version || marker.version !== skill.version) {
  throw new Error("release marker and package versions do not match");
}
for (const directory of platformDirs) {
  const platform = JSON.parse(fs.readFileSync(
    path.join(root, "platform-packages", directory, "package.json"),
    "utf8",
  ));
  if (platform.version !== marker.version) {
    throw new Error(`platform package version mismatch: ${directory}`);
  }
}
process.stdout.write(marker.version);
NODE
)"
```

- [ ] **步骤 4：实现只保留 `.git` 和 `docs/superpowers` 的同步**

继续加入：

```bash
PRESERVE_DIR="$(mktemp -d)"
trap 'rm -rf "${PRESERVE_DIR}"' EXIT

if [[ -d "${TARGET_ABS}/docs/superpowers" ]]; then
  mkdir -p "${PRESERVE_DIR}/docs"
  cp -R "${TARGET_ABS}/docs/superpowers" "${PRESERVE_DIR}/docs/superpowers"
fi

find "${TARGET_ABS}" -mindepth 1 -maxdepth 1 \
  ! -name '.git' \
  -exec rm -rf {} +

cp -R "${STAGING_ABS}/." "${TARGET_ABS}/"

if [[ -d "${PRESERVE_DIR}/docs/superpowers" ]]; then
  mkdir -p "${TARGET_ABS}/docs"
  rm -rf "${TARGET_ABS}/docs/superpowers"
  cp -R "${PRESERVE_DIR}/docs/superpowers" "${TARGET_ABS}/docs/superpowers"
fi

echo "Synchronized validated public release staging ${VERSION} to ${TARGET_ABS}"
```

同步脚本不负责准备 staging，也不执行任何 git 或远程命令。实现后设置可执行权限：

```bash
chmod +x scripts/sync_public_release_repo.sh
```

- [ ] **步骤 5：运行同步测试**

运行：

```bash
bash scripts/sync_public_release_repo_test.sh
```

预期：全部通过；成功 fixture 只保留 `.git`、原有 `docs/superpowers` 和 staging 内容。

- [ ] **步骤 6：提交纯同步器**

```bash
git add scripts/sync_public_release_repo.sh scripts/sync_public_release_repo_test.sh
git commit -m "build: sync only validated public release staging"
```

## 任务 10：替换 tag 发布 workflow

**仓库：** `fastmoss-mcp`

**文件：**
- 替换：`templates/public-release-repo/.github/workflows/release.yml`
- 新建：`templates/public-release-repo/test/release-workflow.test.js`

- [ ] **步骤 1：先写 workflow 失败测试**

新建 `templates/public-release-repo/test/release-workflow.test.js`：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflowPath = path.join(__dirname, "..", ".github", "workflows", "release.yml");

test("release workflow validates all operating systems before publishing", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  for (const required of [
    "ubuntu-latest",
    "macos-latest",
    "windows-latest",
    "npm ci",
    "npm test",
    "npm run test:integration",
    "test/install-powershell.ps1",
  ]) assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("release build creates npm tarballs and GitHub archives once", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const buildJob = workflow.slice(
    workflow.indexOf("  build-release:"),
    workflow.indexOf("  publish-npm:"),
  );
  assert.match(buildJob, /npm run pack:release/);
  assert.match(buildJob, /npm run archive:release/);
});

test("npm publish consumes the ordered seven-package manifest", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /manifest\.json/);
  assert.match(workflow, /entry\.kind/);
  assert.match(workflow, /npm["']?,\s*\["publish"/);
  assert.match(workflow, /NODE_AUTH_TOKEN/);
});

test("npm and GitHub publish jobs share build output without depending on each other", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const npmJob = workflow.slice(workflow.indexOf("  publish-npm:"), workflow.indexOf("  publish-github:"));
  const githubJob = workflow.slice(workflow.indexOf("  publish-github:"));
  assert.match(npmJob, /needs: build-release/);
  assert.match(githubJob, /needs: build-release/);
  assert.doesNotMatch(npmJob, /needs: publish-github/);
  assert.doesNotMatch(githubJob, /needs: publish-npm/);
  assert.match(githubJob, /release-assets\/\*/);
  assert.match(githubJob, /dist\/publish\/github\/\*/);
});
```

- [ ] **步骤 2：运行 workflow 测试并确认失败**

在一个已生成的 staging 中运行：

```bash
node --test test/release-workflow.test.js
```

预期：旧 workflow 只有一个 npm 包、让 npm 依赖 GitHub Release，也没有三平台隔离测试，因此失败。

- [ ] **步骤 3：实现验证与构建 jobs**

将 workflow 开头替换为：

```yaml
name: release

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:
    inputs:
      release_tag:
        description: Existing v-prefixed release tag
        required: true
        type: string

permissions:
  contents: write

env:
  RELEASE_TAG: ${{ github.event_name == 'workflow_dispatch' && inputs.release_tag || github.ref_name }}

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - name: Checkout release tag
        uses: actions/checkout@v4
        with:
          ref: ${{ env.RELEASE_TAG }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install test dependencies
        run: npm ci

      - name: Run package and installer tests
        run: npm test

      - name: Run isolated npm installation test
        run: npm run test:integration

      - name: Run Windows installer test
        if: runner.os == 'Windows'
        shell: pwsh
        run: ./test/install-powershell.ps1

  build-release:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout release tag
        uses: actions/checkout@v4
        with:
          ref: ${{ env.RELEASE_TAG }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Verify tag and package versions
        shell: bash
        run: |
          [[ "${RELEASE_TAG}" == v* ]] || { echo "release tag must start with v" >&2; exit 1; }
          VERSION="${RELEASE_TAG#v}"
          CLI_VERSION="$(node -p "require('./fastmoss/package.json').version")"
          SKILL_VERSION="$(node -p "require('./fastmoss-skill/package.json').version")"
          MARKER_VERSION="$(node -p "require('./.fastmoss-release.json').version")"
          [[ "${VERSION}" == "${CLI_VERSION}" && "${VERSION}" == "${SKILL_VERSION}" && "${VERSION}" == "${MARKER_VERSION}" ]] || {
            echo "tag, marker, CLI, and Skill versions must match" >&2
            exit 1
          }

      - name: Install packaging dependencies
        run: npm ci

      - name: Build npm tarballs and GitHub archives
        run: |
          npm run pack:release
          npm run archive:release

      - name: Upload validated publish artifacts
        uses: actions/upload-artifact@v4
        with:
          name: fastmoss-release-${{ env.RELEASE_TAG }}
          path: dist/publish
          if-no-files-found: error
```

- [ ] **步骤 4：实现严格有序的 npm 发布 job**

追加：

```yaml
  publish-npm:
    needs: build-release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout release tag
        uses: actions/checkout@v4
        with:
          ref: ${{ env.RELEASE_TAG }}

      - name: Setup Node.js for npmjs
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org

      - name: Download validated publish artifacts
        uses: actions/download-artifact@v4
        with:
          name: fastmoss-release-${{ env.RELEASE_TAG }}
          path: dist/publish

      - name: Publish platform packages, CLI, then Skill
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          node - <<'NODE'
          const { spawnSync } = require("node:child_process");
          const manifest = require("./dist/publish/npm/manifest.json");
          const expectedKinds = [
            "platform", "platform", "platform", "platform", "platform",
            "cli", "skill",
          ];
          if (manifest.length !== expectedKinds.length ||
              manifest.some((entry, index) => entry.kind !== expectedKinds[index])) {
            throw new Error("unexpected npm publish order");
          }
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

- [ ] **步骤 5：实现独立 GitHub Release job**

追加：

```yaml
  publish-github:
    needs: build-release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout release tag
        uses: actions/checkout@v4
        with:
          ref: ${{ env.RELEASE_TAG }}

      - name: Download validated publish artifacts
        uses: actions/download-artifact@v4
        with:
          name: fastmoss-release-${{ env.RELEASE_TAG }}
          path: dist/publish

      - name: Publish raw binaries and offline bundles
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ env.RELEASE_TAG }}
          files: |
            release-assets/*
            dist/publish/github/*
```

`publish-npm` 与 `publish-github` 都只依赖 `build-release`，符合两个渠道不互相依赖的约束。npm job 内部严格先发布五个平台包，再发布 `@fastmoss/cli`，最后发布 `@fastmoss/skill`。

- [ ] **步骤 6：运行 workflow 与完整公开测试**

重新生成 staging 后运行：

```bash
npm ci
npm test
npm run test:integration
npm run pack:release
npm run archive:release
git diff --check
```

预期：全部通过；workflow test 明确拒绝旧的 `publish-npm -> publish-release` 依赖关系。

- [ ] **步骤 7：提交 release workflow 模板**

```bash
git add templates/public-release-repo/.github/workflows/release.yml \
  templates/public-release-repo/test/release-workflow.test.js
git commit -m "ci: publish independent npm and GitHub releases"
```

## 任务 11：更新 canonical Skill 与上游发布文档

**仓库：** `fastmoss-mcp`

**文件：**
- 修改：`skills/fastmoss-cli/SKILL.md`
- 修改：`skills/fastmoss-cli/references/cli.md`
- 修改：`README.md`
- 新建：`scripts/release_documentation_test.sh`

- [ ] **步骤 1：调用 Skill 编写约束**

编辑已部署的 Agent Skill 前，先调用 `skill-creator` 和 `superpowers:writing-skills`。本任务只改变 CLI 安装/升级引导，不改工具选择、参数、认证或 MCP 调用工作流。

- [ ] **步骤 2：先写发布文档失败测试**

新建 `scripts/release_documentation_test.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
README="${ROOT_DIR}/README.md"
SKILL="${ROOT_DIR}/skills/fastmoss-cli/SKILL.md"
CLI_REFERENCE="${ROOT_DIR}/skills/fastmoss-cli/references/cli.md"

required_readme=(
  "./scripts/prepare_cli_release.sh X.Y.Z"
  "find dist/public-release-repo -maxdepth 3 -type f | sort"
  "npm pack --dry-run ./dist/public-release-repo/fastmoss"
  "npm pack --dry-run ./dist/public-release-repo/fastmoss-skill"
  "./scripts/sync_public_release_repo.sh ../fastmoss-release"
  "npm ci"
  "npm test"
  "npm run test:integration"
  "git commit -m \"release: vX.Y.Z\""
  "git tag vX.Y.Z"
  "git push origin vX.Y.Z"
  "npm view @fastmoss/cli version"
  "npm view @fastmoss/skill version"
  "npm install -g @fastmoss/cli@latest"
  "npx -y @fastmoss/skill@latest"
)

for command in "${required_readme[@]}"; do
  rg -F --quiet "${command}" "${README}" || {
    echo "README is missing release command: ${command}" >&2
    exit 1
  }
done

for file in "${SKILL}" "${CLI_REFERENCE}"; do
  rg -F --quiet "npm install -g @fastmoss/cli@latest" "${file}" || {
    echo "Skill CLI install command is missing: ${file}" >&2
    exit 1
  }
  if rg -n "npx skills add FastMoss/cli|fastmoss-install-skill|--allow-scripts=@fastmoss/cli" "${file}"; then
    echo "obsolete Skill installation guidance remains: ${file}" >&2
    exit 1
  fi
done

if rg -n "prepare_npm_release\.sh|export_public_release_repo\.sh|FASTMOSS_DOWNLOAD_BASE_URL|FASTMOSS_CACHE_DIR|FASTMOSS_SKIP_DOWNLOAD" \
  "${README}" "${SKILL}" "${CLI_REFERENCE}"; then
  echo "obsolete release or download guidance remains" >&2
  exit 1
fi
```

设置可执行权限：

```bash
chmod +x scripts/release_documentation_test.sh
```

- [ ] **步骤 3：运行文档测试并确认失败**

运行：

```bash
bash scripts/release_documentation_test.sh
```

预期：失败，因为 `README.md` 仍记录旧 `prepare_npm_release.sh`、旧下载器和 `npx skills add` 流程。

- [ ] **步骤 4：更新 canonical Skill 的 CLI 缺失引导**

在 `skills/fastmoss-cli/SKILL.md` 的 Startup checks 中，将安装与升级部分替换为：

````markdown
If the FastMoss CLI is not installed, the command is not found, or the user
asks to update the CLI, install the current npm release:

```bash
npm install -g @fastmoss/cli@latest
```

This installs only the CLI. Do not install or update the Agent Skill unless the
user separately asks for it.
````

在 `skills/fastmoss-cli/references/cli.md` 的 Install 段使用同一条命令，并明确：CLI npm 包不安装 Agent Skill；Skill 自身已经安装时，CLI 缺失只需安装 CLI。

- [ ] **步骤 5：重写 `fastmoss-mcp/README.md` 的发布章节**

保留 MCP Server、CLI 使用说明与工具开发内容；把当前 `npm / npx 发布目录`、`Agent Skill 发布目录` 和 `GitHub Release + npm 发布流程` 替换为以下章节结构：

1. `### CLI、Skill 与公开仓库源码边界`
2. `### 更新 FastMoss CLI Skill 工具目录`
3. `### 发布前完整测试`
4. `### 生成并检查公开 staging`
5. `### 同步到 fastmoss-release`
6. `### 在公开仓库提交并触发 tag 发布`
7. `### 发布顺序与 GitHub Actions 密钥`
8. `### 发布后验证`

发布前完整测试代码块必须逐行包含：

```bash
go test ./...
bash scripts/build_cli_layout_test.sh
bash scripts/generate_fastmoss_cli_skill_tools_test.sh
node scripts/render_release_readmes_test.js
node scripts/stage_public_release_repo_test.js
bash scripts/prepare_cli_release_test.sh
bash scripts/sync_public_release_repo_test.sh
bash scripts/release_documentation_test.sh

cd packaging/npm/fastmoss
npm test
cd ../../..

node --test packaging/npm/fastmoss-skill/test/*.test.js
```

生成与检查 staging 代码块必须逐行包含：

```bash
./scripts/prepare_cli_release.sh X.Y.Z
find dist/public-release-repo -maxdepth 3 -type f | sort
npm pack --dry-run ./dist/public-release-repo/fastmoss
npm pack --dry-run ./dist/public-release-repo/fastmoss-skill
```

在说明中明确 `prepare_cli_release.sh` 会更新上游 CLI manifest 版本和五个精确 optional dependency 版本，生成 Skill/platform manifests，构建并验证 staging；失败不破坏上一次 staging，并且不执行 git 或发布。

同步代码块必须为：

```bash
./scripts/sync_public_release_repo.sh ../fastmoss-release
```

说明同步器只消费 `dist/public-release-repo`，验证 marker 和包版本，保留 `.git` 与 `docs/superpowers`，不执行 commit、tag、push 或 publish。

公开仓库验证、提交和 tag 代码块必须为：

```bash
cd ../fastmoss-release
npm ci
npm test
npm run test:integration
npm run pack:release
npm run archive:release

git status --short
git add .
git commit -m "release: vX.Y.Z"
git push origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

在发布说明中写清 tag workflow 顺序：五个平台包 -> `@fastmoss/cli` -> `@fastmoss/skill`；GitHub raw binaries 与五个平台离线包由独立 job 发布，不依赖 npm job。说明仓库需要 `NPM_TOKEN`，workflow 使用 `contents: write` 创建 GitHub Release。

发布后验证代码块必须为：

```bash
npm view @fastmoss/cli version
npm view @fastmoss/skill version
npm install -g @fastmoss/cli@latest
fastmoss --version
npx -y @fastmoss/skill@latest
```

在迁移说明中列出已移除行为：`fastmoss-install-skill`、`npx skills add FastMoss/cli`、`postinstall`、首次运行下载、`FASTMOSS_DOWNLOAD_BASE_URL`、`FASTMOSS_CACHE_DIR` 和 `FASTMOSS_SKIP_DOWNLOAD`。说明 `~/.fastmoss/bin` 旧缓存可手工删除，但新版不读取它。

- [ ] **步骤 6：运行文档、Skill 与工具生成测试**

运行：

```bash
bash scripts/release_documentation_test.sh
bash scripts/generate_fastmoss_cli_skill_tools_test.sh
rg -n "npx skills add FastMoss/cli|fastmoss-install-skill|--allow-scripts=@fastmoss/cli|prepare_npm_release\.sh|export_public_release_repo\.sh" \
  README.md skills/fastmoss-cli
```

预期：前两条通过；最后一条没有匹配。工具目录内容与本任务前保持一致，只有安装说明发生变化。

- [ ] **步骤 7：提交上游发布文档和 Skill 引导**

```bash
git add README.md skills/fastmoss-cli/SKILL.md \
  skills/fastmoss-cli/references/cli.md \
  scripts/release_documentation_test.sh
git commit -m "docs: document CLI and Skill release workflow"
```

## 任务 12：完整验证上游并同步公开仓库

**仓库：** `fastmoss-mcp`，随后 `fastmoss-release`

**文件：**
- 验证：任务 1 至任务 11 的全部上游文件
- 生成并同步：`dist/public-release-repo/` -> `fastmoss-release/`
- 保留：`fastmoss-release/docs/superpowers/`

- [ ] **步骤 1：在 `fastmoss-mcp` 运行完整上游测试**

运行：

```bash
go test ./...
bash scripts/build_cli_layout_test.sh
bash scripts/generate_fastmoss_cli_skill_tools_test.sh
node scripts/render_release_readmes_test.js
node scripts/stage_public_release_repo_test.js
bash scripts/prepare_cli_release_test.sh
bash scripts/sync_public_release_repo_test.sh
bash scripts/release_documentation_test.sh

(
  cd packaging/npm/fastmoss
  npm test
  npm pack --dry-run --json
)

node --test packaging/npm/fastmoss-skill/test/*.test.js
```

预期：每条命令以 0 退出。

- [ ] **步骤 2：扫描旧行为和重复 Skill 源码**

运行：

```bash
rg -n "prepare_npm_release\.sh|export_public_release_repo\.sh|fastmoss-install-skill|npx skills add FastMoss/cli|--allow-scripts=@fastmoss/cli|FASTMOSS_DOWNLOAD_BASE_URL|FASTMOSS_CACHE_DIR|FASTMOSS_SKIP_DOWNLOAD|node:http|node:https" \
  README.md scripts packaging/npm templates skills/fastmoss-cli \
  --glob '!**/*test*'

test ! -e packaging/npm/fastmoss/bin/postinstall.js
test ! -e packaging/npm/fastmoss/bin/install-skill.js
test ! -d packaging/npm/fastmoss/skills
test ! -e packaging/npm/fastmoss/.npmignore
test -f skills/fastmoss-cli/SKILL.md
```

预期：`rg` 没有匹配，所有文件存在性断言通过。README 中 GitHub clone URL 允许存在，但不允许 GitHub Release 下载 URL 出现在 npm runtime 或旧发布说明中。

- [ ] **步骤 3：生成真实 staging**

由发布负责人选择本次合法版本并设置：

```bash
VERSION=X.Y.Z
./scripts/prepare_cli_release.sh "${VERSION}"
find dist/public-release-repo -maxdepth 3 -type f | sort
```

预期：生成 marker、两个用户 npm 包、五个平台包、canonical Skill、五个平台资产、安装器、测试、workflow 和六份渲染 README；不包含 `node_modules`、`dist` 或 README template。

- [ ] **步骤 4：在 staging 运行公开仓库完整验证**

运行：

```bash
(
  cd dist/public-release-repo
  npm ci
  npm test
  npm run test:integration
  npm run pack:release
  npm run archive:release
)
```

预期：

- `dist/public-release-repo/dist/publish/npm/manifest.json` 恰好 7 条，顺序为 5 个 platform、CLI、Skill。
- `dist/public-release-repo/dist/publish/github` 恰好 5 个完整离线归档。
- 本机 CLI 真实安装和 `fastmoss --version` 成功。
- Skill 默认无交互写入三个隔离 HOME 目录，并输出当前会话 handoff。
- 整个 npm 测试除 localhost registry 外无法访问外网。

- [ ] **步骤 5：检查 README 对齐和生成载荷边界**

运行：

```bash
node - <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const root = "dist/public-release-repo";
const start = "<!-- FASTMOSS_INSTALLATION_START -->";
const end = "<!-- FASTMOSS_INSTALLATION_END -->";
function block(file) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  return content.slice(content.indexOf(start), content.indexOf(end) + end.length);
}
for (const group of [
  ["README.md", "fastmoss/README.md", "fastmoss-skill/README.md"],
  ["README.zh-CN.md", "fastmoss/README.zh-CN.md", "fastmoss-skill/README.zh-CN.md"],
]) {
  const values = group.map(block);
  if (new Set(values).size !== 1) throw new Error(`README installation drift: ${group}`);
}
NODE

npm pack --dry-run ./dist/public-release-repo/fastmoss
npm pack --dry-run ./dist/public-release-repo/fastmoss-skill
git diff --check
```

预期：README 对齐检查通过；CLI tarball 无 Skill/二进制/下载器；Skill tarball 无 CLI 二进制/依赖；无空白错误。

- [ ] **步骤 6：请求上游代码审查并修复发现**

调用 `superpowers:requesting-code-review`，要求审查者逐项核对设计规范的 14 条验收标准，重点检查：

- npm 路径是否存在任何 GitHub 下载回退。
- Skill 安装失败是否正确恢复旧目录。
- `--skill` 是否真的不需要二进制，`--cli` 是否真的不需要 Skill。
- prepare 失败是否保留旧 staging。
- sync 是否可能覆盖错误目录或删除 `docs/superpowers`。
- workflow 的七包顺序与两个发布渠道独立性。

对每个接受的发现先增加失败测试，再做最小修复，随后重新执行步骤 1 至步骤 5。若有修复，提交：

```bash
git add -A
git commit -m "fix: address installation redesign review"
```

- [ ] **步骤 7：同步到 `fastmoss-release`**

确认 `fastmoss-release` 工作树只有预期文档改动，且已提交本计划。然后在 `fastmoss-mcp` 运行：

```bash
./scripts/sync_public_release_repo.sh ../fastmoss-release
```

预期：公开仓库 `.git` 与 `docs/superpowers` 保留，其他受管内容与 `dist/public-release-repo` 一致，旧的 `fastmoss/.npmignore`、下载器、CLI 包内 Skill 和陈旧文件消失。

- [ ] **步骤 8：在同步后的公开仓库重新验证**

运行：

```bash
cd ../fastmoss-release
npm ci
npm test
npm run test:integration
npm run pack:release
npm run archive:release
git diff --check
git status --short
```

预期：与 staging 结果一致；`docs/superpowers/specs` 和 `docs/superpowers/plans` 仍存在。

- [ ] **步骤 9：提交生成后的公开仓库内容**

仅在步骤 8 全部通过后提交：

```bash
git add .
git commit -m "release: prepare independent CLI and Skill channels"
```

该提交不创建 tag、不 push、不 publish。正式版本发布仍由维护者按 `fastmoss-mcp/README.md` 中记录的 `release: vX.Y.Z`、push main、tag 和 push tag 流程执行。

- [ ] **步骤 10：完成开发分支**

先调用 `superpowers:verification-before-completion`，报告上游与公开仓库实际执行的命令和结果；再调用 `superpowers:finishing-a-development-branch`，提供合并、PR 或保留分支选项。
