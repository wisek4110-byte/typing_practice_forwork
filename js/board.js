/* ============================================================
   기록 게시판 · 업데이트 이력
   - 타임어택을 마치면 결과를 이 브라우저에 쌓아 두고,
     공유 버튼으로 상위 10명을 보여 준다.
   ============================================================ */
var Board = (function () {

  var KEY = 'board';
  var KEEP = 100;   /* 저장해 두는 기록 수 */
  var SHOW = 10;    /* 게시판에 보여 주는 수 */

  function load() {
    var list = U.load(KEY, []);
    return Object.prototype.toString.call(list) === '[object Array]' ? list : [];
  }

  /* 타임어택 결과 한 건을 남긴다 */
  function record(r) {
    if (!r || !r.lines) return;              /* 한 줄도 못 친 기록은 남기지 않는다 */
    var me = Chrome.getProfile();
    var list = load();
    list.push({
      name: me.name || '이름 없음',
      thumb: me.thumb || null,
      level: r.level,
      tpm: r.avg,
      best: r.best,
      acc: Math.round(r.acc * 10) / 10,
      lines: r.lines,
      allLines: r.allLines,
      ms: r.totalMs,
      at: new Date().toISOString().slice(0, 10)
    });
    list.sort(function (a, b) { return b.tpm - a.tpm; });
    if (list.length > KEEP) list = list.slice(0, KEEP);
    U.save(KEY, list);
  }

  function top() { return load().slice(0, SHOW); }

  function avatar(entry, size) {
    var box = U.el('span', 'board__pic');
    box.style.width = size + 'px';
    box.style.height = size + 'px';
    if (entry.thumb) {
      var im = document.createElement('img');
      im.src = entry.thumb;
      im.alt = '';
      box.appendChild(im);
    } else {
      box.innerHTML =
        '<svg viewBox="0 0 40 40" width="' + size + '" height="' + size + '">' +
        '<circle cx="20" cy="20" r="20" fill="#c4c7c5"/>' +
        '<circle cx="20" cy="16" r="6.5" fill="#fff"/>' +
        '<path d="M7 36c1.6-6.6 6.8-10 13-10s11.4 3.4 13 10z" fill="#fff"/></svg>';
    }
    return box;
  }

  /* ---------------- 기록 게시판 ---------------- */
  function open() {
    var list = top();
    var m = Chrome.buildModal('타임어택 기록',
      list.length ? '타수가 높은 순서로 ' + SHOW + '명까지 보여 줍니다.'
                  : '아직 남은 기록이 없습니다.');
    m.classList.add('modal--wide');

    if (!list.length) {
      var empty = U.el('div', 'board__empty');
      empty.innerHTML = '시트1에서 <b>Ctrl+X</b> 를 눌러 타임어택을 마치면 여기에 쌓입니다.';
      m.appendChild(empty);
    } else {
      var head = U.el('div', 'board__row board__row--head');
      ['', '', '이름', '단계', '타수', '정확도', '날짜'].forEach(function (t, i) {
        head.appendChild(U.el('span', 'board__c board__c--' + i, t));
      });
      m.appendChild(head);

      var wrap = U.el('div', 'board__list');
      list.forEach(function (e, i) {
        var row = U.el('div', 'board__row' + (i < 3 ? ' is-top' : ''));
        row.appendChild(U.el('span', 'board__c board__c--0', String(i + 1)));
        var pic = U.el('span', 'board__c board__c--1');
        pic.appendChild(avatar(e, 28));
        row.appendChild(pic);
        row.appendChild(U.el('span', 'board__c board__c--2', e.name));
        row.appendChild(U.el('span', 'board__c board__c--3', e.level + '단계'));
        row.appendChild(U.el('span', 'board__c board__c--4', U.comma(e.tpm) + '타'));
        row.appendChild(U.el('span', 'board__c board__c--5', e.acc.toFixed(1) + '%'));
        row.appendChild(U.el('span', 'board__c board__c--6', e.at));
        wrap.appendChild(row);
      });
      m.appendChild(wrap);
    }

    var a = Chrome.actions(m);
    if (list.length) {
      a.appendChild(Chrome.button('기록 복사', 'btn--outline', function () { copy(list); }));
    }
    a.appendChild(Chrome.button('닫기', 'btn--primary', Chrome.closeModal));

    Chrome.openModal(m, function (e) {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); Chrome.closeModal(); }
    });
  }

  /* 게시판이 이 브라우저에만 쌓이므로, 남에게 보낼 수 있도록 글로 옮겨 준다 */
  function copy(list) {
    var txt = '타임어택 기록\n';
    list.forEach(function (e, i) {
      txt += (i + 1) + '. ' + e.name + ' · ' + e.level + '단계 · ' +
             U.comma(e.tpm) + '타 · ' + e.acc.toFixed(1) + '% · ' + e.at + '\n';
    });
    var done = function (ok) {
      var btns = document.querySelectorAll('.modal__actions .btn');
      if (btns.length) btns[0].textContent = ok ? '복사했습니다' : '복사하지 못했습니다';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { done(true); },
                                              function () { done(false); });
    } else {
      done(false);
    }
  }

  /* ---------------- 업데이트 이력 ---------------- */
  var HISTORY = [
    ['2026-09-15', '줄바꿈 눈으로 확인하고 그 자리에서 고치기', [
      '여러 줄을 붙여넣으면 셀이 줄 수만큼 늘어나 한 줄씩 펼쳐집니다.',
      '인터넷에서 긁어온 글도 줄바꿈을 살려 넣습니다.',
      '줄이 뭉개져 들어와도 셀 안에서 Alt+Enter 로 나눌 수 있습니다.'
    ]],
    ['2026-09-14', '상단 패널 정리', [
      '파일 메뉴를 열 수 있게 하고 위장표를 파일 > 새 문서 로 옮겼습니다.',
      '공유에서 타임어택 기록을, 업그레이드에서 이 이력을 볼 수 있습니다.'
    ]],
    ['2026-09-14', '붙여넣은 줄바꿈 지키기', [
      '가사나 시처럼 행 나눔이 정해진 글을 원래 모양대로 연습합니다.'
    ]],
    ['2026-09-10', '위장표 두 가지', [
      '매출 집계표(일반 업무용)와 구입도서 신청목록(도서관 수서용) 중에 고릅니다.'
    ]],
    ['2026-09-07', '시트2 손보기', [
      '글 한 편이 한 칸에 들어가고, 칸을 여러 개 쓰면 최대 5개까지 만듭니다.',
      '끌어서 여러 칸을 고르고 한 번에 지울 수 있습니다.'
    ]],
    ['2026-09-07', '읽기 편하게', [
      'B사감과 러브레터를 더했습니다.',
      '치는 줄에 색을 깔고 글자를 굵게 했습니다.',
      '글자 크기를 10~24pt 사이에서 바꿉니다.'
    ]],
    ['2026-09-03', '연습 글 교체', [
      '날개 · 메밀꽃 필 무렵 · 별 헤는 밤 · 애국가를 넣었습니다.',
      '한 문장이 한 줄이 되도록 나누고 한자를 덜어냈습니다.'
    ]],
    ['2026-08-30', '처음 공개', [
      '긴글 연습, 업무 문서 위장, 타임어택, 커스텀 글, 프로필을 담았습니다.'
    ]]
  ];

  function openHistory() {
    var m = Chrome.buildModal('업데이트 이력', '큼직한 것만 모았습니다.');
    m.classList.add('modal--wide');
    var wrap = U.el('div', 'log');
    HISTORY.forEach(function (h) {
      var item = U.el('div', 'log__item');
      var head = U.el('div', 'log__head');
      head.appendChild(U.el('span', 'log__date', h[0]));
      head.appendChild(U.el('span', 'log__title', h[1]));
      item.appendChild(head);
      var ul = U.el('ul', 'log__list');
      h[2].forEach(function (line) { ul.appendChild(U.el('li', null, line)); });
      item.appendChild(ul);
      wrap.appendChild(item);
    });
    m.appendChild(wrap);
    var a = Chrome.actions(m);
    a.appendChild(Chrome.button('닫기', 'btn--primary', Chrome.closeModal));
    Chrome.openModal(m, function (e) {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); Chrome.closeModal(); }
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.sharebtn'), function (b) {
      b.addEventListener('click', open);
    });
    var up = document.querySelector('.upgradebtn');
    if (up) up.addEventListener('click', openHistory);
  }

  return { init: init, record: record, open: open, openHistory: openHistory, top: top };
})();
