# -*- coding: utf-8 -*-
"""把 elements 数组渲染成独立可部署的 HTML 文件。

严格复刻前端 app.js 的 exportHTML (line 1406) + exportElementHTML (line 1515)，
输出的 HTML 与编辑器「导出」按钮产物完全一致。
"""

from __future__ import annotations

import html
import json
from typing import Any


def _esc_attr(s: Any) -> str:
    """转义属性值里的双引号和 &，防止 attribute 注入。"""
    if s is None:
        return ""
    return (str(s)
            .replace("&", "&")
            .replace('"', "&quot;"))


def _esc_text(s: Any) -> str:
    """转义纯文本节点里的特殊字符。content 字段允许简单 HTML，不走这里。"""
    if s is None:
        return ""
    return html.escape(str(s), quote=True)


def export_element_html(el: dict) -> str:
    """与 app.js exportElementHTML 对齐。"""
    el_type = el.get("type")
    if el_type == "text":
        padding = el.get("padding", 12)
        text_align = el.get("textAlign", "left")
        font_size = el.get("fontSize", 15)
        color = el.get("color", "#1f2937")
        content = el.get("content", "")
        return (
            f'<div class="el-text" style="padding:{padding}px;text-align:{text_align};'
            f'font-size:{font_size}px;color:{color}">{content}</div>'
        )

    if el_type == "image":
        src = el.get("src", "")
        alt = el.get("alt", "")
        object_fit = el.get("objectFit", "cover")
        return (
            f'<div class="el-image"><img src="{_esc_attr(src)}" alt="{_esc_attr(alt)}" '
            f'style="object-fit:{object_fit}"></div>'
        )

    if el_type == "video":
        src = el.get("src", "")
        if not src:
            return ""
        is_embed = ("youtube" in src) or ("bilibili" in src)
        if is_embed:
            return f'<div class="el-video"><iframe src="{_esc_attr(src)}" allowfullscreen></iframe></div>'
        return f'<div class="el-video"><video src="{_esc_attr(src)}" controls></video></div>'

    if el_type == "button":
        text = el.get("text", "按钮")
        bg = el.get("bgColor", "#3b82f6")
        color = el.get("textColor", "#fff")
        font_size = el.get("fontSize", 15)
        radius = el.get("radius", 8)
        bold = "font-weight:600;" if el.get("bold") else ""
        link = el.get("link") or {}
        attr = ""
        if link.get("type") == "page":
            attr = f' data-link-page="{_esc_attr(link.get("target"))}"'
        elif link.get("type") == "url":
            attr = f' data-link-url="{_esc_attr(link.get("target"))}"'
        return (
            f'<div class="el-button"><button style="background:{bg};color:{color};'
            f'font-size:{font_size}px;border-radius:{radius}px;{bold}"{attr}>'
            f'{text}</button></div>'
        )

    if el_type == "card":
        image_src = el.get("imageSrc")
        bg = el.get("bgColor", "#fff")
        radius = el.get("radius", 8)
        img_html = (
            f'<img src="{_esc_attr(image_src)}">' if image_src else "🖼"
        )
        return (
            f'<div class="el-card" style="background:{bg};border-radius:{radius}px">'
            f'<div class="card-img">{img_html}</div>'
            f'<div class="card-body"><div class="card-title">{el.get("title", "标题")}</div>'
            f'<div class="card-desc">{el.get("desc", "")}</div></div></div>'
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
        style = (
            "position:absolute;"
            f"left:{el.get('x', 0)}px;top:{el.get('y', 0)}px;"
            f"width:{el.get('width', 0)}px;height:{el.get('height', 0)}px;"
            f"z-index:{el.get('zIndex', 0)};"
        )
        if el.get("bgColor"):
            style += f"background:{el['bgColor']};"
        if el.get("radius"):
            style += f"border-radius:{el['radius']}px;"
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
