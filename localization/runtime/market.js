    var ShiChang_FanYi_Jian = 'Cursor_Localization_Market_Translate'; // 市场翻译开关在 localStorage 中的键
    var ShiChang_FanYi_Kai = true; // 是否翻译插件市场界面
    try { ShiChang_FanYi_Kai = localStorage.getItem(ShiChang_FanYi_Jian) !== '0'; } catch (e) {}
    var ShiChang_ZaiXianFanYi_Kai = false; // 是否允许在线翻译市场描述
    try { ShiChang_ZaiXianFanYi_Kai = localStorage.getItem('Cursor_Localization_Market_Online_Translate') === '1'; } catch (e) {}
    var ShiChang_Ye_HuanCun = { time: 0, value: false }; // 当前是否停留在市场页的短时缓存
    var ShiChang_ZaiXianFanYi_BenLun = 0; // 本轮已发起的在线翻译次数

    var ShiChang_CiDian_YiJiaZai = false; // 市场词典是否已装入内存
    var ShiChang_ChaJian_MingCheng = {}; // 插件名英文到中文
    var ShiChang_UI_BiaoQian = {}; // 市场界面固定标签
    var ShiChang_UI_SuiPian = []; // 市场界面片段替换
    var ShiChang_MoShi_FanYi = []; // 市场动态文本的正则
    var ShiChang_JiNeng_MingCheng = {}; // 技能名英文到中文
    var ShiChang_MingCheng_CiGen = {}; // 名称词干，用来翻译变体
    var ShiChang_MiaoShu_SuiPian = []; // 插件描述里的片段替换
    var ShiChang_ZaiXianFanYi_Zhong = new Set(); // 正在请求在线翻译的原文

    // __PLUGIN_MARKETPLACE_BLOCK__

    // 懒加载插件市场词典
    function JiaZai_ShiChang_CiDian() {
        if (ShiChang_CiDian_YiJiaZai) return;
        if (typeof __ShiChang_CiDian_Ke !== 'function') return;
        var p = __ShiChang_CiDian_Ke();
        ShiChang_ChaJian_MingCheng = p.pluginNames || {};
        ShiChang_UI_BiaoQian = p.uiLabels || {};
        ShiChang_UI_SuiPian = p.uiFragments || [];
        ShiChang_MoShi_FanYi = p.patterns || [];
        ShiChang_JiNeng_MingCheng = p.skillNames || {};
        ShiChang_MingCheng_CiGen = p.nameStems || {};
        ShiChang_MiaoShu_SuiPian = p.descriptionFragments || [];
        ShiChang_CiDian_YiJiaZai = true;
    }

    // 确保市场词典已经加载
    function BaoZhang_ShiChang_CiDian() {
        JiaZai_ShiChang_CiDian();
    }

    // 用市场词典、片段和正则翻译描述
    function FanYi_ShiChang_MiaoShu(text) {
        BaoZhang_ShiChang_CiDian();
        if (!text) return null;
        var trimmed = GuiYiHua_WenBen(text);

        if (ShiChang_UI_BiaoQian[trimmed]) return ShiChang_UI_BiaoQian[trimmed];

        var dict = ChaZhao_FanYi(text);
        if (dict) return dict;

        var partialDict = TiHuan_BuFen_WenBen(text);
        if (partialDict) return partialDict;

        var result = text;
        var changed = false;
        var applyPairs = function(pairs) {
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i];
                var neo = result.split(pair[0]).join(pair[1]);
                if (pair[0].indexOf('...') !== -1) {
                    neo = neo.split(pair[0].replace(/\.\.\./g, '…')).join(pair[1].replace(/\.\.\./g, '…'));
                }
                if (neo !== result) {
                    result = neo;
                    changed = true;
                }
            }
        };
        applyPairs(ShiChang_UI_SuiPian);
        applyPairs(ShiChang_MiaoShu_SuiPian);

        var normalized = GuiYiHua_WenBen(result);
        for (var j = 0; j < ShiChang_MoShi_FanYi.length; j++) {
            var mp = ShiChang_MoShi_FanYi[j];
            if (mp[0].test(result)) {
                result = result.replace(mp[0], mp[1]);
                changed = true;
            } else if (normalized !== result && mp[0].test(normalized)) {
                result = normalized.replace(mp[0], mp[1]);
                changed = true;
            }
        }
        applyPairs(ShiChang_UI_SuiPian);

        if (!changed && /^[\s\w.-]+$/.test(trimmed) && trimmed.length < 60 && trimmed.indexOf(' ') === -1) return null;
        return changed ? result : null;
    }

    // 判断市场文本是否已经含有中文
    function Shi_YiFanYi_De_ShiChang_WenBen(text) {
        return !!(text && /[\u4e00-\u9fff]/.test(text));
    }

    // 判断是否为适合在线翻译的英文描述
    function Shi_ShiChang_YingWen_MiaoShu(text) {
        if (!text) return false;
        var trimmed = GuiYiHua_WenBen(text);
        if (trimmed.length < 18 || trimmed.length > 500) return false;
        if (/[\u4e00-\u9fff]/.test(trimmed)) return false;
        if (!/[A-Za-z]/.test(trimmed) || trimmed.indexOf(' ') === -1) return false;
        if (/^[\w.-]+$/.test(trimmed)) return false;
        if (/^(Search|Get|Add to Cursor|Browse Marketplace|Suggested|Featured|Documentation)$/i.test(trimmed)) return false;
        return true;
    }

    // 请求在线翻译并缓存市场描述
    function FanYi_ShiChang_ZaiXian(node, original) {
        if (!Shi_ShiChang_YingWen_MiaoShu(original)) return;
        if (Shi_YiFanYi_De_ShiChang_WenBen(node.textContent || '')) return;
        if (ShiChang_ZaiXianFanYi_BenLun >= 8) return;
        var key = 'Cursor_Localization_Market_Cache_' + original;
        var cached = null;
        try { cached = localStorage.getItem(key); } catch (e) {}
        if (cached) {
            node.__cursorShiChangYuanWen = original;
            node.__cursorShiChangYiWen = cached;
            XieRu_WenBen_JieDian(node, cached);
            return;
        }
        if (ShiChang_ZaiXianFanYi_Zhong.has(original)) return;
        ShiChang_ZaiXianFanYi_Zhong.add(original);
        ShiChang_ZaiXianFanYi_BenLun++;

        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=' + encodeURIComponent(original);
        fetch(url)
            .then(function(resp) { return resp.json(); })
            .then(function(data) {
                var parts = data && data[0] ? data[0] : [];
                var translated = '';
                for (var i = 0; i < parts.length; i++) {
                    if (parts[i] && parts[i][0]) translated += parts[i][0];
                }
                translated = translated.trim();
                if (!translated || translated === original || !/[\u4e00-\u9fff]/.test(translated)) return;
                try { localStorage.setItem(key, translated); } catch (e) {}
                if (ShiChang_FanYi_Kai && node.__cursorShiChangYuanWen === original) {
                    node.__cursorShiChangYiWen = translated;
                    XieRu_WenBen_JieDian(node, translated);
                }
            })
            .catch(function() {})
            .finally(function() { ShiChang_ZaiXianFanYi_Zhong.delete(original); });
    }

    // 按词干表推断插件名的中文
    function TuiDuan_ChaJian_ZhongWen(name) {
        BaoZhang_ShiChang_CiDian();
        if (!name || name.indexOf(' ') !== -1 || name.indexOf('（') !== -1) return null;
        if (!/[-_]/.test(name)) return null;
        var parts = name.toLowerCase().split(/[-_]+/);
        var out = [];
        for (var i = 0; i < parts.length; i++) {
            var word = ShiChang_MingCheng_CiGen[parts[i]];
            if (word) out.push(word);
        }
        if (out.length < 2) return null;
        var joined = out.join(' ');
        return joined.length > 0 ? joined : null;
    }

    // 用来判断当前页是不是插件市场的原文
    var ShiChang_Ye_YingWen = [
        'claude-plugins-official',
        'Search skills, rules, subagents',
        'Add to Cursor',
        'All Plugins',
        'Suggested',
        'Search or Paste Link',
        'Browse Marketplace',
        'No Result',
        'View source code',
        'Last updated',
        'Created by',
        'Datadog',
        '生成可浏览的 Claude Code'
    ];
    // 市场页已翻译后的识别词。每组是「主词 + 任一搭配词」
    var ShiChang_Ye_ZhongWen_Zu = [
        ['插件', ['推荐', '浏览市场', '暂无插件']],
        ['市场', ['精选', '全部插件', '添加到 Cursor']]
    ];

    // 判断当前是否位于插件市场页
    function Shi_ShiChang_Ye() {
        if (!document.body) return false;
        var now = Date.now();
        if (now - ShiChang_Ye_HuanCun.time < 1200) return ShiChang_Ye_HuanCun.value;
        var text = GuiYiHua_WenBen(document.body.textContent || '');
        if (!text) return false;
        var value = false;
        for (var i = 0; i < ShiChang_Ye_YingWen.length; i++) {
            if (text.indexOf(ShiChang_Ye_YingWen[i]) !== -1) { value = true; break; }
        }
        if (!value) {
            for (var g = 0; g < ShiChang_Ye_ZhongWen_Zu.length && !value; g++) {
                if (text.indexOf(ShiChang_Ye_ZhongWen_Zu[g][0]) === -1) continue;
                var tails = ShiChang_Ye_ZhongWen_Zu[g][1];
                for (var t = 0; t < tails.length; t++) {
                    if (text.indexOf(tails[t]) !== -1) { value = true; break; }
                }
            }
        }
        ShiChang_Ye_HuanCun.time = now;
        ShiChang_Ye_HuanCun.value = value;
        return value;
    }

    // 遍历市场页中可翻译的文本节点
    function BianLi_ShiChang_WenBen(callback) {
        if (!document.body) return;
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) {
            if (Shi_BianJiQi_QuYu(node)) continue;
            var parent = node.parentElement;
            if (!parent) continue;
            if (parent.closest('input, textarea, select, [contenteditable="true"]')) continue;
            callback(node);
        }
    }

    // 翻译市场页文本，未命中时可走在线翻译
    function XiuZheng_ShiChang_FanYi() {
        if (!Shi_ShiChang_Ye()) return;
        BaoZhang_ShiChang_CiDian();
        ShiChang_ZaiXianFanYi_BenLun = 0;
        BianLi_ShiChang_WenBen(function(node) {
            if (ShiChang_FanYi_Kai) {
                if (node.__cursorShiChangYiWen && node.textContent === node.__cursorShiChangYiWen) return;
                var original = node.__cursorShiChangYuanWen || node.textContent;
                var translated = FanYi_ShiChang_MiaoShu(original);
                if (translated && translated !== node.textContent) {
                    node.__cursorShiChangYuanWen = original;
                    node.__cursorShiChangYiWen = translated;
                    XieRu_WenBen_JieDian(node, translated);
                } else if (!Shi_YiFanYi_De_ShiChang_WenBen(original)) {
                    node.__cursorShiChangYuanWen = original;
                    if (ShiChang_ZaiXianFanYi_Kai) FanYi_ShiChang_ZaiXian(node, original);
                }
            } else if (node.__cursorShiChangYuanWen) {
                XieRu_WenBen_JieDian(node, node.__cursorShiChangYuanWen);
            }
        });
        XiuZheng_ShiChang_MingCheng();
    }

    // 在英文名称后追加括号中的中文名
    function ZhuiJia_ZhongWen_MingCheng(text, map) {
        if (!text || text.indexOf('（') !== -1) return null;
        var key = GuiYiHua_WenBen(text);
        var cn = map[key] || TuiDuan_ChaJian_ZhongWen(key);
        if (!cn) return null;
        return text + '（' + cn + '）';
    }

    // 给插件和技能名称补上中文
    function XiuZheng_ShiChang_MingCheng() {
        BaoZhang_ShiChang_CiDian();
        if (!ShiChang_FanYi_Kai) return;
        var elements = document.querySelectorAll('div, span, p, label, a');
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (!el || el.children.length > 0) continue;
            if (el.closest('input, textarea, select, [contenteditable="true"]')) continue;
            if (typeof Shi_Zai_DaiMa_Hang === 'function' && Shi_Zai_DaiMa_Hang(el)) continue;
            var raw = el.textContent || '';
            var trimmed = GuiYiHua_WenBen(raw);
            if (!trimmed || trimmed.length > 80 || trimmed.indexOf('（') !== -1) continue;

            var appended = ZhuiJia_ZhongWen_MingCheng(raw, ShiChang_ChaJian_MingCheng) || ZhuiJia_ZhongWen_MingCheng(raw, ShiChang_JiNeng_MingCheng);
            if (appended) {
                el.__cursorShiChangYuanWen = el.__cursorShiChangYuanWen || raw;
                el.textContent = appended;
                if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
                    el.firstChild.__cursorShiChangYuanWen = raw;
                    el.firstChild.__cursorShiChangYiWen = appended;
                }
            }
        }

        BianLi_ShiChang_WenBen(function(node) {
            var text = node.textContent || '';
            var trimmed = GuiYiHua_WenBen(text);
            if (!trimmed || trimmed.length > 80) return;

            var pluginName = ZhuiJia_ZhongWen_MingCheng(text, ShiChang_ChaJian_MingCheng);
            if (pluginName) {
                node.__cursorShiChangYuanWen = node.__cursorShiChangYuanWen || text;
                XieRu_WenBen_JieDian(node, pluginName);
                return;
            }

            var skillName = ZhuiJia_ZhongWen_MingCheng(text, ShiChang_JiNeng_MingCheng);
            if (skillName) {
                node.__cursorShiChangYuanWen = node.__cursorShiChangYuanWen || text;
                XieRu_WenBen_JieDian(node, skillName);
            }
        });
    }
