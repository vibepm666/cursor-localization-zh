@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title 取消 Cursor 汉化

echo ============================================================
echo   取消 Cursor 汉化
echo   恢复工作台文件与相关文件为原始英文状态
echo ============================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "HANHUA_SCRIPT=%SCRIPT_DIR%Cursor_Localization_Tool.py"
set "INJECTION_MARKER_NEW=CURSOR_LOCALIZATION_INJECTION"
set "INJECTION_MARKER_OLD=CURSOR_HANHUA_INJECTION"

if defined CURSOR_INSTALL_DIR call :ValidateInstallDir

if not defined CURSOR_INSTALL_DIR if defined CURSOR_ROOT if exist "!CURSOR_ROOT!\Cursor.exe" set "CURSOR_INSTALL_DIR=!CURSOR_ROOT!"

if not defined CURSOR_INSTALL_DIR call :DetectCursorDir

if not defined CURSOR_INSTALL_DIR goto :NoInstallDir

set "WORKBENCH_HTML=!CURSOR_INSTALL_DIR!\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html"

if not exist "!HANHUA_SCRIPT!" goto :NoScript
if not exist "!WORKBENCH_HTML!" goto :NoWorkbench

findstr /c:"%INJECTION_MARKER_NEW%" "!WORKBENCH_HTML!" >nul 2>&1
if errorlevel 1 findstr /c:"%INJECTION_MARKER_OLD%" "!WORKBENCH_HTML!" >nul 2>&1
if errorlevel 1 goto :NotInjected

echo [提示] 请先完全退出 Cursor，再执行恢复。
call :ShowInstallDir
echo.
echo 即将执行:
echo   恢复工作台及相关文件为原始英文状态
echo.
set /p "CONFIRM=确认取消汉化并恢复原始文件？[Y/N]: "
if /i not "%CONFIRM%"=="Y" if /i not "%CONFIRM%"=="YES" goto :UserCancelled

echo.
echo [执行] 正在恢复原始文件...
python "!HANHUA_SCRIPT!" --restore
if errorlevel 1 goto :RestoreFailed

echo.
echo [完成] 已取消汉化。请重新启动 Cursor 以生效。
call :WaitKey
exit /b 0

:NoInstallDir
echo [错误] 未找到 Cursor 安装目录。
echo [提示] 请设置环境变量 CURSOR_INSTALL_DIR，或安装到常见路径。
call :WaitKey
exit /b 1

:NoScript
for %%I in ("!HANHUA_SCRIPT!") do echo [错误] 未找到汉化脚本: %%~fI
call :WaitKey
exit /b 1

:NoWorkbench
for %%I in ("!WORKBENCH_HTML!") do echo [错误] 未找到工作台文件 workbench.html: %%~fI
echo [提示] 请检查 CURSOR_INSTALL_DIR 是否正确。
call :WaitKey
exit /b 1

:NotInjected
echo [检查] 当前未检测到汉化注入，无需恢复。
call :ShowInstallDir
call :WaitKey
exit /b 0

:UserCancelled
echo [取消] 未做任何更改。
call :WaitKey
exit /b 0

:RestoreFailed
echo.
echo [错误] 恢复失败，请查看上方输出。
call :WaitKey
exit /b 1

:ValidateInstallDir
if exist "!CURSOR_INSTALL_DIR!\Cursor.exe" exit /b 0
set "CURSOR_INSTALL_DIR="
exit /b 0

:ShowInstallDir
for %%I in ("!CURSOR_INSTALL_DIR!") do echo [信息] 安装目录: %%~fI
exit /b 0

:WaitKey
echo.
echo 按任意键退出...
pause >nul
exit /b 0

:DetectCursorDir
set "PFX86=%PROGRAMFILES(X86)%"
if not defined CURSOR_INSTALL_DIR if exist "%LOCALAPPDATA%\Programs\Cursor\Cursor.exe" if exist "%LOCALAPPDATA%\Programs\Cursor\resources\app" set "CURSOR_INSTALL_DIR=%LOCALAPPDATA%\Programs\Cursor"
if not defined CURSOR_INSTALL_DIR if exist "%PROGRAMFILES%\Cursor\Cursor.exe" if exist "%PROGRAMFILES%\Cursor\resources\app" set "CURSOR_INSTALL_DIR=%PROGRAMFILES%\Cursor"
if not defined CURSOR_INSTALL_DIR if exist "!PFX86!\Cursor\Cursor.exe" if exist "!PFX86!\Cursor\resources\app" set "CURSOR_INSTALL_DIR=!PFX86!\Cursor"
exit /b 0
