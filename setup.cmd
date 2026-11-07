@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
set "setup_code=%errorlevel%"
if not "%setup_code%"=="0" (
  echo.
  echo Setup failed. Review the message above.
  pause
  exit /b %setup_code%
)
echo.
echo Setup complete. Double-click launch.vbs to start ScholarLoom.
pause
