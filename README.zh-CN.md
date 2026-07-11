# FastMoss CLI

[English](./README.md)

FastMoss CLI 用于在终端或 AI Agent 中发现并调用 FastMoss MCP 工具，覆盖 TikTok Shop 选品、达人发现、店铺分析、广告分析、市场洞察、视频/直播分析和 FastMoss 知识库查询等场景。

CLI 需要配合 FastMoss CLI Agent Skill 一起使用：

- `@fastmoss/cli` 安装 `fastmoss` 命令，用于真正执行工具调用。
- `npx skills add FastMoss/cli -y -g` 安装 Agent Skill，让你的 Agent 知道有哪些 FastMoss 工具、什么时候使用、怎么调用。

Agent 工作流建议两个都安装：

```bash
npm install -g @fastmoss/cli
npx skills add FastMoss/cli -y -g
```

## 仓库内容

这个公开仓库用于发布 FastMoss CLI：

- `fastmoss/`：GitHub Actions 发布 `@fastmoss/cli` 时使用的 npm 包目录。
- `skills/fastmoss-cli/`：可通过 `npx skills add FastMoss/cli -y -g` 安装的 Agent Skill。
- `release-assets/`：预编译的 `fastmoss` 二进制文件和 `SHA256SUMS`。
- `.github/workflows/release.yml`：GitHub Release 和 npm 发布 workflow。

## 关于 FastMoss

