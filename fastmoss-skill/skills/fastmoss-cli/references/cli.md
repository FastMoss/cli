# FastMoss CLI Command Reference

## Install

Install the CLI before using this skill:

```bash
npm install -g @fastmoss/cli@latest
```

This installs only the CLI. It does not install or update the Agent Skill. If
this Skill is already installed but `fastmoss` is missing, install only the CLI.

After installation, the command is:

```bash
fastmoss
```

If `fastmoss` is not found, ask the user to make sure the npm global bin directory is in `PATH`.

## Authentication and config

```bash
fastmoss login --oauth
fastmoss login --oauth --env test
fastmoss login
fastmoss logout
fastmoss whoami
fastmoss show config
fastmoss show auth
fastmoss set api-key <api-key>
fastmoss clear api-key
fastmoss set language zh
fastmoss set language en
```

`fastmoss login --oauth` is the recommended authentication method for normal
interactive users and agent clients. It opens the browser, completes FastMoss
account login and consent, lets the user create or select an MCP API key when
needed, stores OAuth tokens locally, and refreshes the access token
automatically during later CLI calls.

Use `fastmoss login --oauth --env test` for the test environment.

`fastmoss login` is the API Key fallback. It requires a real terminal and reads
the API key with terminal echo disabled. Use it for legacy clients, CI,
headless servers, or users who explicitly want to keep direct API Key
configuration. Do not pipe the key through stdin.

The legacy `fastmoss login --api-key <api-key>` form remains available for
existing trusted automation, but it is not the recommended interactive login
method because process arguments may be observable.

If a saved API key and OAuth session both exist, CLI calls prefer the saved API
key for backward compatibility. Run `fastmoss clear api-key` when the user wants
to switch that local profile to OAuth.

`whoami`, `show config`, and `show auth` are safe first checks. Do not print or expose API keys in the final answer.

After a first-time OAuth authorization or API Key login, verify the setup by
calling the credit usage summary tool once:

```bash
FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool credit_usage_summary --args '{}' --output mcp
```

If the agent client cannot run the verification command directly, prompt the
user to ask one simple FastMoss question, such as "show my FastMoss credit
usage", and then make the tool call as part of answering it.

## Tool discovery

```bash
fastmoss tools
fastmoss tools --json
fastmoss tools --search <tool_name>
```

Use `fastmoss tools` to print a compact, name-and-title list of the tools
available to the current account. Use it to browse the catalog when the tool
name is unknown.

Use `fastmoss tools --json` to print the complete live tool-list response as
JSON, including descriptions and input schemas. Use it when current metadata
for several tools is needed.

Use `fastmoss tools --search <tool_name>` to retrieve the complete JSON
definition for one exact tool name (case-insensitive). Use it to confirm the
input schema, required fields, and allowed values before calling that tool.

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
