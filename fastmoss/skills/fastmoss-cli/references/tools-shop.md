# Shop Tools

> Shop tools for shop search, profile checks, sales, products, creators, livestreams, short videos, and ad investment analysis.

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
fastmoss call --tool shop_base_info --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### shop_creator_analysis

Use when the user wants shop collaborators, creator tiers, or video-vs-live selling structure. Returns creator list and distributions.

Example:

```bash
fastmoss call --tool shop_creator_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_data_trends

Use when the user wants recent shop GMV, units, creator, live, video, or active-product trends. Returns daily trends.

Example:

```bash
fastmoss call --tool shop_data_trends --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### shop_investment_analysis

Use when the user asks about shop ads, spend, ROAS, ad GMV, or promoted assets. Returns ad estimates and daily changes.

Example:

```bash
fastmoss call --tool shop_investment_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### shop_live_analysis

Use when the user wants shop live performance, shop-live vs affiliate-live structure, or live sessions.

Example:

```bash
fastmoss call --tool shop_live_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_product_analysis

Use when the user wants shop categories, price bands, product mix, or product details. Returns distributions and product list.

Example:

```bash
fastmoss call --tool shop_product_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_rank_top_selling

Use when the user wants top shops in a market or category. Returns shop ranking and ecommerce metrics.

Example:

```bash
fastmoss call --tool shop_rank_top_selling --args '{"filter":{},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_sale_analysis

Use when the user wants shop sales by short video, live, product card, creator, or self-operated channels. Returns channel_distribution and content_distribution.

Example:

```bash
fastmoss call --tool shop_sale_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

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
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### shop_video_analysis

Use when the user wants shop selling videos, video performance, or ad status.

Example:

```bash
fastmoss call --tool shop_video_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

