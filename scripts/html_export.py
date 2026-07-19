# -*- coding: utf-8 -*-
"""把 elements 数组渲染成独立可部署的 HTML 文件。

严格复刻前端 app.js 的 exportHTML (line 1406) + exportElementHTML (line 1515)，
输出的 HTML 与编辑器「导出」按钮产物完全一致。
"""

from __future__ import annotations

import html
import json
import re
from typing import Any


_ALIGN_VALUES = frozenset({"left", "center", "right", "justify"})
_OBJECT_FIT_VALUES = frozenset({"cover", "contain", "fill", "none", "scale-down"})
# 颜色：#rgb / #rrggbb / #rrggbbaa / 命名色 / rgb()/rgba() 仅允许安全字符
_COLOR_RE = re.compile(r"^[#a-zA-Z0-9(),\s.]+$")
_NAMED_OR_HEX_RE = re.compile(r"^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([^;{}<>]*\))$")
# URL 协议白名单：防止 javascript:/data: 等
_URL_RE = re.compile(r"^(https?:|//|/|\.+/|mailto:|tel:|data:image/)", re.IGNORECASE)


def _safe_number(val: Any, default: float, *, lo: float = 0, hi: float | None = None) -> float:
    """数字字段最后一道防线：转 float，NaN/非法值回落 default，再 clamp 到 [lo, hi]。

    normalize.py 已经对主坐标字段 clamp 过，但 export_element_html 内还有
    fontSize/padding/radius 等字段直接拼到 CSS。若上游跳过 normalize
    或字段不在 normalize 白名单内（例如未来新增），这里仍能挡住
    `font-size: NaNpx` / `font-size: 1e20px` 之类的输出。
    """
    try:
        n = float(val)
    except (TypeError, ValueError):
        return default
    if n != n or n in (float("inf"), float("-inf")):  # NaN / inf
        return default
    if n < lo:
        return lo
    if hi is not None and n > hi:
        return hi
    return n


def _num_px(val: Any, default: float, *, lo: float = 0, hi: float | None = None) -> str:
    """把数字字段格式化成 Npx 字符串（整数无小数尾巴，浮点保留必要精度）。"""
    n = _safe_number(val, default, lo=lo, hi=hi)
    if n == int(n):
        return f"{int(n)}px"
    return f"{n:g}px"


def _esc_attr(s: Any) -> str:
    """转义属性值里的特殊字符，防止 attribute 注入。"""
    if s is None:
        return ""
    return html.escape(str(s), quote=True)


def _esc_text(s: Any) -> str:
    """转义纯文本节点里的特殊字符。content 字段允许简单 HTML，不走这里。"""
    if s is None:
        return ""
    return html.escape(str(s), quote=True)


def _safe_enum(val: Any, allowed: frozenset[str], default: str) -> str:
    """枚举白名单校验，非法值回退到默认。"""
    if val is None:
        return default
    s = str(val).strip().lower()
    return s if s in allowed else default


def _safe_color(val: Any, default: str) -> str:
    """颜色字段白名单校验：拒绝含 ; {} <> 等可破坏 CSS 的字符。"""
    if val is None:
        return default
    s = str(val).strip()
    if not s or not _NAMED_OR_HEX_RE.match(s):
        return default
    # 兜底：若混入 ;{} 之类字符仍拒绝
    if not _COLOR_RE.match(s):
        return default
    return s


def _safe_url(val: Any) -> str:
    """URL 协议白名单。非法协议回退到空字符串（让上游走 placeholder 逻辑）。"""
    if val is None:
        return ""
    s = str(val).strip()
    if not s:
        return ""
    if _URL_RE.match(s):
        return s
    return ""


_ALLOWED_TAGS = frozenset({"h1", "h2", "h3", "h4", "p", "strong", "em", "b", "i",
                           "br", "ul", "ol", "li", "span", "a"})
_TAG_RE = re.compile(r"</?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>")
_ATTR_RE = re.compile(r"\s([a-zA-Z-]+)\s*=\s*([\"\']).*?\2")


def _sanitize_html(s: str) -> str:
    """极简 HTML 白名单：保留 system prompt 允许的简单 tag，剥掉属性和未知 tag。

    与 system prompt 给 LLM 的承诺一致：content 支持 <h1>/<p>/<strong> 等简单 HTML。
    其他 tag（如 <script>、<iframe>、<img onerror=...>）以及所有属性都丢弃。
    """
    if not s:
        return ""

    def _replace(m: re.Match) -> str:
        tag = m.group(1).lower()
        whole = m.group(0)
        if tag not in _ALLOWED_TAGS:
            return ""
        # 闭合标签 </tag> 先处理（不带属性）
        if whole.startswith("</"):
            return f"</{tag}>"
        # 自闭合 <br> / <br/>
        if tag == "br":
            return "<br>"
        # <a> 例外：保留 href
        if tag == "a":
            attrs = re.search(r"href\s*=\s*([\"\'])(.*?)\1", whole)
            href = attrs.group(2) if attrs else ""
            if not _URL_RE.match(href):
                return ""
            return f'<a href="{html.escape(href, quote=True)}">'
        # 其他 tag：剥光所有属性
        return f"<{tag}>"

    return _TAG_RE.sub(_replace, s)


