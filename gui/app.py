"""Cursor 汉化工具 —— 轻量图形界面（Windows）。

单个 exe，无安装、无外部依赖：内嵌 Edge WebView2 渲染前端，
复用根目录 Cursor_Localization_Tool.py 的注入/恢复/校验逻辑。
"""

from __future__ import annotations

import ctypes
import json
import os
import queue
import re
import subprocess
import sys
import threading
import traceback

APP_VERSION = "1.0.2"
APP_TITLE = "Cursor 汉化"

# 源码运行：gui/ 的上级目录；打包运行：PyInstaller 解包目录 _MEIPASS
_FROZEN = bool(getattr(sys, "frozen", False))
_HERE = os.path.dirname(os.path.abspath(__file__))
_MEIPASS = getattr(sys, "_MEIPASS", None)
if _FROZEN and _MEIPASS:
    ENGINE_DIR = _MEIPASS
    UI_DIR = os.path.join(_MEIPASS, "gui", "ui")
else:
    ENGINE_DIR = os.path.dirname(_HERE)
    UI_DIR = os.path.join(_HERE, "ui")

if ENGINE_DIR not in sys.path:
    sys.path.insert(0, ENGINE_DIR)

import Cursor_Localization_Tool as engine  # noqa: E402

STEP_PATTERN = re.compile(r"\[步骤\s*(\d+)\s*/\s*(\d+)\]")

# 每种动作对应的阶段名称（与引擎日志一一对应，不额外编造进度）
ACTION_STEPS = {
    "inject": ["语言包", "桥接", "注入", "校验"],
    "restore": ["恢复"],
    "fix": ["校验"],
}
ACTION_TITLES = {
    "inject": "汉化",
    "restore": "取消汉化",
    "fix": "修复校验",
}


def _is_admin() -> bool:
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def _probe_writable(path: str) -> bool:
    """在目标目录尝试写入临时文件，判断是否需要管理员权限。"""
    if not path or not os.path.isdir(path):
        return False
    probe = os.path.join(path, ".hanhua_write_probe")
    try:
        with open(probe, "w", encoding="utf-8") as handle:
            handle.write("1")
        os.remove(probe)
        return True
    except OSError:
        return False


def _detect_install_dir() -> str | None:
    """严格探测：只返回真正包含 Cursor.exe 的目录。"""
    candidate = engine.CaiCe_Cursor_AnZhuang_LuJing()
    if candidate and engine.AnZhuang_MuLu_YouXiao(candidate):
        return os.path.abspath(candidate)
    return None


class _LineStream:
    """把 print 输出按行投递到队列，供前端轮询。"""

    def __init__(self, sink) -> None:
        self._sink = sink
        self._buffer = ""

    def write(self, chunk: str) -> int:
        if not chunk:
            return 0
        self._buffer += chunk
        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            self._sink(line.rstrip("\r"))
        return len(chunk)

    def flush(self) -> None:
        if self._buffer:
            self._sink(self._buffer.rstrip("\r"))
            self._buffer = ""


