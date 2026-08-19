# Calling FastMoss Tools from CLI

## Basic pattern

```bash
FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool <tool_name> --args '<json>' --output mcp
```

## Client metadata

Every `fastmoss call` MUST include agent client metadata. Prefer environment variables when making one or more calls in the same shell session:

```bash
FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool <tool_name> --args '<json>' --output mcp
```

Or pass explicit flags for a single call:

```bash
fastmoss call --client-name "<client-name>" --client-version "<client-version>" --tool <tool_name> --args '<json>' --output mcp
```

Use the actual client name and version when available. Do not invent a version number; if the runtime does not expose a version, use the client name and omit the version only if the CLI allows it.

Always pass valid JSON to `--args`. On macOS/Linux shells, wrap JSON in single quotes:

```bash
FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool creator_search --args '{"keywords":"beauty","region":"US"}' --output mcp
```

If a value contains a single quote, write the JSON to a temporary file or carefully escape it before calling the CLI.

## Choose the tool

1. Read `references/tools.md` for the packaged static catalog index, then read the matching category file:
   - `tools-advertising.md` for `ad_` tools.
   - `tools-agency.md` for `agency_` tools.
   - `tools-creator.md` for `creator_` tools.
   - `tools-product.md` for `product_` tools.
   - `tools-shop.md` for `shop_` tools.
   - `tools-market.md` for `market_` tools.
   - `tools-live.md` for `live_` tools.
   - `tools-video.md` for `video_` tools.
   - `tools-auxiliary-knowledge.md` for helper, link, document, category, and other tools.
2. If the user is logged in and live metadata matters, run:

   ```bash
   fastmoss tools --json
   fastmoss tools --search <tool_name>
   ```

3. Match the user's intent to the most specific tool. Prefer specific product, creator, shop, ad, video, category, or ranking tools over broad search tools.

## Output modes

Use:

```bash
--output mcp
```

when an LLM or agent will read and reason over the tool response.

Use:

```bash
--output data
```

when the user needs a concise end-user payload without extra protocol wrapping.

Use:

```bash
--output rpc
```

only when debugging raw RPC behavior.

## Error handling

- If the CLI is missing, tell the user to run `npm install -g @fastmoss/cli`.
- If auth is missing, recommend `fastmoss login --oauth` for normal interactive
  users and agent clients. The CLI owns browser launch, PKCE, callback handling,
  token storage, and refresh; do not manually construct OAuth URLs.
- For the test environment, recommend `fastmoss login --oauth --env test`.
- If OAuth is not suitable because the environment is CI, headless, legacy, or
  explicitly API-Key based, use a PTY-backed `fastmoss login` with native secret
  input. If the client cannot safely attach input to the active terminal, tell
  the user to run `fastmoss login` in their own real terminal. Never pipe the API
  key.
- If a saved API key exists, the CLI uses it before OAuth for compatibility. Ask
  the user to run `fastmoss clear api-key` only when they want this local profile
  to switch from API Key to OAuth.
- After first-time login or OAuth authorization succeeds, run
  `credit_usage_summary` with empty args once to verify authentication and quota
  visibility. If the client cannot run commands directly, ask the user to send a
  simple FastMoss question that lets the agent perform this verification call.
- If the tool name is unknown, check `references/tools.md` and the matching category file, then try `fastmoss tools --json` when live discovery is available.
- If arguments are rejected, inspect the tool's parameter table in the matching category file or run `fastmoss tools --search <tool_name>`.
- Do not invent unavailable fields. Ask a focused follow-up question when required parameters are missing.

## Detail-page links

When the answer should include FastMoss detail-page links, call this helper first:

```bash
FASTMOSS_CLIENT_NAME="<client-name>" FASTMOSS_CLIENT_VERSION="<client-version>" fastmoss call --tool fastmoss_detail_url_examples --args '{}' --output mcp
```

Use the returned examples as the link assembly rules. Combine those rules with product IDs, creator IDs, shop IDs, video IDs, live IDs, or other IDs returned by the analysis tools.

## Response pattern

After a successful tool call:

1. Summarize the answer in the user's language.
2. Mention key filters or assumptions used in the call.
3. Preserve IDs, URLs, categories, regions, dates, and numeric fields that the user may need next.
4. If the result is empty, suggest one or two concrete next filters to broaden or correct the query.
