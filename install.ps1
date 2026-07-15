[CmdletBinding()]
param(
  [switch]$Cli,
  [switch]$Skill,
  [switch]$All,
  [ValidateSet("codex", "claude", "agents", "all")]
  [string]$Agent,
  [string]$BinDir,
  [string]$SkillDir
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Fail([string]$Message) { throw "fastmoss installer error: $Message" }

$ModeCount = @($Cli, $Skill, $All).Where({ $_ }).Count
if ($ModeCount -ne 1) { Fail "choose exactly one of -Cli, -Skill, or -All" }

$MarkerPath = Join-Path $ScriptDir ".fastmoss-release.json"
if (-not (Test-Path $MarkerPath -PathType Leaf)) { Fail "release marker not found: $MarkerPath" }
$Release = Get-Content $MarkerPath -Raw | ConvertFrom-Json
$Version = [string]$Release.version
if (-not $Version) { Fail "release version not found in $MarkerPath" }

$SelectedAgent = if ($Agent) {
  $Agent
} elseif ($env:FASTMOSS_SKILL_AGENT) {
  $env:FASTMOSS_SKILL_AGENT
} else {
  "all"
}
if (@("codex", "claude", "agents", "all") -notcontains $SelectedAgent) {
  Fail "unsupported agent: $SelectedAgent"
}

$SelectedBinDir = if ($BinDir) {
  $BinDir
} elseif ($env:FASTMOSS_BIN_DIR) {
  $env:FASTMOSS_BIN_DIR
} else {
  Join-Path $env:LOCALAPPDATA "FastMoss\bin"
}
$SelectedSkillDir = if ($SkillDir) { $SkillDir } else { $env:FASTMOSS_SKILL_DIR }

function Install-Cli {
  $Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  if ($Architecture -ne "X64") { Fail "unsupported Windows architecture: $Architecture" }
  $AssetName = "fastmoss-windows-amd64.exe"
  $AssetPath = Join-Path $ScriptDir "release-assets\$AssetName"
  $ChecksumPath = Join-Path $ScriptDir "release-assets\SHA256SUMS"
  if (-not (Test-Path $AssetPath -PathType Leaf)) { Fail "release asset not found: $AssetPath" }
  if (-not (Test-Path $ChecksumPath -PathType Leaf)) { Fail "checksum file not found: $ChecksumPath" }
  $ChecksumLine = Get-Content $ChecksumPath | Where-Object { $_ -match "\s+$([Regex]::Escape($AssetName))$" } | Select-Object -First 1
  if (-not $ChecksumLine) { Fail "checksum not found for $AssetName" }
  $Expected = ($ChecksumLine -split "\s+")[0].ToLowerInvariant()
  $Actual = (Get-FileHash -Algorithm SHA256 $AssetPath).Hash.ToLowerInvariant()
  if ($Expected -ne $Actual) { Fail "checksum mismatch for $AssetName" }
  New-Item -ItemType Directory -Force -Path $SelectedBinDir | Out-Null
  $Target = Join-Path $SelectedBinDir "fastmoss.exe"
  Copy-Item -Force $AssetPath $Target
  Write-Output "Installed FastMoss CLI: $Target"
  if (($env:PATH -split ";") -notcontains $SelectedBinDir) {
    Write-Output "Add $SelectedBinDir to PATH."
  }
}

function Get-SkillRoots {
  if ($SelectedSkillDir) { return @([IO.Path]::GetFullPath($SelectedSkillDir)) }
  $Roots = @{
    codex = Join-Path $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }) "skills"
    claude = Join-Path $(if ($env:CLAUDE_HOME) { $env:CLAUDE_HOME } else { Join-Path $HOME ".claude" }) "skills"
    agents = Join-Path $(if ($env:AGENTS_HOME) { $env:AGENTS_HOME } else { Join-Path $HOME ".agents" }) "skills"
  }
  if ($SelectedAgent -eq "all") {
    return @($Roots.codex, $Roots.claude, $Roots.agents) | Select-Object -Unique
  }
  return @($Roots[$SelectedAgent])
}

function Install-SkillRoot([string]$Root) {
  $Source = Join-Path $ScriptDir "skills\fastmoss-cli"
  if (-not (Test-Path (Join-Path $Source "SKILL.md") -PathType Leaf)) {
    Fail "Skill payload is missing SKILL.md: $Source"
  }
  $Target = Join-Path $Root "fastmoss-cli"
  $Temporary = "$Target.tmp-$PID"
  $Backup = "$Target.backup-$PID"
  New-Item -ItemType Directory -Force -Path $Root | Out-Null
  Remove-Item -Recurse -Force $Temporary, $Backup -ErrorAction SilentlyContinue
  Copy-Item -Recurse $Source $Temporary
  Get-ChildItem -Recurse -Force $Temporary -Filter ".DS_Store" |
    Remove-Item -Force -ErrorAction SilentlyContinue
  @{
    schemaVersion = 1
    package = "@fastmoss/skill"
    skill = "fastmoss-cli"
    version = $Version
  } | ConvertTo-Json | Set-Content (Join-Path $Temporary ".fastmoss-install.json")
  $HadTarget = Test-Path $Target
  if ($HadTarget) { Move-Item $Target $Backup }
  try {
    Move-Item $Temporary $Target
  } catch {
    if ($HadTarget -and (Test-Path $Backup)) { Move-Item $Backup $Target }
    throw
  } finally {
    Remove-Item -Recurse -Force $Temporary -ErrorAction SilentlyContinue
  }
  Remove-Item -Recurse -Force $Backup -ErrorAction SilentlyContinue
  Write-Output "Installed FastMoss Skill: $(Join-Path $Target 'SKILL.md')"
}

function Install-Skill {
  foreach ($Root in Get-SkillRoots) { Install-SkillRoot $Root }
  Write-Output "Agent action: Read the installed fastmoss-cli/SKILL.md now and use it in this conversation."
  Write-Output "If this client cannot load newly installed skills in the current session, start a new conversation."
}

if ($Cli) { Install-Cli }
if ($Skill) { Install-Skill }
if ($All) { Install-Cli; Install-Skill }
