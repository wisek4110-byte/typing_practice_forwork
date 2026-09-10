/* ============================================================
   시트 그리드
   - 셀 크기는 창 크기와 무관하게 항상 고정(--col-w / --row-h).
   - 내용이 길면 실제 시트처럼 오른쪽 빈 셀 위로 흘러넘친다.
   ============================================================ */
var COL_W = 100;
var ROW_H = 21;

/* 셀 글자 크기(pt). 툴바의 - [10] + 로 10~24 사이에서 바꾼다.
   실제 시트처럼 글자가 커지면 행 높이도 같이 커진다. */
var FONT_MIN = 10, FONT_MAX = 24;
var fontPt = 10;

function applyFontPt(pt, sheets) {
  fontPt = Math.max(FONT_MIN, Math.min(FONT_MAX, Math.round(pt) || FONT_MIN));
  var px = Math.round(fontPt * 4 / 3);
  ROW_H = Math.max(21, px + 8);
  var root = document.documentElement.style;
  root.setProperty('--cell-fs', px + 'px');
  root.setProperty('--row-h', ROW_H + 'px');
  if (sheets) {
    for (var k in sheets) {
      if (Object.prototype.hasOwnProperty.call(sheets, k)) sheets[k].resizeRows();
    }
  }
  return fontPt;
}

function Sheet(opts) {
  this.name = opts.name;
  this.cols = opts.cols || 26;
  this.rows = 0;
  this.editable = !!opts.editable;
  this.pasteMode = opts.pasteMode || 'grid';   /* 'cell' 이면 붙여넣은 글 전체가 한 칸에 */
  this.onSelect = opts.onSelect || function () {};
  this.onChange = opts.onChange || function () {};
  this.data = [];
  this.els = [];
  this.rowEls = [];
  this.sel = { r: 0, c: 0 };     /* 활성 셀 */
  this.anchor = { r: 0, c: 0 };  /* 범위의 시작점 */
  this.editing = null;
  this._build();
  this.ensureRows(opts.rows || 60);
  this.select(0, 0, true);
}

