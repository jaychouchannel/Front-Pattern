/* ========================================================================
   可视化拼图编辑器 - 主应用逻辑
   技术栈：纯 JavaScript，无框架依赖
   功能：页面管理、组件拖放、属性编辑、撤销/重做、导出/保存
   ======================================================================== */

// ==================== 1. 数据模型 & 状态管理 ====================

/** 生成短唯一 ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 默认编辑器状态 */
function createDefaultState() {
  const pageId = 'page_1';
  return {
    pages: {
      [pageId]: { id: pageId, name: '首页', elements: [] }
    },
    currentPageId: pageId,
    selectedElementId: null,
    selectedElementIds: [],
    _clipboard: null,
    history: { past: [], future: [] }
  };
}

// 全局状态
let state = createDefaultState();

// ==================== 2. 辅助函数 ====================

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function currentPage() { return state.pages[state.currentPageId]; }
function currentElements() { return currentPage().elements; }
function selectedElement() {
  const id = state.selectedElementId;
  if (!id) return null;
  return currentElements().find(el => el.id === id) || null;
}

// 选中集合（多选支持）。始终以 selectedElementId 为主，selectedElementIds 为附加集合。
function selectedElements() {
  const ids = effectiveSelectedIds();
  return ids.map(id => currentElements().find(el => el.id === id)).filter(Boolean);
}

function effectiveSelectedIds() {
  const ids = [];
  const set = new Set();
  if (state.selectedElementId) { ids.push(state.selectedElementId); set.add(state.selectedElementId); }
  (state.selectedElementIds || []).forEach(id => {
    if (id && !set.has(id)) { ids.push(id); set.add(id); }
  });
  return ids;
}

function isSelected(id) {
  if (state.selectedElementId === id) return true;
  return (state.selectedElementIds || []).indexOf(id) !== -1;
}

// 统一设置选中（替换）。单选场景使用。
function setSelected(id) {
  state.selectedElementId = id;
  state.selectedElementIds = [];
}

// 切换某 ID 的选中状态（shift-click 多选）
function toggleSelected(id) {
  if (state.selectedElementId === id) {
    state.selectedElementId = null;
    return;
  }
  const arr = state.selectedElementIds || [];
  const idx = arr.indexOf(id);
  if (idx === -1) {
    if (state.selectedElementId) arr.push(state.selectedElementId);
    state.selectedElementId = id;
  } else {
    arr.splice(idx, 1);
    if (arr.length > 0) state.selectedElementId = arr[arr.length - 1];
  }
}

function clearSelection() {
  state.selectedElementId = null;
  state.selectedElementIds = [];
}

function showToast(msg, duration) {
  duration = duration || 2000;
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), duration);
}

// ==================== 3. 历史记录（撤销/重做） ====================

function pushHistory() {
  // 快照保存所有多选相关字段
  const snapshot = {
    pages: clone(state.pages),
    currentPageId: state.currentPageId,
    selectedElementId: state.selectedElementId,
    selectedElementIds: (state.selectedElementIds || []).slice(),
    _clipboard: state._clipboard
  };
  state.history.past.push(snapshot);
  if (state.history.past.length > 50) state.history.past.shift();
  state.history.future = [];
  updateUndoRedoButtons();
}

function restoreSnapshot(snap) {
  state.pages = clone(snap.pages);
  state.currentPageId = snap.currentPageId;
  state.selectedElementId = snap.selectedElementId;
  state.selectedElementIds = (snap.selectedElementIds || []).slice();
  state._clipboard = snap._clipboard;
}

function undo() {
  if (state.history.past.length === 0) return;
  // 当前状态进入 future
  state.history.future.push({
    pages: clone(state.pages),
    currentPageId: state.currentPageId,
    selectedElementId: state.selectedElementId
  });
  const snap = state.history.past.pop();
  restoreSnapshot(snap);
  renderAll();
  updateUndoRedoButtons();
}

function redo() {
  if (state.history.future.length === 0) return;
  state.history.past.push({
    pages: clone(state.pages),
    currentPageId: state.currentPageId,
    selectedElementId: state.selectedElementId
  });
  const snap = state.history.future.pop();
  restoreSnapshot(snap);
  renderAll();
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  document.getElementById('btn-undo').disabled = state.history.past.length === 0;
  document.getElementById('btn-redo').disabled = state.history.future.length === 0;
  document.getElementById('btn-undo').style.opacity = state.history.past.length === 0 ? .4 : 1;
  document.getElementById('btn-redo').style.opacity = state.history.future.length === 0 ? .4 : 1;
}


// ==================== 4. 组件默认模板 ====================

/**
 * 创建指定类型的新组件实例
 * @param {string} type - text/image/video/button/card
 * @param {object} rect - {x, y, width, height}
 */
function createElement(type, rect) {
  const id = uid();
  const base = { id, type, x: rect.x, y: rect.y, width: rect.width, height: rect.height, zIndex: 0 };

  switch (type) {
    case 'text':
      return Object.assign(base, {
        content: '<h1>标题文本</h1><p>这是一段示例文本，可在右侧属性面板修改内容。</p>',
        bgColor: '#ffffff',
        color: '#1f2937',
        fontSize: 15,
        textAlign: 'left',
        padding: 12
      });
    case 'image':
      return Object.assign(base, {
        src: 'https://picsum.photos/600/400',
        alt: '示例图片',
        radius: 8,
        objectFit: 'cover'
      });
    case 'video':
      return Object.assign(base, {
        src: '',
        // 也可填 youtube/bilibili embed URL
        placeholder: '点击属性面板设置视频地址'
      });
    case 'button':
      return Object.assign(base, {
        text: '点击按钮',
        bgColor: '#3b82f6',
        textColor: '#ffffff',
        fontSize: 15,
        radius: 8,
        bold: true,
        // 跳转目标：{type: 'page'|'url', target: pageId|url}
        link: null
      });
    case 'card':
      return Object.assign(base, {
        imageSrc: 'https://picsum.photos/400/300',
        title: '卡片标题',
        desc: '这是卡片描述文本，介绍该卡片内容。',
        bgColor: '#ffffff',
        radius: 8
      });
  }
  return base;
}

// ==================== 5. 渲染：页面列表 ====================

function renderPageList() {
  const list = document.getElementById('page-list');
  list.innerHTML = '';
  Object.values(state.pages).forEach(page => {
    const item = document.createElement('div');
    item.className = 'page-item' + (page.id === state.currentPageId ? ' active' : '');
    item.dataset.pageId = page.id;

    const name = document.createElement('span');
    name.className = 'page-name';
    name.textContent = page.name;
    item.appendChild(name);

    const actions = document.createElement('div');
    actions.className = 'page-actions';
    actions.innerHTML =
      '<button class="btn-rename-page" title="重命名">✎</button>' +
      '<button class="btn-del-page" title="删除">🗑</button>';
    item.appendChild(actions);

    item.addEventListener('click', (e) => {
      if (e.target.closest('.page-actions')) return;
      switchPage(page.id);
    });

    list.appendChild(item);
  });

  // 绑定重命名/删除
  list.querySelectorAll('.btn-rename-page').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.page-item');
      const pageId = item.dataset.pageId;
      renamePage(pageId);
    });
  });
  list.querySelectorAll('.btn-del-page').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pageId = btn.closest('.page-item').dataset.pageId;
      deletePage(pageId);
    });
  });
}

function switchPage(pageId) {
  if (state.currentPageId === pageId) return;
  pushHistory();
  state.currentPageId = pageId;
  state.selectedElementId = null;
  renderAll();
}

function addPage() {
  pushHistory();
  const ids = Object.keys(state.pages);
  let n = 1;
  while (ids.includes('page_' + n)) n++;
  const id = 'page_' + n;
  state.pages[id] = { id, name: 'page' + n, elements: [] };
  state.currentPageId = id;
  state.selectedElementId = null;
  renderAll();
  showToast('已新建页面');
}

function renamePage(pageId) {
  const page = state.pages[pageId];
  const item = document.querySelector('.page-item[data-page-id="' + pageId + '"]');
  if (!item) return;
  const nameEl = item.querySelector('.page-name');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = page.name;
  input.className = 'page-name-input';
  item.replaceChild(input, nameEl);
  input.focus();
  input.select();

  const commit = () => {
    const v = input.value.trim();
    if (v && v !== page.name) {
      pushHistory();
      page.name = v;
    }
    renderAll();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.value = page.name; input.blur(); }
  });
}

function deletePage(pageId) {
  if (Object.keys(state.pages).length <= 1) {
    showToast('至少保留一个页面');
    return;
  }
  pushHistory();
  delete state.pages[pageId];
  if (state.currentPageId === pageId) {
    state.currentPageId = Object.keys(state.pages)[0];
  }
  // 同时清理指向被删页面的按钮跳转
  Object.values(state.pages).forEach(p => {
    p.elements.forEach(el => {
      if (el.link && el.link.type === 'page' && el.link.target === pageId) {
        el.link = null;
      }
    });
  });
  state.selectedElementId = null;
  renderAll();
  showToast('页面已删除');
}


