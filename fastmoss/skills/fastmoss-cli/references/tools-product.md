# Product Tools

> Product tools for product search, details, sales trends, creator mix, videos, SKUs, reviews, and ad investment analysis.

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
fastmoss call --tool product_creator_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_detail_info

Use when the user wants product basics, shop, price, rating, logistics, images, or ad status. Returns product and shop; detail_url points to TikTok.

Example:

```bash
fastmoss call --tool product_detail_info --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### product_investment

Use when the user asks about product ads, spend, ROAS, or daily paid-traffic changes. Returns ad_performance_summary and daily_ad_performance_trend; ad_gmv is ad-attributed.

Example:

```bash
fastmoss call --tool product_investment --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### product_overview

Use when the user wants product channel attribution, lifecycle/momentum, or ad-vs-organic structure. Returns period_summary, daily_trend, ads_distribution, channel_distribution, and content_distribution.

Example:

```bash
fastmoss call --tool product_overview --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### product_rank_new_listed

Use when the user wants recently listed hot products. Returns FastMoss new-product ranking, first_3d_gmv/units_sold, and total_gmv/units_sold; new means listed within 30 days.

Example:

```bash
fastmoss call --tool product_rank_new_listed --args '{"filter":{},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_rank_top_selling

Use when the user wants bestsellers or top products. Returns period_gmv/units_sold, total_gmv/units_sold, and units_sold_growth_rate_percent.

Example:

```bash
fastmoss call --tool product_rank_top_selling --args '{"filter":{},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_review_list

Use when the user wants product reviews or buyer feedback. Returns review list and count; supports time_range_days and rating/create_time/review_id sorting.

Example:

```bash
fastmoss call --tool product_review_list --args '{"filter":{},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_sales_trend

Use when the user wants a product GMV/units trend or traction check. Returns period_summary and daily_trend with period_gmv, period_units_sold, daily_gmv, and daily_units_sold.

Example:

```bash
fastmoss call --tool product_sales_trend --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |

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
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### product_sku

Use when the user wants SKU sales share, inventory share, or SKU health. Returns SKU-level sales and inventory shares.

Example:

```bash
fastmoss call --tool product_sku --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### product_video_list

Use when the user wants videos selling a product, high-play videos, or paid-vs-organic video traffic. Filter with is_ad; returns GMV, plays, video_desc, and fastmoss_url.

Example:

```bash
fastmoss call --tool product_video_list --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