def export_element_html(el: dict) -> str:
    """与 app.js exportElementHTML 对齐。"""
    el_type = el.get("type")
    if el_type == "text":
        padding = _num_px(el.get("padding", 12), 12, lo=0, hi=200)
        text_align = _safe_enum(el.get("textAlign"), _ALIGN_VALUES, "left")
        font_size = _num_px(el.get("fontSize", 15), 15, lo=1, hi=400)
        color = _safe_color(el.get("color"), "#1f2937")
        content = _sanitize_html(el.get("content", ""))
        return (
            f'<div class="el-text" style="padding:{padding};text-align:{text_align};'
            f'font-size:{font_size};color:{color}">{content}</div>'
        )

    if el_type == "image":
        src = _safe_url(el.get("src", ""))
        alt = el.get("alt", "")
        object_fit = _safe_enum(el.get("objectFit"), _OBJECT_FIT_VALUES, "cover")
        if not src:
            return '<div class="el-image"></div>'
        return (
            f'<div class="el-image"><img src="{_esc_attr(src)}" alt="{_esc_attr(alt)}" '
            f'style="object-fit:{object_fit}"></div>'
        )

    if el_type == "video":
        src = _safe_url(el.get("src", ""))
        if not src:
            return ""
        is_embed = ("youtube" in src) or ("bilibili" in src)
        if is_embed:
            return f'<div class="el-video"><iframe src="{_esc_attr(src)}" allowfullscreen></iframe></div>'
        return f'<div class="el-video"><video src="{_esc_attr(src)}" controls></video></div>'

    if el_type == "button":
        text = _esc_text(el.get("text", "按钮"))
        bg = _safe_color(el.get("bgColor"), "#3b82f6")
        color = _safe_color(el.get("textColor"), "#fff")
        font_size = _num_px(el.get("fontSize", 15), 15, lo=1, hi=400)
        radius = _num_px(el.get("radius", 8), 8, lo=0, hi=400)
        bold = "font-weight:600;" if el.get("bold") else ""
        link = el.get("link") or {}
        attr = ""
        if link.get("type") == "page":
            attr = f' data-link-page="{_esc_attr(link.get("target"))}"'
        elif link.get("type") == "url":
            attr = f' data-link-url="{_esc_attr(link.get("target"))}"'
        return (
            f'<div class="el-button"><button style="background:{bg};color:{color};'
            f'font-size:{font_size};border-radius:{radius};{bold}"{attr}>'
            f'{text}</button></div>'
        )

    if el_type == "card":
        image_src = _safe_url(el.get("imageSrc"))
        bg = _safe_color(el.get("bgColor"), "#fff")
        radius = _num_px(el.get("radius", 8), 8, lo=0, hi=400)
        img_html = (
            f'<img src="{_esc_attr(image_src)}">' if image_src else "🖼"
        )
        title = _esc_text(el.get("title", "标题"))
        desc = _esc_text(el.get("desc", ""))
        return (
            f'<div class="el-card" style="background:{bg};border-radius:{radius}">'
            f'<div class="card-img">{img_html}</div>'
            f'<div class="card-body"><div class="card-title">{title}</div>'
            f'<div class="card-desc">{desc}</div></div></div>'
        )

    return ""


_STYLE_CSS = """  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .pb-stage { position: relative; width: 1200px; margin: 0 auto; min-height: 100vh; background: #fff; }
  .pb-page { position: relative; width: 100%; min-height: 100vh; }
  /* 响应式：根据视口缩放 */
  @media (max-width: 1240px) { .pb-stage { transform-origin: top center; } }
  .el-text { padding: 12px 16px; font-size: 15px; color: #1f2937; line-height: 1.6; word-break: break-word; }
  .el-text h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .el-text h2 { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
  .el-text p { margin-bottom: 6px; }
  .el-image { width: 100%; height: 100%; display: flex; }
  .el-image img { width: 100%; height: 100%; object-fit: cover; }
  .el-video { width: 100%; height: 100%; background: #111; }
  .el-video video, .el-video iframe { width: 100%; height: 100%; border: none; }
  .el-button { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  .el-button button { padding: 10px 28px; border: none; cursor: pointer; transition: all .15s; }
  .el-button button:hover { filter: brightness(1.08); }
  .el-card { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
  .el-card .card-img { height: 55%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 24px; }
  .el-card .card-img img { width: 100%; height: 100%; object-fit: cover; }
  .el-card .card-body { padding: 12px 14px; flex: 1; }
  .el-card .card-title { font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1f2937; }
  .el-card .card-desc { font-size: 12px; color: #6b7280; line-height: 1.4; }
  /* 响应式：手机端缩小画布以适应屏幕 */
  @media (max-width: 768px) { .pb-stage { width: 100vw; transform: scale(1); } }"""

