#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批量工作流入口：扫描 prompts/*.txt -> 逐个调 AI -> 校验 -> 输出 .json + .html。

每个 .txt 文件可以:
  - 第一行若以 `--name:` 开头，作为页面名（可选）
  - 其余内容作为 prompt 文本

用法:
  python scripts/run_all.py --dry-run                      # 本地 mock 跑通流程
  python scripts/run_all.py --provider deepseek            # 真实调用，读环境变量拿 key
  python scripts/run_all.py --provider openai --model gpt-4o-mini
  python scripts/run_all.py --reset-output                 # 跑前清空 output/
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import cli_util
cli_util.bootstrap()

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _THIS_DIR)

from ai_client import (
    AI_PROVIDERS,
    ProviderConfig,
    AIResponse,
    AIGeneratorError,
    call_ai_generator,
    fake_call_ai_generator,
    safe_filename,
)
from normalize import normalize_elements
from html_export import write_html_file, write_json_file


# 模型单价（美元 / 1M tokens）——估算成本用，价格可能变动，仅供参考。
# 0 表示未知，会在报表里标为 "-"。
_MODEL_PRICES_PER_1M = {
    "deepseek-chat":   {"input": 0.27, "output": 1.10},
    "deepseek-reasoner": {"input": 0.55, "output": 2.19},
    "gpt-4o-mini":     {"input": 0.15, "output": 0.60},
    "gpt-4o":          {"input": 2.50, "output": 10.00},
    "gpt-4.1-mini":    {"input": 0.40, "output": 1.60},
}
# 未知模型回退价：按输入偏高估一个保守值，避免账单吓一跳
_FALLBACK_PRICE = {"input": 1.00, "output": 3.00}


def _estimate_cost(prompt_tokens: int, completion_tokens: int, model: str) -> tuple[float, bool]:
    """估算美元成本。返回 (cost, known)。known=False 表示价格表没有该模型，用回退价。"""
    price = _MODEL_PRICES_PER_1M.get(model, _FALLBACK_PRICE)
    known = model in _MODEL_PRICES_PER_1M
    cost = (prompt_tokens * price["input"] + completion_tokens * price["output"]) / 1_000_000
    return cost, known


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="批量 AI 页面生成工作流：prompts/*.txt -> output/",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--prompts-dir", default="prompts",
                        help="prompt 文件目录（默认 prompts/）")
    parser.add_argument("--out-dir", default="output", help="输出根目录（默认 output/）")
    parser.add_argument("--provider", default="deepseek",
                        choices=["deepseek", "openai"], help="AI 服务商")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--model", default=None)
    parser.add_argument("--base-url", default=None)
    parser.add_argument("--dry-run", action="store_true", help="使用本地 mock")
    parser.add_argument("--reset-output", action="store_true",
                        help="跑前清空 out-dir 中旧文件")
    parser.add_argument("--temperature", type=float, default=0.7)
    parser.add_argument("--strict", action="store_true",
                        help="任一文件失败即立即终止（默认继续跑剩余的）")
    parser.add_argument("--cost-report", type=str, default=None,
                        metavar="FILE",
                        help="将 token/cost 统计写入 JSON 文件")
    parser.add_argument("--html-only", action="store_true")
    parser.add_argument("--json-only", action="store_true")
    return parser.parse_args(argv)


def _parse_prompt_file(path: Path) -> tuple[str, str]:
    """读 .txt，返回 (name, prompt)。

    支持的元指令（必须在第一行，与 --name 同样格式，按需多行）：
      --name: xxx         页面名（用作输出文件名）
      --min-n: 4           生成元素下界（覆写 system prompt 默认 4）
      --max-n: 8           生成元素上界（覆写 system prompt 默认 8）

    其余行作为 prompt 文本。
    """
    text = path.read_text(encoding="utf-8")
    name = path.stem
    lines = text.splitlines()

    meta: dict[str, str] = {}
    body_start = 0
    for i, line in enumerate(lines):
        s = line.strip()
        if not s.startswith("--"):
            break
        if ":" not in s:
            break
        key, _, val = s.partition(":")
        key = key[2:].strip().lower()  # strip leading "--"
        if key in ("name", "min-n", "max-n"):
            meta[key] = val.strip()
            body_start = i + 1
        else:
            break  # 未知元指令不消费，按正文处理

    name = meta.get("name") or name
    body = "\n".join(lines[body_start:]).strip()

    # 把 min/max-n 转成一句明确指令追加到 prompt 末尾，让 LLM 看见。
    # 这样不依赖 system prompt 改写，对单 prompt 也生效。
    # 用 try/int 而非 str.isdigit()：isdigit() 接受全角/天城文等 Unicode 数字，
    # 但 int() 解析不了，会抛 ValueError 整批崩溃。
    def _safe_int(s: str) -> int | None:
        try:
            return int(s)
        except (ValueError, TypeError):
            return None

    extra_constraints: list[str] = []
    mn = _safe_int(meta.get("min-n", ""))
    if mn is not None:
        extra_constraints.append(f"生成元素数量不得少于 {mn} 个")
    mx = _safe_int(meta.get("max-n", ""))
    if mx is not None:
        extra_constraints.append(f"生成元素数量不得超过 {mx} 个")
    if extra_constraints:
        body = body + "\n\n(" + "；".join(extra_constraints) + "。)"
    return name, body


