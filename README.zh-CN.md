# FastMoss CLI

[English](./README.md)

FastMoss CLI 可以让终端和 AI Agent 发现并调用 FastMoss MCP 工具，用于 TikTok Shop 选品、达人发现、店铺分析、广告分析、市场洞察、短视频/直播分析和 FastMoss 知识库查询。

公开 release 仓库包含 GitHub clone 安装、GitHub Release 离线包和 npm 发布所需的全部输入文件。

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

## API Key 和 Credits

FastMoss 工具调用需要 API Key，并会消耗 credits。请访问 [FastMoss Developer Platform](https://developers.fastmoss.com/mcp/overview.html) 登录、创建 MCP API Key、查看用量并管理 credits。

常用配置：

```bash
fastmoss login --api-key <your-api-key>
fastmoss whoami
```

## 常用命令

```bash
fastmoss --version
fastmoss help
fastmoss tools
fastmoss tools --json
fastmoss call --tool <tool_name> --args '<json>' --output mcp
```

当结果给 LLM 或 Agent 阅读时使用 `--output mcp`；终端人工查看时可使用 `--output data`。

## 发布内容

- `fastmoss/`：`@fastmoss/cli` 的 npm 源码。
- `fastmoss-skill/`：`@fastmoss/skill` 的 npm 源码。
- `platform-packages/`：五个平台二进制 npm 包的源码。
- `release-assets/`：GitHub Release 二进制资产和校验和。
- `skills/fastmoss-cli/`：GitHub 安装器和 npm 打包共用的 canonical Agent Skill。
