# Market Insight Tools

> Market insight tools for category size, growth, competition, rankings, opportunities, and creator sales matrix analysis.

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
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. Only the first sort rule takes effect. Use ranking fields such as category_units_sold. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

