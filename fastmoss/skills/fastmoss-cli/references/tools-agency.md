# Agency Tools

> Agency tools for MCN agency search, rankings, profiles, creator collaborations, promoted products, and collaborating-shop analysis.

## Tool summary

| Tool | Description |
|---|---|
| agency_creator_analysis | Use when the user wants agency creator structure, follower tiers, and individual collaborators. Returns distributions... |
| agency_product_analysis | Use for agency product-category and price-band structure. Use agency_product_list for individual products. |
| agency_product_list | Use when the user wants individual products promoted through an agency. Supports category, price, period, sorting, an... |
| agency_profile_overview | Use when the user wants an agency profile, historical performance, and recent 7/28/90-day data overview. |
| agency_rank_top | Use when the user wants leading MCN agencies in a market. Returns weekly or monthly agency rankings and period perfor... |
| agency_search | Use when the user has an agency name or market clue but no agency_id. Returns matching agencies and recent 7-day perf... |
| agency_shop_analysis | Use when the user wants agency collaborating-shop totals and individual shop performance. |

## Tool details

### agency_creator_analysis

Use when the user wants agency creator structure, follower tiers, and individual collaborators. Returns distributions and a paginated creator list.

Example:

```bash
fastmoss call --tool agency_creator_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### agency_product_analysis

Use for agency product-category and price-band structure. Use agency_product_list for individual products.

Example:

```bash
fastmoss call --tool agency_product_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### agency_product_list

Use when the user wants individual products promoted through an agency. Supports category, price, period, sorting, and pagination.

Example:

```bash
fastmoss call --tool agency_product_list --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### agency_profile_overview

Use when the user wants an agency profile, historical performance, and recent 7/28/90-day data overview.

Example:

```bash
fastmoss call --tool agency_profile_overview --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |

### agency_rank_top

Use when the user wants leading MCN agencies in a market. Returns weekly or monthly agency rankings and period performance.

Example:

```bash
fastmoss call --tool agency_rank_top --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### agency_search

Use when the user has an agency name or market clue but no agency_id. Returns matching agencies and recent 7-day performance.

Example:

```bash
fastmoss call --tool agency_search --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

### agency_shop_analysis

Use when the user wants agency collaborating-shop totals and individual shop performance.

Example:

```bash
fastmoss call --tool agency_shop_analysis --args '{"filter":{}}' --output mcp
```

Parameters:

| Name | Type | Required | Description |
|---|---|---|---|
| filter | object | yes | Filter parameters. |
| orderby | array | no | Sort options. |
| page | integer | no | Page number. Default 1, max 10. |
| pagesize | integer | no | Page size. Default 10, max 10. |