_SCRIPT_JS = """  // 简单的页面切换：监听 hash 变化
  function showPage() {
    var hash = location.hash.replace("#","");
    var pages = document.querySelectorAll(".pb-page");
    if (!hash) { pages[0].style.display = ""; return; }
    pages.forEach(function(p) {
      p.style.display = (p.dataset.pageId === hash) ? "" : "none";
    });
  }
  // 按钮点击跳转
  document.addEventListener("click", function(e) {
    var b = e.target.closest("button[data-link-page], button[data-link-url]");
    if (!b) return;
    e.preventDefault();
    var pageId = b.getAttribute("data-link-page");
    var url = b.getAttribute("data-link-url");
    if (pageId) { location.hash = pageId; showPage(); window.scrollTo(0,0); }
    else if (url) { window.open(url, "_blank"); }
  });
  // 响应式：根据屏幕宽度自适应缩放
  function fitStage() {
    var stage = document.getElementById("pb-stage");
    var vw = window.innerWidth;
    if (vw < 1240) {
      var scale = vw / 1240;
      stage.style.transform = "scale(" + scale + ")";
      stage.style.transformOrigin = "top left";
      stage.style.marginLeft = "0";
      document.body.style.height = (stage.offsetHeight * scale) + "px";
    } else {
      stage.style.transform = "none";
      document.body.style.height = "auto";
    }
  }
  window.addEventListener("resize", fitStage);
  window.addEventListener("load", function() { fitStage(); showPage(); });"""


def _render_page_els(elements: list[dict]) -> str:
    """渲染页面内所有元素（按 zIndex 升序输出）。"""
    sorted_els = sorted(elements, key=lambda e: e.get("zIndex", 0))
    lines: list[str] = []
    for el in sorted_els:
        style = "position:absolute;"
        style += f"left:{_num_px(el.get('x', 0), 0)};"
        style += f"top:{_num_px(el.get('y', 0), 0)};"
        style += f"width:{_num_px(el.get('width', 0), 0, lo=1, hi=1200)};"
        style += f"height:{_num_px(el.get('height', 0), 0, lo=1, hi=2000)};"
        style += f"z-index:{el.get('zIndex', 0)};"
        bg = el.get("bgColor")
        if bg:
            safe_bg = _safe_color(bg, "")
            if safe_bg:
                style += f"background:{safe_bg};"
        if el.get("radius"):
            style += f"border-radius:{_num_px(el['radius'], 8, lo=0, hi=400)};"
        inner = export_element_html(el)
        lines.append(f'      <div style="{style}">{inner}</div>')
    return "\n".join(lines)


def export_html(pages: list[dict[str, Any]], *, current_page_id: str | None = None) -> str:
    """与 app.js exportHTML 完全一致。

    pages: [{"id": "page_1", "name": "首页", "elements": [...]}]
    current_page_id: 切换页面时控制初始可见性（与前端 currentPageId 等价）
    """
    pages_html_parts: list[str] = []
    for page in pages:
        els_html = _render_page_els(page.get("elements", []))
        hidden_style = "" if page["id"] == current_page_id else ' style="display:none"'
        pages_html_parts.append(
            f'    <div class="pb-page" data-page-id="{_esc_attr(page["id"])}"{hidden_style}">\n'
            f'      {els_html}\n'
            f'    </div>'
        )
    pages_html = "\n".join(pages_html_parts)

    return (
        "<!DOCTYPE html>\n"
        '<html lang="zh-CN">\n'
        "<head>\n"
        '<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        f'<title>{_esc_text(pages[0].get("name", "导出页面")) if pages else "导出页面"}</title>\n'
        "<style>\n"
        f"{_STYLE_CSS}\n"
        "</style>\n"
        "</head>\n"
        "<body>\n"
        '  <div class="pb-stage" id="pb-stage">\n'
        f"{pages_html}\n"
        "  </div>\n"
        "<script>\n"
        f"{_SCRIPT_JS}\n"
        "</script>\n"
        "</body>\n"
        "</html>"
    )


def export_single_page(elements: list[dict], page_name: str = "导出页面") -> str:
    """单页便捷封装：把单组 elements 包成一个 page 输出。"""
    page = {"id": "page_1", "name": page_name, "elements": elements}
    return export_html([page], current_page_id="page_1")


def write_html_file(path: str, elements: list[dict], page_name: str = "导出页面") -> None:
    """生成 HTML 并落到指定路径。"""
    content = export_single_page(elements, page_name=page_name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def write_json_file(path: str, elements: list[dict], *, page_name: str = "导出页面",
                    extra: dict | None = None) -> None:
    """同时写一份 JSON 元数据，便于后续再加工或导入编辑器。"""
    payload = {
        "pages": [{"id": "page_1", "name": page_name, "elements": elements}],
        "currentPageId": "page_1",
    }
    if extra:
        payload.update(extra)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
