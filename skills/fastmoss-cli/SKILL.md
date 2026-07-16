---
name: fastmoss
description: Use when working with FastMoss CLI, FastMoss MCP tools, TikTok Shop product, creator, shop, MCN agency, video, ad, category, or market data, or when the user asks an agent to call FastMoss tools from the command line.
---

# FastMoss CLI

Use the `fastmoss` command to discover and call FastMoss tools.

## Startup checks

1. Check the CLI is available:

   ```bash
   fastmoss --version
   ```

   If the FastMoss CLI is not installed, the command is not found, or the user
   asks to update the CLI, install the current npm release:

   ```bash
   npm install -g @fastmoss/cli@latest
   ```

   This installs only the CLI. Do not install or update the Agent Skill unless
   the user separately asks for it.

   Then continue to the login check.

2. Check login status:

   ```bash
   fastmoss whoami
   ```

3. If not logged in, obtain an API key and log in before calling any tools:

   - If the user does not have an API key, offer (but do not open or require)
     [FastMoss Developer Platform](https://developers.fastmoss.com/mcp/overview.html)
     as an optional place to sign in and create an MCP API key. The user chooses
     whether to open the page. Do not block or defer the API key input action
     while they decide, and do not require that they visit the page before
     providing an existing or newly created key.
   - In an interactive Agent client, trigger the client's native user-input or
     secret-entry action with one field named `FastMoss API Key`. Ask only for
     the key. Do not first ask the user to run a command themselves.
   - After the user supplies the key, run `fastmoss login --api-key <provided-api-key>`
     yourself, then continue with the requested work. Never repeat, display,
     persist, or include the API key in tool arguments, logs, plans, or replies.
   - If the current client cannot trigger user input or cannot execute the CLI,
     ask the user to configure the key with the terminal fallback below:

   ```bash
   fastmoss login --api-key <your-api-key>
   ```

## Tool workflow

1. Read `references/tool-call.md` before invoking a tool.
2. Read `references/tools.md` to choose the tool and understand its parameters.
3. Every `fastmoss call` MUST include agent client metadata. Prefer environment variables when making one or more calls in the same shell session:

   ```bash
   FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool <tool_name> --args '<json>' --output mcp
   ```

   Or pass explicit flags for a single call:

   ```bash
   fastmoss call --client-name "<client-name>" --client-version "<client-version>" --tool <tool_name> --args '<json>' --output mcp
   ```

   Use the actual client name and version when available. Do not invent a version number; if the runtime does not expose a version, use the client name and omit the version only if the CLI allows it.

Prefer `--output mcp` when an LLM or agent will read and reason over the tool response. Use `--output data` when the user needs a concise end-user payload. Use `--output rpc` only when debugging raw RPC responses.

If the analysis result needs FastMoss detail-page links, call `fastmoss_detail_url_examples` first to get the link assembly rules, then build links from the returned examples and IDs in the analysis result.

## References

- `references/cli.md`: CLI command reference.
- `references/tool-call.md`: safe calling patterns, quoting, output modes, and error handling.
- `references/tools.md`: static FastMoss tool catalog index. Read the matching category file from this index instead of loading all tools at once.