// ==================== 6. 渲染：画布元素 ====================

/** 在画布上渲染所有元素 */
function renderElements() {
  const container = document.getElementById('canvas-elements');
  container.innerHTML = '';
  const elements = currentElements();
  if (elements.length === 0) {
    container.innerHTML =
      '<div class="empty-hint"><p>点击左侧模板或拖拽框选创建组件</p></div>';
    return;
  }
  // 按 zIndex 升序绘制（zIndex 大的在后，覆盖在上方）
  const sorted = elements.slice().sort(function(a, b) {
    var za = a.zIndex || 0, zb = b.zIndex || 0;
    if (za !== zb) return za - zb;
    return 0;
  });
  sorted.forEach(el => {
    const div = elementToDiv(el);
    container.appendChild(div);
  });
}

/** 将元素数据转为 DOM 节点 */
function elementToDiv(el) {
  const div = document.createElement('div');
  var cls = 'canvas-el';
  if (isSelected(el.id)) cls += ' selected';
  if (el.id === state.selectedElementId) cls += ' main-selected';
  div.className = cls;
  div.dataset.elId = el.id;
  div.style.cssText = elementStyles(el);

  // 内容
  const content = document.createElement('div');
  content.className = 'el-content';
  content.style.cssText = 'width:100%;height:100%;overflow:hidden;';
  content.innerHTML = elementInnerHTML(el);
  div.appendChild(content);

  // 调整手柄（八个方向，仅主选中元素显示）
  if (el.id === state.selectedElementId) {
    const dirs = ['nw','n','ne','e','se','s','sw','w'];
    dirs.forEach(d => {
      const h = document.createElement('div');
      h.className = 'resize-handle ' + d;
      h.dataset.handle = d;
      div.appendChild(h);
    });
  }

  // 所有选中元素支持拖拽移动；仅主选中元素显示调整手柄
  if (isSelected(el.id)) {
    makeDraggable(div, el);
  }
  if (el.id === state.selectedElementId) {
    makeResizable(div, el);
  }

  return div;
}

/** 元素样式字符串 */
function elementStyles(el) {
  let s = 'left:' + el.x + 'px;top:' + el.y + 'px;';
  s += 'width:' + el.width + 'px;height:' + el.height + 'px;';
  if (el.bgColor) s += 'background:' + el.bgColor + ';';
  if (el.radius) s += 'border-radius:' + el.radius + 'px;';
  if (el.type === 'text' && el.color) s += 'color:' + el.color + ';';
  s += 'z-index:' + (el.zIndex||0) + ';';
  return s;
}

/** 元素内部 HTML（种类差异内容） */
function elementInnerHTML(el) {
  switch (el.type) {
    case 'text':
      return '<div class="el-text" style="padding:' + el.padding + 'px;text-align:' + (el.textAlign||'left') + ';font-size:' + (el.fontSize||15) + 'px;color:' + (el.color||'#1f2937') + '">' +
             (el.content || '') + '</div>';

    case 'image':
      return '<div class="el-image"><img src="' + (el.src||'') + '" alt="' + (el.alt||'') + '" style="object-fit:' + (el.objectFit||'cover') + '"></div>';

    case 'video':
      if (el.src) {
        return '<div class="el-video">' +
               (el.src.includes('youtube') || el.src.includes('bilibili') ?
                 '<iframe src="' + el.src + '" allowfullscreen></iframe>' :
                 '<video src="' + el.src + '" controls></video>') +
               '</div>';
      }
      return '<div class="el-video"><div class="placeholder">\uD83C\uDFAC<span>' + (el.placeholder||'设置视频URL') + '</span></div></div>';

    case 'button':
      var extra = '';
      if (el.link) {
        if (el.link.type === 'page') {
          var targetPage = state.pages[el.link.target];
          extra = ' data-link-page="' + el.link.target + '"';
        } else if (el.link.type === 'url') {
          extra = ' data-link-url="' + el.link.target + '"';
        }
      }
      var bold = el.bold ? 'font-weight:600;' : '';
      return '<div class="el-button"><button style="background:' + (el.bgColor||'#3b82f6') + ';color:' + (el.textColor||'#fff') + ';font-size:' + (el.fontSize||15) + 'px;border-radius:' + (el.radius||8) + 'px;' + bold + '"' + extra + '>' +
             (el.text || '按钮') + '</button></div>';

    case 'card':
      return '<div class="el-card" style="background:' + (el.bgColor||'#fff') + ';border-radius:' + (el.radius||8) + 'px">' +
             '<div class="card-img">' +
             (el.imageSrc ? '<img src="' + el.imageSrc + '">' : '\uD83D\uDDBC') +
             '</div>' +
             '<div class="card-body"><div class="card-title">' + (el.title||'标题') + '</div>' +
             '<div class="card-desc">' + (el.desc||'') + '</div></div></div>';

    default:
      return '<div style="padding:20px;color:#999">未知组件</div>';
  }
}

// ==================== 7. 元素交互：选中、拖拽移动、调整大小 ====================

var _dragState = null;

/** 点击元素选中 */
function selectElementById(id, multi) {
  if (multi) {
    pushHistory();
    toggleSelected(id);
    renderElements();
    renderPropertyPanel();
    return;
  }
  if (state.selectedElementId === id && (state.selectedElementIds||[]).length === 0) return;
  pushHistory();
  setSelected(id);
  renderElements();
  renderPropertyPanel();
}

/** 清除选中 */
function deselectElement() {
  if (!state.selectedElementId && (state.selectedElementIds||[]).length === 0) return;
  pushHistory();
  clearSelection();
  renderElements();
  renderPropertyPanel();
}

/** 删除所有选中的元素 */
function deleteSelectedElements() {
  var ids = effectiveSelectedIds();
  if (ids.length === 0) return;
  pushHistory();
  var arr = currentElements();
  ids.forEach(function(id) {
    var idx = arr.findIndex(function(e) { return e.id === id; });
    if (idx >= 0) arr.splice(idx, 1);
  });
  clearSelection();
  renderElements();
  renderPropertyPanel();
  showToast('已删除 ' + ids.length + ' 个模块');
}

// ==================== Z-INDEX 层级操作 ====================

/** 获取当前页最大 zIndex */
function maxZIndex() {
  var max = 0;
  currentElements().forEach(function(e) { if ((e.zIndex||0) > max) max = e.zIndex||0; });
  return max;
}

/** 将选中元素移到最前 */
function bringToFront() {
  var ids = effectiveSelectedIds();
  if (ids.length === 0) return;
  pushHistory();
  var next = maxZIndex() + 1;
  ids.forEach(function(id) {
    var el = currentElements().find(function(e) { return e.id === id; });
    if (el) el.zIndex = next++;
  });
  renderElements();
}

/** 将选中元素移到最后 */
function sendToBack() {
  var ids = effectiveSelectedIds();
  if (ids.length === 0) return;
  pushHistory();
  var next = 0;
  // 把所有非选中元素的 z-index 推后
  currentElements().forEach(function(e) {
    if (ids.indexOf(e.id) === -1) {
      e.zIndex = (e.zIndex || 0) + ids.length;
    }
  });
  ids.forEach(function(id) {
    var el = currentElements().find(function(e) { return e.id === id; });
    if (el) el.zIndex = next++;
  });
  renderElements();
}

/** 上移一层 */
function bringForward() {
  var ids = effectiveSelectedIds();
  if (ids.length === 0) return;
  pushHistory();
  ids.forEach(function(id) {
    var el = currentElements().find(function(e) { return e.id === id; });
    if (el) el.zIndex = (el.zIndex || 0) + 1;
  });
  renderElements();
}

/** 下移一层 */
function sendBackward() {
  var ids = effectiveSelectedIds();
  if (ids.length === 0) return;
  pushHistory();
  ids.forEach(function(id) {
    var el = currentElements().find(function(e) { return e.id === id; });
    if (el) el.zIndex = Math.max(0, (el.zIndex || 0) - 1);
  });
  renderElements();
}

// ==================== 复制 / 粘贴 / 克隆 ====================

/** 复制选中元素到内存剪贴板 */
function copySelected() {
  var ids = effectiveSelectedIds();
  if (ids.length === 0) return;
  state._clipboard = [];
  ids.forEach(function(id) {
    var el = currentElements().find(function(e) { return e.id === id; });
    if (el) state._clipboard.push(clone(el));
  });
  showToast('已复制 ' + state._clipboard.length + ' 个模块');
}

