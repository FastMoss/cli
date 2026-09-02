# Market Insight Tools

> Market insight tools for category size, growth, competition, rankings, opportunities, and creator sales matrix analysis.

## Before calling a tool

Run the exact schema lookup before constructing `--args`:

```bash
fastmoss tools --search <tool_name>
```

Use the returned required fields, nesting, types, and enum values. Do not infer them from another tool or move nested fields such as `filter.date_type` to the top level. If live lookup is unavailable, use this packaged reference as the fallback.

## Tool summary

| Tool | Description |
|---|---|
| market_category_analysis | Use when the user wants category size, growth, competition, or opportunity. analysis_type basic_metrics returns categ... |
| market_category_author_sales_matrix | Use when the user wants category sales contribution by creator follower_tier. Returns creator_count, category_gmv, gm... |
| market_category_ranking | Use when the user wants category ranking, growth, or concentration. Returns ranking_scope and ranked_categories; no c... |

## Tool details

### market_category_analysis

Use when the user wants category size, growth, competition, or opportunity. analysis_type basic_metrics returns category, scale_metrics, growth_metrics, concentration_metrics; sales_trends returns trend_series; price_distribution returns sales_price_distribution with left-open right-closed price bands and sub_category_units_sold_total.

Example:

```bash
fastmoss call --tool market_category_analysis --args '{"filter":{},"analysis_type":"basic_metrics"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| analysis_type | string | yes | Analysis type parameter. |
| filter | object | yes | Filter parameters. |
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.date_type | string | no | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | no | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |

### market_category_author_sales_matrix

Use when the user wants category sales contribution by creator follower_tier. Returns creator_count, category_gmv, gmv_share_percent, units_sold, and avg_creator_gmv.

Example:

```bash
fastmoss call --tool market_category_author_sales_matrix --args '{"filter":{},"lang":"value"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.date_value | string | no | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| filter.sold_type | integer | no | Sold type parameter. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |

### market_category_ranking

Use when the user wants category ranking, growth, or concentration. Returns ranking_scope and ranked_categories; no category_id means level-1 category ranking, and a level-1 category_id means level-2 subcategory ranking.

Example:

```bash
fastmoss call --tool market_category_ranking --args '{"filter":{},"lang":"value","orderby":[]}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.category_id | integer | no | Parent category ID; omit it or set -100 for level-1 ranking, or pass a level-1 category for level-2 ranking. |
| filter.date_type | string | no | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | no | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. Only the first sort rule takes effect. Use ranking fields such as category_units_sold. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |
