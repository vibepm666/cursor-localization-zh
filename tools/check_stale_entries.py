# -*- coding: utf-8 -*-
"""
Cursor 汉化字典过期条目检测工具
功能：扫描 Cursor 安装目录下的所有 JS/JSON 文件，检查字典中的英文 key 是否仍然存在。
      找不到的条目即为可能过期的翻译。

用法：
  python tools/check_stale_entries.py                    检测所有字典
  python tools/check_stale_entries.py --dict Core       只检测 Core_Dictionary
  python tools/check_stale_entries.py --dict AdPopup    只检测 Ad_Popup_Dictionary
  python tools/check_stale_entries.py --dict Partial    只检测 Partial_Fragments
  python tools/check_stale_entries.py --dict Dropdown   只检测 Dropdown_Fragments
  python tools/check_stale_entries.py --json output.json  输出 JSON 报告
"""

import os
import sys
import json
import glob
import argparse


# ============ 配置 ============
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
LOCALIZATION_DIR = os.path.join(ROOT_DIR, "localization")

# Cursor 安装目录候选（与 Cursor_Localization_Tool.py 保持一致：含其他盘符）
CURSOR_PATHS = [
    r"C:\Program Files\Cursor",
    r"C:\Program Files (x86)\Cursor",
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "cursor"),
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "Cursor"),
]
for _PanFu in ("C", "D", "E", "F", "G", "H"):
    for _ZiMuLu in (r"Program Files\Cursor", r"Program Files (x86)\Cursor", r"Cursor", r"Programs\Cursor"):
        CURSOR_PATHS.append(os.path.join(_PanFu + ":\\", _ZiMuLu))

# 要扫描的文件扩展名
SCAN_EXTENSIONS = {".js", ".json", ".html", ".ts", ".tsx"}

# 跳过的目录（不需要扫描的）
SKIP_DIRS = {"node_modules", ".git", "extensions", "media", "vscode-dts", "bin", "codeBin"}

# ============ 字典加载 ============