/** 粘贴剪贴板中的元素 */
function pasteClipboard() {
  if (!state._clipboard || state._clipboard.length === 0) {
    showToast('剪贴板为空');
    return;
  }
  pushHistory();
  state._clipboard.forEach(function(el) {
    var copy = clone(el);
    copy.id = uid();
    copy.x += 20;
    copy.y += 20;
    currentElements().push(copy);
  });
  // 选中刚刚粘贴的
  var pasted = currentElements().slice(-state._clipboard.length);
  clearSelection();
  state.selectedElementId = pasted[0].id;
  state.selectedElementIds = pasted.map(function(e) { return e.id; });
  renderElements();
  renderPropertyPanel();
  showToast('已粘贴 ' + state._clipboard.length + ' 个模块');
}

/** 克隆（Ctrl+D）：复制并原地粘贴 */
function duplicateSelected() {
  var ids = effectiveSelectedIds();
  if (ids.length === 0) return;
  pushHistory();
  state._clipboard = [];
  ids.forEach(function(id) {
    var el = currentElements().find(function(e) { return e.id === id; });
    if (el) state._clipboard.push(clone(el));
  });
  pasteClipboard();
}

/** 使元素可拖拽移动（同时移动所有选中元素） */
function makeDraggable(div, el) {
  div.addEventListener('mousedown', function(e) {
    if (e.target.closest('.resize-handle')) return;
    if (isPreviewMode()) return;
    e.preventDefault();
    e.stopPropagation();
    // 如果当前点击的元素不在选中集合里，则切换为单选
    if (!isSelected(el.id)) {
      setSelected(el.id);
      renderElements();
      renderPropertyPanel();
    }
    var startX = e.clientX, startY = e.clientY;
    var ids = effectiveSelectedIds();
    var origs = {};
    ids.forEach(function(id) {
      var e2 = currentElements().find(function(x) { return x.id === id; });
      if (e2) origs[id] = { x: e2.x, y: e2.y };
    });
    _dragState = { startX: startX, startY: startY, origs: origs, moved: false };
    var historyPushed = false;

    function onMove(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      if (!historyPushed && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        pushHistory();
        historyPushed = true;
      }
      ids.forEach(function(id) {
        var e2 = currentElements().find(function(x) { return x.id === id; });
        if (!e2 || !origs[id]) return;
        e2.x = Math.max(0, origs[id].x + dx);
        e2.y = Math.max(0, origs[id].y + dy);
        e2.x = Math.round(e2.x / 5) * 5;
        e2.y = Math.round(e2.y / 5) * 5;
      });
      _dragState.moved = true;
      // 更新所有选中元素的位置
      var cont = document.getElementById('canvas-elements');
      ids.forEach(function(id) {
        var node = cont.querySelector('[data-el-id="' + id + '"]');
        if (node) {
          var e2 = currentElements().find(function(x) { return x.id === id; });
          if (e2) { node.style.left = e2.x + 'px'; node.style.top = e2.y + 'px'; }
        }
      });
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      _dragState = null;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/** 使元素可调整大小 */
function makeResizable(div, el) {
  var handles = div.querySelectorAll('.resize-handle');
  handles.forEach(function(h) {
    h.addEventListener('mousedown', function(e) {
      if (isPreviewMode()) return;
      e.preventDefault();
      e.stopPropagation();
      var dir = h.dataset.handle;
      var startX = e.clientX, startY = e.clientY;
      var orig = { x: el.x, y: el.y, w: el.width, h: el.height };

      function onMove(ev) {
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        if (dir.includes('e')) { el.width = Math.max(40, orig.w + dx); }
        if (dir.includes('w')) {
          var nw = Math.max(0, orig.x + dx);
          el.width = Math.max(40, orig.w + (orig.x - nw));
          el.x = nw;
        }
        if (dir.includes('s')) { el.height = Math.max(30, orig.h + dy); }
        if (dir.includes('n')) {
          var nh = Math.max(0, orig.y + dy);
          el.height = Math.max(30, orig.h + (orig.y - nh));
          el.y = nh;
        }
        div.style.cssText = elementStyles(el);
        renderPropertyPanel();
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (el.width < 40 || el.height < 30) {
          el.width = Math.max(40, el.width);
          el.height = Math.max(30, el.height);
          div.style.cssText = elementStyles(el);
        }
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}


// ==================== 8. 画布交互：框选拖拽创建 / 选中元素 ====================

function setupCanvasInteraction() {
  var canvas = document.getElementById('canvas');
  var selBox = document.getElementById('selection-box');

  canvas.addEventListener('mousedown', function(e) {
    // 仅编辑模式
    if (isPreviewMode()) return;

    // shift 按下时进入多选模式
    var shiftKey = e.shiftKey;

    // 如果点击在某个元素或手柄上：由元素自身处理
    if (e.target.closest('.canvas-el') || e.target.closest('.resize-handle')) {
      var elDiv = e.target.closest('.canvas-el');
      if (elDiv) {
        var elId = elDiv.dataset.elId;
        if (shiftKey) {
          // shift+click：切换多选
          pushHistory();
          toggleSelected(elId);
          renderElements();
          renderPropertyPanel();
          return;
        }
        // 普通点击：单选
        if (!isSelected(elId)) {
          pushHistory();
          setSelected(elId);
          renderElements();
          renderPropertyPanel();
        }
      }
      return;
    }

    // 点击空白
    if (!e.target.closest('#canvas')) return;

    if (!shiftKey) {
      deselectElement();
    } else {
      // shift+单击空白开始框选多选
      state.selectedElementId = null;
      state.selectedElementIds = [];
    }

    var rect = canvas.getBoundingClientRect();
    var startX = e.clientX - rect.left;
    var startY = e.clientY - rect.top;
    var curX = startX, curY = startY;
    var dragging = true;

    selBox.style.left = startX + 'px';
    selBox.style.top = startY + 'px';
    selBox.style.width = '0px';
    selBox.style.height = '0px';
    selBox.classList.remove('hidden');

    function onMove(ev) {
      if (!dragging) return;
      curX = ev.clientX - rect.left;
      curY = ev.clientY - rect.top;
      var left = Math.min(startX, curX);
      var top = Math.min(startY, curY);
      var w = Math.abs(curX - startX);
      var h = Math.abs(curY - startY);
      selBox.style.left = left + 'px';
      selBox.style.top = top + 'px';
      selBox.style.width = w + 'px';
      selBox.style.height = h + 'px';
    }

    function onUp() {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      selBox.classList.add('hidden');

      var w = Math.abs(curX - startX);
      var h = Math.abs(curY - startY);
      // 短距离视为点击空白
      if (w < 20 || h < 20) return;

      var left = Math.min(startX, curX);
      var top = Math.min(startY, curY);
      var right = left + w, bottom = top + h;

      // shift 拖拽 = 多选框选；普通拖拽 = 创建组件
      if (shiftKey) {
        var hits = currentElements().filter(function(el) {
          var elR = el.x + el.width, elB = el.y + el.height;
          return el.x < right && elR > left && el.y < bottom && elB > top;
        });
        if (hits.length > 0) {
          pushHistory();
          // 替换为这些选中
          state.selectedElementIds = hits.map(function(e) { return e.id; });
          state.selectedElementId = hits[0].id;
          renderElements();
          renderPropertyPanel();
          showToast('已选中 ' + hits.length + ' 个模块');
        }
        return;
      }

      // 弹出组件选择器
      openPicker({
        x: Math.round(left / 5) * 5,
        y: Math.round(top / 5) * 5,
        width: Math.round(w / 5) * 5,
        height: Math.round(h / 5) * 5
      });
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });
}

// ==================== 9. 组件选择弹窗 ====================

var _pendingRect = null;

function openPicker(rect) {
  _pendingRect = rect;
  document.getElementById('picker-overlay').classList.remove('hidden');
}

function closePicker() {
  document.getElementById('picker-overlay').classList.add('hidden');
  _pendingRect = null;
}

function setupPicker() {
  document.getElementById('picker-cancel').addEventListener('click', closePicker);
  document.getElementById('picker-overlay').addEventListener('click', function(e) {
    if (e.target === this) closePicker();
  });
  document.querySelectorAll('.picker-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var type = item.dataset.type;
      if (!_pendingRect) return;
      pushHistory();
      var el = createElement(type, _pendingRect);
      currentElements().push(el);
      state.selectedElementId = el.id;
      closePicker();
      renderElements();
      renderPropertyPanel();
      showToast('已添加 ' + ({text:'文本',image:'图片',video:'视频',button:'按钮',card:'卡片'}[type]));
    });
  });
}

// ==================== 10. 左侧模板点击 ==============

function setupTemplateClick() {
  document.querySelectorAll('.template-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var type = item.dataset.type;
      pushHistory();
      // 在画布左上角默认位置创建
      var rect = { x: 40, y: 40 + currentElements().length * 20, width: 200, height: 100 };
      if (type === 'card') { rect.width = 220; rect.height = 200; }
      if (type === 'image') { rect.width = 240; rect.height = 160; }
      if (type === 'video') { rect.width = 320; rect.height = 180; }
      if (type === 'button') { rect.width = 130; rect.height = 50; }
      if (type === 'text') { rect.width = 300; rect.height = 100; }
      var el = createElement(type, rect);
      currentElements().push(el);
      state.selectedElementId = el.id;
      renderElements();
      renderPropertyPanel();
      showToast('已添加 ' + ({text:'文本',image:'图片',video:'视频',button:'按钮',card:'卡片'}[type]));
    });
  });
}

// ==================== 10b. 布局模板库 ====================

/** 应用布局模板到当前页 */
function applyTemplate(templateId) {
  var tpl = window.TEMPLATES && TEMPLATES.find(function(t) { return t.id === templateId; });
  if (!tpl) { showToast('模板未找到'); return; }
  if (!tpl.elements || tpl.elements.length === 0) { showToast('模板为空'); return; }

  pushHistory();
  // 深拷贝元素，重新生成 ID
  var fresh = tpl.elements.map(function(el) {
    var copy = clone(el);
    copy.id = uid();
    return copy;
  });
  currentPage().elements = fresh;
  clearSelection();
  renderElements();
  renderPropertyPanel();
  showToast('已应用模板：' + tpl.name);
}

/** 渲染模板库 */
function setupTemplateLibrary() {
  var container = document.getElementById('template-library');
  if (!container || !window.TEMPLATES) return;

  container.innerHTML = '';
  TEMPLATES.forEach(function(tpl) {
    var card = document.createElement('div');
    card.className = 'tpl-card';
    card.innerHTML =
      '<div class="tpl-thumb">' + (tpl.thumb || '📄') + '</div>' +
      '<div class="tpl-name">' + tpl.name + '</div>' +
      '<div class="tpl-desc">' + (tpl.desc || '') + '</div>';
    card.addEventListener('click', function() {
      applyTemplate(tpl.id);
    });
    container.appendChild(card);
  });
}

/** 侧边栏 Tab 切换 */
function setupSidebarTabs() {
  var tabs = document.querySelectorAll('.sidebar-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      // 切换 tab 高亮
      document.querySelectorAll('.sidebar-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      // 切换 panel 显示
      var target = tab.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(function(panel) {
        panel.classList.toggle('hidden', panel.dataset.tabPanel !== target);
      });
    });
  });
}

// ==================== 11. 属性面板 ====================

function renderPropertyPanel() {
  var panel = document.getElementById('property-content');
  var ids = effectiveSelectedIds();

  if (ids.length === 0) {
    panel.innerHTML = '<div class="flex flex-col items-center justify-center py-12 text-gray-300"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><p class="mt-2 text-xs">点击画布上的模块编辑属性</p></div>';
    return;
  }

  // 多选：显示批量操作面板
  if (ids.length > 1) {
    panel.innerHTML =
      '<div class="prop-group"><label>已选中 ' + ids.length + ' 个模块</label>' +
        '<div class="text-xs text-gray-400 mt-1">按住 Shift 点击画布添加 / 移除选中</div>' +
      '</div>' +
      '<div class="prop-group"><label>层级</label><div class="prop-row">' +
        '<button id="btn-front" class="prop-btn">置顶</button>' +
        '<button id="btn-back" class="prop-btn">置底</button>' +
      '</div></div>' +
      '<div class="prop-group"><div class="prop-row">' +
        '<button id="btn-fwd" class="prop-btn">上移一层</button>' +
        '<button id="btn-bwd" class="prop-btn">下移一层</button>' +
      '</div></div>' +
      '<div class="prop-group"><label>对齐</label><div class="prop-row">' +
        '<button id="btn-align-left" class="prop-btn">左对齐</button>' +
        '<button id="btn-align-center" class="prop-btn">水平居中</button>' +
        '<button id="btn-align-right" class="prop-btn">右对齐</button>' +
      '</div></div>' +
      '<div class="prop-group"><div class="prop-row">' +
        '<button id="btn-align-top" class="prop-btn">顶对齐</button>' +
        '<button id="btn-align-middle" class="prop-btn">垂直居中</button>' +
        '<button id="btn-align-bottom" class="prop-btn">底对齐</button>' +
      '</div></div>' +
      '<div class="prop-group"><label>批量操作</label><div class="prop-row">' +
        '<button id="btn-duplicate" class="prop-btn">克隆 (Ctrl+D)</button>' +
        '<button id="btn-copy" class="prop-btn">复制</button>' +
      '</div></div>' +
      '<div class="prop-group"><button id="btn-del-el" class="w-full py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-200">删除选中 ' + ids.length + ' 个模块</button></div>';

    bindMultiSelectButtons();
    return;
  }

  var el = selectedElement();
  if (!el) return;

  var html = '<div class="prop-group"><label>类型</label><div class="text-base text-gray-700 font-medium">' + el.type + ' #' + el.id.slice(-4) + '</div></div>';

  // 通用：位置 / 尺寸
  html += '<div class="prop-group"><label>位置 (X / Y)</label><div class="prop-row">' +
          '<input type="number" id="prop-x" value="' + el.x + '">' +
          '<input type="number" id="prop-y" value="' + el.y + '">' +
          '</div></div>';
  html += '<div class="prop-group"><label>尺寸 (W / H)</label><div class="prop-row">' +
          '<input type="number" id="prop-w" value="' + el.width + '" min="40">' +
          '<input type="number" id="prop-h" value="' + el.height + '" min="30">' +
          '</div></div>';

  // 层级
  html += '<div class="prop-group"><label>层级 (z-index)</label><div class="prop-row">' +
          '<input type="number" id="prop-zIndex" value="' + (el.zIndex||0) + '" min="0">' +
          '</div></div>';

  // 种类特定属性
  if (el.type === 'text') {
    html += textProps(el);
  } else if (el.type === 'image') {
    html += imageProps(el);
  } else if (el.type === 'video') {
    html += videoProps(el);
  } else if (el.type === 'button') {
    html += buttonProps(el);
  } else if (el.type === 'card') {
    html += cardProps(el);
  }

  // 层级操作
  html += '<div class="prop-group"><label>层级操作</label><div class="prop-row">' +
          '<button id="btn-front" class="prop-btn">置顶</button>' +
          '<button id="btn-back" class="prop-btn">置底</button>' +
          '<button id="btn-fwd" class="prop-btn">上移</button>' +
          '<button id="btn-bwd" class="prop-btn">下移</button>' +
          '</div></div>';

  // 复制粘贴
  html += '<div class="prop-group"><div class="prop-row">' +
          '<button id="btn-duplicate" class="prop-btn">克隆 (Ctrl+D)</button>' +
          '<button id="btn-copy" class="prop-btn">复制 (Ctrl+C)</button>' +
          '</div></div>';

  // 删除按钮
  html += '<div class="prop-group"><button id="btn-del-el" class="w-full py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-200">删除该模块</button></div>';

  panel.innerHTML = html;
  bindPropertyInputs(el);
}

function bindMultiSelectButtons() {
  var map = {
    'btn-front': bringToFront,
    'btn-back': sendToBack,
    'btn-fwd': bringForward,
    'btn-bwd': sendBackward,
    'btn-duplicate': duplicateSelected,
    'btn-copy': copySelected,
    'btn-del-el': deleteSelectedElements,
    'btn-align-left': function() { alignSelected('left'); },
    'btn-align-center': function() { alignSelected('center-x'); },
    'btn-align-right': function() { alignSelected('right'); },
    'btn-align-top': function() { alignSelected('top'); },
    'btn-align-middle': function() { alignSelected('middle-y'); },
    'btn-align-bottom': function() { alignSelected('bottom'); }
  };
  Object.keys(map).forEach(function(id) {
    var node = document.getElementById(id);
    if (node) node.onclick = map[id];
  });
}

/** 多选对齐 */
function alignSelected(mode) {
  var els = selectedElements();
  if (els.length < 2) return;
  pushHistory();
  // 计算公共边界
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  els.forEach(function(el) {
    if (el.x < minX) minX = el.x;
    if (el.x + el.width > maxX) maxX = el.x + el.width;
    if (el.y < minY) minY = el.y;
    if (el.y + el.height > maxY) maxY = el.y + el.height;
  });
  els.forEach(function(el) {
    if (mode === 'left') el.x = minX;
    else if (mode === 'right') el.x = maxX - el.width;
    else if (mode === 'center-x') el.x = (minX + maxX) / 2 - el.width / 2;
    else if (mode === 'top') el.y = minY;
    else if (mode === 'bottom') el.y = maxY - el.height;
    else if (mode === 'middle-y') el.y = (minY + maxY) / 2 - el.height / 2;
  });
  renderElements();
}

function textProps(el) {
  return '' +
    '<div class="prop-group"><label>内容 (支持简单 HTML)</label><textarea id="prop-content">' + escapeHtml(el.content) + '</textarea></div>' +
    '<div class="prop-group"><label>背景色</label><input type="color" id="prop-bgColor" value="' + el.bgColor + '"></div>' +
    '<div class="prop-group"><label>文字颜色</label><input type="color" id="prop-color" value="' + el.color + '"></div>' +
    '<div class="prop-group"><label>字体大小</label><input type="number" id="prop-fontSize" value="' + el.fontSize + '" min="10" max="100"></div>' +
    '<div class="prop-group"><label>对齐方式</label><select id="prop-textAlign">' +
      '<option value="left"' + (el.textAlign==='left'?' selected':'') + '>左对齐</option>' +
      '<option value="center"' + (el.textAlign==='center'?' selected':'') + '>居中</option>' +
      '<option value="right"' + (el.textAlign==='right'?' selected':'') + '>右对齐</option>' +
    '</select></div>' +
    '<div class="prop-group"><label>内边距 (px)</label><input type="number" id="prop-padding" value="' + el.padding + '" min="0"></div>';
}

function imageProps(el) {
  return '' +
    '<div class="prop-group"><label>图片地址 URL</label><input type="text" id="prop-src" value="' + el.src + '" placeholder="https://..."></div>' +
    '<div class="prop-group"><label>替代文本 (alt)</label><input type="text" id="prop-alt" value="' + el.alt + '"></div>' +
    '<div class="prop-group"><label>圆角</label><input type="number" id="prop-radius" value="' + el.radius + '" min="0" max="100"></div>' +
    '<div class="prop-group"><label>适配方式</label><select id="prop-objectFit">' +
      '<option value="cover"' + (el.objectFit==='cover'?' selected':'') + '>填充裁剪 (cover)</option>' +
      '<option value="contain"' + (el.objectFit==='contain'?' selected':'') + '>完整显示 (contain)</option>' +
      '<option value="fill"' + (el.objectFit==='fill'?' selected':'') + '>拉伸 (fill)</option>' +
    '</select></div>';
}

function videoProps(el) {
  return '' +
    '<div class="prop-group"><label>视频地址 URL</label><input type="text" id="prop-src" value="' + el.src + '" placeholder="可直接填 .mp4 或 YouTube/B站 embed 链接"></div>' +
    '<div class="prop-group"><label>占位提示文本</label><input type="text" id="prop-placeholder" value="' + el.placeholder + '"></div>';
}

function buttonProps(el) {
  var linkHtml = '<div class="prop-group"><label>跳转目标</label>' +
    '<select id="prop-linkType">' +
      '<option value="none"' + (!el.link?' selected':'') + '>不跳转</option>' +
      '<option value="page"' + (el.link && el.link.type==='page'?' selected':'') + '>跳转到页面</option>' +
      '<option value="url"' + (el.link && el.link.type==='url'?' selected':'') + '>外部链接</option>' +
    '</select>' +
    '<div id="prop-link-target-wrap" class="mt-2"></div>' +
    '</div>';
  return '' +
    '<div class="prop-group"><label>按钮文字</label><input type="text" id="prop-text" value="' + el.text + '"></div>' +
    '<div class="prop-group"><label>背景色</label><input type="color" id="prop-bgColor" value="' + el.bgColor + '"></div>' +
    '<div class="prop-group"><label>文字颜色</label><input type="color" id="prop-textColor" value="' + el.textColor + '"></div>' +
    '<div class="prop-group"><label>字体大小</label><input type="number" id="prop-fontSize" value="' + el.fontSize + '" min="10" max="40"></div>' +
    '<div class="prop-group"><label>圆角</label><input type="number" id="prop-radius" value="' + el.radius + '" min="0" max="50"></div>' +
    linkHtml;
}

function cardProps(el) {
  return '' +
    '<div class="prop-group"><label>卡片图片 URL</label><input type="text" id="prop-imageSrc" value="' + el.imageSrc + '"></div>' +
    '<div class="prop-group"><label>标题</label><input type="text" id="prop-title" value="' + el.title + '"></div>' +
    '<div class="prop-group"><label>描述</label><textarea id="prop-desc">' + el.desc + '</textarea></div>' +
    '<div class="prop-group"><label>背景色</label><input type="color" id="prop-bgColor" value="' + el.bgColor + '"></div>' +
    '<div class="prop-group"><label>圆角</label><input type="number" id="prop-radius" value="' + el.radius + '" min="0" max="50"></div>';
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


// ==================== 12. 绑定属性面板输入 ====================

function bindPropertyInputs(el) {
  // 通用：位置 / 尺寸
  bindNum(el, 'prop-x', 'x');
  bindNum(el, 'prop-y', 'y');
  bindNum(el, 'prop-w', 'width');
  bindNum(el, 'prop-h', 'height');
  bindNum(el, 'prop-zIndex', 'zIndex');

  // 种类特定
  if (el.type === 'text') {
    bindText(el, 'prop-content', 'content');
    bindColor(el, 'prop-bgColor', 'bgColor');
    bindColor(el, 'prop-color', 'color');
    bindNum(el, 'prop-fontSize', 'fontSize');
    bindSelect(el, 'prop-textAlign', 'textAlign');
    bindNum(el, 'prop-padding', 'padding');
  } else if (el.type === 'image') {
    bindText(el, 'prop-src', 'src');
    bindText(el, 'prop-alt', 'alt');
    bindNum(el, 'prop-radius', 'radius');
    bindSelect(el, 'prop-objectFit', 'objectFit');
  } else if (el.type === 'video') {
    bindText(el, 'prop-src', 'src');
    bindText(el, 'prop-placeholder', 'placeholder');
  } else if (el.type === 'button') {
    bindText(el, 'prop-text', 'text');
    bindColor(el, 'prop-bgColor', 'bgColor');
    bindColor(el, 'prop-textColor', 'textColor');
    bindNum(el, 'prop-fontSize', 'fontSize');
    bindNum(el, 'prop-radius', 'radius');
    bindButtonLink(el);
  } else if (el.type === 'card') {
    bindText(el, 'prop-imageSrc', 'imageSrc');
    bindText(el, 'prop-title', 'title');
    bindText(el, 'prop-desc', 'desc');
    bindColor(el, 'prop-bgColor', 'bgColor');
    bindNum(el, 'prop-radius', 'radius');
  }

  // 层级操作按钮
  var lvlMap = { 'btn-front': bringToFront, 'btn-back': sendToBack, 'btn-fwd': bringForward, 'btn-bwd': sendBackward };
  Object.keys(lvlMap).forEach(function(id) {
    var node = document.getElementById(id);
    if (node) node.onclick = lvlMap[id];
  });
  var dup = document.getElementById('btn-duplicate'); if (dup) dup.onclick = duplicateSelected;
  var cpy = document.getElementById('btn-copy'); if (cpy) cpy.onclick = copySelected;

  // 删除按钮
  var delBtn = document.getElementById('btn-del-el');
  if (delBtn) {
    delBtn.addEventListener('click', function() {
      deleteSelectedElements();
    });
  }
}

function bindNum(el, inputId, key) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.addEventListener('change', function() {
    pushHistory();
    el[key] = parseInt(inp.value, 10) || 0;
    renderElements();
  });
}

function bindText(el, inputId, key) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.addEventListener('change', function() {
    pushHistory();
    el[key] = inp.value;
    renderElements();
  });
}

function bindColor(el, inputId, key) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.addEventListener('input', function() {
    pushHistory();
    el[key] = inp.value;
    renderElements();
  });
}

