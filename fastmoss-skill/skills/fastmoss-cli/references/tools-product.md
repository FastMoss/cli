# Product Tools

> Product tools for product search, details, sales trends, creator mix, videos, SKUs, reviews, and ad investment analysis.

## Before calling a tool

Run the exact schema lookup before constructing `--args`:

```bash
fastmoss tools --search <tool_name>
```

Use the returned required fields, nesting, types, and enum values. Do not infer them from another tool or move nested fields such as `filter.date_type` to the top level. If live lookup is unavailable, use this packaged reference as the fallback.

## Tool summary

| Tool | Description |
|---|---|
| product_category_info | Use when the user needs the product category tree or category levels. Prefer search_category_by_words for natural-lan... |
| product_creator_analysis | Use when the user wants who sells a product or the creator structure. Returns creator_summary with follower_tier_dist... |
| product_detail_info | Use when the user wants product basics, shop, price, rating, logistics, images, or ad status. Returns product and sho... |
| product_investment | Use when the user asks about product ads, spend, ROAS, or daily paid-traffic changes. Returns ad_performance_summary... |
| product_overview | Use when the user wants product channel attribution, lifecycle/momentum, or ad-vs-organic structure. Returns period_s... |
| product_rank_new_listed | Use when the user wants recently listed hot products. Returns FastMoss new-product ranking, first_3d_gmv/units_sold,... |
| product_rank_top_selling | Use when the user wants bestsellers or top products. Returns period_gmv/units_sold, total_gmv/units_sold, and units_s... |
| product_review_list | Use when the user wants product reviews or buyer feedback. Returns review list and count; supports time_range_days an... |
| product_sales_trend | Use when the user wants a product GMV/units trend or traction check. Returns period_summary and daily_trend with peri... |
| product_search | Use when the user has no product_id and provides a name, keyword, price band, category, bestseller clue, or new-produ... |
| product_sku | Use when the user wants SKU sales share, inventory share, or SKU health. Returns SKU-level sales and inventory shares. |
| product_video_list | Use when the user wants videos selling a product, high-play videos, or paid-vs-organic video traffic. Filter with is_... |

## Tool details

### product_category_info

Use when the user needs the product category tree or category levels. Prefer search_category_by_words for natural-language category terms.

Example:

```bash
fastmoss call --tool product_category_info --args '{}' --output mcp
```

Parameters: none documented.

### product_creator_analysis

Use when the user wants who sells a product or the creator structure. Returns creator_summary with follower_tier_distribution and creator_category_distribution, plus linked_creators with creator, product_contribution, creator_cumulative_performance, and audience_summary.

Example:

```bash
fastmoss call --tool product_creator_analysis --args '{"filter":{"product_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.product_id | string | yes | Product ID; use product_search first if only a product name is known. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_detail_info

Use when the user wants product basics, shop, price, rating, logistics, images, or ad status. Returns product and shop; detail_url points to TikTok.

Example:

```bash
fastmoss call --tool product_detail_info --args '{"filter":{"product_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.product_id | string | yes | Product ID; use product_search first if only a product name is known. |

### product_investment

Use when the user asks about product ads, spend, ROAS, or daily paid-traffic changes. Returns ad_performance_summary and daily_ad_performance_trend; ad_gmv is ad-attributed.

Example:

```bash
fastmoss call --tool product_investment --args '{"filter":{"product_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.product_id | string | yes | Product ID; use product_search first if only a product name is known. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |

### product_overview

Use when the user wants product channel attribution, lifecycle/momentum, or ad-vs-organic structure. Returns period_summary, daily_trend, ads_distribution, channel_distribution, and content_distribution.

Example:

```bash
fastmoss call --tool product_overview --args '{"filter":{"product_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.product_id | string | yes | Product ID; use product_search first if only a product name is known. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |

### product_rank_new_listed

Use when the user wants recently listed hot products. Returns FastMoss new-product ranking, first_3d_gmv/units_sold, and total_gmv/units_sold; new means listed within 30 days.

Example:

```bash
fastmoss call --tool product_rank_new_listed --args '{"filter":{"date_type":"week","date_value":"2025-W01"},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.date_type | string | yes | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | yes | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.is_cross_border | boolean | no | Whether it is cross-border. |
| filter.is_fully_managed | boolean | no | Whether it is fully managed. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_rank_top_selling

Use when the user wants bestsellers or top products. Returns period_gmv/units_sold, total_gmv/units_sold, and units_sold_growth_rate_percent.

Example:

```bash
fastmoss call --tool product_rank_top_selling --args '{"filter":{"date_type":"week","date_value":"2025-W01"},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.date_type | string | yes | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | yes | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_review_list

Use when the user wants product reviews or buyer feedback. Returns review list and count; supports time_range_days and rating/create_time/review_id sorting.

