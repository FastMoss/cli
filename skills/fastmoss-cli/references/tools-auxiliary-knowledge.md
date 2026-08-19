# Auxiliary and Knowledge Base Tools

> Auxiliary and knowledge base tools for category keyword matching, FastMoss documentation, detail-page URL rules, quota checks, and other tools outside the main business prefixes.

## Tool summary

| Tool | Description |
|---|---|
| credit_usage_summary | Use after first-time login or authorization to verify auth and show the account's current FastMoss MCP credit usage summary. Takes no arguments. |
| fastmoss_detail_url_examples | Use when the AI needs FastMoss detail-page links. Takes no arguments and returns product, creator, shop, video, and l... |
| search_category_by_words | Use when the user knows a product/category term but does not have the category_id yet. Returns matched TikTok product... |
| search_fastmoss_documents | Use when the user asks about FastMoss rules, features, terms, or operations rather than real-time business data. Retu... |

## Tool details

### credit_usage_summary

Use after first-time login or authorization to verify auth and show the account's current FastMoss MCP credit usage summary. Takes no arguments.

Example:

```bash
fastmoss call --tool credit_usage_summary --args '{}' --output mcp
```

Parameters: none documented.

### fastmoss_detail_url_examples

Use when the AI needs FastMoss detail-page links. Takes no arguments and returns product, creator, shop, video, and live URL templates.

Example:

```bash
fastmoss call --tool fastmoss_detail_url_examples --args '{}' --output mcp
```

Parameters: none documented.

### search_category_by_words

Use when the user knows a product/category term but does not have the category_id yet. Returns matched TikTok product category IDs and Chinese category paths.

Example:

```bash
fastmoss call --tool search_category_by_words --args '{"query":[]}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| max_total_results | integer | no | Max deduplicated candidates. Default 15. |
| query | array \| string | yes | Product or category terms, string or array; map natural-language category clues into category_id. |
| top_k | integer | no | Candidate categories per keyword. Default 5. |

### search_fastmoss_documents

Use when the user asks about FastMoss rules, features, terms, or operations rather than real-time business data. Returns knowledge snippets and documents.

Example:

```bash
fastmoss call --tool search_fastmoss_documents --args '{"query":[]}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| query | array \| string | yes | Feature terms, terminology, rule questions, or operation questions; string or array. |
| source_file | string | no | Optional source file; use it to narrow the search scope and reduce noise. |
| top_k | integer | no | Knowledge snippets per query. Default 5. |
