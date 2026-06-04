# -*- coding: utf-8 -*-
"""校验 localization 词典 JSON（重复 key、空值、正则语法）。"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CORE = os.path.join(ROOT, "localization", "Core_Dictionary.json")
PATTERN = os.path.join(ROOT, "localization", "Pattern_Dictionary.json")


def validate_core(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    entries = []
    if isinstance(data.get("sections"), list):
        for sec in data["sections"]:
            entries.extend(sec.get("entries") or [])
    else:
        entries = data.get("entries") or []

    errors = []
    warnings = []
    seen = {}
    for i, item in enumerate(entries):
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            errors.append(f"entries[{i}] invalid shape")
            continue
        en, zh = str(item[0]), str(item[1])
        if not en or not zh:
            errors.append(f"empty entry at index {i}")
        if en in seen and seen[en] != zh:
            warnings.append(f"duplicate key conflict: {en!r}")
        seen[en] = zh
    return len(seen), errors, warnings


def validate_patterns(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    errors = []
    warnings = []
    count = 0
    for i, p in enumerate(data.get("patterns") or []):
        if not isinstance(p, dict):
            errors.append(f"patterns[{i}] not object")
            continue
        regex = p.get("regex")
        repl = p.get("replacement")
        if not regex or repl is None:
            errors.append(f"patterns[{i}] missing regex/replacement")
            continue
        flags = p.get("flags") or ""
        py_flags = 0
        if "i" in flags:
            py_flags |= re.IGNORECASE
        try:
            re.compile(regex, py_flags)
        except re.error as e:
            warnings.append(f"patterns[{i}] regex not valid in Python (may still work in JS): {e}")
        if "\\\\" in regex:
            warnings.append(f"patterns[{i}] regex may be double-escaped: {regex[:60]!r}")
        count += 1
    return count, errors, warnings


def main():
    ok = True
    n, err, warn = validate_core(CORE)
    print(f"[core] {n} unique keys, {len(err)} errors, {len(warn)} warnings")
    for e in err[:10]:
        print("  error:", e)
        ok = False
    for w in warn[:10]:
        print("  warn:", w)

    n2, err2, warn2 = validate_patterns(PATTERN)
    print(f"[pattern] {n2} rules, {len(err2)} errors, {len(warn2)} warnings")
    for e in err2[:10]:
        print("  error:", e)
        ok = False
    for w in warn2[:10]:
        print("  warn:", w)

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
