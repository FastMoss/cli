# FastMoss CLI

FastMoss CLI 的公开发布仓库。

这个仓库只保留发布所需的最小内容，用于：

- 托管预编译的 `fastmoss` 二进制文件
- 发布 npm 包 `@fastmoss/cli`
- 提供终端用户安装、升级和排查下载问题的说明

[English](./README.md)

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

## 仓库结构

- `fastmoss/`：用于 `npm publish` 的 npm 包目录
- `release-assets/`：从私有源码仓库导出的预编译二进制和校验文件
- `.github/workflows/release.yml`：发布 GitHub Release 和 npm 包的 GitHub Actions workflow

## 发布流程

1. 在私有源码仓库中准备 npm 包文件和各平台二进制。
2. 重新导出并同步本公开发布仓库。
3. 在本仓库提交并推送更新后的 `release-assets/` 和 `fastmoss/`。
4. 创建并推送版本 tag，例如 `v0.1.1`。
5. GitHub Actions 会创建 GitHub Release，并发布 `@fastmoss/cli` 到 npm。

## 发布后验证

```bash
npm view @fastmoss/cli version
npx @fastmoss/cli --version
npm install -g @fastmoss/cli
fastmoss --version
```
