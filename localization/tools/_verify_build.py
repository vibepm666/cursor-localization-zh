# -*- coding: utf-8 -*-
import os
import sys
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

from Cursor_Localization_Tool import ShengCheng_JS_DaiMa

js = ShengCheng_JS_DaiMa()
assert "var XiaLa_MianBan_SuiPian = [" in js, "missing XiaLa_MianBan_SuiPian"
assert js.count("Reset to default") >= 1, "dropdown entry missing"
assert "var DingXiang_SuiPian = [" in js, "missing DingXiang_SuiPian"
assert "var QuanJu_GuanJianCi_Biao" in js, "missing keywords table"
assert "function __ShiChang_CiDian_Ke" in js, "missing lazy marketplace payload"
assert "function BaoZhang_ShiChang_CiDian" in js, "missing marketplace lazy loader"
assert "ShiChang_ChaJian_MingCheng = p.pluginNames" in js, "marketplace dict should assign on lazy load"
assert "function FanYi_ZiShu_QuYu" in js, "missing FanYi_ZiShu_QuYu"
assert "var Cursor_SheZhi_MCP_SuiPian = [" in js, "missing Cursor_SheZhi MCP fragments"
assert "var Cursor_SheZhi_Domain_SuiPian = [" in js, "missing Cursor_SheZhi domain fragments"
out = os.path.join(ROOT, "_t.js")
with open(out, "w", encoding="utf-8") as f:
    f.write(js)
subprocess.run(["node", "--check", out], check=True)
print("OK:", len(js), "chars")
