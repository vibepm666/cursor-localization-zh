    // ================================================================
    // SECTION 3: 初始化
    // ================================================================

    function ChuShiHua() {
        var target = document.documentElement || document.body;
        if (!target) { setTimeout(ChuShiHua, 50); return; }

        var oldUsageCard = document.getElementById('cursor-yongliang-xianshi');
        if (oldUsageCard) oldUsageCard.remove();
        var oldMarketBar = document.getElementById('cursor-localization-market-toggle-wrap');
        if (oldMarketBar) oldMarketBar.remove();
        var oldMarketToast = document.getElementById('cursor-localization-market-toast');
        if (oldMarketToast) oldMarketToast.remove();

        var GuanChaQi = new MutationObserver(GuanCha_HuiDiao);
        GuanChaQi.observe(target, { childList: true, subtree: true });
        try { AnZhuang_SheZhi_XiaLa_GuanCha(); } catch (e) {}
        try { AnZhuang_Monaco_Hover_FanYi(); } catch (e) {}
        try { AnZhuang_LiuLanQi_Webview_GuanCha(); } catch (e) {}
        try { AnZhuang_CaiDan_DongTai_GuanCha(); } catch (e) {}

        setTimeout(function() {
            if (document.body) {
                try { FanYi_ZiShu_QuYu(); } catch (e) {}
                PaiDui_QuanJuXiuZheng(true);
            }
        }, 500);

        setTimeout(function() {
            if (document.body) {
                try { FanYi_ZiShu_QuYu(); } catch (e) {}
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
