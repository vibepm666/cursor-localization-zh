# -*- coding: utf-8 -*-
"""
Cursor 汉化工具
功能：将翻译脚本注入 Cursor 的 workbench.html，实现设置页面及常见界面中文化。

用法：
  python Cursor_Localization_Tool.py           安装语言包 + 注入/更新汉化
  python Cursor_Localization_Tool.py --restore  恢复原始文件
  python Cursor_Localization_Tool.py --fix-checksum  仅修复 product.json 校验（解决「安装已损坏」提示）
  python Cursor_Localization_Tool.py --check-python  检查 Python 环境（排查 Windows Store 占位程序）

  Windows：启动汉化_Win.bat / 取消汉化_Win.bat
  macOS/Linux：./启动汉化_Mac.sh / ./取消汉化_Mac.sh

官方简体中文语言包位于项目根目录 VSCode-language-pack-zh-hans.vsix；
若与当前 Cursor 内置 VS Code 版本不匹配，会自动从市场下载对应版本并覆盖。
广告弹窗翻译单独维护于 localization/Ad_Popup_Dictionary.json，注入时自动合并进词典。
插件市场翻译单独维护于 localization/Plugin_Marketplace_Dictionary.json，注入时自动生成市场页 JS 词典。
通用界面主词典与正则规则位于 localization/Core_Dictionary.json、localization/Pattern_Dictionary.json。
注入脚本由 localization/runtime/*.js 组装生成；片段词典见 localization/Partial_Fragments.json、localization/Dropdown_Fragments.json、localization/Cursor_Settings_Fragments.json。
"""

import os  # 文件路径操作
import sys  # 系统参数
import shutil  # 文件复制
import datetime  # 时间戳
import hashlib  # 哈希计算
import base64  # Base64 编码（校验哈希）
import json  # JSON 读写
import re  # 正则校验
import subprocess  # 调用 Cursor CLI 安装扩展
import gzip  # 市场 VSIX 下载解压
import io  # 内存字节流
import zipfile  # 读取/校验 VSIX
import urllib.request  # 从 VS Code 市场下载语言包
import urllib.error  # 网络错误处理


def Shi_MacOS():
    """是否为 macOS。"""
    return sys.platform == "darwin"


def Shi_Windows():
    """是否为 Windows。"""
    return sys.platform == "win32"


def _Shi_Windows_Store_Python_ZhanWei(KeZhiXing_LuJing):
    """判断可执行路径是否为 Windows Store 应用执行别名占位程序。"""
    if not KeZhiXing_LuJing:
        return False
    LuJing_XiaoXie = os.path.normcase(os.path.abspath(KeZhiXing_LuJing))
    return (
        os.path.join("microsoft", "windowsapps") in LuJing_XiaoXie
        or LuJing_XiaoXie.endswith(os.path.join("windowsapps", "python.exe"))
        or LuJing_XiaoXie.endswith(os.path.join("windowsapps", "python3.exe"))
    )


def DaYin_Python_AnZhuang_TiShi():
    """输出 Python 未正确安装时的排查与安装说明。"""
    print("\n[错误] 未检测到可用的 Python 3 环境。")
    if Shi_Windows():
        print("[原因] 系统可能只有 Microsoft Store 的 Python 占位程序（应用执行别名），")
        print("       无法实际运行汉化脚本；执行 python 时可能弹出应用商店或无输出。")
        print("[排查] 在 PowerShell 或 CMD 中运行: where python")
        print("       若路径包含 Microsoft\\WindowsApps，即表示尚未安装真正的 Python。")
        print("[安装] 任选其一：")
        print("       1. 官网: https://www.python.org/downloads/ （安装时勾选 Add python.exe to PATH）")
        print("       2. 命令: winget install Python.Python.3.12")
        print("[可选] 设置 → 应用 → 高级应用设置 → 应用执行别名，")
        print("       关闭 python.exe / python3.exe 的商店快捷方式，避免与真实安装冲突。")
    else:
        print("[安装] 请先安装 Python 3，例如: brew install python3")
    print("[验证] 安装后重新打开终端，运行: python --version")
    print("       应显示 Python 3.x，且 where python / which python 不应指向 WindowsApps。")


def JianCha_Python_HuanJing(TuiChu=True):
    """
    检查当前 Python 是否可用（排除 Windows Store 占位程序）。
    TuiChu 为 True 时检查失败则 sys.exit(1)。
    返回 True 表示环境可用。
    """
    if _Shi_Windows_Store_Python_ZhanWei(sys.executable):
        DaYin_Python_AnZhuang_TiShi()
        if TuiChu:
            sys.exit(1)
        return False

    if sys.version_info < (3, 8):
        print(f"\n[错误] 需要 Python 3.8 或更高版本，当前: {sys.version.split()[0]}")
        DaYin_Python_AnZhuang_TiShi()
        if TuiChu:
            sys.exit(1)
        return False

    return True


def HuoQu_Workbench_MuLu_LuJing(GenMuLu):
    """根据安装根目录返回 workbench 目录（含 electron-sandbox/workbench）。"""
    if Shi_MacOS():
        return os.path.join(
            GenMuLu, "Contents", "Resources", "app",
            "out", "vs", "code", "electron-sandbox", "workbench",
        )
    return os.path.join(
        GenMuLu, "resources", "app",
        "out", "vs", "code", "electron-sandbox", "workbench",
    )


def HuoQu_App_GenMuLu_LuJing(GenMuLu):
    """返回 Cursor app 资源根目录（其下含 product.json、out/）。"""
    if Shi_MacOS():
        return os.path.join(GenMuLu, "Contents", "Resources", "app")
    return os.path.join(GenMuLu, "resources", "app")


def AnZhuang_MuLu_YouXiao(GenMuLu):
    """判断目录是否为可用的 Cursor 安装根（Windows 文件夹或 macOS .app）。"""
    if not GenMuLu:
        return False
    Workbench_Html = os.path.join(HuoQu_Workbench_MuLu_LuJing(GenMuLu), "workbench.html")
    if not os.path.isfile(Workbench_Html):
        return False
    if Shi_Windows():
        return os.path.isfile(os.path.join(GenMuLu, "Cursor.exe"))
    if Shi_MacOS():
        return GenMuLu.endswith(".app") and os.path.isdir(
            os.path.join(GenMuLu, "Contents", "MacOS")
        )
    return True


def CaiCe_Cursor_AnZhuang_LuJing():
    """优先使用环境变量，否则从脚本位置和常见安装目录推断 Cursor 根目录。"""
    HuanJing = os.environ.get("CURSOR_INSTALL_DIR") or os.environ.get("CURSOR_ROOT")
    HouXuan = []
    if HuanJing:
        HouXuan.append(HuanJing)

    JiaoBen_MuLu = os.path.dirname(os.path.abspath(__file__))
    HouXuan.append(os.path.dirname(JiaoBen_MuLu))

    if Shi_MacOS():
        HouXuan.extend([
            "/Applications/Cursor.app",
            os.path.expanduser("~/Applications/Cursor.app"),
        ])
    else:
        HouXuan.extend([
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "cursor"),
            os.path.join(os.environ.get("PROGRAMFILES", ""), "Cursor"),
            os.path.join(os.environ.get("PROGRAMFILES(X86)", ""), "Cursor"),
        ])

    for LuJing in HouXuan:
        if not LuJing:
            continue
        if AnZhuang_MuLu_YouXiao(LuJing):
            return os.path.abspath(LuJing)

    return os.path.abspath(HuanJing or os.path.dirname(JiaoBen_MuLu))


def CaiCe_Cursor_ShuJu_LuJing():
    """优先使用环境变量，否则使用当前用户默认 Cursor 数据目录。"""
    HuanJing = os.environ.get("CURSOR_USER_DATA_DIR")
    if HuanJing:
        return os.path.abspath(HuanJing)

    if Shi_MacOS():
        return os.path.join(os.path.expanduser("~"), "Library", "Application Support", "Cursor")

    AppData = os.environ.get("APPDATA")
    if AppData:
        return os.path.join(AppData, "Cursor")

    return os.path.join(os.path.expanduser("~"), "AppData", "Roaming", "Cursor")


def HuoQu_Cursor_KeZhiXing_LuJing(GenMuLu=None):
    """返回用于启动 Cursor 的可执行文件路径。"""
    GenMuLu = GenMuLu or CURSOR_AN_ZHUANG_LU_JING
    if Shi_MacOS():
        KeZhiXing = os.path.join(GenMuLu, "Contents", "MacOS", "Cursor")
        if os.path.isfile(KeZhiXing):
            return KeZhiXing
        return GenMuLu
    return os.path.join(GenMuLu, "Cursor.exe")


