# Advertising Tools

> Advertising tools for ad creatives, ad spend, ROAS, engagement, and paid-traffic performance analysis.

## Before calling a tool

Run the exact schema lookup before constructing `--args`:

```bash
fastmoss tools --search <tool_name>
```

Use the returned required fields, nesting, types, and enum values. Do not infer them from another tool or move nested fields such as `filter.date_type` to the top level. If live lookup is unavailable, use this packaged reference as the fallback.

## Tool summary

| Tool | Description |
|---|---|
| ad_data_overview | Use when the user has a video_id and wants ad spend, ROAS, play, engagement, follower, and commerce performance over... |
| ad_search | Use when the user wants active ad creatives or needs to filter ads by country, category, landing page, spend, ROAS, p... |

## Tool details

### ad_data_overview

Use when the user has a video_id and wants ad spend, ROAS, play, engagement, follower, and commerce performance over a date range.

Example:

```bash
fastmoss call --tool ad_data_overview --args '{"filter":{"video_id":"value"}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| filter.end_date | string | no | End date, YYYY-MM-DD. |
| filter.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.time_range_days | integer | no | Days: 7/14/28/90; recent=28; -1=cumulative. |
| filter.video_id | string | yes | Video ID; use video_search first if only a title/creator is known. |

### ad_search

Use when the user wants active ad creatives or needs to filter ads by country, category, landing page, spend, ROAS, plays, or run days. Returns ad, creator, shop, products, and performance sections.

Example:

```bash
fastmoss call --tool ad_search --args '{"filter":{},"orderby":[],"page":1}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| filter.ad_type | integer | no | Ad type: 1 TikTok Shop commerce ad, 2 non-commerce/planting ad. |
| filter.category_l1_id | integer | no | Level-1 product category ID. |
| filter.category_l2_id | integer | no | Level-2 product category ID. |
| filter.category_l3_id | integer | no | Level-3 product category ID. |
| filter.estimated_ad_spend_range | object | no | Estimated ad spend range in the form {"min": number, "max": number}. |
| filter.estimated_ad_spend_range.max | number | no | Maximum value. |
| filter.estimated_ad_spend_range.min | number | no | Minimum value. |
| filter.keywords | string | no | Search keywords for ad caption, product, creator, or shop clues. |
| filter.last_seen_ad_date_range | object | no | Last-seen ad date range in the form {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}. |
| filter.last_seen_ad_date_range.end_date | string | no | End date, YYYY-MM-DD. |
| filter.last_seen_ad_date_range.start_date | string | no | Start date, YYYY-MM-DD. |
| filter.observed_active_days_range | object | no | Range for the number of days the ad was observed as active, in the form {"min": number, "max": number}. |
| filter.observed_active_days_range.max | number | no | Maximum value. |
| filter.observed_active_days_range.min | number | no | Minimum value. |
| filter.play_count_range | object | no | Video play-count range in the form {"min": number, "max": number}. |
| filter.play_count_range.max | number | no | Maximum value. |
| filter.play_count_range.min | number | no | Minimum value. |
| filter.region | string | no | Country or region code where the ad is detected, e.g. US, ID, VN. |
| filter.roas_range | object | no | ROAS range in the form {"min": number, "max": number}. |
| filter.roas_range.max | number | no | Maximum value. |
| filter.roas_range.min | number | no | Minimum value. |
| filter.video_create_date_range | object | no | Video publish-date range in the form {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}. |
| filter.video_create_date_range.end_date | string | no | End date, YYYY-MM-DD. |
| filter.video_create_date_range.start_date | string | no | Start date, YYYY-MM-DD. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |
