# Creator Tools

> Creator tools for creator search, profile checks, ecommerce performance, audience fit, trends, videos, and partnership evaluation.

## Tool summary

| Tool | Description |
|---|---|
| creator_cargo_summary | Use when the user wants a creator video-vs-live selling split and main promoted categories. |
| creator_data_trends | Use when the user asks about creator follower, engagement, or commerce trends. Select field_type; returns daily serie... |
| creator_fans_distribution | Use when the user wants to check whether a creator audience matches a target market. Returns age, gender, location, a... |
| creator_product_list | Use when the user wants a creator showcase product list. Returns product GMV, units sold, category, price, commission... |
| creator_profile_overview | Use when the user wants a creator snapshot or partnership check. Returns profile and performance_overview; GMV/rankin... |
| creator_rank_top_ecommerce | Use when the user wants top ecommerce creators. Returns creator and ranking_metrics; date_value is returned as YYYY-W... |
| creator_rank_top_growth | Use when the user wants fast-growing creators. Returns creator and growth_metrics; date_value is returned as YYYY-Www... |
| creator_rank_top_potential | Use when the user wants creators with ecommerce potential. Returns creator, potential_metrics, and audience_summary;... |
| creator_search | Use when the user has no UID and provides a nickname, keyword, niche, or region. Returns creator, commerce_summary, a... |
| creator_video_analysis | Use when the user wants creator content direction, tags, and selling videos. Returns video_tag_summary and video_list... |

## Tool details

### creator_cargo_summary

Use when the user wants a creator video-vs-live selling split and main promoted categories.

Example:

```bash
fastmoss call --tool creator_cargo_summary --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### creator_data_trends

Use when the user asks about creator follower, engagement, or commerce trends. Select field_type; returns daily series and period totals.

Example:

```bash
fastmoss call --tool creator_data_trends --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### creator_fans_distribution

Use when the user wants to check whether a creator audience matches a target market. Returns age, gender, location, and top segments.

Example:

```bash
fastmoss call --tool creator_fans_distribution --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### creator_product_list

Use when the user wants a creator showcase product list. Returns product GMV, units sold, category, price, commission, shop info, and time_range_days.

Example:

```bash
fastmoss call --tool creator_product_list --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. Only the first sort rule takes effect. Fields: units_sold, gmv, commission_rate_percent. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_profile_overview

Use when the user wants a creator snapshot or partnership check. Returns profile and performance_overview; GMV/rankings are mostly historical cumulative, so use creator_search day28_gmv for current activity.

Example:

```bash
fastmoss call --tool creator_profile_overview --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### creator_rank_top_ecommerce

Use when the user wants top ecommerce creators. Returns creator and ranking_metrics; date_value is returned as YYYY-Www for weekly rankings.

Example:

```bash
fastmoss call --tool creator_rank_top_ecommerce --args '{"filter":{},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_rank_top_growth

Use when the user wants fast-growing creators. Returns creator and growth_metrics; date_value is returned as YYYY-Www for weekly rankings.

Example:

```bash
fastmoss call --tool creator_rank_top_growth --args '{"filter":{},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_rank_top_potential

Use when the user wants creators with ecommerce potential. Returns creator, potential_metrics, and audience_summary; date_value is returned as YYYY-Www for weekly rankings.

Example:

```bash
fastmoss call --tool creator_rank_top_potential --args '{"filter":{},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_search

Use when the user has no UID and provides a nickname, keyword, niche, or region. Returns creator, commerce_summary, and audience_summary; day28_gmv is the key current-activity metric for tiering; has_email as a boolean, not the email address itself.

Example:

```bash
fastmoss call --tool creator_search --args '{"filter":{},"keywords":"value","orderby":[]}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_video_analysis

Use when the user wants creator content direction, tags, and selling videos. Returns video_tag_summary and video_list with interaction_rate_percent and linked_products so the model does not confuse video performance with product performance.

Example:

```bash
fastmoss call --tool creator_video_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