function bindSelect(el, inputId, key) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.addEventListener('change', function() {
    pushHistory();
    el[key] = inp.value;
    renderElements();
  });
}

/** 按钮跳转绑定：根据下拉显示对应输入区 */
function bindButtonLink(el) {
  var sel = document.getElementById('prop-linkType');
  var wrap = document.getElementById('prop-link-target-wrap');
  if (!sel || !wrap) return;

  function refresh() {
    var v = sel.value;
    if (v === 'page') {
      var opts = Object.values(state.pages)
        .filter(function(p) { return p.id !== state.currentPageId; })
        .map(function(p) { return '<option value="' + p.id + '"' + (el.link && el.link.target===p.id ? ' selected' : '') + '>' + p.name + '</option>'; })
        .join('');
      if (!opts) opts = '<option value="">暂无其他页面，请先在左侧新建</option>';
      wrap.innerHTML = '<select id="prop-link-page" class="w-full">' + opts + '</select>';
      var pageSel = document.getElementById('prop-link-page');
      pageSel.addEventListener('change', function() {
        pushHistory();
        el.link = { type: 'page', target: pageSel.value };
        renderElements();
      });
    } else if (v === 'url') {
      var cur = el.link && el.link.type === 'url' ? el.link.target : '';
      wrap.innerHTML = '<input type="text" id="prop-link-url" value="' + cur + '" placeholder="https://example.com">';
      var urlInput = document.getElementById('prop-link-url');
      urlInput.addEventListener('change', function() {
        pushHistory();
        el.link = { type: 'url', target: urlInput.value };
        renderElements();
      });
    } else {
      wrap.innerHTML = '';
      if (el.link) {
        pushHistory();
        el.link = null;
        renderElements();
      }
    }
  }

  sel.addEventListener('change', refresh);
  refresh();
}

