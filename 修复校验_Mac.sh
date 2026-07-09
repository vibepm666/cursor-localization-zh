#!/usr/bin/env bash
# 修复 Cursor 安装已损坏提示（macOS / Linux）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANHUA_SCRIPT="${SCRIPT_DIR}/Cursor_Localization_Tool.py"

PYTHON_CMD=""
for cmd in python3 python; do
  if command -v "$cmd" >/dev/null 2>&1; then
    PYTHON_CMD="$cmd"
    break
  fi
done

echo "============================================================"
echo "  修复 Cursor 安装已损坏提示"
echo "  将重新计算 workbench.html 校验并写入 product.json"
echo "============================================================"
echo

if [[ -z "$PYTHON_CMD" ]]; then
  echo "[错误] 未找到 python3，请先安装 Python 3"
  exit 1
fi

if ! "$PYTHON_CMD" --version >/dev/null 2>&1; then
  echo "[错误] $PYTHON_CMD 无法正常运行，请检查 Python 安装。"
  exit 1
fi

if [[ ! -f "$HANHUA_SCRIPT" ]]; then
  echo "[错误] 未找到: $HANHUA_SCRIPT"
  exit 1
fi

if [[ "$(uname -s)" == "Darwin" && -z "${CURSOR_INSTALL_DIR:-}" && -d "/Applications/Cursor.app" ]]; then
  export CURSOR_INSTALL_DIR="/Applications/Cursor.app"
fi

echo "[执行] 正在修复 product.json 校验值..."
if ! (cd "$SCRIPT_DIR" && "$PYTHON_CMD" "$HANHUA_SCRIPT" --fix-checksum); then
  echo
  echo "[失败] 校验修复未完成，请查看上方输出。"
  exit 1
fi

echo
echo "[完成] 校验修复完成，请完全退出并重启 Cursor。"