Sheet.prototype._build = function () {
  var self = this;

  var area = U.el('div', 'gridarea');
  area.hidden = true;

  var corner = U.el('div', 'g-corner');

  var colhead = U.el('div', 'g-colhead');
  var colheadInner = U.el('div', 'g-colhead__inner');
  colhead.appendChild(colheadInner);

  var rowhead = U.el('div', 'g-rowhead');
  var rowheadInner = U.el('div', 'g-rowhead__inner');
  rowhead.appendChild(rowheadInner);

  var scroll = U.el('div', 'g-scroll');
  var canvas = U.el('div', 'g-canvas');
  scroll.appendChild(canvas);

  /* 키 입력 수집용(편집 가능 시트에서 방향키/붙여넣기 처리) */
  var catcher = document.createElement('textarea');
  catcher.className = 'keycatcher';
  catcher.setAttribute('aria-hidden', 'true');
  catcher.style.cssText =
    'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;' +
    'border:0;padding:0;resize:none;z-index:1;';

  /* 선택 범위를 덮는 사각형 (셀마다 색을 입히지 않고 한 장으로 그린다) */
  var selBox = U.el('div', 'g-selbox');
  canvas.appendChild(selBox);

  area.appendChild(catcher);
  area.appendChild(scroll);
  area.appendChild(colhead);
  area.appendChild(rowhead);
  area.appendChild(corner);

  /* 열 머리글 */
  for (var c = 0; c < this.cols; c++) {
    var ch = U.el('div', 'ch', U.colName(c));
    colheadInner.appendChild(ch);
  }
  colheadInner.style.width = (this.cols * COL_W) + 'px';

  scroll.addEventListener('scroll', function () {
    colheadInner.style.transform = 'translateX(' + (-scroll.scrollLeft) + 'px)';
    rowheadInner.style.transform = 'translateY(' + (-scroll.scrollTop) + 'px)';
  });

  canvas.addEventListener('mousedown', function (e) {
    var cell = e.target.closest ? e.target.closest('.cell') : null;
    if (!cell || cell.parentNode.parentNode !== canvas) return;
    /* 입력칸 안을 직접 누른 경우가 아니면 기본 포커스 이동을 막는다.
       (막지 않으면 클릭할 때마다 타자 입력칸의 포커스를 빼앗긴다) */
    var inEditor = e.target.classList.contains('celledit') ||
                   e.target.classList.contains('typebox');
    if (!inEditor) e.preventDefault();
    var r = +cell.dataset.r, c = +cell.dataset.c;
    if (self.editing && (self.editing.r !== r || self.editing.c !== c)) self.commitEdit();

    if (e.shiftKey) {
      self.selectRange(self.anchor.r, self.anchor.c, r, c);   /* 시작점 두고 넓히기 */
    } else {
      self.select(r, c);
      if (!inEditor) self._drag = true;                       /* 끌어서 여러 칸 선택 */
    }
    if (!inEditor && self.editable && !self.editing) self.focusCatcher();
  });

  canvas.addEventListener('mousemove', function (e) {
    if (!self._drag) return;
    var cell = e.target.closest ? e.target.closest('.cell') : null;
    if (!cell || cell.parentNode.parentNode !== canvas) return;
    var r = +cell.dataset.r, c = +cell.dataset.c;
    if (r === self.sel.r && c === self.sel.c) return;
    self.selectRange(self.anchor.r, self.anchor.c, r, c);
  });
  document.addEventListener('mouseup', function () { self._drag = false; });

  /* 열/행 머리글을 누르면 그 줄 전체가 선택된다 */
  colhead.addEventListener('mousedown', function (e) {
    var i = Array.prototype.indexOf.call(colheadInner.children, e.target);
    if (i < 0) return;
    e.preventDefault();
    self.selectRange(0, i, self.rows - 1, i);
    self.focusCatcher();
  });
  rowhead.addEventListener('mousedown', function (e) {
    var i = Array.prototype.indexOf.call(rowheadInner.children, e.target);
    if (i < 0) return;
    e.preventDefault();
    self.selectRange(i, 0, i, self.cols - 1);
    self.focusCatcher();
  });
  corner.addEventListener('mousedown', function (e) {
    e.preventDefault();
    self.selectRange(0, 0, self.rows - 1, self.cols - 1);
    self.focusCatcher();
  });

  canvas.addEventListener('dblclick', function (e) {
    if (!self.editable) return;
    var cell = e.target.closest ? e.target.closest('.cell') : null;
    if (!cell) return;
    self.startEdit(+cell.dataset.r, +cell.dataset.c, null);
  });

  if (this.editable) {
    catcher.addEventListener('keydown', function (e) { self._catcherKey(e); });
    catcher.addEventListener('paste', function (e) { self._paste(e); });
  }

  this.area = area;
  this.canvas = canvas;
  this.selBox = selBox;
  this._drag = false;
  this.scroll = scroll;
  this.colheadInner = colheadInner;
  this.rowheadInner = rowheadInner;
  this.catcher = catcher;
};

Sheet.prototype.mount = function (parent) { parent.appendChild(this.area); };

Sheet.prototype.show = function (on) {
  this.area.hidden = !on;
  if (on && this.editable) this.focusCatcher();
};

Sheet.prototype.focusCatcher = function () {
  if (!this.editable || this.editing) return;
  try { this.catcher.focus({ preventScroll: true }); } catch (e) { this.catcher.focus(); }
};

/* ---------- 행 생성 ---------- */
Sheet.prototype.ensureRows = function (n) {
  if (n <= this.rows) return;
  var frag = document.createDocumentFragment();
  var hfrag = document.createDocumentFragment();
  for (var r = this.rows; r < n; r++) {
    var rowEl = U.el('div', 'g-row');
    var rowData = [];
    var rowEls = [];
    for (var c = 0; c < this.cols; c++) {
      var cell = U.el('div', 'cell');
      cell.dataset.r = r; cell.dataset.c = c;
      var t = U.el('span', 'cell__t');
      cell.appendChild(t);
      rowEl.appendChild(cell);
      rowData.push({ v: '', f: null, cls: '', num: false });
      rowEls.push(cell);
    }
    frag.appendChild(rowEl);
    this.rowEls.push(rowEl);
    this.data.push(rowData);
    this.els.push(rowEls);
    hfrag.appendChild(U.el('div', 'rh', String(r + 1)));
  }
  this.canvas.appendChild(frag);
  this.rowheadInner.appendChild(hfrag);
  this.rows = n;
  this.canvas.style.width = (this.cols * COL_W) + 'px';
  this.canvas.style.height = (this.rows * ROW_H) + 'px';
  if (this.selBox) this._paintSelection();
};

