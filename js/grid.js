/* ============================================================
   시트 그리드
   - 셀 크기는 창 크기와 무관하게 항상 고정(--col-w / --row-h).
   - 내용이 길면 실제 시트처럼 오른쪽 빈 셀 위로 흘러넘친다.
   ============================================================ */
var COL_W = 100;
var ROW_H = 21;

function Sheet(opts) {
  this.name = opts.name;
  this.cols = opts.cols || 26;
  this.rows = 0;
  this.editable = !!opts.editable;
  this.onSelect = opts.onSelect || function () {};
  this.onChange = opts.onChange || function () {};
  this.data = [];
  this.els = [];
  this.sel = { r: 0, c: 0 };
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
    self.select(r, c);
    if (!inEditor && self.editable && !self.editing) self.focusCatcher();
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
    this.data.push(rowData);
    this.els.push(rowEls);
    hfrag.appendChild(U.el('div', 'rh', String(r + 1)));
  }
  this.canvas.appendChild(frag);
  this.rowheadInner.appendChild(hfrag);
  this.rows = n;
  this.canvas.style.width = (this.cols * COL_W) + 'px';
  this.canvas.style.height = (this.rows * ROW_H) + 'px';
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

/* ---------- 선택 ---------- */
Sheet.prototype.select = function (r, c, silent) {
  r = Math.max(0, Math.min(r, this.rows - 1));
  c = Math.max(0, Math.min(c, this.cols - 1));
  var prev = this.cellEl(this.sel.r, this.sel.c);
  if (prev) prev.classList.remove('is-sel');
  this.colheadInner.children[this.sel.c] &&
    this.colheadInner.children[this.sel.c].classList.remove('is-active');
  this.rowheadInner.children[this.sel.r] &&
    this.rowheadInner.children[this.sel.r].classList.remove('is-active');

  this.sel = { r: r, c: c };
  var cur = this.cellEl(r, c);
  if (cur) cur.classList.add('is-sel');
  this.colheadInner.children[c] && this.colheadInner.children[c].classList.add('is-active');
  this.rowheadInner.children[r] && this.rowheadInner.children[r].classList.add('is-active');

  if (!silent) this.onSelect(r, c, this.getCell(r, c));
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
  this.onChange();
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

Sheet.prototype._catcherKey = function (e) {
  if (this.editing) return;
  var k = e.key;
  if (k === 'ArrowDown') { e.preventDefault(); this.moveSel(1, 0); return; }
  if (k === 'ArrowUp') { e.preventDefault(); this.moveSel(-1, 0); return; }
  if (k === 'ArrowRight') { e.preventDefault(); this.moveSel(0, 1); return; }
  if (k === 'ArrowLeft') { e.preventDefault(); this.moveSel(0, -1); return; }
  if (k === 'Enter') { e.preventDefault(); this.startEdit(this.sel.r, this.sel.c, null); return; }
  if (k === 'F2') { e.preventDefault(); this.startEdit(this.sel.r, this.sel.c, null); return; }
  if (k === 'Delete' || k === 'Backspace') {
    e.preventDefault();
    this.setCell(this.sel.r, this.sel.c, '');
    this.onChange();
    return;
  }
  if (k === 'Tab') { e.preventDefault(); this.moveSel(0, e.shiftKey ? -1 : 1); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k.length === 1) { e.preventDefault(); this.startEdit(this.sel.r, this.sel.c, k); }
};

/* 여러 줄/여러 칸 붙여넣기 → 선택 셀부터 아래로 채운다. */
Sheet.prototype._paste = function (e) {
  var text = (e.clipboardData || window.clipboardData).getData('text');
  if (!text) return;
  e.preventDefault();
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
  this.onChange();
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
