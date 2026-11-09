@echo off
chcp 65001 >nul
title May Chu Azota Toan
echo Dang khoi dong may chu Azota Toan...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
