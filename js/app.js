/* ============================================================
   앱 시작점: 시트1 / 시트2 / 시트3 구성과 연결
   ============================================================ */
var App = (function () {

  var stage, sheets = {}, active = '시트1';
  var selectedId = null;
  var customCache = null;

  var nameBox, formulaValue;

  /* ---------------- 수식 입력줄 ---------------- */
  function onSelect(r, c, cell) {
    nameBox.textContent = U.colName(c) + (r + 1);
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
    onSelect(s.sel.r, s.sel.c, s.getCell(s.sel.r, s.sel.c));
    if (name === '시트1') Typing.refocus();
  }

  /* ---------------- 글 선택 도구 ---------------- */
  function textById(id) {
    for (var i = 0; i < TEXTS.length; i++) if (TEXTS[i].id === id) return TEXTS[i];
    return null;
  }

  /* 시트2의 내용을 연습용 글로 변환 */
  function buildCustom() {
    var raw = sheets['시트2'].toLines();
    var lines = [];
    raw.forEach(function (l) {
      lines = lines.concat(U.wrapLine(l, 46));
    });
    if (!lines.length) return null;
    return { id: 'custom', title: '시트2 커스텀 글', author: '직접 입력', lines: lines };
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
    if (id === 'custom') {
      customCache = buildCustom();
      if (customCache) applyText(customCache, 'custom');
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
    dd.appendChild(U.el('div', 'dropdown__label', '시트2'));
    customCache = buildCustom();
    if (customCache) {
      dd.appendChild(item('custom', '시트2 커스텀 글', customCache.lines.length + '줄'));
    } else {
      dd.appendChild(item('custom', '시트2 커스텀 글', '시트2가 비어 있음', false));
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
    ['b', '입력을 마친 줄은 업무용 데이터로 바뀌어 표시됩니다.'],
    ['b', '바뀐 셀을 클릭하면 수식 입력줄에 함수가 보입니다.'],
    ['b', '마지막 줄까지 마치면 결과 창이 열립니다. Enter 로 닫습니다.'],
    ['', ''],
    ['h', '시트2  내 글 넣기'],
    ['b', '아무 셀에나 원하는 글을 붙여넣거나(Ctrl+V) 직접 입력합니다.'],
    ['b', '넣은 내용은 그대로 시트1의 연습 글이 됩니다.'],
    ['b', '한 행이 연습 글의 한 줄이 되고, 너무 긴 줄은 어절 단위로 나뉩니다.'],
    ['', ''],
    ['h', '글 선택 도구'],
    ['b', '툴바에서 글꼴 자리에 있는 목록이 글 선택 도구입니다.'],
    ['b', '내장된 글과 시트2 커스텀 글 중에서 고를 수 있습니다.'],
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
    sheets['시트1'] = new Sheet({ name: '시트1', rows: 60, editable: false, onSelect: function (r, c, cell) {
      onSelect(r, c, cell);
      Typing.refocus();
    } });

    /* 시트2 : 붙여넣기 */
    var hint = U.el('div', 'sheethint');
    hint.innerHTML =
      '아무 셀에나 원하는 글을 붙여넣으세요. <b>(Ctrl+V)</b><br>' +
      '넣은 내용이 그대로 <b>시트1</b>의 연습 글이 됩니다.';
    sheets['시트2'] = new Sheet({
      name: '시트2', rows: 60, editable: true,
      onSelect: onSelect,
      onChange: function () {
        var s2 = sheets['시트2'];
        updateHint(s2, hint);
        var cells = [];
        for (var r = 0; r < s2.rows; r++) {
          for (var c = 0; c < s2.cols; c++) {
            if (s2.data[r][c].v !== '') cells.push([r, c, s2.data[r][c].v]);
          }
        }
        U.save('sheet2', cells);
        customCache = buildCustom();
        if (customCache) {
          applyText(customCache, 'custom');
        } else if (selectedId === 'custom') {
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
    customCache = buildCustom();
    var want = U.load('selected', TEXTS[0].id);
    if (want === 'custom' && customCache) applyText(customCache, 'custom');
    else applyText(textById(want) || TEXTS[0], (textById(want) || TEXTS[0]).id);

    buildTabs();
    U.$('#textPickerBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      openTextPicker();
    });

    initKeys();
    activate('시트1');
  }

  return {
    init: init,
    refocus: function () { if (active === '시트1') Typing.refocus(); else sheets[active].focusCatcher(); }
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
