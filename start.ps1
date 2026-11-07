$venvPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (Test-Path -LiteralPath $venvPython) {
  $python = $venvPython
} else {
  $python = (Get-Command python -ErrorAction Stop).Source
}
& $python (Join-Path $PSScriptRoot 'server.py')
