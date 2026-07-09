@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "EXIT_CODE=1"
set "HANHUA_SCRIPT=%~dp0Cursor_Localization_Tool.py"

if not exist "%HANHUA_SCRIPT%" goto :NoScript

call :CheckPython
if errorlevel 1 goto :End

python "%HANHUA_SCRIPT%" --fix-checksum
set "EXIT_CODE=!ERRORLEVEL!"
goto :End

:NoScript
echo [ERROR] Cursor_Localization_Tool.py not found

:End
echo.
if not "!EXIT_CODE!"=="0" (
    echo [TIP] If permission denied, run this script as Administrator.
)
echo Press any key to exit...
pause >nul
exit /b !EXIT_CODE!

:CheckPython
where python >nul 2>&1
if errorlevel 1 goto :NoPython
for /f "delims=" %%P in ('where python 2^>nul') do (
    echo %%P | findstr /i /c:"Microsoft\WindowsApps" /c:"microsoft\windowsapps" >nul 2>&1
    if not errorlevel 1 goto :StorePython
    goto :PythonOk
)
:NoPython
echo [ERROR] python not found
exit /b 1
:StorePython
echo [ERROR] Windows Store python placeholder detected
exit /b 1
:PythonOk
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] python cannot run
    exit /b 1
)
exit /b 0