Example:

```bash
fastmoss call --tool product_review_list --args '{"filter":{"product_id":"value"},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.product_id | string | yes | Product ID; use product_search first if only a product name is known. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_sales_trend

Use when the user wants a product GMV/units trend or traction check. Returns period_summary and daily_trend with period_gmv, period_units_sold, daily_gmv, and daily_units_sold.

Example:

```bash
fastmoss call --tool product_sales_trend --args '{"filter":{"product_id":"value","time_range_days":1}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.product_id | string | yes | Product ID; use product_search first if only a product name is known. |
| filter.time_range_days | integer | yes | Days: 7/14/28/90; recent=28; -1=cumulative. |

### product_search

Use when the user has no product_id and provides a name, keyword, price band, category, bestseller clue, or new-product clue. Returns product, sales_summary, distribution_summary, and shop.

Example:

```bash
fastmoss call --tool product_search --args '{"filter":{},"keywords":"value","orderby":[]}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.category_path | array | no | Category path from level 1 to level 3, e.g. [100, 200, 300]. |
| filter.commission_rate_range | object | no | Commission-rate range: {"min": number, "max": number}. |
| filter.commission_rate_range.max | number | no | Maximum value. |
| filter.commission_rate_range.min | number | no | Minimum value. |
| filter.creator_count_range | object | no | Creator count range range in the form {"min": number, "max": number}. |
| filter.creator_count_range.max | number | no | Maximum value. |
| filter.creator_count_range.min | number | no | Minimum value. |
| filter.day28_gmv_range | object | no | Last-28-day GMV range; maps to day28_sale_amount. |
| filter.day28_gmv_range.max | number | no | Maximum value. |
| filter.day28_gmv_range.min | number | no | Minimum value. |
| filter.day28_units_sold_range | object | no | Last-28-day units-sold range; maps to day28_sold_count. |
| filter.day28_units_sold_range.max | number | no | Maximum value. |
| filter.day28_units_sold_range.min | number | no | Minimum value. |
| filter.day7_gmv_range | object | no | Last-7-day GMV range; maps to day7_sale_amount. |
| filter.day7_gmv_range.max | number | no | Maximum value. |
| filter.day7_gmv_range.min | number | no | Minimum value. |
| filter.day7_units_sold_range | object | no | Last-7-day units-sold range; maps to day7_sold_count. |
| filter.day7_units_sold_range.max | number | no | Maximum value. |
| filter.day7_units_sold_range.min | number | no | Minimum value. |
| filter.floor_price_range | object | no | Product price range: {"min": number, "max": number}. |
| filter.floor_price_range.max | number | no | Maximum value. |
| filter.floor_price_range.min | number | no | Minimum value. |
| filter.is_cross_border | boolean | no | Whether it is cross-border. |
| filter.is_free_shipping | boolean | no | Is free shipping parameter. |
| filter.is_fully_managed | boolean | no | Whether it is fully managed. |
| filter.is_local_warehouse | boolean | no | Is local warehouse parameter. |
| filter.is_new_listed | boolean | no | Is new listed parameter. |
| filter.is_sshop | boolean | no | Whether it is fully managed. |
| filter.is_top_selling | boolean | no | Is top selling parameter. |
| filter.product_id | string | no | Product ID; use product_search first if only a product name is known. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| filter.shop_type | integer | no | Shop type: 1 local, 2 cross-border; deprecated. |
| filter.total_gmv_range | object | no | Total GMV range; maps to sale_amount. |
| filter.total_gmv_range.max | number | no | Maximum value. |
| filter.total_gmv_range.min | number | no | Minimum value. |
| filter.units_sold_range | object | no | Units sold range range in the form {"min": number, "max": number}. |
| filter.units_sold_range.max | number | no | Maximum value. |
| filter.units_sold_range.min | number | no | Minimum value. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_sku

Use when the user wants SKU sales share, inventory share, or SKU health. Returns SKU-level sales and inventory shares.

Example:

```bash
fastmoss call --tool product_sku --args '{"filter":{"product_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.product_id | string | yes | Product ID; use product_search first if only a product name is known. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |

### product_video_list

Use when the user wants videos selling a product, high-play videos, or paid-vs-organic video traffic. Filter with is_ad; returns GMV, plays, video_desc, and fastmoss_url.

Example:

```bash
fastmoss call --tool product_video_list --args '{"filter":{"product_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.create_time_range | object | no | Creation/publish time range: {"min": unix_timestamp, "max": unix_timestamp}. |
| filter.create_time_range.max | number | no | - |
| filter.create_time_range.min | number | no | - |
| filter.is_ad | boolean | no | Whether it uses ad traffic. |
| filter.product_id | string | yes | Product ID; use product_search first if only a product name is known. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |
