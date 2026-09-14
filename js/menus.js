/* ============================================================
   메뉴바 (파일 · 수정 · 보기 …)
   - 실제 시트처럼 보이게 항목을 갖춰 둔다.
   - 실제로 동작하는 것은 파일 > 새 문서 안의 위장표 선택뿐이고,
     나머지는 눌러도 메뉴만 닫힌다.
   ============================================================ */
var Menus = (function () {

  var SEP = { sep: true };

  var DATA = {
    '파일': [
      { label: '새 문서', icon: 'doc', sub: 'disguise' },
      { label: '열기', icon: 'folder', hint: 'Ctrl+O' },
      { label: '가져오기', icon: 'import' },
      { label: '사본 만들기', icon: 'copy' },
      SEP,
      { label: '공유', icon: 'share', arrow: true },
      { label: '이메일', icon: 'mail', arrow: true },
      { label: '다운로드', icon: 'down', arrow: true },
      SEP,
      { label: '이름 바꾸기', icon: 'rename' },
      { label: '이동', icon: 'move' },
      { label: 'Drive에 바로가기 추가', icon: 'shortcut' },
      { label: '휴지통으로 이동', icon: 'trash', off: true },
      SEP,
      { label: '버전 기록', icon: 'history', arrow: true },
      { label: '오프라인 사용 설정', icon: 'offline' },
      SEP,
      { label: '세부정보', icon: 'info' },
      { label: '보안 제한사항', icon: 'lock' },
      { label: '설정', icon: 'gear' },
      SEP,
      { label: '인쇄', icon: 'print', hint: 'Ctrl+P' }
    ],
    '수정': [
      { label: '실행취소', hint: 'Ctrl+Z' },
      { label: '다시실행', hint: 'Ctrl+Y' },
      SEP,
      { label: '잘라내기', hint: 'Ctrl+X' },
      { label: '복사', hint: 'Ctrl+C' },
      { label: '붙여넣기', hint: 'Ctrl+V' },
      { label: '서식만 붙여넣기', hint: 'Ctrl+Shift+V' },
      SEP,
      { label: '모두 선택', hint: 'Ctrl+A' },
      { label: '찾기 및 바꾸기', hint: 'Ctrl+H' },
      SEP,
      { label: '삭제', arrow: true }
    ],
    '보기': [
      { label: '표시', arrow: true },
      { label: '고정', arrow: true },
      { label: '그룹', arrow: true },
      SEP,
      { label: '눈금선' },
      { label: '보호된 범위' },
      SEP,
      { label: '확대/축소', arrow: true },
      { label: '전체화면' }
    ],
    '삽입': [
      { label: '셀', arrow: true },
      { label: '행', arrow: true },
      { label: '열', arrow: true },
      { label: '시트', hint: 'Shift+F11' },
      SEP,
      { label: '차트' },
      { label: '표' },
      { label: '이미지', arrow: true },
      SEP,
      { label: '함수', arrow: true },
      { label: '링크', hint: 'Ctrl+K' },
      { label: '댓글', hint: 'Ctrl+Alt+M' }
    ],
    '서식': [
      { label: '테마' },
      SEP,
      { label: '숫자', arrow: true },
      { label: '텍스트', arrow: true },
      { label: '맞춤', arrow: true },
      { label: '줄바꿈', arrow: true },
      { label: '회전', arrow: true },
      SEP,
      { label: '글꼴 크기', arrow: true },
      { label: '조건부 서식' },
      { label: '교차 색상' },
      SEP,
      { label: '서식 지우기', hint: 'Ctrl+\\' }
    ],
    '데이터': [
      { label: '시트 정렬' },
      { label: '범위 정렬', arrow: true },
      SEP,
      { label: '필터 만들기' },
      { label: '필터 보기', arrow: true },
      SEP,
      { label: '데이터 확인' },
      { label: '데이터 정리', arrow: true },
      { label: '텍스트를 열로 분할' },
      SEP,
      { label: '피벗 테이블' },
      { label: '이름이 지정된 범위' }
    ],
    '도구': [
      { label: '스크립트 편집기' },
      { label: '매크로', arrow: true },
      SEP,
      { label: '맞춤법 검사', arrow: true },
      { label: '자동 완성' },
      { label: '알림 규칙' },
      SEP,
      { label: '접근성 설정' }
    ],
    '확장 프로그램': [
      { label: '부가기능', arrow: true },
      { label: 'Apps Script' },
      SEP,
      { label: '매크로 기록' }
    ],
    '도움말': [
      { label: '시트 도움말' },
      { label: '교육 센터' },
      SEP,
      { label: '업데이트' },
      { label: '문제 신고' },
      { label: '기능 개선 제안' },
      SEP,
      { label: '단축키', hint: 'Ctrl+/' }
    ]
  };

  var ICONS = {
    doc:      'M6 3h8l4 4v14H6z|M14 3v4h4',
    folder:   'M3 6h6l2 2h10v11H3z',
    import:   'M12 4v10|M8 10l4 4 4-4|M4 19h16',
    copy:     'M8 3h9v13H8z|M5 7v13h9',
    share:    'M6 12a3 3 0 1 0 0-.1|M18 6a3 3 0 1 0 0-.1|M18 18a3 3 0 1 0 0-.1|M8.7 10.7l6.6-3.4|M8.7 13.3l6.6 3.4',
    mail:     'M3 6h18v12H3z|M3 7l9 6 9-6',
    down:     'M12 4v10|M8 10l4 4 4-4|M4 19h16',
    rename:   'M4 16.5V20h3.5L18 9.5 14.5 6z',
    move:     'M3 6h6l2 2h10v11H3z|M12 11v6|M9.5 13.5L12 11l2.5 2.5',
    shortcut: 'M3 6h6l2 2h10v11H3z|M12 17v-5|M9.5 14.5L12 12l2.5 2.5',
    trash:    'M5 7h14|M9 7V5h6v2|M7 7l1 13h8l1-13',
    history:  'M12 7.5V12l3 2|M20.5 12a8.5 8.5 0 1 1-2.6-6.1|M20.5 3v4h-4',
    offline:  'M6.5 19a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 17.7 9.2 3.9 3.9 0 0 1 17.5 19z|M12 11v5',
    info:     'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z|M12 11v5|M12 8v.5',
    lock:     'M7 11V8a5 5 0 0 1 10 0v3|M5 11h14v9H5z',
    gear:     'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M12 2.5v3|M12 18.5v3|M2.5 12h3|M18.5 12h3|M5.2 5.2l2.1 2.1|M16.7 16.7l2.1 2.1|M18.8 5.2l-2.1 2.1|M7.3 16.7l-2.1 2.1',
    print:    'M7 8V3h10v5|M6 18H3v-7h18v7h-3|M7 14h10v7H7z'
  };

  function icon(name) {
    var wrap = U.el('span', 'menu__ico');
    if (!ICONS[name]) return wrap;
    var svg = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
              'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">';
    ICONS[name].split('|').forEach(function (d) { svg += '<path d="' + d + '"/>'; });
    wrap.innerHTML = svg + '</svg>';
    return wrap;
  }

  var openName = null, panel = null, flyout = null;

  function close() {
    if (panel) { panel.remove(); panel = null; }
    if (flyout) { flyout.remove(); flyout = null; }
    var b = document.querySelector('.menubar__item.is-open');
    if (b) b.classList.remove('is-open');
    openName = null;
    if (typeof App !== 'undefined' && App.refocus) App.refocus();
  }

  function closeFlyout() {
    if (flyout) { flyout.remove(); flyout = null; }
    var o = panel && panel.querySelector('.menu__item.is-open');
    if (o) o.classList.remove('is-open');
  }

  function buildItem(def) {
    if (def.sep) return U.el('div', 'menu__sep');
    var b = U.el('button', 'menu__item');
    b.type = 'button';
    b.appendChild(icon(def.icon));
    b.appendChild(U.el('span', 'menu__label', def.label));
    if (def.hint) b.appendChild(U.el('span', 'menu__hint', def.hint));
    if (def.sub || def.arrow) {
      var a = U.el('span', 'menu__arrow');
      a.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16">' +
                    '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" ' +
                    'stroke-linecap="round" stroke-linejoin="round"/></svg>';
      b.appendChild(a);
    }
    if (def.off) b.disabled = true;
    return b;
  }

  /* 파일 > 새 문서 : 위장표를 고른다 */
  function buildDisguiseFlyout() {
    var fl = U.el('div', 'menu');
    fl.style.minWidth = '260px';
    U.DISGUISE_ORDER.forEach(function (id) {
      var d = U.DISGUISES[id];
      var b = U.el('button', 'menu__item');
      b.type = 'button';
      b.appendChild(U.el('span', 'menu__check', App.disguiseId() === id ? '✓' : ''));
      b.appendChild(U.el('span', 'menu__label', d.name));
      b.appendChild(U.el('span', 'menu__hint', d.sub));
      b.addEventListener('click', function () {
        App.selectDisguise(id);
        close();
      });
      fl.appendChild(b);
    });
    return fl;
  }

  function placeFlyout(fl, anchor) {
    fl.style.visibility = 'hidden';
    document.body.appendChild(fl);
    var a = anchor.getBoundingClientRect();
    var w = fl.offsetWidth, h = fl.offsetHeight;
    var left = a.right - 4;
    if (left + w > window.innerWidth - 8) left = a.left - w + 4;
    if (left < 8) left = Math.max(8, window.innerWidth - w - 8);
    var top = Math.min(a.top - 6, window.innerHeight - h - 8);
    fl.style.left = Math.max(8, left) + 'px';
    fl.style.top = Math.max(8, top) + 'px';
    fl.style.visibility = '';
  }

  function fillPanel(box, defs) {
    defs.forEach(function (def) {
      var el = buildItem(def);
      box.appendChild(el);
      if (def.sep) return;
      el.addEventListener('mouseenter', function () {
        closeFlyout();
        if (def.sub === 'disguise') {
          el.classList.add('is-open');
          flyout = buildDisguiseFlyout();
          placeFlyout(flyout, el);
        }
      });
      if (def.sub === 'disguise') {
        el.addEventListener('click', function (e) { e.stopPropagation(); });
      } else if (!def.off) {
        el.addEventListener('click', close);
      }
    });
  }

  /* 창이 좁아 메뉴줄이 숨었을 때를 위해, 툴바의 '메뉴' 버튼으로도 들어갈 수 있다.
     좁은 화면에서는 하위 메뉴를 옆에 펼칠 자리가 없으므로 한 칸씩 파고드는 방식으로 보여 준다. */
  function backItem(label, onBack) {
    var b = U.el('button', 'menu__item');
    b.type = 'button';
    var a = U.el('span', 'menu__ico');
    a.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16">' +
                  '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.6" ' +
                  'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.appendChild(a);
    b.appendChild(U.el('span', 'menu__label', label));
    b.addEventListener('click', function (e) { e.stopPropagation(); onBack(); });
    return b;
  }

  function drillRoot() {
    panel.innerHTML = '';
    Object.keys(DATA).forEach(function (name) {
      var el = buildItem({ label: name, arrow: true });
      el.addEventListener('click', function (e) { e.stopPropagation(); drillMenu(name); });
      panel.appendChild(el);
    });
  }

  function drillMenu(name) {
    panel.innerHTML = '';
    panel.appendChild(backItem('메뉴', drillRoot));
    panel.appendChild(U.el('div', 'menu__sep'));
    DATA[name].forEach(function (def) {
      var el = buildItem(def);
      panel.appendChild(el);
      if (def.sep || def.off) return;
      if (def.sub === 'disguise') {
        el.addEventListener('click', function (e) { e.stopPropagation(); drillDisguise(name); });
      } else {
        el.addEventListener('click', close);
      }
    });
  }

  function drillDisguise(from) {
    panel.innerHTML = '';
    panel.appendChild(backItem(from, function () { drillMenu(from); }));
    panel.appendChild(U.el('div', 'menu__sep'));
    U.DISGUISE_ORDER.forEach(function (id) {
      var d = U.DISGUISES[id];
      var b = U.el('button', 'menu__item');
      b.type = 'button';
      b.appendChild(U.el('span', 'menu__check', App.disguiseId() === id ? '✓' : ''));
      b.appendChild(U.el('span', 'menu__label', d.name));
      b.appendChild(U.el('span', 'menu__hint', d.sub));
      b.addEventListener('click', function () { App.selectDisguise(id); close(); });
      panel.appendChild(b);
    });
  }

  function openSearch(btn) {
    close();
    openName = '__search';
    panel = U.el('div', 'menu');
    panel.style.minWidth = '240px';
    drillRoot();
    panel.style.visibility = 'hidden';
    document.body.appendChild(panel);
    var a = btn.getBoundingClientRect();
    var w = panel.offsetWidth;
    panel.style.left = Math.max(8, Math.min(a.left, window.innerWidth - w - 8)) + 'px';
    panel.style.top = (a.bottom + 4) + 'px';
    panel.style.visibility = '';
  }

  function open(name, btn) {
    close();
    var defs = DATA[name];
    if (!defs) return;
    openName = name;
    btn.classList.add('is-open');

    panel = U.el('div', 'menu');
    fillPanel(panel, defs);

    panel.style.visibility = 'hidden';
    document.body.appendChild(panel);
    var a = btn.getBoundingClientRect();
    var w = panel.offsetWidth;
    panel.style.left = Math.max(8, Math.min(a.left, window.innerWidth - w - 8)) + 'px';
    panel.style.top = (a.bottom + 2) + 'px';
    panel.style.visibility = '';
  }

  function init() {
    var bar = U.$('#menubar');
    Array.prototype.forEach.call(bar.querySelectorAll('[data-menu]'), function (btn) {
      var name = btn.dataset.menu;
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
        if (openName === name) close(); else open(name, btn);
      });
      /* 하나가 열려 있으면 다른 메뉴 위로 지나갈 때 그쪽이 열린다 */
      btn.addEventListener('mouseenter', function () {
        if (openName && openName !== name) open(name, btn);
      });
    });

    var search = document.querySelector('.tbtn--search');
    if (search) {
      search.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (openName === '__search') close(); else openSearch(search);
      });
    }

    document.addEventListener('mousedown', function (e) {
      if (!openName) return;
      if ((panel && panel.contains(e.target)) ||
          (flyout && flyout.contains(e.target)) ||
          e.target.closest('[data-menu]') ||
          e.target.closest('.tbtn--search')) return;
      close();
    });
    document.addEventListener('keydown', function (e) {
      if (openName && e.key === 'Escape') { e.preventDefault(); close(); }
    });
    window.addEventListener('resize', close);
  }

  return { init: init, close: close, isOpen: function () { return !!openName; } };
})();
