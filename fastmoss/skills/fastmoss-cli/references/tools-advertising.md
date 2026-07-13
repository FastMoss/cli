# Advertising Tools

> Advertising tools for ad creatives, ad spend, ROAS, engagement, and paid-traffic performance analysis.

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
fastmoss call --tool ad_data_overview --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

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
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