def _resolve_api_key(args: argparse.Namespace) -> str:
    if args.api_key:
        return args.api_key
    env_key = "DEEPSEEK_API_KEY" if args.provider == "deepseek" else "OPENAI_API_KEY"
    val = os.environ.get(env_key, "").strip()
    if val:
        return val
    if not args.dry_run:
        sys.exit(f"未提供 API key。请传 --api-key 或设置 {env_key}")
    return ""


def _reset_output(out_dir: Path) -> None:
    if out_dir.exists():
        for f in out_dir.iterdir():
            if f.is_file() and f.suffix in (".html", ".json"):
                f.unlink()
    out_dir.mkdir(parents=True, exist_ok=True)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    api_key = _resolve_api_key(args)

    prompts_dir = Path(args.prompts_dir)
    if not prompts_dir.exists():
        print(f"[ERROR] prompts 目录不存在: {prompts_dir}", file=sys.stderr)
        return 1

    prompt_files = sorted(prompts_dir.glob("*.txt"))
    if not prompt_files:
        print(f"[WARN] prompts/ 下没有 .txt 文件，按需新建。示例见 prompts/example.txt")
        return 0

    out_dir = Path(args.out_dir)
    if args.reset_output:
        _reset_output(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    cfg = (ProviderConfig.from_name(args.provider, api_key,
                                    model=args.model, base_url=args.base_url)
           if not args.dry_run else None)
    model_label = cfg.model if cfg else (args.model or AI_PROVIDERS[args.provider]["model"])

    print(f"==== AI 批量工作流 ====")
    print(f"  provider : {args.provider}"
          f" (model={model_label})"
          f"{' [dry-run]' if args.dry_run else ''}")
    print(f"  prompts  : {prompts_dir} ({len(prompt_files)} 个文件)")
    print(f"  output   : {out_dir}")
    print()

    succ = fail = 0
    total_prompt_tokens = 0
    total_completion_tokens = 0
    total_cost = 0.0
    cost_known = True
    file_reports: list[dict] = []
    for i, txt_path in enumerate(prompt_files, 1):
        name, prompt = _parse_prompt_file(txt_path)
        print(f"[{i}/{len(prompt_files)}] {txt_path.name} -> {safe_filename(name)}")
        if not prompt:
            print("  [WARN] 文本为空，跳过")
            continue

        try:
            if args.dry_run:
                resp = fake_call_ai_generator(prompt, cfg)
            else:
                resp = call_ai_generator(prompt, cfg, temperature=args.temperature)
            if not isinstance(resp, AIResponse):
                # 兼容旧版返回 list[dict] 的情况
                raw = resp
                resp = AIResponse(elements=raw, prompt_tokens=0, completion_tokens=0, total_tokens=0)
            elements = normalize_elements(resp.elements)
            if not elements:
                raise AIGeneratorError("normalize 后无有效元素")
        except AIGeneratorError as e:
            print(f"  [FAIL] {e}")
            fail += 1
            if args.strict:
                return 1
            continue

        # 累计 token / 成本
        pp = resp.prompt_tokens
        cc = resp.completion_tokens
        total_prompt_tokens += pp
        total_completion_tokens += cc
        cost, known = _estimate_cost(pp, cc, model_label)
        total_cost += cost
        if not known:
            cost_known = False
        file_reports.append({
            "file": txt_path.name,
            "page": name,
            "prompt_tokens": pp,
            "completion_tokens": cc,
            "total_tokens": pp + cc,
            "cost_usd": round(cost, 6),
        })

        prefix = out_dir / safe_filename(name)
        json_path = str(prefix) + ".json"
        html_path = str(prefix) + ".html"
        if not args.html_only:
            write_json_file(json_path, elements, page_name=name,
                            extra={"_prompt": prompt, "_provider": args.provider})
            print(f"  -> {json_path}")
        if not args.json_only:
            write_html_file(html_path, elements, page_name=name)
            print(f"  -> {html_path}")
        succ += 1

    print()
    print(f"==== 完成：成功 {succ}，失败 {fail} ====")
    if total_prompt_tokens or total_completion_tokens:
        print(f"  Token 统计：prompt {total_prompt_tokens:,} / completion {total_completion_tokens:,} / total {total_prompt_tokens + total_completion_tokens:,}")
        label = f"  估算成本：${total_cost:.4f} USD（{model_label}）"
        if not cost_known:
            label += "（价格表未覆盖该模型，按回退价估算，仅供参考）"
        print(label)
    if args.cost_report and file_reports:
        import json as _json
        report = {
            "provider": args.provider,
            "model": model_label,
            "files": file_reports,
            "total_prompt_tokens": total_prompt_tokens,
            "total_completion_tokens": total_completion_tokens,
            "total_tokens": total_prompt_tokens + total_completion_tokens,
            "total_cost_usd": round(total_cost, 6),
            "price_per_1M_known": cost_known,
        }
        Path(args.cost_report).write_text(
            _json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"  成本报表已写入：{args.cost_report}")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
