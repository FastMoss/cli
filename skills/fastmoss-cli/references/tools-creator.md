# Creator Tools

> Creator tools for creator search, profile checks, ecommerce performance, audience fit, trends, videos, and partnership evaluation.

## Before calling a tool

Run the exact schema lookup before constructing `--args`:

```bash
fastmoss tools --search <tool_name>
```

Use the returned required fields, nesting, types, and enum values. Do not infer them from another tool or move nested fields such as `filter.date_type` to the top level. If live lookup is unavailable, use this packaged reference as the fallback.

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
fastmoss call --tool creator_cargo_summary --args '{"filter":{"uid":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.uid | string | yes | Creator UID; use creator_search first if only a handle/nickname is known. |

### creator_data_trends

Use when the user asks about creator follower, engagement, or commerce trends. Select field_type; returns daily series and period totals.

Example:

```bash
fastmoss call --tool creator_data_trends --args '{"filter":{"uid":"value","field_type":"follower_change"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.date_type | integer | no | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.field_type | string | yes | Metric: follower_change/play/like/comment/collect_count/share/units_sold/gmv; video_*=video commerce, live_*=live commerce, showcase_*=showcase commerce. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.uid | string | yes | Creator UID; use creator_search first if only a handle/nickname is known. |

### creator_fans_distribution

Use when the user wants to check whether a creator audience matches a target market. Returns age, gender, location, and top segments.

Example:

```bash
fastmoss call --tool creator_fans_distribution --args '{"filter":{"uid":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.uid | string | yes | Creator UID; use creator_search first if only a handle/nickname is known. |

### creator_product_list

Use when the user wants a creator showcase product list. Returns product GMV, units sold, category, price, commission, shop info, and time_range_days.

Example:

```bash
fastmoss call --tool creator_product_list --args '{"filter":{"uid":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.time_range_days | string | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| filter.uid | string | yes | Creator UID; use creator_search first if only a handle/nickname is known. |
| orderby | array | no | Sort options. Only the first sort rule takes effect. Fields: units_sold, gmv, commission_rate_percent. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_profile_overview

Use when the user wants a creator snapshot or partnership check. Returns profile and performance_overview; GMV/rankings are mostly historical cumulative, so use creator_search day28_gmv for current activity.

Example:

```bash
fastmoss call --tool creator_profile_overview --args '{"filter":{"uid":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.lang | string | no | Language. Default EN_US, optional ZH_CN. |
| filter.uid | string | yes | Creator UID; use creator_search first if only a handle/nickname is known. |

### creator_rank_top_ecommerce

Use when the user wants top ecommerce creators. Returns creator and ranking_metrics; date_value is returned as YYYY-Www for weekly rankings.

Example:

```bash
fastmoss call --tool creator_rank_top_ecommerce --args '{"filter":{"date_type":"week","date_value":"2025-W01"},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.account_type | integer | no | Account type parameter. |
| filter.creator_category_id | integer | no | Creator category ID. |
| filter.date_type | string | yes | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | yes | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.ecommerce_type | integer | no | Ecommerce type parameter. |
| filter.product_category_id | integer | no | Product category ID. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_rank_top_growth

Use when the user wants fast-growing creators. Returns creator and growth_metrics; date_value is returned as YYYY-Www for weekly rankings.

Example:

```bash
fastmoss call --tool creator_rank_top_growth --args '{"filter":{"date_type":"week","date_value":"2025-W01"},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.date_type | string | yes | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | yes | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| filter.verify_type | integer | no | Verification type: 1 regular creators, 2 Blue V creators. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_rank_top_potential

Use when the user wants creators with ecommerce potential. Returns creator, potential_metrics, and audience_summary; date_value is returned as YYYY-Www for weekly rankings.

Example:

```bash
fastmoss call --tool creator_rank_top_potential --args '{"filter":{"date_type":"week","date_value":"2025-W01"},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.category_path | array | no | Category path from level 1 to level 3, e.g. [100, 200, 300]. |
| filter.creator_category_id | integer | no | Creator category ID. |
| filter.date_type | string | yes | Ranking period: day, week, or month; MCN agency rankings support only week/month. |
| filter.date_value | string | yes | Completed period only: yesterday YYYY-MM-DD, last week YYYY-ww or YYYY-Www, last month YYYY-MM; do not use the current period. |
| filter.ecommerce_type | integer | no | Ecommerce type parameter. |
| filter.follower_age_type | object | no | Follower age: 1=18-24, 2=25-34, 3=35+. |
| filter.follower_count_range | object | no | Follower count range: {"min": number, "max": number}. |
| filter.follower_count_range.max | number | no | Maximum value. |
| filter.follower_count_range.min | number | no | Minimum value. |
| filter.follower_gender_type | integer | no | Follower gender type parameter. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
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
| filter.category_id | integer | no | Category ID; confirm category first if only a category name is known. |
| filter.creator_type | integer | no | Creator type: 1 personal, 2 shop. |
| filter.follower_age_type | integer | no | Follower age: 1=18-24, 2=25-34, 3=35+. |
| filter.follower_gender_type | integer | no | Follower gender type parameter. |
| filter.follower_range | object | no | Follower count range: {"min": number, "max": number}. |
| filter.follower_range.max | number | no | Maximum value. |
| filter.follower_range.min | number | no | Minimum value. |
| filter.is_ecommerce_creator | boolean | no | Is ecommerce creator parameter. |
| filter.is_mcn_creator | boolean | no | Is mcn creator parameter. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| filter.uid | string | no | Creator UID; use creator_search first if only a handle/nickname is known. |
| filter.unique_id | string | no | Unique id. |
| filter.verify_type | integer | no | Verification type: 1 regular creators, 2 Blue V creators. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### creator_video_analysis

Use when the user wants creator content direction, tags, and selling videos. Returns video_tag_summary and video_list with interaction_rate_percent and linked_products so the model does not confuse video performance with product performance.

Example:

```bash
fastmoss call --tool creator_video_analysis --args '{"filter":{"uid":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.orderby | array | no | Sort options. |
| filter.page | integer | no | Page number. Default 1, max 10. |
| filter.pagesize | integer | no | Page size. Default 10, max 10. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| filter.type | string | no | Type parameter. |
| filter.uid | string | yes | Creator UID; use creator_search first if only a handle/nickname is known. |
