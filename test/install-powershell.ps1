$ErrorActionPreference = "Stop"
$TemplateRoot = Split-Path -Parent $PSScriptRoot
$Root = Join-Path ([IO.Path]::GetTempPath()) ("fastmoss-install-" + [Guid]::NewGuid())

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

try {
  $Source = Get-Content (Join-Path $TemplateRoot "install.ps1") -Raw
  Assert-True ($Source -notmatch "\b(npm|npx|Invoke-WebRequest|Start-BitsTransfer|curl)\b") "installer must not invoke network or npm commands"

  New-Item -ItemType Directory -Force -Path $Root | Out-Null
  Copy-Item (Join-Path $TemplateRoot "install.ps1") (Join-Path $Root "install.ps1")
  @{ schemaVersion = 1; version = "1.2.3" } |
    ConvertTo-Json | Set-Content (Join-Path $Root ".fastmoss-release.json")
  $AssetDir = Join-Path $Root "release-assets"
  New-Item -ItemType Directory -Force -Path $AssetDir | Out-Null
  $AssetPath = Join-Path $AssetDir "fastmoss-windows-amd64.exe"
  if ($env:SystemRoot) {
    Copy-Item "$env:SystemRoot\System32\where.exe" $AssetPath
  } else {
    "fixture" | Set-Content $AssetPath
  }
  $Hash = (Get-FileHash -Algorithm SHA256 $AssetPath).Hash.ToLowerInvariant()
  "$Hash  fastmoss-windows-amd64.exe" | Set-Content (Join-Path $AssetDir "SHA256SUMS")
  $SkillSource = Join-Path $Root "skills\fastmoss-cli"
  New-Item -ItemType Directory -Force -Path $SkillSource | Out-Null
  "# FastMoss" | Set-Content (Join-Path $SkillSource "SKILL.md")

  $SkillDir = Join-Path $Root "skill-target"
  & (Join-Path $Root "install.ps1") -Skill -SkillDir $SkillDir
  Assert-True (Test-Path (Join-Path $SkillDir "fastmoss-cli\SKILL.md")) "Skill-only install failed"

  if ($IsWindows -or $env:OS -eq "Windows_NT") {
    $BinDir = Join-Path $Root "bin-target"
    & (Join-Path $Root "install.ps1") -Cli -BinDir $BinDir
    Assert-True (Test-Path (Join-Path $BinDir "fastmoss.exe")) "CLI-only install failed"

    Add-Content $AssetPath "tampered"
    $Output = & pwsh -NoProfile -File (Join-Path $Root "install.ps1") -Cli -BinDir $BinDir 2>&1
    Assert-True ($LASTEXITCODE -ne 0) "Checksum mismatch should fail"
    Assert-True (($Output -join "`n") -match "checksum mismatch") "Checksum failure message missing"
  }

  $MarkerPath = Join-Path $TemplateRoot ".fastmoss-release.json"
  $RealAsset = Join-Path $TemplateRoot "release-assets\fastmoss-windows-amd64.exe"
  if (($IsWindows -or $env:OS -eq "Windows_NT") -and (Test-Path $MarkerPath) -and (Test-Path $RealAsset)) {
    $RealBinDir = Join-Path $Root "real-bin"
    & (Join-Path $TemplateRoot "install.ps1") -Cli -BinDir $RealBinDir
    $Version = (Get-Content $MarkerPath -Raw | ConvertFrom-Json).version
    $Output = & (Join-Path $RealBinDir "fastmoss.exe") --version
    Assert-True (($Output -join "`n").Trim() -eq $Version) "real staged CLI version mismatch"
  }
} finally {
  Remove-Item -Recurse -Force $Root -ErrorAction SilentlyContinue
}