def HuoQu_Cursor_CLI_LuJing(GenMuLu=None):
    """返回 Cursor CLI（cursor / cursor.cmd），用于扩展管理。"""
    GenMuLu = GenMuLu or CURSOR_AN_ZHUANG_LU_JING
    if Shi_MacOS():
        LuJing = os.path.join(GenMuLu, "Contents", "Resources", "app", "bin", "cursor")
    else:
        LuJing = os.path.join(GenMuLu, "resources", "app", "bin", "cursor.cmd")
    if os.path.isfile(LuJing):
        return LuJing
    return HuoQu_Cursor_KeZhiXing_LuJing(GenMuLu)


# ============================================================
# ★★★ 用户配置区域 ★★★
# ============================================================

# Cursor 安装根目录。
# 可通过环境变量 CURSOR_INSTALL_DIR 覆盖，例如：
#   set CURSOR_INSTALL_DIR=D:\Tools\cursor
CURSOR_AN_ZHUANG_LU_JING = CaiCe_Cursor_AnZhuang_LuJing()

# Cursor 用户数据目录（languagepacks.json、locale.json 等）
# 如果使用 --user-data-dir 自定义了目录，可通过 CURSOR_USER_DATA_DIR 覆盖。
CURSOR_SHU_JU_LU_JING = CaiCe_Cursor_ShuJu_LuJing()

# 以下路径一般不需要修改（workbench 目录由 HuoQu_Workbench_MuLu_LuJing 按系统自动拼接）
GONG_ZUO_TAI_HTML_MING = "workbench.html"  # workbench HTML 文件名
LOCALIZATION_JS_FILE = "Cursor_Localization.js"  # 注入生成的翻译脚本
LEGACY_LOCALIZATION_JS_FILE = "cursor_hanhua.js"  # 旧版脚本名（升级时清理）
INJECTION_MARKER_HTML = "<!-- CURSOR_LOCALIZATION_INJECTION -->"  # HTML 注入标记
LEGACY_INJECTION_MARKER_HTML = "<!-- CURSOR_HANHUA_INJECTION -->"  # 旧版注入标记
BEI_FEN_HOU_ZHUI = ".bak"  # 备份文件后缀

# product.json 中 workbench.html 可能的 checksum 键（不同 Cursor/VS Code 版本路径略有差异）
WORKBENCH_CHECKSUM_KEY_HINTS = (
    "vs/code/electron-sandbox/workbench/workbench.html",
    "vs/code/electron-browser/workbench/workbench.html",
    "out/vs/code/electron-sandbox/workbench/workbench.html",
    "out/vs/code/electron-browser/workbench/workbench.html",
)

# Cursor 内置扩展的简中桥接翻译。
# VS Code 官方语言包不会覆盖 anysphere.*，这里补上最常见的私有扩展元信息。
KUO_ZHAN_FAN_YI_QIAO_JIE = {
    "anysphere.cursor-always-local": {
        "package": {
            "displayName": "Cursor 始终本地",
            "description": "为 Cursor 提供实验性本地功能。"
        }
    },
    "anysphere.cursor-retrieval": {
        "package": {
            "displayName": "Cursor 检索",
            "description": "处理 Cursor 的索引与检索能力。"
        }
    },
    "anysphere.cursor-shadow-workspace": {
        "package": {
            "displayName": "Cursor 影子工作区",
            "description": "管理一个供 AI 智能体在展示前整理代码的隐藏本地窗口。"
        }
    },
    "inspecta.inspecta-ide-integration": {
        "package": {
            "displayName": "Inspecta IDE 集成",
            "description": "将 Inspecta CSS 更改与 Cursor IDE 和 VS Code AI 智能体集成。"
        }
    }
}

JIAO_BEN_MU_LU = os.path.dirname(os.path.abspath(__file__))
AD_POPUP_DICTIONARY_FILE = "Ad_Popup_Dictionary.json"
PLUGIN_MARKETPLACE_DICTIONARY_FILE = "Plugin_Marketplace_Dictionary.json"
LOCALIZATION_DIR = os.path.join(JIAO_BEN_MU_LU, "localization")
CORE_DICTIONARY_FILE = os.path.join(LOCALIZATION_DIR, "Core_Dictionary.json")
PATTERN_DICTIONARY_FILE = os.path.join(LOCALIZATION_DIR, "Pattern_Dictionary.json")
AD_POPUP_DICTIONARY_PATH = os.path.join(LOCALIZATION_DIR, AD_POPUP_DICTIONARY_FILE)
PLUGIN_MARKETPLACE_DICTIONARY_PATH = os.path.join(
    LOCALIZATION_DIR, PLUGIN_MARKETPLACE_DICTIONARY_FILE
)
LANGUAGE_PACK_VSIX_FILE = "VSCode-language-pack-zh-hans.vsix"
LANGUAGE_PACK_ID = "ms-ceintl.vscode-language-pack-zh-hans"
LANGUAGE_PACK_PUBLISHER = "MS-CEINTL"
LANGUAGE_PACK_EXTENSION = "vscode-language-pack-zh-hans"
LANGUAGE_PACK_BUNDLED_VERSION = "1.105.2025101509"  # 离线兜底版本号
LANGUAGE_PACK_MARKETPLACE_QUERY = (
    "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery"
)
LANGUAGE_PACK_MARKETPLACE_DOWNLOAD = (
    "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/"
    "MS-CEINTL/vsextensions/vscode-language-pack-zh-hans/{version}/vspackage"
)
XUAN_SHI_YU_YAN = "zh-cn"


def HuoQu_CiDian_WenJian_LuJing(WenJianMing, MoRenMuLu=None):
    """读取词典 JSON：优先 localization/，兼容项目根目录旧路径。"""
    MoRenMuLu = MoRenMuLu or LOCALIZATION_DIR
    XinLuJing = os.path.join(MoRenMuLu, WenJianMing)
    if os.path.isfile(XinLuJing):
        return XinLuJing
    JiuLuJing = os.path.join(JIAO_BEN_MU_LU, WenJianMing)
    if os.path.isfile(JiuLuJing):
        return JiuLuJing
    return XinLuJing


def HuoQu_CiDian_XianDui_LuJing(LuJing):
    """返回相对项目根目录的路径（用于日志与注释）。"""
    try:
        return os.path.relpath(LuJing, JIAO_BEN_MU_LU).replace("\\", "/")
    except ValueError:
        return LuJing


def DuQu_GuangGao_TanChuang_CiDian():
    """读取左下角广告/通知弹窗专用词典。"""
    LuJing = HuoQu_CiDian_WenJian_LuJing(AD_POPUP_DICTIONARY_FILE)
    if not os.path.exists(LuJing):
        print(f"[广告弹窗] 未找到 {HuoQu_CiDian_XianDui_LuJing(LuJing)}，跳过合并")
        return {}

    try:
        with open(LuJing, 'r', encoding='utf-8') as WenJian:
            ShuJu = json.load(WenJian)
    except Exception as CuoWu:
        print(f"[广告弹窗] 读取 {LuJing} 失败: {CuoWu}")
        return {}

    Entries = ShuJu.get("entries", [])
    HeBing = {}
    if isinstance(Entries, dict):
        HeBing = {str(K): str(V) for K, V in Entries.items() if K and V}
    elif isinstance(Entries, list):
        for Xiang in Entries:
            if isinstance(Xiang, (list, tuple)) and len(Xiang) >= 2:
                YingWen, ZhongWen = str(Xiang[0]), str(Xiang[1])
                if YingWen and ZhongWen:
                    HeBing[YingWen] = ZhongWen
    return HeBing


def ShengCheng_GuangGao_TanChuang_HeBing_JS():
    """生成将广告弹窗词典合并进 FanYi_CiDian 的 JavaScript 片段。"""
    Entries = DuQu_GuangGao_TanChuang_CiDian()
    if not Entries:
        return ""

    TiaoMu = [[YingWen, ZhongWen] for YingWen, ZhongWen in Entries.items()]
    Json_WenBen = json.dumps(TiaoMu, ensure_ascii=False, separators=(',', ':'))
    WenJian_BiaoShi = HuoQu_CiDian_XianDui_LuJing(
        HuoQu_CiDian_WenJian_LuJing(AD_POPUP_DICTIONARY_FILE)
    )
    return f"""
    // 来自 {WenJian_BiaoShi}（左下角推广/通知弹窗）
    (function() {{
        var guanggao = {Json_WenBen};
        for (var gi = 0; gi < guanggao.length; gi++) {{
            FanYi_CiDian.set(guanggao[gi][0], guanggao[gi][1]);
        }}
    }})();
"""


def DuQu_Chajian_ShiChang_CiDian():
    """读取插件市场专用词典 JSON。"""
    LuJing = HuoQu_CiDian_WenJian_LuJing(PLUGIN_MARKETPLACE_DICTIONARY_FILE)
    if not os.path.exists(LuJing):
        print(f"[插件市场] 未找到 {HuoQu_CiDian_XianDui_LuJing(LuJing)}，使用内置默认")
        return None

    try:
        with open(LuJing, "r", encoding="utf-8") as WenJian:
            return json.load(WenJian)
    except Exception as CuoWu:
        print(f"[插件市场] 读取 {LuJing} 失败: {CuoWu}")
        return None


