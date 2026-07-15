# @fastmoss/skill

[中文文档](./README.zh-CN.md)

`@fastmoss/skill` installs or updates the FastMoss Agent Skill. It does not install, check, or depend on `@fastmoss/cli`.

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

## Options

```bash
npx -y @fastmoss/skill@latest --help
npx -y @fastmoss/skill@latest --version
npx -y @fastmoss/skill@latest uninstall --agent all
```

Each installed directory receives `.fastmoss-install.json`. Uninstall only removes directories with that FastMoss ownership manifest; unmanaged directories are skipped.
