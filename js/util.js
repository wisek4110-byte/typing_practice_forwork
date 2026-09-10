/* ============================================================
   공용 유틸
   ============================================================ */
var U = (function () {

  /* ---------- DOM ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function $(sel) { return document.querySelector(sel); }

  /* ---------- 저장소 ---------- */
  var PREFIX = 'sheet-typing.';
  function save(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) {}
  }
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  /* ---------- 타수(打數) 계산 ----------
     한글은 자모 단위로 친 횟수를 센다.
     겹자음/겹모음/겹받침과 대문자는 2타로 계산한다. */
  var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ',
              'ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var CHO  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ',
              'ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ',
              'ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var TWO_KEY = {};
  ['ㄲ','ㄸ','ㅃ','ㅆ','ㅉ','ㅒ','ㅖ','ㅘ','ㅙ','ㅚ','ㅝ','ㅞ','ㅟ','ㅢ',
   'ㄳ','ㄵ','ㄶ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅄ'].forEach(function (j) {
    TWO_KEY[j] = true;
  });
  var SHIFT_SYMBOL = '~!@#$%^&*()_+{}|:"<>?';

  function keys(jamo) { return TWO_KEY[jamo] ? 2 : 1; }

  /* 글자 하나의 타수 */
  function strokeOf(ch) {
    var code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {          // 완성형 한글
      var s = code - 0xac00;
      var jong = s % 28;
      var jung = ((s - jong) / 28) % 21;
      var cho = (((s - jong) / 28) - jung) / 21;
      var n = keys(CHO[cho]) + keys(JUNG[jung]);
      if (jong > 0) n += keys(JONG[jong]);
      return n;
    }
    if (code >= 0x3131 && code <= 0x318e) {          // 낱자 자모
      return keys(ch);
    }
    if (ch >= 'A' && ch <= 'Z') return 2;
    if (SHIFT_SYMBOL.indexOf(ch) >= 0) return 2;
    return 1;
  }

  /* 문자열의 누적 타수 배열: [c0, c0+c1, ...] */
  function strokeTable(str) {
    var out = new Array(str.length);
    var sum = 0;
    for (var i = 0; i < str.length; i++) {
      sum += strokeOf(str[i]);
      out[i] = sum;
    }
    return out;
  }

  function strokeSum(str) {
    var sum = 0;
    for (var i = 0; i < str.length; i++) sum += strokeOf(str[i]);
    return sum;
  }

  /* ---------- 서식 ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(ms) {
    var t = Math.max(0, Math.round(ms / 1000));
    return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60);
  }
  function comma(n) { return Number(n).toLocaleString('ko-KR'); }
  function colName(i) {
    var s = '';
    i += 1;
    while (i > 0) {
      var r = (i - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  /* ---------- 긴 줄 자르기 ----------
     붙여넣은 글이 한 행에 담기지 않을 만큼 길면 어절 단위로 나눈다. */
  function wrapLine(line, max) {
    line = line.replace(/\s+/g, ' ').trim();
    if (line.length <= max) return line ? [line] : [];
    var words = line.split(' ');
    var out = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!cur.length) {
        cur = w;
      } else if ((cur + ' ' + w).length <= max) {
        cur += ' ' + w;
      } else {
        out.push(cur);
        cur = w;
      }
      while (cur.length > max) {              // 공백 없는 초장문 대비
        out.push(cur.slice(0, max));
        cur = cur.slice(max);
      }
    }
    if (cur.length) out.push(cur);
    return out;
  }

  /* ---------- 붙여넣은 글을 연습용 줄로 ----------
     한 문장이 한 줄이 되게 나눈다. 따옴표 안에서는 끊지 않는다. */
  var ENDERS = '.?!\u2026';
  var CLOSERS = '\u201d\u2019")]\u300f\u300d\u300b\'';
  var OPENERS = '\u201c\u2018"([\u300e\u300c\u300a';
  /* 곧은 따옴표는 여는지 닫는지 알 수 없으므로 번갈아 처리한다 */
  var AMBIG = '"\'';

  function splitSentences(text) {
    var out = [], buf = '', quote = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      buf += ch;
      if (AMBIG.indexOf(ch) >= 0) quote = quote > 0 ? quote - 1 : quote + 1;
      else if (OPENERS.indexOf(ch) >= 0) quote++;
      else if (CLOSERS.indexOf(ch) >= 0 && quote > 0) quote--;
      if (quote > 0 || ENDERS.indexOf(ch) < 0) continue;

      var j = i + 1;
      while (j < text.length && ENDERS.indexOf(text[j]) >= 0) { buf += text[j]; j++; }
      while (j < text.length && CLOSERS.indexOf(text[j]) >= 0) { buf += text[j]; j++; }
      if (j >= text.length || /\s/.test(text[j])) {
        if (buf.trim()) out.push(buf.trim());
        buf = '';
        while (j < text.length && /\s/.test(text[j])) j++;
      }
      i = j - 1;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  /* 한 셀에 담긴 글 → 연습용 줄 배열 */
  function toPracticeLines(raw, max) {
    max = max || 80;
    var out = [];
    splitSentences(String(raw)).forEach(function (sent) {
      out = out.concat(wrapLine(sent, max));
    });
    return out;
  }

  /* ---------- 위장용 업무 데이터 ----------
     도서관 수서 담당자의 '구입도서 신청목록'처럼 보이게 한다.
     서명 / 저자 / 출판사는 실제로 있는 책이고, 주문권수와 합산가는 지어낸 값이다. */
  var BOOKS = [
    ['트렌드 코리아 2026', '김난도', '미래의창', 20000],
    ['프로젝트 헤일메리', '앤디 위어', '알에이치코리아', 22000],
    ['혼모노', '성해나', '창비', 18000],
    ['채식주의자', '한강', '창비', 16000],
    ['소년이 온다', '한강', '창비', 16000],
    ['작별하지 않는다', '한강', '문학동네', 16500],
    ['불편한 편의점', '김호연', '나무옆의자', 14000],
    ['아몬드', '손원평', '창비', 14000],
    ['파친코 1', '이민진', '인플루엔셜', 16800],
    ['달러구트 꿈 백화점', '이미예', '팩토리나인', 13800],
    ['사피엔스', '유발 하라리', '김영사', 25000],
    ['총, 균, 쇠', '재레드 다이아몬드', '문학사상', 28000],
    ['코스모스', '칼 세이건', '사이언스북스', 24000],
    ['정의란 무엇인가', '마이클 샌델', '와이즈베리', 17000],
    ['미움받을 용기', '기시미 이치로', '인플루엔셜', 14900],
    ['나미야 잡화점의 기적', '히가시노 게이고', '현대문학', 15000],
    ['82년생 김지영', '조남주', '민음사', 13000],
    ['데미안', '헤르만 헤세', '민음사', 12000],
    ['어린 왕자', '생텍쥐페리', '열린책들', 9800],
    ['여행의 이유', '김영하', '문학동네', 15000],
    ['노르웨이의 숲', '무라카미 하루키', '민음사', 14000],
    ['1Q84 1', '무라카미 하루키', '문학동네', 16000],
    ['위대한 개츠비', 'F. 스콧 피츠제럴드', '민음사', 12000],
    ['1984', '조지 오웰', '민음사', 12000],
    ['동물농장', '조지 오웰', '민음사', 10000],
    ['이기적 유전자', '리처드 도킨스', '을유문화사', 20000],
    ['지적 대화를 위한 넓고 얕은 지식 1', '채사장', '웨일북', 16800],
    ['팩트풀니스', '한스 로슬링', '김영사', 19800],
    ['물고기는 존재하지 않는다', '룰루 밀러', '곰출판', 16000],
    ['아주 작은 습관의 힘', '제임스 클리어', '비즈니스북스', 16000],
    ['도둑맞은 집중력', '요한 하리', '어크로스', 18800],
    ['나는 나로 살기로 했다', '김수현', '마음의숲', 14000],
    ['쇼코의 미소', '최은영', '문학동네', 14000],
    ['시선으로부터,', '정세랑', '문학동네', 14000],
    ['하얼빈', '김훈', '문학동네', 16800],
    ['칼의 노래', '김훈', '문학동네', 14000],
    ['살인자의 기억법', '김영하', '복복서가', 14000],
    ['종의 기원', '정유정', '은행나무', 14000],
    ['7년의 밤', '정유정', '은행나무', 15800],
    ['미드나잇 라이브러리', '매트 헤이그', '인플루엔셜', 16800]
  ];

  var DISGUISE_HEAD = ['번호', '서명', '저자', '출판사', '주문권수', '단가', '합산가'];

  /* 행 번호를 씨앗으로 쓰는 고정 난수 (다시 눌러도 값이 변하지 않게) */
  function seeded(n) {
    var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function disguiseRow(rowIndex) {
    /* 목록이 한 바퀴 다 돌기 전에는 같은 책이 다시 나오지 않게 건너뛰며 고른다 */
    var book = BOOKS[(rowIndex * 17) % BOOKS.length];
    var copies = 1 + Math.floor(seeded(rowIndex + 1) * 5);   /* 1~5권 */
    var price = book[3];
    return [
      { v: String(Math.max(1, rowIndex - 1)), num: true },
      { v: book[0], num: false },
      { v: book[1], num: false },
      { v: book[2], num: false },
      { v: String(copies), num: true },
      { v: comma(price), num: true },
      { v: comma(copies * price), num: true }
    ];
  }

  /* 위장된 셀을 클릭하면 수식 입력줄에 보이는 함수 */
  function disguiseFormula(col, row1) {
    var r = row1;
    switch (col) {
      case 0: return '=ROW()-2';
      case 1: return '=VLOOKUP($A' + r + ',수서대장!$A:$E,2,FALSE)';
      case 2: return '=VLOOKUP($A' + r + ',수서대장!$A:$E,3,FALSE)';
      case 3: return '=VLOOKUP($A' + r + ',수서대장!$A:$E,4,FALSE)';
      case 4: return '=SUMIF(신청내역!$B:$B,$B' + r + ',신청내역!$D:$D)';
      case 5: return '=VLOOKUP($B' + r + ',정가표!$A:$B,2,FALSE)';
      case 6: return '=ROUND($E' + r + '*$F' + r + ',0)';
      default: return '';
    }
  }

  return {
    el: el, $: $, save: save, load: load,
    strokeOf: strokeOf, strokeTable: strokeTable, strokeSum: strokeSum,
    mmss: mmss, comma: comma, colName: colName, pad2: pad2,
    wrapLine: wrapLine,
    splitSentences: splitSentences,
    toPracticeLines: toPracticeLines,
    DISGUISE_HEAD: DISGUISE_HEAD,
    disguiseRow: disguiseRow,
    disguiseFormula: disguiseFormula
  };
})();