def _JS_ZhuanYi_ZiFuChuan(WenBen):
    """将 Python 字符串转为 JS 单引号字面量（含转义）。"""
    return json.dumps(str(WenBen), ensure_ascii=False)


def _ShengCheng_JS_DuiXiang(Dict):
    if not Dict:
        return "{}"
    Hang = []
    for Jian, Zhi in Dict.items():
        if Jian is None or Zhi is None:
            continue
        Hang.append(f"        {_JS_ZhuanYi_ZiFuChuan(Jian)}: {_JS_ZhuanYi_ZiFuChuan(Zhi)}")
    return "{\n" + ",\n".join(Hang) + "\n    }"


def _ShengCheng_JS_Pairs_Array(Pairs):
    if not Pairs:
        return "[]"
    Hang = []
    for Xiang in Pairs:
        if not isinstance(Xiang, (list, tuple)) or len(Xiang) < 2:
            continue
        Hang.append(
            f"        [{_JS_ZhuanYi_ZiFuChuan(Xiang[0])}, {_JS_ZhuanYi_ZiFuChuan(Xiang[1])}]"
        )
    return "[\n" + ",\n".join(Hang) + "\n    ]"


def _ShengCheng_JS_MoShi_FanYi(Patterns):
    if not Patterns:
        return "[]"
    Hang = []
    for Xiang in Patterns:
        if isinstance(Xiang, dict):
            BiaoDaShi = Xiang.get("regex", "")
            BiaoJi = Xiang.get("flags", "i")
            TiHuan = Xiang.get("replace", "")
        elif isinstance(Xiang, (list, tuple)) and len(Xiang) >= 2:
            BiaoDaShi, TiHuan = str(Xiang[0]), str(Xiang[1])
            BiaoJi = str(Xiang[2]) if len(Xiang) > 2 else "i"
        else:
            continue
        if not BiaoDaShi:
            continue
        Hang.append(
            f"        [new RegExp({_JS_ZhuanYi_ZiFuChuan(BiaoDaShi)}, {_JS_ZhuanYi_ZiFuChuan(BiaoJi)}), {_JS_ZhuanYi_ZiFuChuan(TiHuan)}]"
        )
    return "[\n" + ",\n".join(Hang) + "\n    ]"


def ShengCheng_Chajian_ShiChang_JS_Kuai(ShuJu=None):
    """根据 Plugin_Marketplace_Dictionary.json 生成市场页 JS 变量块。"""
    ShuJu = ShuJu if ShuJu is not None else DuQu_Chajian_ShiChang_CiDian()
    if not ShuJu:
        return None

    # 兼容旧版仅含 entries 的扁平列表
    if "pluginNames" not in ShuJu and isinstance(ShuJu.get("entries"), list):
        MingCheng = {}
        MiaoShu = []
        for Xiang in ShuJu["entries"]:
            if isinstance(Xiang, (list, tuple)) and len(Xiang) >= 2:
                MiaoShu.append([str(Xiang[0]), str(Xiang[1])])
        ShuJu = {
            "pluginNames": MingCheng,
            "descriptionFragments": MiaoShu,
        }

    return f"""    // 来自 {HuoQu_CiDian_XianDui_LuJing(HuoQu_CiDian_WenJian_LuJing(PLUGIN_MARKETPLACE_DICTIONARY_FILE))}（插件市场/市场页，首次进入市场页时加载）
    function __ShiChang_CiDian_Ke() {{
        return {{
            pluginNames: {_ShengCheng_JS_DuiXiang(ShuJu.get("pluginNames", {}))},
            uiLabels: {_ShengCheng_JS_DuiXiang(ShuJu.get("uiLabels", {}))},
            uiFragments: {_ShengCheng_JS_Pairs_Array(ShuJu.get("uiFragments", []))},
            patterns: {_ShengCheng_JS_MoShi_FanYi(ShuJu.get("patterns", []))},
            skillNames: {_ShengCheng_JS_DuiXiang(ShuJu.get("skillNames", {}))},
            nameStems: {_ShengCheng_JS_DuiXiang(ShuJu.get("nameStems", {}))},
            descriptionFragments: {_ShengCheng_JS_Pairs_Array(ShuJu.get("descriptionFragments", []))}
        }};
    }}
"""


def DuQu_Zhu_CiDian():
    """读取 localization/Core_Dictionary.json，返回 [[en, zh], ...]（同 key 后写覆盖）。"""
    if not os.path.isfile(CORE_DICTIONARY_FILE):
        raise FileNotFoundError(
            f"未找到主词典 {CORE_DICTIONARY_FILE}，请确认 localization 目录完整"
        )
    with open(CORE_DICTIONARY_FILE, "r", encoding="utf-8") as WenJian:
        ShuJu = json.load(WenJian)

    TiaoMu = []
    if isinstance(ShuJu.get("sections"), list):
        for QuKuai in ShuJu["sections"]:
            for Xiang in QuKuai.get("entries", []) or []:
                if isinstance(Xiang, (list, tuple)) and len(Xiang) >= 2:
                    TiaoMu.append([str(Xiang[0]), str(Xiang[1])])
    elif isinstance(ShuJu.get("entries"), list):
        for Xiang in ShuJu["entries"]:
            if isinstance(Xiang, (list, tuple)) and len(Xiang) >= 2:
                TiaoMu.append([str(Xiang[0]), str(Xiang[1])])

    HeBing = {}
    for YingWen, ZhongWen in TiaoMu:
        if YingWen and ZhongWen:
            HeBing[YingWen] = ZhongWen
    return [[YingWen, HeBing[YingWen]] for YingWen in HeBing]


def ZhengLi_ZhengZe_MoShi(BiaoDaShi):
    """修正 JSON 导出时多转义一层的正则（如 \\\\d -> \\d）。"""
    if not BiaoDaShi or "\\\\" not in BiaoDaShi:
        return BiaoDaShi
    XiuZheng = BiaoDaShi
    while "\\\\" in XiuZheng:
        ShiYi = XiuZheng.replace("\\\\", "\\")
        if ShiYi == XiuZheng:
            break
        try:
            re.compile(ShiYi)
        except re.error:
            break
        XiuZheng = ShiYi
    return XiuZheng


def DuQu_MoShi_CiDian():
    """读取 localization/Pattern_Dictionary.json。"""
    if not os.path.isfile(PATTERN_DICTIONARY_FILE):
        raise FileNotFoundError(
            f"未找到正则词典 {PATTERN_DICTIONARY_FILE}，请确认 localization 目录完整"
        )
    with open(PATTERN_DICTIONARY_FILE, "r", encoding="utf-8") as WenJian:
        ShuJu = json.load(WenJian)

    JieGuo = []
    for Xiang in ShuJu.get("patterns", []) or []:
        if not isinstance(Xiang, dict):
            continue
        Regex = ZhengLi_ZhengZe_MoShi(str(Xiang.get("regex") or ""))
        TiHuan = Xiang.get("replacement")
        if not Regex or TiHuan is None:
            continue
        JieGuo.append({
            "regex": Regex,
            "flags": str(Xiang.get("flags") or ""),
            "replacement": str(TiHuan),
        })
    return JieGuo


def ShengCheng_FanYi_CiDian_JS(TiaoMu=None):
    """生成 var FanYi_CiDian = new Map([...]);"""
    TiaoMu = TiaoMu if TiaoMu is not None else DuQu_Zhu_CiDian()
    Json_WenBen = json.dumps(TiaoMu, ensure_ascii=False, separators=(",", ":"))
    return f"    var FanYi_CiDian = new Map({Json_WenBen});"


def ShengCheng_MoShi_FanYi_JS(MoShi=None):
    """生成 var MoShi_FanYi = [[RegExp, \"...\"], ...];"""
    MoShi = MoShi if MoShi is not None else DuQu_MoShi_CiDian()
    Hang = []
    for Xiang in MoShi:
        RegexJs = json.dumps(Xiang["regex"], ensure_ascii=False)
        FlagsJs = json.dumps(Xiang.get("flags") or "", ensure_ascii=False)
        TiHuan = json.dumps(Xiang["replacement"], ensure_ascii=False)
        Hang.append(f"        [new RegExp({RegexJs}, {FlagsJs}), {TiHuan}]")
    if not Hang:
        return "    var MoShi_FanYi = [];"
    return "    var MoShi_FanYi = [\n" + ",\n".join(Hang) + "\n    ];"


RUNTIME_DIR = os.path.join(LOCALIZATION_DIR, "runtime")
PARTIAL_FRAGMENTS_FILE = os.path.join(LOCALIZATION_DIR, "Partial_Fragments.json")
DROPDOWN_FRAGMENTS_FILE = os.path.join(LOCALIZATION_DIR, "Dropdown_Fragments.json")


def DuQu_Runtime_WenJian(WenJianMing):
    """读取 localization/runtime/ 下的 JS 源文件。"""
    LuJing = os.path.join(RUNTIME_DIR, WenJianMing)
    if not os.path.isfile(LuJing):
        raise FileNotFoundError(f"未找到运行时脚本 {LuJing}")
    with open(LuJing, encoding="utf-8") as WenJian:
        return WenJian.read()


