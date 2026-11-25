@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "EXIT_CODE=1"
set "HANHUA_SCRIPT=%~dp0Cursor_Localization_Tool.py"

if not exist "%HANHUA_SCRIPT%" goto :NoScript

call :ResolvePython
if errorlevel 1 goto :End

"!PYTHON_CMD!" "%HANHUA_SCRIPT%" --fix-checksum
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

:ResolvePython
set "PYTHON_CMD="
for %%V in (Python314 Python313 Python312 Python311 Python310) do (
    if not defined PYTHON_CMD if exist "C:\%%V\python.exe" set "PYTHON_CMD=C:\%%V\python.exe"
    if not defined PYTHON_CMD if exist "%LOCALAPPDATA%\Programs\Python\%%V\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\%%V\python.exe"
    if not defined PYTHON_CMD if exist "%ProgramFiles%\%%V\python.exe" set "PYTHON_CMD=%ProgramFiles%\%%V\python.exe"
)
if not defined PYTHON_CMD (
    for /f "delims=" %%P in ('where python 2^>nul') do (
        echo %%P | findstr /i /c:"Microsoft\WindowsApps" /c:"microsoft\windowsapps" >nul 2>&1
        if errorlevel 1 (
            set "PYTHON_CMD=%%P"
            goto :PythonResolved
        )
    )
)
if not defined PYTHON_CMD (
    where py >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%P in ('py -3 -c "import sys; print(sys.executable)" 2^>nul') do (
            echo %%P | findstr /i /c:"Microsoft\WindowsApps" /c:"microsoft\windowsapps" >nul 2>&1
            if errorlevel 1 set "PYTHON_CMD=%%P"
        )
    )
)
:PythonResolved
if not defined PYTHON_CMD (
    echo [ERROR] python not found
    exit /b 1
)
"!PYTHON_CMD!" --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] python cannot run
    exit /b 1
)
exit /b 0
