# @fastmoss/cli

FastMoss CLI launcher for npm and npx.

This package installs the `fastmoss` command. It does not bundle the Go binary itself. Instead, it downloads the matching `fastmoss` binary from GitHub Releases, stores it in a local cache directory, and then forwards all CLI arguments to that binary.

During `npm install`, the package tries to predownload the matching binary for the current platform. If the download fails, installation still completes and the wrapper will retry the download on first run with a visible download message.

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

After global installation, the command name is `fastmoss`. If your shell prints `command not found: fastmoss`, make sure your npm global bin directory is in `PATH`.

Common examples:

```bash
fastmoss tools
fastmoss call --tool creator_search --args '{"keywords":"beauty","region":"US","page":1,"pagesize":10}'
fastmoss stdio
```

## Binary Download

The package downloads the current platform's binary from the public GitHub release repository configured in `package.json`.

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
