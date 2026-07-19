# -*- coding: utf-8 -*-
"""scripts/ 共用的 CLI 入口 utilities。

把 generate.py / run_all.py 里重复的 UTF-8 编码修复 + .env 加载收口到一处，
新脚本只需 `import cli_util` + `cli_util.bootstrap()` 即可。
"""

from __future__ import annotations

import sys

from ai_client import load_dotenv


def fix_windows_utf8() -> None:
    """Windows 终端默认 CP936，输出中文到 stdout/stderr 会触发 UnicodeEncodeError。

    强制 UTF-8，让 print 中文不崩。在其他平台是 no-op（reconfigure 只在 io.TextIOWrapper 存在）。
    """
    for _stream in (sys.stdout, sys.stderr):
        if hasattr(_stream, "reconfigure"):
            try:
                _stream.reconfigure(encoding="utf-8")
            except (ValueError, TypeError):
                pass


def bootstrap() -> None:
    """脚本入口统一调用：先修 UTF-8，再加载项目根目录 .env。"""
    fix_windows_utf8()
    load_dotenv()
