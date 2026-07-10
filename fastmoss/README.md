# @fastmoss/cli

FastMoss CLI launcher for npm and npx.

This package does not bundle the Go binary itself. On first run it downloads the matching `fastmoss` binary from GitHub Releases, stores it in a local cache directory, and then forwards all CLI arguments to that binary.

During `npm install`, the package tries to predownload the matching binary for the current platform. If the download fails, installation still completes and the wrapper will retry the download on first run.

If your npm configuration blocks lifecycle scripts, allow this package's postinstall script to predownload during install:

```bash
npm install -g --allow-scripts=@fastmoss/cli @fastmoss/cli
```

## Usage

Run without installing:

```bash
npx @fastmoss/cli
```

Install globally:

```bash
npm install -g @fastmoss/cli
fastmoss
```

Common examples:

```bash
fastmoss tools
fastmoss call --tool creator_search --args '{"keywords":"beauty","region":"US","page":1,"pagesize":10}'
fastmoss stdio
```

## Supported Platforms

- macOS `amd64`
- macOS `arm64`
- Linux `amd64`
- Linux `arm64`
- Windows `amd64`

## Cache Directory

The downloaded binary is cached here by default:

```text
~/.fastmoss/bin/<version>/<platform>/
```

You can override the cache directory:

```bash
FASTMOSS_CACHE_DIR=/custom/cache/dir npx @fastmoss/cli
```

You can skip the install-time download:

```bash
FASTMOSS_SKIP_DOWNLOAD=1 npm install -g @fastmoss/cli
```

## Download Source

By default the wrapper downloads binaries from the public GitHub release repository configured in `package.json`.

For internal debugging or private release mirrors, you can override the base URL:

```bash
FASTMOSS_DOWNLOAD_BASE_URL=https://downloads.example.com/releases npx @fastmoss/cli
```

The wrapper will request one of these asset names depending on platform:

- `fastmoss-darwin-amd64`
- `fastmoss-darwin-arm64`
- `fastmoss-linux-amd64`
- `fastmoss-linux-arm64`
- `fastmoss-windows-amd64.exe`

## Release Workflow

The private source repository prepares this package and the matching binaries. The public GitHub release repository then publishes the package and hosts the release assets.
