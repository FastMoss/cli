# Shop Tools

> Shop tools for shop search, profile checks, sales, products, creators, livestreams, short videos, and ad investment analysis.

## Before calling a tool

Run the exact schema lookup before constructing `--args`:

```bash
fastmoss tools --search <tool_name>
```

Use the returned required fields, nesting, types, and enum values. Do not infer them from another tool or move nested fields such as `filter.date_type` to the top level. If live lookup is unavailable, use this packaged reference as the fallback.

## Tool summary

| Tool | Description |
|---|---|
| shop_base_info | Use when the user wants a shop snapshot, store type, rating, or profile. Returns cumulative GMV/units, ranks, age, pr... |
| shop_creator_analysis | Use when the user wants shop collaborators, creator tiers, or video-vs-live selling structure. Returns creator list a... |
| shop_data_trends | Use when the user wants recent shop GMV, units, creator, live, video, or active-product trends. Returns daily trends. |
| shop_investment_analysis | Use when the user asks about shop ads, spend, ROAS, ad GMV, or promoted assets. Returns ad estimates and daily changes. |
| shop_live_analysis | Use when the user wants shop live performance, shop-live vs affiliate-live structure, or live sessions. |
| shop_product_analysis | Use when the user wants shop categories, price bands, product mix, or product details. Returns distributions and prod... |
| shop_rank_top_selling | Use when the user wants top shops in a market or category. Returns shop ranking and ecommerce metrics. |
| shop_sale_analysis | Use when the user wants shop sales by short video, live, product card, creator, or self-operated channels. Returns ch... |
| shop_search | Use when the user has no seller_id and provides a shop name, keyword, or region. Returns matching shops. |
| shop_video_analysis | Use when the user wants shop selling videos, video performance, or ad status. |

## Tool details

### shop_base_info

Use when the user wants a shop snapshot, store type, rating, or profile. Returns cumulative GMV/units, ranks, age, product count, and creator/video/live counts.

Example:

```bash
fastmoss call --tool shop_base_info --args '{"filter":{"seller_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.seller_id | string | yes | Shop seller_id; use shop_search first if only a shop name is known. |

### shop_creator_analysis

Use when the user wants shop collaborators, creator tiers, or video-vs-live selling structure. Returns creator list and distributions.

Example:

```bash
fastmoss call --tool shop_creator_analysis --args '{"filter":{"seller_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.author_product_type | integer | no | Selling mode: 1 video, 2 live. |
| filter.follower_count_range | object | no | Follower count range: {"min": number, "max": number}. |
| filter.follower_count_range.max | number | no | Maximum value. |
| filter.follower_count_range.min | number | no | Minimum value. |
| filter.seller_id | string | yes | Shop seller_id; use shop_search first if only a shop name is known. |
| filter.sold_count_range | object | no | Units sold range: {"min": number, "max": number}. |
| filter.sold_count_range.max | number | no | Maximum value. |
| filter.sold_count_range.min | number | no | Minimum value. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_data_trends

Use when the user wants recent shop GMV, units, creator, live, video, or active-product trends. Returns daily trends.

Example:

```bash
fastmoss call --tool shop_data_trends --args '{"filter":{"seller_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.seller_id | string | yes | Shop seller_id; use shop_search first if only a shop name is known. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |

### shop_investment_analysis

Use when the user asks about shop ads, spend, ROAS, ad GMV, or promoted assets. Returns ad estimates and daily changes.

Example:

```bash
fastmoss call --tool shop_investment_analysis --args '{"filter":{"seller_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.seller_id | string | yes | Shop seller_id; use shop_search first if only a shop name is known. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |

### shop_live_analysis

Use when the user wants shop live performance, shop-live vs affiliate-live structure, or live sessions.

Example:

```bash
fastmoss call --tool shop_live_analysis --args '{"filter":{"seller_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.is_shop | integer | no | Live type: 0 all, 1 shop live, 2 affiliate live. |
| filter.seller_id | string | yes | Shop seller_id; use shop_search first if only a shop name is known. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_product_analysis

Use when the user wants shop categories, price bands, product mix, or product details. Returns distributions and product list.

Example:

```bash
fastmoss call --tool shop_product_analysis --args '{"filter":{"seller_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.listing_time_range_days | integer | no | Listing age in days, commonly 7/14/28/90. |
| filter.seller_id | string | yes | Shop seller_id; use shop_search first if only a shop name is known. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_rank_top_selling

Use when the user wants top shops in a market or category. Returns shop ranking and ecommerce metrics.

Example:

```bash
fastmoss call --tool shop_rank_top_selling --args '{"filter":{"date_type":"week","date_value":"2025-W01"},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.date_type | string | yes | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | yes | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.is_cross_border | boolean | no | Whether it is cross-border. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| filter.shop_type | integer | no | Shop type: 1 brand shop, 2 retail shop. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_sale_analysis

Use when the user wants shop sales by short video, live, product card, creator, or self-operated channels. Returns channel_distribution and content_distribution.

Example:

```bash
fastmoss call --tool shop_sale_analysis --args '{"filter":{"seller_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.seller_id | string | yes | Shop seller_id; use shop_search first if only a shop name is known. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |

### shop_search

Use when the user has no seller_id and provides a shop name, keyword, or region. Returns matching shops.

Example:

```bash
fastmoss call --tool shop_search --args '{"filter":{},"keywords":"value","orderby":[]}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.brand_name | string | no | Brand name parameter. |
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.creator_range | object | no | Creator count range: {"min": number, "max": number}. |
| filter.creator_range.max | number | no | Maximum value. |
| filter.creator_range.min | number | no | Minimum value. |
| filter.creator_uid | string | no | Creator UID; use creator_search first if only a handle/nickname is known. |
| filter.creator_unique_id | string | no | Creator unique id. |
| filter.is_fully_managed | boolean | no | Whether it is fully managed. |
| filter.is_local | boolean | no | Is local parameter. |
| filter.rating_range | object | no | Rating range range in the form {"min": number, "max": number}. |
| filter.rating_range.max | number | no | Maximum value. |
| filter.rating_range.min | number | no | Minimum value. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| filter.seller_id | string | no | Shop seller_id; use shop_search first if only a shop name is known. |
| filter.shop_name | string | no | Shop name parameter. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_video_analysis

Use when the user wants shop selling videos, video performance, or ad status.

Example:

```bash
fastmoss call --tool shop_video_analysis --args '{"filter":{"seller_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.is_ad | boolean | no | Whether it uses ad traffic. |
| filter.publish_time_range_days | integer | no | Video publish age in days, commonly 7/28/90. |
| filter.seller_id | string | yes | Shop seller_id; use shop_search first if only a shop name is known. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |
