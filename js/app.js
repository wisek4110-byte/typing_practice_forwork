/* ============================================================
   앱 시작점: 시트1 / 시트2 / 시트3 구성과 연결
   ============================================================ */
var App = (function () {

  var stage, sheets = {}, active = '시트1';
  var selectedId = null;
  var customList = [];
  var customOver = 0;

  var nameBox, formulaValue;

  /* ---------------- 수식 입력줄 ---------------- */
  function onSelect(r, c, cell, sheet) {
    nameBox.textContent = sheet ? sheet.rangeLabel() : U.colName(c) + (r + 1);
    formulaValue.textContent = cell.f || cell.v || '';
  }

  /* ---------------- 시트 전환 ---------------- */
  function buildTabs() {
    var wrap = U.$('#tabs');
    ['시트1', '시트2', '시트3'].forEach(function (name) {
      var b = U.el('button', 'tab', name);
      b.type = 'button';
      b.dataset.name = name;
      b.addEventListener('click', function () { activate(name); });
      wrap.appendChild(b);
    });
  }

  function activate(name) {
    active = name;
    Object.keys(sheets).forEach(function (k) { sheets[k].show(k === name); });
    Array.prototype.forEach.call(U.$('#tabs').children, function (b) {
      b.classList.toggle('is-active', b.dataset.name === name);
    });
    var s = sheets[name];
    onSelect(s.sel.r, s.sel.c, s.getCell(s.sel.r, s.sel.c), s);
    if (name === '시트1') Typing.refocus();
  }

  /* ---------------- 글 선택 도구 ---------------- */
  function textById(id) {
    for (var i = 0; i < TEXTS.length; i++) if (TEXTS[i].id === id) return TEXTS[i];
    return null;
  }

  /* 시트2의 내용을 연습용 글로 변환.
     열 하나가 글 하나가 되고, 그 열의 셀이 위에서부터 한 줄씩이다.
     용량을 생각해 한 번에 5개까지만 쓴다. */
  var CUSTOM_MAX = 5;

  function buildCustomList() {
    var s2 = sheets['시트2'];
    var out = [], over = 0;
    for (var c = 0; c < s2.cols; c++) {
      var lines = [];
      for (var r = 0; r < s2.rows; r++) {
        var v = s2.data[r][c].v;
        if (v !== '') lines = lines.concat(U.wrapLine(v, 46));
      }
      if (!lines.length) continue;
      if (out.length >= CUSTOM_MAX) { over++; continue; }
      out.push({
        id: 'custom:' + c,
        col: c,
        title: '커스텀 글 ' + U.colName(c),
        author: '',
        lines: lines
      });
    }
    customOver = over;
    return out;
  }

  function customById(id) {
    for (var i = 0; i < customList.length; i++) {
      if (customList[i].id === id) return customList[i];
    }
    return null;
  }

  function applyText(text, id) {
    selectedId = id;
    U.save('selected', id);
    U.$('#textPickerLabel').textContent = text ? text.title : '기본값';
    U.$('#textPickerBtn').title = text
      ? ('연습할 글: ' + text.title + (text.author ? ' · ' + text.author : ''))
      : '연습할 글 선택';
    Typing.setText(text);
  }

  function selectText(id) {
    if (id.indexOf('custom:') === 0) {
      customList = buildCustomList();
      var c = customById(id);
      if (c) applyText(c, c.id);
      return;
    }
    var t = textById(id) || TEXTS[0];
    applyText(t, t.id);
  }

  function openTextPicker() {
    var btn = U.$('#textPickerBtn');
    var dd = U.el('div', 'dropdown');
    dd.appendChild(U.el('div', 'dropdown__label', '연습할 글'));

    function item(id, title, sub, enabled) {
      var b = U.el('button', 'dropdown__item');
      b.type = 'button';
      var chk = U.el('span', 'dropdown__check', selectedId === id ? '✓' : '');
      var main = U.el('span', 'dropdown__main', title);
      var s = U.el('span', 'dropdown__sub', sub);
      b.appendChild(chk); b.appendChild(main); b.appendChild(s);
      if (enabled === false) {
        b.disabled = true;
      } else {
        b.addEventListener('click', function () {
          Chrome.hideDropdown();
          selectText(id);
          activate('시트1');
        });
      }
      return b;
    }

    TEXTS.forEach(function (t) {
      dd.appendChild(item(t.id, t.title,
        (t.author ? t.author + ' · ' : '') + t.lines.length + '줄'));
    });

    dd.appendChild(U.el('div', 'dropdown__sep'));
    dd.appendChild(U.el('div', 'dropdown__label', '시트2 (열 하나에 글 하나, 최대 ' + CUSTOM_MAX + '개)'));
    customList = buildCustomList();
    if (customList.length) {
      customList.forEach(function (t) {
        dd.appendChild(item(t.id, t.title, t.lines.length + '줄'));
      });
      if (customOver) {
        dd.appendChild(item('over', '글이 ' + CUSTOM_MAX + '개를 넘었습니다',
          U.colName(CUSTOM_MAX) + '열 뒤는 안 씁니다', false));
      }
    } else {
      dd.appendChild(item('custom:none', '시트2가 비어 있음', '아무 셀에나 붙여넣으세요', false));
    }

    Chrome.showDropdown(btn, dd);
  }

  /* ---------------- 시트3 사용방법 ---------------- */
  var GUIDE = [
    ['t', '시트형 타자연습 · 사용 방법'],
    ['', ''],
    ['h', '시트1  기본 타자 연습'],
    ['b', '회색 글줄 바로 아래 빈 칸에 같은 내용을 입력합니다.'],
    ['b', 'Enter 를 누르면 다음 줄의 입력칸으로 넘어갑니다.'],
    ['b', '줄을 끝까지 입력했다면 Space 로도 다음 줄로 넘어갑니다.'],
    ['b', '지금 치는 글줄과 입력칸에는 색이 깔리고 글자가 굵게 나옵니다.'],
    ['b', '입력을 마친 줄은 업무용 데이터로 바뀌어 표시됩니다.'],
    ['b', '바뀐 셀을 클릭하면 수식 입력줄에 함수가 보입니다.'],
    ['b', '마지막 줄까지 마치면 결과 창이 열립니다. Enter 로 닫습니다.'],
    ['', ''],
    ['h', '시트2  내 글 넣기'],
    ['b', '아무 셀에나 원하는 글을 붙여넣거나(Ctrl+V) 직접 입력합니다.'],
    ['b', '넣은 내용은 그대로 시트1의 연습 글이 됩니다.'],
    ['b', '한 행이 연습 글의 한 줄이 되고, 너무 긴 줄은 어절 단위로 나뉩니다.'],
    ['b', '열 하나가 글 하나입니다. A열, B열... 에 따로 넣으면 최대 5개까지 만들어집니다.'],
    ['b', '만든 글은 툴바의 글 선택 도구에서 골라 씁니다.'],
    ['', ''],
    ['h', '시트2  여러 칸 선택과 지우기'],
    ['b', '셀을 끌면 여러 칸이 한 번에 선택됩니다.'],
    ['b', '열 머리글(A, B...)을 누르면 그 열 전체, 행 머리글은 그 행 전체가 선택됩니다.'],
    ['b', '왼쪽 위 모서리를 누르거나 Ctrl+A 를 누르면 시트 전체가 선택됩니다.'],
    ['b', 'Shift+방향키로도 범위를 넓힐 수 있고, Delete 로 한 번에 지웁니다.'],
    ['', ''],
    ['h', '글 선택 도구'],
    ['b', '툴바에서 글꼴 자리에 있는 목록이 글 선택 도구입니다.'],
    ['b', '내장된 글과 시트2 커스텀 글 중에서 고를 수 있습니다.'],
    ['b', '창이 좁아져도 글 선택 도구는 접히지 않고 그대로 보입니다.'],
    ['', ''],
    ['h', '글자 크기'],
    ['b', '툴바의 - 10 + 에서 10 ~ 24pt 로 바꿉니다.'],
    ['b', '숫자 칸에 직접 넣거나 위/아래 방향키로도 조절됩니다.'],
    ['b', '글자가 커지면 행 높이도 같이 커집니다.'],
    ['', ''],
    ['h', '타임어택'],
    ['b', 'Ctrl + X : 타임어택 시작 (레벨 선택 창이 열립니다)'],
    ['b', 'Ctrl + X : 진행 중에 다시 누르면 일시정지 / 계속하기'],
    ['b', 'Esc 또는 [중단] 버튼 : 중단하고 결과 보기'],
    ['b', '시작 2초 뒤부터 글이 왼쪽에서 오른쪽으로 사라집니다.'],
    ['b', '1단계 50타 · 2단계 90타 · 3단계 150타'],
    ['b', '한 줄이 모두 사라지면 강제로 다음 줄로 넘어갑니다.'],
    ['', ''],
    ['h', '제목과 프로필'],
    ['b', '문서 제목을 더블클릭하면 이름을 바꿀 수 있습니다.'],
    ['b', '오른쪽 위 프로필을 클릭하면 아이디(10자 이내)와'],
    ['b', '사진(10MB 이하)을 설정할 수 있습니다.'],
    ['', ''],
    ['h', '기록 계산'],
    ['b', '타수는 한글 자모 단위로 셉니다. 겹자음·겹모음·겹받침은 2타입니다.'],
    ['b', '정확도는 글줄과 입력한 글을 글자 단위로 맞춰 계산합니다.']
  ];

  function fillGuide(sheet) {
    var r = 1;
    GUIDE.forEach(function (row) {
      var kind = row[0], text = row[1];
      if (kind === '') { r++; return; }
      var cls = kind === 't' ? 'is-title' : (kind === 'h' ? 'is-bold' : 'is-muted');
      sheet.setCell(r, kind === 'b' ? 1 : 0, (kind === 'b' ? '· ' : '') + text, { cls: cls });
      r++;
    });
  }

  /* ---------------- 시트2 안내 ---------------- */
  function updateHint(sheet, hintEl) {
    var empty = sheet.toLines().length === 0;
    hintEl.style.display = empty ? '' : 'none';
  }

  /* ---------------- 글자 크기 (10~24) ---------------- */
  function initFontSize() {
    var field = U.$('#fontSize');

    function apply(pt, save) {
      var v = applyFontPt(pt, sheets);
      field.value = String(v);
      if (save !== false) U.save('fontPt', v);
      /* 행 높이가 바뀌었으니 지금 치는 줄이 계속 보이도록 맞춘다 */
      if (active === '시트1') Typing.reveal();
      return v;
    }

    U.$('#fontDown').addEventListener('click', function () {
      apply(fontPt - 1); Typing.refocus();
    });
    U.$('#fontUp').addEventListener('click', function () {
      apply(fontPt + 1); Typing.refocus();
    });
    field.addEventListener('keydown', function (e) {
      if (e.isComposing) return;
      if (e.key === 'Enter') { e.preventDefault(); apply(+field.value); field.blur(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); apply(fontPt + 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); apply(fontPt - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); field.value = String(fontPt); field.blur(); }
    });
    field.addEventListener('blur', function () { apply(+field.value); });
    field.addEventListener('focus', function () { field.select(); });

    apply(U.load('fontPt', 10), false);
  }

  /* ---------------- 전역 단축키 ---------------- */
  function initKeys() {
    document.addEventListener('keydown', function (e) {
      var ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && (e.key === 'x' || e.key === 'X' || e.key === 'ㅌ')) {
        /* 시트2에서 셀을 편집 중이면 일반 잘라내기를 방해하지 않는다 */
        if (sheets['시트2'].editing) return;
        e.preventDefault();
        if (active !== '시트1') activate('시트1');
        Typing.hotkey();
        return;
      }

      if (e.key === 'Escape') {
        if (Chrome.modalOpen()) return;         /* 팝업은 각자 처리 */
        if (Typing.isAttackActive()) {
          e.preventDefault();
          Typing.stopAttack();
        }
      }
    });
  }

  /* ---------------- 시작 ---------------- */
  function init() {
    stage = U.$('#sheetStage');
    nameBox = U.$('#nameBox');
    formulaValue = U.$('#formulaValue');

    Chrome.init();

    /* 시트1 : 타자 연습 */
    sheets['시트1'] = new Sheet({ name: '시트1', rows: 60, editable: false,
      onSelect: function (r, c, cell, sheet) {
        onSelect(r, c, cell, sheet);
        Typing.refocus();
      } });

    /* 시트2 : 붙여넣기 */
    var hint = U.el('div', 'sheethint');
    hint.innerHTML =
      '아무 셀에나 원하는 글을 붙여넣으세요. <b>(Ctrl+V)</b><br>' +
      '넣은 내용이 그대로 <b>시트1</b>의 연습 글이 됩니다.<br><br>' +
      '<b>열 하나가 글 하나</b>입니다. A열, B열... 에 따로 넣으면 최대 <b>5개</b>까지 만들어지고,<br>' +
      '툴바의 글 선택 도구에서 골라 쓸 수 있습니다.<br><br>' +
      '지울 때는 <b>끌어서 여러 칸을 선택</b>하거나 <b>열 머리글(A, B...)을 클릭</b>한 뒤 Delete 를 누르세요.<br>' +
      'Ctrl+A 로 전체 선택, Shift+방향키로도 넓힐 수 있습니다.';
    sheets['시트2'] = new Sheet({
      name: '시트2', rows: 60, editable: true,
      onSelect: onSelect,
      onChange: function (r0, c0) {
        var s2 = sheets['시트2'];
        updateHint(s2, hint);
        var cells = [];
        for (var r = 0; r < s2.rows; r++) {
          for (var c = 0; c < s2.cols; c++) {
            if (s2.data[r][c].v !== '') cells.push([r, c, s2.data[r][c].v]);
          }
        }
        U.save('sheet2', cells);

        customList = buildCustomList();
        /* 방금 손댄 열의 글을 시트1로 보낸다.
           그 열을 비웠으면 남은 커스텀 글, 그마저 없으면 내장 글로 돌아간다. */
        var target = null, i;
        for (i = 0; i < customList.length; i++) {
          if (customList[i].col === c0) { target = customList[i]; break; }
        }
        if (target) applyText(target, target.id);
        else if (customList.length) applyText(customList[0], customList[0].id);
        else if (selectedId && selectedId.indexOf('custom:') === 0) {
          applyText(TEXTS[0], TEXTS[0].id);
        }
      }
    });

    /* 시트3 : 사용방법 */
    sheets['시트3'] = new Sheet({ name: '시트3', rows: 60, editable: false, onSelect: onSelect });

    ['시트1', '시트2', '시트3'].forEach(function (k) { sheets[k].mount(stage); });
    sheets['시트2'].area.appendChild(hint);

    fillGuide(sheets['시트3']);
    sheets['시트3'].select(0, 0, true);

    Typing.attach(sheets['시트1'], stage);

    /* 저장된 시트2 내용 복원 */
    var saved = U.load('sheet2', []);
    if (saved && saved.length) {
      var maxR = 0;
      saved.forEach(function (t) { if (t[0] > maxR) maxR = t[0]; });
      sheets['시트2'].ensureRows(maxR + 10);
      saved.forEach(function (t) { sheets['시트2'].setCell(t[0], t[1], t[2]); });
      sheets['시트2'].select(0, 0, true);
    }
    updateHint(sheets['시트2'], hint);

    /* 연습할 글 결정 */
    customList = buildCustomList();
    var want = U.load('selected', TEXTS[0].id);
    var wantCustom = (typeof want === 'string' && want.indexOf('custom:') === 0)
      ? customById(want) : null;
    if (wantCustom) applyText(wantCustom, wantCustom.id);
    else {
      var t0 = textById(want) || TEXTS[0];
      applyText(t0, t0.id);
    }

    buildTabs();
    U.$('#textPickerBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      openTextPicker();
    });

    initFontSize();
    initKeys();
    activate('시트1');
  }

  return {
    init: init,
    refocus: function () { if (active === '시트1') Typing.refocus(); else sheets[active].focusCatcher(); }
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
