# FastMoss CLI

[中文文档](./README.zh-CN.md)

FastMoss CLI lets terminals and AI agents discover and call FastMoss MCP tools for TikTok Shop product research, creator discovery, shop analysis, ad analysis, market insight, video/live analysis, and FastMoss knowledge-base lookup.

The public release repository contains everything needed for GitHub clone installation, GitHub Release bundles, and npm publishing inputs.

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

## API Key and Credits

FastMoss tool calls require an API key and consume credits. Visit the [FastMoss Developer Platform](https://developers.fastmoss.com/mcp/overview.html) to sign in, create an MCP API key, view usage, and manage credits.

Typical setup:

```bash
fastmoss login --api-key <your-api-key>
fastmoss whoami
```

## Commands

```bash
fastmoss --version
fastmoss help
fastmoss tools
fastmoss tools --json
fastmoss call --tool <tool_name> --args '<json>' --output mcp
```

Use `--output mcp` when an LLM or agent will read the result. Use `--output data` for concise terminal output.

## Release Contents

- `fastmoss/`: npm source for `@fastmoss/cli`.
- `fastmoss-skill/`: npm source for `@fastmoss/skill`.
- `platform-packages/`: npm source for the five platform binary packages.
- `release-assets/`: GitHub Release binary assets and checksums.
- `skills/fastmoss-cli/`: canonical Agent Skill payload used by GitHub installers and npm packaging.
