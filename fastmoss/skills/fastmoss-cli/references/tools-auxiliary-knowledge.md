# Auxiliary and Knowledge Base Tools

> Auxiliary and knowledge base tools for category keyword matching, FastMoss documentation, detail-page URL rules, live/video analysis, and tools outside the main business prefixes.

## Tool summary

| Tool | Description |
|---|---|
| fastmoss_detail_url_examples | Use when the AI needs FastMoss detail-page links. Takes no arguments and returns product, creator, shop, video, and l... |
| live_detail_analysis | Use when the user wants one live session info, creator, key performance, and category breakdown. |
| live_products_list | Use when the user wants products sold in a live session or high GMV/units within this live session. Returns live_unit... |
| live_search | Use when the user has no room_id and provides a live title, host, or shop. Returns live, creator, and performance_sum... |
| search_category_by_words | Use when the user knows a product/category term but does not have the category_id yet. Returns matched TikTok product... |
| search_fastmoss_documents | Use when the user asks about FastMoss rules, features, terms, or operations rather than real-time business data. Retu... |
| video_data_trends | Use when the user wants one video play, like, comment, or share trends. Returns daily interaction trends. |
| video_detail_analysis | Use when the user wants one video basics, plays, engagement, interaction rate, IPM, and linked products. |
| video_script_info | Use when the user wants video subtitles or line-by-line spoken copy. Returns start/end time and text; empty subtitles... |
| video_search | Use when the user has no video_id and provides video keywords, title, or creator. Returns matching videos. |

## Tool details

### fastmoss_detail_url_examples

Use when the AI needs FastMoss detail-page links. Takes no arguments and returns product, creator, shop, video, and live URL templates.

Example:

```bash
fastmoss call --tool fastmoss_detail_url_examples --args '{}' --output mcp
```

Parameters: none documented.

### live_detail_analysis

Use when the user wants one live session info, creator, key performance, and category breakdown.

Example:

```bash
fastmoss call --tool live_detail_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |

### live_products_list

Use when the user wants products sold in a live session or high GMV/units within this live session. Returns live_units_sold, live_gmv, commission_rate_percent, sales_timeline only when pagesize <= 10, and shop_cumulative_units_sold.

Example:

```bash
fastmoss call --tool live_products_list --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options; only the first sort rule takes effect. Fields: units_sold, gmv. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10; timeline snapshots are returned only when pagesize <= 10. |

### live_search

Use when the user has no room_id and provides a live title, host, or shop. Returns live, creator, and performance_summary.

Example:

```bash
fastmoss call --tool live_search --args '{"filter":{},"keywords":"value","lang":"value"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

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

### video_data_trends

Use when the user wants one video play, like, comment, or share trends. Returns daily interaction trends.

Example:

```bash
fastmoss call --tool video_data_trends --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### video_detail_analysis

Use when the user wants one video basics, plays, engagement, interaction rate, IPM, and linked products.

Example:

```bash
fastmoss call --tool video_detail_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### video_script_info

Use when the user wants video subtitles or line-by-line spoken copy. Returns start/end time and text; empty subtitles can fall back to video_desc.

Example:

```bash
fastmoss call --tool video_script_info --args '{"video_id":"value"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| video_id | string | yes | Video ID; use video_search first if only a title/creator is known. |

### video_search

Use when the user has no video_id and provides video keywords, title, or creator. Returns matching videos.

Example:

```bash
fastmoss call --tool video_search --args '{"filter":{},"keywords":"value","lang":"value"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

