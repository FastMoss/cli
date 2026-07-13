# FastMoss CLI Command Reference

## Install

Install the CLI before using this skill:

```bash
npm install -g @fastmoss/cli
```

After installation, the command is:

```bash
fastmoss
```

If `fastmoss` is not found, ask the user to make sure the npm global bin directory is in `PATH`.

## Authentication and config

```bash
fastmoss login --api-key <api-key>
fastmoss logout
fastmoss whoami
fastmoss show config
fastmoss show auth
fastmoss set api-key <api-key>
fastmoss clear api-key
fastmoss set language zh
fastmoss set language en
```

`whoami`, `show config`, and `show auth` are safe first checks. Do not print or expose API keys in the final answer.

## Tool discovery

```bash
fastmoss tools
fastmoss tools --json
fastmoss tools --search <tool_name>
```

Use `tools --json` when live metadata is needed. Use `tools --search <tool_name>` to inspect one exact tool.

## Tool calls

```bash
fastmoss call --tool <tool_name> --args '<json>' --output mcp
```

Shortcut form:

```bash
fastmoss <tool_name> --args '<json>' --output mcp
```

Prefer the explicit `call --tool` form inside agents because it is clearer and easier to debug.

## Common flags

These flags are supported by networked tool commands:

```bash
--api-key <api-key>
--base-url <url>
--timeout <seconds>
--insecure-skip-tls
```

Use config or environment defaults unless the user explicitly asks to override them.
