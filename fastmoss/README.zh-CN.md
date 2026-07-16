# @fastmoss/cli

[English](./README.md)

`@fastmoss/cli` 只安装 `fastmoss` 命令。npm 包会解析精确同版本的平台包，安装时和运行时都不会下载二进制文件。

<!-- FASTMOSS_INSTALLATION_START -->
## 安装

CLI 与 Agent Skill 相互独立，安装其中一个不会自动安装另一个。

### npm

只安装 CLI：

```bash
npm install -g @fastmoss/cli@latest
```

不做全局安装，临时运行 CLI：

```bash
npx -y @fastmoss/cli@latest
```

只安装或更新 Agent Skill：

```bash
npx -y @fastmoss/skill@latest
```

Skill 命令全程非交互，可以直接发送到 Agent 聊天框由 Agent 执行。默认会把 `fastmoss-cli` 安装到 Codex、Claude 和通用 Agents 三个目录，并输出实际 `SKILL.md` 路径和当前会话加载提示。

指定 Agent 或卸载：

```bash
npx -y @fastmoss/skill@latest --agent codex
npx -y @fastmoss/skill@latest --agent claude
npx -y @fastmoss/skill@latest --agent agents
npx -y @fastmoss/skill@latest --agent all
npx -y @fastmoss/skill@latest uninstall --agent all
```

设置 `FASTMOSS_SKILL_DIR` 后只安装到一个自定义 skills 根目录。npm 安装只使用用户配置的 npm registry，不会从 GitHub 下载文件。

### GitHub clone

```bash
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
./install.sh --cli
./install.sh --skill
./install.sh --all
```

Windows PowerShell：

```powershell
git clone --depth 1 https://github.com/FastMoss/cli.git
cd cli
.\install.ps1 -Cli
.\install.ps1 -Skill
.\install.ps1 -All
```

`--all` 和 `-All` 只是依次执行两个独立安装动作。clone 或下载 GitHub Release 离线包后，安装过程只读取本地文件，不调用 npm，也不继续下载其他文件。
<!-- FASTMOSS_INSTALLATION_END -->

## 使用

```bash
fastmoss --version
fastmoss help
fastmoss login --api-key <your-api-key>
fastmoss tools
fastmoss call --tool <tool_name> --args '<json>' --output mcp
```

## CLI Tool Catalog

### Advertising Tools

| Tool | Description |
|---|---|
| `ad_data_overview` | Use when the user has a video_id and wants ad spend, ROAS, play, engagement, follower, and commerce performance over a date range. |
| `ad_search` | Use when the user wants active ad creatives or needs to filter ads by country, category, landing page, spend, ROAS, plays, or run days. Returns ad, creator, shop, products, and performance sections. |

### Agency Tools

| Tool | Description |
|---|---|
| `agency_creator_analysis` | Use when the user wants agency creator structure, follower tiers, and individual collaborators. Returns distributions and a paginated creator list. |
| `agency_product_analysis` | Use for agency product-category and price-band structure. Use agency_product_list for individual products. |
| `agency_product_list` | Use when the user wants individual products promoted through an agency. Supports category, price, period, sorting, and pagination. |
| `agency_profile_overview` | Use when the user wants an agency profile, historical performance, and recent 7/28/90-day data overview. |
| `agency_rank_top` | Use when the user wants leading MCN agencies in a market. Returns weekly or monthly agency rankings and period performance. |
| `agency_search` | Use when the user has an agency name or market clue but no agency_id. Returns matching agencies and recent 7-day performance. |
| `agency_shop_analysis` | Use when the user wants agency collaborating-shop totals and individual shop performance. |

### Creator Tools

| Tool | Description |
|---|---|
| `creator_cargo_summary` | Use when the user wants a creator video-vs-live selling split and main promoted categories. |
| `creator_data_trends` | Use when the user asks about creator follower, engagement, or commerce trends. Select field_type; returns daily series and period totals. |
| `creator_fans_distribution` | Use when the user wants to check whether a creator audience matches a target market. Returns age, gender, location, and top segments. |
| `creator_product_list` | Use when the user wants a creator showcase product list. Returns product GMV, units sold, category, price, commission, shop info, and time_range_days. |
| `creator_profile_overview` | Use when the user wants a creator snapshot or partnership check. Returns profile and performance_overview; GMV/rankings are mostly historical cumulative, so use creator_search day28_gmv for current activity. |
| `creator_rank_top_ecommerce` | Use when the user wants top ecommerce creators. Returns creator and ranking_metrics; date_value is returned as YYYY-Www for weekly rankings. |
| `creator_rank_top_growth` | Use when the user wants fast-growing creators. Returns creator and growth_metrics; date_value is returned as YYYY-Www for weekly rankings. |
| `creator_rank_top_potential` | Use when the user wants creators with ecommerce potential. Returns creator, potential_metrics, and audience_summary; date_value is returned as YYYY-Www for weekly rankings. |
| `creator_search` | Use when the user has no UID and provides a nickname, keyword, niche, or region. Returns creator, commerce_summary, and audience_summary; day28_gmv is the key current-activity metric for tiering; has_email as a boolean, not the email address itself. |
| `creator_video_analysis` | Use when the user wants creator content direction, tags, and selling videos. Returns video_tag_summary and video_list with interaction_rate_percent and linked_products so the model does not confuse video performance with product performance. |

### Product Tools

