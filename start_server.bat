@echo off
chcp 65001 > nul
echo ========================================================
echo  تشغيل خادم منصة بصمة أمل ^| HOPE TOUCH
echo ========================================================
echo.
"%~dp0.tools\node-v20.18.0-win-x64\node.exe" "%~dp0server\server.js"
pause

