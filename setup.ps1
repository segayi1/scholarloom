$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Find-Python {
  $launcher = Get-Command py -ErrorAction SilentlyContinue
  if ($launcher) {
    try {
      $candidate = (& $launcher.Source -3.12 -c "import sys; print(sys.executable)" 2>$null).Trim()
      if ($LASTEXITCODE -eq 0 -and $candidate) { return $candidate }
    } catch {}
  }

  $command = Get-Command python -ErrorAction SilentlyContinue
  if ($command) {
    $version = (& $command.Source -c "import sys; print('.'.join(map(str, sys.version_info[:2])))").Trim()
    if ($LASTEXITCODE -eq 0 -and [version]$version -ge [version]'3.12') {
      return $command.Source
    }
  }
  throw 'Python 3.12 or newer was not found. Install it from https://www.python.org/downloads/ and run setup again.'
}

$python = Find-Python
$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
  Write-Host "Creating .venv with $python"
  & $python -m venv .venv
  if ($LASTEXITCODE -ne 0) { throw 'Could not create .venv.' }
}

& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'Could not update pip.' }
& $venvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Could not install ScholarLoom dependencies.' }
& $venvPython -c "import fitz, ctranslate2, sentencepiece; print('Dependencies ready.')"
if ($LASTEXITCODE -ne 0) { throw 'Dependency verification failed.' }

Write-Host ''
Write-Host 'Setup complete. Double-click launch.vbs to start ScholarLoom.'