def DuQu_Fragment_Entries(WenJianMing, entriesKey="entries"):
    """读取 JSON 片段词典 entries（或指定键下的 [[en, zh], ...]）。"""
    LuJing = HuoQu_CiDian_WenJian_LuJing(WenJianMing)
    if not os.path.isfile(LuJing):
        return []
    with open(LuJing, encoding="utf-8") as WenJian:
        ShuJu = json.load(WenJian)
    TiaoMu = []
    for Xiang in ShuJu.get(entriesKey, []):
        if isinstance(Xiang, (list, tuple)) and len(Xiang) >= 2:
            YingWen, ZhongWen = str(Xiang[0]), str(Xiang[1])
            if YingWen and ZhongWen:
                TiaoMu.append([YingWen, ZhongWen])
    return TiaoMu


def DuQu_Cursor_SheZhi_Fragments():
    """读取 Cursor 设置页 MCP/域名片段 JSON。"""
    LuJing = HuoQu_CiDian_WenJian_LuJing("Cursor_Settings_Fragments.json")
    if not os.path.isfile(LuJing):
        return {}
    with open(LuJing, encoding="utf-8") as WenJian:
        return json.load(WenJian)


def ShengCheng_Fragment_Array_JS_From_List(BianLiangMing, TiaoMu):
    """由已解析条目生成 var <BianLiangMing> = [[en, zh], ...];"""
    if not TiaoMu:
        return f"    var {BianLiangMing} = [];"
    Hang = []
    for YingWen, ZhongWen in TiaoMu:
        Hang.append(
            f"        [{json.dumps(YingWen, ensure_ascii=False)}, "
            f"{json.dumps(ZhongWen, ensure_ascii=False)}],"
        )
    return f"    var {BianLiangMing} = [\n" + "\n".join(Hang) + "\n    ];"


def ShengCheng_Cursor_SheZhi_Fragments_JS():
    """生成 Cursor 设置页 MCP/域名片段变量块。"""
    ShuJu = DuQu_Cursor_SheZhi_Fragments()
    Symlink = ShuJu.get("symlink") or {}
    BuFen = [
        f"    var Cursor_SheZhi_Symlink_Zh = {json.dumps(str(Symlink.get('zh', '')), ensure_ascii=False)};",
        f"    var Cursor_SheZhi_Symlink_ZhAdmin = {json.dumps(str(Symlink.get('zhAdmin', '')), ensure_ascii=False)};",
        f"    var Cursor_SheZhi_Symlink_Tail = {json.dumps(str(Symlink.get('tail', '')), ensure_ascii=False)};",
        ShengCheng_Fragment_Array_JS_From_List(
            "Cursor_SheZhi_MCP_SuiPian",
            DuQu_Fragment_Entries("Cursor_Settings_Fragments.json", "mcpEntries"),
        ),
        ShengCheng_Fragment_Array_JS_From_List(
            "Cursor_SheZhi_Domain_SuiPian",
            DuQu_Fragment_Entries("Cursor_Settings_Fragments.json", "domainEntries"),
        ),
    ]
    return "\n".join(BuFen)


def DuQu_Partial_Fragments():
    """读取设置页等长句部分匹配碎片。"""
    return DuQu_Fragment_Entries("Partial_Fragments.json")


def ShengCheng_Fragment_Array_JS(BianLiangMing, WenJianMing):
    """生成 var <BianLiangMing> = [[en, zh], ...];"""
    TiaoMu = DuQu_Fragment_Entries(WenJianMing)
    if not TiaoMu:
        return f"    var {BianLiangMing} = [];"
    Hang = []
    for YingWen, ZhongWen in TiaoMu:
        Hang.append(
            f"        [{json.dumps(YingWen, ensure_ascii=False)}, "
            f"{json.dumps(ZhongWen, ensure_ascii=False)}],"
        )
    return f"    var {BianLiangMing} = [\n" + "\n".join(Hang) + "\n    ];"


def ShengCheng_Partial_Fragments_JS():
    """生成 var DingXiang_SuiPian = [...];"""
    return ShengCheng_Fragment_Array_JS("DingXiang_SuiPian", "Partial_Fragments.json")


def ShengCheng_Dropdown_Fragments_JS():
    """生成 var XiaLa_MianBan_SuiPian = [...];"""
    return ShengCheng_Fragment_Array_JS("XiaLa_MianBan_SuiPian", "Dropdown_Fragments.json")


def ChaRu_Runtime_Keywords(YinQing_JS):
    """在 HuoQu_QuanJu_WenBen 前插入合并后的关键词表。"""
    BiaoJi = "    function HuoQu_QuanJu_WenBen()"
    Keywords = DuQu_Runtime_WenJian("keywords.js").rstrip() + "\n\n"
    if BiaoJi not in YinQing_JS:
        return YinQing_JS
    if "var QuanJu_GuanJianCi_Biao" in YinQing_JS:
        return YinQing_JS
    Idx = YinQing_JS.index(BiaoJi)
    return YinQing_JS[:Idx] + Keywords + YinQing_JS[Idx:]


def ChaRu_Runtime_Helpers(YinQing_JS):
    """在首个 XiuZheng_* 补丁前插入通用 DOM 辅助函数。"""
    BiaoJi = "    function XiuZheng_DaiMaKu_ShuoMing()"
    Helpers = DuQu_Runtime_WenJian("helpers.js").rstrip() + "\n\n"
    if BiaoJi not in YinQing_JS:
        return YinQing_JS.rstrip() + "\n\n" + Helpers
    Idx = YinQing_JS.index(BiaoJi)
    return YinQing_JS[:Idx] + Helpers + YinQing_JS[Idx:]


def ShengCheng_JS_DaiMa():
    """从 localization/runtime/ 组装完整注入脚本。"""
    BuFen = []

    Bootstrap = DuQu_Runtime_WenJian("bootstrap.js")
    Bootstrap = Bootstrap.replace(
        "__BUILD_TIMESTAMP__",
        datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
    BuFen.append(Bootstrap.rstrip())

    Zhu_CiDian = DuQu_Zhu_CiDian()
    BuFen.append(ShengCheng_FanYi_CiDian_JS(Zhu_CiDian).rstrip())

    GuangGao_HeBing = ShengCheng_GuangGao_TanChuang_HeBing_JS()
    if GuangGao_HeBing:
        BuFen.append(GuangGao_HeBing.rstrip())

    MoShi_CiDian = DuQu_MoShi_CiDian()
    BuFen.append(ShengCheng_MoShi_FanYi_JS(MoShi_CiDian).rstrip())

    YinQing = DuQu_Runtime_WenJian("engine.js")
    YinQing = YinQing.replace(
        "    // __PARTIAL_FRAGMENTS_BLOCK__",
        ShengCheng_Partial_Fragments_JS(),
    )
    YinQing = YinQing.replace(
        "    // __DROPDOWN_FRAGMENTS_BLOCK__",
        ShengCheng_Dropdown_Fragments_JS(),
    )
    YinQing = YinQing.replace(
        "    // __CURSOR_SETTINGS_FRAGMENTS_BLOCK__",
        ShengCheng_Cursor_SheZhi_Fragments_JS(),
    )
    YinQing = ChaRu_Runtime_Keywords(YinQing)
    YinQing = ChaRu_Runtime_Helpers(YinQing)
    BuFen.append(YinQing.rstrip())

    Shichang = DuQu_Runtime_WenJian("market.js")
    Chajian_Kuai = ShengCheng_Chajian_ShiChang_JS_Kuai()
    if Chajian_Kuai:
        Shichang = Shichang.replace(
            "    // __PLUGIN_MARKETPLACE_BLOCK__",
            Chajian_Kuai.rstrip(),
        )
    BuFen.append(Shichang.rstrip())

    BuFen.append(DuQu_Runtime_WenJian("init.js").rstrip())
    return "\n\n".join(BuFen) + "\n"


# ============================================================
# ★★★ 文件路径函数 ★★★
# ============================================================

def HuoQu_GongZuoTai_LuJing():
    """获取 workbench 目录完整路径"""
    return HuoQu_Workbench_MuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING)


def HuoQu_HTML_LuJing():
    """获取 workbench.html 完整路径"""
    return os.path.join(HuoQu_GongZuoTai_LuJing(), GONG_ZUO_TAI_HTML_MING)


def HuoQu_JS_LuJing():
    """获取翻译 JS 文件完整路径"""
    return os.path.join(HuoQu_GongZuoTai_LuJing(), LOCALIZATION_JS_FILE)


def HuoQu_BeiFen_LuJing():
    """获取备份文件路径"""
    return HuoQu_HTML_LuJing() + BEI_FEN_HOU_ZHUI


# ============================================================
# ★★★ 注入与恢复函数 ★★★
# ============================================================

