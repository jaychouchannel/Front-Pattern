#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""单 prompt 生成 CLI：调 AI -> normalize -> 输出 .json + .html。

用法:
  # 调真实 API
  python scripts/generate.py --prompt "咖啡店首页" --provider deepseek --api-key sk-xxx

  # dry-run（本地 mock，不联网）
  python scripts/generate.py --prompt "咖啡店首页" --dry-run

  # 指定输出路径前缀
  python scripts/generate.py --prompt "XX" --dry-run -o output/my_page
"""

from __future__ import annotations

import argparse
import os
import sys

# Windows 终端默认编码常是 CP936，输出中文到 stdout/stderr 会触发 UnicodeEncodeError。
# 强制 UTF-8，让 print 中文不崩。
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except (ValueError, TypeError):
            pass

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _THIS_DIR)

from ai_client import (
    ProviderConfig,
    AIGeneratorError,
    call_ai_generator,
    fake_call_ai_generator,
    load_dotenv,
    safe_filename,
)
from normalize import normalize_elements
from html_export import write_html_file, write_json_file

# 启动时自动加载项目根目录下的 .env（若存在），不覆盖已存在的环境变量。
load_dotenv()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="AI 页面生成器 — 单 prompt -> .json + .html",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--prompt", "-p", required=True, help="页面描述")
    parser.add_argument("--provider", default="deepseek",
                        choices=["deepseek", "openai"], help="AI 服务商")
    parser.add_argument("--api-key", default=None,
                        help="API key（也可用环境变量 DEEPSEEK_API_KEY / OPENAI_API_KEY）")
    parser.add_argument("--model", default=None, help="覆盖默认模型")
    parser.add_argument("--base-url", default=None, help="覆盖默认 API base URL")
    parser.add_argument("--output", "-o", default=None,
                        help="输出文件前缀（不含扩展名）。默认 output/<safe_filename>")
    parser.add_argument("--out-dir", default="output", help="输出根目录")
    parser.add_argument("--name", default=None, help="页面名（不传用 prompt 派生）")
    parser.add_argument("--dry-run", action="store_true",
                        help="使用本地 mock，不调真实 API")
    parser.add_argument("--temperature", type=float, default=0.7, help="采样温度")
    parser.add_argument("--html-only", action="store_true",
                        help="只输出 HTML，不写 JSON")
    parser.add_argument("--json-only", action="store_true",
                        help="只输出 JSON，不写 HTML")
    return parser.parse_args(argv)


def _resolve_api_key(args: argparse.Namespace) -> str:
    if args.api_key:
        return args.api_key
    env_key = "DEEPSEEK_API_KEY" if args.provider == "deepseek" else "OPENAI_API_KEY"
    val = os.environ.get(env_key, "").strip()
    if val:
        return val
    if not args.dry_run:
        sys.exit(f"未提供 API key。请传 --api-key 或设置环境变量 {env_key}")
    return ""


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    api_key = _resolve_api_key(args)
    cfg = (ProviderConfig.from_name(args.provider, api_key,
                                    model=args.model, base_url=args.base_url)
           if not args.dry_run else None)

    name = args.name or args.prompt[:24] or "AI 生成页"
    out_prefix = args.output or os.path.join(args.out_dir, safe_filename(args.prompt))
    out_dir = os.path.dirname(out_prefix) or "."
    os.makedirs(out_dir, exist_ok=True)

    print(f"[1/3] {'dry-run' if args.dry_run else cfg.model} 正在生成: {name}")
    try:
        if args.dry_run:
            raw_elements = fake_call_ai_generator(args.prompt, cfg)
        else:
            raw_elements = call_ai_generator(args.prompt, cfg,
                                             temperature=args.temperature)
    except AIGeneratorError as e:
        print(f"[ERROR] 生成失败: {e}", file=sys.stderr)
        return 1

    print(f"[2/3] normalize 后 {len(raw_elements)} 个原始元素")
    elements = normalize_elements(raw_elements)
    if not elements:
        print("[ERROR] AI 未返回有效元素", file=sys.stderr)
        return 1

    json_path = out_prefix + ".json"
    html_path = out_prefix + ".html"
    if not args.html_only:
        write_json_file(json_path, elements, page_name=name,
                        extra={"_prompt": args.prompt, "_provider": args.provider})
        print(f"  -> {json_path}")
    if not args.json_only:
        write_html_file(html_path, elements, page_name=name)
        print(f"  -> {html_path}")

    print(f"[3/3] 完成：{len(elements)} 个模块")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
