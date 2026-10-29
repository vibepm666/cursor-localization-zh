    // 通用 DOM 补丁辅助（供 XiuZheng_* 复用）

    // 按提示表翻译元素的 title、aria-label 等属性
    function GengXin_Shuxing_Hints(el, hints, attrs) {
        if (!el) return;
        attrs = attrs || ['title', 'aria-label'];
        for (var a = 0; a < attrs.length; a++) {
            var val = el.getAttribute(attrs[a]);
            if (!val) continue;
            var tr = ChaZhao_FanYi(val) || TiHuan_BuFen_WenBen(val);
            if (tr) {
                el.setAttribute(attrs[a], tr);
                continue;
            }
            for (var j = 0; j < hints.length; j++) {
                if (val === hints[j][0]) {
                    el.setAttribute(attrs[a], hints[j][1]);
                    break;
                }
            }
        }
    }

    // 按提示表或词典改写叶子文本，跳过编辑器和输入区
    function GengXin_WenBen_YeZi_Hints(el, hints, opts) {
        if (!el || (typeof TiaoGuo_XuanZeQi === 'string' && el.closest(TiaoGuo_XuanZeQi))) return;
        if (typeof Shi_KongZhuangTai_TiShi === 'function' && Shi_KongZhuangTai_TiShi(el)) return;
        if (typeof Shi_HuiFu_ZhengWen === 'function' && Shi_HuiFu_ZhengWen(el)) return;
        if (typeof Shi_WenJianShu_MingCheng === 'function' && Shi_WenJianShu_MingCheng(el)) return;
        if (typeof Shi_BianJiQi_QuYu === 'function' && Shi_BianJiQi_QuYu(el)) return;
        if (typeof Shi_YongHu_ShuRu_QuYu === 'function' && Shi_YongHu_ShuRu_QuYu(el)) return;
        opts = opts || {};
        var maxLen = opts.maxLen || 120;
        var needleLen = opts.needleLen || 8;
        var allowTags = opts.allowTags || ['BUTTON', 'A', 'LI'];
        var skipChildQuery = opts.skipChildQuery ||
            'span, div, button, .action-label';
        if (opts.leafOnly) {
            if (el.querySelector('div, span, p, button, input, textarea')) return;
        } else if (el.querySelector(skipChildQuery) &&
            allowTags.indexOf(el.tagName) < 0 &&
            !(el.classList && el.classList.contains('action-label'))) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (opts.translatePlaceholder) {
                var ph = el.getAttribute('placeholder');
                if (ph) {
                    var phTr = ChaZhao_FanYi(ph) || TiHuan_BuFen_WenBen(ph);
                    if (phTr && phTr !== ph) el.setAttribute('placeholder', phTr);
                }
            }
            return;
        }
        var text = GuiYiHua_WenBen(el.textContent || '');
        if (!text || text.length > maxLen) return;
        for (var j = 0; j < hints.length; j++) {
            if (text === hints[j][0] ||
                (typeof GuiYiHua_YinHao === 'function' &&
                    GuiYiHua_YinHao(text) === GuiYiHua_YinHao(hints[j][0]))) {
                KeYi_AnQuan_GaiXie_WenBen(el, hints[j][1], [hints[j][0].slice(0, needleLen)]);
                return;
            }
        }
        if (!opts.skipDictionary) {
            var tr = ChaZhao_FanYi(text) || TiHuan_BuFen_WenBen(text);
            if (tr && tr !== text) KeYi_AnQuan_GaiXie_WenBen(el, tr, [text.slice(0, Math.max(needleLen, 10))]);
        }
    }

    // 在指定范围内翻译叶子节点的属性和文本
    function FanYi_Scope_YeZi_Hints(scope, hints, opts) {
        if (!scope || scope.closest('.monaco-editor .view-lines')) return;
        var selector = (opts && opts.selector) ||
            'span, div, label, button, a, li, .action-label';
        var els = scope.querySelectorAll(selector);
        for (var i = 0; i < els.length; i++) {
            FanYi_ShuXing(els[i]);
            GengXin_WenBen_YeZi_Hints(els[i], hints, opts);
        }
    }

    // 翻译表单范围内的叶子文本，并处理占位符
    function FanYi_Scope_Form_Hints(scope, hints, opts) {
        opts = opts || {};
        opts.translatePlaceholder = true;
        opts.skipChildQuery = opts.skipChildQuery || 'button, textarea, input';
        opts.allowTags = opts.allowTags || ['BUTTON', 'TEXTAREA', 'INPUT'];
        FanYi_Scope_YeZi_Hints(scope, hints, opts);
    }

    // 对一组范围逐个做叶子节点翻译
    function FanYi_Scope_List_Hints(scopeList, hints, opts) {
        for (var r = 0; r < scopeList.length; r++) {
            FanYi_Scope_YeZi_Hints(scopeList[r], hints, opts);
        }
    }

    // 对已选出的元素列表做属性和叶子文本翻译
    function FanYi_Gen_List_Hints(roots, hints, opts) {
        for (var r = 0; r < roots.length; r++) {
            var el = roots[r];
            if (!el || el.closest('.monaco-editor .view-lines')) continue;
            if (opts && opts.skipBianJiQi && YingGai_TiaoGuo_BianJiQi_YuanSu(el)) continue;
            if (opts && opts.skipMonacoEditor && el.closest('.monaco-editor')) continue;
            FanYi_ShuXing(el);
            GengXin_WenBen_YeZi_Hints(el, hints, opts);
        }
    }

    // 按子串匹配提示表改写元素文本
    function FanYi_Gen_List_Substring_Hints(roots, hints, opts) {
        opts = opts || {};
        var needleLen = opts.needleLen || 16;
        for (var r = 0; r < roots.length; r++) {
            var el = roots[r];
            if (!el) continue;
            if (el.closest('.monaco-editor .view-lines')) continue;
            if (typeof Shi_HuiFu_ZhengWen === 'function' && Shi_HuiFu_ZhengWen(el)) continue;
            if (typeof Shi_WenJianShu_MingCheng === 'function' && Shi_WenJianShu_MingCheng(el)) continue;
            if (typeof Shi_YongHu_ShuRu_QuYu === 'function' && Shi_YongHu_ShuRu_QuYu(el)) continue;
            if (opts.skipEditor && el.closest('.monaco-editor')) continue;
            FanYi_ShuXing(el);
            var text = GuiYiHua_WenBen(el.textContent || '');
            if (!text) continue;
            if (opts.maxLen && text.length > opts.maxLen) continue;
            var matched = false;
            for (var j = 0; j < hints.length; j++) {
                if (text === hints[j][0] ||
                    text.indexOf(hints[j][0]) !== -1 ||
                    (typeof GuiYiHua_YinHao === 'function' &&
                        GuiYiHua_YinHao(text) === GuiYiHua_YinHao(hints[j][0]))) {
                    KeYi_AnQuan_GaiXie_WenBen(el, hints[j][1], [hints[j][0].slice(0, needleLen)]);
                    matched = true;
                    break;
                }
            }
            if (!matched && !opts.skipDictionary) {
                var tr = ChaZhao_FanYi(text) || TiHuan_BuFen_WenBen(text);
                if (tr && tr !== text) KeYi_AnQuan_GaiXie_WenBen(el, tr, [text.slice(0, needleLen)]);
            }
        }
    }

    // 只按词典和正则翻译范围内的可见文本
    function FanYi_Scope_ZiDian_Only(scopeList, opts) {
        opts = opts || {};
        var selector = opts.selector ||
            'h1, h2, h3, h4, p, span, div, button, a, label';
        var maxLen = opts.maxLen || 600;
        var needleLen = opts.needleLen || 14;
        for (var s = 0; s < scopeList.length; s++) {
            var scope = scopeList[s];
            if (!scope) continue;
            var els = scope.querySelectorAll ? scope.querySelectorAll(selector) : [];
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                if (el.closest('.monaco-editor .view-lines')) continue;
                if (opts.skipHoverWidget && el.closest('.cursorHoverWidget')) continue;
                if (opts.skipNestedInteractive) {
                    if (el.querySelector('button, a') && el.tagName !== 'BUTTON' && el.tagName !== 'A') continue;
                    if (el.querySelector('h1, h2, h3, h4, p, div') &&
                        el.tagName !== 'BUTTON' && el.tagName !== 'A') continue;
                }
                FanYi_ShuXing(el);
                var raw = (el.textContent || '').trim();
                if (!raw || raw.length > maxLen) continue;
                var tr = ChaZhao_FanYi(raw) || TiHuan_BuFen_WenBen(raw);
                if (tr && tr !== raw) {
                    KeYi_AnQuan_GaiXie_WenBen(el, tr, [raw.slice(0, needleLen)]);
                }
            }
        }
    }

    // 在设置根节点下按选择器收集候选元素
    function FanYi_SheZhiGen_YeZi(sheZhiGen, selector) {
        if (!sheZhiGen) return [];
        return sheZhiGen.querySelectorAll(selector || 'div, span, p, label');
    }

    // 对命中条件的设置文本做片段替换
    function FanYi_SheZhiGen_SuiPian_PiPei(sheZhiGen, fragments, piPeiFn, opts) {
        if (!sheZhiGen || !fragments || !fragments.length) return;
        var all = FanYi_SheZhiGen_YeZi(sheZhiGen, opts && opts.selector);
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (YingGai_TiaoGuo_BianJiQi_YuanSu(el)) continue;
            var text = GuiYiHua_WenBen(el.textContent || '');
            if (!text || (opts && opts.maxLen && text.length > opts.maxLen)) continue;
            if (piPeiFn(text)) TiHuan_WenBenJieDian_SuiPian(el, fragments);
        }
    }

    // 按自定义规则改写设置页文本
    function FanYi_SheZhiGen_WenBen_GuiZe(sheZhiGen, guiZe, opts) {
        if (!sheZhiGen || !guiZe || !guiZe.length) return;
        var all = FanYi_SheZhiGen_YeZi(sheZhiGen, opts && opts.selector);
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (YingGai_TiaoGuo_BianJiQi_YuanSu(el)) continue;
            var text = GuiYiHua_WenBen(el.textContent || '');
            if (!text) continue;
            for (var g = 0; g < guiZe.length; g++) {
                if (guiZe[g].test(text, el)) {
                    guiZe[g].apply(el, text);
                    break;
                }
            }
        }
    }

    // 同时翻译范围内元素的属性和叶子文本
    function FanYi_Scope_Attr_And_Hints(scopes, hints, opts) {
        opts = opts || {};
        var selector = opts.selector || 'span, div, button, label';
        for (var s = 0; s < scopes.length; s++) {
            var scope = scopes[s];
            if (!scope || scope.closest('.monaco-editor .view-lines')) continue;
            GengXin_Shuxing_Hints(scope, hints, opts.attrs);
            var nodes = scope.querySelectorAll ? scope.querySelectorAll(selector) : [];
            for (var n = 0; n < nodes.length; n++) {
                var el = nodes[n];
                if (el.closest('.monaco-editor .view-lines')) continue;
                if (opts.skipMultiChild &&
                    el.querySelector('span, div, button') &&
                    el.childElementCount > 1) continue;
                GengXin_Shuxing_Hints(el, hints, opts.attrs);
                GengXin_WenBen_YeZi_Hints(el, hints, opts);
            }
        }
    }

    // 去掉文本开头的警告符号
    function QuDiao_JingGao_FuHao(text) {
        if (!text) return '';
        return text.replace(/^[\u26A0\uFE0F\u26A0]\s*/u, '').trim();
    }

    // 当前在 Cursor 设置页时返回设置根节点
    function HuoQu_Cursor_SheZhi_Gen() {
        if (!document.querySelector(
            '.cursor-settings-cell, .cursor-settings-section, [class*="cursor-settings"]'
        )) return null;
        return HuoQu_SheZhi_Gen_JieDian();
    }

    // 返回设置说明翻译用的符号链接与域名片段
    function HuoQu_Cursor_SheZhi_MiaoShu_Cfg() {
        return {
            symlinkZh: Cursor_SheZhi_Symlink_Zh,
            symlinkZhAdmin: Cursor_SheZhi_Symlink_ZhAdmin,
            symlinkTail: Cursor_SheZhi_Symlink_Tail,
            mcpFragments: Cursor_SheZhi_MCP_SuiPian,
            domainFragments: Cursor_SheZhi_Domain_SuiPian
        };
    }

    // 翻译 Cursor 设置页的说明文字
    function FanYi_Cursor_SheZhi_MiaoShu(root, cfg) {
        if (!root || !cfg) return;
        var descSelector = cfg.descSelector ||
            '.cursor-settings-cell-description, .cursor-settings-section-header-description, ' +
            '[class*="cursor-settings"] [class*="description"], ' +
            '[class*="cursor-settings"] [class*="subtitle"], [class*="cursor-settings"] p';
        var descs = root.querySelectorAll(descSelector);
        for (var i = 0; i < descs.length; i++) {
            var el = descs[i];
            if (el.closest('.monaco-editor .view-lines')) continue;
            var raw = el.textContent || '';
            if (!raw || raw.length > (cfg.maxLen || 500)) continue;
            var text = GuiYiHua_WenBen(raw);
            var plain = QuDiao_JingGao_FuHao(text);
            var tr = ChaZhao_FanYi(raw) || ChaZhao_FanYi(text) || ChaZhao_FanYi(plain) ||
                TiHuan_BuFen_WenBen(raw) || TiHuan_BuFen_WenBen(plain);
            if (!tr && plain.indexOf(SheZhi_MiaoShu_GuanJianCi.skipDuring) >= 0 && plain.indexOf(SheZhi_MiaoShu_GuanJianCi.caution) >= 0) {
                tr = plain.indexOf(SheZhi_MiaoShu_GuanJianCi.admin) >= 0
                    ? (cfg.symlinkZhAdmin + cfg.symlinkTail)
                    : (cfg.symlinkZh + cfg.symlinkTail);
            }
            if (!tr && plain.indexOf(SheZhi_MiaoShu_GuanJianCi.mcp) >= 0) {
                if (el.childElementCount > 0) {
                    TiHuan_WenBenJieDian_SuiPian(el, cfg.mcpFragments);
                    continue;
                }
                tr = TiHuan_BuFen_WenBen(raw) || TiHuan_BuFen_WenBen(plain);
            }
            if (!tr && plain.indexOf(SheZhi_MiaoShu_GuanJianCi.domain) >= 0) {
                if (el.childElementCount > 0) {
                    TiHuan_WenBenJieDian_SuiPian(el, cfg.domainFragments);
                    continue;
                }
                tr = TiHuan_BuFen_WenBen(raw) || TiHuan_BuFen_WenBen(plain);
            }
            if (tr && GuiYiHua_WenBen(raw) !== GuiYiHua_WenBen(tr)) {
                XieRu_YuanSu_WenBen(el, tr);
            }
        }
    }

    // 翻译 Cursor 设置页的标题和标签
    function FanYi_Cursor_SheZhi_BiaoQian(root) {
        if (!root) return;
        var labels = root.querySelectorAll(
            '.cursor-settings-cell-label, .cursor-settings-section-header-title, ' +
            '[class*="cursor-settings"] h1, [class*="cursor-settings"] h2, [class*="cursor-settings"] h3, ' +
            '[class*="cursor-settings"] [class*="title"], [class*="cursor-settings"] [class*="label"]'
        );
        for (var j = 0; j < labels.length; j++) {
            FanYi_ShuXing(labels[j]);
            var lraw = GuiYiHua_WenBen(labels[j].textContent || '');
            if (!lraw) continue;
            var ltr = ChaZhao_FanYi(lraw) || TiHuan_BuFen_WenBen(lraw);
            if (ltr && ltr !== lraw) {
                if (labels[j].childElementCount > 0) {
                    TiHuan_WenBenJieDian_SuiPian(labels[j], [[lraw, ltr]]);
                } else {
                    XieRu_YuanSu_WenBen(labels[j], ltr);
                }
            }
        }
    }

    // 设置说明里用来识别符号链接、MCP 和域名段落的原文
    var SheZhi_MiaoShu_GuanJianCi = {
        caution: 'Use with caution',
        skip: 'Skip symlinks',
        skipDuring: 'Skip symlinks during',
        admin: '(controlled by admin)',
        mcp: 'MCP tools that can run automatically',
        domain: 'Domains that Agent can fetch from automatically'
    };

    // 「跳过符号链接」设置说明的片段替换
    var SheZhi_Symlink_SuiPian = [
        ['Use with caution.', '谨慎使用。'],
        ['Skip symlinks during', '在 .cursorignore 文件发现期间跳过符号链接。'],
        ['Only enable if your repository has many symlinks', '仅在您的仓库有很多符号链接时启用'],
        ['Changing this setting will require a restart of Cursor.', '更改此设置需要重启 Cursor。']
    ];

    // 翻译跳过符号链接相关的设置说明
    function FanYi_SheZhiGen_Symlink_MiaoShu(sheZhiGen, opts) {
        if (!sheZhiGen) return;
        opts = opts || {};
        var descSelector = opts.descSelector ||
            '.setting-item-description, .settings-description, .cursor-settings-cell-description, ' +
            '[class*="setting"] p, [class*="settings"] p, div, span, p, label';
        var descs = sheZhiGen.querySelectorAll(descSelector);
        for (var di = 0; di < descs.length; di++) {
            var del = descs[di];
            if (YingGai_TiaoGuo_BianJiQi_YuanSu(del)) continue;
            var draw = del.textContent || '';
            var dtext = GuiYiHua_WenBen(draw);
            if (!dtext || dtext.length > (opts.maxLen || 400)) continue;
            if (dtext.indexOf(SheZhi_MiaoShu_GuanJianCi.caution) === -1 || dtext.indexOf(SheZhi_MiaoShu_GuanJianCi.skip) === -1) continue;
            var dplain = QuDiao_JingGao_FuHao(dtext);
            var dtr = ChaZhao_FanYi(draw) || ChaZhao_FanYi(dtext) || ChaZhao_FanYi(dplain) ||
                TiHuan_BuFen_WenBen(dplain);
            if (dtr && GuiYiHua_WenBen(draw) !== GuiYiHua_WenBen(dtr)) XieRu_YuanSu_WenBen(del, dtr);
        }
    }

    // 对设置页叶子节点做片段替换
    function FanYi_SheZhiGen_Leaf_SuiPian(sheZhiGen, fragments, opts) {
        if (!sheZhiGen || !fragments || !fragments.length) return;
        opts = opts || {};
        var all = sheZhiGen.querySelectorAll(opts.selector || 'div, span, p, label');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (YingGai_TiaoGuo_BianJiQi_YuanSu(el)) continue;
            if (el.querySelector('div, span, p, label, button')) continue;
            var text = GuiYiHua_WenBen(el.textContent || '');
            if (!text || text.length > (opts.maxLen || 200)) continue;
            if (/^[a-z][\w-]*(?:\.[A-Za-z][\w-]*){1,}$/i.test(text)) continue;
            if (text.indexOf(SheZhi_MiaoShu_GuanJianCi.caution) !== -1 && text.indexOf(SheZhi_MiaoShu_GuanJianCi.skip) !== -1) {
                TiHuan_WenBenJieDian_SuiPian(el, SheZhi_Symlink_SuiPian);
                continue;
            }
            TiHuan_WenBenJieDian_SuiPian(el, fragments);
        }
    }

    // 判断子树遍历是否应跳过该元素
    function YingGai_TiaoGuo_FanYi_ZiShu_YuanSu(el) {
        if (!el || el.nodeType !== 1) return false;
        if (el.classList && el.classList.contains('monaco-editor')) return true;
        if (typeof Shi_YongHu_ShuRu_QuYu === 'function' && Shi_YongHu_ShuRu_QuYu(el)) return true;
        try {
            if (typeof TiaoGuo_XuanZeQi === 'string' && el.closest(TiaoGuo_XuanZeQi)) return true;
            if (el.closest('.monaco-editor, .monaco-diff-editor, .monaco-component, .ui-code-block, .cm-editor, .cm-content, pre, code, .view-line, .sticky-widget, .code-view, .code-line, .code-content, .simple-code-render, .monaco-tokenized-source, [class*="ui-default-diff"], [class*="ui-default-code"], [data-component="embedded-file-viewer"], [data-streamdown="code-block-body"]')) return true;
            if (el.closest('webview')) return true;
            if (el.closest('.menubar, [role="menubar"], .menubar-menu-title, .menubar-menu-button')) return true;
            if (el.matches && el.matches(
                '.view-lines, .editor-scrollable, .overflow-guard, .inputarea, .margin, .minimap'
            )) return true;
        } catch (e) {}
        return false;
    }

    // 收集工作台和浮动层作为翻译根节点
    function HuoQu_FanYi_ZiShu_Gen() {
        var roots = [];
        var seen = new Set();
        // 去重后加入翻译根节点
        function pushRoot(el) {
            if (!el || seen.has(el)) return;
            seen.add(el);
            roots.push(el);
        }
        var wb = document.querySelector('.monaco-workbench');
        if (wb) {
            var parts = wb.children;
            for (var i = 0; i < parts.length; i++) pushRoot(parts[i]);
            if (!roots.length) pushRoot(wb);
        }
        var floats = document.querySelectorAll(
            'body > .context-view, body > .monaco-hover, body > .monaco-menu-container, ' +
            'body > .monaco-select-box-dropdown-container, body > .quick-input-widget'
        );
        for (var f = 0; f < floats.length; f++) pushRoot(floats[f]);
        if (!roots.length && document.body) pushRoot(document.body);
        return roots;
    }

    // 对全部翻译根节点执行子树翻译
    function FanYi_ZiShu_QuYu() {
        var roots = HuoQu_FanYi_ZiShu_Gen();
        for (var i = 0; i < roots.length; i++) {
            try { FanYi_ZiShu(roots[i]); } catch (e) {}
        }
    }