class Api:
    """暴露给前端的桥接方法。"""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._lines: queue.Queue[str] = queue.Queue()
        self._running = False
        self._action = ""
        self._step = 0
        self._result: dict | None = None
        self._install_dir = _detect_install_dir()
        self._apply_install_dir()

    # ---------- 内部 ----------

    def _apply_install_dir(self) -> None:
        if self._install_dir:
            engine.CURSOR_AN_ZHUANG_LU_JING = self._install_dir

    def _workbench_dir(self) -> str:
        if not self._install_dir:
            return ""
        return os.path.join(
            self._install_dir, "resources", "app", "out", "vs", "code",
            "electron-sandbox", "workbench",
        )

    def _workbench_html(self) -> str:
        directory = self._workbench_dir()
        return os.path.join(directory, "workbench.html") if directory else ""

    def _emit(self, line: str) -> None:
        match = STEP_PATTERN.search(line)
        if match:
            self._step = int(match.group(1))
        elif line.startswith(("[写入]", "[注入]", "[备份]")) and self._action == "inject":
            self._step = max(self._step, 3)
        elif line.startswith("[校验]") and self._action == "inject":
            self._step = max(self._step, 4)
        self._lines.put(line)

    def _injected(self) -> bool:
        try:
            return bool(engine.JianCha_YiZhuRu())
        except Exception:
            return False

    def _run(self, action: str) -> None:
        old_out, old_err = sys.stdout, sys.stderr
        stream = _LineStream(self._emit)
        sys.stdout = stream
        sys.stderr = stream
        ok, error = False, ""
        try:
            if action == "inject":
                engine.ZhuChengXu()
                ok = self._injected()
            elif action == "restore":
                engine.HuiFu_YuanShi()
                ok = not self._injected()
            elif action == "fix":
                ok = bool(engine.GengXin_JiaoYan_Zhi())
        except SystemExit as exit_error:
            ok = (exit_error.code in (0, None)) and (
                action != "restore" or not self._injected()
            )
            error = "" if ok else f"引擎以状态码 {exit_error.code} 退出"
        except Exception:
            error = traceback.format_exc(limit=3).strip().splitlines()[-1]
            stream.write(f"[错误] {error}\n")
        finally:
            stream.flush()
            sys.stdout, sys.stderr = old_out, old_err
            with self._lock:
                self._running = False
                self._result = {
                    "action": action,
                    "ok": ok,
                    "error": error,
                    "injected": self._injected(),
                }

    # ---------- 前端调用 ----------

    def describe(self) -> dict:
        workbench_dir = self._workbench_dir()
        return {
            "version": APP_VERSION,
            "cursorDir": self._install_dir or "",
            "userDir": engine.CURSOR_SHU_JU_LU_JING,
            "workbench": self._workbench_html(),
            "found": bool(self._install_dir),
            "injected": self._injected(),
            "admin": _is_admin(),
            "writable": _probe_writable(workbench_dir),
            "running": self._running,
        }

    def drain(self) -> dict:
        lines: list[str] = []
        while True:
            try:
                lines.append(self._lines.get_nowait())
            except queue.Empty:
                break
        with self._lock:
            result, running, step, action = self._result, self._running, self._step, self._action
            self._result = None
        return {
            "lines": lines,
            "running": running,
            "result": result,
            "step": step,
            "action": action,
            "steps": ACTION_STEPS.get(action, []),
        }

    def start(self, action: str) -> dict:
        if action not in ACTION_STEPS:
            return {"ok": False, "error": f"未知操作: {action}"}
        with self._lock:
            if self._running:
                return {"ok": False, "error": "已有任务在执行"}
            self._running = True
            self._action = action
            self._step = 0
            self._result = None
        if not self._install_dir:
            with self._lock:
                self._running = False
            return {"ok": False, "error": "未找到 Cursor 安装目录"}
        self._apply_install_dir()
        threading.Thread(target=self._run, args=(action,), daemon=True).start()
        return {"ok": True}

    def set_install_dir(self, path: str) -> dict:
        path = (path or "").strip().strip('"')
        if not path:
            self._install_dir = _detect_install_dir()
        elif engine.AnZhuang_MuLu_YouXiao(path):
            self._install_dir = os.path.abspath(path)
        else:
            return {"ok": False, "error": "该目录下没有 Cursor.exe 与 workbench.html"}
        self._apply_install_dir()
        return {"ok": True, "cursorDir": self._install_dir or ""}

    def reveal(self, target: str) -> dict:
        path = self._workbench_html() if target == "workbench" else (self._install_dir or "")
        if not path:
            return {"ok": False}
        if os.path.isfile(path):
            subprocess.Popen(["explorer", f"/select,{path}"])
        else:
            os.startfile(path)  # noqa: S606
        return {"ok": True}

    def relaunch_admin(self) -> dict:
        try:
            if _FROZEN:
                params = ""
            else:
                params = f'"{os.path.abspath(__file__)}"'
            code = ctypes.windll.shell32.ShellExecuteW(
                None, "runas", sys.executable, params, ENGINE_DIR, 1
            )
            if code <= 32:
                return {"ok": False, "error": "用户取消了提权"}
        except Exception as error:  # pragma: no cover
            return {"ok": False, "error": str(error)}
        threading.Timer(0.35, lambda: os._exit(0)).start()
        return {"ok": True}


def _system_uses_light_theme() -> bool:
    try:
        import winreg

        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
        ) as key:
            return bool(winreg.QueryValueEx(key, "AppsUseLightTheme")[0])
    except Exception:
        return False


def _selfcheck(target: str) -> int:
    """打包自检：确认资源是否随 exe 一起生效（供构建与排障使用）。"""
    core = os.path.join(engine.LOCALIZATION_DIR, "Core_Dictionary.json")
    entries = 0
    try:
        entries = len(engine.DuQu_Zhu_CiDian())
    except Exception:
        pass
    install = _detect_install_dir()
    report = {
        "frozen": _FROZEN,
        "engineDir": ENGINE_DIR,
        "engineFile": getattr(engine, "__file__", ""),
        "localizationDir": engine.LOCALIZATION_DIR,
        "coreDictionary": core,
        "coreEntries": entries,
        "vsix": engine.HuoQu_Bundled_VSIX_LuJing(),
        "uiIndex": os.path.join(UI_DIR, "index.html"),
        "uiIndexExists": os.path.isfile(os.path.join(UI_DIR, "index.html")),
        "cursorDir": install or "",
        "injected": bool(install) and engine.JianCha_YiZhuRu(),
        "admin": _is_admin(),
    }
    with open(target, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    return 0


def main() -> int:
    if "--selfcheck" in sys.argv:
        index = sys.argv.index("--selfcheck")
        target = sys.argv[index + 1] if len(sys.argv) > index + 1 else "selfcheck.json"
        return _selfcheck(target)

    import webview

    api = Api()
    index = os.path.join(UI_DIR, "index.html")
    if not os.path.isfile(index):
        ctypes.windll.user32.MessageBoxW(0, f"缺少界面文件：{index}", APP_TITLE, 0x10)
        return 1

    webview.create_window(
        APP_TITLE,
        f"file:///{index.replace(os.sep, '/')}",
        js_api=api,
        width=900,
        height=660,
        min_size=(780, 580),
        background_color="#fcfcfb" if _system_uses_light_theme() else "#0b0b0a",
        text_select=False,
    )
    webview.start(debug=bool(os.environ.get("HANHUA_GUI_DEBUG")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
