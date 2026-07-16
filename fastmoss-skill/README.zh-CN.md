# @fastmoss/skill

[English](./README.md)

`@fastmoss/skill` 用于安装或更新专为 `@fastmoss/cli` 设计的 FastMoss Agent Skill。此 npm 包不会自动安装 CLI。安装后，Skill 会引导 Agent 安装 `@fastmoss/cli`；你也可以先手动安装 CLI。

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

## 选项

```bash
npx -y @fastmoss/skill@latest --help
npx -y @fastmoss/skill@latest --version
npx -y @fastmoss/skill@latest uninstall --agent all
```

## CLI 工具列表

### 广告工具

| 工具 | 说明 |
|---|---|
| `ad_data_overview` | 查看指定视频在一段时间内的广告花费、ROAS、播放、互动、涨粉和电商表现。 |
| `ad_search` | 按市场、类目、落地页、花费、ROAS、播放量或投放时长筛选活跃广告。 |

### MCN 机构工具

| 工具 | 说明 |
|---|---|
| `agency_creator_analysis` | 分析 MCN 的达人结构、粉丝层级和合作达人。 |
| `agency_product_analysis` | 分析 MCN 推广商品的类目结构和价格带。 |
| `agency_product_list` | 查询 MCN 推广的商品，可按类目、价格、周期和排序筛选。 |
| `agency_profile_overview` | 查看 MCN 档案及近 7/28/90 天业绩概览。 |
| `agency_rank_top` | 获取按周或按月排行的头部 MCN 机构。 |
| `agency_search` | 通过机构名称或市场线索搜索 MCN。 |
| `agency_shop_analysis` | 分析 MCN 合作店铺及其经营表现。 |

### 达人工具

| 工具 | 说明 |
|---|---|
| `creator_cargo_summary` | 对比达人短视频和直播带货结构及主推类目。 |
| `creator_data_trends` | 跟踪达人的粉丝、互动和电商数据趋势。 |
| `creator_fans_distribution` | 按年龄、性别、地区和人群标签分析达人受众。 |
| `creator_product_list` | 查询达人带货商品及 GMV、销量、价格、佣金和店铺信息。 |
| `creator_profile_overview` | 查看达人档案与历史业绩快照。 |
| `creator_rank_top_ecommerce` | 获取头部电商达人排行。 |
| `creator_rank_top_growth` | 获取增长最快的达人排行。 |
| `creator_rank_top_potential` | 寻找具有电商潜力的达人。 |
| `creator_search` | 按昵称、关键词、赛道或市场搜索达人。 |
| `creator_video_analysis` | 分析达人的内容方向、标签、带货视频及关联商品。 |

### 商品工具

| 工具 | 说明 |
|---|---|
| `product_category_info` | 获取 TikTok Shop 商品类目树和层级。 |
| `product_creator_analysis` | 分析带货该商品的达人及其贡献。 |
| `product_detail_info` | 获取商品、店铺、价格、评分、物流、图片和广告信息。 |
| `product_investment` | 分析商品广告花费、ROAS、广告 GMV 和付费流量趋势。 |
| `product_overview` | 分析商品渠道、生命周期、增长势头及自然和广告流量结构。 |
| `product_rank_new_listed` | 查找近 30 天上架的热门新品。 |
| `product_rank_top_selling` | 获取畅销商品排行并比较销量增长。 |
| `product_review_list` | 查询商品评价和买家反馈。 |
| `product_sales_trend` | 跟踪商品 GMV 和销量趋势。 |
| `product_search` | 按名称、关键词、价格、类目或市场线索搜索商品。 |
| `product_sku` | 分析 SKU 销售占比、库存占比和健康度。 |
| `product_video_list` | 查询带货该商品的视频，并比较付费和自然流量。 |

### 店铺工具

| 工具 | 说明 |
|---|---|
| `shop_base_info` | 查看店铺档案、评分、累计销售、排名和经营规模。 |
| `shop_creator_analysis` | 分析店铺合作达人、达人层级和带货结构。 |
| `shop_data_trends` | 跟踪店铺 GMV、销量、达人、直播、视频和商品趋势。 |
| `shop_investment_analysis` | 分析店铺广告花费、ROAS、广告 GMV 和投放素材。 |
| `shop_live_analysis` | 分析店铺直播表现和单场直播数据。 |
| `shop_product_analysis` | 分析店铺类目、价格带、商品结构和商品明细。 |
| `shop_rank_top_selling` | 获取市场或类目下的热销店铺排行。 |
| `shop_sale_analysis` | 分析店铺来自视频、直播、商品卡、达人和自营渠道的销售。 |
| `shop_search` | 按店铺名称、关键词或市场搜索店铺。 |
| `shop_video_analysis` | 分析店铺带货视频、表现和广告状态。 |

### 市场洞察工具

| 工具 | 说明 |
|---|---|
| `market_category_analysis` | 分析类目规模、增长、竞争、机会、销售趋势和价格分布。 |
| `market_category_author_sales_matrix` | 分析不同粉丝层级达人对类目销售的贡献。 |
| `market_category_ranking` | 获取类目排行并分析增长和集中度。 |

### 辅助与知识库工具

| 工具 | 说明 |
|---|---|
| `fastmoss_detail_url_examples` | 获取商品、达人、店铺、视频和直播的 FastMoss 详情页链接模板。 |
| `live_detail_analysis` | 分析单场直播、主播、表现和类目结构。 |
| `live_products_list` | 查询一场直播售卖的商品及其 GMV 和销量。 |
| `live_search` | 按标题、主播或店铺搜索直播场次。 |
| `search_category_by_words` | 将自然语言商品词匹配到 TikTok Shop 类目。 |
| `search_fastmoss_documents` | 搜索 FastMoss 文档、规则、功能和运营指引。 |
| `video_data_trends` | 跟踪视频播放、点赞、评论和分享趋势。 |
| `video_detail_analysis` | 分析视频基础信息、播放、互动、IPM 和关联商品。 |
| `video_script_info` | 获取视频字幕或口播文案。 |
| `video_search` | 按关键词、标题或达人搜索视频。 |

每个安装目录都会写入 `.fastmoss-install.json`。卸载时只删除带有 FastMoss 归属 manifest 的目录；未托管目录会被跳过。
