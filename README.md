# FastMoss CLI

[中文文档](./README.zh-CN.md)

FastMoss CLI lets terminals and AI agents discover and call FastMoss MCP tools for TikTok Shop product research, creator discovery, shop analysis, ad analysis, market insight, video/live analysis, and FastMoss knowledge-base lookup.

Use the CLI together with the FastMoss CLI Agent Skill:

- `@fastmoss/cli` installs the `fastmoss` command and executes tool calls.
- `npx skills add FastMoss/cli -y -g` installs the Agent Skill so your agent knows which FastMoss tools exist, when to use them, and how to call them.

For agent workflows, install both:

```bash
npm install -g @fastmoss/cli
npx skills add FastMoss/cli -y -g
```


## About FastMoss

[FastMoss](https://www.fastmoss.com/) is a TikTok data analytics platform for global TikTok brands, merchants, service providers, creators, and operation teams. It helps users understand market trends, discover bestselling categories and products, find creators and agencies, monitor competitor shops, analyze ad investment, and study the livestream ecosystem.

FastMoss provides big-data analytics centered on TikTok and TikTok Shop, covering livestreams, products, shops, creators, ads, videos, music, hashtags, and more. Its data spans major TikTok commercial markets and regions including the United States, United Kingdom, Indonesia, Vietnam, the Philippines, Thailand, Malaysia, Spain, Mexico, France, Germany, Brazil, and others.

## Install

Run without installing:

```bash
npx @fastmoss/cli
```

Install globally:

```bash
npm install -g @fastmoss/cli
fastmoss
```

Update an existing global installation:

```bash
npm install -g @fastmoss/cli@latest
fastmoss --version
```

Update the FastMoss CLI Agent Skill:

```bash
npx skills add FastMoss/cli -y -g
```

After global installation, the command name is `fastmoss`. If your shell prints `command not found: fastmoss`, make sure your npm global bin directory is in `PATH`.

If your npm configuration blocks lifecycle scripts, allow this package's postinstall script to predownload during install:

```bash
npm install -g --allow-scripts=@fastmoss/cli @fastmoss/cli
```

## API Key and Credits

FastMoss tool calls require an API key and consume credits. Visit the [FastMoss Developer Platform](https://developers.fastmoss.com/mcp/overview.html) to sign in, create an MCP API key, view usage, and manage credits.

Typical setup:

```bash
fastmoss login --api-key <your-api-key>
fastmoss whoami
```

If your credits are insufficient, recharge or upgrade from the developer platform billing/pricing pages. Pricing and credit rules are documented in the [FastMoss MCP pricing guide](https://developers.fastmoss.com/mcp/pricing.html).

## Commands

Check version and help:

```bash
fastmoss --version
fastmoss help
```

Authentication and local config:

```bash
fastmoss login --api-key <your-api-key>
fastmoss logout
fastmoss whoami
fastmoss set api-key <your-api-key>
fastmoss clear api-key
fastmoss set language zh
fastmoss set language en
fastmoss show config
fastmoss show auth
```

Discover tools:

```bash
fastmoss tools
fastmoss tools --json
fastmoss tools --search <tool_name>
```

Call tools:

```bash
fastmoss call --tool <tool_name> --args '<json>' --output mcp
fastmoss <tool_name> --args '<json>' --output mcp
```

Use `--output mcp` when an LLM or agent will read the result. Use `--output data` when you want a concise payload for terminal use. Use `--output rpc` only for raw RPC debugging.

Common flags for networked commands:

```bash
--api-key <api-key>
--base-url <url>
--timeout <seconds>
--insecure-skip-tls
```

## Supported Tools

The packaged Agent Skill includes a static tool catalog. Run `fastmoss tools` or `fastmoss tools --json` to check the live tool list available to your account.

| Category | Name | Title |
|---|---|---|
| Advertising | `ad_data_overview` | Ad data overview |
| Advertising | `ad_search` | Ad search |
| Creator | `creator_cargo_summary` | Creator ecommerce summary |
| Creator | `creator_data_trends` | Creator data trends |
| Creator | `creator_fans_distribution` | Creator fans distribution |
| Creator | `creator_product_list` | Creator product list |
| Creator | `creator_profile_overview` | Creator profile overview |
| Creator | `creator_rank_top_ecommerce` | Top ecommerce creators |
| Creator | `creator_rank_top_growth` | Top creator follower growth |
| Creator | `creator_rank_top_potential` | Top potential creators |
| Creator | `creator_search` | Creator search |
| Creator | `creator_video_analysis` | Creator video analysis |
| Auxiliary and knowledge | `fastmoss_detail_url_examples` | FastMoss Detail URL Examples |
| Auxiliary and knowledge | `live_detail_analysis` | Live detail analysis and category breakdown |
| Auxiliary and knowledge | `live_products_list` | Live promoted product list |
| Auxiliary and knowledge | `live_search` | Live search |
| Market insight | `market_category_analysis` | Category market analysis |
| Market insight | `market_category_author_sales_matrix` | Category creator sales matrix |
| Market insight | `market_category_ranking` | Category market ranking |
| Product | `product_category_info` | Product category list |
| Product | `product_creator_analysis` | Product creator analysis and creator list |
| Product | `product_detail_info` | Product detail info |
| Product | `product_investment` | Product ad investment analysis |
| Product | `product_overview` | Product overview |
| Product | `product_rank_new_listed` | New listed product ranking |
| Product | `product_rank_top_selling` | Top selling products |
| Product | `product_review_list` | Product review list |
| Product | `product_sales_trend` | Product sales trend |
| Product | `product_search` | Product search |
| Product | `product_sku` | Product SKU analysis |
| Product | `product_video_list` | Product video list |
| Auxiliary and knowledge | `search_category_by_words` | Search TikTok Product Category by Keywords |
| Auxiliary and knowledge | `search_fastmoss_documents` | FastMoss Knowledge Base Search |
| Shop | `shop_base_info` | Shop base info |
| Shop | `shop_creator_analysis` | Shop creator analysis and creator list |
| Shop | `shop_data_trends` | Shop data trends |
| Shop | `shop_investment_analysis` | Shop ad investment analysis |
| Shop | `shop_live_analysis` | Shop live analysis and live list |
| Shop | `shop_product_analysis` | Shop product analysis and product list |
| Shop | `shop_rank_top_selling` | Top selling shops |
| Shop | `shop_sale_analysis` | Shop sales analysis |
| Shop | `shop_search` | Shop search |
| Shop | `shop_video_analysis` | Shop video analysis and video list |
| Auxiliary and knowledge | `video_data_trends` | Video data trends |
| Auxiliary and knowledge | `video_detail_analysis` | Video detail analysis and product list |
| Auxiliary and knowledge | `video_script_info` | Video subtitle script |
| Auxiliary and knowledge | `video_search` | Video search |

## Binary Download

This package installs the `fastmoss` command. It does not bundle the Go binary itself. Instead, it downloads the matching `fastmoss` binary from GitHub Releases, stores it in a local cache directory, and then forwards all CLI arguments to that binary.

During `npm install`, the package tries to predownload the matching binary for the current platform. If the download fails, installation still completes and the wrapper will retry the download on first run with a visible download message.

The package downloads the current platform's binary from this public GitHub release repository.

If install-time download is blocked or fails, the first `fastmoss` run will download the binary again. You should see output similar to:

```text
Downloading fastmoss 0.1.1 from https://github.com/FastMoss/cli/releases/download/...
```

You can skip the install-time download and let the first run download the binary:

```bash
FASTMOSS_SKIP_DOWNLOAD=1 npm install -g @fastmoss/cli
```

For internal debugging or private release mirrors, override the base URL:

```bash
FASTMOSS_DOWNLOAD_BASE_URL=https://downloads.example.com/releases npx @fastmoss/cli
```

## Cache Directory

The downloaded binary is cached here by default:

```text
~/.fastmoss/bin/<version>/<platform>/
```

Override the cache directory:

```bash
FASTMOSS_CACHE_DIR=/custom/cache/dir npx @fastmoss/cli
```

## Supported Platforms

- macOS `amd64`
- macOS `arm64`
- Linux `amd64`
- Linux `arm64`
- Windows `amd64`

The wrapper will request one of these asset names depending on platform:

- `fastmoss-darwin-amd64`
- `fastmoss-darwin-arm64`
- `fastmoss-linux-amd64`
- `fastmoss-linux-arm64`
- `fastmoss-windows-amd64.exe`
