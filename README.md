# FastMoss CLI

[中文文档](./README.zh-CN.md)

FastMoss CLI lets terminals and AI agents discover and call FastMoss MCP tools for TikTok Shop product research, creator discovery, shop analysis, ad analysis, market insight, video/live analysis, and FastMoss knowledge-base lookup.

The public release repository contains everything needed for GitHub clone installation, GitHub Release bundles, and npm publishing inputs.

<!-- FASTMOSS_INSTALLATION_START -->
## Installation

The CLI and Agent Skill are independent. Installing either one never installs the other.

### npm

Install only the CLI:

```bash
npm install -g @fastmoss/cli@latest
```

Run it temporarily without a global install:

```bash
npx -y @fastmoss/cli@latest
```

Install or update only the Agent Skill:

```bash
npx -y @fastmoss/skill@latest
```

The Skill command is non-interactive, so it can be pasted into an Agent conversation for the Agent to execute. By default it installs `fastmoss-cli` for Codex, Claude, and generic Agents, then prints the installed `SKILL.md` paths and a current-conversation handoff.

Target or remove a specific installation:

```bash
npx -y @fastmoss/skill@latest --agent codex
npx -y @fastmoss/skill@latest --agent claude
npx -y @fastmoss/skill@latest --agent agents
npx -y @fastmoss/skill@latest --agent all
npx -y @fastmoss/skill@latest uninstall --agent all
```

Set `FASTMOSS_SKILL_DIR` to install into one custom skills root. npm installation uses only the configured npm registry and does not download from GitHub.

### GitHub clone

```bash
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
./install.sh --cli
./install.sh --skill
./install.sh --all
```

On Windows PowerShell:

```powershell
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
.\install.ps1 -Cli
.\install.ps1 -Skill
.\install.ps1 -All
```

`--all` and `-All` run the two independent installers in sequence. Clone and GitHub Release bundles install only from local files after download; they do not invoke npm or fetch additional files.
<!-- FASTMOSS_INSTALLATION_END -->

## API Key and Credits