/* ---------- 셀 값 ---------- */
Sheet.prototype.cellEl = function (r, c) { return this.els[r] && this.els[r][c]; };

Sheet.prototype.setCell = function (r, c, value, opts) {
  this.ensureRows(r + 1);
  opts = opts || {};
  var d = this.data[r][c];
  var cell = this.els[r][c];
  var t = cell.querySelector('.cell__t');

  d.v = value == null ? '' : String(value);
  d.f = opts.formula || null;
  d.num = !!opts.num;
  d.cls = opts.cls || '';

  cell.className = 'cell' + (d.cls ? ' ' + d.cls : '');
  if (d.v !== '') cell.classList.add('has-text');
  if (d.num) cell.classList.add('is-num');

  if (opts.nodes) {
    t.textContent = '';
    for (var i = 0; i < opts.nodes.length; i++) t.appendChild(opts.nodes[i]);
  } else {
    t.textContent = d.v;
  }
  this._reflowRow(r);
  if (this.sel.r === r && this.sel.c === c) cell.classList.add('is-sel');
  return cell;
};

Sheet.prototype.getCell = function (r, c) {
  return (this.data[r] && this.data[r][c]) || { v: '', f: null };
};

Sheet.prototype.clearRow = function (r) {
  for (var c = 0; c < this.cols; c++) this.setCell(r, c, '');
};

Sheet.prototype.clearAll = function () {
  for (var r = 0; r < this.rows; r++) this.clearRow(r);
};

/* 넘침 폭 계산: 오른쪽으로 내용이 있는 셀 직전까지만 흘려보낸다. */
Sheet.prototype._reflowRow = function (r) {
  var row = this.data[r];
  var next = this.cols;
  for (var c = this.cols - 1; c >= 0; c--) {
    var t = this.els[r][c].querySelector('.cell__t');
    if (row[c].v === '') { t.style.maxWidth = ''; continue; }
    var span = (next - c) * COL_W - 6;
    t.style.maxWidth = span + 'px';
    next = c;
  }
};

/* ---------- 행 강조 ----------
   지금 치고 있는 글줄/입력칸에 색을 깐다. */
Sheet.prototype.setRowMark = function (r, cls) {
  /* canvas 의 첫 자식은 선택 사각형이므로 children 으로 세면 한 칸 밀린다.
     행 엘리먼트를 따로 들고 있다가 그대로 쓴다. */
  var row = this.rowEls[r];
  if (row) row.classList.add(cls);
};
Sheet.prototype.clearRowMarks = function () {
  var rows = this.canvas.querySelectorAll('.g-row.is-target, .g-row.is-entry');
  for (var i = 0; i < rows.length; i++) {
    rows[i].classList.remove('is-target', 'is-entry');
  }
};

/* 글자 크기가 바뀌어 행 높이가 달라졌을 때 전체 높이를 다시 잡는다. */
Sheet.prototype.resizeRows = function () {
  this.canvas.style.height = (this.rows * ROW_H) + 'px';
  this._paintSelection();
};

/* ---------- 선택 ----------
   한 칸 선택은 시작점과 끝점이 같은 범위로 다룬다. */
Sheet.prototype.select = function (r, c, silent) {
  this.selectRange(r, c, r, c, silent);
};

Sheet.prototype.selectRange = function (ar, ac, fr, fc, silent) {
  var clampR = function (v, n) { return Math.max(0, Math.min(v, n - 1)); };
  ar = clampR(ar, this.rows); fr = clampR(fr, this.rows);
  ac = clampR(ac, this.cols); fc = clampR(fc, this.cols);

  var prev = this.cellEl(this.sel.r, this.sel.c);
  if (prev) prev.classList.remove('is-sel');

  this.anchor = { r: ar, c: ac };
  this.sel = { r: fr, c: fc };

  var cur = this.cellEl(fr, fc);
  if (cur) cur.classList.add('is-sel');
  this._paintSelection();

  if (!silent) this.onSelect(fr, fc, this.getCell(fr, fc), this);
};

