# Cursor 完整汉化工具：一键把界面变成中文

> 本工具面向日常使用 Cursor 的用户，在**不修改 Cursor 核心程序**的前提下，将界面中的英文菜单、按钮、提示和说明替换为中文，降低阅读和操作成本。已实现**编辑器模式（Editor）**和**智能体模式（Agent）**两种界面的全面汉化。


## 工具介绍

Cursor 官方目前尚未提供中文界面或汉化包。常见做法是安装 VS Code 汉化扩展，菜单、通用设置等会变成中文，但智能体侧栏、Cursor 设置、插件市场等 **Cursor 专有界面** 往往仍是英文，给习惯中文界面的用户增加了学习和使用成本。

**Cursor 完整汉化工具** 在自动安装 VS Code 汉化包的同时，向工作台注入带词典的运行时脚本，把 **Cursor 专有界面** 也替换成中文，让日常使用的界面尽量一眼能读懂。

### 覆盖区域

- **设置页**：账户、模型、规则、工具与 MCP、隐私等选项
- **智能体窗口**：对话、命令面板、模式切换（计划 / 询问 / 调试 / 多任务）等
- **插件市场**：插件名称、简介、获取按钮及市场相关文案
- **其它界面**：欢迎页、Git 变更面板、部分通知与推广弹窗等

### 主要特点

- **自动安装 VS Code 汉化包**：一键安装官方简体中文扩展（覆盖标准菜单、通用设置等）；如有更新，将自动根据 Cursor 内置 VS Code 版本下载匹配的语言包并安装，无需手动去扩展市场搜索安装。
- **双层汉化，覆盖面更全**：通过注入脚本 + 本地词典，完整翻译 Cursor 专有界面，例如智能体侧栏、Cursor 设置（账户 / 模型 / 规则 / MCP）、插件市场、欢迎页、Git 面板及部分通知弹窗等。
- **不改动界面逻辑，可一键还原**：主要修改工作台文件（如 `workbench.html`）；系统托盘菜单会替换主进程 `main.js` 中少量固定文案。需要英文时运行「取消汉化」脚本即可恢复；已安装的 VSCode汉化包 可保留。
- **维护成本低**：Cursor 小版本更新后若有个别位置变回英文，再运行一次启动脚本即可，一般无需重装软件。
- **其它说明**：日常点得到的界面大多已是中文；个别菜单、动态文案或新版本新增词条可能仍为英文，可在词典中补充后重新注入。Agent 对话与模型生成内容不属于界面汉化范围。

> 面向站外发布的图文版见 [docs/使用说明.md](docs/使用说明.md)。

## 界面截图

<img width="2002" height="1360" alt="Cursor exe_20260604_000934" src="https://github.com/user-attachments/assets/b043419d-3ab1-4d26-a36a-9618694df310" />

<img width="2000" height="1360" alt="Cursor exe_20260604_000214" src="https://github.com/user-attachments/assets/3cd64d40-3d3b-435e-8a46-7bfa17c06434" />

<img width="2000" height="1360" alt="Cursor exe_20260604_001901" src="https://github.com/user-attachments/assets/d06f3f34-6896-470a-a75d-192cbdf268b5" />


## 如何使用

### 图形界面版（推荐，免 Python）

