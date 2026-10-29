    // ================================================================
    // SECTION 2: 翻译引擎
    // ================================================================

    // __PARTIAL_FRAGMENTS_BLOCK__

    // 这些区域内的文本不翻译，避免改到编辑器正文、资源管理器和代码块
    var TiaoGuo_XuanZeQi = '.monaco-editor, .monaco-diff-editor, .monaco-component, .overflow-guard, .view-lines, .view-line, .editor-scrollable, .inputarea, .rename-input, .sticky-widget, .minimap, .ui-code-block, .cm-editor, .cm-content, pre, code, .code-view, .code-line, .code-content, .code-preview-container, .simple-code-render, .monaco-tokenized-source, .canvas-tab-source-editor, .composer-message-codeblock, .appearance-preview-editor-code, .diff-moved-code-block, .diff-line, .diff-line-content, .diff-lines, .inline-diff-content, .diff-review, .diff-review-row, [class*="ui-default-diff"], [class*="ui-default-code"], [data-component="embedded-file-viewer"], [data-streamdown="code-block-body"], .explorer-viewlet, [id="workbench.view.explorer"]';
    // 这些标签本身不遍历翻译
    var TiaoGuo_BiaoQian = new Set(['TEXTAREA', 'INPUT', 'SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT']);

    // 把连续空白压成单个空格并去掉首尾空白
    function GuiYiHua_WenBen(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    // 把弯引号归一成直引号，便于词典查找
    function GuiYiHua_YinHao(text) {
        if (!text) return text;
        return text
            .replace(/[\u2018\u2019\u2032]/g, "'")
            .replace(/[\u201C\u201D\u2033]/g, '"');
    }

    // 按片段表对整段文本做 split/join 替换
    function TiHuan_SuiPian_LieBiao(text, fragments) {
        if (!text || !fragments || !fragments.length) return null;
        var result = GuiYiHua_YinHao(text);
        var changed = false;
        for (var i = 0; i < fragments.length; i++) {
            var from = GuiYiHua_YinHao(fragments[i][0]);
            var neo = result.split(from).join(fragments[i][1]);
            if (neo !== result) { result = neo; changed = true; }
        }
        return changed ? result : null;
    }

    // 先查精确词典，未命中再按正则整句翻译。jinQue 为真时不走正则
    function ChaZhao_FanYi(text, jinQue) {
        if (!text) return null;

        var trimmed = text.trim();
        var normalized = GuiYiHua_WenBen(text);
        var quoteNorm = GuiYiHua_YinHao(normalized);

        if (FanYi_CiDian.has(trimmed)) return FanYi_CiDian.get(trimmed);
        if (normalized !== trimmed && FanYi_CiDian.has(normalized)) return FanYi_CiDian.get(normalized);
        if (quoteNorm !== normalized && FanYi_CiDian.has(quoteNorm)) return FanYi_CiDian.get(quoteNorm);

        if (jinQue) return null;
        for (var i = 0; i < MoShi_FanYi.length; i++) {
            var pair = MoShi_FanYi[i];
            if (pair[0].test(trimmed)) return trimmed.replace(pair[0], pair[1]);
            if (normalized !== trimmed && pair[0].test(normalized)) return normalized.replace(pair[0], pair[1]);
            if (quoteNorm !== normalized && pair[0].test(quoteNorm)) return quoteNorm.replace(pair[0], pair[1]);
        }

        return null;
    }

    // 对非整句命中的文本做定向片段和正则替换
    function TiHuan_BuFen_WenBen(text) {
        if (!text) return null;

        if (/^[a-z][\w-]*(?:\.[A-Za-z][\w-]*){1,}$/i.test(text)) {
            return null;
        }

        var result = TiHuan_SuiPian_LieBiao(text, DingXiang_SuiPian);
        if (result) return result;

        var normalized = GuiYiHua_WenBen(text);
        if (normalized !== text) {
            result = TiHuan_SuiPian_LieBiao(normalized, DingXiang_SuiPian);
            if (result) return result;
        }

        var quoteNorm = GuiYiHua_YinHao(normalized);
        result = quoteNorm;
        var changed = false;
        for (var i = 0; i < MoShi_FanYi.length; i++) {
            var pair = MoShi_FanYi[i];
            if (pair[0].test(result)) {
                result = result.replace(pair[0], pair[1]);
                changed = true;
            }
        }

        return changed ? result : null;
    }

    // 判断元素是否位于菜单或菜单栏内
    function Shi_CaiDan_QuYu(el) {
        if (!el) return false;
        try {
            return !!(el.closest(
                '.monaco-menu, .monaco-menu-container, .context-view, [role="menu"], [role="menubar"], ' +
                '.ui-menu, .ui-menu__layout, .ui-menu__content, .ui-slash-menu, .ui-slash-menu__content'
            ));
        } catch (e) { return false; }
    }

    // 判断文本节点是否是可翻译的菜单标签
    function Shi_CaiDan_WenBen_JieDian(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) return false;
        var pel = node.parentElement;
        if (!pel || !Shi_CaiDan_QuYu(pel)) return false;
        try {
            if (pel.closest('.keybinding, .submenu-indicator, .monaco-keybinding')) return false;
            if (pel.classList && pel.classList.contains('codicon')) return false;
            if (pel.closest(
                '.action-label, .ui-menu__item-title, .ui-menu__item-content, .ui-menu__title, ' +
                '.ui-menu__section-title, .ui-slash-menu__item-title, .text-dropdown-foreground'
            )) return true;
            var item = pel.closest(
                'a.action-menu-item, .action-item, [role="menuitem"], [role="option"], li.action-item, ' +
                '.ui-menu__row, .ui-menu__item, [class*="ui-menu__item"]'
            );
            if (!item) return false;
            if (pel.querySelector && pel.querySelector('.codicon, .keybinding, .submenu-indicator, .action-label')) return false;
            return true;
        } catch (e) { return false; }
    }

    // 在菜单提示表、词典和正则中查找译文
    function ChaZhao_CaiDan_Hint(text, hints) {
        if (!text || !hints) return null;
        var norm = GuiYiHua_WenBen(text);
        for (var j = 0; j < hints.length; j++) {
            if (norm === hints[j][0] || text === hints[j][0]) return hints[j][1];
        }
        return ChaZhao_FanYi(text) || ChaZhao_FanYi(norm) || TiHuan_BuFen_WenBen(norm);
    }

    // 把菜单标签写成译文，并保留原有节点结构
    function GengXin_CaiDan_BiaoQian(labelEl, tr) {
        if (!labelEl || !tr) return false;
        var raw = (labelEl.textContent || '').trim();
        if (!raw || GuiYiHua_WenBen(raw) === GuiYiHua_WenBen(tr)) return false;
        return XieRu_YuanSu_WenBen(labelEl, tr);
    }

    // 遍历菜单内的文本节点并翻译标签
    function FanYi_CaiDan_WenBen_JieDian(root, hints) {
        if (!root) return;
        var walker;
        try {
            walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        } catch (e) { return; }
        var tnode;
        while ((tnode = walker.nextNode())) {
            if (!Shi_CaiDan_WenBen_JieDian(tnode)) continue;
            var raw = (tnode.textContent || '').trim();
            if (!raw || raw.length > 160) continue;
            var tr = ChaZhao_CaiDan_Hint(raw, hints);
            if (tr && tr !== raw) XieRu_WenBen_JieDian(tnode, tr);
        }
    }

    // 翻译编辑器右键菜单的动作标签
    function FanYi_BianJiQi_CaiDan_TiaoMu(root) {
        if (!root) return;
        var hints = BianJiQi_CaiDan_HINTS;
        var labels = root.querySelectorAll('.action-label, [class*="action-label"], .monaco-action-bar .label');
        for (var i = 0; i < labels.length; i++) {
            var el = labels[i];
            if (el.closest('.view-lines')) continue;
            var row = el.closest('a.action-menu-item, .action-item, [role="menuitem"], li.action-item');
            if (row) FanYi_ShuXing(row);
            FanYi_ShuXing(el);
            GengXin_CaiDan_WenBen(el, hints);
        }
        var items = root.querySelectorAll('a.action-menu-item, .action-item, [role="menuitem"], li.action-item');
        for (var j = 0; j < items.length; j++) {
            FanYi_ShuXing(items[j]);
        }
        FanYi_CaiDan_WenBen_JieDian(root, hints);
    }

    // 翻译 Monaco 菜单项的标签和属性
    function FanYi_Monaco_CaiDan(root) {
        if (!root) return;
        var labels = root.querySelectorAll('.action-label, [class*="action-label"]');
        for (var i = 0; i < labels.length; i++) {
            var el = labels[i];
            if (el.closest('.view-lines')) continue;
            var row = el.closest('a.action-menu-item, .action-item, [role="menuitem"], li.action-item');
            if (row) FanYi_ShuXing(row);
            FanYi_ShuXing(el);
            GengXin_CaiDan_WenBen(el, BianJiQi_CaiDan_HINTS);
            var raw = (el.textContent || '').trim();
            if (!raw || raw.length > 160) continue;
            var tr = ChaZhao_CaiDan_Hint(raw, BianJiQi_CaiDan_HINTS);
            if (tr) GengXin_CaiDan_BiaoQian(el, tr);
        }
        var items = root.querySelectorAll('a.action-menu-item, .action-item, [role="menuitem"], li.action-item');
        for (var j = 0; j < items.length; j++) {
            var item = items[j];
            FanYi_ShuXing(item);
            if (item.querySelector('.action-label, [class*="action-label"]')) continue;
            FanYi_CaiDan_WenBen_JieDian(item, BianJiQi_CaiDan_HINTS);
        }
        FanYi_CaiDan_WenBen_JieDian(root, BianJiQi_CaiDan_HINTS);
    }

    var CaiDan_FanYi_Timer = null; // 菜单延迟翻译的定时器
    var CaiDan_FanYi_Retry = 0; // 菜单翻译已重试次数

    // 扫描当前打开的各类菜单并执行翻译
    function ZhiXing_CaiDan_FanYi() {
        ZhengZaiPiLiangFanYi = true;
        try {
            var menus = document.querySelectorAll(
                '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"], ' +
                '.ui-menu, .ui-menu__layout, .ui-menu__content, ' +
                '.ui-slash-menu, .ui-slash-menu__content'
            );
            for (var m = 0; m < menus.length; m++) {
                try { FanYi_Monaco_CaiDan(menus[m]); } catch (e) {}
                try { FanYi_BianJiQi_CaiDan_TiaoMu(menus[m]); } catch (e) {}
                try { FanYi_UI_CaiDan(menus[m]); } catch (e) {}
                try {
                    var tongYongLabels = menus[m].querySelectorAll('.action-label');
                    for (var ty = 0; ty < tongYongLabels.length; ty++) {
                        GengXin_CaiDan_WenBen(tongYongLabels[ty], TongYong_CaiDan_HINTS);
                        GengXin_CaiDan_WenBen(tongYongLabels[ty], BianJiQi_CaiDan_HINTS);
                    }
                } catch (e) {}
            }
            try { FanYi_LiaoTian_CaiDan(); } catch (e) {}
            try { FanYi_TiJi_CaiDan(); } catch (e) {}
            try { XiuZheng_BianJiQi_YouJianCaiDan(); } catch (e) {}
            try { XiuZheng_DaiQueRen_GaiDong_CaiDan(); } catch (e) {}
            try { XiuZheng_LiaoTian_LiShi(); } catch (e) {}
            try { SaoMiao_SuoYou_CaiDan(); } catch (e) {}
        } finally {
            ZhengZaiPiLiangFanYi = false;
        }
    }

    // 延迟并重试菜单翻译，等菜单渲染完成
    function YanChi_FanYi_CaiDan(forceRestart) {
        if (CaiDan_FanYi_Timer && !forceRestart) return;
        if (CaiDan_FanYi_Timer) clearTimeout(CaiDan_FanYi_Timer);
        if (forceRestart) CaiDan_FanYi_Retry = 0;
        CaiDan_FanYi_Timer = setTimeout(function PaiDui_CaiDan() {
            CaiDan_FanYi_Timer = null;
            ZhiXing_CaiDan_FanYi();
            if (CaiDan_FanYi_Retry < 8) {
                CaiDan_FanYi_Retry++;
                var caiDanYanChi = [50, 120, 220, 400, 700, 1100, 1600, 2200];
                CaiDan_FanYi_Timer = setTimeout(PaiDui_CaiDan, caiDanYanChi[CaiDan_FanYi_Retry - 1] || 2200);
            }
        }, 16);
    }

    var CaiDan_DongTai_GuanCha = null; // 监听菜单内容变化的观察器
    var CaiDan_DongTai_GuanCha_Root = null; // 当前被观察的菜单根节点

    // 判断一次 DOM 变化是否与菜单有关
    function CaiDan_BianYi_XiangGuan(node) {
        if (!node) return false;
        var el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (!el || el.nodeType !== 1) return false;
        if (Shi_CaiDan_QuYu(el)) return true;
        return JieDian_You_Context_Menu(el);
    }

    // 监听菜单出现和文本变化，并触发菜单翻译
    function AnZhuang_CaiDan_DongTai_GuanCha() {
        if (CaiDan_DongTai_GuanCha) return;
        CaiDan_DongTai_GuanCha = new MutationObserver(function(mutations) {
            if (ZhengZaiPiLiangFanYi) return;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                var target = m.target;
                if (Shi_ShuRu_Huo_DaiMa_BianYi(target)) continue;
                var targetEl = target && (target.nodeType === 1 ? target : target.parentElement);
                if (m.type === 'characterData') {
                    if (targetEl && targetEl.closest && targetEl.closest('.view-lines, textarea, input')) continue;
                    if (CaiDan_BianYi_XiangGuan(target)) {
                        try { GaiXie_CaiDan_WenBen_JieDian(target); } catch (e5) {}
                        YanChi_FanYi_CaiDan(false);
                        return;
                    }
                    continue;
                }
                if (CaiDan_BianYi_XiangGuan(target)) {
                    try { SaoMiao_SuoYou_CaiDan(); } catch (e3) {}
                    YanChi_FanYi_CaiDan(false);
                    return;
                }
                var added = m.addedNodes;
                if (!added) continue;
                for (var j = 0; j < added.length; j++) {
                    if (CaiDan_BianYi_XiangGuan(added[j])) {
                        try { SaoMiao_SuoYou_CaiDan(); } catch (e4) {}
                        YanChi_FanYi_CaiDan(false);
                        return;
                    }
                }
            }
        });
        try {
            CaiDan_DongTai_GuanCha.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true
            });
            CaiDan_DongTai_GuanCha_Root = document.body;
        } catch (e) {}
        // 右键或点击后立即扫描并排队翻译菜单
        function ChuFa_CaiDan_FanYi() {
            try { SaoMiao_SuoYou_CaiDan(); } catch (e0) {}
            setTimeout(function() {
                try { SaoMiao_SuoYou_CaiDan(); } catch (e1) {}
                YanChi_FanYi_CaiDan(true);
                try { FanYi_LiuLanQi_Webview(); } catch (e2) {}
            }, 0);
        }
        document.addEventListener('contextmenu', ChuFa_CaiDan_FanYi, true);
        document.addEventListener('click', function(ev) {
            var t = ev && ev.target;
            if (!t || !t.closest) return;
            if (t.closest('.context-view, .monaco-menu, .ui-menu, [role="menu"]')) {
                try { SaoMiao_SuoYou_CaiDan(); } catch (e3) {}
                return;
            }
            if (t.closest(
                '[aria-haspopup], [aria-expanded="true"], [data-state="open"], ' +
                '[class*="agent"], [class*="chat-history"], [class*="ChatHistory"], [id*="agents"]'
            )) ChuFa_CaiDan_FanYi();
        }, true);
    }

    var TiJi_CaiDan_FanYi_Timer = null; // 体积菜单延迟翻译的定时器
    var TiJi_CaiDan_FanYi_Retry = 0; // 体积菜单翻译已重试次数

    // 翻译提及菜单、斜杠菜单和相关悬浮提示
    function ZhiXing_TiJi_CaiDan_FanYi() {
        ZhengZaiPiLiangFanYi = true;
        try {
            FanYi_TiJi_CaiDan();
            var menus = document.querySelectorAll(
                '.ui-slash-menu, .ui-slash-menu__content, .ui-menu, .ui-menu__layout, .ui-menu__content'
            );
            for (var m = 0; m < menus.length; m++) {
                try { FanYi_UI_CaiDan(menus[m]); } catch (e) {}
            }
            var hover = document.querySelector('.monaco-hover, .cursorHoverWidget, [role="tooltip"]');
            if (hover) FanYi_Monaco_Hover_Content(hover);
        } finally {
            ZhengZaiPiLiangFanYi = false;
        }
    }

    // 延迟并少量重试提及菜单翻译
    function YanChi_FanYi_TiJi_CaiDan() {
        if (TiJi_CaiDan_FanYi_Timer) clearTimeout(TiJi_CaiDan_FanYi_Timer);
        TiJi_CaiDan_FanYi_Retry = 0;
        TiJi_CaiDan_FanYi_Timer = setTimeout(function PaiDui_TiJi() {
            TiJi_CaiDan_FanYi_Timer = null;
            ZhiXing_TiJi_CaiDan_FanYi();
            if (TiJi_CaiDan_FanYi_Retry < 2) {
                TiJi_CaiDan_FanYi_Retry++;
                TiJi_CaiDan_FanYi_Timer = setTimeout(PaiDui_TiJi, TiJi_CaiDan_FanYi_Retry === 1 ? 120 : 400);
            }
        }, 16);
    }

    // 体积菜单（斜杠命令、提及）里需要精确匹配的提示
    var TiJi_CaiDan_HINTS = [
        ['Mentions', '提及'],
        ['Files & Folders', '文件和文件夹'],
        ['Terminals', '终端'],
        ['Past Chats', '历史对话'],
        ['Branch (Diff with Main)', '分支（与主分支的差异）'],
        ['Changes from current branch to main branch', '当前分支与主分支的差异'],
        ['No available options', '暂无可用选项'],
        ['Results', '结果']
    ];

    // 各类菜单都能用的短提示
    var TongYong_CaiDan_HINTS = [
        ['Copy', '复制'],
        ['Select All', '全选'],
        ['Search with Google', '使用 Google 搜索'],
        ['Cut', '剪切'],
        ['Paste', '粘贴']
    ];

    // 顶部菜单栏标题
    var DingBu_CaiDan_HINTS = [
        ['File', '文件'],
        ['Edit', '编辑'],
        ['Selection', '选择'],
        ['View', '查看'],
        ['Go', '转到'],
        ['Terminal', '终端'],
        ['Help', '帮助']
    ];

    // 编辑器右键菜单
    var BianJiQi_CaiDan_HINTS = [
        ['Add Symbol to Current Chat', '将符号添加到当前对话'],
        ['Add Symbol to Current Chat...', '将符号添加到当前对话...'],
        ['Add Symbol to New Chat', '将符号添加到新对话'],
        ['Add Symbol to New Chat...', '将符号添加到新对话...'],
        ['Create Rule', '创建规则'],
        ['Create Rule from Selection', '从选区创建规则'],
        ['Add to Chat', '添加到聊天'],
        ['Quick Edit', '快速编辑'],
        ['Insert Table', '插入表格'],
        ['Insert Table of Contents', '插入目录'],
        ['Open as Text Editor', '以文本编辑器打开'],
        ['Compare as Text', '以文本方式比较'],
        ['Open with Markdown Editor (WYSIWYG)', '使用 Markdown 编辑器（所见即所得）打开']
    ];

    // 聊天侧栏菜单
    var LiaoTian_CaiDan_HINTS = [
        ['Open in New Tab', '在新标签页中打开'],
        ['Restore', '恢复'],
        ['Pin', '固定'],
        ['Unpin', '取消固定'],
        ['Delete', '删除'],
        ['Rename', '重命名'],
        ['Rename Chat', '重命名对话'],
        ['Keep All', '全部保留'],
        ['Undo All', '全部撤销'],
        ['Archive', '归档'],
        ['Unarchive', '取消归档'],
        ['Fork Chat', '分叉对话'],
        ['Fork chat', '分叉对话'],
        ['Forking chat', '正在分叉对话'],
        ['New Chat', '新对话'],
        ['Agent Conversations', '智能体对话'],
        ['Fork Conversation', '分叉对话'],
        ['Fork', '分叉'],
        ['Export Chat', '导出对话'],
        ['Copy Message', '复制消息'],
        ['Copy Messages', '复制消息'],
        ['Copy ID', '复制 ID'],
        ['Copy Branch', '复制分支'],
        ['Copy Transcript', '复制对话记录'],
        ['Copy Branch Name', '复制分支名称'],
        ['Split Right', '向右拆分'],
        ['Split Down', '向下拆分'],
        ['Mark as Read', '标记为已读'],
        ['Mark as Unread', '标记为未读'],
        ['Archive Prior Chats', '归档较早的对话']
    ];

    // 聊天历史菜单的补充条目
    var LiaoTian_LiShi_Extra_HINTS = [
        ['Search Agents...', '搜索智能体...'],
        ['Search agents, files, actions...', '搜索智能体、文件、操作...'],
        ['Search agents, files, and actions...', '搜索智能体、文件和操作...'],
        ['Search chats, files, and actions...', '搜索聊天、文件和操作...'],
        ['Recent Agents', '最近智能体'],
        ['Grouping', '分组'],
        ['Ordering', '排序'],
        ['Filters', '筛选'],
        ['Created', '创建时间'],
        ['Group by Workspace', '按工作区分组'],
        ['Clear Filter', '清除筛选'],
        ['Change Filter', '更改筛选'],
        ['Select', '选择'],
        ['Author', '作者'],
        ['Inactive', '未激活'],
        ['Untitled', '未命名'],
        ['Edit Details', '编辑详情'],
        ['Duplicate', '创建副本'],
        ['Copy as JSON', '复制为 JSON'],
        ['Triggers', '触发器'],
        ['Add Trigger', '添加触发器'],
        ['Select repository', '选择仓库'],
        ['Test run', '测试运行'],
        ['Memories', '记忆'],
        ['Agent Mode', '智能体模式'],
        ['Today', '今天'],
        ['Yesterday', '昨天'],
        ['Older', '更早'],
        ['Last 7 Days', '最近 7 天'],
        ['Last 14 Days', '最近 14 天'],
        ['Last 30 Days', '最近 30 天'],
        ['Last 90 Days', '最近 90 天'],
        ['All Time', '全部时间'],
        ['Archived', '已归档'],
        ['Show Chat History', '显示聊天历史'],
        ['Chat History', '聊天历史'],
        ['Show more', '显示更多'],
        ['Show less', '显示更少'],
        ['Show 1 more', '再显示 1 条'],
        ['New Chat', '新对话'],
        ['Agent Conversations', '智能体对话']
    ];

    // 智能体变更区，正文和属性都会用到
    var Agent_BianGeng_GongYong_HINTS = [
        ['All Changes', '全部更改'],
        ['Latest', '最新'],
        ['Diff Against...', '差异对比...'],
        ['Agent Changes', '智能体更改'],
        ['Undo File', '撤销文件'],
        ['Keep File', '保留文件'],
        ['Accept all changes', '接受所有更改'],
        ['Keep all changes', '保留所有更改'],
        ['Keep changes', '保留更改'],
        ['Review Next File', '审查下一个文件'],
        ['No Uncommitted Changes', '无未提交的更改'],
        ['Branch Commits', '分支提交'],
        ['Find in Changes', '在更改中查找'],
        ['Find in Diff', '在差异中查找'],
        ['Refresh Changes', '刷新更改'],
        ['Ignore Whitespace', '忽略空白字符'],
        ['Word Wrap', '自动换行']
    ];

    // 待审查变更上的状态文案
    var Agent_BianGeng_Pending_HINTS = [
        ['Changes waiting to be confirmed', '等待确认的更改'],
        ['Pending Changes', '待确认更改']
    ];

    // 变更区正文专用，在待审查文案之后追加
    var Agent_BianGeng_WenBen_Extra_HINTS = Agent_BianGeng_Pending_HINTS.concat([
        ['Keep', '保留'],
        ['Keep Ctrl+Shift+Y', '保留 Ctrl+Shift+Y'],
        ['Undo Ctrl+N', '撤销 Ctrl+N']
    ]);

    // 变更区只写到 aria-label、title 等属性上的提示
    var Agent_BianGeng_Attr_Extra_HINTS = [
        ['Keep', '保留'],
        ['Keep Ctrl+Shift+Y', '保留 Ctrl+Shift+Y']
    ];

    // 对话输入区共用提示
    var DuiHua_JieMian_GongYong_HINTS = [
        ['Show context usage', '显示上下文用量'],
        ['Add files', '添加文件'],
        ['Edit selected code', '编辑所选代码'],
        ['Edit Selection', '编辑选区'],
        ['Rename Chat', '重命名对话'],
        ['Open as Editor', '在编辑器中打开'],
        ['Open in New Tab', '在新标签页中打开'],
        ['Restore', '恢复'],
        ['Pin', '固定'],
        ['Delete', '删除'],
        ['Rename', '重命名'],
        ['Keep All', '全部保留'],
        ['Undo All', '全部撤销'],
        ['Close Chat', '关闭对话'],
        ['Close Other Chats', '关闭其他对话'],
        ['How did the agent do?', '智能体表现如何？'],
        ['Response A is Better', '回复 A 更好'],
        ['Response B is Better', '回复 B 更好'],
        ['New Agent (Ctrl+N)', '新建智能体 (Ctrl+N)'],
        ['[Alt] Replace Agent', '[Alt] 替换智能体'],
        ['Voice Input', '语音输入'],
        ['Send now', '立即发送'],
        ['Send After Current Message', '在当前消息之后发送'],
        ['Send after current message', '在当前消息之后发送'],
        ['Send Right Away', '立即发送'],
        ['Edit queued message', '编辑排队消息'],
        ['Editing queued message', '正在编辑排队消息'],
        ['Editing queued message...', '正在编辑排队消息...'],
        ['Edit Queued', '编辑排队'],
        ['Attached image', '附加图片'],
        ['View image', '查看图片'],
        ['Remove from queue', '从队列移除'],
        ['Revert last change', '撤销上次更改'],
        ['Queued', '已排队'],
        ['Show conversation', '显示对话'],
        ['Send follow-up', '发送后续消息'],
        ['Select Model', '选择模型'],
        ['Modes, skills, MCPs and more', '模式、技能、MCP 等']
    ];

    // 对话区只翻译属性、不改正文
    var DuiHua_JieMian_Attr_Only_HINTS = [
        ['Replace Agent', '替换智能体'],
        ['Switch Model', '切换模型'],
        ['Switch to Auto', '切换到自动'],
        ['Switch Model and Retry', '切换模型并重试']
    ];

    // 对话区只翻译正文、不改属性
    var DuiHua_JieMian_WenBen_Only_HINTS = [
        ['System prompt', '系统提示词'],
        ['Tool definitions', '工具定义'],
        ['Subagent definitions', '子智能体定义'],
        ['Summarized conversation', '摘要对话'],
        ['Conversation', '对话']
    ];

    // 内置浏览器工具栏
    var LiuLanQi_GongJuTiao_HINTS = [
        ['Navigate back', '后退'],
        ['Navigate forward', '前进'],
        ['Hard reload (clears cache)', '强制重新加载（清除缓存）'],
        ['Go Back', '返回'],
        ['Go Forward', '前进'],
        ['Back', '返回'],
        ['Forward', '前进'],
        ['Reload', '重新加载'],
        ['Refresh', '刷新'],
        ['Hard Reload', '强制重新加载'],
        ['New Tab', '新建标签页'],
        ['Enter Full Screen', '进入全屏'],
        ['Exit Full Screen', '退出全屏'],
        ['Show Sidebar', '显示侧栏'],
        ['Hide Sidebar', '隐藏侧栏'],
        ['Select element', '选择元素'],
        ['Show Console', '显示控制台'],
        ['Hide Console', '隐藏控制台'],
        ['Show CSS Inspector', '显示 CSS 检查器'],
        ['Hide CSS Inspector', '隐藏 CSS 检查器'],
        ['Enter design mode', '进入设计模式'],
        ['Exit design mode', '退出设计模式'],
        ['Favorites, Recents', '收藏、最近']
    ];

    // 按提示表更新单个菜单元素的文本和属性
    function GengXin_CaiDan_WenBen(el, hints) {
        if (!el || el.closest('.view-lines')) return;
        FanYi_ShuXing(el);
        var text = GuiYiHua_WenBen(el.textContent || '');
        if (!text || text.length > 160) return;
        var tr = ChaZhao_CaiDan_Hint(text, hints);
        if (tr && tr !== text) GengXin_CaiDan_BiaoQian(el, tr);
    }

    // 翻译页面上已打开的提及菜单和斜杠菜单
    function FanYi_TiJi_CaiDan() {
        var hints = TiJi_CaiDan_HINTS;
        var menus = document.querySelectorAll(
            '.ui-slash-menu, .ui-slash-menu__content, .ui-menu, .ui-menu__layout, .ui-menu__content, ' +
            '.context-view, [role="menu"]'
        );
        for (var m = 0; m < menus.length; m++) {
            var scope = menus[m];
            var els;
            try {
                els = scope.querySelectorAll(
                    '.ui-slash-menu__item-title, .ui-slash-menu__item-title-primary, ' +
                    '.ui-slash-menu__item-title-secondary, .ui-slash-menu__structured-tooltip-title, ' +
                    '.ui-slash-menu__structured-tooltip-description, ' +
                    '.ui-menu__item-title, .ui-menu__item-content, .ui-menu__item-description, ' +
                    '.ui-menu__section-title, .ui-menu__title, .text-dropdown-foreground'
                );
            } catch (e) { continue; }
            for (var i = 0; i < els.length; i++) {
                GengXin_CaiDan_WenBen(els[i], hints);
            }
            try {
                var leaves = scope.querySelectorAll(
                    '.ui-slash-menu__content span, .ui-slash-menu__content div, ' +
                    '.ui-menu__content span, .ui-menu__content div'
                );
                for (var li = 0; li < leaves.length; li++) {
                    var leaf = leaves[li];
                    if (leaf.closest('.view-lines')) continue;
                    if (leaf.querySelector && leaf.querySelector('span, div, button, input, select')) continue;
                    GengXin_CaiDan_WenBen(leaf, hints);
                }
            } catch (e) {}
        }
    }

    // 翻译 UI 菜单的标题、说明和分区文字
    function FanYi_UI_CaiDan(root) {
        var scope = root || document;
        var hints = LiaoTian_CaiDan_HINTS.concat(TiJi_CaiDan_HINTS);
        var els;
        try {
            els = scope.querySelectorAll(
                '.ui-menu__item-title, .ui-menu__item-content, .ui-menu__item-description, .ui-menu__title, ' +
                '.ui-menu__section-title, .ui-menu__section-text-action, ' +
                '.ui-slash-menu__item-title, .ui-slash-menu__item-title-primary, .ui-slash-menu__item-title-secondary, ' +
                '.text-dropdown-foreground'
            );
        } catch (e) { return; }
        for (var i = 0; i < els.length; i++) {
            GengXin_CaiDan_WenBen(els[i], hints);
        }
        try {
            var rows = scope.querySelectorAll('.ui-menu__row, .ui-menu__toggle-row');
            for (var r = 0; r < rows.length; r++) FanYi_ShuXing(rows[r]);
        } catch (e) {}
    }

    // 翻译聊天相关菜单的标签
    function FanYi_LiaoTian_CaiDan() {
        var hints = LiaoTian_CaiDan_HINTS;
        var menus = ShouJi_CaiDan_Gen();
        for (var m = 0; m < menus.length; m++) {
            FanYi_UI_CaiDan(menus[m]);
            var labels = menus[m].querySelectorAll('.action-label, [role="menuitem"], .ui-menu__item-title');
            for (var i = 0; i < labels.length; i++) {
                GengXin_CaiDan_WenBen(labels[i], hints);
            }
            SaoMiao_YiGe_CaiDan(menus[m]);
        }
    }

    var CaiDan_ZhuanYong_YingShe = null; // 菜单英文到中文的懒构建映射
    var CaiDan_YiGuanCha = typeof WeakSet !== 'undefined' ? new WeakSet() : null; // 已经挂过观察器的菜单
    var CaiDan_ZhengZaiXie = false; // 正在写回菜单文字，避免观察器再次触发

    // 合并各菜单提示表，生成专用查找表
    function HuoQu_CaiDan_YingShe() {
        if (CaiDan_ZhuanYong_YingShe) return CaiDan_ZhuanYong_YingShe;
        var map = new Map();
        var lists = [
            BianJiQi_CaiDan_HINTS,
            LiaoTian_CaiDan_HINTS,
            LiaoTian_LiShi_Extra_HINTS,
            TongYong_CaiDan_HINTS,
            TiJi_CaiDan_HINTS
        ];
        for (var i = 0; i < lists.length; i++) {
            var arr = lists[i] || [];
            for (var j = 0; j < arr.length; j++) {
                if (arr[j] && arr[j][0] && arr[j][1]) map.set(arr[j][0], arr[j][1]);
            }
        }
        CaiDan_ZhuanYong_YingShe = map;
        return map;
    }

    // 用菜单专用表或词典查找一条菜单原文
    function ChaZhao_CaiDan_ZhuanYong(raw) {
        if (!raw) return null;
        var text = GuiYiHua_WenBen(raw);
        if (!text || !/[A-Za-z]/.test(text) || text.length > 160) return null;
        var hit = HuoQu_CaiDan_YingShe().get(text);
        if (hit) return hit;
        return ChaZhao_FanYi(text) || ChaZhao_FanYi(raw);
    }

    // 改写单个菜单文本节点，跳过快捷键和图标
    function GaiXie_CaiDan_WenBen_JieDian(node) {
        if (!node || node.nodeType !== 3) return false;
        var pel = node.parentElement;
        if (!pel) return false;
        try {
            if (pel.closest('.keybinding, .monaco-keybinding, .submenu-indicator, .codicon, .view-lines')) return false;
        } catch (e) {}
        var raw = node.textContent || '';
        var trimmed = raw.trim();
        var tr = ChaZhao_CaiDan_ZhuanYong(trimmed);
        if (!tr || tr === trimmed) return false;
        var idx = raw.indexOf(trimmed);
        CaiDan_ZhengZaiXie = true;
        try {
            XieRu_WenBen_JieDian(node, idx < 0 ? tr : raw.substring(0, idx) + tr + raw.substring(idx + trimmed.length));
        } finally {
            CaiDan_ZhengZaiXie = false;
        }
        return true;
    }

    // 翻译一个菜单容器里的项和文本节点
    function SaoMiao_YiGe_CaiDan(root) {
        if (!root) return;
        try {
            var items = root.querySelectorAll(
                'a.action-menu-item, .action-item, [role="menuitem"], [role="option"], ' +
                '.action-label, .ui-menu__item-title, .ui-menu__row'
            );
            for (var i = 0; i < items.length; i++) FanYi_ShuXing(items[i]);
        } catch (e1) {}
        var walker;
        try {
            walker = (root.ownerDocument || document).createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        } catch (e2) { return; }
        var tnode;
        while ((tnode = walker.nextNode())) GaiXie_CaiDan_WenBen_JieDian(tnode);
    }

    // 收集当前页面上的菜单根节点
    function ShouJi_CaiDan_Gen() {
        var out = [];
        var seen = typeof Set !== 'undefined' ? new Set() : null;
        // 去重后把节点加入菜单根列表
        function tianJia(node) {
            if (!node || (seen && seen.has(node))) return;
            if (seen) seen.add(node);
            out.push(node);
        }
        // 在给定根节点内查找菜单容器
        function caiJi(root) {
            if (!root || !root.querySelectorAll) return;
            try {
                var menus = root.querySelectorAll(
                    '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"], ' +
                    '.ui-menu, .ui-menu__layout, .ui-menu__content, .ui-slash-menu, .ui-slash-menu__content'
                );
                for (var i = 0; i < menus.length; i++) tianJia(menus[i]);
            } catch (e) {}
        }
        caiJi(document);
        try {
            var hosts = document.querySelectorAll(
                '.monaco-workbench, .context-view, [class*="overlay"], [class*="glass"], [class*="shadow"]'
            );
            for (var h = 0; h < hosts.length; h++) {
                if (hosts[h].shadowRoot) caiJi(hosts[h].shadowRoot);
            }
        } catch (e2) {}
        return out;
    }

    // 扫描全部菜单并给每个菜单单独挂观察器
    function SaoMiao_SuoYou_CaiDan() {
        var menus = ShouJi_CaiDan_Gen();
        for (var i = 0; i < menus.length; i++) {
            SaoMiao_YiGe_CaiDan(menus[i]);
            ZhuCe_DanGe_CaiDan_GuanCha(menus[i]);
        }
    }

    // 给单个菜单注册变更观察，避免重复注册
    function ZhuCe_DanGe_CaiDan_GuanCha(menu) {
        if (!menu) return;
        try {
            if (CaiDan_YiGuanCha) {
                if (CaiDan_YiGuanCha.has(menu)) return;
                CaiDan_YiGuanCha.add(menu);
            }
        } catch (e) {}
        var obs = new MutationObserver(function(mutations) {
            if (CaiDan_ZhengZaiXie) return;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'characterData') {
                    GaiXie_CaiDan_WenBen_JieDian(m.target);
                    continue;
                }
                var added = m.addedNodes;
                if (!added) continue;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType === 3) GaiXie_CaiDan_WenBen_JieDian(n);
                    else if (n.nodeType === 1) SaoMiao_YiGe_CaiDan(n);
                }
            }
        });
        try {
            obs.observe(menu, { childList: true, subtree: true, characterData: true });
        } catch (e2) {}
    }

    // 判断文本是否像源代码，避免把代码里的界面原文替换掉
    function Shi_Yuan_DaiMa_WenBen(text) {
        if (!text) return false;
        if (/=>|\breplace\s*\(|\bfunction\s*[(<{]|\b(?:const|let|var)\s+[A-Za-z_$]|\breturn\s+\S/.test(text)) return true;
        if (/[{}]/.test(text) && /;/.test(text)) return true;
        // 统计面板不会把 AI-Generated: 这类标签包在引号里，引号里的是源代码字符串
        return /['"`][^'"`\n]{0,120}(?:AI-Generated:|Agent Stats:|Tab Stats:|Total Changes:|Most Recent Commit Scored:)/.test(text) ||
            /(?:AI-Generated:|Agent Stats:|Tab Stats:|Total Changes:|Most Recent Commit Scored:)[^'"`\n]{0,80}['"`]/.test(text);
    }

    // 判断元素是否是语法高亮 token，这类节点只属于源代码
    function Shi_YuFa_BiaoJi(el) {
        var cur = el;
        for (var i = 0; cur && i < 6; i++, cur = cur.parentElement) {
            if (!cur.classList) continue;
            for (var c = 0; c < cur.classList.length; c++) {
                var name = cur.classList[c];
                if (name.indexOf('mtk') === 0 || name.indexOf('code-highlight') === 0) return true;
            }
        }
        return false;
    }

    // 提交评分统计的识别词
    var TiJiao_PingFen_GuanJianCi = [
        'Most Recent Commit Scored',
        'AI-Generated:',
        'Total Changes:',
        'Agent Stats:',
        'Tab Stats:',
        'Agent AI Stats',
        'Tab AI Stats',
        '% AI\\b'
    ];
    var TiJiao_PingFen_MenShuan = new RegExp('(?:' + TiJiao_PingFen_GuanJianCi.join('|') + ')', 'i');
    // 提交评分统计的替换规则，顺序不能调换
    var TiJiao_PingFen_GuiZe = [
        [/Most Recent Commit Scored:/g, '最近评分的提交：'],
        [/AI-Generated:\s*([\d.]+)%\s*\((\d+)\s*lines?\)/gi, 'AI 生成：$1%（$2 行）'],
        [/AI-Generated:/g, 'AI 生成：'],
        [/- Tab:\s*([\d,]+)\s*lines?\s*\(([\d,]+)\s*added,\s*([\d,]+)\s*deleted\)/gi, '- Tab：$1 行（新增 $2，删除 $3）'],
        [/- Composer:\s*([\d,]+)\s*lines?\s*\(([\d,]+)\s*added,\s*([\d,]+)\s*deleted\)/gi, '- Composer：$1 行（新增 $2，删除 $3）'],
        [/Total Changes:\s*([\d,]+)\s*added,\s*([\d,]+)\s*deleted/gi, '总变更：新增 $1，删除 $2'],
        [/Agent AI Stats \(Today\):\s*([\d,]+)\/([\d,]+)(?:\s*lines)?\s*\((\d+)%\)/gi, '智能体 AI 统计（今日）：$1/$2（$3%）'],
        [/Agent Stats:\s*([\d,]+)\/([\d,]+)\s*\((\d+)%\)/gi, '智能体统计：$1/$2（$3%）'],
        [/Tab AI Stats \(Today\):\s*([\d,]+)\/([\d,]+)(?:\s*lines)?\s*\((\d+)%\)/gi, 'Tab AI 统计（今日）：$1/$2（$3%）'],
        [/Tab Stats:\s*([\d,]+)\/([\d,]+)\s*\((\d+)%\)/gi, 'Tab 统计：$1/$2（$3%）'],
        [/Agent AI Stats \(Today\):/g, '智能体 AI 统计（今日）：'],
        [/Agent Stats:/g, '智能体统计：'],
        [/Tab AI Stats \(Today\):/g, 'Tab AI 统计（今日）：'],
        [/Tab Stats:/g, 'Tab 统计：'],
        [/Repo:\s*([^\n\r]+)/g, '仓库：$1'],
        [/Branch:\s*([^\n\r]+)/g, '分支：$1'],
        [/\b([a-f0-9]{7,40})\s+([\d.]+)%\s*AI\b/gi, '$1 $2% 由 AI 生成']
    ];

    // 翻译提交评分、AI 生成占比等统计文案
    function FanYi_TiJiao_PingFen_WenBen(text) {
        if (!text || !/[A-Za-z]/.test(text)) return null;
        if (Shi_Yuan_DaiMa_WenBen(text)) return null;
        if (!TiJiao_PingFen_MenShuan.test(text)) return null;
        var result = text;
        for (var i = 0; i < TiJiao_PingFen_GuiZe.length; i++) {
            TiJiao_PingFen_GuiZe[i][0].lastIndex = 0;
            result = result.replace(TiJiao_PingFen_GuiZe[i][0], TiJiao_PingFen_GuiZe[i][1]);
        }
        return result !== text ? result : null;
    }

    // 读取文本节点前一个或后一个非空相邻文本
    function DuQu_XiangLin_WenBen(node, dir) {
        var sib = dir === 'prev' ? node.previousSibling : node.nextSibling;
        while (sib && sib.nodeType === 3 && !(sib.textContent || '').trim()) {
            sib = dir === 'prev' ? sib.previousSibling : sib.nextSibling;
        }
        if (sib && (sib.textContent || '').trim()) return (sib.textContent || '').trim();
        var parent = node.parentElement;
        if (!parent) return '';
        sib = dir === 'prev' ? parent.previousSibling : parent.nextSibling;
        while (sib && sib.nodeType === 3 && !(sib.textContent || '').trim()) {
            sib = dir === 'prev' ? sib.previousSibling : sib.nextSibling;
        }
        return sib ? (sib.textContent || '').trim() : '';
    }

    // 判断是否是思考标签（含已译）
    function Shi_SiKao_BiaoQian_Wen(text) {
        return text === 'Thought' || text === '已思考' || text === 'Thinking' || text === '思考' || text === '思考中' ||
            /^已思考/.test(text) || /^思考/.test(text);
    }

    // 向前多看几层，跳过箭头，找到 Thought / 已思考
    function Zhao_SiKao_BiaoQian(node) {
        var texts = [];
        function ShouJi(start) {
            var sib = start;
            for (var i = 0; sib && i < 8; i++) {
                var t = (sib.textContent || '').trim();
                if (t && !/^[>\u203a\u276f\u25b8\u25b6]+$/.test(t)) texts.push(t);
                sib = sib.previousSibling;
            }
        }
        ShouJi(node.previousSibling);
        var p = node.parentElement;
        for (var hop = 0; p && hop < 5; hop++) {
            ShouJi(p.previousSibling);
            var cls = p.className ? String(p.className) : '';
            if (cls.indexOf('thinking') >= 0) texts.push('已思考');
            p = p.parentElement;
        }
        for (var j = 0; j < texts.length; j++) {
            if (Shi_SiKao_BiaoQian_Wen(texts[j])) return texts[j];
        }
        return '';
    }

    // 整句残留：已思考 briefly / Thought 1s
    function FanYi_SiKao_ZhengJu(trimmed) {
        if (!trimmed) return null;
        var t = trimmed.replace(/[>\u203a\u276f\u25b8\u25b6]+$/, '').trim();
        if (/^(?:Thought|已思考)\s+briefly$/i.test(t)) return '已思考片刻';
        if (/^Waited\s+briefly$/i.test(t)) return '已等待片刻';
        var m = /^(?:Thought|已思考)\s+(\d+(?:\.\d+)?)s$/i.exec(t);
        if (m) return '已思考 ' + m[1] + ' 秒';
        m = /^(?:Thought|已思考)\s+(\d+)m (\d+)s$/i.exec(t);
        if (m) return '已思考 ' + m[1] + ' 分 ' + m[2] + ' 秒';
        m = /^(?:Thought|已思考)\s+(\d+)m$/i.exec(t);
        if (m) return '已思考 ' + m[1] + ' 分钟';
        m = /^(?:Thought|已思考)\s+(\d+)h (\d+)m(?: (\d+)s)?$/i.exec(t);
        if (m) return m[3] ? ('已思考 ' + m[1] + ' 小时 ' + m[2] + ' 分 ' + m[3] + ' 秒') : ('已思考 ' + m[1] + ' 小时 ' + m[2] + ' 分');
        m = /^(?:Thought|已思考)\s+(\d+)h$/i.exec(t);
        if (m) return '已思考 ' + m[1] + ' 小时';
        return null;
    }

    // 把 Thought 旁边的思考时长译成中文
    function FanYi_SiKao_ShiChang(node, trimmed) {
        var zhengJu = FanYi_SiKao_ZhengJu(trimmed);
        if (zhengJu) return zhengJu;
        var duration = trimmed.replace(/[>\u203a\u276f\u25b8\u25b6]+$/, '').trim();
        if (!/^(?:briefly|\d+(?:\.\d+)?s|\d+m(?: \d+s)?|\d+h(?: \d+m(?: \d+s)?)?)$/.test(duration)) return null;
        if (!Zhao_SiKao_BiaoQian(node)) return null;
        if (duration === 'briefly') return '片刻';
        trimmed = duration;
        var m = /^(\d+(?:\.\d+)?)s$/.exec(trimmed);
        if (m) return m[1] + ' 秒';
        m = /^(\d+)m (\d+)s$/.exec(trimmed);
        if (m) return m[1] + ' 分 ' + m[2] + ' 秒';
        m = /^(\d+)m$/.exec(trimmed);
        if (m) return m[1] + ' 分钟';
        m = /^(\d+)h (\d+)m (\d+)s$/.exec(trimmed);
        if (m) return m[1] + ' 小时 ' + m[2] + ' 分 ' + m[3] + ' 秒';
        m = /^(\d+)h (\d+)m$/.exec(trimmed);
        if (m) return m[1] + ' 小时 ' + m[2] + ' 分';
        m = /^(\d+)h$/.exec(trimmed);
        if (m) return m[1] + ' 小时';
        return null;
    }

    // 在时长已出现时把 Thought 译成已思考
    function FanYi_SiKao_BiaoQian(node, trimmed) {
        if (trimmed !== 'Thought') return null;
        var follow = DuQu_XiangLin_WenBen(node, 'next');
        if (/^(?:briefly|\d+(?:\.\d+)?s|\d+m(?: \d+s)?|\d+h(?: \d+m(?: \d+s)?)?|片刻|\d+ 秒|\d+ 分钟|\d+ 分|\d+ 小时)/.test(follow)) {
            return '已思考';
        }
        var el = node.parentElement;
        for (var hop = 0; el && hop < 6; hop++, el = el.parentElement) {
            var cls = el.className ? String(el.className) : '';
            if (cls.indexOf('thinking') >= 0) return '已思考';
        }
        return null;
    }

    // 智能体状态里需要整句匹配的原文
    var ZhiNengTi_ZhuangTai_JingQue = [
        'Planning next moves',
        'Wrapping up',
        'Reviewing attached video',
        'Taking longer than expected…',
        'Taking longer than expected...',
        'Starting environment setup',
        'Warming up…',
        'Warming up...',
        'Preparing…',
        'Preparing...',
        'Reconnecting...',
        'Updating canvas…',
        'Updating canvas...',
        'Updating visualization…',
        'Updating visualization...',
        "We'll send this in",
        'Waiting for the self-hosted worker to reconnect'
    ];
    // 工具行开头的动作词。Reading 必须排在 Read 前面
    var ZhiNengTi_ZhuangTai_DongCi = [
        'Exploring', 'Explored', 'Edited', 'Editing', 'Grepping', 'Grepped',
        'Reading', 'Read', 'Ran', 'Running', 'Deleting', 'Deleted',
        'Summarizing chat context', 'Chat context summarized', 'Summarization stopped'
    ];
    var ZhiNengTi_ZhuangTai_GuoQu = ['explored', 'edited'];
    // 数量短语里的单位，按正则片段拼接
    var ZhiNengTi_ZhuangTai_DanWei = [
        'files?', 'search(?:es)?', 'fetch(?:es)?', 'commands?', 'images?',
        'director(?:y|ies)', 'tools?', 'agents?', 'deletes?', 'browser actions?'
    ];
    var ZhiNengTi_ZhuangTai_DongCi_ZhengZe = new RegExp('^(?:' + ZhiNengTi_ZhuangTai_DongCi.join('|') + ')\\b');
    var ZhiNengTi_ZhuangTai_GuoQu_ZhengZe = new RegExp('^(?:' + ZhiNengTi_ZhuangTai_GuoQu.join('|') + ') \\d+ ');
    var ZhiNengTi_ZhuangTai_ShuLiang_ZhengZe = new RegExp('^\\d+ (?:' + ZhiNengTi_ZhuangTai_DanWei.join('|') + ')\\b');

    // 判断文本是否属于智能体状态或思考过程
    function Shi_ZhiNengTi_ZhuangTai_WenBen(trimmed) {
        for (var i = 0; i < ZhiNengTi_ZhuangTai_JingQue.length; i++) {
            if (trimmed === ZhiNengTi_ZhuangTai_JingQue[i]) return true;
        }
        return /^Thought\s+\S/.test(trimmed) ||
            /^(?:已思考\s+)?briefly$/i.test(trimmed) ||
            /^已思考\s+\S/.test(trimmed) ||
            /^Waited\b/i.test(trimmed) ||
            /^Worked for\s/.test(trimmed) ||
            /^explored /i.test(trimmed) ||
            /^Waiting for .+ to reconnect$/.test(trimmed) ||
            /^\d+ background (?:terminal|subagent|task)s?$/.test(trimmed) ||
            ZhiNengTi_ZhuangTai_DongCi_ZhengZe.test(trimmed) ||
            ZhiNengTi_ZhuangTai_GuoQu_ZhengZe.test(trimmed) ||
            ZhiNengTi_ZhuangTai_ShuLiang_ZhengZe.test(trimmed);
    }

    // 翻译单个智能体状态文本节点
    function FanYi_ZhuangTai_WenBen_JieDian(node) {
        if (!node || node.nodeType !== 3) return;
        try {
            if (node.parentElement && (
                Shi_YongHu_ShuRu_QuYu(node.parentElement) ||
                Shi_HuiFu_ZhengWen(node.parentElement) ||
                Shi_WenJianShu_MingCheng(node.parentElement) ||
                Shi_Zai_DaiMa_Hang(node)
            )) return;
        } catch (e) {}
        var trimmed = (node.textContent || '').trim();
        if (!trimmed || trimmed.length > 80) return;
        if (!Shi_ZhiNengTi_ZhuangTai_WenBen(trimmed) &&
            !FanYi_SiKao_ZhengJu(trimmed) &&
            !FanYi_SiKao_BiaoQian(node, trimmed) &&
            !FanYi_SiKao_ShiChang(node, trimmed)) return;
        FanYi_WenBen_JieDian(node);
    }

    // 扫描页面上的智能体状态文字并翻译
    function XiuZheng_ZhiNengTi_ZhuangTai() {
        if (!document.body) return;
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (node.nodeType === 1) {
                    var cls = node.classList;
                    if (cls && (cls.contains('monaco-editor') || cls.contains('view-lines') || cls.contains('ProseMirror') || cls.contains('tiptap') || cls.contains('inputarea') || cls.contains('ui-markdown'))) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (typeof node.className === 'string' && node.className.indexOf('ui-markdown') >= 0) return NodeFilter.FILTER_REJECT;
                    if (node.getAttribute && node.getAttribute('contenteditable') === 'true') return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_SKIP;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var node;
        var n = 0;
        while ((node = walker.nextNode())) {
            if (++n > 2500) break;
            var trimmed = (node.textContent || '').trim();
            if (!trimmed || trimmed.length > 80) continue;
            if (Shi_ZhiNengTi_ZhuangTai_WenBen(trimmed) ||
                FanYi_SiKao_ZhengJu(trimmed) ||
                FanYi_SiKao_BiaoQian(node, trimmed) ||
                FanYi_SiKao_ShiChang(node, trimmed)) {
                FanYi_ZhuangTai_WenBen_JieDian(node);
            }
        }
    }

    // 翻译斜杠命令提示，命令名本身保持英文
    function FanYi_XieGang_TiShi(node) {
        if (!node || node.nodeType !== 3 || !node.parentElement || !node.parentElement.parentElement) return null;
        var host = node.parentElement.parentElement;
        var kids = host.children;
        if (!kids || kids.length < 2) return null;
        var hasSlash = false;
        for (var i = 0; i < kids.length; i++) {
            var part = (kids[i].textContent || '').trim();
            if (/^\/[A-Za-z0-9][A-Za-z0-9_-]*$/.test(part)) { hasSlash = true; break; }
        }
        if (!hasSlash) return null;
        var trimmed = (node.textContent || '').trim();
        if (!trimmed || /^\/[A-Za-z0-9][A-Za-z0-9_-]*$/.test(trimmed)) return null;
        for (var u = 0; u < XieGang_TiShi_FanYi.length; u++) {
            if (trimmed === XieGang_TiShi_FanYi[u][0]) return XieGang_TiShi_FanYi[u][1];
        }
        return ChaZhao_FanYi(trimmed);
    }

    // 空状态轮换提示按整句翻译，避免 cloud 这类短词先把句子拆碎
    function Shi_KongZhuangTai_TiShi(node) {
        var el = node && node.nodeType === 3 ? node.parentElement : node;
        if (!el || !el.closest) return false;
        try {
            return !!el.closest('[data-component="glass-empty-state-rotating-tips"]');
        } catch (e) { return false; }
    }

    // 翻译单个文本节点：精确匹配优先于片段替换
    function FanYi_WenBen_JieDian(node) {
        if (Shi_Zai_DaiMa_Hang(node)) return;
        if (Shi_KongZhuangTai_TiShi(node)) return;
        try {
            if (node.parentElement && (
                Shi_HuiFu_ZhengWen(node.parentElement) ||
                Shi_WenJianShu_MingCheng(node.parentElement)
            )) return;
        } catch (e) {}
        var text = node.textContent;
        if (!text) return;
        var trimmed = text.trim();
        if (!trimmed) return;
        if (Shi_Yuan_DaiMa_WenBen(text) || Shi_Yuan_DaiMa_WenBen(trimmed)) {
            var exactCode = ChaZhao_FanYi(trimmed, true) || ChaZhao_FanYi(text, true);
            if (exactCode && exactCode !== trimmed) {
                var codePrefix = text.substring(0, text.indexOf(trimmed));
                var codeSuffix = text.substring(text.indexOf(trimmed) + trimmed.length);
                XieRu_WenBen_JieDian(node, codePrefix + exactCode + codeSuffix);
            }
            return;
        }
        var pingFenWen = /(?:Most Recent Commit Scored|AI-Generated:|Total Changes:)/i.test(trimmed);
        if (trimmed.length > (pingFenWen ? 800 : 500)) return;
        if (/^[\d\s.,;:!?@#$%^&*()\-+=<>\\/|~`'"[\]{}]+$/.test(trimmed)) return;
        try {
            if (node.parentElement && Shi_CaiDan_QuYu(node.parentElement) && !Shi_CaiDan_WenBen_JieDian(node)) return;
        } catch (e) {}
        if (trimmed === 'Stop') {
            try {
                var comboStop = node.parentElement && node.parentElement.closest(
                    '[role="combobox"], .monaco-select-box, [class*="select-box"]'
                );
                if (comboStop && /send\s+right\s+away/i.test(comboStop.textContent || '')) return;
            } catch (e) {}
        }

        if (Shi_QuickInput_QuYu(node.parentElement)) {
            if (YiFanYi_ZhuTi_Ming(trimmed)) return;
            var qiTr = ChaZhao_FanYi(trimmed);
            if (qiTr && qiTr !== trimmed) {
                var qiPrefix = text.substring(0, text.indexOf(trimmed));
                var qiSuffix = text.substring(text.indexOf(trimmed) + trimmed.length);
                XieRu_WenBen_JieDian(node, qiPrefix + qiTr + qiSuffix);
            }
            return;
        }

        var slashTip = FanYi_XieGang_TiShi(node);
        var result = FanYi_SiKao_ZhengJu(trimmed) || FanYi_SiKao_BiaoQian(node, trimmed) || FanYi_SiKao_ShiChang(node, trimmed);
        if (!result) result = slashTip || ChaZhao_FanYi(text);
        if (!result) result = FanYi_TiJiao_PingFen_WenBen(text) || FanYi_TiJiao_PingFen_WenBen(trimmed);
        if (result) {
            var prefix = text.substring(0, text.indexOf(trimmed));
            var suffix = text.substring(text.indexOf(trimmed) + trimmed.length);
            XieRu_WenBen_JieDian(node, prefix + result + suffix);
            return;
        }

        if (FanYi_XieGang_TiShi(node) === null && node.parentElement && node.parentElement.parentElement) {
            var xieGangHost = node.parentElement.parentElement.children;
            if (xieGangHost && xieGangHost.length >= 2) {
                for (var xi = 0; xi < xieGangHost.length; xi++) {
                    if (/^\/[A-Za-z0-9][A-Za-z0-9_-]*$/.test((xieGangHost[xi].textContent || '').trim())) return;
                }
            }
        }

        var partial = TiHuan_BuFen_WenBen(text);
        if (partial) XieRu_WenBen_JieDian(node, partial);
    }

    // 翻译 title、aria-label 等提示类字符串
    function FanYi_TiShi_WenBen(val) {
        if (!val) return null;
        var direct = ChaZhao_FanYi(val);
        if (direct) return direct;
        var normalized = GuiYiHua_WenBen(val);
        if (normalized !== val) {
            direct = ChaZhao_FanYi(normalized);
            if (direct) return direct;
        }
        if (/New Agent|Replace Agent/i.test(val)) {
            var agentNeo = val;
            for (var ai = 0; ai < Agent_TiShi_WenBen.length; ai++) {
                agentNeo = agentNeo.split(Agent_TiShi_WenBen[ai][0]).join(Agent_TiShi_WenBen[ai][1]);
            }
            if (agentNeo !== val) return agentNeo;
        }
        var pingFen = FanYi_TiJiao_PingFen_WenBen(val) || FanYi_TiJiao_PingFen_WenBen(normalized);
        if (pingFen) return pingFen;
        return TiHuan_BuFen_WenBen(val);
    }

    // 翻译元素上的提示、占位和替代文本属性
    function FanYi_ShuXing(el) {
        if (!el || !el.getAttribute) return;
        try { if (Shi_WenJianShu_MingCheng(el)) return; } catch (e) {}
        var attrs = ['title', 'aria-label', 'alt', 'placeholder', 'aria-placeholder', 'data-tooltip', 'data-title'];
        for (var i = 0; i < attrs.length; i++) {
            var val = el.getAttribute(attrs[i]);
            if (!val) continue;
            var result = FanYi_TiShi_WenBen(val);
            if (result && result !== val) el.setAttribute(attrs[i], result);
        }
    }

    // 翻译 Cursor 悬浮卡片中的可见文字
    function FanYi_Cursor_Hover_Widget(root) {
        if (!root) return;
        var list = [];
        try {
            if (root.nodeType === 1 && Shi_XuanFu_TiShi_JieDian(root)) list.push(root);
            if (root.querySelectorAll) {
                var found = root.querySelectorAll('.cursorHoverWidget, [class*="cursor-hover"], [class*="cursorHover"], [class*="CursorHover"]');
                for (var f = 0; f < found.length; f++) list.push(found[f]);
            }
        } catch (e) { return; }
        var seen = new Set();
        for (var h = 0; h < list.length; h++) {
            var ht = list[h];
            if (!ht || seen.has(ht)) continue;
            seen.add(ht);
            if (ht.closest && ht.closest('.monaco-editor .view-lines')) continue;
            FanYi_ShuXing(ht);
            try {
                var walker = document.createTreeWalker(ht, NodeFilter.SHOW_TEXT, null);
                var tnode;
                while ((tnode = walker.nextNode())) {
                    var text = tnode.textContent;
                    if (!text || Shi_BianJiQi_QuYu(tnode) || Shi_Yuan_DaiMa_WenBen(text)) continue;
                    var trimmed = text.trim();
                    if (!trimmed || trimmed.length > 800) continue;
                    var tr = ChaZhao_FanYi(trimmed) || FanYi_TiJiao_PingFen_WenBen(text) || FanYi_TiJiao_PingFen_WenBen(trimmed);
                    if (!tr) {
                        for (var j = 0; j < Agent_TiShi_WenBen.length; j++) {
                            if (trimmed === Agent_TiShi_WenBen[j][0]) {
                                tr = Agent_TiShi_WenBen[j][1];
                                break;
                            }
                        }
                    }
                    if (tr && tr !== text) {
                        var idx = text.indexOf(trimmed);
                        if (idx < 0) XieRu_WenBen_JieDian(tnode, tr);
                        else XieRu_WenBen_JieDian(tnode, text.substring(0, idx) + tr + text.substring(idx + trimmed.length));
                    }
                }
            } catch (e) {}
            var leaves = ht.querySelectorAll ? ht.querySelectorAll('div, span, p, label') : [];
            for (var n = 0; n < leaves.length; n++) {
                var leaf = leaves[n];
                if (!leaf || (leaf.querySelector && leaf.querySelector('div, span, p, label'))) continue;
                var raw = (leaf.textContent || '').trim();
                if (!raw || raw.length > 800) continue;
                var plain = GuiYiHua_WenBen(raw);
                var ltr = ChaZhao_FanYi(plain) || FanYi_TiJiao_PingFen_WenBen(raw) || FanYi_TiJiao_PingFen_WenBen(plain);
                if (!ltr) {
                    for (var k = 0; k < Agent_TiShi_WenBen.length; k++) {
                        if (plain === Agent_TiShi_WenBen[k][0]) { ltr = Agent_TiShi_WenBen[k][1]; break; }
                    }
                }
                if (ltr && ltr !== raw) KeYi_AnQuan_GaiXie_WenBen(leaf, ltr, [raw.slice(0, 10)]);
            }
        }
    }

  // 所有悬停 / tooltip 统一选择器（Monaco、Cursor 自定义、原生 title 浮层等）
    var XuanFu_TiShi_XuanZeQi = '.monaco-hover, .monaco-hover-content, [role="tooltip"], .cursorHoverWidget, ' +
        '[class*="cursor-hover"], [class*="cursorHover"], [class*="CursorHover"], ' +
        '.monaco-tooltip, [class*="hover-widget"], [class*="HoverWidget"], [class*="tooltip-content"]';

    // 智能体按钮和悬停里出现的固定文案
    var Agent_TiShi_WenBen = [
        ['New Agent (Ctrl+N)', '新建智能体 (Ctrl+N)'],
        ['New Agent(Ctrl+N)', '新建智能体 (Ctrl+N)'],
        ['[Alt] Replace Agent', '[Alt] 替换智能体'],
        ['[Alt]Replace Agent', '[Alt] 替换智能体'],
        ['Alt Replace Agent', 'Alt 替换智能体'],
        ['Replace Agent', '替换智能体']
    ];

    // 判断元素是否是悬浮提示或 Monaco hover
    function Shi_XuanFu_TiShi_JieDian(el) {
        if (!el || el.nodeType !== 1) return false;
        try {
            if (el.matches && el.matches(XuanFu_TiShi_XuanZeQi)) return true;
            if (el.classList) {
                var cls = el.className && typeof el.className === 'string' ? el.className : '';
                if (/monaco-hover|cursorHoverWidget|hover-widget|HoverWidget|tooltip-content/i.test(cls)) return true;
            }
            if (el.getAttribute && el.getAttribute('role') === 'tooltip') return true;
        } catch (e) {}
        return false;
    }

    // 向上几层翻译悬浮提示相关元素的属性
    function FanYi_TiShi_LaiYuan(el) {
        if (!el) return;
        var cur = el;
        for (var depth = 0; depth < 4 && cur; depth++) {
            FanYi_ShuXing(cur);
            cur = cur.parentElement;
        }
    }

    // 翻译 Monaco 悬浮提示里的内容
    function FanYi_Monaco_Hover_Content(root) {
        if (!root) return;
        var list = [];
        try {
            if (root.nodeType === 1 && Shi_XuanFu_TiShi_JieDian(root)) list.push(root);
            if (root.querySelectorAll) {
                var found = root.querySelectorAll(XuanFu_TiShi_XuanZeQi);
                for (var f = 0; f < found.length; f++) list.push(found[f]);
            }
        } catch (e) { return; }
        var seen = new Set();
        for (var h = 0; h < list.length; h++) {
            var ht = list[h];
            if (!ht || seen.has(ht)) continue;
            seen.add(ht);
            if (ht.closest && ht.closest('.monaco-editor .view-lines')) continue;
            FanYi_ShuXing(ht);
            try {
                var walker = document.createTreeWalker(ht, NodeFilter.SHOW_TEXT, null);
                var tnode;
                while ((tnode = walker.nextNode())) {
                    var text = tnode.textContent;
                    if (!text || Shi_BianJiQi_QuYu(tnode) || Shi_Yuan_DaiMa_WenBen(text)) continue;
                    var trimmed = GuiYiHua_WenBen(text);
                    if (!trimmed || trimmed.length > 800) continue;
                    var tr = FanYi_TiShi_WenBen(text) || FanYi_TiShi_WenBen(trimmed);
                    if (tr && tr !== text) {
                        var idx = text.indexOf(trimmed);
                        if (idx < 0) XieRu_WenBen_JieDian(tnode, tr);
                        else {
                            XieRu_WenBen_JieDian(tnode, text.substring(0, idx) + tr + text.substring(idx + trimmed.length));
                        }
                    }
                }
            } catch (e) {}
            var leaves = ht.querySelectorAll ? ht.querySelectorAll('span, div, p, label, a, button') : [];
            for (var n = 0; n < leaves.length; n++) {
                var leaf = leaves[n];
                if (!leaf || leaf.closest('.monaco-editor .view-lines')) continue;
                if (leaf.querySelector && leaf.querySelector('span, div, p, label')) continue;
                FanYi_ShuXing(leaf);
                var raw = leaf.textContent || '';
                if (!raw || raw.length > 800) continue;
                var plain = GuiYiHua_WenBen(raw);
                var ltr = FanYi_TiShi_WenBen(raw) || FanYi_TiShi_WenBen(plain);
                if (ltr && ltr !== raw) KeYi_AnQuan_GaiXie_WenBen(leaf, ltr, [plain.slice(0, 12)]);
            }
        }
    }

    // 安装悬浮提示的延迟翻译和帧跟踪
    function AnZhuang_Monaco_Hover_FanYi() {
        if (window.__cursorMonacoHoverI18n) return;
        window.__cursorMonacoHoverI18n = true;
        var hoverTimer = null;
        var hoverRafId = 0;
        // 稍后再翻译当前仍显示的悬浮提示
        function PaiDui_Hover(scope) {
            if (hoverTimer) clearTimeout(hoverTimer);
            hoverTimer = setTimeout(function() {
                hoverTimer = null;
                var target = scope;
                if (!target) {
                    try { target = document.querySelector(XuanFu_TiShi_XuanZeQi); } catch (e) {}
                }
                if (target) {
                    try { FanYi_Monaco_Hover_Content(target); } catch (e) {}
                    try { FanYi_Cursor_Hover_Widget(target); } catch (e) {}
                }
            }, 32);
        }
        // 用动画帧跟踪刚出现的悬浮提示
        function KaiShi_Hover_ZhuiZong(seed) {
            if (hoverRafId) return;
            var frames = 0;
            // 连续几帧重译仍在显示的悬浮提示
            function tick() {
                var active = seed || null;
                if (!active) {
                    try { active = document.querySelector(XuanFu_TiShi_XuanZeQi); } catch (e) {}
                }
                if (!active || frames >= 8) {
                    hoverRafId = 0;
                    return;
                }
                try { FanYi_Monaco_Hover_Content(active); } catch (e) {}
                try { FanYi_Cursor_Hover_Widget(active); } catch (e) {}
                frames++;
                seed = null;
                hoverRafId = requestAnimationFrame(tick);
            }
            hoverRafId = requestAnimationFrame(tick);
        }
        // 处理可能属于悬浮提示的 DOM 变化
        function ChuLi_Hover_BianHua(node) {
            if (!node) return;
            if (node.nodeType === 1) {
                if (Shi_XuanFu_TiShi_JieDian(node)) {
                    try { FanYi_Monaco_Hover_Content(node); } catch (e) {}
                    KaiShi_Hover_ZhuiZong();
                    return;
                }
                if (node.querySelector && node.querySelector(XuanFu_TiShi_XuanZeQi)) {
                    PaiDui_Hover();
                    KaiShi_Hover_ZhuiZong();
                }
            } else if (node.nodeType === 3 && node.parentElement) {
                var p = node.parentElement;
                if (p.closest && p.closest(XuanFu_TiShi_XuanZeQi.split(',')[0])) {
                    try { FanYi_Monaco_Hover_Content(p.closest('.monaco-hover, .cursorHoverWidget, [role="tooltip"]') || document.body); } catch (e) {}
                }
            }
        }
        try {
            var hoverObs = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (Shi_ShuRu_Huo_DaiMa_BianYi(m.target)) continue;
                    if (m.type === 'childList') {
                        var added = m.addedNodes;
                        for (var j = 0; j < added.length; j++) ChuLi_Hover_BianHua(added[j]);
                    } else if (m.type === 'characterData' && m.target) {
                        ChuLi_Hover_BianHua(m.target);
                    }
                }
            });
            hoverObs.observe(document.body, { childList: true, subtree: true, characterData: true });
        } catch (e) {}
        document.addEventListener('mouseover', function(ev) {
            var target = ev.target;
            if (!target || !target.closest) return;
            if (Shi_YongHu_ShuRu_QuYu(target) || Shi_ShuRu_Huo_DaiMa_BianYi(target)) return;
            var hoverEl = target.closest(XuanFu_TiShi_XuanZeQi.split(',')[0]);
            if (hoverEl) {
                PaiDui_Hover(hoverEl);
                KaiShi_Hover_ZhuiZong(hoverEl);
                return;
            }
            var actionBtn = target.closest(
                '.tabs-and-actions-container .action-item, .title-actions .action-item, ' +
                '.editor-actions .action-item, [class*="agent"] .action-item, [class*="composer"] .action-item'
            );
            if (actionBtn) {
                FanYi_TiShi_LaiYuan(actionBtn);
                var actionLabel = actionBtn.querySelector('.action-label, a, button');
                if (actionLabel) FanYi_TiShi_LaiYuan(actionLabel);
                PaiDui_Hover();
                KaiShi_Hover_ZhuiZong();
            }
            var src = target.closest('[title], [aria-label], [data-tooltip], [data-title]');
            if (src) FanYi_TiShi_LaiYuan(src);
        }, true);
        document.addEventListener('focusin', function(ev) {
            var src = ev.target && ev.target.closest && ev.target.closest('[title], [aria-label], [data-tooltip], [data-title]');
            if (src) FanYi_TiShi_LaiYuan(src);
        }, true);
    }

    // 判断元素是否位于用户输入区，输入区不翻译
    function Shi_YongHu_ShuRu_QuYu(el) {
        if (!el || !el.closest) return false;
        try {
            if (el.closest('textarea, input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"])')) return true;
            if (el.closest('[contenteditable]:not([contenteditable="false"])')) return true;
            if (el.closest('.ProseMirror, .tiptap')) return true;
        } catch (e) {}
        return false;
    }

    // 输入框选字和代码行刷新会产生大量 DOM 变化，这些变化不触发翻译
    function Shi_ShuRu_Huo_DaiMa_BianYi(node) {
        if (!node) return false;
        var el = node.nodeType === 1 ? node : node.parentElement;
        if (!el || el.nodeType !== 1) return false;
        if (Shi_YongHu_ShuRu_QuYu(el)) return true;
        try {
            if (el.closest(
                '.monaco-editor .view-lines, .monaco-editor .view-line, .view-overlays, ' +
                '.margin-view-overlays, .inputarea, .monaco-mouse-cursor-text, ' +
                '.ProseMirror, .tiptap, .ui-prompt-input-editor, ' +
                '[class*="ui-default-diff"], [class*="ui-default-code"], ' +
                '[data-component="embedded-file-viewer"], [data-streamdown="code-block-body"]'
            )) return true;
        } catch (e) {}
        return false;
    }

    // 判断元素是否位于模型回复正文。工具状态行不在这段里
    function Shi_HuiFu_ZhengWen(el) {
        if (!el || !el.closest) return false;
        try {
            return !!(el.closest('.ui-markdown, [class*="ui-markdown"]'));
        } catch (e) { return false; }
    }

    // 判断元素是否是文件树/资源列表里的文件名或文件夹名。行内按钮仍可翻译
    function Shi_WenJianShu_MingCheng(el) {
        if (!el || !el.closest) return false;
        try {
            if (el.closest(
                'button, [role="button"], [role="menuitem"], ' +
                '.monaco-action-bar, .actions, .action-item, .codicon'
            )) return false;
            return !!(el.closest(
                '[data-file-tree-entry], [data-file-tree-row], [data-tree-directory], ' +
                '.monaco-icon-name-container, .explorer-item, ' +
                '.monaco-breadcrumbs-item, ' +
                '.tabs-container .tab .label-name, .tabs-container .monaco-icon-label'
            ));
        } catch (e) { return false; }
    }

    // 判断元素是否位于对话输入条
    function Shi_PromptBar_QuYu(el) {
        if (!el) return false;
        try {
            return !!(el.closest(
                '.prompt-bar-container, .pure-ai-prompt-bar, .inline-prompt-button-area, ' +
                '.ui-prompt-input, [class*="ui-prompt-input"], [class*="prompt-bar"], [class*="pure-ai-prompt"], ' +
                '.contentWidgets, .overlayWidgets'
            ));
        } catch (e) { return false; }
    }

    // 判断元素是否位于快速输入框
    function Shi_QuickInput_QuYu(el) {
        if (!el) return false;
        try {
            return !!(el.closest('.quick-input-widget, .monaco-quick-input, [class*="quick-input-widget"]'));
        } catch (e) { return false; }
    }

    // 判断主题名是否已经是中英混合译文
    function YiFanYi_ZhuTi_Ming(text) {
        if (!text) return false;
        return /[\u4e00-\u9fff]/.test(text) && /[A-Za-z]{2,}/.test(text);
    }

    // 收集对话输入条的根节点
    function HuoQu_PromptBar_Gen_JieDian() {
        return document.querySelectorAll(
            '.pure-ai-prompt-bar, .prompt-bar-container, .inline-prompt-button-area, ' +
            '.ui-prompt-input, [class*="ui-prompt-input"], [class*="prompt-bar"]'
        );
    }

    // 判断元素是否位于可翻译的时间线视图
    function Shi_ShiJianXian_KeFanYi(el) {
        if (!el) return false;
        try {
            if (el.closest('.timeline-tree-view, .timeline-view, [id="workbench.view.timeline"]')) return true;
            var header = el.closest('.pane-header, .composite.title, .pane-composite-part .title');
            if (header) {
                var ht = header.textContent || '';
                if (/时间线|Timeline/i.test(ht)) return true;
            }
        } catch (e) {}
        return false;
    }

    // 判断节点是否位于代码行、语法着色或差异行。编辑器外壳上的按钮不在此列
    function Shi_Zai_DaiMa_Hang(node) {
        var el = node && node.nodeType === 3 ? node.parentElement : node;
        var hops = 0;
        while (el && hops < 60) {
            hops++;
            if (el.nodeType === 1) {
                var tag = el.tagName;
                if (tag === 'PRE' || tag === 'CODE' || tag === 'TEXTAREA') return true;
                var cls = '';
                try { cls = typeof el.className === 'string' ? el.className : ''; } catch (e) {}
                if (cls && (
                    cls.indexOf('view-line') !== -1 ||
                    cls.indexOf('code-highlight') !== -1 ||
                    cls.indexOf('diff-line') !== -1 ||
                    cls.indexOf('inline-diff-content') !== -1 ||
                    cls.indexOf('tokenized-source') !== -1 ||
                    cls.indexOf('cm-editor') !== -1 ||
                    cls.indexOf('cm-content') !== -1 ||
                    cls.indexOf('cm-line') !== -1 ||
                    cls.indexOf('ui-code-block') !== -1 ||
                    cls.indexOf('inputarea') !== -1 ||
                    cls.indexOf('sticky-widget') !== -1 ||
                    cls.indexOf('code-line') !== -1 ||
                    cls.indexOf('code-view') !== -1 ||
                    cls.indexOf('code-content') !== -1 ||
                    cls.indexOf('composer-message-codeblock') !== -1 ||
                    cls.indexOf('simple-code-render') !== -1 ||
                    cls.indexOf('ui-default-diff') !== -1 ||
                    cls.indexOf('ui-default-code') !== -1 ||
                    cls.indexOf('embedded-file-viewer') !== -1 ||
                    /(?:^|\s)mtk\d*(?:\s|$)/.test(cls)
                )) return true;
                try {
                    if (el.getAttribute && (
                        el.getAttribute('data-component') === 'embedded-file-viewer' ||
                        el.getAttribute('data-streamdown') === 'code-block-body'
                    )) return true;
                } catch (e2) {}
            }
            if (el.parentElement) {
                el = el.parentElement;
                continue;
            }
            var root = el.getRootNode ? el.getRootNode() : null;
            if (root && root.host && root.host !== el) {
                el = root.host;
                continue;
            }
            break;
        }
        return false;
    }

    // 写文本节点。代码行和回复正文直接拒绝，避免界面词替换进去
    function XieRu_WenBen_JieDian(node, text) {
        if (!node || node.nodeType !== 3 || text == null) return false;
        if (Shi_Zai_DaiMa_Hang(node)) return false;
        try {
            if (node.parentElement && (
                Shi_HuiFu_ZhengWen(node.parentElement) ||
                Shi_WenJianShu_MingCheng(node.parentElement)
            )) return false;
        } catch (e) {}
        if (node.nodeValue !== text) node.nodeValue = text;
        return true;
    }

    // 判断节点是否应跳过。代码区优先于输入条和时间线
    function Shi_BianJiQi_QuYu(node) {
        var el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (!el) return true;
        if (TiaoGuo_BiaoQian.has(el.tagName)) return true;
        if (Shi_YongHu_ShuRu_QuYu(el)) return true;
        if (Shi_Zai_DaiMa_Hang(node)) return true;
        if (Shi_YuFa_BiaoJi(el)) return true;
        try { if (el.closest(TiaoGuo_XuanZeQi)) return true; } catch (e) {}
        if (Shi_PromptBar_QuYu(el)) return false;
        if (Shi_ShiJianXian_KeFanYi(el)) return false;
        return false;
    }

    // 判断元素是否应跳过。代码区优先于输入条和时间线
    function YingGai_TiaoGuo_BianJiQi_YuanSu(el) {
        if (!el || el.nodeType !== 1) return true;
        if (Shi_YongHu_ShuRu_QuYu(el)) return true;
        if (Shi_Zai_DaiMa_Hang(el)) return true;
        if (Shi_YuFa_BiaoJi(el)) return true;
        try { if (el.closest(TiaoGuo_XuanZeQi)) return true; } catch (e) {}
        if (Shi_PromptBar_QuYu(el)) return false;
        if (Shi_ShiJianXian_KeFanYi(el)) return false;
        return false;
    }

    // 查找 Cursor 设置页的根节点
    function HuoQu_SheZhi_Gen_JieDian() {
        try {
            return document.querySelector('[class*="cursor-settings"]');
        } catch (e) {
            return null;
        }
    }

    // 斜杠命令提示里需要单独翻译的词，命令名保持英文
    var XieGang_TiShi_FanYi = [
        ['Use', '使用']
    ];

    // 选区工具条标签。代码区默认跳过，这些原文仍要翻译
    var XuanQu_GongJu_BiaoQian = [
        'Add to Chat',
        'Add to Side Chat',
        'Quick Edit',
        'Find All Implementations',
        'Get Cursor for iOS',
        'Get Grok Bot',
        'Shortcuts'
    ];
    var XuanQu_GongJu_ZiShu_ZhengZe = new RegExp(XuanQu_GongJu_BiaoQian.join('|'));

    // 判断文本是否是选区工具条上的已知标签
    function Shi_XuanQu_GongJu_WenBen(node) {
        if (!node || !node.parentElement) return false;
        try {
            if (node.parentElement.closest(
                '.view-lines, .inputarea, textarea, [contenteditable="true"], ' +
                '.code-content, .code-line, .code-view, pre, code, .cm-content, .ui-code-block, ' +
                '.composer-message-codeblock'
            )) return false;
            if (!node.parentElement.closest('.cursorHoverWidget, .hoverButton')) return false;
        } catch (e) { return false; }
        var text = (node.textContent || '').trim();
        for (var i = 0; i < XuanQu_GongJu_BiaoQian.length; i++) {
            if (text === XuanQu_GongJu_BiaoQian[i]) return true;
        }
        return false;
    }

    // 只翻译被跳过子树里的已知选区工具标签
    function FanYi_ZiShu_Jin_BiaoQian(root) {
        if (!root) return;
        var stack = [root];
        while (stack.length > 0) {
            var node = stack.pop();
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.classList && (node.classList.contains('view-lines') || node.classList.contains('inputarea'))) continue;
                FanYi_ShuXing(node);
                var children = node.childNodes;
                for (var i = children.length - 1; i >= 0; i--) stack.push(children[i]);
            } else if (node.nodeType === Node.TEXT_NODE && Shi_XuanQu_GongJu_WenBen(node)) {
                FanYi_WenBen_JieDian(node);
            }
        }
    }

    // 遍历子树翻译文本和属性，代码区只处理已知标签
    function FanYi_ZiShu(root) {
        var stack = [root];
        while (stack.length > 0) {
            var node = stack.pop();
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (TiaoGuo_BiaoQian.has(node.tagName)) continue;
                if (YingGai_TiaoGuo_FanYi_ZiShu_YuanSu(node)) {
                    var zaiXuanQuTiao = false;
                    try { zaiXuanQuTiao = !!(node.closest && node.closest('.cursorHoverWidget, .hoverButton')); } catch (e) {}
                    if (zaiXuanQuTiao &&
                        !(node.classList && (node.classList.contains('monaco-editor') || node.classList.contains('view-lines') || node.classList.contains('inputarea'))) &&
                        node.childNodes && node.childNodes.length <= 8) {
                        var sample = '';
                        for (var s = 0; s < node.childNodes.length && sample.length < 180; s++) {
                            var child = node.childNodes[s];
                            if (child.nodeType === 3) sample += child.data || '';
                            else if (child.nodeType === 1 && child.childNodes && child.childNodes.length <= 4) {
                                var piece = child.textContent || '';
                                if (piece.length < 80) sample += piece;
                            }
                        }
                        if (sample && XuanQu_GongJu_ZiShu_ZhengZe.test(sample)) FanYi_ZiShu_Jin_BiaoQian(node);
                    }
                    continue;
                }
                if (node.classList && (node.classList.contains('overflow-guard') || node.classList.contains('view-lines') || node.classList.contains('editor-scrollable'))) continue;
                var editableAttr = node.getAttribute('contenteditable');
                if (editableAttr !== null && editableAttr !== 'false') {
                    FanYi_ShuXing(node);
                    continue;
                }
                FanYi_ShuXing(node);
                var children = node.childNodes;
                for (var i = children.length - 1; i >= 0; i--) { stack.push(children[i]); }
            } else if (node.nodeType === Node.TEXT_NODE) {
                if (!Shi_BianJiQi_QuYu(node) || Shi_XuanQu_GongJu_WenBen(node)) { FanYi_WenBen_JieDian(node); }
            }
        }
    }

    var DaiChuLi_JieDian = []; // 本帧待遍历的新增节点
    var YiDiaoDu = false; // 是否已排队到下一帧再翻译
    var ZhengZaiPiLiangFanYi = false; // 正在批量翻译，避免观察器重入
    var QuanJuXiuZheng_YiPaiDui = false; // 全局修正已排入定时器
    var ShangCiQuanJuXiuZheng = 0; // 上次执行全局修正的时间戳
    var QuanJuXiuZheng_LeiJi = 0; // 尚未执行的修正位掩码
    var QuanJuXiuZheng_RenWuQiZhi = 0; // 定时器等待期间又合并进来的修正位

    // 全局修正位。按界面区域按位或，决定本轮要跑哪些修正
    var QX_QUAN_BU = 0xffffffff; // 全部区域
    var QX_SUO_YIN = 1; // 索引说明
    var QX_DAI_MA_KU = 2; // 代码库说明
    var QX_MO_XING_YE = 4; // 模型选择页
    var QX_SHE_ZHI = 8; // 设置页
    var QX_COMPOSER = 16; // 对话输入区
    var QX_LIU_LAN_QI = 32; // 内置浏览器
    var QX_BIAN_JI_QI = 64; // 编辑器菜单与选择
    var QX_CAI_DAN = 128; // 聊天历史菜单
    var QX_TONG_ZHI = 256; // 通知与推广弹窗
    var QX_DUI_HUA = 512; // 通用对话框
    var QX_SHI_CHANG = 1024; // 插件市场
    var QX_SHI_JIAN_XIAN = 2048; // 时间线
    var QX_SHE_JI = 4096; // 设计面板
    var QX_HUAN_YING = 8192; // 欢迎页
    var QX_XIA_LA = 16384; // 设置下拉框
    var QX_HOVER = 32768; // 悬停提示

    // 把本轮需要运行的全局修正位合并进累积掩码
    function HeBing_QuanJuXiuZhengQi(qiZhi) {
        if (qiZhi) QuanJuXiuZheng_LeiJi |= qiZhi;
    }

    // 判断节点是否位于扩展或插件市场
    function JieDian_You_ShiChang(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        try {
            return !!(node.closest && node.closest(
                '[class*="extension"], [class*="marketplace"], [class*="plugin"], ' +
                '.extension-list-item, .monaco-pane-view [aria-label*="Extension"], ' +
                '[aria-label*="扩展"], [aria-label*="Plugins"]'
            ));
        } catch (e) { return false; }
    }

    // 判断节点是否位于内置浏览器界面
    function JieDian_You_LiuLanQi(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            for (var i = 0; i < node.classList.length; i++) {
                var cls = node.classList[i];
                if (!cls) continue;
                if (cls.indexOf('browser-') >= 0 || cls.indexOf('simple-browser') >= 0) return true;
            }
        }
        try {
            return !!(node.closest && node.closest(
                '.browser-tools, .browser-navbar, .browser-tab, [class*="browser-tab"], ' +
                '[class*="browser-navbar"], [class*="browser-tools"], [class*="simple-browser"]'
            ));
        } catch (e) { return false; }
    }

    // 判断节点是否位于时间线视图
    function JieDian_You_ShiJianXian(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        try {
            return !!(node.closest && node.closest(
                '.timeline-tree-view, .timeline-view, [id="workbench.view.timeline"]'
            ));
        } catch (e) { return false; }
    }

    // 根据节点位置推断应触发哪些全局修正
    function TuiDuan_JieDian_QiZhi(node) {
        if (!node) return 0;
        var el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!el) return 0;
        var mask = 0;
        try {
            if (JieDian_You_Cursor_SheZhi(el)) mask |= QX_SHE_ZHI | QX_XIA_LA;
            if (JieDian_You_PromptBar(el)) mask |= QX_COMPOSER;
            if (JieDian_You_TiJi_CaiDan(el)) mask |= QX_COMPOSER;
            if (JieDian_You_Context_Menu(el)) mask |= QX_CAI_DAN | QX_BIAN_JI_QI;
            if (JieDian_You_XuanZe_GongJu(el)) mask |= QX_BIAN_JI_QI;
            if (JieDian_You_Css_Inspector(el)) mask |= QX_SHE_JI;
            if (JieDian_You_TongZhi_TanChuang(el)) mask |= QX_TONG_ZHI;
            if (JieDian_You_UI_DuiHua(el)) mask |= QX_DUI_HUA;
            if (JieDian_You_ShiChang(el)) mask |= QX_SHI_CHANG;
            if (JieDian_You_LiuLanQi(el)) mask |= QX_LIU_LAN_QI;
            if (JieDian_You_ShiJianXian(el)) mask |= QX_SHI_JIAN_XIAN;
            if (JieDian_You_Monaco_Hover(el)) mask |= QX_HOVER | QX_XIA_LA;
            if (el.closest && el.closest('.statusbar, .part.statusbar, .statusbar-item, [id="workbench.parts.statusbar"]')) {
                mask |= QX_HOVER;
            }
            if (el.closest && el.closest('[class*="composer"], [class*="aichat"], [class*="agent-changes"], [class*="chat-input"]')) {
                mask |= QX_COMPOSER;
            }
            if (el.closest && el.closest('.quick-input-widget, .monaco-quick-input')) mask |= QX_MO_XING_YE | QX_XIA_LA;
            if (el.closest && el.closest('[class*="index"], [class*="Index"], .pane-composite-part')) {
                mask |= QX_SUO_YIN | QX_DAI_MA_KU;
            }
        } catch (e) {}
        return mask;
    }

    // 汇总一批节点对应的全局修正位
    function ShouJi_PiLiang_QiZhi(nodes) {
        var mask = QuanJuXiuZheng_LeiJi;
        QuanJuXiuZheng_LeiJi = 0;
        for (var i = 0; i < nodes.length; i++) {
            mask |= TuiDuan_JieDian_QiZhi(nodes[i]);
        }
        return mask;
    }

    // 按掩码执行设置、菜单、浏览器等全局修正
    function ZhiXing_QuanJuXiuZheng_RenWu(qiZhi) {
        var run = function(bit, fn) {
            if (qiZhi & bit) try { fn(); } catch (e) {}
        };
        run(QX_SUO_YIN, XiuZheng_SuoYin_ShuoMing);
        run(QX_DAI_MA_KU, XiuZheng_DaiMaKu_ShuoMing);
        run(QX_MO_XING_YE, XiuZheng_MoXing_Ye);
        run(QX_SHE_ZHI, function() {
            XiuZheng_Cursor_SheZhi();
            XiuZheng_SheZhi_SuiPian();
            XiuZheng_ZhangHu_JiHua();
            XiuZheng_YinCang_DuiHua_SheZhi();
        });
        run(QX_LIU_LAN_QI, function() {
            YanChi_FanYi_LiuLanQi_GongJuTiao();
            XiuZheng_LiuLanQi_CaiDan();
            XiuZheng_LiuLanQi_CuoWu();
        });
        run(QX_COMPOSER, function() {
            XiuZheng_Composer_Placeholder();
            XiuZheng_Composer_GongJuTiao();
            XiuZheng_Editor_BiaoTi_TiShi();
            XiuZheng_KuaiSuBianJi_CmdK();
            XiuZheng_DuiHua_JieMian();
            XiuZheng_Agent_GengGai();
            XiuZheng_ZhiNengTi_FanKui();
            XiuZheng_ZhuTi_XuanZe();
            XiuZheng_DuiLie_XiaoXi();
            XiuZheng_TiJi_CaiDan();
            XiuZheng_MoXing_XuanZeQi();
            XiuZheng_ZhiNengTi_MoShi();
        });
        run(QX_BIAN_JI_QI, function() {
            XiuZheng_BianJiQi_XuanZe();
            XiuZheng_BianJiQi_YouJianCaiDan();
        });
        run(QX_CAI_DAN, XiuZheng_LiaoTian_LiShi);
        run(QX_TONG_ZHI, function() {
            XiuZheng_Upgrade_TiShi();
            XiuZheng_GongNeng_TuiGuang();
            XiuZheng_GuangGao_TanChuang();
        });
        run(QX_DUI_HUA, XiuZheng_UI_DuiHua);
        run(QX_SHI_CHANG, XiuZheng_ShiChang_FanYi);
        run(QX_SHI_JIAN_XIAN, XiuZheng_ShiJianXian);
        run(QX_SHE_JI, function() {
            XiuZheng_YinYing_MoHu();
            XiuZheng_SheJi_MianBan();
        });
        run(QX_HUAN_YING, XiuZheng_HuanYing_KuoZhan);
        run(QX_XIA_LA, function() {
            XiuZheng_SheZhi_XiaLaKuang();
            XiuZheng_XiaLaKuang_MianBan();
        });
        run(QX_HOVER, function() {
            FanYi_Monaco_Hover_Content(document.body);
            FanYi_Cursor_Hover_Widget(document.body);
            XiuZheng_TiJiao_PingFen();
        });
        try { XiuZheng_YinCang_DuiHua_SheZhi(); } catch (e) {}
        try { XiuZheng_TiJiao_PingFen(); } catch (e) {}
    }

    // 把节点加入待翻译队列，并在下一帧批量处理
    function TianJia_DaiChuLi(node) {
        DaiChuLi_JieDian.push(node);
        if (!YiDiaoDu) {
            YiDiaoDu = true;
            requestAnimationFrame(ZhiXing_PiLiang_FanYi);
        }
    }

    // 排队执行全局修正，短时间内合并多次请求
    function PaiDui_QuanJuXiuZheng(qiZhi) {
        if (qiZhi === true) {
            HeBing_QuanJuXiuZhengQi(QX_QUAN_BU);
        } else if (typeof qiZhi === 'number' && qiZhi) {
            HeBing_QuanJuXiuZhengQi(qiZhi);
        }
        if (!QuanJuXiuZheng_LeiJi) return;
        if (QuanJuXiuZheng_YiPaiDui) {
            QuanJuXiuZheng_RenWuQiZhi |= QuanJuXiuZheng_LeiJi;
            QuanJuXiuZheng_LeiJi = 0;
            return;
        }
        QuanJuXiuZheng_YiPaiDui = true;
        var now = Date.now();
        var delay = now - ShangCiQuanJuXiuZheng < 1200 ? 1200 : 450;
        var renWuQiZhi = QuanJuXiuZheng_LeiJi;
        QuanJuXiuZheng_LeiJi = 0;
        setTimeout(function() {
            ShangCiQuanJuXiuZheng = Date.now();
            QuanJuXiuZheng_YiPaiDui = false;
            var mask = renWuQiZhi | QuanJuXiuZheng_RenWuQiZhi | QuanJuXiuZheng_LeiJi;
            QuanJuXiuZheng_RenWuQiZhi = 0;
            QuanJuXiuZheng_LeiJi = 0;
            if (!mask) return;
            ZhengZaiPiLiangFanYi = true;
            try { ZhiXing_QuanJuXiuZheng_RenWu(mask); } catch (e) {}
            ZhengZaiPiLiangFanYi = false;
            if (QuanJuXiuZheng_LeiJi || QuanJuXiuZheng_RenWuQiZhi) PaiDui_QuanJuXiuZheng();
        }, delay);
    }

    // 批量翻译排队节点，并按区域触发修正
    function ZhiXing_PiLiang_FanYi() {
        var nodes = DaiChuLi_JieDian;
        DaiChuLi_JieDian = [];
        YiDiaoDu = false;
        ZhengZaiPiLiangFanYi = true;
        try {
            for (var i = 0; i < nodes.length; i++) {
                try { FanYi_ZiShu(nodes[i]); } catch (e) {}
            }
        } finally {
            ZhengZaiPiLiangFanYi = false;
        }
        var qiZhi = ShouJi_PiLiang_QiZhi(nodes);
        if (qiZhi) PaiDui_QuanJuXiuZheng(qiZhi);
    }

    // 判断节点是否包含选区悬浮工具
    function JieDian_You_XuanZe_GongJu(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList && node.classList.contains('cursorHoverWidget')) return true;
        try { return !!(node.querySelector && node.querySelector('.cursorHoverWidget')); } catch (e) { return false; }
    }

    // 判断节点是否是或包含上下文菜单
    function JieDian_You_Context_Menu(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            if (node.classList.contains('context-view') || node.classList.contains('monaco-menu') ||
                node.classList.contains('monaco-menu-container') || node.classList.contains('ui-menu') ||
                node.classList.contains('ui-menu__layout') || node.classList.contains('ui-menu__content') ||
                node.classList.contains('ui-slash-menu') || node.classList.contains('ui-slash-menu__content')) return true;
        }
        try {
            return !!(node.querySelector && node.querySelector(
                '.context-view .monaco-menu, .context-view [role="menu"], .monaco-menu-container, ' +
                '.ui-menu, .ui-menu__layout, .ui-menu__content, .ui-slash-menu, .ui-slash-menu__content'
            ));
        } catch (e) { return false; }
    }

    // 判断节点是否位于顶部菜单栏
    function JieDian_You_DingBu_CaiDan(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            if (node.classList.contains('menubar') ||
                node.classList.contains('menubar-menu-button') ||
                node.classList.contains('menubar-menu-title') ||
                node.classList.contains('titlebar')) return true;
        }
        try {
            return !!(node.closest && node.closest(
                '.menubar, [role="menubar"], .titlebar, .part.titlebar, .menubar-menu-button, .menubar-menu-title'
            ));
        } catch (e) { return false; }
    }

    // 判断节点是否是或包含斜杠提及菜单
    function JieDian_You_TiJi_CaiDan(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            if (node.classList.contains('ui-slash-menu') || node.classList.contains('ui-slash-menu__content')) return true;
        }
        try {
            return !!(node.querySelector && node.querySelector('.ui-slash-menu, .ui-slash-menu__content'));
        } catch (e) { return false; }
    }

    // 判断节点是否位于 CSS 检查器
    function JieDian_You_Css_Inspector(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            for (var i = 0; i < node.classList.length; i++) {
                var cls = node.classList[i];
                if (cls && cls.indexOf('css-inspector') >= 0) return true;
                if (cls && cls.indexOf('css-effects') >= 0) return true;
                if (cls && cls.indexOf('css-effect') >= 0) return true;
            }
        }
        try {
            if (node.closest && node.closest('[data-design-css-filter], [data-design-owns-escape], [data-chrome-owns-history]')) return true;
            if (node.querySelector && node.querySelector('[data-design-css-filter], [data-design-owns-escape]')) return true;
        } catch (e) {}
        try {
            return !!(node.querySelector && node.querySelector(
                '.css-inspector-section, .css-effects-type-select, .css-effect-entry, [class*="css-inspector"]'
            ));
        } catch (e) { return false; }
    }

    // 判断节点是否是或包含 Monaco 悬浮提示
    function JieDian_You_Monaco_Hover(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (Shi_XuanFu_TiShi_JieDian(node)) return true;
        try {
            return !!(node.querySelector && node.querySelector(XuanFu_TiShi_XuanZeQi));
        } catch (e) { return false; }
    }

    // 判断节点是否位于对话输入条
    function JieDian_You_PromptBar(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            for (var i = 0; i < node.classList.length; i++) {
                var cls = node.classList[i];
                if (!cls) continue;
                if (cls.indexOf('prompt-bar') >= 0 || cls.indexOf('pure-ai-prompt') >= 0 ||
                    cls.indexOf('ui-prompt-input') >= 0 || cls === 'inline-prompt-button-area') return true;
            }
        }
        try {
            return !!(node.querySelector && node.querySelector(
                '.pure-ai-prompt-bar, [class*="prompt-bar"], .ui-prompt-input, [class*="ui-prompt-input"]'
            ));
        } catch (e) { return false; }
    }

    // 判断节点是否位于 UI 对话框
    function JieDian_You_UI_DuiHua(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            for (var i = 0; i < node.classList.length; i++) {
                var cls = node.classList[i];
                if (cls && cls.indexOf('ui-dialog') >= 0) return true;
            }
        }
        try {
            return !!(node.querySelector && node.querySelector('.ui-dialog, .ui-alert-dialog, [class*="ui-dialog"]'));
        } catch (e) { return false; }
    }

    // 判断节点是否位于通知、Toast 或推广弹层
    function JieDian_You_TongZhi_TanChuang(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            for (var i = 0; i < node.classList.length; i++) {
                var cls = node.classList[i];
                if (!cls) continue;
                if (cls.indexOf('notification') >= 0 || cls.indexOf('toast') >= 0 ||
                    cls.indexOf('promo') >= 0 || cls.indexOf('upsell') >= 0) return true;
            }
        }
        try {
            return !!(node.querySelector && node.querySelector(
                '.monaco-notification, [class*="notification-toast"], [class*="promo"], [class*="upsell"]'
            ));
        } catch (e) { return false; }
    }

    // 判断节点是否位于 Cursor 设置页
    function JieDian_You_Cursor_SheZhi(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            for (var i = 0; i < node.classList.length; i++) {
                var cls = node.classList[i];
                if (cls && cls.indexOf('cursor-settings') >= 0) return true;
            }
        }
        try {
            return !!(node.querySelector && node.querySelector('[class*="cursor-settings"]'));
        } catch (e) { return false; }
    }

    var Composer_SaoMiao_Timer = null; // 对话区扫描节流，避免选字时每帧重扫

    // 把对话区翻译延后合并，选字过程中不跟着扫整页
    function PaiDui_Composer_JieMian_SaoMiao() {
        if (Composer_SaoMiao_Timer) return;
        Composer_SaoMiao_Timer = setTimeout(function() {
            Composer_SaoMiao_Timer = null;
            if (ZhengZaiPiLiangFanYi) return;
            ZhengZaiPiLiangFanYi = true;
            try {
                try { YanChi_FanYi_TiJi_CaiDan(); } catch (e) {}
                try { XiuZheng_KuaiSuBianJi_CmdK(); } catch (e) {}
                try { XiuZheng_DuiHua_JieMian(); } catch (e) {}
                try { XiuZheng_Agent_GengGai(); } catch (e) {}
                try { XiuZheng_ZhiNengTi_FanKui(); } catch (e) {}
                try { XiuZheng_ZhuTi_XuanZe(); } catch (e) {}
                try { XiuZheng_DuiLie_XiaoXi(); } catch (e) {}
                try { XiuZheng_MoXing_XuanZeQi(); } catch (e) {}
                try { XiuZheng_Composer_Placeholder(); } catch (e) {}
                try { XiuZheng_Composer_GongJuTiao(); } catch (e) {}
                try { XiuZheng_Editor_BiaoTi_TiShi(); } catch (e) {}
            } finally {
                ZhengZaiPiLiangFanYi = false;
            }
        }, 600);
    }

    // 处理 DOM 变更，把新节点分派到对应翻译流程
    function GuanCha_HuiDiao(mutations) {
        var piLiang = ZhengZaiPiLiangFanYi;
        var xuanZeGongJu = false;
        var contextMenu = false;
        var tiJiCaiDan = false;
        var promptBar = false;
        var monacoHover = false;
        var tongZhiTanChuang = false;
        var uiDuiHua = false;
        var cursorSheZhi = false;
        var cssInspector = false;
        var dingBuCaiDan = false;
        var kongZhuangTai = false;
        var huiDiaoQiZhi = 0;
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            // 占位符属性变更必须先于输入/代码过滤。原生 placeholder 赋值不走 setAttribute 补丁
            if (m.type === 'attributes' && m.target) {
                var attrName = m.attributeName || '';
                if (attrName === 'placeholder' || attrName === 'data-placeholder' || attrName === 'aria-placeholder') {
                    try { FanYi_ZhanWei_ShuXing(m.target); } catch (e) {}
                    continue;
                }
            }
            var kuaiEl = m.target && (m.target.nodeType === 1 ? m.target : m.target.parentElement);
            if (!kongZhuangTai && kuaiEl && kuaiEl.closest && kuaiEl.closest('[data-component="glass-empty-state-rotating-tips"]')) kongZhuangTai = true;
            if (kuaiEl && kuaiEl.className && typeof kuaiEl.className === 'string') {
                var kuaiMing = kuaiEl.className;
                if (kuaiMing.indexOf('view-line') >= 0 || kuaiMing.indexOf('view-overlay') >= 0 ||
                    kuaiMing.indexOf('mtk') >= 0 || kuaiMing.indexOf('ProseMirror') >= 0 ||
                    kuaiMing.indexOf('ui-default-diff') >= 0 || kuaiMing.indexOf('ui-default-code') >= 0) continue;
            }
            if (Shi_ShuRu_Huo_DaiMa_BianYi(m.target)) continue;
            if (m.type === 'childList') {
                var added = m.addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var node = added[j];
                    if (Shi_ShuRu_Huo_DaiMa_BianYi(node)) continue;
                    var nodeQiZhi = TuiDuan_JieDian_QiZhi(node);
                    if (nodeQiZhi) {
                        huiDiaoQiZhi |= nodeQiZhi;
                        if (piLiang) HeBing_QuanJuXiuZhengQi(nodeQiZhi);
                    }
                    if (!xuanZeGongJu && JieDian_You_XuanZe_GongJu(node)) xuanZeGongJu = true;
                    if (!contextMenu && JieDian_You_Context_Menu(node)) contextMenu = true;
                    if (!tiJiCaiDan && JieDian_You_TiJi_CaiDan(node)) tiJiCaiDan = true;
                    if (!promptBar && JieDian_You_PromptBar(node)) promptBar = true;
                    if (!monacoHover && JieDian_You_Monaco_Hover(node)) monacoHover = true;
                    if (!tongZhiTanChuang && JieDian_You_TongZhi_TanChuang(node)) tongZhiTanChuang = true;
                    if (!uiDuiHua && JieDian_You_UI_DuiHua(node)) uiDuiHua = true;
                    if (!cursorSheZhi && JieDian_You_Cursor_SheZhi(node)) cursorSheZhi = true;
                    if (!cssInspector && JieDian_You_Css_Inspector(node)) cssInspector = true;
                    if (!dingBuCaiDan) {
                        var dingBuJieDian = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
                        if (JieDian_You_DingBu_CaiDan(dingBuJieDian)) dingBuCaiDan = true;
                    }
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        try { FanYi_ZhanWei_ShuXing(node); } catch (e) {}
                        try {
                            if (node.querySelectorAll) {
                                var zhanWei = node.querySelectorAll('[data-placeholder], [aria-placeholder], [placeholder]');
                                for (var z = 0; z < zhanWei.length; z++) FanYi_ZhanWei_ShuXing(zhanWei[z]);
                            }
                        } catch (e) {}
                    }
                    if (!piLiang && (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)) {
                        TianJia_DaiChuLi(node);
                    }
                }
            } else if (m.type === 'characterData' && m.target && m.target.nodeType === Node.TEXT_NODE) {
                try { FanYi_ZhuangTai_WenBen_JieDian(m.target); } catch (e) {}
                try {
                    var cdEl = m.target.parentElement;
                    if (cdEl && cdEl.closest && cdEl.closest(
                        '.context-view, .monaco-select-box, .quick-input-widget, [role="listbox"], ' +
                        '.monaco-hover, .cursorHoverWidget, [role="tooltip"]'
                    )) {
                        FanYi_WenBen_JieDian(m.target);
                    }
                } catch (e) {}
            }
        }
        if (dingBuCaiDan) {
            try { PaiDui_DingBu_CaiDanTiao(); } catch (e) {}
        }
        if (xuanZeGongJu) {
            try { XiuZheng_BianJiQi_XuanZe(); } catch (e) {}
        }
        if (contextMenu) {
            try { YanChi_FanYi_CaiDan(true); } catch (e) {}
            try { XiuZheng_BianJiQi_YouJianCaiDan(); } catch (e) {}
            try { XiuZheng_LiaoTian_LiShi(); } catch (e) {}
            setTimeout(function() {
                try { ZhiXing_CaiDan_FanYi(); } catch (e) {}
            }, 1200);
        }
        if (monacoHover) {
            var hoverGen = document.querySelector('.monaco-hover, .cursorHoverWidget, [role="tooltip"]');
            if (hoverGen) {
                try { FanYi_Monaco_Hover_Content(hoverGen); } catch (e) {}
                try { FanYi_Cursor_Hover_Widget(hoverGen); } catch (e) {}
            }
        }
        if (piLiang) return;
        if (tiJiCaiDan) {
            try { YanChi_FanYi_TiJi_CaiDan(); } catch (e) {}
        }
        if (promptBar || tongZhiTanChuang) {
            PaiDui_Composer_JieMian_SaoMiao();
        }
        if (kongZhuangTai) {
            try { XiuZheng_KongZhuangTai_TiShi(); } catch (e) {}
        }
        if (cssInspector) {
            try { XiuZheng_YinYing_MoHu(); } catch (e) {}
            try { XiuZheng_SheJi_MianBan(); } catch (e) {}
        }
        if (tongZhiTanChuang) {
            try { XiuZheng_GuangGao_TanChuang(); } catch (e) {}
        }
        if (uiDuiHua) {
            try { XiuZheng_UI_DuiHua(); } catch (e) {}
        }
        if (cursorSheZhi) {
            try { XiuZheng_Cursor_SheZhi(); } catch (e) {}
            try { XiuZheng_SheZhi_SuiPian(); } catch (e) {}
            try { XiuZheng_YinCang_DuiHua_SheZhi(); } catch (e) {}
        }
        if (!piLiang && huiDiaoQiZhi) {
            var paiDuiQiZhi = huiDiaoQiZhi;
            if (contextMenu) paiDuiQiZhi &= ~(QX_CAI_DAN | QX_BIAN_JI_QI);
            if (xuanZeGongJu) paiDuiQiZhi &= ~QX_BIAN_JI_QI;
            if (promptBar || tiJiCaiDan) paiDuiQiZhi &= ~QX_COMPOSER;
            if (monacoHover) paiDuiQiZhi &= ~QX_HOVER;
            if (tongZhiTanChuang) paiDuiQiZhi &= ~QX_TONG_ZHI;
            if (uiDuiHua) paiDuiQiZhi &= ~QX_DUI_HUA;
            if (cursorSheZhi) paiDuiQiZhi &= ~QX_SHE_ZHI;
            if (cssInspector) paiDuiQiZhi &= ~QX_SHE_JI;
            if (paiDuiQiZhi) PaiDui_QuanJuXiuZheng(paiDuiQiZhi);
        }
    }

    // 顶部菜单助记符结构（如 <u>F</u>ile）保留子节点，只改可见文案
    function XieRu_ZhuJiFu_CaiDan_BiaoQian(el, text) {
        if (!el || text == null || el.nodeType !== 1) return false;
        var mnemonic = null;
        var textNode = null;
        var child = el.firstChild;
        while (child) {
            if (child.nodeType === 1) {
                var ct = (child.textContent || '').trim();
                if (ct) {
                    if (mnemonic || child.children.length || ct.length > 2) return false;
                    mnemonic = child;
                }
            } else if (child.nodeType === 3 && (child.nodeValue || '').trim()) {
                if (textNode) return false;
                textNode = child;
            }
            child = child.nextSibling;
        }
        if (!mnemonic || !textNode) return false;
        try { mnemonic.textContent = ''; } catch (e) { return false; }
        var raw = textNode.nodeValue;
        var trimmed = raw.trim();
        var idx = raw.indexOf(trimmed);
        var next = idx < 0 ? text : raw.substring(0, idx) + text + raw.substring(idx + trimmed.length);
        if (textNode.nodeValue !== next) textNode.nodeValue = next;
        return true;
    }

    // 只改写已有文本节点，避免拆掉 React 子节点
    function XieRu_YuanSu_WenBen(el, text) {
        if (!el || text == null) return false;
        if (el.nodeType === 3) return XieRu_WenBen_JieDian(el, text);
        if (el.nodeType !== 1) return false;
        if (Shi_Zai_DaiMa_Hang(el)) return false;
        try { if (Shi_HuiFu_ZhengWen(el) || Shi_WenJianShu_MingCheng(el)) return false; } catch (e) {}
        var child = el.firstChild;
        var target = null;
        var youYuanSuWen = false;
        while (child) {
            if (child.nodeType === 1) {
                if ((child.textContent || '').trim()) youYuanSuWen = true;
            } else if (child.nodeType === 3 && (child.nodeValue || '').trim()) {
                if (target) return false;
                target = child;
            }
            child = child.nextSibling;
        }
        if (youYuanSuWen) {
            var shiDingBuBiaoTi = false;
            try {
                shiDingBuBiaoTi = !!(el.classList && (
                    el.classList.contains('menubar-menu-title') ||
                    el.classList.contains('menubar-menu-button')
                )) || !!(el.closest && el.closest('.menubar-menu-title, [role="menubar"]'));
            } catch (e2) {}
            if (shiDingBuBiaoTi) return XieRu_ZhuJiFu_CaiDan_BiaoQian(el, text);
            return false;
        }
        if (!target) return false;
        var raw = target.nodeValue;
        var trimmed = raw.trim();
        var idx = raw.indexOf(trimmed);
        var next = idx < 0 ? text : raw.substring(0, idx) + text + raw.substring(idx + trimmed.length);
        return XieRu_WenBen_JieDian(target, next);
    }

    // 在确认不会破坏结构后，安全改写元素文本
    function KeYi_AnQuan_GaiXie_WenBen(el, text, needles) {
        if (!el || !text) return false;
        if (text.length > 400) return false;
        if (Shi_YongHu_ShuRu_QuYu(el)) return false;
        try { if (Shi_HuiFu_ZhengWen(el) || Shi_WenJianShu_MingCheng(el)) return false; } catch (e) {}
        if (YingGai_TiaoGuo_BianJiQi_YuanSu(el)) return false;
        try {
            if (el.querySelector('input, textarea, select, button, [role="button"], [role="switch"], [contenteditable="true"]')) return false;
            var xiala = el.closest('[role="combobox"], .monaco-select-box, [class*="select-box"]');
            if (xiala && (el === xiala || el.childElementCount > 0)) return false;
            var caiDan = el.closest(
                '.monaco-menu, .context-view, [role="menu"], [role="menubar"], ' +
                '.ui-menu, .ui-menu__content, .ui-slash-menu, [role="listbox"]'
            );
            if (caiDan) {
                var shiDingBuBiaoTi = !!(el.classList && (
                    el.classList.contains('menubar-menu-title') ||
                    el.classList.contains('menubar-menu-button')
                )) || !!(el.closest && el.closest('.menubar-menu-title'));
                var clsName = el.className ? String(el.className) : '';
                var shiBiaoQian = !!(el.classList && (
                    el.classList.contains('action-label') ||
                    el.classList.contains('ui-menu__item-title') ||
                    el.classList.contains('ui-menu__item-content') ||
                    el.classList.contains('ui-menu__title') ||
                    el.classList.contains('text-dropdown-foreground') ||
                    clsName.indexOf('action-label') >= 0 ||
                    clsName.indexOf('ui-menu__item') >= 0
                ));
                var shiYeZi = !el.querySelector || !el.querySelector('*');
                var shiCaiDanXiang = !!(el.closest && el.closest(
                    '[role="menuitem"], [role="option"], a.action-menu-item, li.action-item, ' +
                    '.ui-menu__row, .ui-menu__item, [class*="ui-menu__item"]'
                ));
                if (!shiDingBuBiaoTi && !shiBiaoQian && !(shiYeZi && shiCaiDanXiang)) return false;
            }
        } catch (e) {}
        var parent = el.parentElement;
        if (parent) {
            var parentText = GuiYiHua_WenBen(parent.textContent || '');
            if (parentText && parentText === text) return false;
        }
        return XieRu_YuanSu_WenBen(el, text);
    }

    var QuanJuWenBen_HuanCun = { time: 0, text: '' }; // 页面可见文本缓存，time 为采样时间
    // 读取并短时缓存页面可见文本，供关键词门闩使用
    function HuoQu_QuanJu_WenBen() {
        var now = Date.now();
        if (now - QuanJuWenBen_HuanCun.time < 600) return QuanJuWenBen_HuanCun.text;
        var parts = [];
        try {
            // 收集可见文本，跳过编辑器内部
            function CaiJi_WenBen(node) {
                if (!node) return;
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('monaco-editor')) return;
                    if (node.matches && node.matches('.monaco-editor')) return;
                }
                if (node.nodeType === 3) {
                    parts.push(node.textContent || '');
                    return;
                }
                var child = node.firstChild;
                while (child) {
                    if (child.nodeType === 1 && child.classList && child.classList.contains('monaco-editor')) {
                        child = child.nextSibling;
                        continue;
                    }
                    CaiJi_WenBen(child);
                    child = child.nextSibling;
                }
            }
            if (document.body) CaiJi_WenBen(document.body);
        } catch (e) {}
        var text = GuiYiHua_WenBen(parts.join(' '));
        QuanJuWenBen_HuanCun.time = now;
        QuanJuWenBen_HuanCun.text = text;
        return text;
    }

    // 判断整页可见文本是否包含任一关键词
    function QuanJu_BaoHan_GuanJianCi(words) {
        var text = HuoQu_QuanJu_WenBen();
        if (!text) return false;
        for (var i = 0; i < words.length; i++) {
            if (text.indexOf(words[i]) !== -1) return true;
        }
        return false;
    }

    // 判断设置页文本是否包含任一关键词
    function QuanJu_BaoHan_GuanJianCi_SheZhi(words) {
        var root = HuoQu_SheZhi_Gen_JieDian();
        if (!root) return false;
        var text = GuiYiHua_WenBen(root.textContent || '');
        if (!text) return false;
        for (var i = 0; i < words.length; i++) {
            if (text.indexOf(words[i]) !== -1) return true;
        }
        return false;
    }

    // 在元素的文本节点上按片段表替换
    function TiHuan_WenBenJieDian_SuiPian(root, fragments) {
        if (!root || !fragments || !fragments.length) return false;
        if (root.nodeType === 1 && YingGai_TiaoGuo_BianJiQi_YuanSu(root)) return false;
        var changed = false;
        var walker;
        try {
            walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        } catch (e) {
            return false;
        }

        var node;
        while ((node = walker.nextNode())) {
            if (Shi_BianJiQi_QuYu(node)) continue;
            try {
                if (node.parentElement && Shi_CaiDan_QuYu(node.parentElement) && !Shi_CaiDan_WenBen_JieDian(node)) continue;
            } catch (e) {}
            var neo = TiHuan_SuiPian_LieBiao(node.textContent || '', fragments);
            if (neo && neo !== node.textContent) {
                XieRu_WenBen_JieDian(node, neo);
                changed = true;
            }
        }
        return changed;
    }

    // 代码库说明的片段替换
    var DaiMaKu_ShuoMing_SuiPian = [
        ['Embed codebase for improved contextual understanding and knowledge.', '嵌入代码库以提升上下文理解与知识检索。'],
        ['Embed codebase for improved contextual understanding and knowledge', '嵌入代码库以提升上下文理解与知识检索'],
        ['Embeddings and metadata are stored in the ', '嵌入向量和元数据存储在'],
        ['Embeddings and metadata are stored in ', '嵌入向量和元数据存储在'],
        [', but all code is stored locally.', '，但所有代码都存储在本地。'],
        ['but all code is stored locally.', '但所有代码都存储在本地。']
    ];

    // 翻译代码库嵌入相关的设置说明
    function XiuZheng_DaiMaKu_ShuoMing() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('DAI_MA_KU')) return;
        var fragments = DaiMaKu_ShuoMing_SuiPian;
        FanYi_SheZhiGen_SuiPian_PiPei(sheZhiGen, fragments, function(text) {
            return text.indexOf('Embed codebase for improved contextual understanding and knowledge') !== -1 ||
                text.indexOf('Embeddings and metadata are stored in') !== -1;
        });
    }

    // 按关键词组合生成设置说明替换规则。all 必须同时出现，any 至少出现一个
    function GuiZe_An_GuanJianCi(item) {
        return {
            test: function(text) {
                var all = item.all || [];
                for (var i = 0; i < all.length; i++) {
                    if (text.indexOf(all[i]) === -1) return false;
                }
                var any = item.any;
                if (!any || !any.length) return true;
                for (var j = 0; j < any.length; j++) {
                    if (text.indexOf(any[j]) !== -1) return true;
                }
                return false;
            },
            apply: function(el) {
                KeYi_AnQuan_GaiXie_WenBen(el, item.text, item.needles);
            }
        };
    }

    function ZuZhuang_GuanJianCi_GuiZe(items) {
        var rules = [];
        for (var i = 0; i < items.length; i++) rules.push(GuiZe_An_GuanJianCi(items[i]));
        return rules;
    }

    // 代码索引规模说明
    var SuoYin_ShuoMing_GuiZe = [
        {
            any: ['with fewer than 50,000 files', 'index any new folders', 'Automatically index any new folders'],
            text: '自动索引文件数少于 50,000 的新增文件夹',
            needles: ['index any new folders', '50,000']
        }
    ];

    // 翻译代码索引规模相关的设置说明
    function XiuZheng_SuoYin_ShuoMing() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('SUO_YIN')) return;
        FanYi_SheZhiGen_WenBen_GuiZe(sheZhiGen, ZuZhuang_GuanJianCi_GuiZe(SuoYin_ShuoMing_GuiZe));
    }

    // 模型供应商密钥说明
    var MoXing_Ye_ShuoMing = [
        {
            all: ['OpenAI key', 'OpenAI models'],
            text: '您可以填写自己的 OpenAI key 来按成本价使用 OpenAI 模型。',
            needles: ['OpenAI key', 'OpenAI models']
        },
        {
            all: ['Anthropic key'],
            any: ['beginning with', '"claude-"'],
            text: '您可以填写自己的 Anthropic key 来按成本价使用 Claude。启用后，此 key 将用于所有以 "claude-" 开头的模型。',
            needles: ['Anthropic key', 'claude-']
        },
        {
            all: ['Google AI Studio key', 'Google models'],
            text: '您可以填写自己的 Google AI Studio key 来按成本价使用 Google 模型。',
            needles: ['Google AI Studio key', 'Google models']
        },
        {
            all: ['Configure Azure OpenAI', 'Azure account'],
            text: '配置 Azure OpenAI，通过您的 Azure 账户使用 OpenAI 模型。',
            needles: ['Configure Azure OpenAI', 'Azure account']
        },
        {
            all: ['Configure AWS Bedrock', 'AWS account'],
            text: '配置 AWS Bedrock，通过您的 AWS 账户使用 Anthropic Claude 模型。',
            needles: ['Configure AWS Bedrock', 'AWS account']
        },
        {
            all: ['Cursor Enterprise teams', 'Access Keys'],
            text: 'Cursor Enterprise 团队可配置 IAM 角色，无需任何 Access Keys 即可访问 Bedrock。',
            needles: ['Cursor Enterprise teams', 'Access Keys']
        }
    ];

    // 翻译模型供应商密钥相关的设置说明
    function XiuZheng_MoXing_Ye() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('MO_XING_YE')) return;
        FanYi_SheZhiGen_WenBen_GuiZe(sheZhiGen, ZuZhuang_GuanJianCi_GuiZe(MoXing_Ye_ShuoMing));
    }

    // 确认对话框文案
    var UI_DuiHua_HINTS = [
        ['Close Running Tab?', '关闭运行中的标签页？'],
        ['The chat is currently running. Are you sure you want to close it?', '对话正在运行中。确定要关闭吗？'],
        ['Discard all changes up to this checkpoint?', '放弃截至此检查点的所有更改？'],
        ['You can always undo this later.', '您随时都可以撤销此操作。'],
        ['You can always undo this later. Note: Notebook cells are not supported for reverting.', '您随时都可以撤销此操作。注意：Notebook 单元格不支持还原。'],
        ['This action cannot be undone.', '此操作无法撤销。'],
        ['This action cannot be undone', '此操作无法撤销'],
        ['Something went wrong.', '出错了。'],
        ['Something went wrong', '出错了'],
        ['An unexpected error occurred. Reload the window to try again.', '发生意外错误。请重新加载窗口后重试。'],
        ['Copy Error', '复制错误'],
        ["Don't ask again", '不再询问']
    ];

    // 翻译关闭对话、放弃更改等确认对话框
    function XiuZheng_UI_DuiHua() {
        if (!document.querySelector('.ui-dialog, .ui-alert-dialog, [class*="ui-dialog"]')) return;
        var hints = UI_DuiHua_HINTS;
        var scopes = document.querySelectorAll('.ui-dialog, .ui-alert-dialog, [class*="ui-dialog"]');
        FanYi_Scope_List_Hints(scopes, hints, {
            maxLen: 240,
            needleLen: 12,
            selector: '.ui-dialog-title, .ui-dialog-description, .ui-alert-dialog-description, .ui-text, h1, h2, p, span, div',
            skipChildQuery: 'button, .ui-alert-dialog-action',
            allowTags: ['BUTTON']
        });
    }

    // 「关于」等 supplemental 辅助窗口：通过 window.open('about:blank') 创建，
    // CSP 为 script-src 'none'，主窗口 MutationObserver 无法覆盖，需跨文档翻译。
    var FuZhu_ChuangKou_YiZhuCe = typeof WeakSet !== 'undefined' ? new WeakSet() : null; // 已安装翻译的辅助窗口
    var FuZhu_ChuangKou_LieBiao = []; // 仍需轮询的辅助窗口

    // 翻译辅助窗口里的一段界面文字
    function FanYi_FuZhu_WenBen_Zhi(raw) {
        if (!raw) return null;
        var trimmed = GuiYiHua_WenBen(raw);
        if (!trimmed || !/[A-Za-z]/.test(trimmed)) return null;
        var tr = ChaZhao_FanYi(trimmed) || ChaZhao_FanYi(raw);
        if (tr && tr !== trimmed && tr !== raw) return tr;
        for (var i = 0; i < MoShi_FanYi.length; i++) {
            var pair = MoShi_FanYi[i];
            if (pair[0].test(trimmed)) {
                var neo = trimmed.replace(pair[0], pair[1]);
                if (neo && neo !== trimmed) return neo;
            }
        }
        return TiHuan_BuFen_WenBen(trimmed);
    }

    // 翻译辅助窗口文档中的按钮、标题和属性
    function FanYi_FuZhu_WenDang(doc) {
        if (!doc || !doc.body) return;
        try {
            var attrs = ['title', 'aria-label', 'placeholder', 'aria-placeholder'];
            var els = doc.querySelectorAll(
                'button, [role="button"], span, div, p, h1, h2, h3, label, a, ' +
                '[data-component^="glass-about-dialog"]'
            );
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                for (var a = 0; a < attrs.length; a++) {
                    var av = el.getAttribute(attrs[a]);
                    if (!av) continue;
                    var atr = FanYi_FuZhu_WenBen_Zhi(av);
                    if (atr && atr !== av) el.setAttribute(attrs[a], atr);
                }
                if (el.childElementCount > 0) {
                    // 仅翻译纯文本子节点，保留图标等元素
                    var nodes = el.childNodes;
                    for (var n = 0; n < nodes.length; n++) {
                        var tn = nodes[n];
                        if (!tn || tn.nodeType !== 3) continue;
                        var raw = tn.textContent || '';
                        var tr = FanYi_FuZhu_WenBen_Zhi(raw);
                        if (tr) {
                            var trimmed = raw.trim();
                            var idx = raw.indexOf(trimmed);
                            if (idx < 0) XieRu_WenBen_JieDian(tn, tr);
                            else XieRu_WenBen_JieDian(tn, raw.substring(0, idx) + tr + raw.substring(idx + trimmed.length));
                        }
                    }
                    continue;
                }
                var text = el.textContent || '';
                var ttr = FanYi_FuZhu_WenBen_Zhi(text);
                if (ttr) {
                    var ttrim = text.trim();
                    var tidx = text.indexOf(ttrim);
                    if (tidx < 0) XieRu_YuanSu_WenBen(el, ttr);
                    else XieRu_YuanSu_WenBen(el, text.substring(0, tidx) + ttr + text.substring(tidx + ttrim.length));
                }
            }
        } catch (e) {}
    }

    // 登记一个辅助窗口并开始翻译
    function ZhuCe_FuZhu_ChuangKou(win, features) {
        if (!win) return;
        try {
            if (FuZhu_ChuangKou_YiZhuCe) {
                if (FuZhu_ChuangKou_YiZhuCe.has(win)) return;
                FuZhu_ChuangKou_YiZhuCe.add(win);
            } else if (FuZhu_ChuangKou_LieBiao.indexOf(win) >= 0) {
                return;
            } else {
                FuZhu_ChuangKou_LieBiao.push(win);
            }
        } catch (e) {}

        var obs = null;
        var timer = null;
        var ticks = 0;

        // 在辅助窗口仍打开时翻译其文档
        function fanYi() {
            try {
                if (!win || win.closed) {
                    if (timer) clearInterval(timer);
                    if (obs) try { obs.disconnect(); } catch (e2) {}
                    return;
                }
                FanYi_FuZhu_WenDang(win.document);
            } catch (e3) {}
        }

        // 观察辅助窗口文档变化并重新翻译
        function anZhuangGuanCha() {
            try {
                if (!win.document || !win.document.documentElement) return false;
                if (obs) return true;
                obs = new MutationObserver(function() { fanYi(); });
                obs.observe(win.document.documentElement, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                    attributes: true,
                    attributeFilter: ['aria-label', 'title', 'disabled']
                });
                fanYi();
                return true;
            } catch (e4) {
                return false;
            }
        }

        try {
            if (win.document && win.document.readyState === 'complete') anZhuangGuanCha();
            else if (win.addEventListener) win.addEventListener('load', function() { anZhuangGuanCha(); fanYi(); });
        } catch (e5) {}

        timer = setInterval(function() {
            ticks++;
            anZhuangGuanCha();
            fanYi();
            try {
                if (ticks > 60 || !win || win.closed) clearInterval(timer);
            } catch (e6) {
                clearInterval(timer);
            }
        }, 100);
    }

    // 挂钩 window.open，翻译随后打开的辅助窗口
    function AnZhuang_FuZhu_ChuangKou_FanYi() {
        if (window.__cursor_zh_aux_open_patched) return;
        window.__cursor_zh_aux_open_patched = true;
        var yuanOpen = window.open;
        if (typeof yuanOpen !== 'function') return;
        window.open = function(url, name, features) {
            var ret = yuanOpen.apply(this, arguments);
            try {
                var win = ret && ret.window ? ret.window : ret;
                if (win) ZhuCe_FuZhu_ChuangKou(win, features);
            } catch (e) {}
            return ret;
        };
    }

    // 翻译通知和推广弹层中的界面文字
    function XiuZheng_GuangGao_TanChuang() {
        var roots = document.querySelectorAll(
            '.monaco-notification, .notifications-list-container, .notification-list-item, ' +
            '[class*="notification-toast"], [class*="notification-toast-item"], [class*="promo"], ' +
            '[class*="upsell"], [class*="feature-card"], [class*="toast-container"]'
        );
        var scopes = roots.length ? Array.prototype.slice.call(roots) : [document.body];
        FanYi_Scope_ZiDian_Only(scopes, {
            maxLen: 600,
            needleLen: 14,
            skipHoverWidget: true,
            skipNestedInteractive: true
        });
    }

    // 功能推广与用量提示
    var GongNeng_TuiGuang_HINTS = [
        ["You've hit your usage limit", '您已达到用量上限'],
        ['Usage limit reached', '已达用量上限'],
        ['Total usage limit reached', '已达到总用量上限'],
        ["You've reached your monthly limit. Set a new on-demand limit to continue.", '您已达到本月用量上限。请设置新的按需用量限额以继续使用。'],
        ["You've reached your monthly limit. Set a new on-demand limit to continue", '您已达到本月用量上限。请设置新的按需用量限额以继续使用'],
        ["You've reached your limit. Responses may be slower. Upgrade for more usage.", '您已达到用量上限。响应可能会变慢。升级以获取更多用量。'],
        ["You've reached your limit. Responses may be slower. Upgrade to Pro+ for 3x more usage.", '您已达到用量上限。响应可能会变慢。升级到 Pro+ 可获得 3 倍用量。'],
        ['Get faster responses', '获得更快响应'],
        ['Increase limits for faster responses', '提高限额以获得更快响应'],
        ["You're out of usage. Switch to Auto, or ask your admin to increase your limit to continue.", '您的用量已用尽。请切换到自动，或联系管理员提高限额以继续使用。'],
        ['Upgrade to Pro+', '升级到 Pro+'],
        ['Set new limit', '设置新限额'],
        ["Cursor's Smartest Model Yet", 'Cursor 迄今最智能的模型'],
        ['Trained jointly with SpaceXAI, Grok 4.5 can handle long-running tasks beyond coding', '与 SpaceXAI 联合训练，Grok 4.5 可处理超出编码范围的长时任务'],
        ['50% Off Through July 14', '7 月 14 日前五折优惠'],
        ['Get double the usage for the first week across desktop, web, iOS, CLI, and SDK', '首周在桌面端、网页、iOS、CLI 和 SDK 上享双倍用量'],
        ['Try Grok 4.5', '试用 Grok 4.5'],
        ['Extending 50% Off Cursor Grok 4.5', '延长 Cursor Grok 4.5 五折优惠'],
        ["We're extending the Cursor Grok 4.5 promotion for another week. Enjoy double usage through July 21 across desktop, web, iOS, CLI, and our SDK.", '我们将 Cursor Grok 4.5 促销活动再延长一周。截至 7 月 21 日，在桌面端、网页、iOS、CLI 和 SDK 上享双倍用量。'],
        ['2x Included Usage', '2 倍包含用量'],
        ['Your plan now includes 2x usage for all Cursor models: Composer 2.5 and Cursor Grok 4.5.', '您的套餐现包含所有 Cursor 模型 2 倍用量：Composer 2.5 和 Cursor Grok 4.5。'],
        ['Plan Update', '计划更新'],
        ['High Load', '高负载'],
        ["We're experiencing high demand for Cursor Grok 4.5 right now. Please switch to Auto, another model, or try again in a few moments.", '当前 Cursor Grok 4.5 需求量很大。请切换到 Auto、其他模型，或稍后再试。'],
        ["We're experiencing high demand right now. Please upgrade to Pro or try again in a few moments.", '当前需求量很大。请升级到专业版，或稍后再试。'],
        ["We're experiencing high demand right now. Please try again in a few moments.", '当前需求量很大。请稍后再试。'],
        ['Plugins, MCPs, Skills, and Rules have moved to Customize', '插件、MCP、技能和规则已移至「自定义」'],
        ["We've introduced a new home for all the ways to customize Cursor.", '我们为 Cursor 的各种自定义方式提供了新入口。'],
        ['Connection failed', '连接失败'],
        ['Connect GitHub to Cursor', '将 GitHub 连接到 Cursor'],
        ['Let agents work with your Repos', '让智能体使用您的仓库'],
        ['Run durable, parallel agents in the cloud, automate code review with Bugbot, and steer agents from your phone.', '在云端运行持久、并行的智能体，用 Bugbot 自动审查代码，并在手机上操控智能体。'],
        ['Extension host terminated unexpectedly 3 times within the last 5 minutes.', '扩展宿主在过去 5 分钟内意外终止了 3 次。'],
        ['Restart Extension Host', '重启扩展宿主'],
        ['Start Extension Bisect', '启动扩展二分排查'],
        ['Get Cursor Pro for more Agent usage, unlimited Tab, and more.', '升级到 Cursor Pro 以获取更多 Agent 用量、无限 Tab 等。'],
        ['Get Cursor Pro for more Agent usage, unlimited Tab, and more', '升级到 Cursor Pro 以获取更多 Agent 用量、无限 Tab 等。'],
        ['Get Cursor Pro for more Agent usage, Cloud Agents, and more.', '升级到 Cursor Pro 以获取更多智能体用量、云端智能体等。'],
        ['Get Cursor Pro for more Agent usage, Cloud Agents, and more', '升级到 Cursor Pro 以获取更多智能体用量、云端智能体等。'],
        ['Use /multitask', '使用 /multitask'],
        ['Parallelize Your Work', '并行处理工作'],
        ['Get Unblocked', '解除等待阻塞'],
        ['Run async subagents to parallelize your requests instead of adding them to the queue', '运行异步子智能体并行处理请求，而不是加入队列等待'],
        ['Ask Cursor to multitask on queued messages instead of waiting for the run to finish', '让 Cursor 对队列中的消息进行多任务处理，无需等待当前运行结束'],
        ['Tell Cursor to use subagents to break down tasks, do work in parallel, and preserve context', '让 Cursor 使用子智能体拆分任务、并行处理工作并保留上下文'],
        ['Try now in Cursor 3', '在 Cursor 3 中立即试用'],
        ['Try Now in Cursor 3', '在 Cursor 3 中立即试用'],
        ['Coordinate parallel tasks...', '协调并行任务...'],
        ['Refactor code generator', '重构代码生成器'],
        ['Add tabs to leaderboard', '为排行榜添加标签页'],
        ['Implement navigation menu', '实现导航菜单']
    ];

    // 翻译用量上限、升级和功能推广文案
    function XiuZheng_GongNeng_TuiGuang() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('GONG_NENG_TUI_GUANG')) return;
        var hints = GongNeng_TuiGuang_HINTS;
        FanYi_Gen_List_Substring_Hints(
            document.querySelectorAll('div, span, p, button, label, li, option'),
            hints,
            { skipEditor: true, skipDictionary: true, needleLen: 16 }
        );
    }

    // 欢迎页与插件扩展提示
    var HuanYing_KuoZhan_HINTS = [
        ['Sign in', '登录'],
        ['Log in', '登录'],
        ['Sign Up', '注册'],
        ['Sign up', '注册'],
        ['The best way to code with AI', '与 AI 协作编程的最佳方式'],
        ['Log in to use Cursor AI features', '登录以使用 Cursor AI 功能'],
        ['Open Project', '打开项目'],
        ['Clone Repository', '克隆仓库'],
        ['Connect via SSH', '通过 SSH 连接'],
        ['Remote Machines', '远程计算机'],
        ['Search Remote Machines...', '搜索远程计算机...'],
        ['No remote machines yet.', '暂无远程计算机。'],
        ['Run on', '运行于'],
        ['Publish to GitHub', '发布到 GitHub'],
        ['No git repository found.', '未找到 Git 仓库。'],
        ['Report Issue', '报告问题'],
        ['Send Feedback', '发送反馈'],
        ['Code Intelligence', '代码智能'],
        ['Repositories', '仓库'],
        ['Browse Files', '浏览文件'],
        ['Message Cursor', '向 Cursor 发送消息'],
        ["Let's kick something off", '让我们开始吧'],
        ['No workspace folder open', '未打开工作区文件夹'],
        ['Close Pane', '关闭窗格'],
        ['Lock Group', '锁定组'],
        ['Unable to load automations.', '无法加载自动化。'],
        ['Unable to load automations', '无法加载自动化'],
        ['Author', '作者'],
        ['Inactive', '未激活'],
        ['Untitled', '未命名'],
        ['Edit Details', '编辑详情'],
        ['Duplicate', '创建副本'],
        ['Copy as JSON', '复制为 JSON'],
        ['Triggers', '触发器'],
        ['Add Trigger', '添加触发器'],
        ['Select repository', '选择仓库'],
        ['Test run', '测试运行'],
        ['Memories', '记忆'],
        ['Extend Cursor with Plugins', '通过插件扩展 Cursor'],
        ['Search Plugins for User...', '搜索用户插件...'],
        ['Search Plugins, Skills, MCPs...', '搜索插件、技能、MCP...'],
        ['Browse Marketplace', '浏览市场'],
        ['Open Plugins', '打开插件'],
        ['Open MCPs', '打开 MCP'],
        ['Open Skills', '打开技能'],
        ['Recent Workspaces', '最近工作区'],
        ['Teach Cursor New Skills', '教 Cursor 新技能'],
        ['Skills package domain-specific knowledge and workflows that Agent applies automatically when relevant.', '技能将领域特定的知识和工作流打包，智能体在相关时会自动应用。'],
        ['Getting Started', '开始使用'],
        ['Last Used Windows', '上次使用的窗口'],
        ['Window Restoration', '窗口还原'],
        ['Extensions have been modified on disk. Please reload the window.', '扩展已在磁盘上被修改。请重新加载窗口。'],
        ['Background agents only work in folders with a git repository. Please open a folder that contains a git repository to use this feature.', '后台智能体仅在包含 Git 仓库的文件夹中可用。请打开包含 Git 仓库的文件夹以使用此功能。'],
        ['Please open a folder to use background agents.', '请打开文件夹以使用后台智能体。'],
        ['Please open a folder to use background agents', '请打开文件夹以使用后台智能体'],
        ['Click to import all local VS Code extensions', '点击以导入所有本地 VS Code 扩展'],
        ['Click to import all local VS Code extensions.', '点击以导入所有本地 VS Code 扩展。'],
        ["(don't show again)", '（不再显示）'],
        ["don't show again", '不再显示'],
        ["Don't show again", '不再显示']
    ];

    // 翻译欢迎页、登录和开始使用相关文案
    function XiuZheng_HuanYing_KuoZhan() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('HUAN_YING')) return;
        var hints = HuanYing_KuoZhan_HINTS;
        FanYi_Gen_List_Hints(
            document.querySelectorAll(
                'a, button, span, div, p, label, [role="button"], [role="link"], .monaco-hover, [role="tooltip"]'
            ),
            hints,
            { maxLen: 160, needleLen: 12, leafOnly: true }
        );
    }

    // 阴影与模糊效果文案
    var YinYing_MoHu_HINTS = [
        ['Drop shadow', '外阴影'],
        ['Inner shadow', '内阴影'],
        ['Layer Blur', '图层模糊'],
        ['Backdrop Blur', '背景模糊'],
        ['Add shadow or blur', '添加阴影或模糊'],
        ['Remove shadow', '移除阴影'],
        ['Remove blur', '移除模糊'],
        ['Adjust shadow', '调整阴影'],
        ['Adjust blur', '调整模糊'],
        ['Hide drop shadow', '隐藏外阴影'],
        ['Show drop shadow', '显示外阴影'],
        ['Hide inner shadow', '隐藏内阴影'],
        ['Show inner shadow', '显示内阴影'],
        ['Hide layer blur', '隐藏图层模糊'],
        ['Show layer blur', '显示图层模糊'],
        ['Hide backdrop blur', '隐藏背景模糊'],
        ['Show backdrop blur', '显示背景模糊']
    ];

    // 翻译阴影与模糊面板中的选项
    function XiuZheng_YinYing_MoHu() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('YIN_YING_MOHU') && !document.querySelector(
            '.css-inspector-section, .css-effects-type-select, .css-effect-entry, [class*="css-inspector"]'
        )) return;
        var hints = YinYing_MoHu_HINTS;
        var scopes = document.querySelectorAll(
            '.css-inspector-section, .css-effect-entry, .css-effects-type-select, ' +
            '.css-section-title, .css-section-actions, .css-section-body, ' +
            'select.css-effects-type-select option, .monaco-hover, .monaco-hover-content, [role="tooltip"]'
        );
        var scopeList = scopes.length ? Array.prototype.slice.call(scopes) : [document.body];
        FanYi_Scope_List_Hints(scopeList, hints, {
            maxLen: 120,
            needleLen: 12,
            selector: 'span, div, button, label, li, option, select, [role="option"], [role="menuitem"], p'
        });
        try { FanYi_Monaco_Hover_Content(document.body); } catch (e) {}
    }

    // 设计面板文案
    var SheJi_MianBan_HINTS = [
        ['Solid', '纯色'],
        ['Linear', '线性'],
        ['Radial', '径向'],
        ['Conic', '锥形'],
        ['Circle', '圆形'],
        ['Ellipse', '椭圆'],
        ['Stops', '色标'],
        ['Fixed Width', '固定宽度'],
        ['Fit contents', '适应内容'],
        ['Fill container', '填充容器'],
        ['Add Min Width', '添加最小宽度'],
        ['Add Max Width', '添加最大宽度'],
        ['Drop shadow', '外阴影'],
        ['Inner shadow', '内阴影'],
        ['Layer Blur', '图层模糊'],
        ['Backdrop Blur', '背景模糊'],
        ['Add shadow or blur', '添加阴影或模糊'],
        ['Remove shadow', '移除阴影'],
        ['Remove blur', '移除模糊'],
        ['Adjust shadow', '调整阴影'],
        ['Adjust blur', '调整模糊']
    ];

    // 翻译设计面板中的填充和效果文案
    function XiuZheng_SheJi_MianBan() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('SHE_JI_MIAN_BAN') && !document.querySelector('.css-inspector-section, .css-effects-type-select, [data-design-css-filter]')) {
            try { XiuZheng_SheJi_TiShi(); } catch (e) {}
            try { XiuZheng_SheJi_ShuXing_GuoLv(); } catch (e) {}
            return;
        }
        try { XiuZheng_YinYing_MoHu(); } catch (e) {}
        try { XiuZheng_SheJi_TiShi(); } catch (e) {}
        try { XiuZheng_SheJi_ShuXing_GuoLv(); } catch (e) {}
        var hints = SheJi_MianBan_HINTS;
        var roots = document.querySelectorAll(
            '.css-inspector-section div, .css-inspector-section span, .css-inspector-section button, ' +
            '.css-inspector-section label, .css-inspector-section li, .css-inspector-section option, ' +
            '.css-inspector-section select, div, span, button, label, li, option, [role="option"], [role="menuitem"]'
        );
        FanYi_Gen_List_Hints(roots, hints, { maxLen: 80, needleLen: 12, leafOnly: true });
    }

    // 设计模式提示条里的按键词。只在同一条提示内翻译，避免 Click、drag 扩散到其他界面
    var SheJi_TiShi_AnJian = {
        'Click': '点击',
        'drag': '拖动',
        'Double-click': '双击',
        'Return': '回车'
    };

    // 翻译设计模式底部提示条中的按键词
    function XiuZheng_SheJi_TiShi() {
        if (!document.body) return;
        var page = document.body.textContent || '';
        if (page.indexOf('to cancel') === -1 && page.indexOf('to select or') === -1 && page.indexOf('to adjust') === -1 && page.indexOf('取消') === -1) return;
        var nodes = document.querySelectorAll('strong, span');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (Shi_Zai_DaiMa_Hang(el) || Shi_YongHu_ShuRu_QuYu(el)) continue;
            var text = (el.textContent || '').trim();
            var tr = SheJi_TiShi_AnJian[text];
            if (!tr || el.childElementCount > 0) continue;
            var around = el.parentElement ? (el.parentElement.textContent || '') : '';
            if (around.indexOf('to select') === -1 && around.indexOf('to cancel') === -1 &&
                around.indexOf('to adjust') === -1 && around.indexOf('to save') === -1 &&
                around.indexOf('to edit') === -1 && around.indexOf('to undo') === -1 &&
                around.indexOf('to close') === -1 && around.indexOf('以选择') === -1 &&
                around.indexOf('取消') === -1 && around.indexOf('以调整') === -1) continue;
            XieRu_YuanSu_WenBen(el, tr);
        }
    }

    // 属性筛选面板的操作文案。CSS 属性名保持原文
    var SheJi_ShuXing_HINTS = [
        ['Filter properties', '筛选属性'],
        ['No matching properties', '没有匹配的属性'],
        ['Clear filter', '清除筛选']
    ];

    // 翻译属性筛选面板的操作文案，不改 CSS 属性名
    function XiuZheng_SheJi_ShuXing_GuoLv() {
        var anchor = document.querySelector('[data-design-css-filter]');
        if (!anchor) return;
        var root = anchor.parentElement;
        for (var i = 0; i < 6 && root && root.parentElement; i++) {
            var next = root.parentElement;
            var sample = next.textContent || '';
            if (sample.indexOf('background-color') === -1 && sample.indexOf('Filter properties') === -1 && sample.indexOf('筛选属性') === -1) break;
            if (sample.length > 5000) break;
            root = next;
        }
        if (!root) return;
        FanYi_Gen_List_Hints(root.querySelectorAll('span, div, label, button'), SheJi_ShuXing_HINTS, {
            maxLen: 40,
            needleLen: 3,
            leafOnly: true,
            skipDictionary: true,
            skipBianJiQi: true
        });
    }

    // 升级与用量提示
    var Upgrade_TiShi_HINTS = [
        ["You've hit your usage limit", '您已达到用量上限'],
        ["You're approaching your usage limit", '您的用量即将达到上限'],
        ['Usage limit reached', '已达用量上限'],
        ['Total usage limit reached', '已达到总用量上限'],
        ["You've reached your monthly limit. Set a new on-demand limit to continue.", '您已达到本月用量上限。请设置新的按需用量限额以继续使用。'],
        ["You've reached your monthly limit. Set a new on-demand limit to continue", '您已达到本月用量上限。请设置新的按需用量限额以继续使用'],
        ["You've reached your limit. Responses may be slower. Upgrade for more usage.", '您已达到用量上限。响应可能会变慢。升级以获取更多用量。'],
        ["You've reached your limit. Responses may be slower. Upgrade to Pro+ for 3x more usage.", '您已达到用量上限。响应可能会变慢。升级到 Pro+ 可获得 3 倍用量。'],
        ['Get faster responses', '获得更快响应'],
        ['Increase limits for faster responses', '提高限额以获得更快响应'],
        ["You're out of usage. Switch to Auto, or ask your admin to increase your limit to continue.", '您的用量已用尽。请切换到自动，或联系管理员提高限额以继续使用。'],
        ['Upgrade to Pro+', '升级到 Pro+'],
        ['Set new limit', '设置新限额'],
        ['Get Cursor Pro for more Agent usage, unlimited Tab, and more.', '升级到 Cursor Pro 以获取更多 Agent 用量、无限 Tab 等。'],
        ['Get Cursor Pro for more Agent usage, unlimited Tab, and more', '升级到 Cursor Pro 以获取更多 Agent 用量、无限 Tab 等。'],
        ['Get Cursor Pro for more Agent usage, Cloud Agents, and more.', '升级到 Cursor Pro 以获取更多智能体用量、云端智能体等。'],
        ['Get Cursor Pro for more Agent usage, Cloud Agents, and more', '升级到 Cursor Pro 以获取更多智能体用量、云端智能体等。'],
        ['Upgrade for extended limits and full model access', '升级以获取扩展限额和完整模型访问权限'],
        ['Upgrade for extended usage & faster responses', '升级以获取扩展用量和更快响应'],
        ['Upgrade for 3x usage & faster responses', '升级以获取 3 倍用量和更快响应'],
        ['Upgrade to a Pro account', '升级到专业版账户'],
        ['Upgrade to Pro', '升级到专业版'],
        ['Included Usage', '包含用量'],
        ['Plan Update', '计划更新'],
        ['Window Restoration', '窗口还原'],
        ['Last Used Windows', '上次使用的窗口'],
        ['Controls which windows Cursor restores on startup', '控制启动时 Cursor 还原哪些窗口'],
        ['Play a sound when agents finish or need attention', '当智能体完成或需要关注时播放提示音'],
        ['Cursor Models', 'Cursor 模型'],
        ['Other Models', '其他模型'],
        ['Default Model', '默认模型'],
        ['Cursor Default', 'Cursor 默认'],
        ['No commit has been scored yet', '尚未对任何提交评分'],
        ['No commit scored', '暂无已评分提交'],
        ['Agent AI Stats (Today):', '智能体 AI 统计（今日）：'],
        ['Agent Stats:', '智能体统计：'],
        ['Tab AI Stats (Today):', 'Tab AI 统计（今日）：'],
        ['Tab Stats:', 'Tab 统计：'],
        ['Search Cursor settings...', '搜索 Cursor 设置...']
    ];

    // 翻译用量接近上限和升级提示
    function XiuZheng_Upgrade_TiShi() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('UPGRADE_TI_SHI')) return;
        var hints = Upgrade_TiShi_HINTS;
        FanYi_Gen_List_Substring_Hints(
            document.querySelectorAll('.monaco-hover, .monaco-hover-content, .upgrade-pro-button, .glass-sidebar-upgrade-pro-cta, div, span, p'),
            hints,
            { skipEditor: true, needleLen: 16 }
        );
    }

    // 只按精确词典翻译占位符字符串
    function FanYi_ZhanWei_Zhi(value) {
        if (!value || typeof value !== 'string') return value;
        var tr = null;
        try { tr = ChaZhao_FanYi(value); } catch (e) {}
        return tr || value;
    }

    // 挂钩 setAttribute，在写入占位符时翻译
    function AnZhuang_ZhanWei_ShuXing_GuaGou() {
        if (window.__cursorPlaceholderAttrHook) return;
        window.__cursorPlaceholderAttrHook = true;
        var names = { placeholder: 1, 'data-placeholder': 1, 'aria-placeholder': 1 };
        var raw = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            if (names[name]) value = FanYi_ZhanWei_Zhi(value);
            return raw.call(this, name, value);
        };
        var rawNS = Element.prototype.setAttributeNS;
        Element.prototype.setAttributeNS = function(ns, name, value) {
            if (names[name]) value = FanYi_ZhanWei_Zhi(value);
            return rawNS.call(this, ns, name, value);
        };
    }

    // 翻译元素上已有的占位符属性
    function FanYi_ZhanWei_ShuXing(node) {
        if (!node || node.nodeType !== 1 || !node.getAttribute) return;
        var attrs = ['placeholder', 'data-placeholder', 'aria-placeholder'];
        for (var a = 0; a < attrs.length; a++) {
            var ph = node.getAttribute(attrs[a]);
            if (!ph) continue;
            var tr = ChaZhao_FanYi(ph) || TiHuan_BuFen_WenBen(ph);
            if (tr && tr !== ph) node.setAttribute(attrs[a], tr);
        }
    }

    // 翻译根节点内各元素的占位符属性
    function GengXin_Placeholder_ShuXing(root) {
        if (!root) return;
        var nodes = root.querySelectorAll(
            '[data-placeholder], [aria-placeholder], input[placeholder], textarea[placeholder]'
        );
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].closest && nodes[i].closest('.monaco-editor .view-lines')) continue;
            FanYi_ZhanWei_ShuXing(nodes[i]);
        }
        FanYi_ZhanWei_ShuXing(root);
    }

    // 对话输入条快捷操作
    var PromptBar_WenBen_HINTS = [
        ['Edit selected code', '编辑所选代码'],
        ['Ask quick question', '快速提问'],
        ['Edit Selection', '编辑选区'],
        ['Quick Question', '快速提问'],
        ['Send', '发送'],
        ['Send to Chat', '发送到聊天'],
        ['Send to chat', '发送到聊天']
    ];

    // 翻译对话输入条里的界面文字，跳过用户输入
    function FanYi_PromptBar_WenBen(el, maxLen) {
        if (!el || !Shi_PromptBar_QuYu(el)) return false;
        if (Shi_YongHu_ShuRu_QuYu(el)) return false;
        if (el.closest('.monaco-editor .view-lines')) return false;
        maxLen = maxLen || 120;
        var raw = (el.textContent || '').trim();
        if (!raw || raw.length > maxLen) return false;
        if (el.classList && el.classList.contains('prompt-bar-dropdown-shortcut')) return false;
        var tr = ChaZhao_FanYi(raw) || TiHuan_BuFen_WenBen(raw);
        if (!tr) {
            var hints = PromptBar_WenBen_HINTS;
            for (var h = 0; h < hints.length; h++) {
                if (raw === hints[h][0]) { tr = hints[h][1]; break; }
            }
        }
        if (tr && tr !== raw) return XieRu_YuanSu_WenBen(el, tr);
        return false;
    }

    // 翻译对话输入条中的单个文本节点
    function FanYi_PromptBar_WenBenJieDian(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) return;
        var parent = node.parentElement;
        if (!parent || !Shi_PromptBar_QuYu(parent)) return;
        if (Shi_YongHu_ShuRu_QuYu(parent)) return;
        if (parent.closest('.monaco-editor .view-lines')) return;
        var text = node.textContent;
        if (!text) return;
        var trimmed = text.trim();
        if (!trimmed || trimmed.length > 120) return;
        var tr = ChaZhao_FanYi(trimmed) || ChaZhao_FanYi(text);
        if (!tr) {
            for (var h = 0; h < PromptBar_WenBen_HINTS.length; h++) {
                if (trimmed === PromptBar_WenBen_HINTS[h][0]) { tr = PromptBar_WenBen_HINTS[h][1]; break; }
            }
        }
        if (!tr || tr === trimmed) return;
        var prefix = text.substring(0, text.indexOf(trimmed));
        var suffix = text.substring(text.indexOf(trimmed) + trimmed.length);
        XieRu_WenBen_JieDian(node, prefix + tr + suffix);
    }

    // 扫描对话输入条并翻译其中的界面文字
    function ZhiXing_PromptBar_FanYi() {
        var roots = HuoQu_PromptBar_Gen_JieDian();
        if (!roots.length) {
            var cw = document.querySelector('.contentWidgets, .overlayWidgets');
            if (!cw) return;
            roots = [cw];
        }
        for (var ri = 0; ri < roots.length; ri++) {
            var root = roots[ri];
            if (root.closest('.monaco-editor .view-lines')) continue;
            GengXin_Placeholder_ShuXing(root);
            FanYi_ShuXing(root);
            var phEls = root.querySelectorAll(
                '.ProseMirror, .tiptap, [contenteditable="true"], [data-placeholder], ' +
                '.prompt-edit-input, [class*="prompt-edit-input"]'
            );
            for (var pi = 0; pi < phEls.length; pi++) {
                GengXin_Placeholder_ShuXing(phEls[pi]);
                FanYi_ShuXing(phEls[pi]);
            }
            try {
                var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
                var tnode;
                while ((tnode = walker.nextNode())) FanYi_PromptBar_WenBenJieDian(tnode);
            } catch (e) {}
            var leaves = root.querySelectorAll(
                'span, div, button, label, a, p, .ProseMirror p.is-editor-empty, ' +
                '.prompt-bar-dropdown-trigger, [class*="prompt-barmode"], [class*="prompt-bar-dropdown"], ' +
                '.inline-prompt-button-area *'
            );
            for (var li = 0; li < leaves.length; li++) {
                var el = leaves[li];
                if (el.closest('.monaco-editor .view-lines')) continue;
                FanYi_ShuXing(el);
                if (!el.querySelector('span, div, button')) FanYi_PromptBar_WenBen(el, 80);
            }
        }
        try { FanYi_TiJi_CaiDan(); } catch (e) {}
        FanYi_Monaco_Hover_Content(document.body);
    }

    // 翻译快速编辑条，并监听其后续变化
    function XiuZheng_KuaiSuBianJi_CmdK() {
        ZhiXing_PromptBar_FanYi();
        if (!window.__cursorPromptBarI18nObserver) {
            window.__cursorPromptBarI18nObserver = true;
            var promptBarTimer = null;
            var obs = new MutationObserver(function(mutations) {
                if (ZhengZaiPiLiangFanYi) return;
                var relevant = false;
                for (var mi = 0; mi < mutations.length; mi++) {
                    if (!Shi_ShuRu_Huo_DaiMa_BianYi(mutations[mi].target)) { relevant = true; break; }
                }
                if (!relevant) return;
                if (!HuoQu_PromptBar_Gen_JieDian().length &&
                    !document.querySelector('.contentWidgets .pure-ai-prompt-bar')) return;
                if (promptBarTimer) clearTimeout(promptBarTimer);
                promptBarTimer = setTimeout(function() {
                    promptBarTimer = null;
                    try { ZhiXing_PromptBar_FanYi(); } catch (e) {}
                }, 120);
            });
            obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
    }

    // 模型选择器按钮提示
    var MoXing_XuanZeQi_Attr_HINTS = [
        ['Switch Model', '切换模型'],
        ['Switch to Auto', '切换到自动'],
        ['Switch Model and Retry', '切换模型并重试']
    ];

    // 翻译模型选择器按钮上的文字和提示
    function XiuZheng_MoXing_XuanZeQi() {
        var attrHints = MoXing_XuanZeQi_Attr_HINTS;
        var picks = document.querySelectorAll(
            '[class*="model-picker"] button, [class*="model-picker"] [role="button"], ' +
            '[class*="model-picker"] [title], [class*="model-picker"] [aria-label]'
        );
        for (var i = 0; i < picks.length; i++) GengXin_Shuxing_Hints(picks[i], attrHints);
        XiuZheng_XiaLaKuang_MianBan();
        var hovers = document.querySelectorAll('.monaco-hover, .monaco-hover-content, [role="tooltip"]');
        for (var h = 0; h < hovers.length; h++) {
            var ht = hovers[h];
            if (ht.closest('.monaco-editor .view-lines')) continue;
            GengXin_Shuxing_Hints(ht, attrHints);
            TiHuan_WenBenJieDian_SuiPian(ht, XiaLa_MianBan_SuiPian);
        }
    }

    // 翻译对话界面中的共用标签和属性
    function XiuZheng_DuiHua_JieMian() {
        var attrHints = DuiHua_JieMian_GongYong_HINTS.concat(
            TiJi_CaiDan_HINTS,
            Agent_BianGeng_GongYong_HINTS,
            Agent_BianGeng_Attr_Extra_HINTS,
            DuiHua_JieMian_Attr_Only_HINTS
        );
        var textHints = DuiHua_JieMian_GongYong_HINTS.concat(
            TiJi_CaiDan_HINTS,
            Agent_BianGeng_GongYong_HINTS,
            Agent_BianGeng_Pending_HINTS,
            DuiHua_JieMian_WenBen_Only_HINTS,
            TongYong_CaiDan_HINTS
        );
        try { FanYi_TiJi_CaiDan(); } catch (e) {}
        try { XiuZheng_ZhiNengTi_ZhuangTai(); } catch (e) {}
        var btns = document.querySelectorAll(
            '[class*="composer"] button, [class*="chat-input"] button, [class*="aichat"] button, ' +
            '[class*="composer"] [role="button"], [class*="model-picker"] button, [class*="model-picker"] [role="button"], ' +
            '[class*="agent-changes"] button, [class*="agent-changes"] [role="button"], [class*="pending-changes"] button, ' +
            '[class*="review-control"] button, [class*="changes-header"] button, ' +
            '.context-view button, .monaco-menu .action-label'
        );
        for (var b = 0; b < btns.length; b++) GengXin_Shuxing_Hints(btns[b], attrHints);
        FanYi_Monaco_Hover_Content(document.body);
        var scopes = document.querySelectorAll(
            '[class*="context-usage"], [class*="contextUsage"], ' +
            '[class*="agent-changes"], [class*="AgentChanges"], [class*="pending-changes"], [class*="review-control"], ' +
            '[class*="changes-header"], [class*="diff-against"], ' +
            '.context-view, .monaco-menu, [role="menu"], [role="menuitem"], ' +
            '.ui-menu, .ui-slash-menu, .ui-slash-menu__content'
        );
        var scopeList = scopes.length ? Array.prototype.slice.call(scopes) : [document.body];
        FanYi_Scope_List_Hints(scopeList, textHints, {
            maxLen: 80,
            needleLen: 12,
            selector: 'span, div, label, button, a, li'
        });
    }

    // 翻译快速选择框的标题和列表项
    function XiuZheng_ZhuTi_XuanZe() {
        var widget = document.querySelector('.quick-input-widget, .monaco-quick-input');
        if (!widget) return;
        var titleEl = widget.querySelector('.quick-input-title');
        if (titleEl) {
            var titleText = GuiYiHua_WenBen(titleEl.textContent || '');
            if (titleText && titleText.length <= 120) {
                var titleTr = ChaZhao_FanYi(titleText);
                if (titleTr && titleTr !== titleText) {
                    KeYi_AnQuan_GaiXie_WenBen(titleEl, titleTr, [titleText.slice(0, 12)]);
                }
            }
        }
        var rows = widget.querySelectorAll('.quick-input-list .monaco-list-row');
        for (var i = 0; i < rows.length; i++) {
            var walker = document.createTreeWalker(rows[i], NodeFilter.SHOW_TEXT, null);
            var node;
            while ((node = walker.nextNode())) {
                var text = node.textContent;
                if (!text) continue;
                var trimmed = text.trim();
                if (!trimmed || trimmed.length > 80) continue;
                if (YiFanYi_ZhuTi_Ming(trimmed)) continue;
                var tr = ChaZhao_FanYi(trimmed);
                if (!tr || tr === trimmed) continue;
                var prefix = text.substring(0, text.indexOf(trimmed));
                var suffix = text.substring(text.indexOf(trimmed) + trimmed.length);
                XieRu_WenBen_JieDian(node, prefix + tr + suffix);
            }
        }
    }

    // 智能体反馈表单
    var ZhiNengTi_FanKui_HINTS = [
        ['How did the agent do?', '智能体表现如何？'],
        ['Response A is Better', '回复 A 更好'],
        ['Response B is Better', '回复 B 更好'],
        ['Did the agent understand what you wanted?', '智能体是否理解您的需求？'],
        ['Misunderstood task', '误解了任务'],
        ['Ignored constraint', '忽略了约束'],
        ['Wrong scope', '范围不对'],
        ['Was the response easy to read and use?', '回复是否易于阅读和使用？'],
        ['Visually hard to read', '视觉上难以阅读'],
        ['Wrote too much', '写得过多'],
        ['Explanation not trustworthy', '解释不可信'],
        ['Anything else?', '还有其他反馈吗？'],
        ['Add a comment...', '添加评论...'],
        ['Add a comment', '添加评论'],
        ['None', '无']
    ];

    // 翻译智能体反馈表单中的问题和选项
    function XiuZheng_ZhiNengTi_FanKui() {
        var hints = ZhiNengTi_FanKui_HINTS;
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('ZHI_NENG_TI_FAN_KUI')) return;
        var scopes = document.querySelectorAll(
            '[class*="feedback"], [class*="agent-feedback"], [class*="composer"] [class*="feedback"], ' +
            '.ui-dialog, .ui-alert-dialog, [class*="ui-dialog"], [role="dialog"]'
        );
        var scopeList = scopes.length ? Array.prototype.slice.call(scopes) : [document.body];
        FanYi_Scope_List_Hints(scopeList, hints, {
            maxLen: 200,
            needleLen: 10,
            selector: 'h1, h2, h3, h4, p, span, div, button, label, textarea, input',
            translatePlaceholder: true,
            skipChildQuery: 'button, textarea, input',
            allowTags: ['BUTTON', 'TEXTAREA', 'INPUT']
        });
    }

    // 翻译智能体变更审查区域的标签
    function XiuZheng_Agent_GengGai() {
        var hints = Agent_BianGeng_GongYong_HINTS.concat(
            Agent_BianGeng_WenBen_Extra_HINTS,
            TongYong_CaiDan_HINTS
        );
        var scopes = document.querySelectorAll(
            '[class*="agent-changes"], [class*="AgentChanges"], [class*="pending-changes"], ' +
            '[class*="review-control"], [class*="changes-header"], [class*="diff-against"], ' +
            '[class*="inline-diff"], [class*="diff-review"], [class*="review-widget"], ' +
            '[class*="composer-toolbar"], [class*="agent-review"]'
        );
        if (!scopes.length && !QuanJu_BaoHan_GuanJianCi_BiaoQian('AGENT_GENG_GAI')) return;
        var scopeList = scopes.length ? Array.prototype.slice.call(scopes) : [document.body];
        FanYi_Scope_List_Hints(scopeList, hints, {
            maxLen: 120,
            needleLen: 12,
            selector: 'button, span, div, label, a, [role="button"], [role="menuitem"]',
            skipChildQuery: 'button, input, textarea',
            allowTags: ['BUTTON', 'A']
        });
    }

    // 翻译编辑器标题栏动作的提示文字
    function XiuZheng_Editor_BiaoTi_TiShi() {
        var actions = document.querySelectorAll(
            '.editor-group-container .monaco-action-bar .action-item, ' +
            '.title-actions .action-item, .editor-actions .action-item, ' +
            '.tabs-and-actions-container .action-item, ' +
            '[class*="agent-pane"] .action-item, [class*="composer"] .title-actions .action-item, ' +
            '.pane-composite-part .action-item'
        );
        for (var i = 0; i < actions.length; i++) {
            var item = actions[i];
            FanYi_ShuXing(item);
            FanYi_ShuXing(item.querySelector('a, button, [role="button"]'));
            var label = item.querySelector('.action-label');
            if (label) {
                FanYi_ShuXing(label);
                var raw = (label.textContent || '').trim();
                if (raw && raw.length <= 80) {
                    var tr = ChaZhao_FanYi(raw);
                    if (!tr) {
                        for (var j = 0; j < Agent_TiShi_WenBen.length; j++) {
                            if (raw === Agent_TiShi_WenBen[j][0]) { tr = Agent_TiShi_WenBen[j][1]; break; }
                        }
                    }
                    if (tr && tr !== raw) XieRu_YuanSu_WenBen(label, tr);
                }
            }
        }
        try { FanYi_Cursor_Hover_Widget(document.body); } catch (e) {}
    }

    // 翻译 Composer 工具条上的按钮文字
    function XiuZheng_Composer_GongJuTiao() {
        var scopes = document.querySelectorAll(
            '[class*="composer"], [class*="aichat"], [class*="chat-input"], [class*="ComposerInput"], ' +
            '.pane-composite-part, [class*="agent-pane"], [class*="agent-changes"], [class*="pending-changes"]'
        );
        for (var r = 0; r < scopes.length; r++) {
            var scope = scopes[r];
            if (scope.closest('.monaco-editor, .monaco-diff-editor, .ui-code-block, .cm-editor, pre, code')) continue;
            var nodes = scope.querySelectorAll('button, [role="button"], label, .monaco-keybinding, [class*="keybinding"]');
            for (var i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                if (Shi_BianJiQi_QuYu(el) || el.closest('.monaco-editor, .monaco-diff-editor, .ui-code-block, .cm-editor, pre, code, .view-lines, .view-line')) continue;
                if (Shi_YongHu_ShuRu_QuYu(el)) continue;
                FanYi_ShuXing(el);
                if (el.querySelector('button, input, textarea, [contenteditable="true"]') && el.tagName !== 'BUTTON') continue;
                var raw = (el.textContent || '').trim();
                if (!raw || raw.length > 80) continue;
                if (/^Stop\s/i.test(raw)) {
                    var stopTr = raw.replace(/^Stop\s*/i, '停止 ');
                    if (stopTr !== raw) XieRu_YuanSu_WenBen(el, stopTr);
                    continue;
                }
                var tr = ChaZhao_FanYi(raw) || TiHuan_BuFen_WenBen(raw);
                if (tr && tr !== raw) KeYi_AnQuan_GaiXie_WenBen(el, tr, [raw.slice(0, 8)]);
            }
        }
    }

    // 翻译提及菜单和斜杠菜单中的条目
    function XiuZheng_TiJi_CaiDan() {
        var hasMentionUi = document.querySelector(
            '.ui-slash-menu, .ui-slash-menu__content, .ui-menu__content, [data-mention-menu-flat-index]'
        );
        if (!hasMentionUi && !QuanJu_BaoHan_GuanJianCi_BiaoQian('TI_JI_CAI_DAN')) return;
        try { FanYi_TiJi_CaiDan(); } catch (e) {}
        var mentionMenus = document.querySelectorAll(
            '.ui-slash-menu, .ui-slash-menu__content, .ui-menu__content, [data-mention-menu-flat-index]'
        );
        for (var mm = 0; mm < mentionMenus.length; mm++) {
            try { FanYi_UI_CaiDan(mentionMenus[mm]); } catch (e) {}
        }
    }

    // Composer 输入框占位提示
    var Composer_Placeholder_HINTS = [
        ['Edit selected code', '编辑所选代码'],
        ['Ask quick question', '快速提问'],
        ['Plan, Build, / for commands, @ for context', '计划、构建，输入 / 调用命令，输入 @ 添加上下文'],
        ['Plan, Build, / for skills, @ for context', '计划、构建，输入 / 调用技能，输入 @ 添加上下文'],
        ['Plan, search, build anything', '计划、搜索、构建任何内容'],
        ['Build, research, debug at a longer horizon', '在更长周期内构建、研究、调试'],
        ['Ask, learn, brainstorm', '提问、学习、头脑风暴'],
        ['Ask questions without making changes...', '在不修改代码的情况下提问...'],
        ['Ask questions without making changes', '在不修改代码的情况下提问'],
        ['Run Cursor anywhere...', '在任意位置运行 Cursor...'],
        ['Add a follow-up', '添加后续问题'],
        ['Work on explicitly added files (no tools)', '处理已明确添加的文件（无工具）'],
        ['Reject, suggest, follow up?', '拒绝、建议、继续跟进？'],
        ['Continue locally', '在本地继续'],
        ['Ask follow-ups in the worktree', '在工作树中继续追问'],
        ['Enter additional context about the issue', '输入有关问题的更多上下文'],
        ['Editing queued message...', '正在编辑排队消息...'],
        ['Tell Cursor to use subagents to break down tasks, do work in parallel, and preserve context', '让 Cursor 使用子智能体拆分任务、并行处理工作并保留上下文'],
        ['Use `/model` to pick the best model for your task. Composer offers a great balance for cost vs. capability', '使用 `/model` 为您的任务选择最佳模型。Composer 在成本与能力之间提供了绝佳平衡。'],
        ['Use `/babysit` to triage PR comments, fix CI failures, and clear conflicts', '使用 `/babysit` 处理 PR 评论、修复 CI 失败并解决冲突'],
        ['Use `/create-hook` to control and extend the agent loop with custom scripts', '使用 `/create-hook` 通过自定义脚本控制和扩展智能体循环'],
        ['Use automations to save time on repetitive tasks with always-on agents', '使用自动化处理重复性任务，借助始终在线的智能体节省时间'],
        ['Message Cursor', '向 Cursor 发送消息'],
        ["Let's kick something off", '让我们开始吧']
    ];

    // 空状态提示按空白拆成逐词节点，命令名单独成芯片。按整句翻译后再写回前后文
    function XiuZheng_FenDuan_TiShi(el) {
        if (!el) return;
        var raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!raw || raw.length > 500) return;
        var tr = ChaZhao_FanYi(raw);
        if (!tr || tr === raw) return;
        var spans = el.querySelectorAll('span');
        var chips = [];
        for (var s = 0; s < spans.length; s++) {
            var token = (spans[s].textContent || '').replace(/\s+/g, '');
            if (!/^[\/@][A-Za-z0-9][A-Za-z0-9_-]*$/.test(token)) continue;
            var nested = false;
            for (var d = 0; d < spans.length; d++) {
                if (d !== s && spans[s].contains(spans[d]) && /^[\/@][A-Za-z0-9][A-Za-z0-9_-]*$/.test((spans[d].textContent || '').replace(/\s+/g, ''))) {
                    nested = true;
                    break;
                }
            }
            if (!nested) chips.push(spans[s]);
        }
        var texts = [];
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) texts.push(node);
        if (!texts.length) return;
        // 只改这个提示容器里的文本，不走代码行写入门
        function xie(target, value) {
            if (target && target.nodeValue !== value) target.nodeValue = value;
        }
        if (!chips.length) {
            xie(texts[0], tr);
            for (var t = 1; t < texts.length; t++) xie(texts[t], '');
            return;
        }
        var segments = [];
        var cursor = 0;
        for (var c = 0; c < chips.length; c++) {
            var chipToken = (chips[c].textContent || '').replace(/\s+/g, '');
            var at = tr.indexOf(chipToken, cursor);
            if (at < 0) return;
            segments.push(tr.slice(cursor, at));
            cursor = at + chipToken.length;
        }
        segments.push(tr.slice(cursor));
        var buckets = [[]];
        var nextChip = 0;
        for (var n = 0; n < texts.length; n++) {
            if (nextChip < chips.length && chips[nextChip].contains(texts[n])) {
                buckets.push([]);
                var current = chips[nextChip];
                nextChip++;
                while (n < texts.length && current.contains(texts[n])) n++;
                n--;
                continue;
            }
            buckets[buckets.length - 1].push(texts[n]);
        }
        if (buckets.length !== segments.length) return;
        for (var b = 0; b < buckets.length; b++) {
            if (!buckets[b].length) continue;
            xie(buckets[b][0], segments[b]);
            for (var k = 1; k < buckets[b].length; k++) xie(buckets[b][k], '');
        }
    }

    // 翻译空状态轮换提示，保留 /命令 与 @提及
    function XiuZheng_KongZhuangTai_TiShi() {
        var items = document.querySelectorAll('[data-component="glass-empty-state-rotating-tips"] .ui-text-roll__item');
        for (var i = 0; i < items.length; i++) XiuZheng_FenDuan_TiShi(items[i]);
    }

    // 翻译 Composer 输入框的占位提示
    function XiuZheng_Composer_Placeholder() {
        try { XiuZheng_KongZhuangTai_TiShi(); } catch (e) {}
        GengXin_Placeholder_ShuXing(document.body);
        var hints = Composer_Placeholder_HINTS;
        var prose = document.querySelectorAll(
            '.ProseMirror [data-placeholder], .ProseMirror p.is-editor-empty, ' +
            '.ui-prompt-input-editor [data-placeholder], [class*="prompt-input"] [data-placeholder], ' +
            '[class*="composer"] [data-placeholder], [contenteditable="true"][data-placeholder], ' +
            '.prompt-bar-container [data-placeholder], .prompt-bar-container [placeholder], ' +
            '.prompt-bar-input [data-placeholder], .prompt-edit-input [data-placeholder], ' +
            '.pure-ai-prompt-bar [data-placeholder], .ui-prompt-input [data-placeholder], ' +
            '.ui-prompt-input .ProseMirror, .ui-prompt-input .tiptap'
        );
        for (var m = 0; m < prose.length; m++) {
            var pel2 = prose[m];
            if (pel2.closest('.monaco-editor')) continue;
            var dph = pel2.getAttribute('data-placeholder');
            if (!dph) continue;
            var dtr = ChaZhao_FanYi(dph) || TiHuan_BuFen_WenBen(dph);
            if (dtr && dtr !== dph) pel2.setAttribute('data-placeholder', dtr);
        }
        var placeholders = document.querySelectorAll(
            '[class*="composer"] [class*="placeholder"], [class*="prompt"] [class*="placeholder"], ' +
            '.ui-prompt-input [class*="placeholder"], .pure-ai-prompt-bar [class*="placeholder"]'
        );
        FanYi_Gen_List_Hints(placeholders, hints, {
            needleLen: 12,
            leafOnly: true,
            skipMonacoEditor: true
        });
    }

    // 编辑器选区工具条标签
    var BianJiQi_XuanZe_HINTS = [
        ['Add to Chat', '添加到聊天'],
        ['Add to Side Chat', '添加到侧边对话'],
        ['Quick Edit', '快速编辑'],
        ['Create Rule', '创建规则'],
        ['Add Symbol to Current Chat', '将符号添加到当前对话'],
        ['Add Symbol to New Chat', '将符号添加到新对话']
    ];

    // 翻译编辑器选区工具条上的固定标签
    function XiuZheng_BianJiQi_XuanZe() {
        var labels = BianJiQi_XuanZe_HINTS;
        // 把标签中的指定原文替换成译文
        function GengXin_BiaoQian(el, from, to) {
            if (!el || !from || !to) return false;
            var raw = (el.textContent || '').trim();
            if (raw === from) return XieRu_YuanSu_WenBen(el, to);
            if (raw.indexOf(from) >= 0) {
                var neo = raw.split(from).join(to);
                if (neo !== raw) return XieRu_YuanSu_WenBen(el, neo);
            }
            return false;
        }
        // Cursor 选区浮动条：.cursorHoverWidget > .hoverButton > .text
        var hoverTexts = document.querySelectorAll('.cursorHoverWidget .hoverButton .text');
        for (var h = 0; h < hoverTexts.length; h++) {
            var ht = hoverTexts[h];
            if (ht.closest('.view-lines')) continue;
            var hraw = (ht.textContent || '').trim();
            FanYi_ShuXing(ht.parentElement || ht);
            for (var hj = 0; hj < labels.length; hj++) {
                if (GengXin_BiaoQian(ht, labels[hj][0], labels[hj][1])) break;
            }
            if (!hraw) continue;
            var htr = ChaZhao_FanYi(hraw);
            if (htr && htr !== hraw) XieRu_YuanSu_WenBen(ht, htr);
        }
        var hoverButtons = document.querySelectorAll('.cursorHoverWidget .hoverButton');
        for (var b = 0; b < hoverButtons.length; b++) {
            var btn = hoverButtons[b];
            FanYi_ShuXing(btn);
            var title = btn.getAttribute('title') || btn.getAttribute('aria-label') || '';
            for (var bj = 0; bj < labels.length; bj++) {
                if (title === labels[bj][0]) {
                    btn.setAttribute('title', labels[bj][1]);
                    btn.setAttribute('aria-label', labels[bj][1]);
                }
            }
        }
        var roots = document.querySelectorAll('.monaco-editor .contentWidgets, .monaco-editor .overlayWidgets, .context-view, .monaco-menu');
        for (var r = 0; r < roots.length; r++) {
            if (roots[r].classList && (roots[r].classList.contains('context-view') || roots[r].classList.contains('monaco-menu'))) {
                FanYi_Monaco_CaiDan(roots[r]);
                continue;
            }
            var nodes = roots[r].querySelectorAll('div, span, button, a, .action-label');
            for (var i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                if (el.closest('.view-lines')) continue;
                if (el.closest('.cursorHoverWidget .hoverButton') && el.classList && el.classList.contains('commandHelpText')) continue;
                FanYi_ShuXing(el);
                if (el.querySelector('div, span, button') && !el.classList.contains('text')) continue;
                var raw = el.textContent || '';
                if (!raw || raw.length > 80) continue;
                var text = GuiYiHua_WenBen(raw);
                for (var j = 0; j < labels.length; j++) {
                    if (text === labels[j][0]) {
                        KeYi_AnQuan_GaiXie_WenBen(el, labels[j][1], [labels[j][0]]);
                        break;
                    }
                }
            }
        }
    }

    // 待确认更改菜单的识别词，含原文和译文
    var DaiQueRen_GaiDong_GuanJianCi = [
        'Pending Changes', 'Changes waiting to be confirmed', 'Keep All', 'Undo All',
        'Find Issues', '待确认更改', '等待确认的更改', '全部保留', '全部撤销', '查找问题'
    ];

    // 翻译待确认更改菜单中的操作项
    function XiuZheng_DaiQueRen_GaiDong_CaiDan() {
        var menus = document.querySelectorAll(
            '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"]'
        );
        if (!menus.length) return;
        var panelHints = DaiQueRen_GaiDong_GuanJianCi;
        if (!CaiDan_BaoHan_GuanJianCi(menus, panelHints) &&
            !document.querySelector('[class*="pending-changes"], [class*="agent-changes"], [class*="review-control"]')) {
            return;
        }
        for (var m = 0; m < menus.length; m++) {
            try { FanYi_Monaco_CaiDan(menus[m]); } catch (e) {}
            var labels = menus[m].querySelectorAll('.action-label');
            for (var i = 0; i < labels.length; i++) {
                GengXin_CaiDan_WenBen(labels[i], TongYong_CaiDan_HINTS);
            }
        }
    }

    var ZhengZai_DingBu_FanYi = false; // 正在写回顶部菜单，避免观察器重入
    var DingBu_CaiDan_Raf = 0; // 顶部菜单翻译的动画帧编号

    // 把顶部 File、Edit 等菜单名解析成中文
    function JieXi_DingBu_CaiDan_BiaoQian(text) {
        var norm = GuiYiHua_WenBen(text || '');
        if (!norm) return null;
        if (/^运行(\([A-Za-z]\))?$/.test(norm)) return null;
        var m = /^(File|Edit|Selection|View|Go|Terminal|Help)(?:\s*\(([A-Za-z])\))?$/.exec(norm);
        if (!m) return null;
        var zh = null;
        for (var i = 0; i < DingBu_CaiDan_HINTS.length; i++) {
            if (DingBu_CaiDan_HINTS[i][0] === m[1]) {
                zh = DingBu_CaiDan_HINTS[i][1];
                break;
            }
        }
        if (!zh) return null;
        return m[2] ? (zh + '(' + m[2] + ')') : zh;
    }

    // 翻译窗口顶部菜单栏的标题
    function XiuZheng_DingBu_CaiDanTiao() {
        if (ZhengZai_DingBu_FanYi) return;
        ZhengZai_DingBu_FanYi = true;
        try {
            var bars;
            try {
                bars = document.querySelectorAll(
                    '.menubar, [role="menubar"], .titlebar .menubar, .part.titlebar [role="menubar"]'
                );
            } catch (e) { return; }
            if (!bars.length) return;
            var seen = new Set();
            for (var b = 0; b < bars.length; b++) {
                var bar = bars[b];
                if (!bar || seen.has(bar)) continue;
                seen.add(bar);
                var buttons;
                try {
                    buttons = bar.querySelectorAll('.menubar-menu-button, [role="menuitem"]');
                } catch (e) { continue; }
                if (!buttons.length) {
                    try { buttons = bar.querySelectorAll('.menubar-menu-title'); } catch (e2) { continue; }
                }
                for (var i = 0; i < buttons.length; i++) {
                    var el = buttons[i];
                    if (!el) continue;
                    var titleEl = el;
                    try {
                        var inner = el.querySelector && el.querySelector('.menubar-menu-title');
                        if (inner) titleEl = inner;
                    } catch (e3) {}
                    var raw = GuiYiHua_WenBen(titleEl.textContent || '');
                    if (/[\u4e00-\u9fff]/.test(raw)) continue;
                    var tr = JieXi_DingBu_CaiDan_BiaoQian(raw);
                    if (tr && tr !== raw) {
                        try { XieRu_YuanSu_WenBen(titleEl, tr); } catch (e4) {}
                    }
                    try {
                        var aria = el.getAttribute && el.getAttribute('aria-label');
                        if (aria && !/[\u4e00-\u9fff]/.test(aria)) {
                            var atr = JieXi_DingBu_CaiDan_BiaoQian(aria);
                            if (atr && atr !== aria) el.setAttribute('aria-label', atr);
                        }
                    } catch (e5) {}
                }
            }
        } finally {
            ZhengZai_DingBu_FanYi = false;
        }
    }

    // 排队刷新顶部菜单栏，并再跟一帧
    function PaiDui_DingBu_CaiDanTiao() {
        try { XiuZheng_DingBu_CaiDanTiao(); } catch (e) {}
        if (DingBu_CaiDan_Raf) return;
        var times = 0;
        // 再跟两帧，补上晚出现的菜单标题
        function zhuiZong() {
            DingBu_CaiDan_Raf = 0;
            try { XiuZheng_DingBu_CaiDanTiao(); } catch (e) {}
            times++;
            if (times < 2) {
                DingBu_CaiDan_Raf = requestAnimationFrame(zhuiZong);
            }
        }
        DingBu_CaiDan_Raf = requestAnimationFrame(zhuiZong);
    }

    // 监听顶部菜单栏的出现和变化
    function AnZhuang_DingBu_CaiDan_GuanCha() {
        if (window.__cursorMenubarI18n) return;
        window.__cursorMenubarI18n = true;
        var obs = null;
        // 给一个顶部菜单栏绑定变更观察
        function bangDing(bar) {
            if (!bar || bar.__cursorMenubarBound) return;
            bar.__cursorMenubarBound = true;
            if (!obs) {
                obs = new MutationObserver(function() {
                    PaiDui_DingBu_CaiDanTiao();
                });
            }
            try {
                obs.observe(bar, { childList: true, subtree: true, characterData: true });
            } catch (e) {}
        }
        // 扫描并绑定当前已有的顶部菜单栏
        function saoMiao() {
            try {
                var bars = document.querySelectorAll('.menubar, [role="menubar"]');
                for (var i = 0; i < bars.length; i++) bangDing(bars[i]);
            } catch (e) {}
            PaiDui_DingBu_CaiDanTiao();
        }
        saoMiao();
        setTimeout(saoMiao, 400);
        window.addEventListener('focus', function() {
            PaiDui_DingBu_CaiDanTiao();
        }, true);
    }

    // 翻译状态栏和提交评分中的统计文案
    function XiuZheng_TiJiao_PingFen() {
        var roots = [];
        var seen = new Set();
        // 去重后加入提交评分所在区域
        function pushRoot(el) {
            if (!el || seen.has(el)) return;
            seen.add(el);
            roots.push(el);
        }
        try {
            var sb = document.querySelectorAll(
                '.part.statusbar, .statusbar, [id="workbench.parts.statusbar"], .statusbar-item'
            );
            for (var i = 0; i < sb.length; i++) pushRoot(sb[i]);
            var hovers = document.querySelectorAll(XuanFu_TiShi_XuanZeQi);
            for (var h = 0; h < hovers.length; h++) {
                var t = hovers[h].textContent || '';
                if (/Most Recent Commit Scored|AI-Generated:|Agent Stats:|Tab Stats:|Total Changes:/.test(t)) {
                    pushRoot(hovers[h]);
                }
            }
        } catch (e) { return; }
        for (var r = 0; r < roots.length; r++) {
            var root = roots[r];
            try { FanYi_ShuXing(root); } catch (e2) {}
            var walker;
            try { walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null); } catch (e3) { continue; }
            var tnode;
            while ((tnode = walker.nextNode())) {
                try {
                    if (tnode.parentElement && tnode.parentElement.closest(TiaoGuo_XuanZeQi)) continue;
                } catch (e4) {}
                var text = tnode.textContent;
                if (!text) continue;
                var tr = FanYi_TiJiao_PingFen_WenBen(text) || ChaZhao_FanYi(text) || TiHuan_BuFen_WenBen(text);
                if (tr && tr !== text) XieRu_WenBen_JieDian(tnode, tr);
            }
        }
    }

    // 翻译编辑器右键菜单，先确认菜单里有目标词
    function XiuZheng_BianJiQi_YouJianCaiDan() {
        var menus = document.querySelectorAll(
            '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"]'
        );
        if (!menus.length) return;

        for (var m = 0; m < menus.length; m++) {
            var menu = menus[m];
            if (menu.closest('.monaco-editor .view-lines')) continue;
            try { FanYi_Monaco_CaiDan(menu); } catch (e) {}
            try { FanYi_BianJiQi_CaiDan_TiaoMu(menu); } catch (e) {}
        }
    }

    // 判断一组菜单的文本是否包含任一关键词
    function CaiDan_BaoHan_GuanJianCi(menus, words) {
        if (!menus || !menus.length) return false;
        for (var m = 0; m < menus.length; m++) {
            var text = GuiYiHua_WenBen(menus[m].textContent || '');
            if (!text) continue;
            for (var i = 0; i < words.length; i++) {
                if (text.indexOf(words[i]) !== -1) return true;
            }
        }
        return false;
    }

    // 聊天历史菜单的识别词，含原文和译文
    var LiaoTian_LiShi_GuanJianCi = [
        'Search Agents', 'Chat History', 'Today', 'Yesterday', 'Older', 'Archived',
        'Open in New Tab', 'Rename Chat', 'Restore', 'Pin', 'Keep All', 'Undo All', 'Draft',
        'Fork Chat', 'Mark as Unread', 'Archive Prior Chats', 'Delete', 'Rename',
        'Show more', 'Show less', 'Show 1 more', 'New Chat', 'Agent Conversations',
        '已归档', '聊天历史', '搜索智能体', '今天', '昨天', '更早', '固定', '恢复', '草稿', '再显示',
        '分叉对话', '标记为未读', '归档较早的对话', '全部保留', '全部撤销', '在新标签页中打开'
    ];

    // 聊天历史搜索框占位符
    var LiaoTian_SouSuo_ZhanWei = ['Search Agents...', '搜索智能体...'];

    // 聊天历史草稿前缀
    var LiaoTian_LiShi_CaoGao_SuiPian = [
        ['Draft: ', '草稿：']
    ];

    // 翻译聊天历史菜单中的日期和操作项
    function XiuZheng_LiaoTian_LiShi() {
        var menus = document.querySelectorAll(
            '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"], ' +
            '.ui-menu, .ui-menu__layout, .ui-menu__content'
        );
        var chatHints = LiaoTian_LiShi_GuanJianCi;
        var hasChatHistoryPanel = document.querySelector(
            '[class*="chat-history"], [class*="ChatHistory"], [class*="agent-history"], [class*="AgentHistory"], ' +
            '[id*="agents"], [class*="agents-list"], [class*="AgentsList"]'
        );
        var hasAgentSearch = document.querySelector(
            'input[placeholder="Search Agents..."], input[aria-placeholder="Search Agents..."], ' +
            '[data-placeholder="Search Agents..."], [placeholder="Search Agents..."]'
        );
        if (!hasChatHistoryPanel && !hasAgentSearch && (!menus.length || !CaiDan_BaoHan_GuanJianCi(menus, chatHints))) return;

        try { FanYi_LiaoTian_CaiDan(); } catch (e) {}

        var textHints = LiaoTian_CaiDan_HINTS.concat(LiaoTian_LiShi_Extra_HINTS);

        try { GengXin_Placeholder_ShuXing(document.body); } catch (e) {}
        var searchRoots = hasChatHistoryPanel ? [hasChatHistoryPanel] : (hasAgentSearch ? [hasAgentSearch.closest('[class*="agent"], [class*="chat"], [class*="Chat"], [role="dialog"], .pane-composite-part') || document.body] : [document.body]);
        for (var sr = 0; sr < searchRoots.length; sr++) {
            var sroot = searchRoots[sr];
            if (!sroot) continue;
            try { GengXin_Placeholder_ShuXing(sroot); } catch (e) {}
            var searchInputs = sroot.querySelectorAll(
                'input, textarea, [role="searchbox"], [role="combobox"], [contenteditable="true"]'
            );
            for (var si = 0; si < searchInputs.length; si++) {
                try { FanYi_ShuXing(searchInputs[si]); } catch (e) {}
            }
            var phOverlays = sroot.querySelectorAll('[class*="placeholder"], [class*="Placeholder"]');
            for (var po = 0; po < phOverlays.length; po++) {
                var pov = phOverlays[po];
                if (pov.closest('.monaco-editor')) continue;
                var povText = GuiYiHua_WenBen(pov.textContent || '');
                if (povText === LiaoTian_SouSuo_ZhanWei[0]) {
                    KeYi_AnQuan_GaiXie_WenBen(pov, LiaoTian_SouSuo_ZhanWei[1], ['Search Agents']);
                }
            }
        }

        for (var m = 0; m < menus.length; m++) {
            FanYi_Monaco_CaiDan(menus[m]);
            FanYi_UI_CaiDan(menus[m]);
        }

        var scopes = document.querySelectorAll(
            '[class*="agent"], [class*="chat-history"], [class*="ChatHistory"], ' +
            '[id*="agents"], .pane-composite-part, .context-view, .monaco-menu, ' +
            '.ui-menu, .ui-menu__layout, .ui-menu__content'
        );
        var scopeList = scopes.length ? Array.prototype.slice.call(scopes) : [document.body];
        for (var r = 0; r < scopeList.length; r++) {
            FanYi_Scope_YeZi_Hints(scopeList[r], textHints, { maxLen: 120, needleLen: 8 });
        }

        TiHuan_WenBenJieDian_SuiPian(document.body, LiaoTian_LiShi_CaoGao_SuiPian);
    }

    // 智能体模式切换菜单
    var ZhiNengTi_MoShi_HINTS = [
        ['Switch Agent Mode', '切换智能体模式'],
        ['Agent Mode', '智能体模式'],
        ['Plan', '计划'],
        ['Debug', '调试'],
        ['Multitask', '多任务'],
        ['Ask', '询问'],
        ['Create detailed plans for accomplishing tasks', '为完成任务创建详细计划'],
        ['Create structured plans with implementation steps', '创建包含实施步骤的结构化计划'],
        ['Systematically diagnose and fix bugs using runtime traces', '使用运行时追踪系统诊断并修复缺陷'],
        ['Run and coordinate multiple tasks in parallel', '并行运行并协调多个任务'],
        ['Ask Cursor questions about your codebase', '就代码库向 Cursor 提问'],
        ['Generate an implementation plan', '生成实现计划'],
        ['Pinpoint the root cause of an issue', '定位问题的根本原因'],
        ['Orchestrate multiple subagents in parallel', '并行编排多个子智能体'],
        ['Answer questions without making edits', '回答问题但不进行编辑'],
        ['Search skills, context, chats...', '搜索技能、上下文、对话...'],
        ['Plan, search, make edits, run commands', '规划、搜索、编辑、运行命令'],
        ['Using terminal selections', '使用终端选区'],
        ['Using image', '使用图像'],
        ['Using video', '使用视频'],
        ['Empty message...', '空消息...'],
        ['Message is too long to display', '消息过长无法显示']
    ];

    // 翻译智能体模式切换菜单
    function XiuZheng_ZhiNengTi_MoShi() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('ZHI_NENG_TI_MO_SHI')) return;
        var hints = ZhiNengTi_MoShi_HINTS;
        var roots = document.querySelectorAll('.monaco-hover, .monaco-hover-content, [role="tooltip"], [role="menu"], [role="menuitem"], .context-view, .monaco-menu, div, span, p');
        FanYi_Gen_List_Hints(roots, hints, { maxLen: 200, needleLen: 8, leafOnly: true });
    }

    // 浏览器 webview 页面文案
    var LiuLanQi_Webview_CiDian = [
        ['Browser', '浏览器'],
        ['Enter a URL above, or instruct the Agent to navigate and use the browser', '在上方输入 URL，或指示智能体导航并使用浏览器'],
        ['Enter a URL above, or instruct the Agent to navigate and use the browser.', '在上方输入 URL，或指示智能体导航并使用浏览器。'],
        ['Search or enter URL', '搜索或输入 URL'],
        ['Connection Failed', '连接失败'],
        ['Restart Browser', '重启浏览器'],
        ['Reload', '重新加载'],
        ['Show Details', '显示详情'],
        ['Hide Details', '隐藏详情'],
        ['Connection was refused.', '连接被拒绝。'],
        ['Connection was refused', '连接被拒绝'],
        ["This site can't be reached", '无法访问此网站'],
        ['This site can&#39;t be reached', '无法访问此网站'],
        ['Certificate Error', '证书错误'],
        ['The certificate for this site is not trusted', '此站点的证书不受信任'],
        ['Copy error details', '复制错误详情'],
        ['Inspect Element', '检查元素'],
        ['Copy Messages', '复制消息'],
        ['Fork Conversation', '分叉对话']
    ];

    function HuoQu_LiuLanQi_Webview_CiDian_WenBen() {
        var parts = [];
        for (var i = 0; i < LiuLanQi_Webview_CiDian.length; i++) {
            parts.push(JSON.stringify(LiuLanQi_Webview_CiDian[i][0]) + ':' + JSON.stringify(LiuLanQi_Webview_CiDian[i][1]));
        }
        return parts.join(',');
    }

    // 生成注入到浏览器 webview 的翻译脚本
    function HuoQu_LiuLanQi_Webview_FanYi_JiaoBen() {
        return '(function(){try{' +
            'var E={' + HuoQu_LiuLanQi_Webview_CiDian_WenBen() + '};' +
            'function tx(t){if(t==null)return t;var s=String(t).trim();if(E[s])return E[s];var o=String(t);for(var k in E){if(o.indexOf(k)!==-1)o=o.split(k).join(E[k]);}return o;}' +
            'function fix(sel,attr){var els=document.querySelectorAll(sel);for(var i=0;i<els.length;i++){var el=els[i];if(attr){var v=el.getAttribute(attr);if(v){var tr=tx(v);if(tr&&tr!==v)el.setAttribute(attr,tr);}}else{var raw=(el.textContent||"").trim();if(!raw)continue;var tr2=tx(raw);if(tr2&&tr2!==raw)el.textContent=tr2;}}}' +
            'fix(".browser-welcome-title");fix(".browser-welcome-subtitle");' +
            'fix(".browser-error-title,.glass-browser-error-title");' +
            'fix(".browser-error-restart-button,.glass-browser-error-page button");' +
            'fix(".browser-error-details-toggle");' +
            'fix(".browser-error-copy-button","title");' +
            'var sub=document.querySelector(".browser-error-subtitle,.glass-browser-error-subtitle");' +
            'if(sub){var walker=document.createTreeWalker(sub,NodeFilter.SHOW_TEXT,null);var n;while((n=walker.nextNode())){var raw3=(n.textContent||"").trim();if(!raw3)continue;var tr3=tx(raw3);if(tr3&&tr3!==raw3)n.textContent=tr3;}}' +
            'function fixMenu(){fix("[role=menuitem]");fix("menuitem");fix(".context-menu-item");}' +
            'document.addEventListener("contextmenu",function(){setTimeout(fixMenu,16);setTimeout(fixMenu,120);setTimeout(fixMenu,400);},true);' +
            '}catch(e){}})();';
    }

    // 在一个 webview 里执行浏览器页面翻译
    function ZhiXing_LiuLanQi_Webview_FanYi(wv) {
        if (!wv || typeof wv.executeJavaScript !== 'function') return;
        var script = HuoQu_LiuLanQi_Webview_FanYi_JiaoBen();
        try {
            wv.executeJavaScript(script, false).catch(function() {});
        } catch (e) {}
    }

    // 对页面上全部 webview 执行翻译
    function FanYi_LiuLanQi_Webview() {
        try {
            var webviews = document.querySelectorAll('webview');
            for (var i = 0; i < webviews.length; i++) {
                ZhiXing_LiuLanQi_Webview_FanYi(webviews[i]);
            }
        } catch (e) {}
    }

    // 绑定 webview 的加载事件并重复翻译
    function BangDing_LiuLanQi_Webview(wv) {
        if (!wv || wv.__cursorLiuLanQiFanYiBound) return;
        wv.__cursorLiuLanQiFanYiBound = true;
        var run = function() {
            FanYi_LiuLanQi_Webview();
            setTimeout(FanYi_LiuLanQi_Webview, 120);
            setTimeout(FanYi_LiuLanQi_Webview, 500);
            setTimeout(FanYi_LiuLanQi_Webview, 1200);
        };
        try {
            wv.addEventListener('dom-ready', run);
            wv.addEventListener('did-finish-load', run);
            wv.addEventListener('did-fail-load', run);
            wv.addEventListener('did-navigate', run);
            wv.addEventListener('did-navigate-in-page', run);
        } catch (e) {}
        run();
    }

    // 监听新出现的 webview 并绑定翻译
    function AnZhuang_LiuLanQi_Webview_GuanCha() {
        if (window.__cursorBrowserWebviewObs) return;
        try {
            var existing = document.querySelectorAll('webview');
            for (var e = 0; e < existing.length; e++) BangDing_LiuLanQi_Webview(existing[e]);
            var obs = new MutationObserver(function(muts) {
                for (var i = 0; i < muts.length; i++) {
                    var added = muts[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (!node || node.nodeType !== 1) continue;
                        if (node.tagName === 'WEBVIEW') BangDing_LiuLanQi_Webview(node);
                        if (node.querySelectorAll) {
                            var wvs = node.querySelectorAll('webview');
                            for (var k = 0; k < wvs.length; k++) BangDing_LiuLanQi_Webview(wvs[k]);
                        }
                    }
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            window.__cursorBrowserWebviewObs = obs;
        } catch (e) {}
    }

    // 翻译内置浏览器工具栏的按钮和地址栏
    function XiuZheng_LiuLanQi_GongJuTiao() {
        if (!document.querySelector(
            '.browser-tools, .browser-navbar, .browser-tab, [class*="browser-tab"], [class*="browser-navbar"], [class*="browser-tools"]'
        )) return;
        var hints = LiuLanQi_GongJuTiao_HINTS;
        var urlInputs = document.querySelectorAll(
            '.browser-navbar input, .browser-tools input, [class*="browser-navbar"] input, ' +
            '[class*="browser-tools"] input, [class*="address-bar"] input, [class*="url-input"] input'
        );
        for (var u = 0; u < urlInputs.length; u++) {
            var inp = urlInputs[u];
            var ph = inp.getAttribute('placeholder');
            if (ph) {
                var ptr = ChaZhao_FanYi(ph) || TiHuan_BuFen_WenBen(ph);
                if (ptr && ptr !== ph) inp.setAttribute('placeholder', ptr);
            }
            FanYi_ShuXing(inp);
        }
        // 更新浏览器按钮的提示属性
        function GengXin_AnNiu_TiShi(btn) {
            GengXin_Shuxing_Hints(btn, hints);
        }
        // 更新浏览器工具栏的叶子文本
        function GengXin_WenBen(el) {
            if (!el || el.closest('.monaco-editor .view-lines')) return;
            if (el.querySelector('div, span, button') && el.childElementCount > 0) return;
            GengXin_WenBen_YeZi_Hints(el, hints, { maxLen: 60, needleLen: 10 });
        }
        var toolbarBtns = document.querySelectorAll(
            '.browser-tools button, .browser-navbar button, .nav-button, .nav-controls button, ' +
            '[class*="browser-tab"] button, [class*="browser-navbar"] button, [class*="browser-tools"] button, ' +
            '.browser-navbar [role="button"], .browser-tools [role="button"], ' +
            '[class*="browser-navbar"] [role="button"], [class*="browser-tools"] [role="button"]'
        );
        for (var b = 0; b < toolbarBtns.length; b++) GengXin_AnNiu_TiShi(toolbarBtns[b]);
        var hovers = document.querySelectorAll('.monaco-hover, .monaco-hover-content, [role="tooltip"]');
        for (var h = 0; h < hovers.length; h++) {
            var ht = hovers[h];
            if (ht.closest('.monaco-editor .view-lines')) continue;
            GengXin_AnNiu_TiShi(ht);
            var nodes = ht.querySelectorAll('span, div, p, .monaco-action-bar .action-label');
            for (var n = 0; n < nodes.length; n++) GengXin_WenBen(nodes[n]);
        }
        var kongBaiHints = LiuLanQi_Webview_CiDian.slice(0, 3);
        var kongBaiScopes = document.querySelectorAll(
            '.browser-tab, [class*="browser-tab"], [class*="browser-view"], [class*="browser-empty"], ' +
            '[class*="browser-navbar"], .browser-tools, iframe + div, [class*="simple-browser"]'
        );
        var kongBaiList = kongBaiScopes.length ? Array.prototype.slice.call(kongBaiScopes) : [];
        for (var kb = 0; kb < kongBaiList.length; kb++) {
            var kbRoot = kongBaiList[kb];
            if (!kbRoot || kbRoot.closest('.monaco-editor .view-lines')) continue;
            TiHuan_WenBenJieDian_SuiPian(kbRoot, kongBaiHints);
            var kbEls = kbRoot.querySelectorAll('div, span, p, h1, h2, h3, label');
            for (var ke = 0; ke < kbEls.length; ke++) {
                var kbEl = kbEls[ke];
                if (kbEl.closest('.monaco-editor .view-lines')) continue;
                var kbText = GuiYiHua_WenBen(kbEl.textContent || '');
                if (!kbText || kbText.length > 200) continue;
                if (kbEl.querySelector('div, span, p') && kbEl.childElementCount > 2) continue;
                for (var kh = 0; kh < kongBaiHints.length; kh++) {
                    if (kbText === kongBaiHints[kh][0]) {
                        KeYi_AnQuan_GaiXie_WenBen(kbEl, kongBaiHints[kh][1], [kongBaiHints[kh][0].slice(0, 16)]);
                        break;
                    }
                }
                var kbTr = ChaZhao_FanYi(kbText) || TiHuan_BuFen_WenBen(kbText);
                if (kbTr && kbTr !== kbText) KeYi_AnQuan_GaiXie_WenBen(kbEl, kbTr, [kbText.slice(0, 16)]);
            }
        }
        if (!window.__cursorBrowserToolbarHoverHook) {
            window.__cursorBrowserToolbarHoverHook = true;
            document.addEventListener('mouseover', function(ev) {
                var btn = ev.target && ev.target.closest && ev.target.closest(
                    '.browser-tools button, .browser-navbar button, .nav-button, .nav-controls button, ' +
                    '[class*="browser-tab"] button, [class*="browser-navbar"] button, [class*="browser-tools"] button, ' +
                    '.browser-navbar [role="button"], .browser-tools [role="button"], ' +
                    '[class*="browser-navbar"] [role="button"], [class*="browser-tools"] [role="button"]'
                );
                if (btn) GengXin_AnNiu_TiShi(btn);
                var tip = ev.target && ev.target.closest && ev.target.closest('.monaco-hover, [role="tooltip"]');
                if (tip) {
                    var kids = tip.querySelectorAll('span, div, p');
                    for (var k = 0; k < kids.length; k++) GengXin_WenBen(kids[k]);
                }
            }, true);
        }
        try { FanYi_LiuLanQi_Webview(); } catch (e) {}
    }

    // 立即并延迟重试浏览器工具栏翻译
    function YanChi_FanYi_LiuLanQi_GongJuTiao() {
        // 执行一次浏览器工具栏翻译
        function run() {
            try { XiuZheng_LiuLanQi_GongJuTiao(); } catch (e) {}
        }
        run();
        setTimeout(run, 80);
        setTimeout(run, 250);
        setTimeout(run, 800);
    }

    // 浏览器工具菜单
    var LiuLanQi_CaiDan_HINTS = [
        ['Take Screenshot', '截取屏幕截图'],
        ['Capture Area Screenshot', '截取区域截图'],
        ['Hard Reload', '强制重新加载'],
        ['Copy Current URL', '复制当前 URL'],
        ['Show Bookmark Bar', '显示书签栏'],
        ['Clear Browsing History', '清除浏览历史'],
        ['Clear Cookies', '清除 Cookie'],
        ['Clear Cache', '清除缓存'],
        ['Inspect Element', '检查元素']
    ];

    // 翻译浏览器工具菜单中的操作项
    function XiuZheng_LiuLanQi_CaiDan() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('LIU_LAN_QI_GONG_JU')) return;
        try { YanChi_FanYi_LiuLanQi_GongJuTiao(); } catch (e) {}
        var hints = LiuLanQi_CaiDan_HINTS;
        var roots = document.querySelectorAll('[role="menuitem"], li, div, span, button');
        FanYi_Gen_List_Hints(roots, hints, {
            maxLen: 120,
            skipDictionary: true,
            leafOnly: true
        });
    }

    // 浏览器连接错误页
    var LiuLanQi_CuoWu_HINTS = [
        ['Connection Failed', '连接失败'],
        ['Connection failed', '连接失败'],
        ['Connection Error', '连接错误'],
        ['The connection failed 10 times. Please check your network connection and try again.', '连接失败了 10 次。请检查网络连接后重试。'],
        ['Connection failed. Please try again, or contact support if the issue persists.', '连接失败。请重试，或在问题持续存在时联系支持。'],
        ['Connection failed. Please try again, or contact support if the issue persists', '连接失败。请重试，或在问题持续存在时联系支持'],
        ["Don't Open", '不要打开'],
        ['Open in Cursor Browser', '在 Cursor 浏览器中打开'],
        ['Open in External Browser', '在外部浏览器中打开'],
        ['Copy Link', '复制链接'],
        ['Restart Browser', '重启浏览器'],
        ['Reload', '重新加载'],
        ['Show Details', '显示详情'],
        ['Hide Details', '隐藏详情'],
        ['Connection was refused.', '连接被拒绝。'],
        ['Connection was refused', '连接被拒绝'],
        ["This site can't be reached", '无法访问此网站'],
        ['This site can&#39;t be reached', '无法访问此网站'],
        ['Certificate Error', '证书错误'],
        ['The certificate for this site is not trusted', '此站点的证书不受信任'],
        ['Copy error details', '复制错误详情']
    ];

    // 翻译浏览器连接失败等错误页文案
    function XiuZheng_LiuLanQi_CuoWu() {
        try { FanYi_LiuLanQi_Webview(); } catch (e) {}
        var hasBrowserUi = document.querySelector(
            'webview, .browser-navbar, .browser-tools, [class*="browser-navbar"], ' +
            '.browser-error-page, .browser-error-overlay, .glass-browser-error-page'
        );
        if (!hasBrowserUi && !QuanJu_BaoHan_GuanJianCi_BiaoQian('LIU_LAN_QI_CUO_WU')) return;
        var hints = LiuLanQi_CuoWu_HINTS;
        var errorEls = document.querySelectorAll(
            '.browser-error-title, .browser-error-subtitle, .browser-error-restart-button, ' +
            '.browser-error-details-toggle, .browser-error-copy-button, ' +
            '.glass-browser-error-title, .glass-browser-error-subtitle, .glass-browser-error-page button'
        );
        FanYi_Gen_List_Hints(errorEls, hints, { maxLen: 160, needleLen: 12, leafOnly: true });
        var roots = document.querySelectorAll(
            '.browser-error-page, .browser-error-overlay, .glass-browser-error-page, ' +
            '.browser-navbar, .browser-tools, [class*="browser-view"], [class*="simple-browser"]'
        );
        for (var r = 0; r < roots.length; r++) {
            try { FanYi_ZiShu(roots[r]); } catch (e) {}
        }
        try {
            var iframes = document.querySelectorAll('iframe');
            for (var i = 0; i < iframes.length; i++) {
                try {
                    var doc = iframes[i].contentDocument;
                    if (doc && doc.body) FanYi_ZiShu(doc.body);
                } catch (e) {}
            }
        } catch (e) {}
    }

    // 消息队列与待发送提示
    var DuiLie_XiaoXi_HINTS = [
        ['Queued', '已排队'],
        ['Send now', '立即发送'],
        ['Send After Current Message', '在当前消息之后发送'],
        ['Send after current message', '在当前消息之后发送'],
        ['Send Right Away', '立即发送'],
        ['Edit queued message', '编辑排队消息'],
        ['Editing queued message', '正在编辑排队消息'],
        ['Editing queued message...', '正在编辑排队消息...'],
        ['Edit Queued', '编辑排队'],
        ['Attached image', '附加图片'],
        ['View image', '查看图片'],
        ['Remove from queue', '从队列移除']
    ];

    // 翻译消息队列和待发送提示
    function XiuZheng_DuiLie_XiaoXi() {
        var hasQueueUi = !!document.querySelector(
            '.composer-queue-edit-banner, [class*="composer-queue"], [class*="message-queue"], ' +
            '.context-pill-image, .image-pill-container, .ui-prompt-input-image-preview'
        );
        if (!hasQueueUi && !QuanJu_BaoHan_GuanJianCi_BiaoQian('DUI_LIE')) return;
        var hints = DuiLie_XiaoXi_HINTS;
        var scopes = document.querySelectorAll(
            '.composer-queue-edit-banner, .composer-queue-edit-banner-text, ' +
            '[class*="composer"] [class*="queue"], [class*="message-queue"], [class*="queued"], ' +
            '.context-pill-image, .image-pill-container, .ui-prompt-input-image-preview, ' +
            '[class*="composer"] button, .monaco-hover, [role="tooltip"], img[alt]'
        );
        FanYi_Scope_Attr_And_Hints(scopes, hints, {
            maxLen: 60,
            needleLen: 10,
            selector: 'span, div, button, label',
            skipMultiChild: true
        });
    }

    // __CURSOR_SETTINGS_FRAGMENTS_BLOCK__

    // 翻译 Cursor 设置页的说明和标签
    function XiuZheng_Cursor_SheZhi() {
        var root = HuoQu_Cursor_SheZhi_Gen();
        if (!root) return;
        FanYi_Cursor_SheZhi_MiaoShu(root, HuoQu_Cursor_SheZhi_MiaoShu_Cfg());
        FanYi_Cursor_SheZhi_BiaoQian(root);
    }

    // __DROPDOWN_FRAGMENTS_BLOCK__


    // 下拉项里的用量档位
    var XiaLa_DengJi_FanYi = {
        'medium': '中等',
        'extra high': '超高',
        'fast': '快速',
        'low': '低',
        'high': '高'
    };

    // 翻译下拉项文本，先替换片段再查整句
    function FanYi_XiaLa_WenBen(node, sheZhiMoShi) {
        if (!node || Shi_BianJiQi_QuYu(node)) return;
        if (Shi_QuickInput_QuYu(node.parentElement)) return;
        try {
            if (node.parentElement && Shi_CaiDan_QuYu(node.parentElement) && !Shi_CaiDan_WenBen_JieDian(node)) return;
        } catch (e) {}
        var text = node.textContent;
        if (!text || text.length > 200) return;
        if (Shi_Yuan_DaiMa_WenBen(text)) return;
        var trimmed = GuiYiHua_WenBen(text);
        if (!trimmed) return;
        if (sheZhiMoShi && trimmed === 'Stop') {
            try {
                var combo = node.parentElement && node.parentElement.closest(
                    '[role="combobox"], .monaco-select-box, [class*="select-box"]'
                );
                if (combo && /send\s+right\s+away/i.test(combo.textContent || '')) return;
            } catch (e) {}
        }
        var tierOnly = XiaLa_DengJi_FanYi[trimmed.toLowerCase()];
        if (tierOnly) {
            XieRu_WenBen_JieDian(node, tierOnly);
            return;
        }
        var result = text;
        for (var i = 0; i < XiaLa_MianBan_SuiPian.length; i++) {
            result = result.split(XiaLa_MianBan_SuiPian[i][0]).join(XiaLa_MianBan_SuiPian[i][1]);
        }
        var normed = GuiYiHua_WenBen(result);
        var tr = ChaZhao_FanYi(normed) || TiHuan_BuFen_WenBen(result);
        if (!tr) {
            for (var j = 0; j < MoShi_FanYi.length; j++) {
                if (MoShi_FanYi[j][0].test(normed)) {
                    tr = normed.replace(MoShi_FanYi[j][0], MoShi_FanYi[j][1]);
                    break;
                }
            }
        }
        if (tr) result = tr;
        if (result !== text) XieRu_WenBen_JieDian(node, result);
    }

    // 遍历一组根节点中的下拉文本
    function BianLi_XiaLa_WenBen(roots, sheZhiMoShi) {
        var seen = new Set();
        for (var r = 0; r < roots.length; r++) {
            var root = roots[r];
            if (!root || seen.has(root)) continue;
            seen.add(root);
            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            var node;
            while ((node = walker.nextNode())) {
                if (node.parentElement && node.parentElement.closest('input, textarea')) continue;
                FanYi_XiaLa_WenBen(node, sheZhiMoShi);
            }
        }
    }

    // 翻译下拉面板、列表和菜单中的可见文字
    function XiuZheng_XiaLaKuang_MianBan() {
        var scopes = document.querySelectorAll(
            '.monaco-select-box-dropdown-container, .context-view, .monaco-list-row, ' +
            '[role="listbox"], [role="option"], .monaco-hover, .monaco-hover-content, ' +
            '[class*="model-picker"], [class*="premium-model"], [class*="upgrade"], ' +
            '.monaco-menu, .monaco-menu-container, [role="menu"], [role="menuitem"]'
        );
        BianLi_XiaLa_WenBen(scopes, false);
        var caiDanGen = document.querySelectorAll(
            '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"], ' +
            '.ui-menu, .ui-menu__layout, .ui-menu__content, [role="listbox"]'
        );
        for (var cg = 0; cg < caiDanGen.length; cg++) {
            try { FanYi_Monaco_CaiDan(caiDanGen[cg]); } catch (e) {}
            try { FanYi_BianJiQi_CaiDan_TiaoMu(caiDanGen[cg]); } catch (e) {}
            try { FanYi_UI_CaiDan(caiDanGen[cg]); } catch (e) {}
        }
        try { FanYi_LiaoTian_CaiDan(); } catch (e) {}
        if (Shi_Cursor_SheZhi_QuYu()) {
            var settingScopes = document.querySelectorAll(
                '[class*="cursor-settings"] [role="combobox"], [class*="cursor-settings"] .monaco-select-box, ' +
                '[class*="cursor-settings"] [class*="select-box"], [class*="cursor-settings"]'
            );
            BianLi_XiaLa_WenBen(settingScopes, true);
        }
    }

    // 判断当前是否打开了 Cursor 设置页
    function Shi_Cursor_SheZhi_QuYu() {
        return !!document.querySelector('[class*="cursor-settings"], .cursor-settings-cell');
    }

    // 翻译设置页里打开的下拉框
    function XiuZheng_SheZhi_XiaLaKuang() {
        XiuZheng_XiaLaKuang_MianBan();
    }

    // 监听设置页变化并刷新下拉翻译
    function AnZhuang_SheZhi_XiaLa_GuanCha() {
        if (window.__cursorSheZhiXiaLaObs) return;
        var root = document.body;
        var debounce = null;
        var obs = new MutationObserver(function(mutations) {
            var relevant = false;
            for (var mi = 0; mi < mutations.length; mi++) {
                if (!Shi_ShuRu_Huo_DaiMa_BianYi(mutations[mi].target)) { relevant = true; break; }
            }
            if (!relevant) return;
            if (!document.querySelector('.context-view, .monaco-select-box, .quick-input-widget, [role="listbox"]')) return;
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(function() {
                try { XiuZheng_XiaLaKuang_MianBan(); } catch (e) {}
            }, 70);
        });
        try {
            obs.observe(root, { childList: true, subtree: true, characterData: true });
            window.__cursorSheZhiXiaLaObs = obs;
        } catch (e) {}
    }

    // 不再询问对话框设置的替换片段
    var YinCang_DuiHua_SuiPian = [
        ['Reset "Don\'t Ask Again" Dialogs', '重置「不再询问」对话框'],
        ['Reset \'Don\'t Ask Again\' Dialogs', '重置「不再询问」对话框'],
        ['See warnings and tips that you\'ve hidden', '查看您已隐藏的警告和提示'],
        ['No Hidden Dialogs Yet', '暂无隐藏的对话框'],
        ['You haven\'t marked any dialogs as "Don\'t ask again".', '您尚未将任何对话框标记为「不再询问」。'],
        ['You haven\'t marked any dialogs as \'Don\'t ask again\'.', '您尚未将任何对话框标记为「不再询问」。'],
        ['You haven\'t marked any dialogs as "Don\'t ask again". Any hidden dialogs will appear here to manage.', '您尚未将任何对话框标记为「不再询问」。已隐藏的对话框将显示在此处以供管理。'],
        ['You haven\'t marked any dialogs as \'Don\'t ask again\'. Any hidden dialogs will appear here to manage.', '您尚未将任何对话框标记为「不再询问」。已隐藏的对话框将显示在此处以供管理。'],
        ['Any hidden dialogs will appear here to manage.', '已隐藏的对话框将显示在此处以供管理。']
    ];

    // 不再询问对话框页面的识别词
    var YinCang_DuiHua_GuanJianCi = {
        askAgain: 'Ask Again',
        hidden: 'Hidden Dialogs',
        hiddenLower: 'hidden dialogs',
        none: '暂无隐藏'
    };

    // 返回不再询问对话框设置的替换片段
    function HuoQu_YinCang_DuiHua_SuiPian() {
        return YinCang_DuiHua_SuiPian;
    }

    // 翻译隐藏对话框设置页的说明
    function XiuZheng_YinCang_DuiHua_SheZhi() {
        var bodyText = '';
        try { bodyText = document.body ? (document.body.textContent || '') : ''; } catch (e) { return; }
        if (bodyText.indexOf(YinCang_DuiHua_GuanJianCi.askAgain) === -1) return;
        if (bodyText.indexOf(YinCang_DuiHua_GuanJianCi.hidden) === -1 &&
            bodyText.indexOf(YinCang_DuiHua_GuanJianCi.hiddenLower) === -1 &&
            bodyText.indexOf(YinCang_DuiHua_GuanJianCi.none) === -1) return;
        var fragments = HuoQu_YinCang_DuiHua_SuiPian();
        var roots = document.querySelectorAll(
            '[class*="cursor-settings"], .settings-editor, .settings-body, [class*="settings-group"], [class*="setting-item"]'
        );
        var scopeList = roots.length ? Array.prototype.slice.call(roots) : [document.body];
        for (var r = 0; r < scopeList.length; r++) {
            var scopeText = scopeList[r].textContent || '';
            if (scopeText.indexOf(YinCang_DuiHua_GuanJianCi.askAgain) === -1 && scopeText.indexOf(YinCang_DuiHua_GuanJianCi.none) === -1) continue;
            TiHuan_WenBenJieDian_SuiPian(scopeList[r], fragments);
        }
        FanYi_Scope_List_Hints(scopeList, fragments, {
            maxLen: 240,
            needleLen: 14,
            leafOnly: true,
            selector: 'div, span, p, label, h1, h2, h3, button'
        });
        FanYi_Scope_ZiDian_Only(scopeList, {
            maxLen: 240,
            needleLen: 14,
            skipNestedInteractive: true,
            selector: 'div, span, p, label, h1, h2, h3'
        });
        var cursorRoot = HuoQu_Cursor_SheZhi_Gen();
        if (cursorRoot) {
            try { FanYi_Cursor_SheZhi_BiaoQian(cursorRoot); } catch (e) {}
        }
    }

    // 设置页碎片文案。后四条同时用于整段匹配
    var SheZhi_SuiPian_HINTS = [
        ['Automation Profile', '自动化配置文件'],
        ['Focus on Command Execution', '命令执行时聚焦'],
        ['Preserve Cursor Position', '保留光标位置'],
        ['Natural Language Search', '自然语言搜索'],
        ['Auto Resume', '自动恢复'],
        ['Auto Store', '自动存储'],
        ['Partial Matches', '部分匹配'],
        ['Continue Prompt', '继续提示'],
        ['Reset \'Don\'t Ask Again\' Dialogs', '重置「不再询问」对话框'],
        ['Reset "Don\'t Ask Again" Dialogs', '重置「不再询问」对话框'],
        ['See warnings and tips that you\'ve hidden', '查看您已隐藏的警告和提示'],
        ['You haven\'t marked any dialogs as \'Don\'t ask again\'. Any hidden dialogs will appear here to manage.', '您尚未将任何对话框标记为「不再询问」。已隐藏的对话框将显示在此处以供管理。'],
        ['Your codebase, prompts, edits and other usage data will be stored and trained on by Cursor to improve the product.', '您的代码库、提示词、编辑内容和其他使用数据将由 Cursor 存储并用于训练，以改进产品。'],
        ['Your codebase, prompts, edits and other usage data will be stored and trained on by Cursor to improve the product', '您的代码库、提示词、编辑内容和其他使用数据将由 Cursor 存储并用于训练，以改进产品']
    ];
    var SheZhi_SuiPian_PiPei_HINTS = SheZhi_SuiPian_HINTS.slice(8, 12);

    // 翻译设置页中的自动化、搜索等碎片文案
    function XiuZheng_SheZhi_SuiPian() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('SUI_PIAN')) return;
        try { XiuZheng_Cursor_SheZhi(); } catch (e) {}
        FanYi_SheZhiGen_Symlink_MiaoShu(sheZhiGen);
        FanYi_SheZhiGen_Leaf_SuiPian(sheZhiGen, SheZhi_SuiPian_HINTS);
        FanYi_SheZhiGen_SuiPian_PiPei(sheZhiGen, SheZhi_SuiPian_PiPei_HINTS, function(text) {
            return ChaZhao_FanYi(text) || TiHuan_BuFen_WenBen(text);
        }, {
            selector: 'div, span, p, label, h1, h2, h3',
            maxLen: 240
        });
    }

    // 账户计划里重复出现的免费版标签
    var ZhangHu_MianFei_BiaoQian = ['Free', '免费版'];

    // 账户计划与用量标签
    var ZhangHu_JiHua_HINTS = [
        ['Current Plan', '当前计划'],
        ['Current plan', '当前计划'],
        ['Your codebase, prompts, edits and other usage data will be stored and trained on by Cursor to improve the product.', '您的代码库、提示词、编辑内容和其他使用数据将由 Cursor 存储并用于训练，以改进产品。'],
        ['Your codebase, prompts, edits and other usage data will be stored and trained on by Cursor to improve the product', '您的代码库、提示词、编辑内容和其他使用数据将由 Cursor 存储并用于训练，以改进产品'],
        ['Review Changes', '审查更改'],
        ['New User Rule', '新建用户规则'],
        ['VS Code Settings', 'VS Code 设置'],
        ['Copy Domains', '复制域名'],
        ['Run Diagnostic', '运行诊断'],
        ['Tools & MCPs', '工具与 MCP']
    ];

    // 翻译账户计划、用量和相关设置标签
    function XiuZheng_ZhangHu_JiHua() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('ZHANG_HU')) return;
        var hints = ZhangHu_JiHua_HINTS;
        FanYi_Gen_List_Hints(
            sheZhiGen.querySelectorAll('div, span, p, label, button, a'),
            hints,
            {
                maxLen: 120,
                needleLen: 10,
                leafOnly: true,
                skipChildQuery: 'div, span, p, button',
                skipBianJiQi: true
            }
        );
        var baselines = document.querySelectorAll('.flex.items-baseline, [class*="items-baseline"]');
        for (var b = 0; b < baselines.length; b++) {
            var row = baselines[b];
            var kids = row.children;
            var freeSeen = false;
            for (var k = 0; k < kids.length; k++) {
                var kid = kids[k];
                var kt = GuiYiHua_WenBen(kid.textContent || '');
                if (kt === ZhangHu_MianFei_BiaoQian[1] || kt === ZhangHu_MianFei_BiaoQian[0]) {
                    if (freeSeen) {
                        kid.style.display = 'none';
                    } else {
                        freeSeen = true;
                        if (kt === ZhangHu_MianFei_BiaoQian[0]) kid.textContent = ZhangHu_MianFei_BiaoQian[1];
                    }
                }
            }
        }
    }

    // 时间线里资源类型的显示名
    var ShiJianXian_ZiYuan_Ming = {
        'marketplace': '市场',
        'Marketplace': '市场'
    };

    // 翻译时间线视图中的标题和条目
    function XiuZheng_ShiJianXian() {
        var roots = [];
        var seen = new Set();
        // 去重后加入时间线翻译区域
        function pushRoot(el) {
            if (!el || seen.has(el)) return;
            seen.add(el);
            roots.push(el);
        }
        document.querySelectorAll(
            '.timeline-tree-view, .timeline-view, [id="workbench.view.timeline"]'
        ).forEach(pushRoot);
        document.querySelectorAll('.pane-header, .composite.title').forEach(function(header) {
            var ht = header.textContent || '';
            if (/时间线|Timeline/i.test(ht)) pushRoot(header);
        });

        for (var r = 0; r < roots.length; r++) {
            var walker = document.createTreeWalker(roots[r], NodeFilter.SHOW_TEXT, null);
            var node;
            while ((node = walker.nextNode())) {
                if (TiaoGuo_BiaoQian.has(node.parentElement && node.parentElement.tagName)) continue;
                var raw = node.textContent || '';
                var trimmed = GuiYiHua_WenBen(raw);
                if (!trimmed) continue;
                var tr = ShiJianXian_ZiYuan_Ming[trimmed] || ChaZhao_FanYi(raw);
                if (tr && tr !== raw) {
                    var prefix = raw.substring(0, raw.indexOf(trimmed));
                    var suffix = raw.substring(raw.indexOf(trimmed) + trimmed.length);
                    XieRu_WenBen_JieDian(node, prefix + tr + suffix);
                }
            }
        }
    }
