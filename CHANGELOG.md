# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 修复
- **Windows 批处理脚本无法双击运行**：`.bat` 原为 UTF-8 + LF 换行，cmd 解析时会丢字、把 `call :Label` 等拆成非法命令。现统一改为 **GBK(cp936) + CRLF**，`chcp` 改为 `936`，并显式设置 `PYTHONIOENCODING=gbk` 以保证 Python 输出不乱码
- **检测不到非默认盘符的安装目录**：如 `D:\Program Files (x86)\Cursor`。批处理新增 `:DetectCursorOtherDrives`，`Cursor_Localization_Tool.py` 的 `CaiCe_Cursor_AnZhuang_LuJing()` 新增跨盘符候选扫描（C~H 盘 × `Program Files` / `Program Files (x86)` / `Cursor` / `Programs`）
- **`修复校验_Win.bat` 必然失败**：它不传 `CURSOR_INSTALL_DIR`，Python 回退到脚本上级目录并报「未找到 product.json」。安装目录自动定位修复后已可正常执行

### 文档更新
- README / 使用说明补充「双击 `.bat` 闪退、乱码」与「找不到安装目录」的排查说明

### 新增
- **图形界面版**（`gui/`）：单文件 `CursorHanhua.exe`，PyInstaller 打包 + Edge WebView2 渲染，免安装、免 Python。提供启动汉化 / 取消汉化 / 修复校验，实时日志、自动定位安装目录、无写权限时一键提权；`python gui/build.py` 可重新构建

### 补充翻译
按功能模块分类，共补充约 **170 条**：

| 模块 | 数量 |
|------|------|
| 用量限制与升级弹窗 | ~20 |
| ORIGIN / Cloud Agents 推广弹窗 | ~16 |
| Plugins 引导弹窗 | ~5 |
| Allowlist 安全确认弹窗 | ~8 |
| 设置页（通用 / 计划与用量 / Voice / 对话 / 执行与审批 / 上下文与工具 / Git & PRs / 远程控制 / 工作树清理） | ~65 |
| Computer Use | ~3 |
| 语言下拉列表 | 28 |
| 菜单与通用 UI（含视图菜单、侧栏菜单） | ~15 |
| 队列消息与通知（含更新提示） | ~8 |
| 右键菜单 | ~2 |
| 高负载提示 | 1 |
| 智能体欢迎页模板 | 9 |

### 文档更新
- README.md 新增「过期条目检测」使用说明
- 文件说明表格新增 `check_stale_entries.py`

---

## [2026-07-15]

### 变更
- 核心词典结构优化，按功能模块分 section
- 新增 `Ad_Popup_Dictionary.json` 独立维护弹窗翻译

---

> 更早的变更记录略。
