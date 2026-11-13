param(
  [string]$Profile = "desktop",
  [switch]$Uninstall,
  [switch]$NoPatch,
  [switch]$Link
)

$ErrorActionPreference = "Stop"
$packageName = "dsh-scholarloom"
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileDir = Join-Path $env:USERPROFILE ".dsh\profiles\$Profile"
$target = Join-Path $profileDir "node_modules\$packageName"
$patch = Join-Path $profileDir "cordis.patch.yml"
$markerStart = "# >>> dsh-scholarloom workbench (managed) >>>"
$markerEnd = "# <<< dsh-scholarloom workbench <<<"
$utf8 = New-Object System.Text.UTF8Encoding $false

if (-not (Test-Path $profileDir)) {
  throw "DSH profile not found: $profileDir"
}

function Remove-MountBlock {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  $lines = Get-Content -LiteralPath $Path -Encoding UTF8
  $output = New-Object System.Collections.Generic.List[string]
  $skip = $false
  foreach ($line in $lines) {
    if ($line.Trim() -eq $markerStart) { $skip = $true; continue }
    if ($line.Trim() -eq $markerEnd) { $skip = $false; continue }
    if (-not $skip) { $output.Add($line) }
  }
  [IO.File]::WriteAllText($Path, ($output -join "`r`n") + "`r`n", $utf8)
}

if ($Uninstall) {
  if (Test-Path $target) {
    $item = Get-Item -LiteralPath $target -Force
    if ($item.LinkType) { Remove-Item -LiteralPath $target -Force } else { Remove-Item -LiteralPath $target -Recurse -Force }
  }
  if (-not $NoPatch) { Remove-MountBlock -Path $patch }
  Write-Host "Removed $packageName from profile '$Profile'."
  exit 0
}

if (Test-Path $target) {
  $existing = Get-Item -LiteralPath $target -Force
  if ($existing.LinkType) {
    Remove-Item -LiteralPath $target -Force
  } else {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
}

if ($Link) {
  New-Item -ItemType Junction -Path $target -Target $source | Out-Null
} else {
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $source "package.json") -Destination $target -Force
  Copy-Item -LiteralPath (Join-Path $source "cordis.patch.yml") -Destination $target -Force
  Copy-Item -LiteralPath (Join-Path $source "lib") -Destination $target -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $source "README.md") -Destination $target -Force
  Copy-Item -LiteralPath (Join-Path $source "install.ps1") -Destination $target -Force
}

if (-not $NoPatch) {
  $text = if (Test-Path $patch) { Get-Content -LiteralPath $patch -Raw -Encoding UTF8 } else { "" }
  if ($text -notmatch [regex]::Escape($markerStart)) {
    $block = @"

$markerStart
- insert:
    - id: scholarloom-workbench
      name: '$packageName'
$markerEnd
"@
    [IO.File]::AppendAllText($patch, $block, $utf8)
  }
}

Write-Host "Installed $packageName into $target"
Write-Host "If the panel does not appear, restart DSH or toggle the 'scholarloom-workbench' loader entry."
