#!/usr/bin/env bash
# Cursor 汉化一键启动（macOS / Linux）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANHUA_SCRIPT="${SCRIPT_DIR}/Cursor_Localization_Tool.py"
INJECTION_MARKER_NEW="CURSOR_LOCALIZATION_INJECTION"
INJECTION_MARKER_OLD="CURSOR_HANHUA_INJECTION"

if [[ "$(uname -s)" == "Darwin" ]]; then
  DEFAULT_USER_DIR="${HOME}/Library/Application Support/Cursor"
  DEFAULT_APP="/Applications/Cursor.app"
else
  DEFAULT_USER_DIR="${HOME}/.config/Cursor"
  DEFAULT_APP=""
fi

CURSOR_USER_DIR="${CURSOR_USER_DATA_DIR:-$DEFAULT_USER_DIR}"
PYTHON_CMD=""
for cmd in python3 python; do
  if command -v "$cmd" >/dev/null 2>&1; then
    PYTHON_CMD="$cmd"
    break
  fi
done

echo "============================================================"
echo "  Cursor 汉化启动器"
echo "  自动注入/更新汉化脚本，可选启动 Cursor"
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

# 让 Python 脚本自动检测安装路径；也可预先 export CURSOR_INSTALL_DIR
if [[ -z "${CURSOR_INSTALL_DIR:-}" && "$(uname -s)" == "Darwin" && -d "$DEFAULT_APP" ]]; then
  export CURSOR_INSTALL_DIR="$DEFAULT_APP"
fi

export CURSOR_USER_DATA_DIR="$CURSOR_USER_DIR"

# 解析 workbench.html 与安装目录（Python 输出两行）。
# 注意：macOS 默认 /bin/bash 是 3.2，不支持 mapfile/readarray。
_CURSOR_PATHS=()
while IFS= read -r _line; do
  _CURSOR_PATHS+=("$_line")
done < <(SCRIPT_DIR_ENV="$SCRIPT_DIR" "$PYTHON_CMD" -c '
import os, sys
script_dir = os.environ["SCRIPT_DIR_ENV"]
sys.path.insert(0, script_dir)
os.chdir(script_dir)
import Cursor_Localization_Tool as t
print(t.HuoQu_HTML_LuJing())
print(t.CURSOR_AN_ZHUANG_LU_JING)
')
WORKBENCH_HTML="${_CURSOR_PATHS[0]:-}"
CURSOR_INSTALL_DIR="${_CURSOR_PATHS[1]:-${CURSOR_INSTALL_DIR:-}}"
unset _CURSOR_PATHS _line

if [[ ! -f "$WORKBENCH_HTML" ]]; then
  echo "[错误] 未找到 workbench.html:"
  echo "  $WORKBENCH_HTML"
  echo "[提示] 请设置 CURSOR_INSTALL_DIR，例如："
  echo "  export CURSOR_INSTALL_DIR=/Applications/Cursor.app"
  exit 1
fi

echo "[信息] 安装目录: ${CURSOR_INSTALL_DIR}"
echo "[信息] 用户数据: ${CURSOR_USER_DIR}"
echo "[信息] Workbench: ${WORKBENCH_HTML}"
echo
echo "即将执行："
echo "  安装/更新官方简体中文语言包（VSIX）"
echo "  向 Cursor 安装目录注入/更新汉化脚本（会修改 workbench.html）"
echo "  汉化完成后将询问是否自动启动 Cursor"
echo
read -r -p "确认继续？[Y/N]: " CONFIRM
case "$(printf '%s' "$CONFIRM" | tr '[:upper:]' '[:lower:]')" in
  y|yes) ;;
  *)
    echo "[取消] 已取消操作。"
    exit 0
    ;;
esac
echo

CURSOR_EXEC="$(SCRIPT_DIR_ENV="$SCRIPT_DIR" "$PYTHON_CMD" -c '
import os, sys
script_dir = os.environ["SCRIPT_DIR_ENV"]
sys.path.insert(0, script_dir)
import Cursor_Localization_Tool as t
print(t.HuoQu_Cursor_KeZhiXing_LuJing())
')"

if grep -qE "$INJECTION_MARKER_NEW|$INJECTION_MARKER_OLD" "$WORKBENCH_HTML" 2>/dev/null; then
  echo "[检查] 已注入，正在更新汉化脚本..."
  "$PYTHON_CMD" "$HANHUA_SCRIPT" || echo "[警告] 更新过程有报错"
else
  echo "[检查] 未注入，正在执行汉化..."
  "$PYTHON_CMD" "$HANHUA_SCRIPT" || echo "[警告] 汉化过程有报错"
fi

echo
read -r -p "是否自动启动 Cursor？[Y/N]: " START_CURSOR
case "$(printf '%s' "$START_CURSOR" | tr '[:upper:]' '[:lower:]')" in
  y|yes)
    echo
    echo "[启动] $CURSOR_EXEC"
    echo "[数据] $CURSOR_USER_DIR"
    if [[ "$(uname -s)" == "Darwin" ]]; then
      if [[ "$CURSOR_EXEC" == *.app ]]; then
        open -na "$CURSOR_EXEC" --args --user-data-dir="$CURSOR_USER_DIR"
      else
        open -n "$CURSOR_INSTALL_DIR" --args --user-data-dir="$CURSOR_USER_DIR"
      fi
    else
      "$CURSOR_EXEC" --user-data-dir="$CURSOR_USER_DIR" &
    fi
    echo "[完成] Cursor 已启动"
    ;;
  *)
    echo "[跳过] 汉化已完成，未启动 Cursor。"
    ;;
esac
