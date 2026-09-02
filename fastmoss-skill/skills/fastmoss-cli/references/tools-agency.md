# Agency Tools

> Agency tools for MCN agency search, rankings, profiles, creator collaborations, promoted products, and collaborating-shop analysis.

## Before calling a tool

Run the exact schema lookup before constructing `--args`:

```bash
fastmoss tools --search <tool_name>
```

Use the returned required fields, nesting, types, and enum values. Do not infer them from another tool or move nested fields such as `filter.date_type` to the top level. If live lookup is unavailable, use this packaged reference as the fallback.

## Tool summary

| Tool | Description |
|---|---|
| agency_creator_analysis | Use when the user wants agency creator structure, follower tiers, and individual collaborators. Returns distributions... |
| agency_product_analysis | Use for agency product-category and price-band structure. Use agency_product_list for individual products. |
| agency_product_list | Use when the user wants individual products promoted through an agency. Supports category, price, period, sorting, an... |
| agency_profile_overview | Use when the user wants an agency profile, historical performance, and recent 7/28/90-day data overview. |
| agency_rank_top | Use when the user wants leading MCN agencies in a market. Returns weekly or monthly agency rankings and period perfor... |
| agency_search | Use when the user has an agency name or market clue but no agency_id. Returns matching agencies and recent 7-day perf... |
| agency_shop_analysis | Use when the user wants agency collaborating-shop totals and individual shop performance. |

## Tool details

### agency_creator_analysis

Use when the user wants agency creator structure, follower tiers, and individual collaborators. Returns distributions and a paginated creator list.

Example:

```bash
fastmoss call --tool agency_creator_analysis --args '{"filter":{"agency_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.agency_id | string | yes | Unique MCN agency ID; use agency_search first when only the agency name is known. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### agency_product_analysis

Use for agency product-category and price-band structure. Use agency_product_list for individual products.

Example:

```bash
fastmoss call --tool agency_product_analysis --args '{"filter":{"agency_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.agency_id | string | yes | Unique MCN agency ID; use agency_search first when only the agency name is known. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |

### agency_product_list

Use when the user wants individual products promoted through an agency. Supports category, price, period, sorting, and pagination.

Example:

```bash
fastmoss call --tool agency_product_list --args '{"filter":{"agency_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.agency_id | string | yes | Unique MCN agency ID; use agency_search first when only the agency name is known. |
| filter.maximum_price | number | no | Inclusive product-price upper bound; currency follows the agency market. |
| filter.minimum_price | number | no | Inclusive product-price lower bound; currency follows the agency market. |
| filter.product_category_id | integer | no | Product category ID. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### agency_profile_overview

Use when the user wants an agency profile, historical performance, and recent 7/28/90-day data overview.

Example:

```bash
fastmoss call --tool agency_profile_overview --args '{"filter":{"agency_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.agency_id | string | yes | Unique MCN agency ID; use agency_search first when only the agency name is known. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |

### agency_rank_top

Use when the user wants leading MCN agencies in a market. Returns weekly or monthly agency rankings and period performance.

Example:

```bash
fastmoss call --tool agency_rank_top --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.date_type | string | no | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | no | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### agency_search

Use when the user has an agency name or market clue but no agency_id. Returns matching agencies and recent 7-day performance.

Example:

```bash
fastmoss call --tool agency_search --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| filter.search_keyword | string | no | Agency-name keyword, maximum 120 characters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### agency_shop_analysis

Use when the user wants agency collaborating-shop totals and individual shop performance.

Example:

```bash
fastmoss call --tool agency_shop_analysis --args '{"filter":{"agency_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.agency_id | string | yes | Unique MCN agency ID; use agency_search first when only the agency name is known. |
| filter.product_category_id | integer | no | Product category ID. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |
