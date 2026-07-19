# -*- coding: utf-8 -*-
"""DeepSeek / OpenAI 调用封装。

与前端 app.js 中的 AI_PROVIDERS + AI_SYSTEM_PROMPT + callAIGenerator 严格对齐，
保证 Python 端生成的 elements 数组可以直接喂给 normalize.normalize_elements。

零第三方依赖：仅使用标准库 urllib 调 HTTP。
"""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
import urllib.error
import urllib.request


_PROJECT_ROOT: Path | None = None


def _find_project_root() -> Path:
    """从 ai_client.py 往上找项目根目录（包含 .git 或 README.md）。"""
    global _PROJECT_ROOT
    if _PROJECT_ROOT is not None:
        return _PROJECT_ROOT
    candidate = Path(__file__).resolve().parent.parent
    for marker in (candidate / ".git", candidate / "README.md", candidate / "index.html"):
        if marker.exists():
            _PROJECT_ROOT = candidate
            return candidate
    # fallback: 用 ai_client.py 所在目录的父目录
    _PROJECT_ROOT = candidate
    return candidate


def load_dotenv(path: str | Path | None = None) -> bool:
    """零依赖 .env 加载器。扫描 path（默认项目根目录下的 .env）并设置 os.environ。

    支持：
    - KEY=VALUE（注意：VALUE 前后引号会被剥掉）
    - # 行注释
    - 空行跳过
    不支持的（也是 python-dotenv 不支持或不推荐的场景，此处保持一致）：
    - export 前缀
    - 行内注释
    - 变量引用 ${VAR}
    """
    if path is None:
        path = _find_project_root() / ".env"
    p = Path(path)
    if not p.exists():
        return False
    loaded = 0
    for line in p.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, _, val = stripped.partition("=")
        key = key.strip()
        if not key:
            continue
        val = val.strip().strip("\"'")
        os.environ.setdefault(key, val)
        loaded += 1
    return loaded > 0

AI_PROVIDERS = {
    "deepseek": {
        "name": "DeepSeek",
        "baseURL": "https://api.deepseek.com",
        "model": "deepseek-chat",
    },
    "openai": {
        "name": "OpenAI",
        "baseURL": "https://api.openai.com",
        "model": "gpt-4o-mini",
    },
}

AI_SYSTEM_PROMPT = "\n".join([
    "你是一个网页布局生成器。根据用户的需求，返回一个 JSON 对象，包含 elements 数组。",
    "画布宽度 1200px，元素使用绝对定位 (x, y, width, height)。",
    "元素格式（每个对象必须包含的字段）：",
    '{ "id": "gen_1", "type": "text|image|video|button|card", "x": 数字, "y": 数字, "width": 数字, "height": 数字, ...类型特定属性 }',
    "类型特定属性：",
    "- text: content(string, 支持简单 HTML 如 <h1>/<p>/<strong>), bgColor, color, fontSize, textAlign(left/center/right), padding",
    "- image: src(图片URL, 不存在就用 https://picsum.photos/seed/xxx/W/H), alt, radius(圆角), objectFit(cover/contain/fill)",
    "- video: src, placeholder",
    "- button: text, bgColor, textColor, fontSize, radius, bold(boolean)",
    "- card: imageSrc, title, desc, bgColor, radius",
    "要求：",
    "1. 生成 4-8 个元素，构成一个完整的页面。",
    "2. 元素之间不要重叠（用 y 坐标错开）。",
    "3. x/y 从 40 开始，宽度不超过 1120，留 40px 边距。",
    '4. 响应必须是合法 JSON 对象：{"elements": [...]}',
    "5. content / title / desc 内容要具体符合用户需求（中文），不要写占位符 \"Lorem ipsum\"。",
])


class AIGeneratorError(RuntimeError):
    """AI 调用或解析失败。"""


@dataclass
class ProviderConfig:
    provider: str
    api_key: str
    base_url: str
    model: str

    @staticmethod
    def from_name(provider: str, api_key: str, *, model: str | None = None,
                  base_url: str | None = None) -> "ProviderConfig":
        cfg = AI_PROVIDERS.get(provider)
        if not cfg:
            raise AIGeneratorError(f"未知 provider: {provider}")
        return ProviderConfig(
            provider=provider,
            api_key=api_key,
            base_url=base_url or cfg["baseURL"],
            model=model or cfg["model"],
        )


def parse_ai_content(content: str) -> dict | None:
    """复刻前端 parseAIContent：兼容裸数组、{elements: [...]}、```json 包裹。"""
    if not content:
        return None
    raw = content.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"```\s*$", "", raw).strip()
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            return None
        try:
            obj = json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    if isinstance(obj, list):
        return {"elements": obj}
    return obj


