# FastMoss CLI

FastMoss CLI 的公开发布仓库。

这个仓库只保留发布所需的最小内容，用于：

- 托管预编译的 `fastmoss` 二进制文件
- 发布 npm 包 `@fastmoss/cli`
- 提供终端用户安装、升级和排查下载问题的说明

[English](./README.md)

## 关于 FastMoss

[FastMoss](https://www.fastmoss.com/) 是全球领先的 TikTok 数据分析平台，也是全球 TikTok 品牌与大卖商家常用的数据情报系统。FastMoss 帮助商家、服务商、创作者和运营团队洞察大盘趋势、品类爆品、优质达人与机构、竞店动态、广告投流和直播生态。

FastMoss 主要提供以 TikTok 和 TikTok Shop 为核心的大数据分析服务，覆盖直播、商品、店铺、达人、广告、视频、音乐、标签等版块，涵盖美国、英国、印尼、越南、菲律宾、泰国、马来西亚、西班牙、墨西哥、法国、德国、巴西等主要 TikTok 商业化国家和区域的数据，满足生态从业者选爆品、找达人、查竞对、看素材等业务需求。

FastMoss 定位为 TikTok 生态全闭环数据分析平台，支持 PC Web、微信小程序和手机 H5 三端同步，并以数据更新快、分析准、收录全为核心优势。同时，FastMoss 也提供 AI 能力，支持获取创作灵感、生成爆款脚本和 VOC 智能洞察。

核心优势：

- 时间长：支持查看 TikTok 1200 天以上历史数据，主要数据自 2022 年 5 月开始更新。
- 数据多：收录 TikTok 达人数量超过 3 亿，收录 TikTok 商品与店铺数量超过 5 亿。
- 全版块：覆盖直播、商品、小店、达人、视频、广告、标签、音乐等 TikTok 数据分析版块。
- 地区全：覆盖 20+ TikTok 商业化国家和地区，包括美国、英国、印尼、泰国、越南、马来西亚、菲律宾、韩国、法国、墨西哥、巴西、西班牙等。
- AI 赋能：支持创作灵感获取、爆款脚本生成和 VOC 智能洞察，帮助用户从数据分析走向内容执行。


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

安装后命令名是 `fastmoss`。如果提示 `command not found: fastmoss`，通常是 npm 全局 bin 目录没有加入 `PATH`。

## 二进制下载

`@fastmoss/cli` npm 包本身不内置 Go 二进制文件。安装时会尝试从本仓库的 GitHub Releases 下载当前平台对应的 `fastmoss` 二进制，并缓存到本地。

如果安装时下载失败，npm 安装不会因此失败；首次执行 `fastmoss` 时会再次尝试下载，并输出下载地址。

如果你的 npm 配置禁止 lifecycle scripts，可以允许本包的安装脚本执行：

```bash
npm install -g --allow-scripts=@fastmoss/cli @fastmoss/cli
```

也可以跳过安装期下载，让首次运行时再下载：

```bash
FASTMOSS_SKIP_DOWNLOAD=1 npm install -g @fastmoss/cli
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

自定义下载源：

```bash
FASTMOSS_DOWNLOAD_BASE_URL=https://downloads.example.com/releases npx @fastmoss/cli
```

## 支持平台

- macOS `amd64`
- macOS `arm64`
- Linux `amd64`
- Linux `arm64`
- Windows `amd64`
