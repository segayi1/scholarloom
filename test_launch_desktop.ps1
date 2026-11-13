$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition 'namespace System.Windows { public static class MessageBox { public static int Show(string text, string title) { return 0; } } }'

function Add-Type { param($AssemblyName) }
function Get-NetTCPConnection {
    param($LocalPort, $State, $ErrorAction)
    if ($State -eq 'Listen' -and $global:hasListener) { [pscustomobject]@{ OwningProcess = 12345 } }
    if ($State -eq 'Established' -and $global:connected) { [pscustomobject]@{ OwningProcess = 12345 } }
}
function Get-CimInstance {
    param($ClassName, $Filter)
    $path = if ($global:foreign) { 'C:\other\server.py' } else { Join-Path $PSScriptRoot 'server.py' }
    [pscustomobject]@{ CommandLine = "pythonw.exe `"$path`" --port 8767"; CreationDate = $global:started }
}
function Invoke-RestMethod {
    param($Uri, $TimeoutSec)
    if ($Uri -like '*/api/health') { return [pscustomobject]@{ ok = $true; app = 'scholarloom' } }
    $jobs = if ($global:busyJob) { @([pscustomobject]@{ status = 'processing' }) } else { @() }
    [pscustomobject]@{ jobs = $jobs; health = [pscustomobject]@{ fullReadActive = $global:fullReadActive; summary = [pscustomobject]@{ status = $global:summary }; authorization = $global:authorization } }
}
function Stop-Process { param($Id, $ErrorAction) $global:stopped++ }
function Get-Process { param($Id, $ErrorAction) }
function Wait-Process { param($Timeout, $ErrorAction) }
function Start-Process {
    param($FilePath, $ArgumentList, $WorkingDirectory, $WindowStyle)
    if ($FilePath -like 'http:*') { $global:opened++ } else { $global:startedServer++ }
}

$pythonw = Join-Path $PSScriptRoot '.venv\Scripts\pythonw.exe'
$createdPythonw = $false
if (!(Test-Path -LiteralPath $pythonw)) {
    New-Item -ItemType Directory -Path (Split-Path $pythonw -Parent) -Force | Out-Null
    Set-Content -LiteralPath $pythonw -Value ''
    $createdPythonw = $true
}

function Assert-Launch($name, $hasListener, $started, $summary, $connected, $foreign, $expectedStop, $expectedStart, $expectedOpen, $busyJob = $false, $authorization = 'idle', $fullReadActive = 0) {
    $global:hasListener = $hasListener; $global:started = $started; $global:summary = $summary
    $global:connected = $connected; $global:foreign = $foreign
    $global:busyJob = $busyJob; $global:authorization = $authorization; $global:fullReadActive = $fullReadActive
    $global:stopped = 0; $global:startedServer = 0; $global:opened = 0
    & (Join-Path $PSScriptRoot 'launch-desktop.ps1')
    if ($global:stopped -ne $expectedStop -or $global:startedServer -ne $expectedStart -or $global:opened -ne $expectedOpen) {
        throw "$name failed: stop=$global:stopped start=$global:startedServer open=$global:opened"
    }
    Write-Host "$name passed"
}

try {
    Assert-Launch 'Fresh start' $false (Get-Date) 'done' $false $false 0 1 1
    Assert-Launch 'Reuse current service' $true (Get-Date).AddDays(1) 'done' $false $false 0 0 1
    Assert-Launch 'Restart updated service' $true (Get-Date).AddDays(-1) 'done' $false $false 1 1 1
    Assert-Launch 'Keep running work' $true (Get-Date).AddDays(-1) 'running' $false $false 0 0 0
    Assert-Launch 'Keep active import' $true (Get-Date).AddDays(-1) 'done' $false $false 0 0 0 $true
    Assert-Launch 'Keep active full read' $true (Get-Date).AddDays(-1) 'done' $false $false 0 0 0 $false 'idle' 1
    Assert-Launch 'Keep pending authorization' $true (Get-Date).AddDays(-1) 'done' $false $false 0 0 0 $false 'pending'
    Assert-Launch 'Keep active request' $true (Get-Date).AddDays(-1) 'done' $true $false 0 0 0
    Assert-Launch 'Protect other service' $true (Get-Date).AddDays(-1) 'done' $false $true 0 0 0
} finally {
    if ($createdPythonw) {
        Remove-Item -LiteralPath $pythonw -Force -ErrorAction SilentlyContinue
        $scripts = Split-Path $pythonw -Parent
        $venv = Split-Path $scripts -Parent
        foreach ($dir in @($scripts, $venv)) {
            if ((Test-Path -LiteralPath $dir) -and -not (Get-ChildItem -LiteralPath $dir -Force)) {
                Remove-Item -LiteralPath $dir -Force
            }
        }
    }
}