/* 지금 선택된 범위 (정규화) */
Sheet.prototype.getRange = function () {
  return {
    r1: Math.min(this.anchor.r, this.sel.r), r2: Math.max(this.anchor.r, this.sel.r),
    c1: Math.min(this.anchor.c, this.sel.c), c2: Math.max(this.anchor.c, this.sel.c)
  };
};

Sheet.prototype.rangeLabel = function () {
  var g = this.getRange();
  var a = U.colName(g.c1) + (g.r1 + 1);
  if (g.r1 === g.r2 && g.c1 === g.c2) return a;
  return a + ':' + U.colName(g.c2) + (g.r2 + 1);
};

Sheet.prototype._paintSelection = function () {
  var g = this.getRange();
  var box = this.selBox;
  box.style.left = (g.c1 * COL_W) + 'px';
  box.style.top = (g.r1 * ROW_H) + 'px';
  box.style.width = ((g.c2 - g.c1 + 1) * COL_W - 1) + 'px';
  box.style.height = ((g.r2 - g.r1 + 1) * ROW_H - 1) + 'px';
  box.classList.toggle('is-multi', g.r1 !== g.r2 || g.c1 !== g.c2);

  var i, ch = this.colheadInner.children, rh = this.rowheadInner.children;
  for (i = 0; i < ch.length; i++) ch[i].classList.toggle('is-active', i >= g.c1 && i <= g.c2);
  for (i = 0; i < rh.length; i++) rh[i].classList.toggle('is-active', i >= g.r1 && i <= g.r2);
};

/* 선택한 범위를 한 번에 비운다 (행마다 넘침 계산은 한 번씩만) */
Sheet.prototype.clearRange = function () {
  var g = this.getRange(), r, c, touched = false;
  for (r = g.r1; r <= g.r2; r++) {
    var rowTouched = false;
    for (c = g.c1; c <= g.c2; c++) {
      var d = this.data[r][c];
      if (d.v === '' && !d.f && !d.cls) continue;
      d.v = ''; d.f = null; d.num = false; d.cls = '';
      var cell = this.els[r][c];
      cell.className = 'cell';
      cell.querySelector('.cell__t').textContent = '';
      rowTouched = true;
    }
    if (rowTouched) { this._reflowRow(r); touched = true; }
  }
  var cur = this.cellEl(this.sel.r, this.sel.c);
  if (cur) cur.classList.add('is-sel');
  return touched;
};

/* 긴 문장을 칠 때 커서 위치가 화면 밖으로 나가지 않게 가로로 따라간다. */
Sheet.prototype.revealX = function (x, pad) {
  pad = pad == null ? 140 : pad;
  var sc = this.scroll, view = sc.clientWidth;
  if (x > sc.scrollLeft + view - pad) sc.scrollLeft = x - view + pad;
  else if (x < sc.scrollLeft + pad) sc.scrollLeft = Math.max(0, x - pad);
};

Sheet.prototype.revealRow = function (r, pad) {
  pad = pad == null ? 3 : pad;
  var top = r * ROW_H;
  var view = this.scroll.clientHeight;
  if (top < this.scroll.scrollTop + pad * ROW_H) {
    this.scroll.scrollTop = Math.max(0, top - pad * ROW_H);
  } else if (top + ROW_H > this.scroll.scrollTop + view - pad * ROW_H) {
    this.scroll.scrollTop = top + ROW_H - view + pad * ROW_H;
  }
};

/* ---------- 편집(시트2) ---------- */
Sheet.prototype.startEdit = function (r, c, seed) {
  if (!this.editable) return;
  if (this.editing) this.commitEdit();
  this.select(r, c);
  var cell = this.cellEl(r, c);
  var t = cell.querySelector('.cell__t');
  var input = document.createElement('input');
  input.className = 'celledit';
  input.value = seed != null ? seed : this.data[r][c].v;
  var wide = (this.cols - c) * COL_W - 4;
  input.style.width = Math.max(COL_W - 4, Math.min(wide, 520)) + 'px';
  t.style.visibility = 'hidden';
  cell.appendChild(input);
  this.editing = { r: r, c: c, input: input };
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  var self = this;
  input.addEventListener('keydown', function (e) {
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault(); self.commitEdit(); self.moveSel(1, 0);
    } else if (e.key === 'Tab') {
      e.preventDefault(); self.commitEdit(); self.moveSel(0, e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault(); self.cancelEdit();
    }
  });
  input.addEventListener('blur', function () { if (self.editing) self.commitEdit(); });
};

