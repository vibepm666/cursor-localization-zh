    // 全局/设置页关键词表（供 QuanJu_BaoHan_GuanJianCi* 与各 XiuZheng_* 门闩复用）

    var QuanJu_GuanJianCi_Biao = {
        GONG_NENG_TUI_GUANG: [
            'multitask', 'Parallelize', 'Get Unblocked', 'Coordinate parallel', 'Try now in Cursor',
            'Cloud Agents, and more', 'unlimited Tab', 'Refactor code generator', "You've hit your usage limit",
            'Usage limit reached', 'Get faster responses', 'Responses may be slower',
            'Increase limits for faster', 'out of usage', 'ask your admin',
            'Total usage limit reached', 'on-demand limit', 'Upgrade to Pro+', 'Set new limit',
            'Smartest Model Yet', '50% Off Through', 'Try Grok',
            'use subagents to break down tasks',
            'Plan Update', '2x Included Usage', 'High Load', 'high demand right now',
            'Connect GitHub to Cursor', 'Let agents work with your Repos',
            'have moved to Customize', 'new home for all the ways'
        ],
        HUAN_YING: [
            'Sign in', 'Log in', 'Sign Up', 'Sign up', 'The best way to code with AI',
            'Open Project', 'Clone Repository', 'Connect via SSH',
            'Remote Machines', 'Publish to GitHub', 'Report Issue', 'Send Feedback', 'Code Intelligence',
            'Click to import all local VS Code extensions', "don't show again", 'Log in to use Cursor AI features',
            'Repositories', 'Message Cursor', 'Browse Files', 'No workspace folder open',
            'Close Pane', 'Unable to load automations', "Let's kick something off",
            'Getting Started', 'Teach Cursor New Skills', 'have moved to Customize'
        ],
        YIN_YING_MOHU: [
            'Shadow & Blur', 'Drop shadow', 'Inner shadow', 'Layer Blur', 'Backdrop Blur',
            'Add shadow or blur', 'Remove shadow', 'Adjust shadow', 'Hide drop shadow', 'Show drop shadow',
            'css-effects-type-select', 'css-inspector-section'
        ],
        SHE_JI_MIAN_BAN: [
            'Stops', 'Ellipse', 'Solid', 'Linear', 'Radial', 'Conic', 'Circle', 'Fixed Width', 'Fit contents', 'Fill container',
            'Shadow & Blur', 'Drop shadow', 'Inner shadow', 'Layer Blur', 'Backdrop Blur', 'Add shadow or blur',
            'Filter properties', 'Describe the change', 'Annotate', 'to cancel', 'to select or', 'Exit Design Mode',
            'Responsive Design Mode'
        ],
        UPGRADE_TI_SHI: [
            'Upgrade for extended', 'Upgrade to Pro', 'extended limits', 'upgrade-pro',
            'Cloud Agents, and more', 'usage limit', 'unlimited Tab', "You've hit your usage limit",
            'Usage limit reached', 'Get faster responses', 'Responses may be slower',
            'Increase limits for faster', 'out of usage', 'ask your admin',
            'Total usage limit reached', 'on-demand limit', 'Upgrade to Pro+', 'Set new limit',
            'Get Cursor Pro for more Agent usage', 'Plan Update', 'Included Usage'
        ],
        ZHI_NENG_TI_FAN_KUI: [
            'How did the agent do', 'Misunderstood task', 'Ignored constraint', 'Wrong scope',
            'Visually hard to read', 'Wrote too much', 'Explanation not trustworthy', 'Add a comment'
        ],
        AGENT_GENG_GAI: [
            'All Changes', 'Pending Changes', 'Changes waiting to be confirmed', 'Keep Ctrl', ' of ',
            'Undo File', 'Keep File', 'Accept all changes', 'Keep all changes', 'Keep changes', 'Review Next File',
            'No Uncommitted Changes', 'Branch Commits', 'Find in Changes', 'Refresh Changes'
        ],
        TI_JI_CAI_DAN: [
            'Files & Folders', 'Past Chats', 'Terminals', 'Mentions', 'Branch (Diff with Main)',
            'No available options', 'Changes from current branch'
        ],
        ZHI_NENG_TI_MO_SHI: [
            'Switch Agent Mode', 'Switch Model', 'Multitask', 'Systematically diagnose',
            'Ask Cursor questions', 'Using ', 'Plan, search',
            'implementation plan', 'root cause of an issue', 'Orchestrate multiple subagents',
            'without making edits', 'Search skills, context'
        ],
        LIU_LAN_QI_URL: [
            'Enter a URL above', 'instruct the Agent', 'Enter URL or search', 'Search or enter URL'
        ],
        LIU_LAN_QI_GONG_JU: [
            'Take Screenshot', 'Hard Reload', 'Clear Browsing History', 'Clear Cookies', 'Clear Cache',
            'Capture Area', 'Select element', 'Show Console', 'New Tab', 'Enter Full Screen',
            'Show Bookmark Bar', 'Inspect Element', 'Reload', 'Select All'
        ],
        LIU_LAN_QI_CUO_WU: [
            'Connection Failed', 'Connection failed', 'Restart Browser', 'Show Details', 'browser-error', 'canvas-error-view',
            'Enter a URL above', 'instruct the Agent', 'Browser', 'ERR_CONNECTION',
            'Cursor Browser', "Don't Open", 'Opening '
        ],
        DUI_LIE: [
            'Queued', 'Send now', 'Edit queued', 'Editing queued', 'Remove from queue', 'Attached image',
            'Send After Current Message', 'Send Right Away'
        ],
        TI_JIAO_PING_FEN: [
            'Most Recent Commit Scored', 'AI-Generated:', 'Total Changes:', 'Agent Stats:', 'Tab Stats:',
            'No commit scored', 'No commit has been scored yet', '% AI'
        ]
    };

    // 设置页关键词。命中后才跑对应区块的修正
    var SheZhi_GuanJianCi_Biao = {
        DAI_MA_KU: ['Embed codebase', 'Embeddings and metadata'],
        SUO_YIN: ['50,000 files', 'index any new folders'],
        MO_XING_YE: ['OpenAI key', 'Anthropic key', 'Google AI Studio key', 'Azure OpenAI', 'AWS Bedrock', 'DeepSeek'],
        SUI_PIAN: [
            'Automation Profile', 'Natural Language Search', 'Auto Resume', 'Partial Matches', 'Continue Prompt',
            'Use with caution', 'Skip symlinks', 'cursorignore', 'cursor-settings',
            "Don't Ask Again", 'Hidden Dialogs', 'hidden dialogs'
        ],
        ZHANG_HU: ['Current Plan', 'Resets on', 'Included Usage', 'Resets', 'Window Restoration', 'Last Used Windows', 'Cursor Models', 'Other Models', 'Default Model', 'Adjust Plan', 'Usage limits reset', 'Search Cursor settings', 'Free', '免费版', 'Manage', 'CURRENT']
    };

    // 按标签查全局关键词表，判断页面是否命中
    function QuanJu_BaoHan_GuanJianCi_BiaoQian(biaoQian) {
        var words = QuanJu_GuanJianCi_Biao[biaoQian];
        if (!words || !words.length) return false;
        return QuanJu_BaoHan_GuanJianCi(words);
    }

    // 按标签查设置页关键词表，判断设置区是否命中
    function QuanJu_BaoHan_GuanJianCi_SheZhi_BiaoQian(biaoQian) {
        var words = SheZhi_GuanJianCi_Biao[biaoQian];
        if (!words || !words.length) return false;
        return QuanJu_BaoHan_GuanJianCi_SheZhi(words);
    }