// ==================== 13. 预览模式 ====================

var _previewMode = false;

function isPreviewMode() { return _previewMode; }

function togglePreview() {
  _previewMode = !_previewMode;
  var body = document.body;
  var canvas = document.getElementById('canvas');
  var deviceSel = document.getElementById('device-select');
  var btn = document.getElementById('btn-preview');

  if (_previewMode) {
    body.classList.add('preview-mode');
    state.selectedElementId = null;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg><span>编辑</span>';
    deviceSel.classList.remove('hidden');
    applyDeviceSize();
    renderElements();
    renderPropertyPanel();
    showToast('已进入预览模式');
  } else {
    body.classList.remove('preview-mode');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>预览</span>';
    deviceSel.classList.add('hidden');
    canvas.style.width = '1200px';
    updateCanvasSizeLabel();
    renderElements();
    showToast('已退出预览模式');
  }
  bindPreviewInteractions();
}

function applyDeviceSize() {
  if (!_previewMode) return;
  var sel = document.getElementById('device-select');
  var w = parseInt(sel.value, 10) || 1200;
  document.getElementById('canvas').style.width = w + 'px';
  updateCanvasSizeLabel();
}

function updateCanvasSizeLabel() {
  var canvas = document.getElementById('canvas');
  var label = document.getElementById('canvas-size-label');
  if (label) label.textContent = canvas.offsetWidth + ' × ' + canvas.offsetHeight;
}

