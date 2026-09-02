# Video Tools

> Video tools for video search, performance analysis, trends, and subtitles.

## Before calling a tool

Run the exact schema lookup before constructing `--args`:

```bash
fastmoss tools --search <tool_name>
```

Use the returned required fields, nesting, types, and enum values. Do not infer them from another tool or move nested fields such as `filter.date_type` to the top level. If live lookup is unavailable, use this packaged reference as the fallback.

## Tool summary

| Tool | Description |
|---|---|
| video_data_trends | Use when the user wants one video play, like, comment, or share trends. Returns daily interaction trends. |
| video_detail_analysis | Use when the user wants one video basics, plays, engagement, interaction rate, IPM, and linked products. |
| video_script_info | Use when the user wants video subtitles or line-by-line spoken copy. Returns start/end time and text; empty subtitles... |
| video_search | Use when the user has no video_id and provides video keywords, title, or creator. Returns matching videos. |

## Tool details

### video_data_trends

Use when the user wants one video play, like, comment, or share trends. Returns daily interaction trends.

Example:

```bash
fastmoss call --tool video_data_trends --args '{"filter":{"video_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| filter.video_id | string | yes | Video ID; use video_search first if only a title/creator is known. |

### video_detail_analysis

Use when the user wants one video basics, plays, engagement, interaction rate, IPM, and linked products.

Example:

```bash
fastmoss call --tool video_detail_analysis --args '{"filter":{"video_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.video_id | string | yes | Video ID; use video_search first if only a title/creator is known. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### video_script_info

Use when the user wants video subtitles or line-by-line spoken copy. Returns start/end time and text; empty subtitles can fall back to video_desc.

Example:

```bash
fastmoss call --tool video_script_info --args '{"video_id":"value"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| video_id | string | yes | Video ID; use video_search first if only a title/creator is known. |

### video_search

Use when the user has no video_id and provides video keywords, title, or creator. Returns matching videos.

Example:

```bash
fastmoss call --tool video_search --args '{"filter":{"create_time_range":{}},"keywords":"value","lang":"value"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.create_time_range | object | yes | Creation/publish time range: {"min": unix_timestamp, "max": unix_timestamp}. |
| filter.create_time_range.max | number | no | Maximum value. |
| filter.create_time_range.min | number | no | Minimum value. |
| filter.creator_category_id | integer | no | Creator category ID. |
| filter.creator_uid | integer | no | Creator UID; use creator_search first if only a handle/nickname is known. |
| filter.creator_unique_id | string | no | Creator unique id. |
| filter.digg_count_range | object | no | Digg count range range in the form {"min": number, "max": number}. |
| filter.digg_count_range.max | number | no | Maximum value. |
| filter.digg_count_range.min | number | no | Minimum value. |
| filter.follower_count_range | object | no | Follower count range: {"min": number, "max": number}. |
| filter.follower_count_range.max | number | no | Maximum value. |
| filter.follower_count_range.min | number | no | Minimum value. |
| filter.interact_rate_range | object | no | Interact rate range range in the form {"min": number, "max": number}. |
| filter.interact_rate_range.max | number | no | Maximum value. |
| filter.interact_rate_range.min | number | no | Minimum value. |
| filter.is_ecommerce | boolean | no | Is ecommerce parameter. |
| filter.play_count_range | object | no | Play count range range in the form {"min": number, "max": number}. |
| filter.play_count_range.max | number | no | Maximum value. |
| filter.play_count_range.min | number | no | Minimum value. |
| filter.product_category_id | integer | no | Product category ID. |
| filter.region | string | no | Country or region code, e.g. US, UK, ID. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |
