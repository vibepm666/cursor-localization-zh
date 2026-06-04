@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Cursor 汉化启动器 - by VibePM.net

echo ============================================================
echo   Cursor 汉化启动器 - by VibePM.net
echo   自动注入/更新汉化脚本，可选启动 Cursor
echo ============================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "HANHUA_SCRIPT=%SCRIPT_DIR%Cursor_Localization_Tool.py"
set "INJECTION_MARKER_NEW=CURSOR_LOCALIZATION_INJECTION"
set "INJECTION_MARKER_OLD=CURSOR_HANHUA_INJECTION"
set "CURSOR_USER_DIR=%APPDATA%\Cursor"

if defined CURSOR_USER_DATA_DIR set "CURSOR_USER_DIR=%CURSOR_USER_DATA_DIR%"

if defined CURSOR_INSTALL_DIR call :ValidateInstallDir

if not defined CURSOR_INSTALL_DIR if defined CURSOR_ROOT if exist "!CURSOR_ROOT!\Cursor.exe" set "CURSOR_INSTALL_DIR=!CURSOR_ROOT!"

if not defined CURSOR_INSTALL_DIR call :DetectCursorDir

if not defined CURSOR_INSTALL_DIR goto :NoInstallDir

set "CURSOR_EXE=!CURSOR_INSTALL_DIR!\Cursor.exe"
set "WORKBENCH_HTML=!CURSOR_INSTALL_DIR!\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html"

if not exist "!HANHUA_SCRIPT!" goto :NoScript
if not exist "!CURSOR_EXE!" goto :NoExe
if not exist "!WORKBENCH_HTML!" goto :NoWorkbench

call :ShowInfo
echo.
echo 即将执行: 安装官方简体中文语言包、注入/更新汉化脚本并修改工作台文件; 完成后可选择是否自动启动 Cursor
echo.
set /p "CONFIRM=确认继续？[Y/N]: "
if /i not "%CONFIRM%"=="Y" if /i not "%CONFIRM%"=="YES" goto :UserCancelled

echo.

findstr /c:"%INJECTION_MARKER_NEW%" "!WORKBENCH_HTML!" >nul 2>&1
if errorlevel 1 findstr /c:"%INJECTION_MARKER_OLD%" "!WORKBENCH_HTML!" >nul 2>&1
if errorlevel 1 goto :DoInject

echo [检查] 已注入，正在更新汉化脚本...
python "!HANHUA_SCRIPT!"
if errorlevel 1 (
    echo.
    echo [警告] 更新过程有报错
) else (
    echo.
    echo [完成] 汉化脚本已更新
)
goto :AfterInject

:DoInject
echo [检查] 未注入，正在执行汉化...
python "!HANHUA_SCRIPT!"
if errorlevel 1 (
    echo.
    echo [警告] 汉化过程有报错
) else (
    echo.
    echo [完成] 汉化已完成
)

:AfterInject
echo.
set /p "START_CURSOR=是否自动启动 Cursor？[Y/N]: "
if /i not "%START_CURSOR%"=="Y" if /i not "%START_CURSOR%"=="YES" goto :SkipStart

echo.
echo [启动] 正在启动 Cursor...
start "" "!CURSOR_EXE!" --user-data-dir="!CURSOR_USER_DIR!"
echo [完成] Cursor 已启动
exit /b 0

:SkipStart
echo [跳过] 汉化已完成，未启动 Cursor。
call :WaitKey
exit /b 0

:NoInstallDir
echo [错误] 未找到 Cursor 安装目录。
echo [提示] 请设置 CURSOR_INSTALL_DIR，或将 Cursor 安装到常见路径。
call :WaitKey
exit /b 1

:NoScript
for %%I in ("!HANHUA_SCRIPT!") do echo [错误] 未找到汉化脚本: %%~fI
call :WaitKey
exit /b 1

:NoExe
for %%I in ("!CURSOR_EXE!") do echo [错误] 未找到 Cursor.exe: %%~fI
call :WaitKey
exit /b 1

:NoWorkbench
for %%I in ("!WORKBENCH_HTML!") do echo [错误] 未找到 workbench.html: %%~fI
echo [提示] 请检查 CURSOR_INSTALL_DIR 是否正确。
call :WaitKey
exit /b 1

:UserCancelled
echo [取消] 已取消操作。
call :WaitKey
exit /b 0

:ValidateInstallDir
if exist "!CURSOR_INSTALL_DIR!\Cursor.exe" exit /b 0
set "CURSOR_INSTALL_DIR="
exit /b 0

:ShowInfo
for %%I in ("!CURSOR_INSTALL_DIR!") do echo [信息] 安装目录: %%~fI
for %%I in ("!CURSOR_USER_DIR!") do echo [信息] 用户数据: %%~fI
for %%I in ("!WORKBENCH_HTML!") do echo [信息] Workbench: %%~fI
exit /b 0

:WaitKey
echo.
echo 按任意键继续...
pause >nul
exit /b 0

:DetectCursorDir
set "PFX86=%PROGRAMFILES(X86)%"
if not defined CURSOR_INSTALL_DIR if exist "%LOCALAPPDATA%\Programs\Cursor\Cursor.exe" if exist "%LOCALAPPDATA%\Programs\Cursor\resources\app" set "CURSOR_INSTALL_DIR=%LOCALAPPDATA%\Programs\Cursor"
if not defined CURSOR_INSTALL_DIR if exist "%PROGRAMFILES%\Cursor\Cursor.exe" if exist "%PROGRAMFILES%\Cursor\resources\app" set "CURSOR_INSTALL_DIR=%PROGRAMFILES%\Cursor"
if not defined CURSOR_INSTALL_DIR if exist "!PFX86!\Cursor\Cursor.exe" if exist "!PFX86!\Cursor\resources\app" set "CURSOR_INSTALL_DIR=!PFX86!\Cursor"
exit /b 0