def _classify_http_error(e: urllib.error.HTTPError) -> str:
    """把 HTTPError 转成对用户友好的中文提示。

    常见 4xx/5xx 都覆盖。snippet 仍然附上，便于排查网关/上游异常。
    """
    snippet = ""
    try:
        snippet = e.read().decode("utf-8", errors="replace")[:200]
    except Exception:
        pass
    base = f"HTTP {e.code}"
    hints = {
        400: f"请求格式错误（{base}）",
        401: f"API key 无效或过期（{base}）。请在 .env 设置 {('DEEPSEEK_API_KEY' if 'deepseek' in str(e.url) else 'OPENAI_API_KEY')} 或传 --api-key",
        403: f"无权访问该模型/端点（{base}）。检查账号是否开通对应模型",
        404: f"路径或模型不存在（{base}）。检查 --base-url / --model 是否拼错",
        408: f"请求超时（{base}）",
        413: f"prompt 过长（{base}）。请缩短描述",
        429: f"速率限制或配额耗尽（{base}）。稍后重试或更换账号",
    }
    hint = hints.get(e.code)
    if hint is None:
        if 500 <= e.code < 600:
            hint = f"上游服务异常（{base}）"
        else:
            hint = base
    if snippet:
        hint = f"{hint} | 响应片段: {snippet}"
    return hint


# 对 429 / 5xx 自动重试：第一次失败后等 2s 重试一次。再多反而不利于 quota。
_RETRY_STATUSES = frozenset({429, 500, 502, 503, 504})


def call_ai_generator(prompt: str, cfg: ProviderConfig, *,
                      temperature: float = 0.7, timeout: int = 60,
                      max_retries: int = 1) -> list[dict]:
    """调用 AI，返回解析后的 elements 数组（未做 normalize）。

    对 429 / 5xx 自动重试 max_retries 次（默认 1 次），间隔 2s。
    其他错误（4xx 鉴权/格式）不重试，直接抛出。
    """
    url = cfg.base_url.rstrip("/") + "/v1/chat/completions"
    payload = {
        "model": cfg.model,
        "messages": [
            {"role": "system", "content": AI_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": temperature,
    }
    body = json.dumps(payload).encode("utf-8")

    last_err: AIGeneratorError | None = None
    for attempt in range(max_retries + 1):
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {cfg.api_key}",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            break  # 成功跳出
        except urllib.error.HTTPError as e:
            hint = _classify_http_error(e)
            if e.code in _RETRY_STATUSES and attempt < max_retries:
                last_err = AIGeneratorError(f"{hint}（第 {attempt+1} 次失败，2s 后重试）")
                time.sleep(2)
                continue
            raise AIGeneratorError(hint) from e
        except urllib.error.URLError as e:
            if attempt < max_retries:
                last_err = AIGeneratorError(f"网络错误: {e.reason}（第 {attempt+1} 次失败，2s 后重试）")
                time.sleep(2)
                continue
            raise AIGeneratorError(f"网络错误: {e.reason}") from e
    else:
        # for...else 不会在 break 时执行；这里只是兜底
        raise last_err or AIGeneratorError("未知错误")

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        raise AIGeneratorError("AI 返回结构缺少 choices[0].message.content") from e

    parsed = parse_ai_content(content)
    if not parsed or not isinstance(parsed.get("elements"), list):
        raise AIGeneratorError("AI 返回格式不正确，未找到 elements 数组")
    return parsed["elements"]


def fake_call_ai_generator(prompt: str, cfg: ProviderConfig, **_: Any) -> list[dict]:
    """本地 mock，给 --dry-run 用。无需联网即可跑通链路。"""
    return [
        {"type": "text", "x": 40, "y": 40, "width": 1120, "height": 80,
         "content": f"<h1>{prompt[:24]} - DEMO</h1>", "fontSize": 28, "textAlign": "center"},
        {"type": "button", "x": 500, "y": 140, "width": 200, "height": 56,
         "text": "开始体验", "bgColor": "#3b82f6", "textColor": "#fff", "radius": 8, "bold": True},
        {"type": "card", "x": 40, "y": 240, "width": 540, "height": 220,
         "imageSrc": "https://picsum.photos/seed/demo1/600/400", "title": "卡片一",
         "desc": "由 Python 工作流 dry-run 生成的占位内容。", "bgColor": "#fff", "radius": 12},
        {"type": "card", "x": 620, "y": 240, "width": 540, "height": 220,
         "imageSrc": "https://picsum.photos/seed/demo2/600/400", "title": "卡片二",
         "desc": "运行真实命令时会替换为 AI 内容。", "bgColor": "#fff", "radius": 12},
        {"type": "image", "x": 40, "y": 500, "width": 1120, "height": 280,
         "src": "https://picsum.photos/seed/banner/1200/400", "alt": "Banner"},
    ]


def safe_filename(name: str, fallback: str = "page") -> str:
    """把 prompt 首段转成可用的文件名片段。"""
    cleaned = re.sub(r"[\\/:*?\"<>|\s]+", "_", name).strip("_")
    return cleaned[:32] or fallback