/** 预览模式下：按钮点击 = 跳转页面 */
function bindPreviewInteractions() {
  var canvas = document.getElementById('canvas');
  // 先移除旧的，避免重复绑定（null 安全）
  canvas.removeEventListener('click', previewClickHandler);
  if (!_previewMode) return;
  canvas.addEventListener('click', previewClickHandler);
}

function previewClickHandler(e) {
  if (!_previewMode) return;
  var btn = e.target.closest('button[data-link-page], button[data-link-url]');
  if (!btn) return;
  e.preventDefault();
  var pageId = btn.getAttribute('data-link-page');
  var url = btn.getAttribute('data-link-url');
  if (pageId && state.pages[pageId]) {
    state.currentPageId = pageId;
    renderAll();
    document.getElementById('canvas-area').scrollTo(0, 0);
    showToast('跳转到：' + state.pages[pageId].name);
  } else if (url) {
    window.open(url, '_blank');
  }
}


// ==================== 14. 导出 HTML ====================

/**
 * 将当前页面（或全部页面）导出为独立可运行的 HTML 字符串
 * 多页导出时用 hash 路由 (#page_xxx) 切换页面
 */
function exportHTML() {
  var allPages = Object.values(state.pages);

  // 生成每页的元素 HTML（按 zIndex 排序输出，确保层级正确）
  var pagesHTML = allPages.map(function(page) {
    var sorted = page.elements.slice().sort(function(a, b) {
      return (a.zIndex||0) - (b.zIndex||0);
    });
    var elsHTML = sorted.map(function(el) {
      var style = 'position:absolute;' +
        'left:' + el.x + 'px;top:' + el.y + 'px;' +
        'width:' + el.width + 'px;height:' + el.height + 'px;' +
        'z-index:' + (el.zIndex||0) + ';';
      if (el.bgColor) style += 'background:' + el.bgColor + ';';
      if (el.radius) style += 'border-radius:' + el.radius + 'px;';
      var inner = exportElementHTML(el);
      return '<div style="' + style + '">' + inner + '</div>';
    }).join('\n      ');
    return '<div class="pb-page" data-page-id="' + page.id + '"' +
           (page.id === state.currentPageId ? '' : ' style="display:none"') + '>' +
           '\n      ' + elsHTML +
           '\n    </div>';
  }).join('\n    ');

  // 生成完整 HTML
  var html = '' +
'<!DOCTYPE html>\n' +
'<html lang="zh-CN">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>导出页面</title>\n' +
'<style>\n' +
'  * { box-sizing: border-box; margin: 0; padding: 0; }\n' +
'  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n' +
'  .pb-stage { position: relative; width: 1200px; margin: 0 auto; min-height: 100vh; background: #fff; }\n' +
'  .pb-page { position: relative; width: 100%; min-height: 100vh; }\n' +
'  /* 响应式：根据视口缩放 */\n' +
'  @media (max-width: 1240px) { .pb-stage { transform-origin: top center; } }\n' +
'  .el-text { padding: 12px 16px; font-size: 15px; color: #1f2937; line-height: 1.6; word-break: break-word; }\n' +
'  .el-text h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }\n' +
'  .el-text h2 { font-size: 22px; font-weight: 600; margin-bottom: 6px; }\n' +
'  .el-text p { margin-bottom: 6px; }\n' +
'  .el-image { width: 100%; height: 100%; display: flex; }\n' +
'  .el-image img { width: 100%; height: 100%; object-fit: cover; }\n' +
'  .el-video { width: 100%; height: 100%; background: #111; }\n' +
'  .el-video video, .el-video iframe { width: 100%; height: 100%; border: none; }\n' +
'  .el-button { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }\n' +
'  .el-button button { padding: 10px 28px; border: none; cursor: pointer; transition: all .15s; }\n' +
'  .el-button button:hover { filter: brightness(1.08); }\n' +
'  .el-card { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }\n' +
'  .el-card .card-img { height: 55%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 24px; }\n' +
'  .el-card .card-img img { width: 100%; height: 100%; object-fit: cover; }\n' +
'  .el-card .card-body { padding: 12px 14px; flex: 1; }\n' +
'  .el-card .card-title { font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1f2937; }\n' +
'  .el-card .card-desc { font-size: 12px; color: #6b7280; line-height: 1.4; }\n' +
'  /* 响应式：手机端缩小画布以适应屏幕 */\n' +
'  @media (max-width: 768px) { .pb-stage { width: 100vw; transform: scale(1); } }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'  <div class="pb-stage" id="pb-stage">\n' +
'    ' + pagesHTML + '\n' +
'  </div>\n' +
'<script>\n' +
'  // 简单的页面切换：监听 hash 变化\n' +
'  function showPage() {\n' +
'    var hash = location.hash.replace("#","");\n' +
'    var pages = document.querySelectorAll(".pb-page");\n' +
'    if (!hash) { pages[0].style.display = ""; return; }\n' +
'    pages.forEach(function(p) {\n' +
'      p.style.display = (p.dataset.pageId === hash) ? "" : "none";\n' +
'    });\n' +
'  }\n' +
'  // 按钮点击跳转\n' +
'  document.addEventListener("click", function(e) {\n' +
'    var b = e.target.closest("button[data-link-page], button[data-link-url]");\n' +
'    if (!b) return;\n' +
'    e.preventDefault();\n' +
'    var pageId = b.getAttribute("data-link-page");\n' +
'    var url = b.getAttribute("data-link-url");\n' +
'    if (pageId) { location.hash = pageId; showPage(); window.scrollTo(0,0); }\n' +
'    else if (url) { window.open(url, "_blank"); }\n' +
'  });\n' +
'  // 响应式：根据屏幕宽度自适应缩放\n' +
'  function fitStage() {\n' +
'    var stage = document.getElementById("pb-stage");\n' +
'    var vw = window.innerWidth;\n' +
'    if (vw < 1240) {\n' +
'      var scale = vw / 1240;\n' +
'      stage.style.transform = "scale(" + scale + ")";\n' +
'      stage.style.transformOrigin = "top left";\n' +
'      stage.style.marginLeft = "0";\n' +
'      document.body.style.height = (stage.offsetHeight * scale) + "px";\n' +
'    } else {\n' +
'      stage.style.transform = "none";\n' +
'      document.body.style.height = "auto";\n' +
'    }\n' +
'  }\n' +
'  window.addEventListener("resize", fitStage);\n' +
'  window.addEventListener("load", function() { fitStage(); showPage(); });\n' +
'</' + 'script>\n' +
'</body>\n' +
'</html>';

  return html;
}

/** 单个元素的导出 HTML */
function exportElementHTML(el) {
  switch (el.type) {
    case 'text':
      return '<div class="el-text" style="padding:' + el.padding + 'px;text-align:' + (el.textAlign||'left') + ';font-size:' + (el.fontSize||15) + 'px;color:' + (el.color||'#1f2937') + '">' +
             (el.content || '') + '</div>';
    case 'image':
      return '<div class="el-image"><img src="' + (el.src||'') + '" alt="' + (el.alt||'') + '" style="object-fit:' + (el.objectFit||'cover') + '"></div>';
    case 'video':
      if (!el.src) return '';
      return '<div class="el-video">' +
             (el.src.indexOf('youtube')>=0 || el.src.indexOf('bilibili')>=0 ?
               '<iframe src="' + el.src + '" allowfullscreen></iframe>' :
               '<video src="' + el.src + '" controls></video>') + '</div>';
    case 'button':
      var attr = '';
      if (el.link) {
        if (el.link.type === 'page') attr = ' data-link-page="' + el.link.target + '"';
        else if (el.link.type === 'url') attr = ' data-link-url="' + el.link.target + '"';
      }
      var bold = el.bold ? 'font-weight:600;' : '';
      return '<div class="el-button"><button style="background:' + (el.bgColor||'#3b82f6') + ';color:' + (el.textColor||'#fff') + ';font-size:' + (el.fontSize||15) + 'px;border-radius:' + (el.radius||8) + 'px;' + bold + '"' + attr + '>' + (el.text||'按钮') + '</button></div>';
    case 'card':
      return '<div class="el-card" style="background:' + (el.bgColor||'#fff') + ';border-radius:' + (el.radius||8) + 'px">' +
             '<div class="card-img">' + (el.imageSrc ? '<img src="' + el.imageSrc + '">' : '🖼') + '</div>' +
             '<div class="card-body"><div class="card-title">' + (el.title||'标题') + '</div>' +
             '<div class="card-desc">' + (el.desc||'') + '</div></div></div>';
  }
  return '';
}

function downloadHTML() {
  var html = exportHTML();
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (currentPage().name || 'page') + '_export.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('已导出 HTML 文件');
}

// ==================== 15. 保存 / 加载 (localStorage) ====================

var STORAGE_KEY = 'puzzle_builder_project';
var AI_CONFIG_KEY = 'puzzle_builder_ai_config';

function saveProject(silent) {
  try {
    var data = {
      pages: state.pages,
      currentPageId: state.currentPageId,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (!silent) showToast('已保存到本地');
  } catch (e) {
    showToast('保存失败：' + e.message);
  }
}

function loadProject() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    var data = JSON.parse(raw);
    if (!data.pages) return false;
    state.pages = data.pages;
    state.currentPageId = data.currentPageId || Object.keys(data.pages)[0];
    state.selectedElementId = null;
    state.history = { past: [], future: [] };
    return true;
  } catch (e) {
    console.error('加载项目失败', e);
    return false;
  }
}

// ==================== 15b. AI 生成 (localStorage 配置 + 调用 + 解析) ====================

var AI_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  },
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com',
    model: 'gpt-4o-mini'
  }
};

var AI_SYSTEM_PROMPT = [
  '你是一个网页布局生成器。根据用户的需求，返回一个 JSON 对象，包含 elements 数组。',
  '画布宽度 1200px，元素使用绝对定位 (x, y, width, height)。',
  '元素格式（每个对象必须包含的字段）：',
  '{ "id": "gen_1", "type": "text|image|video|button|card", "x": 数字, "y": 数字, "width": 数字, "height": 数字, ...类型特定属性 }',
  '类型特定属性：',
  '- text: content(string, 支持简单 HTML 如 <h1>/<p>/<strong>), bgColor, color, fontSize, textAlign(left/center/right), padding',
  '- image: src(图片URL, 不存在就用 https://picsum.photos/seed/xxx/W/H), alt, radius(圆角), objectFit(cover/contain/fill)',
  '- video: src, placeholder',
  '- button: text, bgColor, textColor, fontSize, radius, bold(boolean)',
  '- card: imageSrc, title, desc, bgColor, radius',
  '要求：',
  '1. 生成 4-8 个元素，构成一个完整的页面。',
  '2. 元素之间不要重叠（用 y 坐标错开）。',
  '3. x/y 从 40 开始，宽度不超过 1120，留 40px 边距。',
  '4. 响应必须是合法 JSON 对象：{"elements": [...]}',
  '5. content / title / desc 内容要具体符合用户需求（中文），不要写占位符 "Lorem ipsum"。'
].join('\n');

function loadAIConfig() {
  try {
    var raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function saveAIConfig(config) {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    showToast('保存 API 配置失败：' + e.message);
  }
}

function clearAIConfig() {
  localStorage.removeItem(AI_CONFIG_KEY);
}

/**
 * 调用 AI 生成页面元素
 * @param {string} prompt 用户描述
 * @param {string} apiKey
 * @param {string} provider 'deepseek' | 'openai'
 * @returns {Promise<Array>} 元素数组
 */
function callAIGenerator(prompt, apiKey, provider) {
  var cfg = AI_PROVIDERS[provider] || AI_PROVIDERS.deepseek;
  var url = cfg.baseURL + '/v1/chat/completions';

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
  }).then(function(res) {
    if (!res.ok) {
      return res.text().then(function(txt) {
        throw new Error('HTTP ' + res.status + ': ' + txt.slice(0, 200));
      });
    }
    return res.json();
  }).then(function(data) {
    var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('AI 返回为空');
    var parsed = parseAIContent(content);
    if (!parsed || !Array.isArray(parsed.elements)) {
      throw new Error('AI 返回格式不正确，未找到 elements 数组');
    }
    return parsed.elements;
  });
}

/** 解析 AI 返回的内容（兼容裸数组和 {elements: [...]} 两种） */
function parseAIContent(content) {
  var raw = content.trim();
  // 有些模型即使指定 json_object 也会包 ```json
  if (raw.indexOf('```') === 0) {
    raw = raw.replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    var obj = JSON.parse(raw);
    if (Array.isArray(obj)) return { elements: obj };
    return obj;
  } catch (e) {
    // 兜底：从字符串里抠 JSON
    var m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (_) { return null; }
    }
    return null;
  }
}

/** 把 AI 返回的元素对象标准化——补全字段、重生成 ID、clamp 边界 */
function normalizeAIElements(rawElements) {
  if (!Array.isArray(rawElements)) return [];
  var CANVAS_W = 1200;
  var result = [];
  rawElements.forEach(function(el, idx) {
    if (!el || typeof el !== 'object') return;
    if (!el.type || ['text','image','video','button','card'].indexOf(el.type) === -1) return;
    var clean = clone(el);
    clean.id = uid();
    // clamp 数值字段
    ['x','y','width','height','fontSize','padding','radius'].forEach(function(k) {
      if (clean[k] != null) {
        var n = Number(clean[k]);
        if (isNaN(n)) delete clean[k]; else clean[k] = Math.max(0, n);
      }
    });
    // 边界保护
    if (clean.x == null) clean.x = 40;
    if (clean.y == null) clean.y = 40 + idx * 20;
    if (clean.width == null) clean.width = 200;
    if (clean.height == null) clean.height = 100;
    if (clean.x + clean.width > CANVAS_W) clean.x = Math.max(0, CANVAS_W - clean.width);
    if (clean.zIndex == null) clean.zIndex = 1;
    result.push(clean);
  });
  return result;
}

/** 把 AI 生成的元素应用到当前页（覆盖） */
function applyAIElementsToCurrentPage(elements) {
  pushHistory();
  currentPage().elements = elements;
  clearSelection();
  renderElements();
  renderPropertyPanel();
}

/** 把 AI 生成的元素应用到新页面 */
function applyAIElementsToNewPage(elements, pageName) {
  pushHistory();
  addPage();
  if (pageName) {
    currentPage().name = pageName;
  }
  currentPage().elements = elements;
  clearSelection();
  renderAll();
}

/** 弹窗：选覆盖当前页 / 新建页 */
function showGenLocationDialog(elements, userPrompt) {
  var overlay = document.createElement('div');
  overlay.className = 'ai-dialog-overlay';
  overlay.innerHTML =
    '<div class="ai-dialog">' +
      '<h4>✨ AI 已生成 ' + elements.length + ' 个模块</h4>' +
      '<p>要应用到哪个页面？<br>' +
        '<span style="color:#9ca3af;">当前页：' + escapeHtml(currentPage().name || '未命名') + '</span></p>' +
      '<div class="ai-dialog-actions">' +
        '<button data-act="cancel">取消</button>' +
        '<button data-act="new">新建页面</button>' +
        '<button data-act="overwrite" class="primary">覆盖当前页</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    var act = e.target.dataset.act;
    if (act === 'overwrite') {
      applyAIElementsToCurrentPage(elements);
      showToast('已覆盖当前页（' + elements.length + ' 个模块）');
      overlay.remove();
    } else if (act === 'new') {
      var name = userPrompt.slice(0, 12) || 'AI 生成页';
      applyAIElementsToNewPage(elements, name);
      showToast('已新建页面：' + name);
      overlay.remove();
    } else if (act === 'cancel' || e.target === overlay) {
      overlay.remove();
    }
  });
}