def JianCha_YiZhuRu():
    """检查是否已经注入过翻译脚本"""
    LuJing_Html = HuoQu_HTML_LuJing()
    if not os.path.exists(LuJing_Html):
        return False
    with open(LuJing_Html, 'r', encoding='utf-8') as WenJian:
        NeiRong = WenJian.read()
    return INJECTION_MARKER_HTML in NeiRong or LEGACY_INJECTION_MARKER_HTML in NeiRong


def HuoQu_Legacy_JS_LuJing():
    """获取旧版翻译 JS 文件路径"""
    return os.path.join(HuoQu_GongZuoTai_LuJing(), LEGACY_LOCALIZATION_JS_FILE)


def DuQu_WenBen_BaoLiu_HuanHang(LuJing):
    """读取文本并检测原始换行符，避免写入时改变文件哈希。"""
    with open(LuJing, 'rb') as WenJian:
        ShuJu = WenJian.read()
    HuanHang = '\r\n' if b'\r\n' in ShuJu else '\n'
    return ShuJu.decode('utf-8'), HuanHang


def XieRu_WenBen_BaoLiu_HuanHang(LuJing, NeiRong, HuanHang=None):
    """按原始换行符写回文本，newline='' 避免 Python 再次转换。"""
    if HuanHang is None:
        if os.path.isfile(LuJing):
            _, HuanHang = DuQu_WenBen_BaoLiu_HuanHang(LuJing)
        else:
            HuanHang = '\r\n' if Shi_Windows() else '\n'
    BiaoZhun = NeiRong.replace('\r\n', '\n').replace('\r', '\n')
    if HuanHang == '\r\n':
        BiaoZhun = BiaoZhun.replace('\n', '\r\n')
    with open(LuJing, 'w', encoding='utf-8', newline='') as WenJian:
        WenJian.write(BiaoZhun)


def JiSuan_WenJian_JiaoYan_HaXi(LuJing):
    """计算与 VS Code/Cursor 一致的 SHA256+Base64 校验值（去掉末尾 =）。"""
    with open(LuJing, 'rb') as WenJian:
        ShuJu = WenJian.read()
    return base64.b64encode(hashlib.sha256(ShuJu).digest()).decode('utf-8').rstrip('=')


def ZhaDao_Workbench_JiaoYan_Jian(Product):
    """在 product.json.checksums 中查找所有 workbench.html 相关键。"""
    Checksums = Product.get('checksums')
    if not isinstance(Checksums, dict):
        return []

    MuBiao_Jian = []
    for Key in Checksums:
        if 'workbench.html' in Key.replace('\\', '/').lower():
            MuBiao_Jian.append(Key)

    for Key in WORKBENCH_CHECKSUM_KEY_HINTS:
        if Key in Checksums and Key not in MuBiao_Jian:
            MuBiao_Jian.append(Key)

    return MuBiao_Jian


def TiHuan_Product_JiaoYan_Zhi(YuanShi_WenBen, Product, MuBiao_Jian, HaXi_Zhi):
    """更新 checksum 值；优先正则替换以保留 product.json 原有格式。"""
    Checksums = Product.get('checksums')
    if not isinstance(Checksums, dict):
        return YuanShi_WenBen, False

    for Key in MuBiao_Jian:
        Checksums[Key] = HaXi_Zhi

    XinWenBen = YuanShi_WenBen
    for Key in MuBiao_Jian:
        MoShi = re.compile(r'("' + re.escape(Key) + r'"\s*:\s*")([^"]*)(")')
        if MoShi.search(XinWenBen):
            XinWenBen = MoShi.sub(r'\1' + HaXi_Zhi + r'\3', XinWenBen, count=1)
        else:
            XinWenBen = json.dumps(Product, ensure_ascii=False, indent=2)
            if not XinWenBen.endswith('\n'):
                XinWenBen += '\n'
            break

    return XinWenBen, True


def YanZheng_JiaoYan_Zhi(LuJing_Product, LuJing_Html, MuBiao_Jian):
    """写入后验证 product.json 中的 checksum 与 workbench.html 实际内容一致。"""
    try:
        with open(LuJing_Product, 'r', encoding='utf-8') as WenJian:
            Product = json.load(WenJian)
        Checksums = Product.get('checksums') or {}
        ShiJi_HaXi = JiSuan_WenJian_JiaoYan_HaXi(LuJing_Html)
        return all(Checksums.get(Key) == ShiJi_HaXi for Key in MuBiao_Jian)
    except (OSError, json.JSONDecodeError, TypeError):
        return False


def TiShi_JiaoYan_QuanXian_BuZu(LuJing_Product):
    """权限不足时的平台相关提示。"""
    if Shi_Windows():
        DiZhi = LuJing_Product.lower()
        BaoHu_MuLu = [
            os.environ.get('PROGRAMFILES', '').lower(),
            os.environ.get('PROGRAMFILES(X86)', '').lower(),
        ]
        if any(MuLu and DiZhi.startswith(MuLu) for MuLu in BaoHu_MuLu):
            print("[提示] Cursor 安装在 Program Files 下时，请右键「以管理员身份运行」启动/修复脚本")
            return
    print("[提示] 请确认当前用户对 Cursor 安装目录具有写入权限")


def ShengJi_HTML_ZhuRu_If_Needed():
    """将 workbench.html 中的旧注入标记与脚本引用升级为新命名"""
    LuJing_Html = HuoQu_HTML_LuJing()
    NeiRong, HuanHang = DuQu_WenBen_BaoLiu_HuanHang(LuJing_Html)
    YuanShi = NeiRong
    NeiRong = NeiRong.replace(LEGACY_INJECTION_MARKER_HTML, INJECTION_MARKER_HTML)
    NeiRong = NeiRong.replace(
        f'<script src="./{LEGACY_LOCALIZATION_JS_FILE}">',
        f'<script src="./{LOCALIZATION_JS_FILE}">',
    )
    if NeiRong == YuanShi:
        return
    XieRu_WenBen_BaoLiu_HuanHang(LuJing_Html, NeiRong, HuanHang)
    print("[升级] 已更新 workbench.html 中的注入引用为新命名")
    GengXin_JiaoYan_Zhi()


def ShanChu_JiuBan_JS():
    """删除旧版 cursor_hanhua.js（若存在）"""
    LuJing = HuoQu_Legacy_JS_LuJing()
    if os.path.exists(LuJing):
        os.remove(LuJing)
        print(f"[清理] 已删除旧版脚本: {LuJing}")


def ShanChu_SuoYou_ZhuRu_JS():
    """删除当前与旧版注入脚本文件"""
    for WenJianMing in (LOCALIZATION_JS_FILE, LEGACY_LOCALIZATION_JS_FILE):
        LuJing = os.path.join(HuoQu_GongZuoTai_LuJing(), WenJianMing)
        if os.path.exists(LuJing):
            os.remove(LuJing)
            print(f"[清理] 已删除脚本: {LuJing}")


def ChuangJian_BeiFen():
    """创建 workbench.html 的备份"""
    LuJing_Html = HuoQu_HTML_LuJing()
    LuJing_BeiFen = HuoQu_BeiFen_LuJing()
    if not os.path.exists(LuJing_BeiFen):
        shutil.copy2(LuJing_Html, LuJing_BeiFen)
        print(f"[备份] 已创建备份: {LuJing_BeiFen}")
    else:
        print(f"[备份] 备份已存在: {LuJing_BeiFen}")


