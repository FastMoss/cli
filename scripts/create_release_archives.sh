#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="${ROOT_DIR}/.fastmoss-release.json"
VERSION="$(node -p "require('${MARKER}').version")"
OUTPUT_DIR="${ROOT_DIR}/dist/publish/github"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

create_bundle() {
  local key="$1"
  local asset="$2"
  local installer="$3"
  local archive="$4"
  local bundle="${WORK_DIR}/fastmoss-v${VERSION}-${key}"
  mkdir -p "${bundle}/release-assets" "${bundle}/skills"
  cp "${ROOT_DIR}/.fastmoss-release.json" "${bundle}/"
  cp "${ROOT_DIR}/${installer}" "${bundle}/${installer}"
  cp -R "${ROOT_DIR}/skills/fastmoss-cli" "${bundle}/skills/fastmoss-cli"
  cp "${ROOT_DIR}/release-assets/${asset}" "${bundle}/release-assets/${asset}"
  awk -v name="${asset}" '$2 == name' \
    "${ROOT_DIR}/release-assets/SHA256SUMS" > "${bundle}/release-assets/SHA256SUMS"
  [ -s "${bundle}/release-assets/SHA256SUMS" ] || {
    printf '%s\n' "checksum missing for ${asset}" >&2
    exit 1
  }
  if [ "${installer}" = "install.sh" ]; then
    chmod +x "${bundle}/install.sh" "${bundle}/release-assets/${asset}"
    printf '%s\n' "Run ./install.sh --cli, --skill, or --all." > "${bundle}/README.txt"
    tar -C "${WORK_DIR}" -czf "${OUTPUT_DIR}/${archive}" "$(basename "${bundle}")"
  else
    printf '%s\n' "Run .\\install.ps1 -Cli, -Skill, or -All." > "${bundle}/README.txt"
    (cd "${WORK_DIR}" && zip -qr "${OUTPUT_DIR}/${archive}" "$(basename "${bundle}")")
  fi
  [ -s "${OUTPUT_DIR}/${archive}" ] || {
    printf '%s\n' "archive was not created: ${archive}" >&2
    exit 1
  }
}

create_bundle darwin-amd64 fastmoss-darwin-amd64 install.sh "fastmoss-v${VERSION}-darwin-amd64.tar.gz"
create_bundle darwin-arm64 fastmoss-darwin-arm64 install.sh "fastmoss-v${VERSION}-darwin-arm64.tar.gz"
create_bundle linux-amd64 fastmoss-linux-amd64 install.sh "fastmoss-v${VERSION}-linux-amd64.tar.gz"
create_bundle linux-arm64 fastmoss-linux-arm64 install.sh "fastmoss-v${VERSION}-linux-arm64.tar.gz"
create_bundle windows-amd64 fastmoss-windows-amd64.exe install.ps1 "fastmoss-v${VERSION}-windows-amd64.zip"
