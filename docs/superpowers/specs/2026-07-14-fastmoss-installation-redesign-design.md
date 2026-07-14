# FastMoss CLI 与 Skill 双渠道安装设计

日期：2026-07-14

## 1. 背景

当前 `@fastmoss/cli` npm 包只包含 Node.js wrapper 和 Skill，安装期或首次运行时还需要从 GitHub Releases 下载当前平台的 Go 二进制。这个结构导致 npm 安装并不是独立渠道：即使 npm registry 可用，只要 GitHub 网络不可达，CLI 就无法完成安装或运行。

此外，Skill 虽然被打进 CLI npm 包，但需要在安装 CLI 后再执行 `fastmoss-install-skill`。这把两个本应独立的能力绑定在一起：只需要 CLI 的用户会收到无关的 Skill 内容，只需要 Skill 的用户又必须先安装 CLI 包。

本设计把 GitHub 和 npm 调整为能力对等、实现独立的两个安装渠道，并把 CLI 与 Skill 调整为可分别安装的两个产品。

## 2. 目标

1. `npm install -g @fastmoss/cli@latest` 只安装 CLI，并且安装期和运行期都不访问 GitHub。
2. `npx -y @fastmoss/skill@latest` 只安装 Skill，不依赖 `@fastmoss/cli`，也不访问 GitHub。
3. 用户可以把 Skill 安装命令直接发送到 Agent 聊天框，由 Agent 非交互执行并获得当前会话加载提示。
4. GitHub clone 和 GitHub Release 安装包可以分别安装 CLI、Skill 或两者，安装脚本不调用 npm，也不继续下载文件。
5. npm 与 GitHub 发布物来自同一份二进制和同一份 Skill 源码，版本保持一致。
6. 删除 npm CLI 的 GitHub 下载器、安装期下载和首次运行下载逻辑。

## 3. 非目标

1. 不改变 Go CLI 的命令、认证、配置或 MCP 调用行为。
2. Skill 安装器不自动安装 CLI；Skill 在真正需要调用 `fastmoss` 且命令缺失时继续引导用户单独安装。
3. 不新增当前五个平台之外的平台支持。
4. 不保证所有 Agent 客户端都能原生热加载新 Skill；安装器提供当前会话 handoff，客户端不支持热加载时在下一会话生效。
5. 升级时不自动删除旧版本留在 `~/.fastmoss/bin` 的下载缓存。

## 4. 用户命令契约

### 4.1 只安装 CLI

```bash
npm install -g @fastmoss/cli@latest
```

安装后提供：

```bash
fastmoss
```

临时运行仍受支持：

```bash
npx -y @fastmoss/cli@latest
```

### 4.2 只安装 Skill

推荐命令：

```bash
npx -y @fastmoss/skill@latest
```

默认命令等价于 `install --agent all`。它非交互地安装或更新 Codex、Claude 和通用 Agents 三个全局目录中的 `fastmoss-cli` Skill。

高级用法：

```bash
npx -y @fastmoss/skill@latest --agent codex
npx -y @fastmoss/skill@latest --agent claude
npx -y @fastmoss/skill@latest --agent agents
npx -y @fastmoss/skill@latest --agent all
npx -y @fastmoss/skill@latest uninstall --agent all
```

支持 `FASTMOSS_SKILL_DIR` 覆盖目标 skills 根目录。指定该变量后只操作该目录，不再写入默认 Agent 目录。

### 4.3 通过 GitHub clone 安装

```bash
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
./install.sh --cli
./install.sh --skill
./install.sh --all
```

Windows 命令为：

```powershell
.\install.ps1 -Cli
.\install.ps1 -Skill
.\install.ps1 -All
```

三个操作彼此独立，`--all`/`-All` 只是依次执行 CLI 和 Skill 安装。

## 5. 方案选择

### 5.1 采用：主包加平台 npm 包

`@fastmoss/cli` 是小型 Node.js launcher，通过 `optionalDependencies` 声明五个精确版本的平台包。npm 根据平台包的 `os` 和 `cpu` 字段只安装当前平台适用的包。launcher 直接运行平台包中已经存在的二进制。

优点：

- npm 是完整、自足的安装渠道。
- 用户只下载当前平台二进制。
- 没有 lifecycle 下载和首次运行下载。
- `npm`、私有 npm 镜像和 npm 缓存的行为一致。

### 5.2 不采用：主包内置所有平台二进制