def load_core_dictionary():
    """加载 Core_Dictionary.json，返回 [(key, value, section), ...]"""
    path = os.path.join(LOCALIZATION_DIR, "Core_Dictionary.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    entries = []
    for section in data.get("sections", []):
        sec_name = section.get("id", "unknown")
        for pair in section.get("entries", []):
            if isinstance(pair, list) and len(pair) >= 2:
                entries.append((pair[0], pair[1], sec_name))
    return entries


def load_simple_dict(filename):
    """加载简单格式的字典（entries 为 [[key, value], ...]）"""
    path = os.path.join(LOCALIZATION_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    entries = []
    for pair in data.get("entries", []):
        if isinstance(pair, list) and len(pair) >= 2:
            entries.append((pair[0], pair[1], filename))
    return entries


def load_tray_dictionary():
    """加载 Tray_Dictionary.json（特殊格式：包含 label: 前缀）"""
    path = os.path.join(LOCALIZATION_DIR, "Tray_Dictionary.json")
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    entries = []
    for pair in data.get("replacements", []):
        if isinstance(pair, list) and len(pair) >= 2:
            entries.append((pair[0], pair[1], "Tray"))
    return entries


# ============ 文件扫描 ============

def find_cursor_dir():
    """查找 Cursor 安装目录"""
    for p in CURSOR_PATHS:
        if os.path.isdir(p) and os.path.isfile(os.path.join(p, "Cursor.exe")):
            return p
    return None


def collect_source_files(cursor_dir):
    """收集 Cursor 源码目录下所有需要扫描的文件"""
    app_dir = os.path.join(cursor_dir, "resources", "app")
    app_out_dir = os.path.join(app_dir, "out")
    if not os.path.isdir(app_out_dir):
        print(f"[错误] 未找到 out 目录: {app_out_dir}")
        return []

    files = []
    # out/ 目录下的所有 JS/JSON
    for root, dirs, filenames in os.walk(app_out_dir):
        # 跳过不需要的目录
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in filenames:
            ext = os.path.splitext(fn)[1].lower()
            if ext in SCAN_EXTENSIONS:
                files.append(os.path.join(root, fn))

    # main.js（托盘菜单等主进程代码）
    main_js = os.path.join(app_dir, "main.js")
    if os.path.isfile(main_js):
        files.append(main_js)

    return files


def load_all_text(files):
    """把所有文件内容合并成一个大字符串（已归一化）"""
    big_text = []
    for fp in files:
        try:
            with open(fp, encoding="utf-8", errors="ignore") as f:
                big_text.append(f.read())
        except Exception:
            pass
    return normalize_text("\n".join(big_text))


# ============ 检测逻辑 ============

def normalize_text(text):
    """归一化文本，统一智能引号和换行符，减少匹配误报"""
    # 智能引号 -> 普通引号
    text = text.replace("\u2018", "'").replace("\u2019", "'")  # ' ' -> '
    text = text.replace("\u201c", '"').replace("\u201d", '"')  # " " -> "
    # 统一换行符
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text


def is_key_present(key, big_text_normalized):
    """检查 key 是否存在于大文本中。
    对于短 key（< 3字符），跳过检测，避免误报。
    """
    if len(key.strip()) < 3:
        return True  # 太短，跳过
    key_norm = normalize_text(key)
    return key_norm in big_text_normalized


def check_entries(entries, big_text, dict_name):
    """检查一组条目，返回 (过期条目列表, 总数)"""
    stale = []
    for key, value, section in entries:
        if not is_key_present(key, big_text):
            stale.append({
                "key": key,
                "value": value,
                "section": section,
                "dict": dict_name,
            })
    return stale, len(entries)


# ============ 主流程 ============

def main():
    parser = argparse.ArgumentParser(description="Cursor 汉化字典过期条目检测")
    parser.add_argument("--dict", choices=["Core", "AdPopup", "Partial", "Dropdown", "Tray", "All"],
                        default="All", help="要检测的字典")
    parser.add_argument("--json", metavar="OUTPUT", help="输出 JSON 报告到文件")
    args = parser.parse_args()

    print("=" * 60)
    print("Cursor 汉化字典过期条目检测")
    print("=" * 60)

    # 1. 找 Cursor 目录
    cursor_dir = find_cursor_dir()
    if not cursor_dir:
        print("[错误] 未找到 Cursor 安装目录。")
        print("       请设置环境变量 CURSOR_INSTALL_DIR 后重试。")
        sys.exit(1)
    print(f"[1/4] Cursor 安装目录: {cursor_dir}")

    # 2. 收集源码文件
    print("[2/4] 正在收集源码文件...")
    files = collect_source_files(cursor_dir)
    print(f"       共找到 {len(files)} 个文件")

    # 3. 加载所有文本
    print("[3/4] 正在加载文件内容（可能需要几秒钟）...")
    big_text = load_all_text(files)
    print(f"       总文本大小: {len(big_text) / 1024 / 1024:.1f} MB")

    # 4. 加载字典并检测
    print("[4/4] 正在检测过期条目...\n")

    all_stale = []
    summary = {}

    dicts_to_check = []
    if args.dict in ("Core", "All"):
        dicts_to_check.append(("Core_Dictionary", load_core_dictionary()))
    if args.dict in ("AdPopup", "All"):
        dicts_to_check.append(("Ad_Popup_Dictionary", load_simple_dict("Ad_Popup_Dictionary.json")))
    if args.dict in ("Partial", "All"):
        dicts_to_check.append(("Partial_Fragments", load_simple_dict("Partial_Fragments.json")))
    if args.dict in ("Dropdown", "All"):
        dicts_to_check.append(("Dropdown_Fragments", load_simple_dict("Dropdown_Fragments.json")))
    if args.dict in ("Tray", "All"):
        dicts_to_check.append(("Tray_Dictionary", load_tray_dictionary()))

    for name, entries in dicts_to_check:
        stale, total = check_entries(entries, big_text, name)
        all_stale.extend(stale)
        summary[name] = {"total": total, "stale": len(stale)}
        status = "✓" if len(stale) == 0 else "⚠"
        print(f"  {status} {name}: {len(stale)}/{total} 条可能过期")

    # 输出过期条目详情
    if all_stale:
        print("\n" + "=" * 60)
        print(f"发现 {len(all_stale)} 条可能过期的条目（在 Cursor 源码中未找到原文）：")
        print("=" * 60)
        for i, item in enumerate(all_stale, 1):
            print(f"\n{i}. [{item['dict']}] [{item['section']}]")
            print(f"   EN: {item['key'][:80]}")
            print(f"   ZH: {item['value'][:60]}")

    # JSON 输出
    if args.json:
        report = {
            "cursor_dir": cursor_dir,
            "total_files": len(files),
            "summary": summary,
            "stale_entries": all_stale,
        }
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\n[报告已保存到: {args.json}]")

    print(f"\n完成。共检测 {sum(s['total'] for s in summary.values())} 条，"
          f"{len(all_stale)} 条可能过期。")


if __name__ == "__main__":
    main()