def JiaoYan_JS_YuFa(LuJing_Js):
    """用 node --check 校验生成的 JS 语法，避免注入无效脚本。"""
    try:
        JieGuo = subprocess.run(
            ["node", "--check", LuJing_Js],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except FileNotFoundError:
        print("[警告] 未找到 node，跳过 JS 语法校验")
        return
    if JieGuo.returncode != 0:
        CuoWu = (JieGuo.stderr or JieGuo.stdout or "未知语法错误").strip()
        raise RuntimeError(f"生成的 JS 语法无效: {CuoWu}")
    print("[校验] JS 语法检查通过（node --check）")


def XieRu_FanYi_JS():
    """将翻译 JavaScript 文件写入 Cursor 目录"""
    LuJing_Js = HuoQu_JS_LuJing()
    try:
        Zhu_TiaoMu = DuQu_Zhu_CiDian()
        print(f"[主词典] 已加载 {len(Zhu_TiaoMu)} 条（localization/Core_Dictionary.json）")
    except FileNotFoundError as CuoWu:
        print(f"[错误] {CuoWu}")
        raise
    try:
        MoShi_Shu = len(DuQu_MoShi_CiDian())
        print(f"[正则] 已加载 {MoShi_Shu} 条（localization/Pattern_Dictionary.json）")
    except FileNotFoundError as CuoWu:
        print(f"[错误] {CuoWu}")
        raise
    GuangGao_TiaoMu = DuQu_GuangGao_TanChuang_CiDian()
    if GuangGao_TiaoMu:
        print(
            f"[广告弹窗] 已合并 {len(GuangGao_TiaoMu)} 条"
            f"（{HuoQu_CiDian_XianDui_LuJing(HuoQu_CiDian_WenJian_LuJing(AD_POPUP_DICTIONARY_FILE))}）"
        )
    Chajian_ShuJu = DuQu_Chajian_ShiChang_CiDian()
    if Chajian_ShuJu:
        TiaoMu_Shu = (
            len(Chajian_ShuJu.get("pluginNames", {}))
            + len(Chajian_ShuJu.get("descriptionFragments", []))
            + len(Chajian_ShuJu.get("uiLabels", {}))
        )
        print(
            f"[插件市场] 已加载 {TiaoMu_Shu} 条"
            f"（{HuoQu_CiDian_XianDui_LuJing(HuoQu_CiDian_WenJian_LuJing(PLUGIN_MARKETPLACE_DICTIONARY_FILE))}）"
        )
    JS_NeiRong = ShengCheng_JS_DaiMa()
    with open(LuJing_Js, 'w', encoding='utf-8') as WenJian:
        WenJian.write(JS_NeiRong)
    print(f"[写入] 脚本已写入: {LuJing_Js}")
    JiaoYan_JS_YuFa(LuJing_Js)


def ZhuRu_HTML():
    """在 workbench.html 中注入脚本引用"""
    LuJing_Html = HuoQu_HTML_LuJing()
    NeiRong, HuanHang = DuQu_WenBen_BaoLiu_HuanHang(LuJing_Html)

    ZhuRu_DaiMa = f'\n\t{INJECTION_MARKER_HTML}\n\t<script src="./{LOCALIZATION_JS_FILE}"></script>\n'

    if '</body>' in NeiRong:
        NeiRong = NeiRong.replace('</body>', f'</body>\n{ZhuRu_DaiMa}')
    else:
        NeiRong = NeiRong.replace('</html>', f'{ZhuRu_DaiMa}\n</html>')

    XieRu_WenBen_BaoLiu_HuanHang(LuJing_Html, NeiRong, HuanHang)

    print(f"[注入] 已在 workbench.html 中注入脚本引用")
    GengXin_JiaoYan_Zhi()


def GengXin_JiaoYan_Zhi():
    """更新 product.json 中 workbench.html 的校验哈希值"""
    LuJing_Product = os.path.join(HuoQu_App_GenMuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING), "product.json")
    LuJing_Html = HuoQu_HTML_LuJing()

    if not os.path.isfile(LuJing_Product):
        print(f"[警告] 未找到 product.json: {LuJing_Product}")
        return False

    if not os.path.isfile(LuJing_Html):
        print(f"[警告] 未找到 workbench.html: {LuJing_Html}")
        return False

    HaXi_Zhi = JiSuan_WenJian_JiaoYan_HaXi(LuJing_Html)

    LuJing_Product_BeiFen = LuJing_Product + BEI_FEN_HOU_ZHUI
    if not os.path.isfile(LuJing_Product_BeiFen):
        try:
            shutil.copy2(LuJing_Product, LuJing_Product_BeiFen)
        except OSError as CuoWu:
            print(f"[警告] 无法备份 product.json: {CuoWu}")

    try:
        with open(LuJing_Product, 'r', encoding='utf-8') as WenJian:
            YuanShi_WenBen = WenJian.read()
        Product = json.loads(YuanShi_WenBen)
    except (OSError, json.JSONDecodeError) as CuoWu:
        print(f"[警告] 无法读取/解析 product.json: {CuoWu}")
        return False

    MuBiao_Jian = ZhaDao_Workbench_JiaoYan_Jian(Product)
    if not MuBiao_Jian:
        Checksums = Product.get('checksums') if isinstance(Product.get('checksums'), dict) else {}
        ShiLi = list(Checksums.keys())[:8]
        print("[警告] product.json 中未找到 workbench.html 的校验条目")
        if ShiLi:
            print(f"[提示] checksums 示例键: {', '.join(ShiLi)}")
        return False

    XinWenBen, YiGengXin = TiHuan_Product_JiaoYan_Zhi(YuanShi_WenBen, Product, MuBiao_Jian, HaXi_Zhi)
    if not YiGengXin:
        print("[警告] 未能写入 product.json 校验值")
        return False

    try:
        with open(LuJing_Product, 'w', encoding='utf-8') as WenJian:
            WenJian.write(XinWenBen)
    except PermissionError:
        print("[错误] 无法写入 product.json：权限不足")
        TiShi_JiaoYan_QuanXian_BuZu(LuJing_Product)
        return False
    except OSError as CuoWu:
        print(f"[错误] 无法写入 product.json: {CuoWu}")
        return False

    if YanZheng_JiaoYan_Zhi(LuJing_Product, LuJing_Html, MuBiao_Jian):
        print(f"[校验] 已更新 product.json 中 {len(MuBiao_Jian)} 项 workbench 校验值")
        return True

    print("[警告] 校验值已写入但验证未通过；若启动仍提示损坏，请重新运行本脚本或 --fix-checksum")
    return False


def HuoQu_Bundled_VSIX_LuJing():
    """查找根目录下的简体中文语言包 VSIX。"""
    GuDingLuJing = os.path.join(JIAO_BEN_MU_LU, LANGUAGE_PACK_VSIX_FILE)
    if os.path.isfile(GuDingLuJing):
        return GuDingLuJing

    HouXuan = []
    try:
        for WenJian in os.listdir(JIAO_BEN_MU_LU):
            if WenJian.lower().endswith(".vsix") and "language-pack-zh-hans" in WenJian.lower():
                HouXuan.append(os.path.join(JIAO_BEN_MU_LU, WenJian))
    except OSError:
        return None

    if not HouXuan:
        return None
    return sorted(HouXuan, reverse=True)[0]


def HuoQu_Cursor_VSCode_BanBen(GenMuLu=None):
    """读取 Cursor product.json 中的 vscodeVersion。"""
    LuJing = os.path.join(HuoQu_App_GenMuLu_LuJing(GenMuLu or CURSOR_AN_ZHUANG_LU_JING), "product.json")
    try:
        with open(LuJing, "r", encoding="utf-8") as WenJian:
            return json.load(WenJian).get("vscodeVersion")
    except Exception as CuoWu:
        print(f"[语言包] 读取 vscodeVersion 失败: {CuoWu}")
        return None


def JieXi_ZhuCiYao_BanBen(BanBen):
    """从版本字符串提取 major.minor，如 1.105.1 -> 1.105。"""
    if not BanBen:
        return None
    BuFen = str(BanBen).strip().split(".")
    if len(BuFen) < 2:
        return None
    try:
        int(BuFen[0])
        int(BuFen[1])
        return f"{BuFen[0]}.{BuFen[1]}"
    except ValueError:
        return None


def YuYan_Bao_BanBen_PiPei(YuYanBaoBanBen, CursorVSCodeBanBen):
    """语言包版本是否与 Cursor 内置 VS Code 主版本匹配。"""
    QianZhui = JieXi_ZhuCiYao_BanBen(CursorVSCodeBanBen)
    if not QianZhui or not YuYanBaoBanBen:
        return False
    return str(YuYanBaoBanBen).startswith(QianZhui + ".")


def DuQu_VSIX_BanBen(VsixLuJing):
    """从 VSIX 内 package.json 读取扩展版本号。"""
    try:
        with zipfile.ZipFile(VsixLuJing, "r") as YaSuoBao:
            with YaSuoBao.open("extension/package.json") as WenJian:
                return json.load(WenJian).get("version")
    except Exception:
        return None


def ChaXun_ShiChang_BanBenLieBiao():
    """从 VS Code 市场查询简体中文语言包全部版本（新到旧）。"""
    QingQiuTi = json.dumps({
        "filters": [{
            "criteria": [{
                "filterType": 7,
                "value": f"{LANGUAGE_PACK_PUBLISHER}.{LANGUAGE_PACK_EXTENSION}",
            }],
        }],
        "flags": 1,
    }).encode("utf-8")
    QingQiu = urllib.request.Request(
        LANGUAGE_PACK_MARKETPLACE_QUERY,
        data=QingQiuTi,
        headers={
            "Accept": "application/json;api-version=7.2-preview.1",
            "Content-Type": "application/json",
            "User-Agent": "Cursor-Localization-Tool",
        },
        method="POST",
    )
    with urllib.request.urlopen(QingQiu, timeout=90) as XiangYing:
        ShuJu = json.load(XiangYing)

    KuoZhanLieBiao = ShuJu.get("results", [{}])[0].get("extensions", [])
    if not KuoZhanLieBiao:
        return []
    return [Xiang.get("version") for Xiang in KuoZhanLieBiao[0].get("versions", []) if Xiang.get("version")]


def XuanZe_PiPei_ShiChang_BanBen(CursorVSCodeBanBen, BanBenLieBiao):
    """在市场版本列表中选取与 Cursor vscodeVersion 主版本匹配的最新包。"""
    QianZhui = JieXi_ZhuCiYao_BanBen(CursorVSCodeBanBen)
    if not QianZhui:
        return None
    for BanBen in BanBenLieBiao:
        if str(BanBen).startswith(QianZhui + "."):
            return BanBen
    return None


