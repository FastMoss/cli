#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE=""
AGENT="${FASTMOSS_SKILL_AGENT:-all}"
BIN_DIR="${FASTMOSS_BIN_DIR:-${HOME}/.local/bin}"
SKILL_DIR="${FASTMOSS_SKILL_DIR:-}"

die() {
  printf '%s\n' "fastmoss installer error: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: ./install.sh --cli|--skill|--all [options]

Options:
  --agent codex|claude|agents|all
  --bin-dir PATH
  --skill-dir PATH
  -h, --help
EOF
}

set_mode() {
  [ -z "${MODE}" ] || die "choose only one of --cli, --skill, or --all"
  MODE="$1"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --cli) set_mode cli ;;
    --skill) set_mode skill ;;
    --all) set_mode all ;;
    --agent)
      [ "$#" -ge 2 ] || die "--agent requires a value"
      AGENT="$2"
      shift
      ;;
    --bin-dir)
      [ "$#" -ge 2 ] || die "--bin-dir requires a value"
      BIN_DIR="$2"
      shift
      ;;
    --skill-dir)
      [ "$#" -ge 2 ] || die "--skill-dir requires a value"
      SKILL_DIR="$2"
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
  shift
done

[ -n "${MODE}" ] || die "choose --cli, --skill, or --all"
case "${AGENT}" in codex|claude|agents|all) ;; *) die "unsupported agent: ${AGENT}" ;; esac

MARKER="${SCRIPT_DIR}/.fastmoss-release.json"
[ -f "${MARKER}" ] || die "release marker not found: ${MARKER}"
VERSION="$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "${MARKER}")"
[ -n "${VERSION}" ] || die "release version not found in ${MARKER}"

resolve_asset() {
  local system machine
  system="$(uname -s)"
  machine="$(uname -m)"
  case "${system}/${machine}" in
    Darwin/x86_64) printf '%s\n' fastmoss-darwin-amd64 ;;
    Darwin/arm64) printf '%s\n' fastmoss-darwin-arm64 ;;
    Linux/x86_64|Linux/amd64) printf '%s\n' fastmoss-linux-amd64 ;;
    Linux/aarch64|Linux/arm64) printf '%s\n' fastmoss-linux-arm64 ;;
    *) die "unsupported platform: ${system}/${machine}" ;;
  esac
}

verify_asset() {
  local asset_name="$1"
  local asset_path="${SCRIPT_DIR}/release-assets/${asset_name}"
  local checksum_file="${SCRIPT_DIR}/release-assets/SHA256SUMS"
  local expected actual
  [ -f "${asset_path}" ] || die "release asset not found: ${asset_path}"
  [ -f "${checksum_file}" ] || die "checksum file not found: ${checksum_file}"
  expected="$(awk -v name="${asset_name}" '$2 == name { print $1 }' "${checksum_file}")"
  [ -n "${expected}" ] || die "checksum not found for ${asset_name}"
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "${asset_path}" | awk '{ print $1 }')"
  elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "${asset_path}" | awk '{ print $1 }')"
  else
    die "missing checksum tool: need sha256sum or shasum"
  fi
  [ "${actual}" = "${expected}" ] || die "checksum mismatch for ${asset_name}"
}

install_cli() {
  local asset_name asset_path target
  asset_name="$(resolve_asset)"
  asset_path="${SCRIPT_DIR}/release-assets/${asset_name}"
  verify_asset "${asset_name}"
  mkdir -p "${BIN_DIR}" || die "cannot create CLI directory: ${BIN_DIR}"
  target="${BIN_DIR}/fastmoss"
  install -m 0755 "${asset_path}" "${target}" || die "cannot install CLI to ${target}"
  printf '%s\n' "Installed FastMoss CLI: ${target}"
  case ":${PATH}:" in
    *":${BIN_DIR}:"*) ;;
    *) printf '%s\n' "Add ${BIN_DIR} to PATH, for example: export PATH=\"${BIN_DIR}:\$PATH\"" ;;
  esac
}

skill_roots() {
  if [ -n "${SKILL_DIR}" ]; then
    printf '%s\n' "${SKILL_DIR}"
    return
  fi
  case "${AGENT}" in
    codex) printf '%s\n' "${CODEX_HOME:-${HOME}/.codex}/skills" ;;
    claude) printf '%s\n' "${CLAUDE_HOME:-${HOME}/.claude}/skills" ;;
    agents) printf '%s\n' "${AGENTS_HOME:-${HOME}/.agents}/skills" ;;
    all)
      printf '%s\n' \
        "${CODEX_HOME:-${HOME}/.codex}/skills" \
        "${CLAUDE_HOME:-${HOME}/.claude}/skills" \
        "${AGENTS_HOME:-${HOME}/.agents}/skills" | awk '!seen[$0]++'
      ;;
  esac
}

install_skill_root() {
  local root="$1"
  local source="${SCRIPT_DIR}/skills/fastmoss-cli"
  local target="${root}/fastmoss-cli"
  local temporary="${target}.tmp-$$"
  local backup="${target}.backup-$$"
  [ -f "${source}/SKILL.md" ] || die "Skill payload is missing SKILL.md: ${source}"
  mkdir -p "${root}" || die "cannot create Skill directory: ${root}"
  rm -rf "${temporary}" "${backup}"
  mkdir -p "${temporary}" || die "cannot create temporary Skill directory: ${temporary}"
  cp -R "${source}/." "${temporary}/" || die "cannot copy Skill payload to ${temporary}"
  find "${temporary}" -name .DS_Store -delete
  cat > "${temporary}/.fastmoss-install.json" <<EOF
{
  "schemaVersion": 1,
  "package": "@fastmoss/skill",
  "skill": "fastmoss-cli",
  "version": "${VERSION}"
}
EOF
  if [ -e "${target}" ]; then
    mv "${target}" "${backup}" || die "cannot back up existing Skill: ${target}"
  fi
  if ! mv "${temporary}" "${target}"; then
    [ ! -e "${backup}" ] || mv "${backup}" "${target}"
    die "cannot install Skill to ${target}"
  fi
  rm -rf "${backup}"
  printf '%s\n' "Installed FastMoss Skill: ${target}/SKILL.md"
}

install_skill() {
  local root
  while IFS= read -r root; do
    [ -n "${root}" ] || continue
    install_skill_root "${root}"
  done < <(skill_roots)
  printf '%s\n' "Agent action: Read the installed fastmoss-cli/SKILL.md now and use it in this conversation."
  printf '%s\n' "If this client cannot load newly installed skills in the current session, start a new conversation."
}

case "${MODE}" in
  cli) install_cli ;;
  skill) install_skill ;;
  all) install_cli; install_skill ;;
esac