从 [Releases](https://github.com/ChibaRie/cursor-localization-zh/releases) 下载 `CursorHanhua.exe`，双击即用：单文件、免安装、不需要 Python 环境。

| 按钮 | 作用 |
|---|---|
| **启动汉化** | 安装/更新官方语言包，注入词典脚本，同步 `product.json` 校验值 |
| **取消汉化** | 从备份恢复工作台文件（需二次点击确认） |
| **修复校验** | 重新写入校验值，解决「安装已损坏」提示 |

程序会自动定位 Cursor 安装目录（含 C 盘以外的盘符）；装在自定义位置时，点击顶部路径手动指定即可。运行日志实时显示引擎输出，成功/失败在状态栏与按钮对勾上反馈。

> 若 Cursor 安装在 `Program Files` 且当前账号无写权限，界面会提示并给出一键「以管理员身份重启」。

### 脚本版（需要 Python 3.8+）

汉化工具依赖 **Python 3.8+**（Windows 通过 `启动汉化_Win.bat` 调用，Mac/Linux 通过 shell 脚本调用）。

1. 下载并解压汉化工具（内含 `启动汉化_Win.bat` / `启动汉化_Mac.sh` 等）。
2. **Windows**：双击 `启动汉化_Win.bat`。**Mac / Linux**：在终端执行 `启动汉化_Mac.sh`。
3. 脚本会安装语言包并注入汉化，按提示可选打开 Cursor。
4. **完全退出并重启** Cursor（不要只重载窗口）。

**Mac在终端中运行汉化脚本：**
1. 打开**终端**：按 `Cmd + 空格`，输入「终端」后回车。
2. 在终端输入 `bash`加空格，再把 `启动汉化_Mac.sh` 拖入窗口补全路径后回车，输入`Y`进行汉化。

**若安装后顶部菜单仍为英文**，请手动切换显示语言：
1. 按 `Ctrl+Shift+P`（macOS：`Cmd+Shift+P`）打开**命令面板**
2. 输入 `Configure Display Language`，选择 **配置显示语言**
3. 在列表中选择 **中文(简体)**（`zh-cn`）
4. 按提示**完全退出并重启** Cursor

若没有 **中文(简体)** 选项，在扩展市场中搜索并安装 **Chinese (Simplified) Language Pack**，再重新执行上述步骤。

## 恢复英文

Windows 双击 `取消汉化_Win.bat`；Mac / Linux 运行 `取消汉化_Mac.sh`。

同样要**完全退出并重启**。语言包会保留，只是撤销注入、恢复备份文件。

## 路径配置

默认自动检测 Cursor 安装位置，一般无需修改。

**Windows**：Cursor 装在非默认路径时，用记事本打开 `启动汉化_Win.bat`（取消汉化时改 `取消汉化_Win.bat`），在 `cd /d "%~dp0"` 后面增加一行：

```bat
set CURSOR_INSTALL_DIR=D:\Program Files\cursor
```

路径需指向**含 `Cursor.exe` 的安装文件夹**。若用户数据目录也不在默认位置，可额外设置（一般不用改）：

```bat
set CURSOR_USER_DATA_DIR=C:\Users\你的用户名\AppData\Roaming\Cursor
```

**macOS / Linux**：在 `启动汉化_Mac.sh`（或 `取消汉化_Mac.sh`）开头增加：

```bash
export CURSOR_INSTALL_DIR="/Applications/Cursor.app"
```

也可在运行前临时指定：`export CURSOR_INSTALL_DIR="/Applications/Cursor.app"` 后再执行脚本。用户数据目录可选：

```bash
export CURSOR_USER_DATA_DIR="$HOME/Library/Application Support/Cursor"
```

保存后重新运行启动脚本。

也可通过环境变量 `CURSOR_INSTALL_DIR`、`CURSOR_USER_DATA_DIR` 覆盖（见下表），由 `Cursor_Localization_Tool.py` 优先读取：

| 变量 | 含义 |
| --- | --- |
| `CURSOR_INSTALL_DIR` | 安装根目录（含 `Cursor.exe` 或 `Cursor.app`） |
| `CURSOR_USER_DATA_DIR` | 用户数据目录（默认 `%APPDATA%\Cursor` 或 macOS `~/Library/Application Support/Cursor`） |

## 目录结构

```
.
├── 启动汉化_Win.bat / 取消汉化_Win.bat / 修复校验_Win.bat   # Windows 入口（双击）
├── 启动汉化_Mac.sh / 取消汉化_Mac.sh / 修复校验_Mac.sh      # macOS / Linux 入口
├── Cursor_Localization_Tool.py       # 引擎：注入 / 恢复 / 语言包 / 校验值
├── VSCode-language-pack-zh-hans.vsix # 官方语言包（引擎按同级目录查找）
├── localization/                     # 词典与注入运行时
│   ├── Core_Dictionary.json          # 主词典
│   ├── Pattern_Dictionary.json       # 动态文案正则
│   └── runtime/                      # 注入进 Cursor 的 JS
├── gui/                              # 图形界面版（exe 源码 + 打包脚本）
├── tools/                            # 开发工具（校验、检测、查找原文）
├── docs/                             # 对外发布的图文说明
└── README.md / CHANGELOG.md
```

> 根目录的脚本、引擎、`localization/`、`VSCode-language-pack-zh-hans.vsix` 必须保持同级：批处理按 `%~dp0`、引擎按 `__file__` 相对定位，移动会破坏「下载 ZIP 后双击即用」。

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `Cursor_Localization_Tool.py` | 主程序（组装注入脚本 + 语言包安装） |
| `localization/runtime/` | 注入用 JS 运行时（`bootstrap.js` / `engine.js` / `market.js` / `init.js` / `helpers.js` / `keywords.js`） |
| `localization/Core_Dictionary.json` | 通用界面主词典（设置、Agent、菜单等） |
| `localization/Partial_Fragments.json` | 设置页长句部分匹配（`TiHuan_BuFen_WenBen`） |
| `localization/Dropdown_Fragments.json` | 下拉/快速选择文本片段（`FanYi_XiaLa_WenBen`） |
| `localization/Cursor_Settings_Fragments.json` | Cursor 设置页 MCP/域名片段（`Cursor_SheZhi_*_SuiPian`） |
| `localization/runtime/helpers.js` | 通用 DOM 补丁辅助（`FanYi_Scope_*`、`FanYi_SheZhiGen_*`、`FanYi_Cursor_SheZhi_*`、`FanYi_ZiShu_QuYu`） |
| `localization/runtime/keywords.js` | 合并后的 `QuanJu_BaoHan_GuanJianCi` 关键词表（按补丁标签引用） |
| `localization/Pattern_Dictionary.json` | 动态文本正则替换规则 |
| `localization/Ad_Popup_Dictionary.json` | 左下角推广 / 通知弹窗词典 |
| `localization/Plugin_Marketplace_Dictionary.json` | 插件市场专用词典（注入后首次进入市场页才加载到内存） |
| `VSCode-language-pack-zh-hans.vsix` | 官方简体中文语言包（根目录；版本不匹配时自动从市场下载覆盖） |
| `启动汉化_Win.bat` / `取消汉化_Win.bat` | Windows 快捷脚本 |
| `启动汉化_Mac.sh` / `取消汉化_Mac.sh` | macOS / Linux 快捷脚本 |
| `gui/` | 图形界面版：`app.py` 宿主、`ui/index.html` 界面、`build.py` 打包脚本 |
| `tools/validate_dictionary.py` | 词典校验（重复 key、空值、正则语法） |
| `tools/verify_build.py` | 生成 JS 前的断言自检（片段、关键词表、市场懒加载） |
| `tools/check_stale_entries.py` | 过期条目检测（扫描 Cursor 源码，找出已失效的翻译） |
| `tools/Cursor_Setting_Lookup.js` | 查找设置页英文原文（Node.js） |
| `docs/使用说明.md` / `.html` | 面向站外发布的图文说明 |

## 维护翻译

修改对应文件后，运行 `python Cursor_Localization_Tool.py` 并重启 Cursor。

| 维护对象 | 编辑文件 | 格式 |
| --- | --- | --- |
| 通用界面 | `localization/Core_Dictionary.json` | `sections[].entries`: `[英文, 中文]` |
| 动态文案（含数字等） | `localization/Pattern_Dictionary.json` | `patterns`: `{regex, flags, replacement}` |
| 插件市场 | `localization/Plugin_Marketplace_Dictionary.json` | `pluginNames`、`descriptionFragments` 等字段 |
| 广告弹窗 | `localization/Ad_Popup_Dictionary.json` | `entries`: `[英文, 中文]` |

若词典仍放在项目根目录（旧版路径），程序也会自动识别；新路径优先。

校验词典（可选）：

```bash
python tools/validate_dictionary.py
```

**注意**：中文译文中不要使用全角引号 `""`，以免生成的 JS 报错。

### 过期条目检测（可选）

Cursor 版本更新后，部分旧翻译可能已失效（原文改了或删了）。运行 `tools/check_stale_entries.py` 可自动扫描 Cursor 安装目录下的源码，找出字典中匹配不到的条目。

```bash
# 检测所有字典
python tools/check_stale_entries.py

# 只检测指定字典（Core / AdPopup / Partial / Dropdown / Tray）
python tools/check_stale_entries.py --dict Core

# 输出 JSON 报告
python tools/check_stale_entries.py --json stale-report.json
```

**说明**：
- 自动定位 Cursor 安装目录（支持 `CURSOR_INSTALL_DIR` 环境变量覆盖）
- 扫描 `resources/app/out/` 下所有 JS/JSON/HTML 文件 + `main.js`
- 智能引号归一化（`' ' " "` → 普通引号），减少误报
- 短条目（< 3 字符）自动跳过，避免误报
- 检测结果分为「确认过期」和「疑似过期（需人工确认）」两类

**常见误报**：
- 带换行符/特殊符号的菜单项（如 `New Agent (Ctrl+N)\n[Alt] Replace Agent`）
- 刚从截图新增的条目（源码中可能因空格、标点差异未精确匹配，实际仍有效）
- `Tray_Dictionary` 中的代码片段（若 Cursor 改版托盘结构，需重新截图确认）

### 市场页可选开关（开发者工具控制台）

```javascript
localStorage.setItem('Cursor_Localization_Market_Translate', '0')  // 关闭市场中文描述
localStorage.setItem('Cursor_Localization_Market_Online_Translate', '1')  // 开启在线翻译兜底
```

修改后重启 Cursor。

## 工作原理（简述）

汉化由**两层机制**叠加完成：

| 层级 | 机制 | 覆盖范围 |
| --- | --- | --- |
| 官方语言包 | 自动安装 `VSCode-language-pack-zh-hans.vsix` | VS Code 标准菜单、设置项、内置扩展 |
| 注入脚本 | `Cursor_Localization.js` 运行时替换 | Cursor 专有界面（智能体、市场、弹窗等） |

执行步骤：

1. 检测 Cursor 内置 VS Code 版本，必要时从市场自动下载匹配的 `VSCode-language-pack-zh-hans.vsix` 并覆盖根目录文件
2. 安装/更新官方简体中文语言包，并设置 `locale.json` 为 `zh-cn`
3. 桥接 Cursor 私有扩展翻译到语言包通道
4. 备份 `workbench.html`、`product.json`
5. 生成 `Cursor_Localization.js` 并注入到 `workbench.html`
6. 同步更新 `product.json` 中的文件校验值（避免「安装损坏」提示）

取消汉化（`--restore`）会恢复备份文件，**不会卸载**已安装的语言包扩展。

## 开发

| 任务 | 命令 |
| --- | --- |
| 校验词典 | `python tools/validate_dictionary.py` |
| 注入 JS 断言自检 | `python tools/verify_build.py` |
| 过期条目检测 | `python tools/check_stale_entries.py` |
| 查找设置项英文原文 | `node tools/Cursor_Setting_Lookup.js --key <key>` |
| 构建图形界面 exe | `python gui/build.py` → `dist/CursorHanhua.exe` |
| 预览界面 | 浏览器打开 `gui/ui/index.html?preview=1`（内置假后端，不碰真实文件） |

打包在 `.build-venv` 精简环境里进行（只装 `pyinstaller` + `pywebview`）。若直接用 Anaconda 打包，会把 numpy/pandas 一起塞进 exe，体积从 12 MB 涨到 298 MB。

界面改动后需重新执行 `python gui/build.py`，exe 内的 `gui/ui/index.html` 是构建时拷贝的副本。

## 常见问题

- **更新 Cursor 后汉化失效了**：重新再运行一次汉化脚本即可。
- **已经执行汉化但是没有生效**：确认已完全重启了 Cursor。
- **汉化后顶部菜单仍是英文**：按 `Ctrl+Shift+P`（Mac 用 `Cmd+Shift+P`）→ 输入「Configure Display Language」→ 选 **中文(简体) / zh-cn** → 再完全重启一次。如果没有 **中文(简体)** 选项，在扩展市场中搜索并安装 **Chinese (Simplified) Language Pack** 后重新设置。
- **系统托盘右键菜单仍是英文**：托盘菜单在主进程 `main.js` 里。请**以管理员身份**重新运行汉化脚本，然后完全退出 Cursor（托盘图标也要关掉）再打开。Cursor 更新后需再运行一次。
- **执行脚本找不到 Cursor**：脚本会自动检查 `%LOCALAPPDATA%\Programs\Cursor`、`%ProgramFiles%\Cursor`、`%ProgramFiles(x86)%\Cursor`，以及 C、D、E、F、G、H 盘下的 `Program Files\Cursor`、`Program Files (x86)\Cursor`、`Cursor`、`Programs\Cursor`。若仍未找到（例如装在自定义目录），用记事本打开 `启动汉化_Win.bat`（取消汉化时改 `取消汉化_Win.bat`），在 `cd /d "%~dp0"` 后面增加一行，指定 Cursor 安装目录，保存后重新运行启动脚本。

```bat
set CURSOR_INSTALL_DIR=D:\Program Files\cursor
```

保存时请用记事本「另存为」并保持 **ANSI** 编码与 **Windows(CRLF)** 换行，否则 cmd 会解析出错。

- **Windows 双击 `.bat` 闪退、乱码或提示「不是内部或外部命令」**：脚本被保存成了 LF 换行或 UTF-8 编码，cmd 无法正确解析中文与非 ASCII 字符。请使用仓库内原始脚本（CRLF + GBK 编码，`chcp 936`）；自行修改后务必另存为 ANSI + CRLF。

Mac / Linux 可在 `启动汉化_Mac.sh` 开头增加 `export CURSOR_INSTALL_DIR="/Applications/Cursor.app"`，详见上文「路径配置」。

- **执行脚本时仍然出错**：直接将汉化脚本拖入 Cursor 对话框，发送以下提示词：

```
我需要安装这个汉化工具，汉化时出现了报错，帮我检查并重新执行脚本，我安装目录是：XXX
```

### 其它情况

| 现象 | 处理 |
| --- | --- |
| 运行脚本报错 / 弹出 Microsoft Store / 汉化无输出 | 多半是 **未安装真正的 Python**，仅有 Windows「应用执行别名」占位程序。运行 `where python`，若路径为 `...\Microsoft\WindowsApps\python.exe` 即属此情况。从 [python.org](https://www.python.org/downloads/) 安装 Python 3（勾选 **Add python.exe to PATH**），或 `winget install Python.Python.3.12`；安装后重开终端，用 `python --version` 验证。可选：在 **设置 → 应用 → 高级应用设置 → 应用执行别名** 关闭 `python.exe` / `python3.exe` 商店快捷方式 |
| 提示 installation appears to be corrupt / 安装已损坏 | 先运行 `修复校验_Win.bat` 或 `python Cursor_Localization_Tool.py --fix-checksum`；若提示权限不足，Windows 请**以管理员身份运行**启动/修复脚本；完成后完全重启 Cursor |
| 标准菜单仍是英文（语言包未装上） | 确认网络可访问 VS Code 市场并重跑脚本；或手动将匹配版本的 VSIX 重命名为 `VSCode-language-pack-zh-hans.vsix` 放入根目录后重跑 |
| 语言包自动安装失败 | 命令面板运行 **Extensions: Install from VSIX...** 安装根目录 VSIX，再运行 **Configure Display Language** 选 **zh-cn**，重启 Cursor |
| 离线环境 | 从 [语言包市场页](https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-zh-hans) 下载与 Cursor 内置 VS Code 主版本一致的 VSIX（如 `1.105.1` 对应 `1.105.x`），重命名后放入根目录 |
| 部分英文未翻译 | 在对应词典中补充条目后重新注入 |
| Cursor 大版本升级后语言包报错 | 重新运行汉化脚本，会自动下载与新版 Cursor 匹配的语言包 |
| 需要恢复原版 | `取消汉化_Win.bat` 或 `--restore` |
