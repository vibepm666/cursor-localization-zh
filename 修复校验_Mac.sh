#!/usr/bin/env bash
# 修复 Cursor「安装已损坏」提示（macOS / Linux）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANHUA_SCRIPT="${SCRIPT_DIR}/Cursor_Localization_Tool.py"

echo "============================================================"
echo "  修复 Cursor「安装已损坏」提示"
echo "  将重新计算 workbench.html 校验并写入 product.json"
echo "============================================================"
echo

PYTHON_CMD=""
for cmd in python3 python; do
  if command -v "$cmd" >/dev/null 2>&1; then
    PYTHON_CMD="$cmd"
    break
  fi
done

if [[ -z "$PYTHON_CMD" ]]; then
  echo "[错误] 未找到 python3，请先安装 Python 3"
  exit 1
fi

if [[ ! -f "$HANHUA_SCRIPT" ]]; then
  echo "[错误] 未找到: $HANHUA_SCRIPT"
  exit 1
fi

"$PYTHON_CMD" "$HANHUA_SCRIPT" --fix-checksum
echo
echo "[提示] 请完全退出并重启 Cursor。"