这种方式结构简单，但每个用户都会下载五个平台的二进制，包体积和缓存占用不必要地增大。

### 5.3 不采用：安装期下载二进制

无论下载目标是 GitHub Releases 还是 npm tarball，`postinstall` 下载都会受到 lifecycle scripts、代理和安装权限影响，也会让包内容与最终运行内容分离。因此不保留这种回退路径。

Skill 同样不使用 `npm install -g @fastmoss/skill` 的 `postinstall` 修改用户目录。Skill 包作为显式的一次性 npm executable 运行，避免 lifecycle scripts 被禁用时出现表面安装成功、实际 Skill 不可用的状态。

## 6. npm 包架构

### 6.1 `@fastmoss/cli`

职责：

- 提供唯一的 `fastmoss` bin。
- 根据 `process.platform` 和 `process.arch` 选择平台包。
- 校验平台包版本与主包版本一致。
- 把全部参数、标准输入、标准输出、标准错误和退出状态传递给 Go 二进制。

该包不包含：

- Go 二进制。
- Skill 文件。
- `fastmoss-install-skill` 命令。
- `postinstall`。
- HTTP/HTTPS 下载代码。
- GitHub Release URL。

主包使用精确版本的 `optionalDependencies`：

| npm 包 | npm `os` | npm `cpu` | 二进制 |
| --- | --- | --- | --- |
| `@fastmoss/cli-darwin-amd64` | `darwin` | `x64` | `fastmoss-darwin-amd64` |
| `@fastmoss/cli-darwin-arm64` | `darwin` | `arm64` | `fastmoss-darwin-arm64` |
| `@fastmoss/cli-linux-amd64` | `linux` | `x64` | `fastmoss-linux-amd64` |
| `@fastmoss/cli-linux-arm64` | `linux` | `arm64` | `fastmoss-linux-arm64` |
| `@fastmoss/cli-windows-amd64` | `win32` | `x64` | `fastmoss-windows-amd64.exe` |

每个版本的主包和五个平台包必须使用相同版本号。依赖范围不使用 `^` 或 `~`。

### 6.2 平台 npm 包

每个平台包只包含 package metadata 和该平台的一个二进制。Unix 二进制在打包前设置可执行权限。平台包是公开 npm 包，但属于实现细节，不作为用户文档中的直接安装入口。

平台包的内容从仓库已有的 `release-assets` 生成，不从 GitHub Release 下载。

### 6.3 `@fastmoss/skill`

职责：

- 提供唯一 npm executable `fastmoss-skill`，使 `npx -y @fastmoss/skill@latest` 可以直接执行。
- 包含完整的 `skills/fastmoss-cli` payload。
- 支持默认安装、`--agent`、`FASTMOSS_SKILL_DIR`、`uninstall`、`--help` 和 `--version`。
- 安装完成后输出 Agent handoff。

该包不声明对 `@fastmoss/cli` 或任何平台包的依赖，不检查 CLI 是否存在，也不包含 lifecycle scripts。

默认目标目录：

| Agent | skills 根目录 |
| --- | --- |
| Codex | `${CODEX_HOME:-~/.codex}/skills` |
| Claude | `${CLAUDE_HOME:-~/.claude}/skills` |
| Agents | `${AGENTS_HOME:-~/.agents}/skills` |

安装目标目录名固定为 `fastmoss-cli`。

### 6.4 Skill 单一源码

仓库根目录的 `skills/fastmoss-cli` 是唯一可编辑 Skill 源码。删除 `fastmoss/skills/fastmoss-cli` 这份副本。

发布构建把根目录 Skill 复制到 npm staging 目录和 GitHub 安装归档。生成目录不提交到 git，测试会验证打包内容与根目录源码一致。

实施使用以下源码和生成目录：

```text
fastmoss/                         # @fastmoss/cli source
fastmoss-skill/                   # @fastmoss/skill installer source
skills/fastmoss-cli/              # canonical Skill source
release-assets/                   # canonical release binaries and SHA256SUMS
scripts/build-release-packages.js # generate npm and GitHub staging trees
install.sh
install.ps1
dist/                             # generated, gitignored
```

## 7. 运行流程

### 7.1 npm CLI

1. npm 从用户配置的 registry 获取 `@fastmoss/cli`。
2. npm 根据 `os/cpu` 安装适用的平台 optional dependency。
3. 用户执行 `fastmoss`。
4. launcher 解析当前平台对应的包名。
5. launcher 校验平台包版本和二进制文件。
6. launcher 直接 spawn 二进制并透传进程状态。

