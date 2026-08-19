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

3. If not logged in, use OAuth for normal interactive users before calling any
   tools:

   ```bash
   fastmoss login --oauth
   ```

   OAuth is the recommended login method for agent clients and human-operated
   terminals because the browser handles FastMoss account login, API key
   selection or creation, consent, PKCE, token storage, and refresh. The agent
   must not manually build the authorization URL or collect API keys in chat.

   The CLI opens the browser and listens on the local loopback callback. If the
   browser cannot be opened automatically, ask the user to open the URL printed
   by the CLI in their browser and complete the authorization. After OAuth login,
   future tool calls reuse the saved access token and automatically refresh it
   with the refresh token when needed.

   After the user completes OAuth authorization, verify the setup by running
   the credit usage summary tool once:

   ```bash
   FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool credit_usage_summary --args '{}' --output mcp
   ```

   If the current agent client cannot run the verification command directly,
   ask the user to send one simple FastMoss question, such as "show my FastMoss
   credit usage", so the agent can make a real tool call and confirm the
   authorization works.

4. Use API Key login only for compatibility or non-browser automation:

   - Existing users who already configured an API key can keep using it; do not
     force them through OAuth.
   - Use API Key login for CI, headless servers, legacy scripts, or clients that
     cannot support a browser-based OAuth flow.
   - In an interactive Agent client that can attach secret input to an active
     terminal, start `fastmoss login` in a PTY. When the CLI displays its API
     key prompt, trigger the client's native secret-entry action with one field
     named `FastMoss API Key` and write the result directly to that active
     terminal. The CLI disables terminal echo while reading it.
   - Never collect the key in ordinary chat, repeat or display it, place it in
     command arguments, pipe it through stdin, or include it in tool arguments,
     logs, plans, or replies.
   - If the current client cannot securely attach user input to the active CLI
     terminal and OAuth is not suitable, ask the user to complete API Key login
     in their own real terminal:

   ```bash
   fastmoss login
   ```

   - `fastmoss login --api-key <value>` remains available only for compatibility
     with existing trusted automation. Do not recommend it for interactive login
     because command arguments may be observable by other processes or logs.

5. After any first-time login path succeeds, run `credit_usage_summary` once to
   confirm authentication, quota visibility, and MCP tool calling are working.
   If verification fails because of missing auth, retry the login guidance above.

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
- `references/tools-advertising.md`: advertising tool details.
- `references/tools-agency.md`: MCN agency tool details.
- `references/tools-creator.md`: creator tool details.
- `references/tools-product.md`: product tool details.
- `references/tools-shop.md`: shop tool details.
- `references/tools-market.md`: market insight tool details.
- `references/tools-live.md`: live-session tool details.
- `references/tools-video.md`: video tool details.
- `references/tools-auxiliary-knowledge.md`: auxiliary and FastMoss knowledge-base tool details.
