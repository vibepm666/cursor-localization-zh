#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

function parseArgs(argv) {
  const opts = {
    cursorRoot: process.env.CURSOR_INSTALL_DIR || process.env.CURSOR_ROOT || path.resolve(__dirname, ".."),
    key: "",
    text: "",
    grep: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--cursor-root" && argv[i + 1]) {
      opts.cursorRoot = argv[++i];
    } else if (arg === "--key" && argv[i + 1]) {
      opts.key = argv[++i];
    } else if (arg === "--text" && argv[i + 1]) {
      opts.text = argv[++i];
    } else if (arg === "--no-grep") {
      opts.grep = false;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!opts.key && !opts.text) {
    printHelp();
    process.exit(1);
  }

  return opts;
}

function printHelp() {
  console.log(`Usage:
  node Cursor_Setting_Lookup.js --key "terminal.integrated.tabs.enabled"
  node Cursor_Setting_Lookup.js --text "Automatically index any new folders"
  node Cursor_Setting_Lookup.js --cursor-root "D:\\\\Codes\\\\cursor" --key "terminal.integrated.windowsEnableConpty"

Options:
  --cursor-root <path>   Cursor install root, default: CURSOR_INSTALL_DIR or parent folder
  --key <setting-key>    Lookup an exact NLS key
  --text <english>       Lookup by English text fragment
  --no-grep              Skip source grep in app/out
`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveAppBase(cursorRoot) {
  const candidates = [
    cursorRoot,
    path.join(cursorRoot, "resources", "app"),
  ];

  for (const candidate of candidates) {
    const keysPath = path.join(candidate, "out", "nls.keys.json");
    const messagesPath = path.join(candidate, "out", "nls.messages.json");
    if (fs.existsSync(keysPath) && fs.existsSync(messagesPath)) {
      return candidate;
    }
  }

  throw new Error(`Could not find resources/app under: ${cursorRoot}`);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findRecords(baseDir, opts) {
  const keysPath = path.join(baseDir, "out", "nls.keys.json");
  const messagesPath = path.join(baseDir, "out", "nls.messages.json");
  const keys = readJson(keysPath);
  const messages = readJson(messagesPath);
  const results = [];

  let offset = 0;
  for (const entry of keys) {
    const moduleId = entry[0];
    const moduleKeys = entry[1];
    const moduleMessages = messages.slice(offset, offset + moduleKeys.length);

    for (let i = 0; i < moduleKeys.length; i++) {
      const key = moduleKeys[i];
      const message = moduleMessages[i];
      const keyMatch = opts.key && key === opts.key;
      const textMatch = opts.text && typeof message === "string" && message.toLowerCase().includes(opts.text.toLowerCase());

      if (keyMatch || textMatch) {
        results.push({
          moduleId,
          localIndex: i,
          globalIndex: offset + i,
          key,
          message,
        });
      }
    }

    offset += moduleKeys.length;
  }

  return results;
}

function grepSources(baseDir, record, opts) {
  if (!opts.grep) {
    return "";
  }

  const appOut = path.join(baseDir, "out");
  const needles = [record.key];
  if (typeof record.message === "string" && record.message.length > 0) {
    needles.push(record.message);
  }

  const chunks = [];
  for (const needle of needles) {
    try {
      const output = cp.execFileSync("rg", [
        "-n",
        "-C",
        "1",
        "--fixed-strings",
        needle,
        appOut,
        "-g",
        "*.js",
        "-g",
        "!Cursor_Localization.js",
        "-g",
        "!*.backup-byok-*",
      ], {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      }).trim();
      if (output) {
        chunks.push(`needle: ${needle}\n${output}`);
      }
    } catch (error) {
      const stdout = error && typeof error.stdout === "string" ? error.stdout.trim() : "";
      if (stdout) {
        chunks.push(`needle: ${needle}\n${stdout}`);
      }
    }
  }

  return chunks.join("\n\n");
}

function grepTextInOut(baseDir, text) {
  const appOut = path.join(baseDir, "out");
  try {
    return cp.execFileSync("rg", [
      "-n",
      "-C",
      "1",
      "--fixed-strings",
      text,
      appOut,
      "-g",
      "*.js",
      "-g",
      "!Cursor_Localization.js",
      "-g",
      "!*.backup-byok-*",
      "-g",
      "*.json",
      "-g",
      "*.html",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    }).trim();
  } catch (error) {
    const stdout = error && typeof error.stdout === "string" ? error.stdout.trim() : "";
    return stdout;
  }
}

function printRecord(baseDir, record, opts) {
  console.log("=".repeat(80));
  console.log(`Cursor root : ${baseDir}`);
  console.log(`Module      : ${record.moduleId}`);
  console.log(`Key         : ${record.key}`);
  console.log(`Message     : ${record.message}`);
  console.log(`NLS index   : local=${record.localIndex}, global=${record.globalIndex}`);
  const grepResult = grepSources(baseDir, record, opts);
  if (grepResult) {
    console.log("Source hits :");
    console.log(grepResult);
  } else {
    console.log("Source hits : no direct JS hit");
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const baseDir = resolveAppBase(opts.cursorRoot);
  const records = findRecords(baseDir, opts);

  if (records.length === 0) {
    if (opts.text) {
      const grepResult = grepTextInOut(baseDir, opts.text);
      if (grepResult) {
        console.log("No NLS record found. Raw source hits:");
        console.log(grepResult);
        return;
      }
    }
    console.error("No matching NLS record found.");
    process.exit(2);
  }

  for (const record of records) {
    printRecord(baseDir, record, opts);
  }
}

main();
