# Live Tools

> Tools for finding a live session, inspecting its performance, and listing the products sold during it.

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