FastMoss tool calls require an API key and consume credits. Visit the [FastMoss Developer Platform](https://developers.fastmoss.com/mcp/overview.html) to sign in, create an MCP API key, view usage, and manage credits.

Typical setup:

```bash
fastmoss login
fastmoss whoami
```

`fastmoss login` securely reads the API key from a real terminal with echo
disabled. The legacy `fastmoss login --api-key <value>` form remains available
for existing trusted automation, but should not be used for interactive login.

## Commands

```bash
fastmoss --version
fastmoss help
fastmoss tools
fastmoss tools --json
fastmoss call --tool <tool_name> --args '<json>' --output mcp
```

Use `--output mcp` when an LLM or agent will read the result. Use `--output data` for concise terminal output.

## CLI Tool Catalog

### Advertising Tools

| Tool | Description |
|---|---|
| `ad_data_overview` | View a video's ad spend, ROAS, reach, engagement, followers, and commerce performance over time. |
| `ad_search` | Find active ads by market, category, landing page, spend, ROAS, reach, or run duration. |

### Agency Tools

| Tool | Description |
|---|---|
| `agency_creator_analysis` | Analyze an agency's creator mix, follower tiers, and collaborators. |
| `agency_product_analysis` | Analyze an agency's promoted product categories and price bands. |
| `agency_product_list` | List products promoted by an agency with category, price, period, and ranking filters. |
| `agency_profile_overview` | View an agency profile and recent 7/28/90-day performance. |
| `agency_rank_top` | Rank leading MCN agencies by weekly or monthly performance. |
| `agency_search` | Find agencies by name or market clue. |
| `agency_shop_analysis` | Analyze an agency's collaborating shops and their performance. |

### Creator Tools

| Tool | Description |
|---|---|
| `creator_cargo_summary` | Compare a creator's video and live selling mix and promoted categories. |
| `creator_data_trends` | Track creator follower, engagement, and commerce trends. |
| `creator_fans_distribution` | Analyze a creator audience by age, gender, location, and segments. |
| `creator_product_list` | List products promoted by a creator with GMV, sales, price, commission, and shop data. |
| `creator_profile_overview` | View a creator profile and historical performance snapshot. |
| `creator_rank_top_ecommerce` | Rank top ecommerce creators. |
| `creator_rank_top_growth` | Rank fast-growing creators. |
| `creator_rank_top_potential` | Find creators with ecommerce potential. |
| `creator_search` | Find creators by nickname, keyword, niche, or market. |
| `creator_video_analysis` | Analyze creator content direction, tags, videos, and linked products. |

### Product Tools

| Tool | Description |
|---|---|
| `product_category_info` | Get the TikTok Shop product category tree and hierarchy. |
| `product_creator_analysis` | Analyze creators who promote a product and their contribution. |
| `product_detail_info` | Get product, shop, price, rating, logistics, image, and ad details. |
| `product_investment` | Analyze a product's ad spend, ROAS, ad GMV, and paid-traffic trends. |
| `product_overview` | Analyze product channels, lifecycle, momentum, and organic versus ad mix. |
| `product_rank_new_listed` | Find popular products listed within the last 30 days. |
| `product_rank_top_selling` | Rank bestselling products and compare sales growth. |
| `product_review_list` | Get product reviews and buyer feedback. |
| `product_sales_trend` | Track product GMV and unit-sales trends. |
| `product_search` | Find products by name, keyword, price, category, or market signal. |
| `product_sku` | Analyze SKU sales share, inventory share, and SKU health. |
| `product_video_list` | Find videos selling a product and compare paid versus organic traffic. |

### Shop Tools

| Tool | Description |
|---|---|
| `shop_base_info` | View a shop profile, ratings, cumulative sales, ranks, and operating scale. |
| `shop_creator_analysis` | Analyze shop collaborators, creator tiers, and selling structure. |
| `shop_data_trends` | Track shop GMV, sales, creator, live, video, and product trends. |
| `shop_investment_analysis` | Analyze shop advertising spend, ROAS, ad GMV, and promoted assets. |
| `shop_live_analysis` | Analyze shop live performance and individual live sessions. |
| `shop_product_analysis` | Analyze shop categories, price bands, product mix, and products. |
| `shop_rank_top_selling` | Rank top-selling shops by market or category. |
| `shop_sale_analysis` | Analyze shop sales by video, live, product card, creator, and self-operated channels. |
| `shop_search` | Find shops by name, keyword, or market. |
| `shop_video_analysis` | Analyze shop selling videos, performance, and ad status. |

### Market Insight Tools

| Tool | Description |
|---|---|
| `market_category_analysis` | Analyze category size, growth, competition, opportunity, sales trends, and price distribution. |
| `market_category_author_sales_matrix` | Analyze category sales contribution by creator follower tier. |
| `market_category_ranking` | Rank categories and analyze growth and concentration. |

### Auxiliary and Knowledge Base Tools

| Tool | Description |
|---|---|
| `fastmoss_detail_url_examples` | Get FastMoss detail-page URL templates for products, creators, shops, videos, and lives. |
| `live_detail_analysis` | Analyze a live session, creator, performance, and category breakdown. |
| `live_products_list` | List products sold in a live session and their GMV and unit sales. |
| `live_search` | Find live sessions by title, host, or shop. |
| `search_category_by_words` | Match a natural-language product term to TikTok Shop categories. |
| `search_fastmoss_documents` | Search FastMoss documentation, rules, features, and operational guidance. |
| `video_data_trends` | Track a video's plays, likes, comments, and shares over time. |
| `video_detail_analysis` | Analyze a video's basics, reach, engagement, IPM, and linked products. |
| `video_script_info` | Get video subtitles or spoken-script text. |
| `video_search` | Find videos by keyword, title, or creator. |

## Release Contents

- `fastmoss/`: npm source for `@fastmoss/cli`.
- `fastmoss-skill/`: npm source for `@fastmoss/skill`.
- `platform-packages/`: npm source for the five platform binary packages.
- `release-assets/`: GitHub Release binary assets and checksums.
- `skills/fastmoss-cli/`: canonical Agent Skill payload used by GitHub installers and npm packaging.
