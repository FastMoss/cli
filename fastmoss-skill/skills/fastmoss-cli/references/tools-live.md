# Live Tools

> Live-session tools for live search, performance analysis, and product lists.

## Before calling a tool

Run the exact schema lookup before constructing `--args`:

```bash
fastmoss tools --search <tool_name>
```

Use the returned required fields, nesting, types, and enum values. Do not infer them from another tool or move nested fields such as `filter.date_type` to the top level. If live lookup is unavailable, use this packaged reference as the fallback.

## Tool summary

| Tool | Description |
|---|---|
| live_detail_analysis | Use when the user wants one live session info, creator, key performance, and category breakdown. |
| live_products_list | Use when the user wants products sold in a live session or high GMV/units within this live session. Returns live_unit... |
| live_search | Use when the user has no room_id and provides a live title, host, or shop. Returns live, creator, and performance_sum... |

## Tool details

### live_detail_analysis

Use when the user wants one live session info, creator, key performance, and category breakdown.

Example:

```bash
fastmoss call --tool live_detail_analysis --args '{"filter":{"room_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.room_id | string | yes | Live room ID; use live_search first if only a title/host/shop is known. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |

### live_products_list

Use when the user wants products sold in a live session or high GMV/units within this live session. Returns live_units_sold, live_gmv, commission_rate_percent, sales_timeline only when pagesize <= 10, and shop_cumulative_units_sold.

Example:

```bash
fastmoss call --tool live_products_list --args '{"filter":{"room_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.category_id | integer | no | Product category ID; omit it to include all categories. Passing 1 also means all. |
| filter.room_id | string | yes | Live room ID; use live_search first if only a title/host/shop is known. |
| filter.seller_id | string | no | Shop seller_id; omit it to include all shops. Passing 1 also means all. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options; only the first sort rule takes effect. Fields: units_sold, gmv. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10; timeline snapshots are returned only when pagesize <= 10. |

### live_search

Use when the user has no room_id and provides a live title, host, or shop. Returns live, creator, and performance_summary.

Example:

```bash
fastmoss call --tool live_search --args '{"filter":{"start_time":1},"keywords":"value","lang":"value"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.creator_category | integer | no | Creator category ID. |
| filter.follower_range | object | no | Follower count range: {"min": number, "max": number}. |
| filter.follower_range.max | number | no | Maximum value. |
| filter.follower_range.min | number | no | Minimum value. |
| filter.live_type | integer | no | Live type: 1 shop live, 2 creator live. |
| filter.product_category | integer | no | Product category ID. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| filter.room_id | string | no | Live room ID; use live_search first if only a title/host/shop is known. |
| filter.sold_range | object | no | Sold range range in the form {"min": number, "max": number}. |
| filter.sold_range.max | number | no | Maximum value. |
| filter.sold_range.min | number | no | Minimum value. |
| filter.start_time | integer | yes | Start time parameter. |
| filter.viewer_range | object | no | Viewer range range in the form {"min": number, "max": number}. |
| filter.viewer_range.max | number | no | Maximum value. |
| filter.viewer_range.min | number | no | Minimum value. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |
