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

1. Read `references/tools.md` to choose the most specific tool and load only its matching category file. The packaged catalog is for tool selection and offline fallback; it is not the authority for the current account's input schema.
2. **Before every `fastmoss call`, run the exact tool lookup and use its returned schema to construct `--args`:**

   ```bash
   fastmoss tools --search <tool_name>
   ```

   This lookup is mandatory whenever it is available. It gives the current tool's required fields, nesting, types, and enum values. Do not infer parameters from a similar tool or invent fields. If live lookup is unavailable, use the packaged category file as the fallback and state the limitation if the call is rejected.
3. Read `references/tool-call.md` for shell quoting, output modes, and error handling.
4. Put fields at the nesting shown by the schema. For example, when the schema requires `filter.date_type` and `filter.date_value`, pass them inside `filter`, not at the top level:

   ```json
   {"filter":{"date_type":"week","date_value":"2025-W01","region":"US"},"page":1,"pagesize":10}
   ```

   For ranking tools, `date_type` selects the period and `date_value` is required for that completed period: `day` uses the prior day as `YYYY-MM-DD`; `week` uses the last completed ISO week as `YYYY-Www`; `month` uses the last completed calendar month as `YYYY-MM`. Never pass an in-progress day, week, or month. The exact tool schema remains authoritative because some rankings support only a subset of these values.
5. Every `fastmoss call` MUST include agent client metadata. Prefer environment variables when making one or more calls in the same shell session:

   ```bash
   FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool <tool_name> --args '<json>' --output mcp
   ```

   Or pass explicit flags for a single call:

   ```bash
   fastmoss call --client-name "<client-name>" --client-version "<client-version>" --tool <tool_name> --args '<json>' --output mcp
   ```

   Use the actual client name and version when available. Do not invent a version number; if the runtime does not expose a version, use the client name and omit the version only if the CLI allows it.

Prefer `--output mcp` when an LLM or agent will read and reason over the tool response. Use `--output data` when the user needs a concise end-user payload. Use `--output rpc` only when debugging raw RPC responses.

### Common parameter patterns

All current tools have a flattened parameter table and a generated JSON example in the matching category reference. Apply these rules before calling any of them:

| Parameter pattern | How to pass it |
|---|---|
| Nested filters | Keep the schema path in the JSON: `filter.uid`, `filter.region`, or `filter.date_type` means `{"filter":{...}}`, not a top-level field. |
| Object identity | Use the exact ID name returned by a search or detail tool, such as `uid`, `product_id`, `shop_id`, `video_id`, or `live_id`; do not substitute a handle or display name. |
| Categories | Resolve a named category with `search_category_by_words` before passing `category_id`, `product_category_id`, `creator_category_id`, or `category_path`. |
| Time ranges | Use only the schema's time style: `time_range_days`, `start_date`/`end_date` (both `YYYY-MM-DD`), or ranking `date_type`/`date_value`. Do not mix styles unless the schema exposes both. |
| Rankings | Use a completed period only: `day` → prior `YYYY-MM-DD`; `week` → last completed `YYYY-Www`; `month` → last completed `YYYY-MM`. Confirm supported periods with the exact tool lookup. |
| Pagination and sorting | Pass `page` and `pagesize` at the top level when the schema lists them. Their maximum is 10. `orderby` is an array; use only fields and sort shapes returned by the schema. |
| Ranges and enums | Preserve object shapes such as `{"min": number, "max": number}` and use only the enum values returned by `tools --search`. |

### Leaderboard example

The same time-field structure applies to creator, product, shop, market, and agency leaderboards whenever their exact schema includes it. For a weekly ecommerce-creator leaderboard, verify the live schema first, then pass the required time fields inside `filter`:

```bash
fastmoss tools --search creator_rank_top_ecommerce
FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool creator_rank_top_ecommerce --args '{"filter":{"date_type":"week","date_value":"2025-W01","region":"US"},"page":1,"pagesize":10}' --output mcp
```

`2025-W01` is an example of the required ISO-week format; replace it with the latest completed week or the period the user requested. The generated references provide the exact fields for every current leaderboard and non-leaderboard tool.

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