任何步骤都不构造网络下载 URL。平台包缺失时流程在第 5 步终止。

### 7.2 npm Skill

1. `npx` 从用户配置的 npm registry 获取 `@fastmoss/skill`。
2. 安装器解析 `install` 或 `uninstall` 以及 Agent 目标。
3. 对每个目标创建同级临时目录，复制 Skill payload 并验证 `SKILL.md`。
4. 在临时目录写入 `.fastmoss-install.json`，记录包名、Skill 名和版本。
5. 把旧目录移动到临时备份，再把带 manifest 的新目录原子替换到目标位置；失败时恢复旧目录。
6. 删除临时备份并输出安装结果。

成功输出必须包含所有安装路径和下面语义等价的 handoff：

```text
Agent action: Read the installed fastmoss-cli/SKILL.md now and use it in this conversation.
If this client cannot load newly installed skills in the current session, start a new conversation.
```

默认 `all` 会创建三个目标目录，即使对应 Agent 目录之前不存在。这样小白用户和执行命令的 Agent 不需要先判断客户端类型。

### 7.3 GitHub 安装

clone 后的脚本只读取仓库内文件：

- 根据当前平台从 `release-assets` 选择二进制。
- 使用 `SHA256SUMS` 校验所选二进制。
- Unix 默认复制到 `$HOME/.local/bin/fastmoss`。
- Windows 默认复制到 `%LOCALAPPDATA%\FastMoss\bin\fastmoss.exe`。
- Skill 使用与 npm 安装器相同的目标目录约定。

脚本使用 `FASTMOSS_BIN_DIR` 覆盖 CLI 目标目录，使用 `FASTMOSS_SKILL_DIR` 覆盖 Skill 目标根目录，并使用 `FASTMOSS_SKILL_AGENT=codex|claude|agents|all` 限制默认 Skill 目标。命令行参数优先于环境变量。脚本不自动修改 shell 配置；目标目录不在 `PATH` 时输出针对当前环境的配置说明。

GitHub Release 为每个平台生成完整离线归档：macOS 和 Linux 使用 `.tar.gz`，Windows 使用 `.zip`。每个归档包含当前平台二进制、Skill、安装脚本、校验文件和简短 README。下载或 clone 完成后，安装过程不再访问网络。

## 8. 错误处理

### 8.1 CLI 错误

平台包缺失、版本不一致或二进制不可执行时返回非零状态，并输出当前平台、期望包名、期望版本和重装命令。例如：

```text
FastMoss binary package for darwin/arm64 is missing.
Run: npm install -g @fastmoss/cli@0.1.7
Do not install with --omit=optional.
```

错误后不尝试 GitHub、其他下载源或旧缓存。`fastmoss --version` 可以直接返回主包版本，不要求解析平台二进制。

### 8.2 Skill 错误

- payload 中缺少 `SKILL.md` 时安装前终止。
- 权限不足时输出失败路径，并提示 `--agent` 或 `FASTMOSS_SKILL_DIR`；不建议 `sudo`。
- 更新中断时恢复原目录。
- `uninstall` 只删除带有有效 `.fastmoss-install.json` 的 FastMoss 管理目录；目标不存在或不是 FastMoss 管理目录时给出说明并继续处理其他目标。
- 第一次迁移旧版同名 Skill 时允许替换没有 manifest 的 `fastmoss-cli` 目录；安装成功后由 manifest 接管后续更新和卸载。

### 8.3 GitHub 安装错误

- 不支持的平台立即终止。
- 二进制缺失或哈希不匹配立即终止。
- 目标目录不可写时返回非零状态并显示目录。
- `--all` 中任一组件失败时整体返回非零状态，不输出整体成功信息。

## 9. 旧版本迁移

1. 新版 `@fastmoss/cli` 移除 `postinstall`、下载器、Skill payload 和 `fastmoss-install-skill` bin。
2. 用户升级全局 npm 包后，npm 负责移除旧的 `fastmoss-install-skill` bin 链接。
3. 已经复制到 Agent 目录的旧 Skill 不会因 CLI 升级被删除；执行新的 Skill 安装命令会覆盖并接管它。
4. `FASTMOSS_DOWNLOAD_BASE_URL`、`FASTMOSS_CACHE_DIR` 和 `FASTMOSS_SKIP_DOWNLOAD` 不再生效，并在迁移文档中标记为移除。
5. `~/.fastmoss/bin` 不自动删除。README 给出可选清理方式，但正常使用不依赖该目录。
6. README 将 `npx skills add FastMoss/cli` 和 `fastmoss-install-skill` 替换为 `npx -y @fastmoss/skill@latest`。

