@echo off
setlocal
chcp 65001 >nul
title Oppi - DATAPREV e STN
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-oppi.ps1" -WebPort "%~1" -ApiPort "%~2"
if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o Oppi.
  pause
)
endlocal