Sheet.prototype.commitEdit = function () {
  if (!this.editing) return;
  var e = this.editing;
  this.editing = null;
  var v = e.input.value;
  e.input.remove();
  var t = this.cellEl(e.r, e.c).querySelector('.cell__t');
  t.style.visibility = '';
  this.setCell(e.r, e.c, v);
  this.onChange(e.r, e.c);
  this.focusCatcher();
};

Sheet.prototype.cancelEdit = function () {
  if (!this.editing) return;
  var e = this.editing;
  this.editing = null;
  e.input.remove();
  this.cellEl(e.r, e.c).querySelector('.cell__t').style.visibility = '';
  this.focusCatcher();
};

Sheet.prototype.moveSel = function (dr, dc) {
  this.ensureRows(Math.max(this.rows, this.sel.r + dr + 1));
  this.select(this.sel.r + dr, this.sel.c + dc);
  this.revealRow(this.sel.r, 1);
};

var ARROWS = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] };

Sheet.prototype._catcherKey = function (e) {
  if (this.editing) return;
  var k = e.key;

  if (ARROWS[k]) {
    e.preventDefault();
    var d = ARROWS[k];
    if (e.shiftKey) this.extendSel(d[0], d[1]);   /* Shift+방향키로 범위 넓히기 */
    else this.moveSel(d[0], d[1]);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (k === 'a' || k === 'A' || k === 'ㅁ')) {
    e.preventDefault();
    this.selectRange(0, 0, this.rows - 1, this.cols - 1);
    return;
  }
  if (k === 'Enter' || k === 'F2') {
    e.preventDefault(); this.startEdit(this.sel.r, this.sel.c, null); return;
  }
  if (k === 'Delete' || k === 'Backspace') {
    e.preventDefault();
    if (this.clearRange()) this.onChange(this.sel.r, this.getRange().c1);
    return;
  }
  if (k === 'Escape') { e.preventDefault(); this.select(this.sel.r, this.sel.c); return; }
  if (k === 'Tab') { e.preventDefault(); this.moveSel(0, e.shiftKey ? -1 : 1); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k.length === 1) { e.preventDefault(); this.startEdit(this.sel.r, this.sel.c, k); }
};

/* 시작점은 두고 끝점만 움직여 범위를 넓힌다 */
Sheet.prototype.extendSel = function (dr, dc) {
  this.ensureRows(Math.max(this.rows, this.sel.r + dr + 1));
  this.selectRange(this.anchor.r, this.anchor.c, this.sel.r + dr, this.sel.c + dc);
  this.revealRow(this.sel.r, 1);
};

Sheet.prototype._paste = function (e) {
  var text = (e.clipboardData || window.clipboardData).getData('text');
  if (!text) return;
  e.preventDefault();

  /* 글 한 편을 한 칸에 담는 방식 (시트2). 줄로 쪼개지 않는다. */
  if (this.pasteMode === 'cell') {
    var one = text.replace(/\s+/g, ' ').trim();
    if (!one) return;
    this.setCell(this.sel.r, this.sel.c, one);
    this.select(this.sel.r, this.sel.c);
    this.onChange(this.sel.r, this.sel.c);
    return;
  }

  /* 여러 줄/여러 칸 붙여넣기 → 선택 셀부터 아래로 채운다. */
  var rows = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  while (rows.length && rows[rows.length - 1] === '') rows.pop();
  var r0 = this.sel.r, c0 = this.sel.c;
  this.ensureRows(r0 + rows.length + 10);
  for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].split('\t');
    for (var j = 0; j < cells.length && c0 + j < this.cols; j++) {
      this.setCell(r0 + i, c0 + j, cells[j].trim());
    }
  }
  this.select(Math.min(r0 + rows.length, this.rows - 1), c0);
  this.revealRow(this.sel.r, 1);
  this.onChange(r0, c0);
};

/* 시트 전체를 줄 배열로 (시트2 → 시트1 전달용) */
Sheet.prototype.toLines = function () {
  var out = [];
  for (var r = 0; r < this.rows; r++) {
    var parts = [];
    for (var c = 0; c < this.cols; c++) {
      var v = this.data[r][c].v;
      if (v !== '') parts.push(v);
    }
    if (parts.length) out.push(parts.join(' '));
  }
  return out;
};
