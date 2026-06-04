#!/usr/bin/env bash
# 取消 Cursor 汉化（macOS / Linux）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANHUA_SCRIPT="${SCRIPT_DIR}/Cursor_Localization_Tool.py"
INJECTION_MARKER_NEW="CURSOR_LOCALIZATION_INJECTION"
INJECTION_MARKER_OLD="CURSOR_HANHUA_INJECTION"

PYTHON_CMD=""
for cmd in python3 python; do
  if command -v "$cmd" >/dev/null 2>&1; then
    PYTHON_CMD="$cmd"
    break
  fi
done

echo "============================================================"
echo "  取消 Cursor 汉化"
echo "  恢复工作台文件与相关文件为原始英文状态"
echo "============================================================"
echo

if [[ -z "$PYTHON_CMD" ]]; then
  echo "[错误] 未找到 Python，请先安装 Python 3"
  exit 1
fi

if [[ ! -f "$HANHUA_SCRIPT" ]]; then
  echo "[错误] 未找到汉化脚本: $HANHUA_SCRIPT"
  exit 1
fi

if [[ "$(uname -s)" == "Darwin" && -z "${CURSOR_INSTALL_DIR:-}" && -d "/Applications/Cursor.app" ]]; then
  export CURSOR_INSTALL_DIR="/Applications/Cursor.app"
fi

mapfile -t _CURSOR_PATHS < <("$PYTHON_CMD" -c "
import os, sys
sys.path.insert(0, '${SCRIPT_DIR}')
os.chdir('${SCRIPT_DIR}')
import Cursor_Localization_Tool as t
print(t.HuoQu_HTML_LuJing())
print(t.CURSOR_AN_ZHUANG_LU_JING)
")
WORKBENCH_HTML="${_CURSOR_PATHS[0]:-}"
CURSOR_INSTALL_DIR="${_CURSOR_PATHS[1]:-${CURSOR_INSTALL_DIR:-}}"
unset _CURSOR_PATHS

if [[ ! -f "$WORKBENCH_HTML" ]]; then
  echo "[错误] 未找到工作台文件 (workbench.html):"
  echo "  $WORKBENCH_HTML"
  echo "[提示] 请设置 CURSOR_INSTALL_DIR，例如："
  echo "  export CURSOR_INSTALL_DIR=/Applications/Cursor.app"
  exit 1
fi

if ! grep -qE "$INJECTION_MARKER_NEW|$INJECTION_MARKER_OLD" "$WORKBENCH_HTML" 2>/dev/null; then
  echo "[检查] 当前未检测到汉化注入，无需恢复。"
  echo "[信息] 安装目录: ${CURSOR_INSTALL_DIR}"
  exit 0
fi

echo "[提示] 请先完全退出 Cursor，再执行恢复。"
echo "[信息] 安装目录: ${CURSOR_INSTALL_DIR}"
echo
echo "即将执行："
echo "  恢复 workbench.html 及相关文件为原始英文状态"
echo
if [[ ! -t 0 ]]; then
  echo "[错误] 未检测到交互式终端，无法确认操作。"
  echo "[提示] 请在终端中运行此脚本。"
  exit 1
fi
read -r -p "确认取消汉化并恢复原始文件？[Y/N]: " CONFIRM || {
  echo "[错误] 读取确认输入失败。"
  exit 1
}
case "$(printf '%s' "$CONFIRM" | tr '[:upper:]' '[:lower:]')" in
  y|yes) ;;
  *)
    echo "[取消] 未做任何更改。"
    exit 0
    ;;
esac

echo
echo "[执行] 正在恢复原始文件..."
if ! "$PYTHON_CMD" "$HANHUA_SCRIPT" --restore; then
  echo
  echo "[错误] 恢复失败，请查看上方输出。"
  exit 1
fi
echo
echo "[完成] 已取消汉化。请重新启动 Cursor 以生效。"
