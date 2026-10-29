    // ================================================================
    // SECTION 3: 初始化
    // ================================================================

    // 安装占位符钩子和观察器，并安排首轮翻译
    function ChuShiHua() {
        try { AnZhuang_ZhanWei_ShuXing_GuaGou(); } catch (e) {}
        var target = document.documentElement || document.body;
        if (!target) { setTimeout(ChuShiHua, 50); return; }

        var oldUsageCard = document.getElementById('cursor-yongliang-xianshi');
        if (oldUsageCard) oldUsageCard.remove();
        var oldMarketBar = document.getElementById('cursor-localization-market-toggle-wrap');
        if (oldMarketBar) oldMarketBar.remove();
        var oldMarketToast = document.getElementById('cursor-localization-market-toast');
        if (oldMarketToast) oldMarketToast.remove();

        var GuanChaQi = new MutationObserver(GuanCha_HuiDiao);
        GuanChaQi.observe(target, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['placeholder', 'data-placeholder', 'aria-placeholder']
        });
        try { AnZhuang_SheZhi_XiaLa_GuanCha(); } catch (e) {}
        try { AnZhuang_Monaco_Hover_FanYi(); } catch (e) {}
        try { AnZhuang_LiuLanQi_Webview_GuanCha(); } catch (e) {}
        try { AnZhuang_CaiDan_DongTai_GuanCha(); } catch (e) {}
        try { AnZhuang_DingBu_CaiDan_GuanCha(); } catch (e) {}
        try { AnZhuang_FuZhu_ChuangKou_FanYi(); } catch (e) {}

        setTimeout(function() {
            if (document.body) {
                try { FanYi_ZiShu_QuYu(); } catch (e) {}
                try { XiuZheng_ZhiNengTi_ZhuangTai(); } catch (e) {}
                try { PaiDui_DingBu_CaiDanTiao(); } catch (e) {}
                try { XiuZheng_TiJiao_PingFen(); } catch (e) {}
                PaiDui_QuanJuXiuZheng(true);
            }
        }, 500);

        setTimeout(function() {
            if (document.body) {
                try { FanYi_ZiShu_QuYu(); } catch (e) {}
                try { XiuZheng_ZhiNengTi_ZhuangTai(); } catch (e) {}
                try { XiuZheng_TiJiao_PingFen(); } catch (e) {}
                PaiDui_QuanJuXiuZheng(true);
            }
        }, 2500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ChuShiHua);
    } else {
        ChuShiHua();
    }
})();