| Tool | Description |
|---|---|
| `product_category_info` | Use when the user needs the product category tree or category levels. Prefer search_category_by_words for natural-language category terms. |
| `product_creator_analysis` | Use when the user wants who sells a product or the creator structure. Returns creator_summary with follower_tier_distribution and creator_category_distribution, plus linked_creators with creator, product_contribution, creator_cumulative_performance, and audience_summary. |
| `product_detail_info` | Use when the user wants product basics, shop, price, rating, logistics, images, or ad status. Returns product and shop; detail_url points to TikTok. |
| `product_investment` | Use when the user asks about product ads, spend, ROAS, or daily paid-traffic changes. Returns ad_performance_summary and daily_ad_performance_trend; ad_gmv is ad-attributed. |
| `product_overview` | Use when the user wants product channel attribution, lifecycle/momentum, or ad-vs-organic structure. Returns period_summary, daily_trend, ads_distribution, channel_distribution, and content_distribution. |
| `product_rank_new_listed` | Use when the user wants recently listed hot products. Returns FastMoss new-product ranking, first_3d_gmv/units_sold, and total_gmv/units_sold; new means listed within 30 days. |
| `product_rank_top_selling` | Use when the user wants bestsellers or top products. Returns period_gmv/units_sold, total_gmv/units_sold, and units_sold_growth_rate_percent. |
| `product_review_list` | Use when the user wants product reviews or buyer feedback. Returns review list and count; supports time_range_days and rating/create_time/review_id sorting. |
| `product_sales_trend` | Use when the user wants a product GMV/units trend or traction check. Returns period_summary and daily_trend with period_gmv, period_units_sold, daily_gmv, and daily_units_sold. |
| `product_search` | Use when the user has no product_id and provides a name, keyword, price band, category, bestseller clue, or new-product clue. Returns product, sales_summary, distribution_summary, and shop. |
| `product_sku` | Use when the user wants SKU sales share, inventory share, or SKU health. Returns SKU-level sales and inventory shares. |
| `product_video_list` | Use when the user wants videos selling a product, high-play videos, or paid-vs-organic video traffic. Filter with is_ad; returns GMV, plays, video_desc, and fastmoss_url. |

### Shop Tools

| Tool | Description |
|---|---|
| `shop_base_info` | Use when the user wants a shop snapshot, store type, rating, or profile. Returns cumulative GMV/units, ranks, age, product count, and creator/video/live counts. |
| `shop_creator_analysis` | Use when the user wants shop collaborators, creator tiers, or video-vs-live selling structure. Returns creator list and distributions. |
| `shop_data_trends` | Use when the user wants recent shop GMV, units, creator, live, video, or active-product trends. Returns daily trends. |
| `shop_investment_analysis` | Use when the user asks about shop ads, spend, ROAS, ad GMV, or promoted assets. Returns ad estimates and daily changes. |
| `shop_live_analysis` | Use when the user wants shop live performance, shop-live vs affiliate-live structure, or live sessions. |
| `shop_product_analysis` | Use when the user wants shop categories, price bands, product mix, or product details. Returns distributions and product list. |
| `shop_rank_top_selling` | Use when the user wants top shops in a market or category. Returns shop ranking and ecommerce metrics. |
| `shop_sale_analysis` | Use when the user wants shop sales by short video, live, product card, creator, or self-operated channels. Returns channel_distribution and content_distribution. |
| `shop_search` | Use when the user has no seller_id and provides a shop name, keyword, or region. Returns matching shops. |
| `shop_video_analysis` | Use when the user wants shop selling videos, video performance, or ad status. |

### Market Insight Tools

| Tool | Description |
|---|---|
| `market_category_analysis` | Use when the user wants category size, growth, competition, or opportunity. analysis_type basic_metrics returns category, scale_metrics, growth_metrics, concentration_metrics; sales_trends returns trend_series; price_distribution returns sales_price_distribution with left-open right-closed price bands and sub_category_units_sold_total. |
| `market_category_author_sales_matrix` | Use when the user wants category sales contribution by creator follower_tier. Returns creator_count, category_gmv, gmv_share_percent, units_sold, and avg_creator_gmv. |
| `market_category_ranking` | Use when the user wants category ranking, growth, or concentration. Returns ranking_scope and ranked_categories; no category_id means level-1 category ranking, and a level-1 category_id means level-2 subcategory ranking. |

### Auxiliary and Knowledge Base Tools

| Tool | Description |
|---|---|
| `fastmoss_detail_url_examples` | Use when the AI needs FastMoss detail-page links. Takes no arguments and returns product, creator, shop, video, and live URL templates. |
| `live_detail_analysis` | Use when the user wants one live session info, creator, key performance, and category breakdown. |
| `live_products_list` | Use when the user wants products sold in a live session or high GMV/units within this live session. Returns live_units_sold, live_gmv, commission_rate_percent, sales_timeline only when pagesize <= 10, and shop_cumulative_units_sold. |
| `live_search` | Use when the user has no room_id and provides a live title, host, or shop. Returns live, creator, and performance_summary. |
| `search_category_by_words` | Use when the user knows a product/category term but does not have the category_id yet. Returns matched TikTok product category IDs and Chinese category paths. |
| `search_fastmoss_documents` | Use when the user asks about FastMoss rules, features, terms, or operations rather than real-time business data. Returns knowledge snippets and documents. |
| `video_data_trends` | Use when the user wants one video play, like, comment, or share trends. Returns daily interaction trends. |
| `video_detail_analysis` | Use when the user wants one video basics, plays, engagement, interaction rate, IPM, and linked products. |
| `video_script_info` | Use when the user wants video subtitles or line-by-line spoken copy. Returns start/end time and text; empty subtitles can fall back to video_desc. |
| `video_search` | Use when the user has no video_id and provides video keywords, title, or creator. Returns matching videos. |


这个包只负责 CLI。需要让 Agent 知道如何、何时调用 CLI 时，请单独安装 `@fastmoss/skill`。
