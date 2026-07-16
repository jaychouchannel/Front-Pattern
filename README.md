# 🧩 Puzzle Builder · 可视化拼图低代码编辑器

> 零依赖、零后端、打开即用的网页可视化搭建工具。拖拽矩形即可创建组件，所见即所得编辑，一键导出可独立部署的 HTML。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/jaychouchannel/Front-Pattern/pulls)
[![Made with Vanilla JS](https://img.shields.io/badge/Made%20with-Vanilla%20JS-f7df1e.svg)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)
[![No Build](https://img.shields.io/badge/No%20Build-✓-success.svg)](#)


- 🎨 **拖拽即设计**：在画布上拖拽矩形即可弹出组件选择器，自动填充模板
- 📦 **5 种基础组件**：文本、图片、视频、按钮、卡片
- 🗂️ **多页面管理**：新建/重命名/删除多个页面，按钮可绑定页面跳转
- 🖱️ **所见即所得**：选中后可拖动改位置、八向手柄调整大小
- 🧰 **多选与批量**：Shift+点击 / Shift+拖拽框选多个模块，一键对齐 / 调整层级 / 批量删除
- 🔀 **层级控制**：z-index + 置顶/置底/上移/下移，导出时按层级正确渲染
- 📋 **复制粘贴**：Ctrl+C / Ctrl+V / Ctrl+D 克隆，跨页面保留属性
- ↩️ **撤销 / 重做**：支持 Ctrl+Z / Ctrl+Shift+Z，最多 50 步历史
- 👁️ **预览模式**：隐藏编辑框，按钮跳转可直接体验
- 💾 **本地保存**：项目自动保存到 localStorage，刷新不丢失
- 📤 **导出 HTML**：一键导出独立可部署的 HTML 文件，包含响应式缩放
- 📐 **辅助网格**：画布 20px 网格 + 5px 吸附，便于对齐
- 🆘 **新手引导**：首次进入显示使用说明
- 📱 **响应式预览**：预览模式可切换 PC / 平板 / 手机宽度



## ✨ 特性概览

| 能力 | 描述 |
|---|---|
| 🎨 拖拽即设计 | 在画布上拖拽矩形 → 弹出组件选择器 → 自动填充默认模板 |
| 📦 5 类基础组件 | 文本 · 图片 · 视频 · 按钮 · 卡片 |
| 🗂️ 多页面管理 | 新建 / 重命名 / 删除 / 切换；按钮可绑定页面间跳转 |
| 🖱️ 所见即所得 | 选中组件后可拖动改位置，八方向手柄调整尺寸 |
| ↩️ 撤销 / 重做 | `Ctrl+Z` / `Ctrl+Shift+Z`，最多 50 步历史栈 |
| 👁️ 预览模式 | 隐藏编辑框，按钮跳转可直接体验；支持 PC / 平板 / 手机宽度切换 |
| 💾 本地保存 | 项目自动持久化到 `localStorage`，刷新不丢失 |
| 📤 一键导出 | 导出独立可部署的 HTML 文件，包含 hash 路由 + 响应式缩放 |
| 📐 辅助网格 | 20px 网格 + 5px 吸附，便于对齐定位 |
| 🆘 新手引导 | 首次进入自动弹出使用说明 |
| 🪶 零依赖 | 不依赖 React / Vue / jQuery，无需打包，原样部署即可 |

---

## 🚀 60 秒上手

```bash
# 方式一：直接克隆
git clone git@github.com:jaychouchannel/Front-Pattern.git
cd Front-Pattern
# 双击 index.html 用浏览器打开即可

# 方式二：本地静态服务器（推荐）
npx serve .             # 或 python -m http.server 8080
# 浏览器访问 http://localhost:8080
```

> 推荐浏览器：最新版 Chrome / Edge / Firefox。无需任何构建步骤。

**构建首个页面**：
1. 在中间画布按下鼠标，拖出一个矩形 → 松开 → 选择"按钮"
2. 点击选中按钮，在右侧属性面板修改文字为"开始体验"
3. 点击左侧"+ 新建页面"，命名为 `welcome`
4. 回到首页，选中按钮，"跳转目标"选择"跳转到页面 → welcome"
5. 点顶部"预览"按钮，点击按钮即可体验跳转
6. 点"导出 HTML"下载独立文件，可直接部署到任意静态托管

---

## 🎯 适用场景

- **零基础用户**：不写代码也能搭出可工作的网页
- **运营 / 市场**：快速制作活动落地页、产品介绍页
- **教学场景**：演示 DOM 操作、状态管理、WYSIWYG 编辑器原理
- **原型设计**：在数分钟内把想法变成可点击的高保真原型
- **个人作品集**：快速搭建项目展示页并导出独立 HTML 部署

---

## 🧱 组件参考

### 文本 `text`
| 属性 | 说明 |
|---|---|
| `content` | 文本内容，支持简单 HTML 标签（h1/h2/p/strong/em 等） |
| `bgColor` | 背景色 |
| `color` | 文字颜色 |
| `fontSize` | 字体大小 (px) |
| `textAlign` | 对齐方式：`left` / `center` / `right` |
| `padding` | 内边距 (px) |

### 图片 `image`
| 属性 | 说明 |
|---|---|
| `src` | 图片 URL（默认从 picsum 取示例图） |
| `alt` | 替代文本 |
| `radius` | 圆角 (px) |
| `objectFit` | 适配方式：`cover`（填充裁剪）/ `contain`（完整显示）/ `fill`（拉伸） |

### 视频 `video`
| 属性 | 说明 |
|---|---|
| `src` | `.mp4` 文件 URL，或 YouTube / B 站 embed URL |
| `placeholder` | 占位提示文本（未填 URL 时显示） |

**支持的 URL 格式**：
- 直链 MP4：`https://example.com/video.mp4`
- YouTube：`https://www.youtube.com/embed/VIDEO_ID`
- B 站：`//player.bilibili.com/player.html?bvid=BVxxxxx`

### 按钮 `button`
| 属性 | 说明 |
|---|---|
| `text` | 按钮文字 |
| `bgColor` / `textColor` | 背景色 / 文字颜色 |
| `fontSize` / `radius` / `bold` | 字体大小 / 圆角 / 是否加粗 |
| `link` | 跳转目标，结构：`{type: 'page' \| 'url', target: pageId \| url}` |

跳转目标三选一：
- `null`：不跳转
- `{type: 'page', target: 'page_2'}`：跳转到同项目内其他页面
- `{type: 'url', target: 'https://...'}`：外部链接（新窗口打开）

### 卡片 `card`
| 属性 | 说明 |
|---|---|
| `imageSrc` | 顶部图片 URL |
| `title` | 卡片标题 |
| `desc` | 卡片描述 |
| `bgColor` / `radius` | 背景色 / 圆角 |

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|---|---|
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z 或 Ctrl+Y | 重做 |
| Ctrl+S | 保存项目到本地 |
| Ctrl+C | 复制选中模块 |
| Ctrl+V | 粘贴 |
| Ctrl+D | 克隆选中模块 |
| Ctrl+A | 全选当前页模块 |
| Delete / Backspace | 删除选中模块 |
| ← ↑ → ↓ | 微调位置（1px） |
| Shift + ← ↑ → ↓ | 大步移动（10px） |
| Shift + 点击 | 多选 / 切换选中 |
| Shift + 拖拽框选 | 区域多选 |
| Esc | 取消选中 |
=======
| `Ctrl+Z` | 撤销 |
| `Ctrl+Shift+Z` 或 `Ctrl+Y` | 重做 |
| `Ctrl+S` | 保存到 localStorage |
| `Delete` / `Backspace` | 删除选中组件 |
| `Esc` | 取消选中 |


> 在输入框 / 文本域中编辑时，快捷键自动放行不影响编辑。

---

## 📁 项目结构

```
Front-Pattern/
├── index.html      # 主页面，三栏布局 + 弹窗 + 帮助层
├── styles.css      # 编辑器外观 + 画布组件样式
├── app.js          # 应用逻辑：状态管理 / 渲染 / 交互 / 导出 / 持久化
└── README.md       # 本说明
```

无 `package.json`、无 `node_modules`、无构建脚本。三文件即全部源码。

---

## 🏗️ 架构与代码组织

整体采用**单文件 + 函数分组**的纯 JS 架构，易于阅读、修改、教学。

### 状态模型

```js
state = {
  pages: {                      // 多页面字典
    page_1: { id, name, elements: [...] },
    page_2: { ... }
  },
  currentPageId: 'page_1',
  selectedElementId: null,
  history: { past: [], future: [] }   // 撤销/重做栈（快照式）
}
```

每个 `element` 是自描述的对象：`{id, type, x, y, width, height, ...props}`。

### app.js 的 17 个章节

| § | 职责 | 关键函数 |
|---|---|---|
| 1 | 数据模型 | `createDefaultState`, `uid` |
| 2 | 辅助函数 | `clone`, `currentPage`, `selectedElement`, `showToast` |
| 3 | 历史栈 | `pushHistory`, `undo`, `redo` |
| 4 | 组件模板 | `createElement(type, rect)` |
| 5 | 页面列表渲染 | `renderPageList`, `addPage`, `renamePage`, `deletePage` |
| 6 | 画布元素渲染 | `renderElements`, `elementToDiv`, `elementInnerHTML` |
| 7 | 元素交互 | `makeDraggable`, `makeResizable`（八向手柄） |
| 8 | 画布交互 | 框选拖拽创建组件 |
| 9 | 组件选择弹窗 | `openPicker`, `setupPicker` |
| 10 | 左侧模板点击 | 一键添加默认尺寸组件 |
| 11 | 属性面板 | `renderPropertyPanel`, `{type}Props` |
| 12 | 属性输入绑定 | `bindNum/Text/Color/Select`, `bindButtonLink` |
| 13 | 预览模式 | `togglePreview`, 设备宽度切换, 按钮跳转委托 |
| 14 | 导出 HTML | `exportHTML`, `exportElementHTML`, `downloadHTML` |
| 15 | 持久化 | `saveProject`, `loadProject`（localStorage） |
| 16 | 全局渲染入口 | `renderAll` |
| 17 | 初始化 | `init`, `handleKeydown`, 示例数据 |

### 关键设计选择

- **快照式历史栈**：每次操作前 `pushHistory()` 保存不可变快照，撤销/重做直接整体替换 `state`。比 diff 式更易实现，对小项目足够。
- **事件委托**：预览模式下的按钮跳转通过 `canvas` 上的单一 `click` 监听器统一处理，避免重复绑定。
- **绝对定位 + 网格吸附**：元素以 `position: absolute` 在 1200px 画布上摆放，移动时按 5px 吸附；导出时通过 `transform: scale()` 让画布在小屏幕等比缩小。
- **hash 路由**：多页面导出后通过 `location.hash` 切换，无需服务器配置。

---

## 📤 导出 HTML 说明

点工具栏"导出 HTML"会下载一个完整可独立运行的文件：

- **单文件**：所有 CSS / JS 内联，无外部依赖（视频地址仍指向用户填写的 URL）
- **多页 hash 路由**：`#page_1` / `#page_2` 切换页面，按钮跳转通过修改 `location.hash` 实现
- **响应式缩放**：屏幕宽度 `<1240px` 时按比例缩小整个 1200px 画布以适配视口
- **样式复刻**：导出 HTML 内嵌一份精简 CSS，复刻编辑器中各组件的视觉表现

部署示例：

```bash
# 直接上传到任意静态托管
vercel deploy
netlify deploy
# 或推到 GitHub Pages 分支
```

---

## 💾 本地存储

| Key | 内容 |
|---|---|
| `puzzle_builder_project` | 完整项目数据（pages、currentPageId、保存时间） |

**清空重来**：
```js
// 浏览器控制台执行
localStorage.removeItem('puzzle_builder_project');
location.reload();
```

---

## ⚠️ 已知限制

- 跨域图片需对方服务支持 CORS 或允许外链（picsum 默认可用）
- YouTube / B 站 embed 需使用方提供的 embed URL，不能直接填视频 watch 页地址
- 历史栈为整体快照，复杂场景下撤销可能比预期"粗粒度"
- 移动端编辑体验有限，建议在电脑端使用
- 不支持元素层级（z-index）显式管理与对齐分布工具（见路线图）

---

## 🗺️ 路线图

- [ ] 元素层级（z-index）：上移 / 下移 / 置顶 / 置底
- [ ] 对齐分布工具：左对齐 / 居中 / 等距分布
- [ ] 更多组件：表单、表格、图标、地图、轮播
- [ ] Figma 风格图层树侧边栏
- [ ] 主题色统一管理（design tokens）
- [ ] 导出 React / Vue 组件代码
- [ ] 保存为图片 / 生成可分享链接
- [ ] 撤销栈操作粒度优化（按页面拆分）
- [ ] 国际化 (i18n)

---

## 🤝 贡献

欢迎 Issue 和 PR。

```bash
git clone git@github.com:jaychouchannel/Front-Pattern.git
cd Front-Pattern
git checkout -b feat/your-feature
# 修改 → 提交 → 推送
gh pr create --title "feat: 你的功能" --body "..."
```

提 PR 前请确认：
- [ ] 三文件（`index.html` / `styles.css` / `app.js`）能直接在浏览器打开运行
- [ ] 没有引入任何 npm 依赖或构建步骤
- [ ] 关键逻辑有简短注释（**只解释 why，不解释 what**）

---

## 📄 许可证

[MIT License](LICENSE) © 2026 jaychouchannel

> 本项目可作为代码学习材料、教学示例、二次开发基础使用，但作者不对部署后的产物做任何担保。
