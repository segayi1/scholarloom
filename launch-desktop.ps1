$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$address = 'http://127.0.0.1:8767'
$python = Join-Path $project '.venv\Scripts\pythonw.exe'
$server = Join-Path $project 'server.py'
try {
    if (!(Test-Path -LiteralPath $python)) { throw 'Run setup.cmd first.' }
    $listener = Get-NetTCPConnection -LocalPort 8767 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
        if (!$process.CommandLine -or !$process.CommandLine.Contains($server)) { throw 'Port 8767 is in use by another program.' }
        $changed = Get-ChildItem -LiteralPath $project -Filter '*.py' -File | Where-Object {
            $_.Name -notlike 'test_*' -and $_.LastWriteTime -gt $process.CreationDate
        } | Select-Object -First 1
        if ($changed) {
            $state = Invoke-RestMethod -Uri "$address/api/state" -TimeoutSec 10
            $busyJobs = @($state.jobs | Where-Object { $_.status -in @('processing', 'summarizing') })
            $connections = @(Get-NetTCPConnection -LocalPort 8767 -State Established -ErrorAction SilentlyContinue)
            if ($busyJobs.Count -or $state.health.fullReadActive -gt 0 -or $state.health.summary.status -eq 'running' -or $state.health.authorization -eq 'pending' -or $connections.Count) {
                throw 'ScholarLoom has work in progress. Wait for it to finish, then open this shortcut again to load the update.'
            }
            Stop-Process -Id $listener.OwningProcess -ErrorAction Stop
            Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue | Wait-Process -Timeout 10 -ErrorAction Stop
            $listener = $null
        }
    }
    if (!$listener) {
        Start-Process -FilePath $python -ArgumentList @('"' + $server + '"', '--port', '8767') -WorkingDirectory $project -WindowStyle Hidden
    }
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "$address/api/health" -TimeoutSec 1
            if ($health.ok -and $health.app -eq 'scholarloom') { $ready = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'ScholarLoom did not become ready. Check setup and port 8767.' }
    Start-Process $address
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'ScholarLoom') | Out-Null
}
