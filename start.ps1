$python = Get-Command python -ErrorAction Stop
& $python.Source (Join-Path $PSScriptRoot 'server.py')
