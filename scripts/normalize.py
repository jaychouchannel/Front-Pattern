# -*- coding: utf-8 -*-
"""AI 返回元素的标准化：补全字段、重生成 ID、clamp 边界。

复刻前端 app.js 中的 normalizeAIElements (line 1715)，
保证输出格式完全一致，可以直接喂给编辑器透传。
"""

from __future__ import annotations

import json
import time
from typing import Any

CANVAS_WIDTH = 1200
VALID_TYPES = frozenset({"text", "image", "video", "button", "card"})


def _uid() -> str:
    """复刻前端 uid()：时间戳 36 进制 + 随机 4 位 36 进制。"""
    import random
    ts = int(time.time() * 1000)
    ts36 = _base36(ts)
    rand36 = _base36(random.randint(0, 36 ** 4 - 1)).rjust(4, "0")
    return ts36 + rand36


def _base36(n: int) -> str:
    """正整数转 36 进制（0-9a-z）。"""
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    result = []
    while n > 0:
        result.append(chars[n % 36])
        n //= 36
    return "".join(reversed(result))


def _clamp(val: Any, lo: int = 0) -> int | float | None:
    """转为数字，NaN 返回 None。"""
    try:
        n = float(val)
    except (TypeError, ValueError):
        return None
    if n != n:  # NaN
        return None
    return max(lo, n)


def normalize_elements(raw_elements: list[dict]) -> list[dict]:
    """复刻前端 normalizeAIElements。"""
    if not isinstance(raw_elements, list):
        return []

    result: list[dict] = []
    for idx, el in enumerate(raw_elements):
        if not isinstance(el, dict):
            continue
        el_type = el.get("type", "")
        if el_type not in VALID_TYPES:
            continue

        clean = json.loads(json.dumps(el))  # deep clone
        clean["id"] = _uid()

        # clamp 数值字段
        for key in ("x", "y", "width", "height", "fontSize", "padding", "radius"):
            val = clean.get(key)
            if val is not None:
                clamped = _clamp(val)
                if clamped is None:
                    clean.pop(key, None)
                else:
                    clean[key] = clamped

        # 填充缺省值
        clean.setdefault("x", 40)
        clean.setdefault("y", 40 + idx * 20)
        clean.setdefault("width", 200)
        clean.setdefault("height", 100)

        # 水平边界保护
        if clean["x"] + clean["width"] > CANVAS_WIDTH:
            clean["x"] = max(0, CANVAS_WIDTH - clean["width"])

        clean.setdefault("zIndex", 1)

        result.append(clean)

    return result
