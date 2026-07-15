# @fastmoss/skill

[English](./README.md)

`@fastmoss/skill` 用于安装或更新 FastMoss Agent Skill。它不会安装、检查或依赖 `@fastmoss/cli`。

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

## 选项

```bash
npx -y @fastmoss/skill@latest --help
npx -y @fastmoss/skill@latest --version
npx -y @fastmoss/skill@latest uninstall --agent all
```

每个安装目录都会写入 `.fastmoss-install.json`。卸载时只删除带有 FastMoss 归属 manifest 的目录；未托管目录会被跳过。
