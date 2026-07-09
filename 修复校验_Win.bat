@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Cursor 汉化 - 修复安装校验

echo ============================================================
echo   修复 Cursor「安装已损坏」提示
echo   将重新计算 workbench.html 校验并写入 product.json
echo ============================================================
echo.

set "HANHUA_SCRIPT=%~dp0Cursor_Localization_Tool.py"
if not exist "%HANHUA_SCRIPT%" (
    echo [错误] 未找到 Cursor_Localization_Tool.py
    goto :WaitKey
)

where python >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 python，请先安装 Python 3
    goto :WaitKey
)

python "%HANHUA_SCRIPT%" --fix-checksum
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" (
    echo [提示] 请完全退出并重启 Cursor。
) else (
    echo [提示] 若提示权限不足，请右键本脚本选择「以管理员身份运行」。
)
:WaitKey
echo.
echo 按任意键继续...
pause >nul
exit /b %EXIT_CODE%