[FastMoss](https://www.fastmoss.com/) 是面向全球 TikTok 品牌、商家、服务商、创作者和运营团队的数据分析平台。FastMoss 帮助用户洞察大盘趋势、发现爆品和品类机会、寻找达人与机构、监控竞店、分析广告投放，并研究直播生态。

FastMoss 主要提供以 TikTok 和 TikTok Shop 为核心的大数据分析服务，覆盖直播、商品、店铺、达人、广告、视频、音乐、标签等版块，涵盖美国、英国、印尼、越南、菲律宾、泰国、马来西亚、西班牙、墨西哥、法国、德国、巴西等主要 TikTok 商业化国家和区域的数据。

## 安装

不安装，直接通过 npx 运行：

```bash
npx @fastmoss/cli
```

全局安装：

```bash
npm install -g @fastmoss/cli
fastmoss
```

全局安装后，命令名是 `fastmoss`。如果终端提示 `command not found: fastmoss`，通常是 npm 全局 bin 目录没有加入 `PATH`。

如果你的 npm 配置禁止 lifecycle scripts，可以允许本包的 postinstall 脚本在安装期预下载二进制：

```bash
npm install -g --allow-scripts=@fastmoss/cli @fastmoss/cli
```

## API Key 和积分

FastMoss 工具调用需要 API Key，并会消耗积分。访问 [FastMoss 开发者平台](https://developers.fastmoss.com/mcp/overview.html) 登录、创建 MCP API Key、查看用量并管理积分。

常规配置：

```bash
fastmoss login --api-key <your-api-key>
fastmoss whoami
```

如果积分不足，请在开发者平台的计费/价格页面充值或升级套餐。计费和积分规则见 [FastMoss MCP Pricing](https://developers.fastmoss.com/mcp/pricing.html)。

## 命令

查看版本和帮助：

```bash
fastmoss --version
fastmoss help
```

登录和本地配置：

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

发现工具：

```bash
fastmoss tools
fastmoss tools --json
fastmoss tools --search <tool_name>
```

调用工具：

```bash
fastmoss call --tool <tool_name> --args '<json>' --output mcp
fastmoss <tool_name> --args '<json>' --output mcp
```

LLM 或 Agent 读取结果时优先使用 `--output mcp`。终端里只想看简洁结果时使用 `--output data`。只有调试原始 RPC 响应时才使用 `--output rpc`。

联网命令常用参数：

```bash
--api-key <api-key>
--base-url <url>
--timeout <seconds>
--insecure-skip-tls
```

## 支持的工具

随包发布的 Agent Skill 包含静态工具目录。你也可以执行 `fastmoss tools` 或 `fastmoss tools --json` 查看当前账号实时可用的工具列表。

| 分类 | name | title |
|---|---|---|
| 广告工具 | `ad_data_overview` | Ad data overview |
| 广告工具 | `ad_search` | Ad search |
| 达人工具 | `creator_cargo_summary` | Creator ecommerce summary |
| 达人工具 | `creator_data_trends` | Creator data trends |
| 达人工具 | `creator_fans_distribution` | Creator fans distribution |
| 达人工具 | `creator_product_list` | Creator product list |
| 达人工具 | `creator_profile_overview` | Creator profile overview |
| 达人工具 | `creator_rank_top_ecommerce` | Top ecommerce creators |
| 达人工具 | `creator_rank_top_growth` | Top creator follower growth |
| 达人工具 | `creator_rank_top_potential` | Top potential creators |
| 达人工具 | `creator_search` | Creator search |
| 达人工具 | `creator_video_analysis` | Creator video analysis |
| 辅助和知识库工具 | `fastmoss_detail_url_examples` | FastMoss Detail URL Examples |
| 辅助和知识库工具 | `live_detail_analysis` | Live detail analysis and category breakdown |
| 辅助和知识库工具 | `live_products_list` | Live promoted product list |
| 辅助和知识库工具 | `live_search` | Live search |
| 市场洞察工具 | `market_category_analysis` | Category market analysis |
| 市场洞察工具 | `market_category_author_sales_matrix` | Category creator sales matrix |
| 市场洞察工具 | `market_category_ranking` | Category market ranking |
| 商品工具 | `product_category_info` | Product category list |
| 商品工具 | `product_creator_analysis` | Product creator analysis and creator list |
| 商品工具 | `product_detail_info` | Product detail info |
| 商品工具 | `product_investment` | Product ad investment analysis |
| 商品工具 | `product_overview` | Product overview |
| 商品工具 | `product_rank_new_listed` | New listed product ranking |
| 商品工具 | `product_rank_top_selling` | Top selling products |
| 商品工具 | `product_review_list` | Product review list |
| 商品工具 | `product_sales_trend` | Product sales trend |
| 商品工具 | `product_search` | Product search |
| 商品工具 | `product_sku` | Product SKU analysis |
| 商品工具 | `product_video_list` | Product video list |
| 辅助和知识库工具 | `search_category_by_words` | Search TikTok Product Category by Keywords |
| 辅助和知识库工具 | `search_fastmoss_documents` | FastMoss Knowledge Base Search |
| 店铺工具 | `shop_base_info` | Shop base info |
| 店铺工具 | `shop_creator_analysis` | Shop creator analysis and creator list |
| 店铺工具 | `shop_data_trends` | Shop data trends |
| 店铺工具 | `shop_investment_analysis` | Shop ad investment analysis |
| 店铺工具 | `shop_live_analysis` | Shop live analysis and live list |
| 店铺工具 | `shop_product_analysis` | Shop product analysis and product list |
| 店铺工具 | `shop_rank_top_selling` | Top selling shops |
| 店铺工具 | `shop_sale_analysis` | Shop sales analysis |
| 店铺工具 | `shop_search` | Shop search |
| 店铺工具 | `shop_video_analysis` | Shop video analysis and video list |
| 辅助和知识库工具 | `video_data_trends` | Video data trends |
| 辅助和知识库工具 | `video_detail_analysis` | Video detail analysis and product list |
| 辅助和知识库工具 | `video_script_info` | Video subtitle script |
| 辅助和知识库工具 | `video_search` | Video search |

## 二进制下载

本包会安装 `fastmoss` 命令。npm 包本身不内置 Go 二进制文件，而是在安装或首次运行时从 GitHub Releases 下载当前平台对应的 `fastmoss` 二进制，缓存到本地后转发所有 CLI 参数。

安装时会尝试预下载当前平台二进制。如果下载失败，npm 安装仍会完成；首次运行 `fastmoss` 时会再次下载，并显示下载地址。

你可以跳过安装期下载，让首次运行时再下载：

```bash
FASTMOSS_SKIP_DOWNLOAD=1 npm install -g @fastmoss/cli
```

内部调试或私有镜像可以覆盖下载地址：

```bash
FASTMOSS_DOWNLOAD_BASE_URL=https://downloads.example.com/releases npx @fastmoss/cli
```

## 缓存目录

默认缓存目录：

```text
~/.fastmoss/bin/<version>/<platform>/
```

自定义缓存目录：

```bash
FASTMOSS_CACHE_DIR=/custom/cache/dir npx @fastmoss/cli
```

## 支持平台

- macOS `amd64`
- macOS `arm64`
- Linux `amd64`
- Linux `arm64`
- Windows `amd64`

wrapper 会根据当前平台请求以下资产之一：

- `fastmoss-darwin-amd64`
- `fastmoss-darwin-arm64`
- `fastmoss-linux-amd64`
- `fastmoss-linux-arm64`
- `fastmoss-windows-amd64.exe`
