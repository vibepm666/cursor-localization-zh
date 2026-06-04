# Cursor 完整汉化工具：一键把界面变成中文

> 本工具面向日常使用 Cursor 的用户，在**不修改 Cursor 核心程序**的前提下，将界面中的英文菜单、按钮、提示和说明替换为中文，降低阅读和操作成本。已实现\*\*编辑器模式（Editor）**和**智能体模式（Agent）\*\*两种界面的全面汉化。

## 工具介绍

Cursor **官方目前尚未提供**中文界面或汉化包。常见做法是安装 VS Code 汉化扩展，菜单、通用设置等会变成中文，但智能体侧栏、Cursor 设置、插件市场等 **Cursor 专有界面** 往往仍是英文，给习惯中文界面的用户增加了学习和使用成本。

**Cursor 完整汉化工具** 在自动安装 VS Code 汉化包的同时，向工作台注入带词典的运行时脚本，把 **Cursor 专有界面** 也替换成中文，让日常使用的界面尽量一眼能读懂。

### 覆盖区域

- **设置页**：账户、模型、规则、工具与 MCP、隐私等选项
- **智能体窗口**：对话、命令面板、模式切换（计划 / 询问 / 调试 / 多任务）等
- **插件市场**：插件名称、简介、获取按钮及市场相关文案
- **其它界面**：欢迎页、Git 变更面板、部分通知与推广弹窗等

### 主要特点

- **自动安装 VS Code 汉化包**：一键安装官方简体中文扩展（覆盖标准菜单、通用设置等）；如有更新，将自动根据 Cursor 内置 VS Code 版本下载匹配的语言包并安装，无需手动去扩展市场搜索安装。
- **双层汉化，覆盖面更全**：通过注入脚本 + 本地词典，完整翻译 Cursor 专有界面，例如智能体侧栏、Cursor 设置（账户 / 模型 / 规则 / MCP）、插件市场、欢迎页、Git 面板及部分通知弹窗等。
- **不改动核心程序，可一键还原**：只修改工作台相关文件（如 `workbench.html`），需要英文时运行「取消汉化」脚本即可恢复；已安装的 VS Code **汉化包** 可保留。
- **维护成本低**：Cursor 小版本更新后若有个别位置变回英文，再运行一次启动脚本即可，一般无需重装软件。
- **其它说明**：日常点得到的界面大多已是中文；个别菜单、动态文案或新版本新增词条可能仍为英文，可在词典中补充后重新注入。Agent 对话与模型生成内容不属于界面汉化范围。

## 如何使用

1. 下载并解压汉化工具（内含 `启动汉化_Win.bat` / `启动汉化_Mac.sh` 等）。
2. **Windows**：双击 `启动汉化_Win.bat`。**Mac / Linux**：在终端执行 `启动汉化_Mac.sh`。
3. 脚本会安装语言包并注入汉化，按提示可选打开 Cursor。
4. **完全退出并重启** Cursor（不要只重载窗口）。

| 系统            | 启动（注入 + 打开 Cursor） | 取消汉化              |
| ------------- | ------------------ | ----------------- |
| Windows       | 双击 `启动汉化_Win.bat`  | 双击 `取消汉化_Win.bat` |
| macOS / Linux | `./启动汉化_Mac.sh`    | `./取消汉化_Mac.sh`   |

macOS 首次使用需赋予执行权限：

```bash
chmod +x "启动汉化_Mac.sh" "取消汉化_Mac.sh"
```

也可手动执行：

```bash
python Cursor_Localization_Tool.py        # 安装语言包 + 注入 / 更新
python Cursor_Localization_Tool.py --restore  # 恢复英文（不卸载语言包）
```

**注入或更新词典后，请完全退出并重启 Cursor。**

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

非默认安装时，可设置环境变量后运行脚本：

| 变量                     | 含义                                   |
| ---------------------- | ------------------------------------ |
| `CURSOR_INSTALL_DIR`   | 安装根目录（含 `Cursor.exe` 或 `Cursor.app`） |
| `CURSOR_USER_DATA_DIR` | 用户数据目录（默认 `%APPDATA%\Cursor`）        |

也可在 `Cursor_Localization_Tool.py` 顶部 **用户配置区域** 写死路径，例如：

```python
CURSOR_AN_ZHUANG_LU_JING = r"D:\你的路径\Cursor"   # 含 Cursor.exe 的安装文件夹
CURSOR_SHU_JU_LU_JING = r"C:\Users\你的用户名\AppData\Roaming\Cursor"  # 一般可不动
```

保存后重新运行启动脚本。

## 文件说明

