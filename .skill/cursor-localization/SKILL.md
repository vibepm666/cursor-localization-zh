# cursor-localization

Cursor 汉化包维护 skill，用于维护和补充汉化词典。

**项目根目录**：`D:\VibePM\tools\cursor-zh`
**GitHub 仓库**：`https://github.com/vibepm666/cursor-localization-zh.git`
**Git 路径**：`C:\Program Files\Git\bin\git.exe`（不在 PATH，必须用完整路径）

---

## 字典文件说明

| 文件 | 用途 | 匹配方式 |
|------|------|----------|
| `Core_Dictionary.json` | 主词典，按功能模块分 sections | 整句精确匹配 |
| `Ad_Popup_Dictionary.json` | 左下角通知/推广弹窗专用 | 整句精确匹配 |
| `Partial_Fragments.json` | 设置页长句部分匹配 | 部分文本片段匹配 |
| `Dropdown_Fragments.json` | 下拉/快速选择文本片段 | 部分文本片段匹配 |
| `Pattern_Dictionary.json` | 正则替换规则 | 正则匹配 |
| `Tray_Dictionary.json` | 系统托盘右键菜单 | 替换 main.js 代码片段 |

---

## 分类规则

### 放到 `Core_Dictionary.json`
- 左侧导航栏文字
- 菜单栏（File / Edit / View 等）
- 通用 UI 按钮和标签
- 固定位置的界面元素

### 放到 `Ad_Popup_Dictionary.json`
- 左下角通知弹窗
- 推广弹窗（ORIGIN / Cloud Agents 等）
- 用量限制提示
- 安全确认弹窗
- 系统通知类弹窗

### 放到 `Partial_Fragments.json`
- 设置页说明文字
- 长句中的部分文本
- 动态拼接的文案
- 工作区空状态提示
- 运行模式说明

### 放到 `Dropdown_Fragments.json`
- 下拉菜单项
- 快速选择片段
- 语言列表
- 命令行提示短片段

---

## 工作流程

### 1. 读取截图
使用 `Read` 工具读取用户提供的截图路径，识别未汉化的英文文本。

### 2. 翻译
- 专有名词不翻译（Prettier、Git、Docker、Super 套餐名、语音名称 Altair/Ara 等）
- 保持语气一致（正式、简洁）
- 按钮翻译要短（≤4 字优先）

### 3. 去重检查
使用 `Grep` 搜索现有字典，避免重复添加：
```powershell
Grep -n "关键词" path/to/dictionary.json
```

### 4. 写入字典
根据分类规则，写入对应字典文件。注意：
- 保持 JSON 格式正确
- 数组最后一项后面不要有逗号
- 中英文引号要一致

### 5. 验证 JSON
```powershell
python -c "import json; json.load(open(r'path\to\file.json', encoding='utf-8')); print('OK')"
```

### 6. 本地提交
```powershell
cd "D:\VibePM\tools\cursor-zh"
& "C:\Program Files\Git\bin\git.exe" add -A
& "C:\Program Files\Git\bin\git.exe" commit -m "feat: 补充描述"
```

### 7. 推送（等用户指令）
```powershell
& "C:\Program Files\Git\bin\git.exe" push origin main
```

---

## 常见问题处理

### 问题1：整条翻译不生效
**原因**：原文含 HTML 标签或 Markdown 格式（如超链接 `<a>`、代码反引号 `` ` ``），导致文本节点被拆分。

**解决方案**：补充更短的片段兜底。
- 例如："You can also manage Privacy Mode in the Unify dashboard"
- 拆成："You can also manage Privacy Mode in the" + "Privacy Mode"

### 问题2：文案被 Cursor 更新
**原因**：Cursor 新版本修改了文案（新增词汇、标点变化、单复数变化）。

**解决方案**：补充新版本，不要修改旧条目。
- 例如："Shell, MCP and Fetch" → 旧版本
- 新增："Shell, MCP, Fetch, and Read" → 新版本

### 问题3：单复数漏配
**原因**：时间相关翻译（hour/hours、minute/minutes、day/days）初版只加了复数形式。

**解决方案**：补全所有组合：
- 单数 / 复数
- 带括号 `)` / 不带括号
- 带句号 `.` / 不带句号

### 问题4：右键菜单正则不匹配
**原因**：实际菜单用双引号 `"Show Chat History"`，但正则只匹配单引号 `'Show Chat History'`。

**解决方案**：正则同时匹配单双引号：
```
^Hide ["'](.+)["']$
```

---

## 工具脚本

### 过期条目检测
```bash
python check_stale_entries.py
```
自动定位 Cursor 安装目录，扫描 `resources/app/out/` 下所有 JS/JSON/HTML + main.js，智能引号归一化后逐条检查字典 key 是否仍存在于源码中。

---

## CHANGELOG 规范

- 只写分类+数量，不罗列具体翻译条目
- 按日期分段
- 格式：`## [YYYY-MM-DD]`
- 表格形式统计各模块数量

---

## 用户偏好

- 本地 commit 可以做，但 push 必须等用户指令（"我不下指令不主动推送"）
- 更新日志只写分类+数量，不罗列具体翻译条目
- 专有名词不翻译（Prettier、Git、Docker、Super 套餐名、语音名称等）
- 系统级通知（Windows Toast）无法通过注入脚本汉化，不要尝试
