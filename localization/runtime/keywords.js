    // 全局/设置页关键词表（供 QuanJu_BaoHan_GuanJianCi* 与各 XiuZheng_* 门闩复用）

    var QuanJu_GuanJianCi_Biao = {
        GONG_NENG_TUI_GUANG: [
            'multitask', 'Parallelize', 'Get Unblocked', 'Coordinate parallel', 'Try now in Cursor',
            'Cloud Agents, and more', 'unlimited Tab', 'Refactor code generator', "You've hit your usage limit",
            'use subagents to break down tasks'
        ],
        HUAN_YING: [
            'Sign in', 'Log in', 'Open Project', 'Clone Repository', 'Connect via SSH',
            'Click to import all local VS Code extensions', "don't show again", 'Log in to use Cursor AI features',
            'Repositories', 'Message Cursor', 'Browse Files', 'No workspace folder open',
            'Close Pane', 'Unable to load automations', "Let's kick something off"
        ],
        YIN_YING_MOHU: [
            'Shadow & Blur', '阴影与模糊', 'Drop shadow', 'Inner shadow', 'Layer Blur', 'Backdrop Blur',
            'Add shadow or blur', 'Remove shadow', 'Adjust shadow', 'Hide drop shadow', 'Show drop shadow',
            'css-effects-type-select', 'css-inspector-section'
        ],
        SHE_JI_MIAN_BAN: [
            'Stops', 'Ellipse', 'Solid', 'Linear', 'Radial', 'Conic', 'Circle', 'Fixed Width', 'Fit contents', 'Fill container',
            'Shadow & Blur', 'Drop shadow', 'Inner shadow', 'Layer Blur', 'Backdrop Blur', 'Add shadow or blur'
        ],
        UPGRADE_TI_SHI: [
            'Upgrade for extended', 'Upgrade to Pro', 'extended limits', 'upgrade-pro',
            'Cloud Agents, and more', 'usage limit', 'unlimited Tab', "You've hit your usage limit",
            'Get Cursor Pro for more Agent usage'
        ],
        ZHI_NENG_TI_FAN_KUI: [
            'How did the agent do', 'Misunderstood task', 'Ignored constraint', 'Wrong scope',
            'Visually hard to read', 'Wrote too much', 'Explanation not trustworthy', 'Add a comment'
        ],
        AGENT_GENG_GAI: [
            'All Changes', 'Pending Changes', 'Changes waiting to be confirmed', 'Keep Ctrl', ' of ',
            'Undo File', 'Keep File', 'Accept all changes', 'Keep all changes', 'Keep changes', 'Review Next File'
        ],
        TI_JI_CAI_DAN: [
            'Files & Folders', 'Past Chats', 'Terminals', 'Mentions', 'Branch (Diff with Main)',
            'No available options', 'Changes from current branch',
            '文件和文件夹', '历史对话', '分支（与主分支的差异）', '提及', '暂无可用选项'
        ],
        ZHI_NENG_TI_MO_SHI: [
            'Switch Agent Mode', 'Switch Model', 'Multitask', 'Systematically diagnose',
            'Ask Cursor questions', 'Using ', 'Plan, search'
        ],
        LIU_LAN_QI_URL: [
            'Enter a URL above', 'instruct the Agent', 'Enter URL or search', 'Search or enter URL'
        ],
        LIU_LAN_QI_GONG_JU: [
            'Take Screenshot', 'Hard Reload', 'Clear Browsing History', 'Clear Cookies', 'Clear Cache',
            'Capture Area', 'Select element', 'Show Console', 'New Tab', 'Enter Full Screen',
            'Show Bookmark Bar', 'Inspect Element', 'Reload', 'Select All', '重新加载', '全选'
        ],
        LIU_LAN_QI_CUO_WU: [
            'Connection Failed', 'Restart Browser', 'Show Details', 'browser-error', 'canvas-error-view',
            'Enter a URL above', 'instruct the Agent', 'Browser', 'ERR_CONNECTION'
        ],
        DUI_LIE: [
            'Queued', 'Send now', 'Edit queued', 'Editing queued', 'Remove from queue', 'Attached image'
        ]
    };

    var SheZhi_GuanJianCi_Biao = {
        DAI_MA_KU: ['Embed codebase', 'Embeddings and metadata', '代码库索引', '索引新文件夹'],
        SUO_YIN: ['50,000 files', 'index any new folders', '索引新文件夹'],
        MO_XING_YE: ['OpenAI key', 'Anthropic key', 'Google AI Studio key', 'Azure OpenAI', 'AWS Bedrock', 'DeepSeek'],
        SUI_PIAN: [
            'Automation Profile', 'Natural Language Search', 'Auto Resume', 'Partial Matches', 'Continue Prompt',
            '自动mation', 'Use with caution', 'Skip symlinks', 'cursorignore', '符号链接', 'cursor-settings',
            "Don't Ask Again", 'Hidden Dialogs', 'hidden dialogs'
        ],
        ZHANG_HU: ['Current Plan', 'Resets on', '免费版', 'Manage', 'CURRENT']
    };

    function QuanJu_BaoHan_GuanJianCi_BiaoQian(biaoQian) {
        var words = QuanJu_GuanJianCi_Biao[biaoQian];
        if (!words || !words.length) return false;
        return QuanJu_BaoHan_GuanJianCi(words);
    }

    function QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian(biaoQian) {
        var words = SheZhi_GuanJianCi_Biao[biaoQian];
        if (!words || !words.length) return false;
        return QuanJu_BaoHan_GuanJianCi_SheZhi(words);
    }
