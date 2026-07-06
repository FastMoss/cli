# fastmoss

Public release repository for the FastMoss CLI.

This repository is intentionally minimal. It exists to:

- host GitHub Releases for the prebuilt `fastmoss` binaries
- publish the `fastmoss` npm package
- provide concise install and upgrade documentation for end users

## Install

Run directly with npx:

```bash
npx fastmoss
```

Install globally:

```bash
npm install -g fastmoss
fastmoss
```

## Repository Layout

- `fastmoss/`: npm package source used for `npm publish`
- `release-assets/`: prebuilt binaries and checksums exported from the private source repository
- `.github/workflows/release.yml`: GitHub Actions workflow for publishing releases and npm packages

## First-Time Setup

Initialize the public repository on GitHub, then connect this local directory:

```bash
git remote add origin git@github.com:fastmoss/fastmoss-release.git
git add .
git commit -m "chore: initialize public release repo"
git push -u origin main
```

Add the npm publish token in GitHub repository settings:

- `Settings` -> `Secrets and variables` -> `Actions`
- create `NPM_TOKEN`

## Release Flow

1. Prepare binaries and npm package files in the private source repository.
2. Re-export this public repository scaffold.
3. Commit and push the updated `release-assets/` and `fastmoss/` package files here.
4. Create and push tag `v<version>`.
5. GitHub Actions will create the GitHub Release and publish `fastmoss` to npm.