## 10. 发布流程

Git tag `vX.Y.Z` 触发发布。`fastmoss/package.json` 的版本是仓库内发布版本源，workflow 验证它等于去掉 `v` 的 tag。平台包和 Skill staging manifest 都由该版本生成，避免维护多份版本号。

发布阶段：

1. 校验 tag、主包版本、五个二进制和 `SHA256SUMS`。
2. 运行单元测试、安装测试、包内容测试和脚本测试。
3. 从本地 `release-assets` 和 canonical Skill 生成 `dist` staging trees。
4. 生成并检查六个 CLI npm tarball 和一个 Skill npm tarball。
5. 先发布五个平台 npm 包。
6. 平台包全部成功后发布 `@fastmoss/cli`。
7. 发布独立的 `@fastmoss/skill`。
8. 从相同输入生成并发布 GitHub Release 原始资产和五个平台完整安装归档。

GitHub Release 发布与 npm 用户安装不存在运行时依赖。即使用户网络无法访问 GitHub，只要 npm registry 可访问，两个 npm 命令仍能完成安装。

## 11. 测试与发布门禁

### 11.1 单元测试

- 五个平台到 npm 包和二进制路径的映射。
- 不支持的平台。
- 平台包缺失、版本不匹配和不可执行。
- 参数、stdio、退出码和 signal 透传。
- Skill 参数解析、默认 all、指定 Agent、自定义目录、更新、回滚和卸载。
- Agent handoff 输出包含实际 `SKILL.md` 路径。

### 11.2 包内容测试

对 `npm pack --json` 生成的 tarball 进行断言：

- `@fastmoss/cli` 不包含 Skill、Go 二进制、下载器、GitHub URL或 lifecycle scripts。
- 每个平台包只包含正确的二进制，并具有正确的 `os/cpu`。
- `@fastmoss/skill` 包含 canonical Skill，不包含 CLI 二进制，也不依赖 CLI 包。
- 主包的五个 optional dependencies 与主包版本完全一致。
- 所有 npm manifest 都没有 git dependency。

### 11.3 npm 隔离安装测试

CI 启动临时 npm registry，把 staging 包发布到临时 registry 后执行真实命令：

```bash
npm install -g @fastmoss/cli@latest
fastmoss --version
npx -y @fastmoss/skill@latest
```

测试使用临时 npm prefix 和临时 home，断言：

- CLI 命令可运行且没有创建任何 Skill 目录。
- Skill 命令没有安装 CLI，也没有修改 npm prefix 中的 CLI。
- Skill 命令无交互、写入三个默认目录并输出 handoff。
- npm tarball 和运行时代码中没有 GitHub Release 下载地址。

macOS、Linux 和 Windows runner 分别运行本机平台的真实安装与 `--version`。无法直接执行的交叉架构包必须通过 metadata、文件格式和 SHA-256 校验。

### 11.4 GitHub 安装测试

在临时 home 和目标目录中分别测试 `--cli`、`--skill`、`--all`、自定义目录、哈希失败和权限失败。当前 runner 对应的二进制安装后执行 `fastmoss --version`。

### 11.5 发布门禁

任何版本不一致、tarball 内容越界、GitHub 下载逻辑回归、Skill 源码漂移或安装测试失败都会阻止所有 publish jobs 开始。

## 12. 验收标准

1. 阻断 GitHub 网络后，npm registry 安装的 CLI 可以执行 `fastmoss --version`。
2. 阻断 GitHub 网络后，`npx -y @fastmoss/skill@latest` 可以安装完整 Skill。
3. 安装 CLI 不创建或修改任何 Agent Skill 目录。
4. 安装 Skill 不创建或修改 CLI 安装目录。
5. GitHub clone 可以独立安装 CLI、Skill 或两者，安装阶段不访问 npm 或其他下载地址。
6. npm 和 GitHub 发布物使用同一版本的二进制与 Skill。
7. 仓库中只保留一份可编辑的 `skills/fastmoss-cli` 源码。
8. 旧版 CLI 用户可以通过正常 npm 升级迁移，旧缓存不影响新版运行。
