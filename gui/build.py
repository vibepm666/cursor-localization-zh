"""构建便携版 exe（Windows）。

    python gui/build.py

产物：dist/CursorHanhua.exe —— 单文件、无安装、无 Python 依赖。

构建在专用精简 venv（.build-venv）里进行：只装 pyinstaller + pywebview，
避免把 Anaconda 里的 numpy / pandas 等无关包打进 exe（能差 10 倍体积）。
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = "CursorHanhua"
VENV = os.path.join(ROOT, ".build-venv")

EXCLUDES = [
    "tkinter", "numpy", "pandas", "scipy", "matplotlib", "PIL",
    "IPython", "jupyter", "pytest", "setuptools", "pip",
]


def ensure_venv() -> str:
    """准备只装构建依赖的 venv，返回其中的 python。"""
    python = os.path.join(VENV, "Scripts", "python.exe")
    if not os.path.isfile(python):
        print("创建构建环境 .build-venv ...")
        subprocess.run([sys.executable, "-m", "venv", VENV], check=True)
        subprocess.run([python, "-m", "pip", "install", "--quiet", "--upgrade", "pip"], check=True)
        subprocess.run(
            [python, "-m", "pip", "install", "--quiet", "pyinstaller>=6", "pywebview>=6"],
            check=True,
        )
    return python


def main() -> int:
    os.chdir(ROOT)
    python = ensure_venv()

    for stale in ("build", "dist", f"{NAME}.spec"):
        path = os.path.join(ROOT, stale)
        if os.path.isdir(path):
            shutil.rmtree(path, ignore_errors=True)
        elif os.path.isfile(path):
            os.remove(path)

    args = [
        python, "-m", "PyInstaller",
        "--noconfirm", "--clean", "--onefile", "--windowed",
        "--name", NAME,
        "--icon", os.path.join("gui", "app.ico"),
        "--paths", ".",
        "--add-data", "localization;localization",
        "--add-data", "VSCode-language-pack-zh-hans.vsix;.",
        "--add-data", "gui/ui;gui/ui",
        "--hidden-import", "webview.platforms.edgechromium",
        "--distpath", "dist",
        "--workpath", "build",
    ]
    for module in EXCLUDES:
        args += ["--exclude-module", module]
    args.append(os.path.join("gui", "app.py"))

    result = subprocess.run(args)
    if result.returncode == 0:
        exe = os.path.join(ROOT, "dist", f"{NAME}.exe")
        size = os.path.getsize(exe) / 1024 / 1024
        print(f"\n完成: {exe}  ({size:.1f} MB)")
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