def XiaZai_ShiChang_VSIX(BanBen, MuBiaoLuJing):
    """从 VS Code 市场下载指定版本 VSIX 并保存到目标路径。"""
    Url = LANGUAGE_PACK_MARKETPLACE_DOWNLOAD.format(version=BanBen)
    QingQiu = urllib.request.Request(
        Url,
        headers={
            "User-Agent": "Cursor-Localization-Tool",
            "Accept": "application/octet-stream",
        },
    )
    LinShiLuJing = MuBiaoLuJing + ".download"
    with urllib.request.urlopen(QingQiu, timeout=120) as XiangYing:
        YuanShi = XiangYing.read()

    if YuanShi[:2] == b"\x1f\x8b":
        YuanShi = gzip.decompress(YuanShi)

    with zipfile.ZipFile(io.BytesIO(YuanShi), "r") as YaSuoBao:
        if YaSuoBao.testzip() is not None:
            raise ValueError("下载的 VSIX 压缩包校验失败")

    with open(LinShiLuJing, "wb") as WenJian:
        WenJian.write(YuanShi)
    os.replace(LinShiLuJing, MuBiaoLuJing)


def QueBao_PiPei_YuYan_Bao_VSIX():
    """确保根目录 VSIX 与当前 Cursor 内置 VS Code 版本匹配，必要时自动下载。"""
    MuBiaoLuJing = os.path.join(JIAO_BEN_MU_LU, LANGUAGE_PACK_VSIX_FILE)
    CursorBanBen = HuoQu_Cursor_VSCode_BanBen()
    BenDiLuJing = HuoQu_Bundled_VSIX_LuJing()

    if not CursorBanBen:
        print("[语言包] 无法读取 Cursor 的 vscodeVersion，使用本地 VSIX（如有）")
        return BenDiLuJing

    print(f"[语言包] Cursor 内置 VS Code 版本: {CursorBanBen}")
    QianZhui = JieXi_ZhuCiYao_BanBen(CursorBanBen)

    if BenDiLuJing:
        BenDiBanBen = DuQu_VSIX_BanBen(BenDiLuJing)
        if BenDiBanBen and YuYan_Bao_BanBen_PiPei(BenDiBanBen, CursorBanBen):
            print(f"[语言包] 本地 VSIX 版本匹配: {BenDiBanBen}")
            return BenDiLuJing
        if BenDiBanBen:
            print(f"[语言包] 本地 VSIX 版本不匹配: {BenDiBanBen}（需要 {QianZhui}.x）")
    else:
        print("[语言包] 未找到本地 VSIX")

    print(f"[语言包] 正在从 VS Code 市场下载匹配版本 ({QianZhui}.x)...")
    try:
        ShiChangBanBenLieBiao = ChaXun_ShiChang_BanBenLieBiao()
        MuBiaoBanBen = XuanZe_PiPei_ShiChang_BanBen(CursorBanBen, ShiChangBanBenLieBiao)
        if not MuBiaoBanBen:
            print(f"[语言包] 市场未找到与 {CursorBanBen} 匹配的语言包")
            if BenDiLuJing:
                print("[语言包] 将尝试使用不匹配的本地 VSIX")
                return BenDiLuJing
            return None

        XiaZai_ShiChang_VSIX(MuBiaoBanBen, MuBiaoLuJing)
        print(f"[语言包] 已下载并保存: {MuBiaoLuJing} ({MuBiaoBanBen})")
        return MuBiaoLuJing
    except urllib.error.URLError as CuoWu:
        print(f"[语言包] 网络下载失败: {CuoWu}")
    except Exception as CuoWu:
        print(f"[语言包] 自动下载失败: {CuoWu}")

    if BenDiLuJing:
        print("[语言包] 将尝试使用本地 VSIX")
        return BenDiLuJing
    return None


def SheZhi_XianShi_YuYan():
    """写入 User/locale.json，将显示语言设为简体中文。"""
    UserMuLu = os.path.join(CURSOR_SHU_JU_LU_JING, "User")
    os.makedirs(UserMuLu, exist_ok=True)
    LuJing = os.path.join(UserMuLu, "locale.json")
    MuBiao = {"locale": XUAN_SHI_YU_YAN}

    if os.path.exists(LuJing):
        try:
            with open(LuJing, "r", encoding="utf-8") as WenJian:
                DangQian = json.load(WenJian)
            if DangQian.get("locale") == XUAN_SHI_YU_YAN:
                print(f"[语言包] 显示语言已是 {XUAN_SHI_YU_YAN}，跳过 locale.json")
                return True
        except Exception:
            pass

    with open(LuJing, "w", encoding="utf-8") as WenJian:
        json.dump(MuBiao, WenJian, ensure_ascii=False, indent=2)
        WenJian.write("\n")
    print(f"[语言包] 已设置显示语言: {LuJing} -> {XUAN_SHI_YU_YAN}")
    return True


