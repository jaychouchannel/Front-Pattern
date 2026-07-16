# scripts/ — Python AI 批量生成工作流

为 [可视化拼图编辑器](../README.md) 配套的命令行工具：**复用项目里的 AI 生成能力**，但脱离浏览器，
在终端里**批量**根据 prompt 文件生成可部署的 HTML 页面。

与编辑器侧的 `app.js` AI 模块完全对齐：
- 同样的 `AI_SYSTEM_PROMPT`（`ai_client.py`）
- 同样的 `normalizeAIElements` 元素校验/clamp 逻辑（`normalize.py`）
- 同样的 `exportHTML` 输出格式（`html_export.py`）

> 零第三方依赖。仅用 Python 标准库，开箱即用。Python ≥ 3.10。

---

## 目录结构

```
front-pattern/
├── scripts/
│   ├── ai_client.py        DeepSeek / OpenAI 调用 + system prompt + dry-run mock
│   ├── normalize.py       复刻前端的元素 normalize 逻辑
│   ├── html_export.py     复刻前端的 exportHTML，输出独立可部署 HTML
│   ├── generate.py        单 prompt 生成 CLI
│   └── run_all.py         批量工作流入口
├── prompts/               输入：放 *.txt prompt 文件（已带 3 个示例）
├── output/                输出：生成的 .json + .html（git 跟踪示例，跑产物保留本地）
├── .env.example           API key 配置模板
└── requirements.txt       依赖声明（实际上零依赖）
```

## 快速开始

### 0. 先试 dry-run（无需 API key）

```bash
python scripts/run_all.py --dry-run
```

会在 `output/` 里看到三个示例 prompt 生成的 HTML/JSON：

```
output/咖啡店首页.html     ← 直接双击浏览器打开
output/咖啡店首页.json     ← 结构化数据，可人工再加工
output/个人作品集.html
output/简单落地页.html
...
```

### 1. 配置 API key

复制 `.env.example` 为 `.env` 并填入 key（**别提交 .env**）：

```bash
cp .env.example .env
# 编辑 .env: DEEPSEEK_API_KEY=sk-xxxx
```

或者直接用环境变量 / 命令行参数：

```bash
export DEEPSEEK_API_KEY=sk-xxxx
python scripts/run_all.py --provider deepseek

# 或：python scripts/run_all.py --provider deepseek --api-key sk-xxxx
```

### 2. 跑批量工作流

```bash
python scripts/run_all.py --provider deepseek
```

每个 `prompts/*.txt` 会被处理一次：
- 第一行若以 `--name:` 开头，则作为页面名（也用作输出文件名）
- 其余行作为 prompt
- 失败的文件默认会跳过，汇总后输出报告；加 `--strict` 则首次失败即终止

### 3. 单 prompt 生成

```bash
python scripts/generate.py --prompt "做一个咖啡店首页" \
                            --provider deepseek \
                            -o output/cafe

# -> output/cafe.json + output/cafe.html
```

## 命令参考

### `generate.py` 单 prompt

| 参数 | 默认 | 说明 |
|---|---|---|
| `--prompt / -p` | 必填 | 页面描述 |
| `--provider` | `deepseek` | `deepseek` / `openai` |
| `--api-key` | env | 可不传，从 `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` 读 |
| `--model` | provider 默认 | 覆盖默认模型 |
| `--base-url` | provider 默认 | 接 OpenAI 兼容端点（自建网关、本地 ollama、Cursor 等） |
| `--output / -o` | `output/<safe>` | 输出文件前缀（不含扩展） |
| `--out-dir` | `output` | 输出根目录 |
| `--name` | prompt 派生 | 页面名 |
| `--dry-run` | off | 本地 mock，不联网 |
| `--temperature` | `0.7` | 采样温度 |
| `--html-only` / `--json-only` | off | 只输出其中一种 |

### `run_all.py` 批量

`generate.py` 的所有参数都支持，额外：

| 参数 | 说明 |
|---|---|
| `--prompts-dir` | prompt 文件目录，默认 `prompts/` |
| `--reset-output` | 跑前清空 `output/` 中旧的 `.html` / `.json` |
| `--strict` | 任一文件失败即终止（默认跳过继续） |

## prompt 文件格式

```
--name: 页面名（用作输出文件名）
剩下整段作为 prompt 正文。
可以多行，写越具体效果越好。
```

如果省略 `--name:`，则用文件 stem 作为名字。

## 输出文件

- `<name>.html`：与编辑器「导出」按钮产物**完全一致**，可直接部署
- `<name>.json`：项目数据格式，`{pages: [...], currentPageId, _prompt, _provider}`，
  后续可在编辑器里手动加载再编辑

## 工作流链路图

```
prompts/*.txt ─┐
               ▼
         run_all.py
               │
       ┌───────┴────────┐
       ▼                ▼
  ai_client.py     normalize.py
   (调 API)         (clamp)
       │                │
       └───────┬────────┘
               ▼
        html_export.py
               │
       ┌───────┴───────┐
       ▼               ▼
   output/xx.html  output/xx.json
```

## FAQ

**Q：为什么不直接打开浏览器跑？**
A：浏览器适合单 prompt 交互式尝试；批量（10+ 个 prompt） aparición、CI 集成、
离线脚本化用 Python CLI 更顺手，也避免 API key 留在浏览器 localStorage。

**Q：要不要 `pip install`？**
A：不需要。`requirements.txt` 只是声明，实际跑只用标准库。如果你想要自动加载 `.env` 文件，
可可选安装 `python-dotenv`（脚本本身不强依赖）。

**Q：输出的 HTML 跟编辑器导出的能混用吗？**
A：可以。三者——浏览器实时预览、编辑器导出、Python 脚本生成——输出格式完全相同。