/** 绑定 AI 面板交互 */
function setupAIPanel() {
  var providerSel = document.getElementById('ai-provider');
  var apiKeyInput = document.getElementById('ai-api-key');
  var promptInput = document.getElementById('ai-prompt');
  var genBtn = document.getElementById('ai-generate-btn');
  var genText = document.getElementById('ai-generate-text');
  var genSpinner = document.getElementById('ai-generate-spinner');
  var statusBox = document.getElementById('ai-status');

  // 加载已保存配置
  var saved = loadAIConfig();
  if (saved) {
    if (saved.apiKey) apiKeyInput.value = saved.apiKey;
    if (saved.provider) providerSel.value = saved.provider;
  }

  function setAIStatus(text, type) {
    if (!text) { statusBox.classList.add('hidden'); statusBox.textContent = ''; return; }
    statusBox.classList.remove('hidden');
    statusBox.textContent = text;
    statusBox.className = 'ai-status ' + type;
  }

  function setGenerating(flag) {
    genBtn.disabled = flag;
    if (flag) {
      genText.textContent = '生成中…';
      genSpinner.classList.remove('hidden');
    } else {
      genText.textContent = '✨ 生成页面';
      genSpinner.classList.add('hidden');
    }
  }

  document.getElementById('ai-save-key').addEventListener('click', function() {
    var cfg = { apiKey: apiKeyInput.value.trim(), provider: providerSel.value };
    if (!cfg.apiKey) { showToast('请先填入 API Key'); return; }
    saveAIConfig(cfg);
    showToast('API 配置已保存到本地');
  });

  document.getElementById('ai-clear-key').addEventListener('click', function() {
    apiKeyInput.value = '';
    clearAIConfig();
    showToast('已清除本地 API 配置');
  });

  genBtn.addEventListener('click', function() {
    var apiKey = apiKeyInput.value.trim();
    var provider = providerSel.value;
    var prompt = promptInput.value.trim();

    if (!apiKey) { setAIStatus('请先填入 API Key', 'error'); return; }
    if (!prompt) { setAIStatus('请描述你想生成的页面', 'error'); return; }

    setGenerating(true);
    setAIStatus('正在调用 ' + (AI_PROVIDERS[provider] || {}).name + '…', 'info');

    callAIGenerator(prompt, apiKey, provider).then(function(elements) {
      var normalized = normalizeAIElements(elements);
      if (normalized.length === 0) {
        setGenerating(false);
        setAIStatus('AI 未返回有效元素，请换一种描述试试', 'error');
        return;
      }
      setGenerating(false);
      setAIStatus('已生成 ' + normalized.length + ' 个模块', 'success');
      showGenLocationDialog(normalized, prompt);
    }).catch(function(err) {
      setGenerating(false);
      var msg = String(err.message || err).slice(0, 300);
      setAIStatus('生成失败：' + msg, 'error');
    });
  });
}

// ==================== 15c. 全局渲染入口 ====================

function renderAll() {
  renderPageList();
  renderElements();
  renderPropertyPanel();
  updateUndoRedoButtons();
  updateCanvasSizeLabel();
}

// ==================== 17. 初始化 ====================

function init() {
  // 尝试加载本地项目
  if (!loadProject()) {
    // 提供示例页面让用户上手
    addSamplePage();
  }

  // 工具栏事件
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-preview').addEventListener('click', togglePreview);
  document.getElementById('btn-export').addEventListener('click', downloadHTML);
  document.getElementById('btn-save').addEventListener('click', function() { saveProject(); });
  document.getElementById('btn-help').addEventListener('click', function() {
    document.getElementById('help-overlay').classList.remove('hidden');
  });
  document.getElementById('help-close').addEventListener('click', function() {
    document.getElementById('help-overlay').classList.add('hidden');
  });

  // 页面管理
  document.getElementById('btn-add-page').addEventListener('click', addPage);

  // 设备切换
  document.getElementById('device-select').addEventListener('change', applyDeviceSize);

  // 模板点击
  setupTemplateClick();
  // 布局模板库
  setupSidebarTabs();
  setupTemplateLibrary();
  // AI 面板
  setupAIPanel();
  // 组件选择弹窗
  setupPicker();
  // 画布交互
  setupCanvasInteraction();

  // 快捷键
  document.addEventListener('keydown', handleKeydown);

  // 首次进入显示帮助
  setTimeout(function() {
    document.getElementById('help-overlay').classList.remove('hidden');
  }, 600);

  renderAll();
}

/** 添加示例页面 */
function addSamplePage() {
  // page_1 已经存在；添加一些示例组件
  var p = state.pages['page_1'];
  p.name = '首页';

  // 标题
  p.elements.push(Object.assign(createElement('text', { x: 40, y: 30, width: 1120, height: 90 }), {
    content: '<h1>欢迎来到拼图编辑器</h1><p class="small">点击左侧组件模板，或在画布上拖拽框选创建模块</p>',
    bgColor: '#ffffff', color: '#1f2937', fontSize: 15, textAlign: 'left', padding: 12
  }));

  // 图片
  p.elements.push(Object.assign(createElement('image', { x: 40, y: 140, width: 540, height: 320 }), {
    src: 'https://picsum.photos/600/400', alt: '示例图片', radius: 8, objectFit: 'cover'
  }));

  // 卡片
  p.elements.push(Object.assign(createElement('card', { x: 620, y: 140, width: 540, height: 320 }), {
    imageSrc: 'https://picsum.photos/400/300',
    title: '快速上手',
    desc: '拖拽组件到画布；点击选中；右下角调整大小。点击右上「预览」按钮查看效果，再点击「导出」保存为独立 HTML 文件。',
    bgColor: '#ffffff', radius: 8
  }));

  // 按钮：跳转到 page_2
  if (state.pages['page_2']) {
    p.elements.push(Object.assign(createElement('button', { x: 40, y: 490, width: 200, height: 50 }), {
      text: '前往第二页',
      bgColor: '#3b82f6', textColor: '#ffffff', fontSize: 15, radius: 8, bold: true,
      link: { type: 'page', target: 'page_2' }
    }));
  }
}

function handleKeydown(e) {
  // 在输入框中不响应
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
    else if (e.key === 's') { e.preventDefault(); saveProject(); }
    else if (e.key === 'c') { e.preventDefault(); copySelected(); }
    else if (e.key === 'v') { e.preventDefault(); pasteClipboard(); }
    else if (e.key === 'd') { e.preventDefault(); duplicateSelected(); }
    else if (e.key === 'a') {
      e.preventDefault();
      // 全选当前页元素
      if (currentElements().length > 0) {
        pushHistory();
        state.selectedElementIds = currentElements().map(function(el) { return el.id; });
        state.selectedElementId = state.selectedElementIds[0];
        renderElements();
        renderPropertyPanel();
      }
    }
    return;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (effectiveSelectedIds().length > 0) {
      e.preventDefault();
      deleteSelectedElements();
    }
  }

  // 方向键微调（1px，shift+方向键 10px）
  var ids = effectiveSelectedIds();
  if (ids.length > 0 && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key) !== -1) {
    e.preventDefault();
    var step = e.shiftKey ? 10 : 1;
    if (!_arrowMoveStarted) { pushHistory(); _arrowMoveStarted = true; }
    ids.forEach(function(id) {
      var el = currentElements().find(function(x) { return x.id === id; });
      if (!el) return;
      if (e.key === 'ArrowLeft') el.x = Math.max(0, el.x - step);
      if (e.key === 'ArrowRight') el.x = el.x + step;
      if (e.key === 'ArrowUp') el.y = Math.max(0, el.y - step);
      if (e.key === 'ArrowDown') el.y = el.y + step;
    });
    renderElements();
    renderPropertyPanel();
  }

  if (e.key === 'Escape') {
    deselectElement();
  }
}

var _arrowMoveStarted = false;
document.addEventListener('keyup', function() { _arrowMoveStarted = false; });

// 启动
document.addEventListener('DOMContentLoaded', function() {
  // 添加示例第二页
  addSampleSecondPage();
  init();
});

/** 添加示例 page_2 给按钮跳转用 */
function addSampleSecondPage() {
  if (!state.pages['page_2']) {
    state.pages['page_2'] = {
      id: 'page_2',
      name: 'page2',
      elements: [
        Object.assign(createElement('text', { x: 40, y: 40, width: 1120, height: 100 }), {
          content: '<h2>这是第二页</h2><p class="small">通过首页按钮跳转到这里。在编辑模式点击下方按钮可设置跳转目标。</p>',
          bgColor: '#ffffff', color: '#1f2937', fontSize: 15, textAlign: 'left', padding: 12
        }),
        Object.assign(createElement('button', { x: 40, y: 180, width: 200, height: 50 }), {
          text: '返回首页',
          bgColor: '#10b981', textColor: '#ffffff', fontSize: 15, radius: 8, bold: true,
          link: { type: 'page', target: 'page_1' }
        })
      ]
    };
  }
}