def AnZhuang_GuanFang_YuYan_Bao():
    """确保语言包版本匹配、安装 VSIX，并设置显示语言为 zh-cn。"""
    VsixLuJing = QueBao_PiPei_YuYan_Bao_VSIX()
    if not VsixLuJing:
        print(f"[语言包] 未找到可用 VSIX（目标: {LANGUAGE_PACK_VSIX_FILE}）")
        print("[语言包] 请检查网络连接，或手动将语言包放入脚本根目录")
        print("[语言包] 跳过官方语言包安装，继续执行注入汉化...")
        return False

    CliLuJing = HuoQu_Cursor_CLI_LuJing()
    if not os.path.isfile(CliLuJing):
        print(f"[语言包] 未找到 Cursor CLI: {CliLuJing}")
        print("[语言包] 跳过官方语言包安装，继续执行注入汉化...")
        return False

    MingLing = [
        CliLuJing,
        "--install-extension", VsixLuJing,
        "--force",
        f"--user-data-dir={CURSOR_SHU_JU_LU_JING}",
    ]
    print(f"[语言包] 正在安装: {os.path.basename(VsixLuJing)}")
    BanBen = DuQu_VSIX_BanBen(VsixLuJing) or LANGUAGE_PACK_BUNDLED_VERSION
    print(f"[语言包] 包内版本: {BanBen}")
    print(f"[语言包] CLI: {CliLuJing}")

    try:
        JieGuo = subprocess.run(
            MingLing,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
    except Exception as CuoWu:
        print(f"[语言包] 安装失败: {CuoWu}")
        print("[语言包] 可手动安装 VSIX，或关闭 Cursor 后重试")
        return False

    ShuChu = ((JieGuo.stdout or "") + (JieGuo.stderr or "")).strip()
    if ShuChu:
        for Hang in ShuChu.splitlines():
            if Hang.strip():
                print(f"[语言包] {Hang.strip()}")

    if JieGuo.returncode != 0:
        print(f"[语言包] CLI 退出码 {JieGuo.returncode}，安装可能未成功")
        print("[语言包] 可手动执行: Extensions: Install from VSIX...")
        return False

    if "successfully installed" not in ShuChu.lower() and "already installed" not in ShuChu.lower():
        # 部分版本 CLI 成功时 stdout 较少，以退出码为准
        if JieGuo.returncode == 0:
            print("[语言包] 扩展安装命令已执行")

    SheZhi_XianShi_YuYan()
    return True


def HuoQu_YuYan_Bao_PeiZhi_LuJing():
    """获取 Cursor 用户数据目录中的 languagepacks.json 路径"""
    return os.path.join(CURSOR_SHU_JU_LU_JING, "languagepacks.json")


def DuQu_YuYan_Bao_PeiZhi():
    """读取 languagepacks.json"""
    LuJing = HuoQu_YuYan_Bao_PeiZhi_LuJing()
    if not os.path.exists(LuJing):
        print(f"[语言包] 未找到 languagepacks.json: {LuJing}")
        return None, LuJing

    try:
        with open(LuJing, 'r', encoding='utf-8') as WenJian:
            return json.load(WenJian), LuJing
    except Exception as CuoWu:
        print(f"[语言包] 读取 languagepacks.json 失败: {CuoWu}")
        return None, LuJing


def HuoQu_JianTiZhongWen_PeiZhi(XinXi):
    """从 languagepacks.json 中查找 zh-cn 配置"""
    if not XinXi:
        return None, None

    for Jian in ("zh-cn", "zh-CN"):
        if Jian in XinXi:
            return Jian, XinXi[Jian]

    print("[语言包] 未找到 zh-cn 语言包配置，跳过 Cursor 私有扩展翻译桥接")
    return None, None


def XieRu_KuoZhan_FanYi_QiaoJie():
    """把 Cursor 私有扩展翻译接到现有 zh-cn 语言包通道"""
    XinXi, LuJing = DuQu_YuYan_Bao_PeiZhi()
    Jian, PeiZhi = HuoQu_JianTiZhongWen_PeiZhi(XinXi)
    if not Jian or not PeiZhi:
        return

    FanYiLieBiao = PeiZhi.setdefault("translations", {})
    ZhuFanYi = FanYiLieBiao.get("vscode")
    if not ZhuFanYi:
        print("[语言包] zh-cn 配置缺少 vscode 主翻译路径，跳过私有扩展翻译桥接")
        return

    KuoZhanMuLu = os.path.dirname(ZhuFanYi)
    os.makedirs(KuoZhanMuLu, exist_ok=True)

    ShiFouGengXin = False
    for KuoZhanId, FanYiNeiRong in KUO_ZHAN_FAN_YI_QIAO_JIE.items():
        WenJianMing = KuoZhanId.replace('/', '.').replace('\\', '.') + ".i18n.json"
        WenJianLuJing = os.path.join(KuoZhanMuLu, WenJianMing)
        BiaoZhunNeiRong = {
            "": [
                "Generated by Cursor_Localization_Tool.py for Cursor private extensions."
            ],
            "version": "1.0.0",
            "contents": FanYiNeiRong
        }

        YuanYou = None
        if os.path.exists(WenJianLuJing):
            try:
                with open(WenJianLuJing, 'r', encoding='utf-8') as WenJian:
                    YuanYou = json.load(WenJian)
            except Exception:
                YuanYou = None

        if YuanYou != BiaoZhunNeiRong:
            with open(WenJianLuJing, 'w', encoding='utf-8') as WenJian:
                json.dump(BiaoZhunNeiRong, WenJian, ensure_ascii=False, indent=2)
                WenJian.write('\n')
            print(f"[语言包] 已写入私有扩展翻译: {WenJianLuJing}")
            ShiFouGengXin = True

        if FanYiLieBiao.get(KuoZhanId) != WenJianLuJing:
            FanYiLieBiao[KuoZhanId] = WenJianLuJing
            ShiFouGengXin = True

    if ShiFouGengXin:
        with open(LuJing, 'w', encoding='utf-8') as WenJian:
            json.dump(XinXi, WenJian, ensure_ascii=False, indent=2)
            WenJian.write('\n')
        print("[语言包] 已更新 languagepacks.json，重启 Cursor 后私有扩展简中生效")
    else:
        print("[语言包] Cursor 私有扩展翻译桥接已是最新状态")


def YiChu_KuoZhan_FanYi_QiaoJie():
    """移除脚本添加的 Cursor 私有扩展翻译桥接"""
    XinXi, LuJing = DuQu_YuYan_Bao_PeiZhi()
    Jian, PeiZhi = HuoQu_JianTiZhongWen_PeiZhi(XinXi)
    if not Jian or not PeiZhi:
        return

    FanYiLieBiao = PeiZhi.get("translations", {})
    ShiFouGengXin = False

    for KuoZhanId in KUO_ZHAN_FAN_YI_QIAO_JIE:
        WenJianLuJing = FanYiLieBiao.get(KuoZhanId)
        if WenJianLuJing and os.path.exists(WenJianLuJing):
            os.remove(WenJianLuJing)
            print(f"[语言包] 已删除私有扩展翻译: {WenJianLuJing}")
        if KuoZhanId in FanYiLieBiao:
            del FanYiLieBiao[KuoZhanId]
            ShiFouGengXin = True

    if ShiFouGengXin:
        with open(LuJing, 'w', encoding='utf-8') as WenJian:
            json.dump(XinXi, WenJian, ensure_ascii=False, indent=2)
            WenJian.write('\n')
        print("[语言包] 已从 languagepacks.json 移除私有扩展翻译桥接")


def HuiFu_JiaoYan_Zhi():
    """恢复 product.json 的原始校验值"""
    LuJing_Product = os.path.join(HuoQu_App_GenMuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING), "product.json")
    LuJing_Product_BeiFen = LuJing_Product + BEI_FEN_HOU_ZHUI
    if os.path.exists(LuJing_Product_BeiFen):
        shutil.copy2(LuJing_Product_BeiFen, LuJing_Product)
        os.remove(LuJing_Product_BeiFen)
        print(f"[校验] 已恢复 product.json 原始校验值")


def HuiFu_YuanShi():
    """恢复原始的 workbench.html"""
    LuJing_Html = HuoQu_HTML_LuJing()
    LuJing_BeiFen = HuoQu_BeiFen_LuJing()

    if os.path.exists(LuJing_BeiFen):
        shutil.copy2(LuJing_BeiFen, LuJing_Html)
        os.remove(LuJing_BeiFen)
        print(f"[恢复] 已从备份恢复: {LuJing_Html}")
    else:
        print("[恢复] 未找到备份文件，尝试手动移除注入...")
        NeiRong, HuanHang = DuQu_WenBen_BaoLiu_HuanHang(LuJing_Html)
        HangLieBiao = NeiRong.splitlines(keepends=True)
        XinHang = []
        TiaoGuo = False
        for Hang in HangLieBiao:
            if INJECTION_MARKER_HTML in Hang or LEGACY_INJECTION_MARKER_HTML in Hang:
                TiaoGuo = True
                continue
            if TiaoGuo and (
                '<script src="./' + LOCALIZATION_JS_FILE + '">' in Hang
                or '<script src="./' + LEGACY_LOCALIZATION_JS_FILE + '">' in Hang
            ):
                TiaoGuo = False
                continue
            if not TiaoGuo:
                XinHang.append(Hang)
        XieRu_WenBen_BaoLiu_HuanHang(LuJing_Html, ''.join(XinHang), HuanHang)
        print(f"[恢复] 已手动移除注入内容")

    HuiFu_JiaoYan_Zhi()

    ShanChu_SuoYou_ZhuRu_JS()

    YiChu_KuoZhan_FanYi_QiaoJie()

    print("[完成] 已恢复原始状态")


# ============================================================
# ★★★ 主程序 ★★★
# ============================================================

def ZhuChengXu():
    """主程序入口"""
    JianCha_Python_HuanJing()
    print("=" * 60)
    print("  Cursor 汉化工具")
    print(f"  时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    PingTai = "macOS" if Shi_MacOS() else ("Windows" if Shi_Windows() else sys.platform)
    print(f"  系统: {PingTai}")
    print(f"  安装: {CURSOR_AN_ZHUANG_LU_JING}")
    print(f"  数据: {CURSOR_SHU_JU_LU_JING}")
    print("=" * 60)

    # 恢复模式
    if len(sys.argv) > 1 and sys.argv[1] in ('--restore', '--huifu'):
        print("\n[模式] 恢复原始文件...")
        HuiFu_YuanShi()
        return

    # 仅修复校验（解决「安装已损坏」提示）
    if len(sys.argv) > 1 and sys.argv[1] in ('--fix-checksum', '--fix-jiaoyan', '--xiufu-jiaoyan'):
        print("\n[模式] 修复 product.json 校验值...")
        if GengXin_JiaoYan_Zhi():
            print("\n[完成] 校验修复完成，请完全退出并重启 Cursor。")
        else:
            print("\n[失败] 校验修复未完成，请查看上方提示。")
            sys.exit(1)
        return

    # 检查 Cursor 安装目录
    LuJing_Html = HuoQu_HTML_LuJing()
    if not os.path.exists(LuJing_Html):
        print(f"\n[错误] 未找到 workbench.html: {LuJing_Html}")
        print(f"[提示] 请检查 CURSOR_AN_ZHUANG_LU_JING 是否正确: {CURSOR_AN_ZHUANG_LU_JING}")
        sys.exit(1)

    print("\n[步骤 1/4] 安装/更新官方简体中文语言包...")
    AnZhuang_GuanFang_YuYan_Bao()

    print("\n[步骤 2/4] 更新 Cursor 私有扩展翻译桥接...")
    XieRu_KuoZhan_FanYi_QiaoJie()

    # 检查是否已注入
    if JianCha_YiZhuRu():
        print("\n[步骤 3/4] 脚本已注入，正在更新...")
        ShengJi_HTML_ZhuRu_If_Needed()
        XieRu_FanYi_JS()
        ShanChu_JiuBan_JS()
        GengXin_JiaoYan_Zhi()
        print("\n[完成] 语言包与脚本已更新！请完全退出并重启 Cursor 生效。")
        return

    # 首次注入
    print("\n[步骤 3/4] 创建备份并写入脚本...")
    ChuangJian_BeiFen()
    XieRu_FanYi_JS()

    print("[步骤 4/4] 注入 HTML 引用...")
    ZhuRu_HTML()

    print("\n" + "=" * 60)
    print("  [完成] 语言包安装与汉化注入成功！")
    print("  请完全退出并重启 Cursor 以查看效果。")
    print("  如需恢复: python Cursor_Localization_Tool.py --restore")
    print("  如需更新词典: 重新运行本脚本即可")
    print("=" * 60)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--check-python':
        JianCha_Python_HuanJing()
        print("[检查] Python 环境正常:", sys.executable)
        sys.exit(0)
    ZhuChengXu()
