/* ============================================================
   타자 연습 엔진 (긴글 연습 + 타임어택)

   시트1 배치
     0행  제목        (타자 대상 아님)
     1행  저자        (타자 대상 아님)
     2행  1번째 글줄  → 3행 입력칸
     4행  2번째 글줄  → 5행 입력칸  ...
   ============================================================ */
var Typing = (function () {

  var ROW_TITLE = 0, ROW_AUTHOR = 1, ROW_FIRST = 2;
  var LEVELS = [
    { no: 1, tpm: 50,  desc: '분당 50타 속도로 글이 사라집니다.' },
    { no: 2, tpm: 90,  desc: '분당 90타 속도로 글이 사라집니다.' },
    { no: 3, tpm: 150, desc: '분당 150타 속도로 글이 사라집니다.' }
  ];
  var GRACE_MS = 2000;

  var sheet = null;
  var bar = null, barTime = null, barLeft = null, barLevel = null, barPause = null;

  var S = null;

  function targetRow(i) { return ROW_FIRST + i * 2; }
  function inputRow(i)  { return ROW_FIRST + i * 2 + 1; }

  function blank() {
    return {
      text: null,
      idx: 0,
      results: [],
      runStart: null,
      lineStartT: null,
      finished: false,
      composing: false,
      input: null,
      targetSpans: [],
      typedSpans: [],
      table: [],
      headDisguised: false,
      mode: 'normal',
      attack: {
        level: 1, tpm: 50, running: false, paused: false,
        erase: 0, eraseIdx: 0, elapsed: 0, last: 0, graceUntil: 0, raf: 0
      }
    };
  }

  /* ---------------- 초기화 ---------------- */
  function attach(sheetObj, stage) {
    sheet = sheetObj;
    buildBar(stage);
    S = blank();
  }

  function buildBar(stage) {
    bar = U.el('div', 'tabar');
    bar.hidden = true;
    barLevel = U.el('span', 'tabar__lv', '1단계');
    barTime = U.el('span', 'tabar__time', '00:00');
    barLeft = U.el('span', null, '');
    barPause = U.el('button', 'tabar__btn', '일시정지 (Ctrl+X)');
    var stop = U.el('button', 'tabar__btn tabar__btn--stop', '중단 (Esc)');
    barPause.type = 'button'; stop.type = 'button';
    barPause.addEventListener('click', function () { togglePause(); });
    stop.addEventListener('click', function () { stopAttack(); });
    bar.appendChild(barLevel);
    bar.appendChild(barTime);
    bar.appendChild(barLeft);
    bar.appendChild(barPause);
    bar.appendChild(stop);
    stage.appendChild(bar);
  }

  /* ---------------- 글 적재 ---------------- */
  function setText(text) {
    stopLoop();
    S = blank();
    S.text = text;
    render();
  }

  function currentText() { return S.text; }

  function render() {
    sheet.clearAll();
    var t = S.text;
    if (!t || !t.lines.length) {
      sheet.setCell(ROW_TITLE, 0, '연습할 글이 없습니다.', { cls: 'is-hint' });
      sheet.setCell(ROW_AUTHOR, 0, '툴바의 글 선택 도구에서 글을 고르거나 시트2에 글을 붙여넣으세요.', { cls: 'is-hint' });
      return;
    }
    sheet.ensureRows(inputRow(t.lines.length - 1) + 12);
    sheet.setCell(ROW_TITLE, 0, t.title, { cls: 'is-title' });
    sheet.setCell(ROW_AUTHOR, 0, t.author, { cls: 'is-muted' });
    for (var i = 0; i < t.lines.length; i++) {
      sheet.setCell(targetRow(i), 0, t.lines[i], { cls: 'is-muted' });
    }
    activateLine(0);
  }

  /* ---------------- 줄 활성화 ---------------- */
  function activateLine(i) {
    var line = S.text.lines[i];
    S.idx = i;
    S.table = U.strokeTable(line);
    S.composing = false;

    /* 글줄: 글자마다 span (색상 표시 / 타임어택 지우기용) */
    var spans = [];
    for (var k = 0; k < line.length; k++) {
      spans.push(U.el('span', 'ch-c', line[k]));
    }
    S.targetSpans = spans;
    sheet.setCell(targetRow(i), 0, line, { cls: 'cell--target', nodes: spans });

    /* 입력칸 */
    var ir = inputRow(i);
    var cell = sheet.setCell(ir, 0, '', { cls: 'cell--input' });
    cell.classList.add('has-text');
    var t = cell.querySelector('.cell__t');
    t.style.maxWidth = (sheet.cols * COL_W - 6) + 'px';
    S.typedSpans = [];

    var input = document.createElement('input');
    input.className = 'typebox';
    input.type = 'text';
    input.autocapitalize = 'off';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.width = (sheet.cols * COL_W - 6) + 'px';
    cell.appendChild(input);
    S.input = input;

    input.addEventListener('compositionstart', function () { S.composing = true; });
    input.addEventListener('compositionend', function () { S.composing = false; paint(); });
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);

    sheet.select(ir, 0);
    sheet.revealRow(targetRow(i), 4);
    sheet.scroll.scrollLeft = 0;
    focusInput();

    S.lineStartT = (S.mode === 'attack') ? playTime() : null;

    /* 타임어택: 새 줄부터 지우기 다시 시작 */
    S.attack.erase = 0;
    S.attack.eraseIdx = 0;
    updateBar();
  }

  function focusInput() {
    if (S.input && !S.finished) {
      try { S.input.focus({ preventScroll: true }); } catch (e) { S.input.focus(); }
    }
  }

  /* ---------------- 입력 처리 ---------------- */
  function onInput() {
    if (S.finished) return;
    if (S.mode === 'attack' && S.attack.paused) return;
    if (S.runStart == null && S.mode === 'normal') S.runStart = performance.now();
    if (S.lineStartT == null) S.lineStartT = playTime();
    paint();
  }

  function paint() {
    var typed = S.input ? S.input.value : '';
    var target = S.text.lines[S.idx];
    var last = typed.length - 1;

    /* 글줄 색 */
    for (var i = 0; i < S.targetSpans.length; i++) {
      var sp = S.targetSpans[i];
      var cls = 'ch-c';
      if (i < typed.length) {
        if (typed[i] === target[i]) cls = 'ch-c ok';
        else if (!(S.composing && i === last)) cls = 'ch-c bad';
        else cls = 'ch-c';
      }
      if (sp.className !== cls) sp.className = cls;
    }

    /* 입력 글자 */
    var t = sheet.cellEl(inputRow(S.idx), 0).querySelector('.cell__t');
    while (S.typedSpans.length > typed.length) {
      S.typedSpans.pop().remove();
    }
    for (var j = 0; j < typed.length; j++) {
      var s = S.typedSpans[j];
      if (!s) {
        s = U.el('span', 'ch-c');
        t.appendChild(s);
        S.typedSpans[j] = s;
      }
      if (s.textContent !== typed[j]) s.textContent = typed[j];
      var bad = (j >= target.length || typed[j] !== target[j]) &&
                !(S.composing && j === last);
      var c2 = bad ? 'ch-c bad' : 'ch-c';
      if (s.className !== c2) s.className = c2;
    }
    followCaret();
  }

  /* 입력 중인 지점이 항상 보이도록 가로 스크롤을 맞춘다. */
  function followCaret() {
    var last = S.typedSpans[S.typedSpans.length - 1];
    var x = last ? last.offsetLeft + last.offsetWidth : 0;
    sheet.revealX(x);
  }

  function onKeyDown(e) {
    if (S.finished) return;
    if (e.key === 'Escape') {
      if (S.mode === 'attack' && S.attack.running) { e.preventDefault(); stopAttack(); }
      return;
    }
    if (e.isComposing) return;
    if (S.mode === 'attack' && S.attack.paused) { e.preventDefault(); return; }

    if (e.key === 'Enter') {
      e.preventDefault();
      commitLine(false);
      return;
    }
    /* 줄을 끝까지 입력했으면 스페이스로도 다음 줄 */
    if (e.key === ' ') {
      var target = S.text.lines[S.idx];
      if (S.input.value.length >= target.length) {
        e.preventDefault();
        commitLine(false);
      }
    }
  }

  /* ---------------- 줄 확정 ---------------- */
  function commitLine(forced) {
    var target = S.text.lines[S.idx];
    var typed = S.input ? S.input.value : '';
    var n = Math.min(typed.length, target.length);
    var matched = 0, strokes = 0;
    for (var i = 0; i < n; i++) {
      if (typed[i] === target[i]) { matched++; strokes += U.strokeOf(target[i]); }
    }
    var compared = Math.max(typed.length, target.length);
    var ms = S.lineStartT == null ? 0 : Math.max(0, playTime() - S.lineStartT);

    S.results.push({
      matched: matched, compared: compared, strokes: strokes, ms: ms,
      typedAny: typed.length > 0, forced: !!forced
    });

    /* 다 친 줄은 업무용 데이터로 바꿔 감춘다 */
    disguisePair(S.idx);

    if (S.input) { S.input.remove(); S.input = null; }

    if (S.idx + 1 >= S.text.lines.length) {
      finish('done');
    } else {
      activateLine(S.idx + 1);
    }
  }

  /* ---------------- 위장 ---------------- */
  function disguisePair(i) {
    if (!S.headDisguised) {
      S.headDisguised = true;
      sheet.setCell(ROW_TITLE, 0, '2026년 3분기 품목별 매출 집계표', {
        cls: 'is-title',
        formula: '="2026년 "&ROUNDUP(MONTH($I$3)/3,0)&"분기 품목별 매출 집계표"'
      });
      for (var c = 0; c < U.DISGUISE_HEAD.length; c++) {
        sheet.setCell(ROW_AUTHOR, c, U.DISGUISE_HEAD[c], {
          cls: 'is-head',
          formula: '=INDEX(설정!$B:$B,' + (c + 1) + ')'
        });
      }
    }
    writeDataRow(targetRow(i));
    writeDataRow(inputRow(i));
  }

  function writeDataRow(r) {
    var cells = U.disguiseRow(r);
    for (var c = 0; c < cells.length; c++) {
      sheet.setCell(r, c, cells[c].v, {
        num: cells[c].num,
        formula: U.disguiseFormula(c, r + 1)
      });
    }
  }

  /* ---------------- 시간 ---------------- */
  function playTime() {
    if (S.mode === 'attack') return S.attack.elapsed;
    return S.runStart == null ? 0 : performance.now() - S.runStart;
  }

  /* ---------------- 타임어택 ---------------- */
  function hotkey() {
    if (S.mode === 'attack' && S.attack.running) { togglePause(); return; }
    if (Chrome.modalOpen()) return;
    openLevelDialog();
  }

  function openLevelDialog() {
    var chosen = S.attack.level || 1;
    var m = Chrome.buildModal('타임어택',
      '시작 2초 뒤부터 글이 왼쪽에서 오른쪽으로 사라집니다. 줄이 다 사라지면 다음 줄로 넘어갑니다.');
    var box = U.el('div', 'levels');
    var btns = [];
    LEVELS.forEach(function (lv) {
      var b = U.el('button', 'level');
      b.type = 'button';
      b.appendChild(U.el('span', 'level__no', String(lv.no)));
      var mid = U.el('span');
      mid.appendChild(U.el('div', 'level__t', lv.no + '단계 · ' + lv.tpm + '타'));
      mid.appendChild(U.el('div', 'level__d', lv.desc));
      b.appendChild(mid);
      b.addEventListener('click', function () { chosen = lv.no; mark(); });
      btns.push(b);
      box.appendChild(b);
    });
    function mark() {
      btns.forEach(function (b, i) { b.classList.toggle('is-on', LEVELS[i].no === chosen); });
    }
    mark();
    m.appendChild(box);

    var a = Chrome.actions(m);
    a.appendChild(Chrome.button('취소', '', Chrome.closeModal));
    a.appendChild(Chrome.button('시작', 'btn--primary', go));

    function go() { Chrome.closeModal(); startAttack(chosen); }

    Chrome.openModal(m, function (e) {
      if (e.key === 'Escape') { e.preventDefault(); Chrome.closeModal(); }
      else if (e.key === 'Enter') { e.preventDefault(); go(); }
      else if (e.key === '1' || e.key === '2' || e.key === '3') {
        e.preventDefault(); chosen = +e.key; mark();
      }
    });
  }

  function startAttack(level) {
    var text = S.text;
    if (!text || !text.lines.length) return;
    stopLoop();
    S = blank();
    S.text = text;
    S.mode = 'attack';
    var lv = LEVELS[level - 1] || LEVELS[0];
    S.attack.level = lv.no;
    S.attack.tpm = lv.tpm;
    S.attack.running = true;
    S.attack.paused = false;
    S.attack.elapsed = 0;
    S.attack.last = performance.now();
    S.attack.graceUntil = GRACE_MS;
    render();
    barLevel.textContent = lv.no + '단계 · ' + lv.tpm + '타';
    bar.hidden = false;
    barPause.textContent = '일시정지 (Ctrl+X)';
    updateBar();
    S.attack.raf = requestAnimationFrame(tick);
  }

  function tick(ts) {
    if (!S.attack.running || S.attack.paused) return;
    var dt = ts - S.attack.last;
    S.attack.last = ts;
    if (dt > 250) dt = 250;                     // 탭 전환 등으로 튀는 것 방지
    S.attack.elapsed += dt;

    if (S.attack.elapsed > S.attack.graceUntil) {
      S.attack.erase += (S.attack.tpm / 60000) * dt;
      applyErase();
    }
    updateBar();
    if (S.attack.running) S.attack.raf = requestAnimationFrame(tick);
  }

  /* 왼쪽부터 서서히 사라지게 한다. */
  function applyErase() {
    var table = S.table, spans = S.targetSpans;
    var i = S.attack.eraseIdx;
    while (i < table.length && S.attack.erase >= table[i]) {
      spans[i].style.opacity = '0';
      i++;
    }
    S.attack.eraseIdx = i;
    if (i >= table.length) {
      commitLine(true);                         // 줄이 다 사라지면 강제로 다음 행
      return;
    }
    var prev = i > 0 ? table[i - 1] : 0;
    var ratio = (S.attack.erase - prev) / (table[i] - prev);
    spans[i].style.opacity = String(Math.max(0, 1 - ratio));
  }

  function updateBar() {
    if (bar.hidden) return;
    barTime.textContent = U.mmss(S.attack.elapsed);
    var left = S.text ? Math.max(0, S.text.lines.length - S.idx) : 0;
    barLeft.textContent = '남은 줄 ' + left;
  }

  function togglePause() {
    if (S.mode !== 'attack' || !S.attack.running) return;
    if (S.attack.paused) resumeAttack();
    else pauseAttack();
  }

  function pauseAttack() {
    S.attack.paused = true;
    cancelAnimationFrame(S.attack.raf);
    barPause.textContent = '계속하기 (Ctrl+X)';
    if (S.input) S.input.blur();

    var m = Chrome.buildModal('일시정지', '타임어택이 멈췄습니다.');
    var a = Chrome.actions(m);
    a.appendChild(Chrome.button('중단 (Esc)', 'btn--outline', function () {
      Chrome.closeModal(); stopAttack();
    }));
    a.appendChild(Chrome.button('계속하기 (Ctrl+X)', 'btn--primary', function () {
      Chrome.closeModal(); resumeAttack();
    }));
    Chrome.openModal(m, function (e) {
      if (e.key === 'Escape') { e.preventDefault(); Chrome.closeModal(); stopAttack(); }
      else if (e.key === 'Enter') { e.preventDefault(); Chrome.closeModal(); resumeAttack(); }
    });
  }

  function resumeAttack() {
    if (!S.attack.paused) return;
    if (Chrome.modalOpen()) Chrome.closeModal();
    S.attack.paused = false;
    S.attack.last = performance.now();
    barPause.textContent = '일시정지 (Ctrl+X)';
    focusInput();
    S.attack.raf = requestAnimationFrame(tick);
  }

  function stopAttack() {
    if (S.mode !== 'attack' || !S.attack.running) return;
    if (Chrome.modalOpen()) Chrome.closeModal();
    /* 치던 줄까지 기록에 넣는다 */
    if (S.input && !S.finished) commitPartial();
    finish('stopped');
  }

  function commitPartial() {
    var target = S.text.lines[S.idx];
    var typed = S.input.value;
    if (!typed.length) return;
    var n = Math.min(typed.length, target.length);
    var matched = 0, strokes = 0;
    for (var i = 0; i < n; i++) {
      if (typed[i] === target[i]) { matched++; strokes += U.strokeOf(target[i]); }
    }
    S.results.push({
      matched: matched,
      compared: Math.max(typed.length, target.length),
      strokes: strokes,
      ms: S.lineStartT == null ? 0 : Math.max(0, playTime() - S.lineStartT),
      typedAny: true, forced: false
    });
  }

  function stopLoop() {
    if (S && S.attack && S.attack.raf) cancelAnimationFrame(S.attack.raf);
    if (S && S.attack) { S.attack.running = false; S.attack.paused = false; }
    if (bar) bar.hidden = true;
  }

  /* ---------------- 결과 ---------------- */
  function finish(reason) {
    S.finished = true;
    var attack = S.mode === 'attack';
    stopLoop();
    if (S.input) { S.input.remove(); S.input = null; }

    var totalMs = 0, strokes = 0, matched = 0, compared = 0, best = 0, lines = 0;
    S.results.forEach(function (r) {
      totalMs += r.ms;
      strokes += r.strokes;
      matched += r.matched;
      compared += r.compared;
      if (r.typedAny) lines++;
      if (r.ms > 250) {
        var t = r.strokes / (r.ms / 60000);
        if (t > best) best = t;
      }
    });
    var avg = totalMs > 0 ? strokes / (totalMs / 60000) : 0;
    var acc = compared > 0 ? (matched / compared) * 100 : 0;
    var typos = Math.max(0, compared - matched);

    showResult({
      attack: attack,
      reason: reason,
      avg: Math.round(avg),
      best: Math.round(best),
      acc: acc,
      totalMs: totalMs,
      typos: typos,
      lines: lines,
      allLines: S.text.lines.length,
      level: S.attack.level
    });
  }

  function box(k, v, unit, wide) {
    var b = U.el('div', 'result__box' + (wide ? ' result__box--wide' : ''));
    b.appendChild(U.el('div', 'result__k', k));
    var val = U.el('div', 'result__v', v);
    if (unit) {
      var s = U.el('small', null, unit);
      val.appendChild(s);
    }
    b.appendChild(val);
    return b;
  }

  function showResult(r) {
    var head = r.attack
      ? '타임어택 결과 · ' + r.level + '단계'
      : '타자 연습 결과';
    var name = S.text.title + (S.text.author ? ' · ' + S.text.author : '');
    var desc = (r.attack && r.reason === 'stopped') ? '중단한 지점까지의 기록입니다.' : name;

    var m = Chrome.buildModal(head, desc);
    var grid = U.el('div', 'result');
    grid.appendChild(box('평균 타수', U.comma(r.avg), '타/분'));
    grid.appendChild(box('최고 타수', U.comma(r.best), '타/분'));
    grid.appendChild(box('정확도', r.acc.toFixed(1), '%'));
    grid.appendChild(box('오타', U.comma(r.typos), '자'));
    grid.appendChild(box('소요 시간', U.mmss(r.totalMs), ''));
    grid.appendChild(box('완료한 줄', r.lines + ' / ' + r.allLines, '줄'));
    m.appendChild(grid);

    var hint = U.el('div', 'result__hint');
    hint.innerHTML = '<kbd>Enter</kbd> 키를 눌러 닫습니다.';
    m.appendChild(hint);

    var a = Chrome.actions(m);
    a.appendChild(Chrome.button('확인', 'btn--primary', done));

    function done() {
      Chrome.closeModal();
      setText(S.text);                 /* 같은 글로 처음부터 다시 */
    }

    Chrome.openModal(m, function (e) {
      if (e.key === 'Enter') { e.preventDefault(); done(); }
    });
  }

  /* ---------------- 외부 API ---------------- */
  return {
    attach: attach,
    setText: setText,
    currentText: currentText,
    refocus: function () { if (!Chrome.modalOpen()) focusInput(); },
    hotkey: hotkey,
    stopAttack: stopAttack,
    isAttackActive: function () { return S && S.mode === 'attack' && S.attack.running; },
    isFinished: function () { return S && S.finished; }
  };
})();
