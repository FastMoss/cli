# Video Tools

> Tools for finding a video, inspecting its performance and trends, and retrieving its subtitles or spoken copy.

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
fastmoss call --tool video_data_trends --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### video_detail_analysis

Use when the user wants one video basics, plays, engagement, interaction rate, IPM, and linked products.

Example:

```bash
fastmoss call --tool video_detail_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
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
fastmoss call --tool video_search --args '{"filter":{},"keywords":"value","lang":"value"}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | no | Filter parameters. |
| keywords | string | no | Search keywords: product, shop, creator, video, live, or category terms. |
| lang | string | no | Language. Default EN_US, optional ZH_CN. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |
