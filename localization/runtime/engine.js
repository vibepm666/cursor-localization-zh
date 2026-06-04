    // ================================================================
    // SECTION 2: 翻译引擎
    // ================================================================

    // __PARTIAL_FRAGMENTS_BLOCK__

    var TiaoGuo_XuanZeQi = '.monaco-editor, .overflow-guard, .view-lines, .editor-scrollable, .inputarea, .rename-input, .explorer-viewlet, [id="workbench.view.explorer"]';
    var TiaoGuo_BiaoQian = new Set(['TEXTAREA', 'INPUT', 'SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT']);

    function GuiYiHua_WenBen(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    function GuiYiHua_YinHao(text) {
        if (!text) return text;
        return text
            .replace(/[\u2018\u2019\u2032]/g, "'")
            .replace(/[\u201C\u201D\u2033]/g, '"');
    }

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

    function ChaZhao_FanYi(text) {
        if (!text) return null;

        var trimmed = text.trim();
        var normalized = GuiYiHua_WenBen(text);
        var quoteNorm = GuiYiHua_YinHao(normalized);

        if (FanYi_CiDian.has(trimmed)) return FanYi_CiDian.get(trimmed);
        if (normalized !== trimmed && FanYi_CiDian.has(normalized)) return FanYi_CiDian.get(normalized);
        if (quoteNorm !== normalized && FanYi_CiDian.has(quoteNorm)) return FanYi_CiDian.get(quoteNorm);

        for (var i = 0; i < MoShi_FanYi.length; i++) {
            var pair = MoShi_FanYi[i];
            if (pair[0].test(trimmed)) return trimmed.replace(pair[0], pair[1]);
            if (normalized !== trimmed && pair[0].test(normalized)) return normalized.replace(pair[0], pair[1]);
            if (quoteNorm !== normalized && pair[0].test(quoteNorm)) return quoteNorm.replace(pair[0], pair[1]);
        }

        return null;
    }

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

    function Shi_CaiDan_QuYu(el) {
        if (!el) return false;
        try {
            return !!(el.closest('.monaco-menu, .monaco-menu-container, .context-view, [role="menubar"]'));
        } catch (e) { return false; }
    }

    function Shi_CaiDan_WenBen_JieDian(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) return false;
        var pel = node.parentElement;
        if (!pel || !Shi_CaiDan_QuYu(pel)) return false;
        try {
            if (pel.closest('.keybinding, .submenu-indicator')) return false;
            if (pel.classList && pel.classList.contains('codicon')) return false;
            if (pel.closest('.action-label')) return true;
            var item = pel.closest('a.action-menu-item, .action-item, [role="menuitem"]');
            if (!item) return false;
            if (pel.querySelector && pel.querySelector('.codicon, .keybinding, .submenu-indicator, .action-label')) return false;
            return true;
        } catch (e) { return false; }
    }

    function GengXin_CaiDan_BiaoQian(labelEl, tr) {
        if (!labelEl || !tr) return false;
        var raw = (labelEl.textContent || '').trim();
        if (!raw || GuiYiHua_WenBen(raw) === GuiYiHua_WenBen(tr)) return false;
        labelEl.textContent = tr;
        return true;
    }

    function FanYi_BianJiQi_CaiDan_TiaoMu(root) {
        if (!root) return;
        var hints = BianJiQi_CaiDan_HINTS;
        var labels = root.querySelectorAll('.action-label');
        for (var i = 0; i < labels.length; i++) {
            var el = labels[i];
            if (el.closest('.view-lines')) continue;
            var row = el.closest('a.action-menu-item, .action-item, [role="menuitem"]');
            if (row) FanYi_ShuXing(row);
            GengXin_CaiDan_WenBen(el, hints);
        }
        var items = root.querySelectorAll('a.action-menu-item, .action-item, [role="menuitem"]');
        for (var j = 0; j < items.length; j++) {
            FanYi_ShuXing(items[j]);
        }
    }

    function FanYi_Monaco_CaiDan(root) {
        if (!root) return;
        var labels = root.querySelectorAll('.action-label');
        for (var i = 0; i < labels.length; i++) {
            var el = labels[i];
            if (el.closest('.view-lines')) continue;
            var row = el.closest('a.action-menu-item, .action-item, [role="menuitem"]');
            if (row) FanYi_ShuXing(row);
            GengXin_CaiDan_WenBen(el, BianJiQi_CaiDan_HINTS);
            var raw = (el.textContent || '').trim();
            if (!raw || raw.length > 160) continue;
            var tr = ChaZhao_FanYi(raw) || ChaZhao_FanYi(GuiYiHua_WenBen(raw)) || TiHuan_BuFen_WenBen(raw);
            if (tr) GengXin_CaiDan_BiaoQian(el, tr);
        }
        var items = root.querySelectorAll('a.action-menu-item, .action-item, [role="menuitem"]');
        for (var j = 0; j < items.length; j++) {
            var item = items[j];
            if (item.querySelector('.action-label')) continue;
            FanYi_ShuXing(item);
            var walker;
            try {
                walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT, null);
            } catch (e) { continue; }
            var tnode;
            while ((tnode = walker.nextNode())) {
                if (!Shi_CaiDan_WenBen_JieDian(tnode)) continue;
                var raw2 = (tnode.textContent || '').trim();
                if (!raw2 || raw2.length > 160) continue;
                var tr2 = ChaZhao_FanYi(raw2) || ChaZhao_FanYi(GuiYiHua_WenBen(raw2)) || TiHuan_BuFen_WenBen(raw2);
                if (tr2 && tr2 !== raw2) tnode.textContent = tr2;
            }
        }
    }

    var CaiDan_FanYi_Timer = null;
    var CaiDan_FanYi_Retry = 0;

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
        } finally {
            ZhengZaiPiLiangFanYi = false;
        }
    }

    function YanChi_FanYi_CaiDan() {
        if (CaiDan_FanYi_Timer) clearTimeout(CaiDan_FanYi_Timer);
        CaiDan_FanYi_Retry = 0;
        CaiDan_FanYi_Timer = setTimeout(function PaiDui_CaiDan() {
            CaiDan_FanYi_Timer = null;
            ZhiXing_CaiDan_FanYi();
            if (CaiDan_FanYi_Retry < 6) {
                CaiDan_FanYi_Retry++;
                var caiDanYanChi = [80, 200, 400, 700, 1100, 1600];
                CaiDan_FanYi_Timer = setTimeout(PaiDui_CaiDan, caiDanYanChi[CaiDan_FanYi_Retry - 1] || 1600);
            }
        }, 16);
    }

    var CaiDan_DongTai_GuanCha = null;
    var CaiDan_DongTai_GuanCha_Root = null;

    function AnZhuang_CaiDan_DongTai_GuanCha() {
        if (CaiDan_DongTai_GuanCha) return;
        CaiDan_DongTai_GuanCha = new MutationObserver(function() {
            YanChi_FanYi_CaiDan();
        });
        document.addEventListener('contextmenu', function() {
            setTimeout(function() {
                var cv = document.querySelector('.context-view');
                if (!cv) return;
                if (CaiDan_DongTai_GuanCha_Root !== cv) {
                    if (CaiDan_DongTai_GuanCha_Root) {
                        try { CaiDan_DongTai_GuanCha.disconnect(); } catch (e) {}
                    }
                    CaiDan_DongTai_GuanCha_Root = cv;
                    try {
                        CaiDan_DongTai_GuanCha.observe(cv, { childList: true, subtree: true });
                    } catch (e) {}
                }
                YanChi_FanYi_CaiDan();
                try { FanYi_LiuLanQi_Webview(); } catch (e) {}
            }, 0);
        }, true);
    }

    var TiJi_CaiDan_FanYi_Timer = null;
    var TiJi_CaiDan_FanYi_Retry = 0;

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

    var TongYong_CaiDan_HINTS = [
        ['Copy', '复制'],
        ['Select All', '全选'],
        ['Cut', '剪切'],
        ['Paste', '粘贴']
    ];

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
        ['Fork Conversation', '分叉对话'],
        ['Copy Message', '复制消息'],
        ['Copy Messages', '复制消息'],
        ['Copy Branch Name', '复制分支名称'],
        ['Split Right', '向右拆分'],
        ['Split Down', '向下拆分'],
        ['Mark as Read', '标记为已读'],
        ['Mark as Unread', '标记为未读'],
        ['Archive Prior Chats', '归档较早的对话']
    ];

    var LiaoTian_LiShi_Extra_HINTS = [
        ['Search Agents...', '搜索智能体...'],
        ['Today', '今天'],
        ['Yesterday', '昨天'],
        ['Older', '更早'],
        ['Archived', '已归档'],
        ['Show Chat History', '显示聊天历史'],
        ['Chat History', '聊天历史'],
        ['Show more', '显示更多'],
        ['Show 1 more', '再显示 1 条']
    ];

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
        ['Review Next File', '审查下一个文件']
    ];

    var Agent_BianGeng_Pending_HINTS = [
        ['Changes waiting to be confirmed', '等待确认的更改'],
        ['Pending Changes', '待确认更改']
    ];

    var Agent_BianGeng_WenBen_Extra_HINTS = Agent_BianGeng_Pending_HINTS.concat([
        ['Keep', '保留'],
        ['Keep Ctrl+Shift+Y', '保留 Ctrl+Shift+Y'],
        ['Undo Ctrl+N', '撤销 Ctrl+N']
    ]);

    var Agent_BianGeng_Attr_Extra_HINTS = [
        ['Keep', '保留'],
        ['Keep Ctrl+Shift+Y', '保留 Ctrl+Shift+Y']
    ];

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
        ['New Agent (Ctrl+N)', '新建智能体 (Ctrl+N)'],
        ['[Alt] Replace Agent', '[Alt] 替换智能体'],
        ['Voice Input', '语音输入'],
        ['Send now', '立即发送'],
        ['Edit queued message', '编辑排队消息'],
        ['Editing queued message', '正在编辑排队消息'],
        ['Editing queued message...', '正在编辑排队消息...'],
        ['Edit Queued', '编辑排队'],
        ['Attached image', '附加图片'],
        ['View image', '查看图片'],
        ['Remove from queue', '从队列移除'],
        ['Revert last change', '撤销上次更改'],
        ['Queued', '已排队']
    ];

    var DuiHua_JieMian_Attr_Only_HINTS = [
        ['Replace Agent', '替换智能体'],
        ['Switch Model', '切换模型'],
        ['Switch to Auto', '切换到自动'],
        ['Switch Model and Retry', '切换模型并重试']
    ];

    var DuiHua_JieMian_WenBen_Only_HINTS = [
        ['System prompt', '系统提示词'],
        ['Tool definitions', '工具定义'],
        ['Subagent definitions', '子智能体定义'],
        ['Summarized conversation', '摘要对话'],
        ['Conversation', '对话']
    ];

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

    function GengXin_CaiDan_WenBen(el, hints) {
        if (!el || el.closest('.view-lines')) return;
        FanYi_ShuXing(el);
        var text = GuiYiHua_WenBen(el.textContent || '');
        if (!text || text.length > 120) return;
        for (var j = 0; j < hints.length; j++) {
            if (text === hints[j][0]) {
                GengXin_CaiDan_BiaoQian(el, hints[j][1]);
                return;
            }
        }
        var tr = ChaZhao_FanYi(text) || TiHuan_BuFen_WenBen(text);
        if (tr && tr !== text) GengXin_CaiDan_BiaoQian(el, tr);
    }

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

    function FanYi_LiaoTian_CaiDan() {
        var hints = LiaoTian_CaiDan_HINTS;
        var menus = document.querySelectorAll(
            '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"], ' +
            '.ui-menu, .ui-menu__layout, .ui-menu__content'
        );
        for (var m = 0; m < menus.length; m++) {
            FanYi_UI_CaiDan(menus[m]);
            var labels = menus[m].querySelectorAll('.action-label');
            for (var i = 0; i < labels.length; i++) {
                GengXin_CaiDan_WenBen(labels[i], hints);
            }
        }
    }

    function FanYi_WenBen_JieDian(node) {
        var text = node.textContent;
        if (!text) return;
        var trimmed = text.trim();
        if (!trimmed || trimmed.length > 500) return;
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
                node.textContent = qiPrefix + qiTr + qiSuffix;
            }
            return;
        }

        var result = ChaZhao_FanYi(text);
        if (result) {
            var prefix = text.substring(0, text.indexOf(trimmed));
            var suffix = text.substring(text.indexOf(trimmed) + trimmed.length);
            node.textContent = prefix + result + suffix;
            return;
        }

        var partial = TiHuan_BuFen_WenBen(text);
        if (partial) node.textContent = partial;
    }

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
        return TiHuan_BuFen_WenBen(val);
    }

    function FanYi_ShuXing(el) {
        if (!el || !el.getAttribute) return;
        var attrs = ['title', 'aria-label', 'alt', 'placeholder', 'aria-placeholder', 'data-tooltip', 'data-title'];
        for (var i = 0; i < attrs.length; i++) {
            var val = el.getAttribute(attrs[i]);
            if (!val) continue;
            var result = FanYi_TiShi_WenBen(val);
            if (result && result !== val) el.setAttribute(attrs[i], result);
        }
    }

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
                    if (!text) continue;
                    var trimmed = text.trim();
                    if (!trimmed || trimmed.length > 120) continue;
                    var tr = ChaZhao_FanYi(trimmed);
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
                        if (idx < 0) tnode.textContent = tr;
                        else tnode.textContent = text.substring(0, idx) + tr + text.substring(idx + trimmed.length);
                    }
                }
            } catch (e) {}
            var leaves = ht.querySelectorAll ? ht.querySelectorAll('div, span, p, label') : [];
            for (var n = 0; n < leaves.length; n++) {
                var leaf = leaves[n];
                if (!leaf || (leaf.querySelector && leaf.querySelector('div, span, p, label'))) continue;
                var raw = (leaf.textContent || '').trim();
                if (!raw || raw.length > 120) continue;
                var plain = GuiYiHua_WenBen(raw);
                var ltr = ChaZhao_FanYi(plain);
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

    var Agent_TiShi_WenBen = [
        ['New Agent (Ctrl+N)', '新建智能体 (Ctrl+N)'],
        ['New Agent(Ctrl+N)', '新建智能体 (Ctrl+N)'],
        ['[Alt] Replace Agent', '[Alt] 替换智能体'],
        ['[Alt]Replace Agent', '[Alt] 替换智能体'],
        ['Alt Replace Agent', 'Alt 替换智能体'],
        ['Replace Agent', '替换智能体']
    ];

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

    function FanYi_TiShi_LaiYuan(el) {
        if (!el) return;
        var cur = el;
        for (var depth = 0; depth < 4 && cur; depth++) {
            FanYi_ShuXing(cur);
            cur = cur.parentElement;
        }
    }

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
                    if (!text) continue;
                    var trimmed = GuiYiHua_WenBen(text);
                    if (!trimmed || trimmed.length > 280) continue;
                    var tr = FanYi_TiShi_WenBen(text) || FanYi_TiShi_WenBen(trimmed);
                    if (tr && tr !== text) {
                        var idx = text.indexOf(trimmed);
                        if (idx < 0) tnode.textContent = tr;
                        else {
                            tnode.textContent = text.substring(0, idx) + tr + text.substring(idx + trimmed.length);
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
                if (!raw || raw.length > 280) continue;
                var plain = GuiYiHua_WenBen(raw);
                var ltr = FanYi_TiShi_WenBen(raw) || FanYi_TiShi_WenBen(plain);
                if (ltr && ltr !== raw) KeYi_AnQuan_GaiXie_WenBen(leaf, ltr, [plain.slice(0, 12)]);
            }
        }
    }

    function AnZhuang_Monaco_Hover_FanYi() {
        if (window.__cursorMonacoHoverI18n) return;
        window.__cursorMonacoHoverI18n = true;
        var hoverTimer = null;
        var hoverRafId = 0;
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
        function KaiShi_Hover_ZhuiZong(seed) {
            if (hoverRafId) return;
            var frames = 0;
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

    function Shi_QuickInput_QuYu(el) {
        if (!el) return false;
        try {
            return !!(el.closest('.quick-input-widget, .monaco-quick-input, [class*="quick-input-widget"]'));
        } catch (e) { return false; }
    }

    function YiFanYi_ZhuTi_Ming(text) {
        if (!text) return false;
        return /[\u4e00-\u9fff]/.test(text) && /[A-Za-z]{2,}/.test(text);
    }

    function HuoQu_PromptBar_Gen_JieDian() {
        return document.querySelectorAll(
            '.pure-ai-prompt-bar, .prompt-bar-container, .inline-prompt-button-area, ' +
            '.ui-prompt-input, [class*="ui-prompt-input"], [class*="prompt-bar"]'
        );
    }

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

    function Shi_BianJiQi_QuYu(node) {
        var el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (!el) return true;
        if (TiaoGuo_BiaoQian.has(el.tagName)) return true;
        if (Shi_PromptBar_QuYu(el)) return false;
        if (Shi_ShiJianXian_KeFanYi(el)) return false;
        try { if (el.closest(TiaoGuo_XuanZeQi)) return true; } catch (e) {}
        return false;
    }

    function YingGai_TiaoGuo_BianJiQi_YuanSu(el) {
        if (!el || el.nodeType !== 1) return true;
        if (Shi_PromptBar_QuYu(el)) return false;
        if (Shi_ShiJianXian_KeFanYi(el)) return false;
        try { if (el.closest(TiaoGuo_XuanZeQi)) return true; } catch (e) {}
        return false;
    }

    function HuoQu_SheZhi_Gen_JieDian() {
        try {
            return document.querySelector('[class*="cursor-settings"]');
        } catch (e) {
            return null;
        }
    }

    function FanYi_ZiShu(root) {
        var stack = [root];
        while (stack.length > 0) {
            var node = stack.pop();
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (TiaoGuo_BiaoQian.has(node.tagName)) continue;
                if (YingGai_TiaoGuo_FanYi_ZiShu_YuanSu(node)) continue;
                var inPromptBar = Shi_PromptBar_QuYu(node);
                if (!inPromptBar) {
                    if (node.classList && (node.classList.contains('overflow-guard') || node.classList.contains('view-lines') || node.classList.contains('editor-scrollable'))) continue;
                    if (node.getAttribute('contenteditable') === 'true') continue;
                }
                FanYi_ShuXing(node);
                var children = node.childNodes;
                for (var i = children.length - 1; i >= 0; i--) { stack.push(children[i]); }
            } else if (node.nodeType === Node.TEXT_NODE) {
                if (!Shi_BianJiQi_QuYu(node)) { FanYi_WenBen_JieDian(node); }
            }
        }
    }

    var DaiChuLi_JieDian = [];
    var YiDiaoDu = false;
    var ZhengZaiPiLiangFanYi = false;
    var QuanJuXiuZheng_YiPaiDui = false;
    var ShangCiQuanJuXiuZheng = 0;
    var QuanJuXiuZheng_LeiJi = 0;
    var QuanJuXiuZheng_RenWuQiZhi = 0;

    var QX_QUAN_BU = 0xffffffff;
    var QX_SUO_YIN = 1;
    var QX_DAI_MA_KU = 2;
    var QX_MO_XING_YE = 4;
    var QX_SHE_ZHI = 8;
    var QX_COMPOSER = 16;
    var QX_LIU_LAN_QI = 32;
    var QX_BIAN_JI_QI = 64;
    var QX_CAI_DAN = 128;
    var QX_TONG_ZHI = 256;
    var QX_DUI_HUA = 512;
    var QX_SHI_CHANG = 1024;
    var QX_SHI_JIAN_XIAN = 2048;
    var QX_SHE_JI = 4096;
    var QX_HUAN_YING = 8192;
    var QX_XIA_LA = 16384;
    var QX_HOVER = 32768;

    function HeBing_QuanJuXiuZhengQi(qiZhi) {
        if (qiZhi) QuanJuXiuZheng_LeiJi |= qiZhi;
    }

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

    function JieDian_You_ShiJianXian(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        try {
            return !!(node.closest && node.closest(
                '.timeline-tree-view, .timeline-view, [id="workbench.view.timeline"]'
            ));
        } catch (e) { return false; }
    }

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

    function ShouJi_PiLiang_QiZhi(nodes) {
        var mask = QuanJuXiuZheng_LeiJi;
        QuanJuXiuZheng_LeiJi = 0;
        for (var i = 0; i < nodes.length; i++) {
            mask |= TuiDuan_JieDian_QiZhi(nodes[i]);
        }
        return mask;
    }

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
        });
        try { XiuZheng_YinCang_DuiHua_SheZhi(); } catch (e) {}
    }

    function TianJia_DaiChuLi(node) {
        DaiChuLi_JieDian.push(node);
        if (!YiDiaoDu) {
            YiDiaoDu = true;
            requestAnimationFrame(ZhiXing_PiLiang_FanYi);
        }
    }

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

    function JieDian_You_XuanZe_GongJu(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList && node.classList.contains('cursorHoverWidget')) return true;
        try { return !!(node.querySelector && node.querySelector('.cursorHoverWidget')); } catch (e) { return false; }
    }

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

    function JieDian_You_TiJi_CaiDan(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.classList) {
            if (node.classList.contains('ui-slash-menu') || node.classList.contains('ui-slash-menu__content')) return true;
        }
        try {
            return !!(node.querySelector && node.querySelector('.ui-slash-menu, .ui-slash-menu__content'));
        } catch (e) { return false; }
    }

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
            return !!(node.querySelector && node.querySelector(
                '.css-inspector-section, .css-effects-type-select, .css-effect-entry, [class*="css-inspector"]'
            ));
        } catch (e) { return false; }
    }

    function JieDian_You_Monaco_Hover(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
        if (Shi_XuanFu_TiShi_JieDian(node)) return true;
        try {
            return !!(node.querySelector && node.querySelector(XuanFu_TiShi_XuanZeQi));
        } catch (e) { return false; }
    }

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
        var huiDiaoQiZhi = 0;
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            if (m.type === 'childList') {
                var added = m.addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var node = added[j];
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
                    if (!piLiang && (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)) {
                        TianJia_DaiChuLi(node);
                    }
                }
            }
        }
        if (xuanZeGongJu) {
            try { XiuZheng_BianJiQi_XuanZe(); } catch (e) {}
        }
        if (contextMenu) {
            try { YanChi_FanYi_CaiDan(); } catch (e) {}
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
        if (promptBar) {
            try { YanChi_FanYi_TiJi_CaiDan(); } catch (e) {}
            try { XiuZheng_KuaiSuBianJi_CmdK(); } catch (e) {}
            try { XiuZheng_DuiHua_JieMian(); } catch (e) {}
            try { XiuZheng_Agent_GengGai(); } catch (e) {}
            try { XiuZheng_ZhiNengTi_FanKui(); } catch (e) {}
            try { XiuZheng_ZhuTi_XuanZe(); } catch (e) {}
            try { XiuZheng_DuiLie_XiaoXi(); } catch (e) {}
            try { XiuZheng_MoXing_XuanZeQi(); } catch (e) {}
        }
        if (cssInspector) {
            try { XiuZheng_YinYing_MoHu(); } catch (e) {}
            try { XiuZheng_SheJi_MianBan(); } catch (e) {}
        }
        if (promptBar || tongZhiTanChuang) {
            try { XiuZheng_Composer_Placeholder(); } catch (e) {}
            try { XiuZheng_Composer_GongJuTiao(); } catch (e) {}
            try { XiuZheng_Editor_BiaoTi_TiShi(); } catch (e) {}
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

    function KeYi_AnQuan_GaiXie_WenBen(el, text, needles) {
        if (!el || !text) return false;
        if (text.length > 400) return false;
        if (YingGai_TiaoGuo_BianJiQi_YuanSu(el)) return false;
        try {
            if (el.querySelector('input, textarea, select, button, [role="button"], [role="switch"], [contenteditable="true"]')) return false;
            var xiala = el.closest('[role="combobox"], .monaco-select-box, [class*="select-box"]');
            if (xiala && (el === xiala || el.childElementCount > 0)) return false;
            var caiDan = el.closest('.monaco-menu, .context-view, [role="menubar"]');
            if (caiDan) {
                var shiBiaoQian = el.classList && el.classList.contains('action-label');
                if (!shiBiaoQian) return false;
            }
        } catch (e) {}
        var parent = el.parentElement;
        if (parent) {
            var parentText = GuiYiHua_WenBen(parent.textContent || '');
            if (parentText && parentText === text) return false;
        }
        el.textContent = text;
        return true;
    }

    var QuanJuWenBen_HuanCun = { time: 0, text: '' };
    function HuoQu_QuanJu_WenBen() {
        var now = Date.now();
        if (now - QuanJuWenBen_HuanCun.time < 600) return QuanJuWenBen_HuanCun.text;
        var parts = [];
        try {
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

    function QuanJu_BaoHan_GuanJianCi(words) {
        var text = HuoQu_QuanJu_WenBen();
        if (!text) return false;
        for (var i = 0; i < words.length; i++) {
            if (text.indexOf(words[i]) !== -1) return true;
        }
        return false;
    }

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
                node.textContent = neo;
                changed = true;
            }
        }
        return changed;
    }

    function XiuZheng_DaiMaKu_ShuoMing() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('DAI_MA_KU')) return;
        var fragments = [
            ['Embed codebase for improved contextual understanding and knowledge.', '嵌入代码库以提升上下文理解与知识检索。'],
            ['Embed codebase for improved contextual understanding and knowledge', '嵌入代码库以提升上下文理解与知识检索'],
            ['Embeddings and metadata are stored in the ', '嵌入向量和元数据存储在'],
            ['Embeddings and metadata are stored in ', '嵌入向量和元数据存储在'],
            [', but all code is stored locally.', '，但所有代码都存储在本地。'],
            ['but all code is stored locally.', '但所有代码都存储在本地。']
        ];
        FanYi_SheZhiGen_SuiPian_PiPei(sheZhiGen, fragments, function(text) {
            return text.indexOf('Embed codebase for improved contextual understanding and knowledge') !== -1 ||
                text.indexOf('Embeddings and metadata are stored in') !== -1 ||
                (text.indexOf('嵌入代码库') !== -1 && text.indexOf('Embeddings and metadata') !== -1);
        });
    }

    function XiuZheng_SuoYin_ShuoMing() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('SUO_YIN')) return;
        FanYi_SheZhiGen_WenBen_GuiZe(sheZhiGen, [{
            test: function(text) {
                return text.indexOf('with fewer than 50,000 files') !== -1 ||
                    text.indexOf('index any new folders') !== -1 ||
                    text.indexOf('Automatically index any new folders') !== -1 ||
                    text.indexOf('自动matically') !== -1;
            },
            apply: function(el) {
                KeYi_AnQuan_GaiXie_WenBen(el, '自动索引文件数少于 50,000 的新增文件夹', ['index any new folders', '50,000']);
            }
        }]);
    }

    function XiuZheng_MoXing_Ye() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('MO_XING_YE')) return;
        FanYi_SheZhiGen_WenBen_GuiZe(sheZhiGen, [
            {
                test: function(text) { return text.indexOf('深度Seek V4 Pro') !== -1; },
                apply: function(el) {
                    if (!el.querySelector('div, span, p, label, button')) {
                        TiHuan_WenBenJieDian_SuiPian(el, [['深度Seek V4 Pro', 'DeepSeek V4 Pro']]);
                    }
                }
            },
            {
                test: function(text) {
                    return text.indexOf('OpenAI key') !== -1 && text.indexOf('OpenAI models') !== -1;
                },
                apply: function(el) {
                    KeYi_AnQuan_GaiXie_WenBen(el, '您可以填写自己的 OpenAI key 来按成本价使用 OpenAI 模型。', ['OpenAI key', 'OpenAI models']);
                }
            },
            {
                test: function(text) {
                    return text.indexOf('Anthropic key') !== -1 &&
                        (text.indexOf('beginning with') !== -1 || text.indexOf('"claude-"') !== -1);
                },
                apply: function(el) {
                    KeYi_AnQuan_GaiXie_WenBen(el, '您可以填写自己的 Anthropic key 来按成本价使用 Claude。启用后，此 key 将用于所有以 "claude-" 开头的模型。', ['Anthropic key', 'claude-']);
                }
            },
            {
                test: function(text) {
                    return text.indexOf('于 cost') !== -1 && text.indexOf('Anthropic') !== -1;
                },
                apply: function(el) {
                    KeYi_AnQuan_GaiXie_WenBen(el, '您可以填写自己的 Anthropic key 来按成本价使用 Claude。启用后，此 key 将用于所有以 "claude-" 开头的模型。', ['Anthropic key', 'claude-']);
                }
            },
            {
                test: function(text) {
                    return text.indexOf('于 cost') !== -1 ||
                        (text.indexOf('at-cost') !== -1 && text.indexOf('Google models') !== -1);
                },
                apply: function(el) {
                    KeYi_AnQuan_GaiXie_WenBen(el, '您可以填写自己的 Google AI Studio key 来按成本价使用 Google 模型。', ['Google AI Studio key', 'Google models']);
                }
            },
            {
                test: function(text) {
                    return text.indexOf('Google AI Studio key') !== -1 && text.indexOf('Google models') !== -1;
                },
                apply: function(el) {
                    KeYi_AnQuan_GaiXie_WenBen(el, '您可以填写自己的 Google AI Studio key 来按成本价使用 Google 模型。', ['Google AI Studio key', 'Google models']);
                }
            },
            {
                test: function(text) {
                    return text.indexOf('Configure Azure OpenAI') !== -1 && text.indexOf('Azure account') !== -1;
                },
                apply: function(el) {
                    KeYi_AnQuan_GaiXie_WenBen(el, '配置 Azure OpenAI，通过您的 Azure 账户使用 OpenAI 模型。', ['Configure Azure OpenAI', 'Azure account']);
                }
            },
            {
                test: function(text) {
                    return text.indexOf('Configure AWS Bedrock') !== -1 && text.indexOf('AWS account') !== -1;
                },
                apply: function(el) {
                    KeYi_AnQuan_GaiXie_WenBen(el, '配置 AWS Bedrock，通过您的 AWS 账户使用 Anthropic Claude 模型。', ['Configure AWS Bedrock', 'AWS account']);
                }
            },
            {
                test: function(text) {
                    return text.indexOf('Cursor Enterprise teams') !== -1 && text.indexOf('Access Keys') !== -1;
                },
                apply: function(el) {
                    KeYi_AnQuan_GaiXie_WenBen(el, 'Cursor Enterprise 团队可配置 IAM 角色，无需任何 Access Keys 即可访问 Bedrock。', ['Cursor Enterprise teams', 'Access Keys']);
                }
            }
        ]);
    }

    function XiuZheng_UI_DuiHua() {
        if (!document.querySelector('.ui-dialog, .ui-alert-dialog, [class*="ui-dialog"]')) return;
        var hints = [
            ['Close Running Tab?', '关闭运行中的标签页？'],
            ['The chat is currently running. Are you sure you want to close it?', '对话正在运行中。确定要关闭吗？'],
            ['Discard all changes up to this checkpoint?', '放弃截至此检查点的所有更改？'],
            ['You can always undo this later.', '您随时都可以撤销此操作。'],
            ['You can always undo this later. Note: Notebook cells are not supported for reverting.', '您随时都可以撤销此操作。注意：Notebook 单元格不支持还原。'],
            ["Don't ask again", '不再询问']
        ];
        var scopes = document.querySelectorAll('.ui-dialog, .ui-alert-dialog, [class*="ui-dialog"]');
        FanYi_Scope_List_Hints(scopes, hints, {
            maxLen: 240,
            needleLen: 12,
            selector: '.ui-dialog-title, .ui-dialog-description, .ui-alert-dialog-description, .ui-text, h1, h2, p, span, div',
            skipChildQuery: 'button, .ui-alert-dialog-action',
            allowTags: ['BUTTON']
        });
    }

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

    function XiuZheng_GongNeng_TuiGuang() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('GONG_NENG_TUI_GUANG')) return;
        var hints = [
            ["You've hit your usage limit", '您已达到用量上限'],
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
        FanYi_Gen_List_Substring_Hints(
            document.querySelectorAll('div, span, p, button, label, li, option'),
            hints,
            { skipEditor: true, skipDictionary: true, needleLen: 16 }
        );
    }

    function XiuZheng_HuanYing_KuoZhan() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('HUAN_YING')) return;
        var hints = [
            ['Sign in', '登录'],
            ['Log in', '登录'],
            ['Log in to use Cursor AI features', '登录以使用 Cursor AI 功能'],
            ['Open Project', '打开项目'],
            ['Clone Repository', '克隆仓库'],
            ['Connect via SSH', '通过 SSH 连接'],
            ['Repositories', '仓库'],
            ['Browse Files', '浏览文件'],
            ['Message Cursor', '向 Cursor 发送消息'],
            ["Let's kick something off", '让我们开始吧'],
            ['No workspace folder open', '未打开工作区文件夹'],
            ['Close Pane', '关闭窗格'],
            ['Lock Group', '锁定组'],
            ['Unable to load automations.', '无法加载自动化。'],
            ['Unable to load automations', '无法加载自动化'],
            ['Click to import all local VS Code extensions', '点击以导入所有本地 VS Code 扩展'],
            ['Click to import all local VS Code extensions.', '点击以导入所有本地 VS Code 扩展。'],
            ["(don't show again)", '（不再显示）'],
            ["don't show again", '不再显示'],
            ["Don't show again", '不再显示']
        ];
        FanYi_Gen_List_Hints(
            document.querySelectorAll(
                'a, button, span, div, p, label, [role="button"], [role="link"], .monaco-hover, [role="tooltip"]'
            ),
            hints,
            { maxLen: 160, needleLen: 12, leafOnly: true }
        );
    }

    function XiuZheng_YinYing_MoHu() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('YIN_YING_MOHU') && !document.querySelector(
            '.css-inspector-section, .css-effects-type-select, .css-effect-entry, [class*="css-inspector"]'
        )) return;
        var hints = [
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

    function XiuZheng_SheJi_MianBan() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('SHE_JI_MIAN_BAN') && !document.querySelector('.css-inspector-section, .css-effects-type-select')) {
            return;
        }
        try { XiuZheng_YinYing_MoHu(); } catch (e) {}
        var hints = [
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
        var roots = document.querySelectorAll(
            '.css-inspector-section div, .css-inspector-section span, .css-inspector-section button, ' +
            '.css-inspector-section label, .css-inspector-section li, .css-inspector-section option, ' +
            '.css-inspector-section select, div, span, button, label, li, option, [role="option"], [role="menuitem"]'
        );
        FanYi_Gen_List_Hints(roots, hints, { maxLen: 80, needleLen: 12, leafOnly: true });
    }

    function XiuZheng_Upgrade_TiShi() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('UPGRADE_TI_SHI')) return;
        var hints = [
            ["You've hit your usage limit", '您已达到用量上限'],
            ["You're approaching your usage limit", '您的用量即将达到上限'],
            ['Get Cursor Pro for more Agent usage, unlimited Tab, and more.', '升级到 Cursor Pro 以获取更多 Agent 用量、无限 Tab 等。'],
            ['Get Cursor Pro for more Agent usage, unlimited Tab, and more', '升级到 Cursor Pro 以获取更多 Agent 用量、无限 Tab 等。'],
            ['Get Cursor Pro for more Agent usage, Cloud Agents, and more.', '升级到 Cursor Pro 以获取更多智能体用量、云端智能体等。'],
            ['Get Cursor Pro for more Agent usage, Cloud Agents, and more', '升级到 Cursor Pro 以获取更多智能体用量、云端智能体等。'],
            ['Upgrade for extended limits and full model access', '升级以获取扩展限额和完整模型访问权限'],
            ['Upgrade for extended usage & faster responses', '升级以获取扩展用量和更快响应'],
            ['Upgrade for 3x usage & faster responses', '升级以获取 3 倍用量和更快响应'],
            ['Upgrade to a Pro account', '升级到专业版账户'],
            ['Upgrade to Pro', '升级到专业版']
        ];
        FanYi_Gen_List_Substring_Hints(
            document.querySelectorAll('.monaco-hover, .monaco-hover-content, .upgrade-pro-button, .glass-sidebar-upgrade-pro-cta, div, span, p'),
            hints,
            { skipEditor: true, needleLen: 16 }
        );
    }

    function GengXin_Placeholder_ShuXing(root) {
        if (!root) return;
        var nodes = root.querySelectorAll(
            '[data-placeholder], [aria-placeholder], input[placeholder], textarea[placeholder]'
        );
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.closest('.monaco-editor .view-lines')) continue;
            var attrs = ['placeholder', 'data-placeholder', 'aria-placeholder'];
            for (var a = 0; a < attrs.length; a++) {
                var ph = node.getAttribute(attrs[a]);
                if (!ph) continue;
                var tr = ChaZhao_FanYi(ph) || TiHuan_BuFen_WenBen(ph);
                if (tr && tr !== ph) node.setAttribute(attrs[a], tr);
            }
        }
    }

    function FanYi_PromptBar_WenBen(el, maxLen) {
        if (!el || !Shi_PromptBar_QuYu(el)) return false;
        if (el.closest('.monaco-editor .view-lines')) return false;
        maxLen = maxLen || 120;
        var raw = (el.textContent || '').trim();
        if (!raw || raw.length > maxLen) return false;
        if (el.classList && el.classList.contains('prompt-bar-dropdown-shortcut')) return false;
        var tr = ChaZhao_FanYi(raw) || TiHuan_BuFen_WenBen(raw);
        if (!tr) {
            var hints = [
                ['Edit selected code', '编辑所选代码'],
                ['Ask quick question', '快速提问'],
                ['Edit Selection', '编辑选区'],
                ['Quick Question', '快速提问'],
                ['Send', '发送'],
                ['Send to Chat', '发送到聊天'],
                ['Send to chat', '发送到聊天']
            ];
            for (var h = 0; h < hints.length; h++) {
                if (raw === hints[h][0]) { tr = hints[h][1]; break; }
            }
        }
        if (tr && tr !== raw) {
            el.textContent = tr;
            return true;
        }
        return false;
    }

    function FanYi_PromptBar_WenBenJieDian(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) return;
        var parent = node.parentElement;
        if (!parent || !Shi_PromptBar_QuYu(parent)) return;
        if (parent.closest('.monaco-editor .view-lines')) return;
        var text = node.textContent;
        if (!text) return;
        var trimmed = text.trim();
        if (!trimmed || trimmed.length > 120) return;
        var tr = ChaZhao_FanYi(trimmed) || ChaZhao_FanYi(text);
        if (!tr) {
            if (trimmed === 'Edit selected code') tr = '编辑所选代码';
            else if (trimmed === 'Edit Selection') tr = '编辑选区';
            else if (trimmed === 'Send') tr = '发送';
            else if (trimmed === 'Ask quick question') tr = '快速提问';
            else if (trimmed === 'Quick Question') tr = '快速提问';
        }
        if (!tr || tr === trimmed) return;
        var prefix = text.substring(0, text.indexOf(trimmed));
        var suffix = text.substring(text.indexOf(trimmed) + trimmed.length);
        node.textContent = prefix + tr + suffix;
    }

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

    function XiuZheng_KuaiSuBianJi_CmdK() {
        ZhiXing_PromptBar_FanYi();
        if (!window.__cursorPromptBarI18nObserver) {
            window.__cursorPromptBarI18nObserver = true;
            var promptBarTimer = null;
            var obs = new MutationObserver(function() {
                if (ZhengZaiPiLiangFanYi) return;
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

    function XiuZheng_MoXing_XuanZeQi() {
        var attrHints = [
            ['Switch Model', '切换模型'],
            ['Switch to Auto', '切换到自动'],
            ['Switch Model and Retry', '切换模型并重试']
        ];
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
            '[class*="context-usage"], [class*="contextUsage"], [class*="composer"] div, ' +
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
                node.textContent = prefix + tr + suffix;
            }
        }
    }

    function XiuZheng_ZhiNengTi_FanKui() {
        var hints = [
            ['How did the agent do?', '智能体表现如何？'],
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
                    if (tr && tr !== raw) label.textContent = tr;
                }
            }
        }
        try { FanYi_Cursor_Hover_Widget(document.body); } catch (e) {}
    }

    function XiuZheng_Composer_GongJuTiao() {
        var scopes = document.querySelectorAll(
            '[class*="composer"], [class*="aichat"], [class*="chat-input"], [class*="ComposerInput"], ' +
            '.pane-composite-part, [class*="agent-pane"], [class*="agent-changes"], [class*="pending-changes"]'
        );
        for (var r = 0; r < scopes.length; r++) {
            var scope = scopes[r];
            if (scope.closest('.monaco-editor .view-lines')) continue;
            var nodes = scope.querySelectorAll('button, span, div, label, .monaco-keybinding, [class*="keybinding"]');
            for (var i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                if (el.closest('.monaco-editor .view-lines')) continue;
                FanYi_ShuXing(el);
                if (el.querySelector('button, input, textarea, [contenteditable="true"]') && el.tagName !== 'BUTTON') continue;
                var raw = (el.textContent || '').trim();
                if (!raw || raw.length > 80) continue;
                if (/^Stop\s/i.test(raw)) {
                    var stopTr = raw.replace(/^Stop\s*/i, '停止 ');
                    if (stopTr !== raw) el.textContent = stopTr;
                    continue;
                }
                var tr = ChaZhao_FanYi(raw) || TiHuan_BuFen_WenBen(raw);
                if (tr && tr !== raw) KeYi_AnQuan_GaiXie_WenBen(el, tr, [raw.slice(0, 8)]);
            }
        }
    }

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

    function XiuZheng_Composer_Placeholder() {
        GengXin_Placeholder_ShuXing(document.body);
        var hints = [
            ['Edit selected code', '编辑所选代码'],
            ['Ask quick question', '快速提问'],
            ['Plan, Build, / for commands, @ for context', '计划、构建，输入 / 调用命令，输入 @ 添加上下文'],
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
        var placeholders = document.querySelectorAll('[class*="placeholder"], [class*="Placeholder"]');
        FanYi_Gen_List_Hints(placeholders, hints, {
            needleLen: 12,
            leafOnly: true,
            skipMonacoEditor: true
        });
        FanYi_Gen_List_Hints(
            document.querySelectorAll('div, span, p, label'),
            hints,
            {
                needleLen: 12,
                leafOnly: true,
                skipChildQuery: 'div, span, p',
                skipBianJiQi: true
            }
        );
    }

    function XiuZheng_BianJiQi_XuanZe() {
        var labels = [
            ['Add to Chat', '添加到聊天'],
            ['Quick Edit', '快速编辑'],
            ['Create Rule', '创建规则'],
            ['Add Symbol to Current Chat', '将符号添加到当前对话'],
            ['Add Symbol to New Chat', '将符号添加到新对话']
        ];
        function GengXin_BiaoQian(el, from, to) {
            if (!el || !from || !to) return false;
            var raw = (el.textContent || '').trim();
            if (raw === from) {
                el.textContent = to;
                return true;
            }
            if (raw.indexOf(from) >= 0) {
                var neo = raw.split(from).join(to);
                if (neo !== raw) { el.textContent = neo; return true; }
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
            if (htr && htr !== hraw) ht.textContent = htr;
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

    function XiuZheng_DaiQueRen_GaiDong_CaiDan() {
        var menus = document.querySelectorAll(
            '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"]'
        );
        if (!menus.length) return;
        var panelHints = [
            'Pending Changes', 'Changes waiting to be confirmed', 'Keep All', 'Undo All',
            'Find Issues', '待确认更改', '等待确认的更改', '全部保留', '全部撤销', '查找问题'
        ];
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

    function XiuZheng_LiaoTian_LiShi() {
        var menus = document.querySelectorAll(
            '.context-view, .monaco-menu-container, .monaco-menu, [role="menu"], ' +
            '.ui-menu, .ui-menu__layout, .ui-menu__content'
        );
        var chatHints = [
            'Search Agents', 'Chat History', 'Today', 'Yesterday', 'Older', 'Archived',
            'Open in New Tab', 'Rename Chat', 'Restore', 'Pin', 'Keep All', 'Undo All', 'Draft',
            'Fork Chat', 'Mark as Unread', 'Archive Prior Chats', 'Delete', 'Rename',
            'Show more', 'Show 1 more',
            '已归档', '聊天历史', '搜索智能体', '今天', '昨天', '更早', '固定', '恢复', '草稿', '再显示',
            '分叉对话', '标记为未读', '归档较早的对话', '全部保留', '全部撤销', '在新标签页中打开'
        ];
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
                if (povText === 'Search Agents...') {
                    KeYi_AnQuan_GaiXie_WenBen(pov, '搜索智能体...', ['Search Agents']);
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

        TiHuan_WenBenJieDian_SuiPian(document.body, [['Draft: ', '草稿：']]);
    }

    function XiuZheng_ZhiNengTi_MoShi() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('ZHI_NENG_TI_MO_SHI')) return;
        var hints = [
            ['Switch Agent Mode', '切换智能体模式'],
            ['Plan', '计划'],
            ['Debug', '调试'],
            ['Multitask', '多任务'],
            ['Ask', '询问'],
            ['Create detailed plans for accomplishing tasks', '为完成任务创建详细计划'],
            ['Create structured plans with implementation steps', '创建包含实施步骤的结构化计划'],
            ['Systematically diagnose and fix bugs using runtime traces', '使用运行时追踪系统诊断并修复缺陷'],
            ['Run and coordinate multiple tasks in parallel', '并行运行并协调多个任务'],
            ['Ask Cursor questions about your codebase', '就代码库向 Cursor 提问'],
            ['Plan, search, make edits, run commands', '规划、搜索、编辑、运行命令'],
            ['Using terminal selections', '使用终端选区'],
            ['Using image', '使用图像'],
            ['Using video', '使用视频'],
            ['Empty message...', '空消息...'],
            ['Message is too long to display', '消息过长无法显示']
        ];
        var roots = document.querySelectorAll('.monaco-hover, .monaco-hover-content, [role="tooltip"], [role="menu"], [role="menuitem"], .context-view, .monaco-menu, div, span, p');
        FanYi_Gen_List_Hints(roots, hints, { maxLen: 200, needleLen: 8, leafOnly: true });
    }

    function HuoQu_LiuLanQi_Webview_FanYi_JiaoBen() {
        return '(function(){try{' +
            'var E={' +
            '"Browser":"浏览器",' +
            '"Enter a URL above, or instruct the Agent to navigate and use the browser":"在上方输入 URL，或指示智能体导航并使用浏览器",' +
            '"Enter a URL above, or instruct the Agent to navigate and use the browser.":"在上方输入 URL，或指示智能体导航并使用浏览器。",' +
            '"Search or enter URL":"搜索或输入 URL",' +
            '"Connection Failed":"连接失败",' +
            '"Restart Browser":"重启浏览器",' +
            '"Reload":"重新加载",' +
            '"Show Details":"显示详情",' +
            '"Hide Details":"隐藏详情",' +
            '"Connection was refused.":"连接被拒绝。",' +
            '"Connection was refused":"连接被拒绝",' +
            '"This site can\'t be reached":"无法访问此网站",' +
            '"This site can&#39;t be reached":"无法访问此网站",' +
            '"Certificate Error":"证书错误",' +
            '"The certificate for this site is not trusted":"此站点的证书不受信任",' +
            '"Copy error details":"复制错误详情",' +
            '"Inspect Element":"检查元素",' +
            '"Copy Messages":"复制消息",' +
            '"Fork Conversation":"分叉对话"' +
            '};' +
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

    function ZhiXing_LiuLanQi_Webview_FanYi(wv) {
        if (!wv || typeof wv.executeJavaScript !== 'function') return;
        var script = HuoQu_LiuLanQi_Webview_FanYi_JiaoBen();
        try {
            wv.executeJavaScript(script, false).catch(function() {});
        } catch (e) {}
    }

    function FanYi_LiuLanQi_Webview() {
        try {
            var webviews = document.querySelectorAll('webview');
            for (var i = 0; i < webviews.length; i++) {
                ZhiXing_LiuLanQi_Webview_FanYi(webviews[i]);
            }
        } catch (e) {}
    }

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
        function GengXin_AnNiu_TiShi(btn) {
            GengXin_Shuxing_Hints(btn, hints);
        }
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
        var kongBaiHints = [
            ['Browser', '浏览器'],
            ['Enter a URL above, or instruct the Agent to navigate and use the browser', '在上方输入 URL，或指示智能体导航并使用浏览器'],
            ['Enter a URL above, or instruct the Agent to navigate and use the browser.', '在上方输入 URL，或指示智能体导航并使用浏览器。']
        ];
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

    function YanChi_FanYi_LiuLanQi_GongJuTiao() {
        function run() {
            try { XiuZheng_LiuLanQi_GongJuTiao(); } catch (e) {}
        }
        run();
        setTimeout(run, 80);
        setTimeout(run, 250);
        setTimeout(run, 800);
    }

    function XiuZheng_LiuLanQi_CaiDan() {
        if (!QuanJu_BaoHan_GuanJianCi_BiaoQian('LIU_LAN_QI_GONG_JU')) return;
        try { YanChi_FanYi_LiuLanQi_GongJuTiao(); } catch (e) {}
        var hints = [
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
        var roots = document.querySelectorAll('[role="menuitem"], li, div, span, button');
        FanYi_Gen_List_Hints(roots, hints, {
            maxLen: 120,
            skipDictionary: true,
            leafOnly: true
        });
    }

    function XiuZheng_LiuLanQi_CuoWu() {
        try { FanYi_LiuLanQi_Webview(); } catch (e) {}
        var hasBrowserUi = document.querySelector(
            'webview, .browser-navbar, .browser-tools, [class*="browser-navbar"], ' +
            '.browser-error-page, .browser-error-overlay, .glass-browser-error-page'
        );
        if (!hasBrowserUi && !QuanJu_BaoHan_GuanJianCi_BiaoQian('LIU_LAN_QI_CUO_WU')) return;
        var hints = [
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
            ['Copy error details', '复制错误详情']
        ];
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

    function XiuZheng_DuiLie_XiaoXi() {
        var hasQueueUi = !!document.querySelector(
            '.composer-queue-edit-banner, [class*="composer-queue"], [class*="message-queue"], ' +
            '.context-pill-image, .image-pill-container, .ui-prompt-input-image-preview'
        );
        if (!hasQueueUi && !QuanJu_BaoHan_GuanJianCi_BiaoQian('DUI_LIE')) return;
        var hints = [
            ['Queued', '已排队'],
            ['Send now', '立即发送'],
            ['Edit queued message', '编辑排队消息'],
            ['Editing queued message', '正在编辑排队消息'],
            ['Editing queued message...', '正在编辑排队消息...'],
            ['Edit Queued', '编辑排队'],
            ['Attached image', '附加图片'],
            ['View image', '查看图片'],
            ['Remove from queue', '从队列移除']
        ];
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

    function XiuZheng_Cursor_SheZhi() {
        var root = HuoQu_Cursor_SheZhi_Gen();
        if (!root) return;
        FanYi_Cursor_SheZhi_MiaoShu(root, HuoQu_Cursor_SheZhi_MiaoShu_Cfg());
        FanYi_Cursor_SheZhi_BiaoQian(root);
    }

    // __DROPDOWN_FRAGMENTS_BLOCK__


    function FanYi_XiaLa_WenBen(node, sheZhiMoShi) {
        if (!node || Shi_BianJiQi_QuYu(node)) return;
        if (Shi_QuickInput_QuYu(node.parentElement)) return;
        try {
            if (node.parentElement && Shi_CaiDan_QuYu(node.parentElement) && !Shi_CaiDan_WenBen_JieDian(node)) return;
        } catch (e) {}
        var text = node.textContent;
        if (!text || text.length > 200) return;
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
        var tierOnly = { 'medium': '中等', 'extra high': '超高', 'fast': '快速', 'low': '低', 'high': '高' };
        if (tierOnly[trimmed.toLowerCase()]) {
            node.textContent = tierOnly[trimmed.toLowerCase()];
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
        if (result !== text) node.textContent = result;
    }

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

    function XiuZheng_XiaLaKuang_MianBan() {
        var scopes = document.querySelectorAll(
            '.monaco-select-box-dropdown-container, .context-view, .monaco-list-row, ' +
            '[role="listbox"], [role="option"], .monaco-hover, .monaco-hover-content, ' +
            '[class*="model-picker"], [class*="premium-model"], [class*="upgrade"], ' +
            '.monaco-menu, .monaco-menu-container, [role="menu"], [role="menuitem"]'
        );
        BianLi_XiaLa_WenBen(scopes, false);
        var caiDanGen = document.querySelectorAll('.context-view, .monaco-menu-container, .monaco-menu');
        for (var cg = 0; cg < caiDanGen.length; cg++) {
            try { FanYi_Monaco_CaiDan(caiDanGen[cg]); } catch (e) {}
        }
        if (Shi_Cursor_SheZhi_QuYu()) {
            var settingScopes = document.querySelectorAll(
                '[class*="cursor-settings"] [role="combobox"], [class*="cursor-settings"] .monaco-select-box, ' +
                '[class*="cursor-settings"] [class*="select-box"], [class*="cursor-settings"]'
            );
            BianLi_XiaLa_WenBen(settingScopes, true);
        }
    }

    function Shi_Cursor_SheZhi_QuYu() {
        return !!document.querySelector('[class*="cursor-settings"], .cursor-settings-cell');
    }

    function XiuZheng_SheZhi_XiaLaKuang() {
        XiuZheng_XiaLaKuang_MianBan();
    }

    function AnZhuang_SheZhi_XiaLa_GuanCha() {
        if (window.__cursorSheZhiXiaLaObs) return;
        var root = document.body;
        var debounce = null;
        var obs = new MutationObserver(function() {
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

    function HuoQu_YinCang_DuiHua_SuiPian() {
        return [
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
    }

    function XiuZheng_YinCang_DuiHua_SheZhi() {
        var bodyText = '';
        try { bodyText = document.body ? (document.body.textContent || '') : ''; } catch (e) { return; }
        if (bodyText.indexOf('Ask Again') === -1) return;
        if (bodyText.indexOf('Hidden Dialogs') === -1 &&
            bodyText.indexOf('hidden dialogs') === -1 &&
            bodyText.indexOf('暂无隐藏') === -1) return;
        var fragments = HuoQu_YinCang_DuiHua_SuiPian();
        var roots = document.querySelectorAll(
            '[class*="cursor-settings"], .settings-editor, .settings-body, [class*="settings-group"], [class*="setting-item"]'
        );
        var scopeList = roots.length ? Array.prototype.slice.call(roots) : [document.body];
        for (var r = 0; r < scopeList.length; r++) {
            var scopeText = scopeList[r].textContent || '';
            if (scopeText.indexOf('Ask Again') === -1 && scopeText.indexOf('暂无隐藏') === -1) continue;
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

    function XiuZheng_SheZhi_SuiPian() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('SUI_PIAN')) return;
        try { XiuZheng_Cursor_SheZhi(); } catch (e) {}
        FanYi_SheZhiGen_Symlink_MiaoShu(sheZhiGen);
        FanYi_SheZhiGen_Leaf_SuiPian(sheZhiGen, [
            ['自动mation Profile', '自动化配置文件'],
            ['Focus 开 Command Execution', '命令执行时聚焦'],
            ['Preserve Cursor Position', '保留光标位置'],
            ['Natural Language 搜索', '自然语言搜索'],
            ['Auto Resume', '自动恢复'],
            ['Auto Store', '自动存储'],
            ['Partial Matches', '部分匹配'],
            ['Continue Prompt', '继续提示'],
            ['Reset \'Don\'t Ask Again\' Dialogs', '重置「不再询问」对话框'],
            ['Reset "Don\'t Ask Again" Dialogs', '重置「不再询问」对话框'],
            ['See warnings and tips that you\'ve hidden', '查看您已隐藏的警告和提示'],
            ['You haven\'t marked any dialogs as \'Don\'t ask again\'. Any hidden dialogs will appear here to manage.', '您尚未将任何对话框标记为「不再询问」。已隐藏的对话框将显示在此处以供管理。']
        ]);
        FanYi_SheZhiGen_SuiPian_PiPei(sheZhiGen, [
            ['Reset \'Don\'t Ask Again\' Dialogs', '重置「不再询问」对话框'],
            ['Reset "Don\'t Ask Again" Dialogs', '重置「不再询问」对话框'],
            ['See warnings and tips that you\'ve hidden', '查看您已隐藏的警告和提示'],
            ['You haven\'t marked any dialogs as \'Don\'t ask again\'. Any hidden dialogs will appear here to manage.', '您尚未将任何对话框标记为「不再询问」。已隐藏的对话框将显示在此处以供管理。']
        ], function(text) {
            return ChaZhao_FanYi(text) || TiHuan_BuFen_WenBen(text);
        }, {
            selector: 'div, span, p, label, h1, h2, h3',
            maxLen: 240
        });
    }

    function XiuZheng_ZhangHu_JiHua() {
        var sheZhiGen = HuoQu_SheZhi_Gen_JieDian();
        if (!sheZhiGen) return;
        if (!QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian('ZHANG_HU')) return;
        var hints = [
            ['Current Plan', '当前计划'],
            ['Current plan', '当前计划'],
            ['Review Changes', '审查更改'],
            ['New User Rule', '新建用户规则'],
            ['VS Code Settings', 'VS Code 设置'],
            ['Copy Domains', '复制域名'],
            ['Run Diagnostic', '运行诊断'],
            ['Tools & MCPs', '工具与 MCP']
        ];
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
        var all = sheZhiGen.querySelectorAll('div, span, p, label, button, a');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (YingGai_TiaoGuo_BianJiQi_YuanSu(el)) continue;
            if (el.querySelector('div, span, p, button')) continue;
            var text = GuiYiHua_WenBen(el.textContent || '');
            if (/^免费版\s+免费版$/i.test(text)) {
                KeYi_AnQuan_GaiXie_WenBen(el, '免费版', ['免费版']);
            }
        }
        var baselines = document.querySelectorAll('.flex.items-baseline, [class*="items-baseline"]');
        for (var b = 0; b < baselines.length; b++) {
            var row = baselines[b];
            var kids = row.children;
            var freeSeen = false;
            for (var k = 0; k < kids.length; k++) {
                var kid = kids[k];
                var kt = GuiYiHua_WenBen(kid.textContent || '');
                if (kt === '免费版' || kt === 'Free') {
                    if (freeSeen) {
                        kid.textContent = '';
                        kid.style.display = 'none';
                    } else {
                        freeSeen = true;
                        if (kt === 'Free') kid.textContent = '免费版';
                    }
                }
            }
        }
    }

    var ShiJianXian_ZiYuan_Ming = {
        'marketplace': '市场',
        'Marketplace': '市场'
    };

    function XiuZheng_ShiJianXian() {
        var roots = [];
        var seen = new Set();
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
                    node.textContent = prefix + tr + suffix;
                }
            }
        }
    }