| 文件                                                | 说明                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Cursor_Localization_Tool.py`                     | 主程序（组装注入脚本 + 语言包安装）                                                                               |
| `localization/runtime/`                           | 注入用 JS 运行时（`bootstrap.js` / `engine.js` / `market.js` / `init.js` / `helpers.js` / `keywords.js`） |
| `localization/Core_Dictionary.json`               | 通用界面主词典（设置、Agent、菜单等）                                                                             |
| `localization/Partial_Fragments.json`             | 设置页长句部分匹配（`TiHuan_BuFen_WenBen`）                                                                  |
| `localization/Dropdown_Fragments.json`            | 下拉/快速选择文本片段（`FanYi_XiaLa_WenBen`）                                                                 |
| `localization/Cursor_Settings_Fragments.json`     | Cursor 设置页 MCP/域名片段（`Cursor_SheZhi_*_SuiPian`）                                                    |
| `localization/runtime/helpers.js`                 | 通用 DOM 补丁辅助（`FanYi_Scope_*`、`FanYi_SheZhiGen_*`、`FanYi_Cursor_SheZhi_*`、`FanYi_ZiShu_QuYu`）       |
| `localization/runtime/keywords.js`                | 合并后的 `QuanJu_BaoHan_GuanJianCi` 关键词表（按补丁标签引用）                                                     |
| `localization/Pattern_Dictionary.json`            | 动态文本正则替换规则                                                                                        |
| `localization/Ad_Popup_Dictionary.json`           | 左下角推广 / 通知弹窗词典                                                                                    |
| `localization/Plugin_Marketplace_Dictionary.json` | 插件市场专用词典（注入后首次进入市场页才加载到内存）                                                                        |
| `VSCode-language-pack-zh-hans.vsix`               | 官方简体中文语言包（根目录；版本不匹配时自动从市场下载覆盖）                                                                    |
| `启动汉化_Win.bat` / `取消汉化_Win.bat`                   | Windows 快捷脚本                                                                                      |
| `启动汉化_Mac.sh` / `取消汉化_Mac.sh`                     | macOS / Linux 快捷脚本                                                                                |
| `Cursor_Setting_Lookup.js`                        | 辅助查找设置页英文原文                                                                                       |

## 维护翻译

修改对应文件后，运行 `python Cursor_Localization_Tool.py` 并重启 Cursor。

| 维护对象       | 编辑文件                                              | 格式                                        |
| ---------- | ------------------------------------------------- | ----------------------------------------- |
| 通用界面       | `localization/Core_Dictionary.json`               | `sections[].entries`: `[英文, 中文]`          |
| 动态文案（含数字等） | `localization/Pattern_Dictionary.json`            | `patterns`: `{regex, flags, replacement}` |
| 插件市场       | `localization/Plugin_Marketplace_Dictionary.json` | `pluginNames`、`descriptionFragments` 等字段  |
| 广告弹窗       | `localization/Ad_Popup_Dictionary.json`           | `entries`: `[英文, 中文]`                     |

若词典仍放在项目根目录（旧版路径），程序也会自动识别；新路径优先。

校验词典（可选）：

```bash
python localization/tools/validate_dictionary.py
```

**注意**：中文译文中不要使用全角引号 `""`，以免生成的 JS 报错。

### 市场页可选开关（开发者工具控制台）

```javascript
localStorage.setItem('Cursor_Localization_Market_Translate', '0')  // 关闭市场中文描述
localStorage.setItem('Cursor_Localization_Market_Online_Translate', '1')  // 开启在线翻译兜底
```

修改后重启 Cursor。

## 工作原理（简述）

汉化由**两层机制**叠加完成：

| 层级    | 机制                                       | 覆盖范围                    |
| ----- | ---------------------------------------- | ----------------------- |
| 官方语言包 | 自动安装 `VSCode-language-pack-zh-hans.vsix` | VS Code 标准菜单、设置项、内置扩展   |
| 注入脚本  | `Cursor_Localization.js` 运行时替换           | Cursor 专有界面（智能体、市场、弹窗等） |

执行步骤：

1. 检测 Cursor 内置 VS Code 版本，必要时从市场自动下载匹配的 `VSCode-language-pack-zh-hans.vsix` 并覆盖根目录文件
2. 安装/更新官方简体中文语言包，并设置 `locale.json` 为 `zh-cn`
3. 桥接 Cursor 私有扩展翻译到语言包通道
4. 备份 `workbench.html`、`product.json`
5. 生成 `Cursor_Localization.js` 并注入到 `workbench.html`
6. 同步更新 `product.json` 中的文件校验值（避免「安装损坏」提示）

取消汉化（`--restore`）会恢复备份文件，**不会卸载**已安装的语言包扩展。

## 常见问题

| 现象                                    | 处理                                                                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 更新 Cursor 后汉化没了                       | 再运行一次启动汉化脚本即可                                                                                                                                                                |
| 汉化没生效 / 汉化无效                          | 确认已**完全退出并重启** Cursor；可用 `node -c` 检查生成的 JS 语法                                                                                                                               |
| 菜单仍是英文                                | `Ctrl+Shift+P`（Mac：`Cmd+Shift+P`）→ **Configure Display Language** → **中文(简体) / zh-cn** → 再完全重启；若无该选项，安装 **Chinese (Simplified) Language Pack** 后重试                           |
| 装在非默认路径 / 脚本找不到 Cursor                | 在 `Cursor_Localization_Tool.py` 用户配置区域填写安装路径与数据目录（见上文「路径配置」）                                                                                                                 |
| 提示 installation appears to be corrupt | 重新运行 `python Cursor_Localization_Tool.py`                                                                                                                                    |
| 标准菜单仍是英文（语言包未装上）                      | 确认网络可访问 VS Code 市场并重跑脚本；或手动将匹配版本的 VSIX 重命名为 `VSCode-language-pack-zh-hans.vsix` 放入根目录后重跑                                                                                     |
| 语言包自动安装失败                             | 命令面板运行 **Extensions: Install from VSIX...** 安装根目录 VSIX，再运行 **Configure Display Language** 选 **zh-cn**，重启 Cursor                                                              |
| 离线环境                                  | 从 [语言包市场页](https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-zh-hans) 下载与 Cursor 内置 VS Code 主版本一致的 VSIX（如 `1.105.1` 对应 `1.105.x`），重命名后放入根目录 |
| 部分英文未翻译                               | 在对应词典中补充条目后重新注入                                                                                                                                                              |
| Cursor 大版本升级后语言包报错                    | 重新运行汉化脚本，会自动下载与新版 Cursor 匹配的语言包                                                                                                                                              |
| 需要恢复原版                                | `取消汉化_Win.bat` 或 `--restore`                                                                                                                                                 |
