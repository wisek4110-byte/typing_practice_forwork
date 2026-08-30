/* ============================================================
   상단 UI: 제목 / 프로필 / 툴바 접기 / 팝업 공통
   ============================================================ */
var Chrome = (function () {

  /* ---------------- 모달 ---------------- */
  var modalRoot = U.$('#modalRoot');
  var modalKeyHandler = null;

  function openModal(node, onKey) {
    modalRoot.innerHTML = '';
    modalRoot.appendChild(node);
    modalRoot.hidden = false;
    modalKeyHandler = onKey || null;
    var first = node.querySelector('input,button');
    if (first) first.focus();
  }
  function closeModal() {
    modalRoot.hidden = true;
    modalRoot.innerHTML = '';
    modalKeyHandler = null;
    if (typeof App !== 'undefined' && App.refocus) App.refocus();
  }
  function modalOpen() { return !modalRoot.hidden; }

  document.addEventListener('keydown', function (e) {
    if (!modalOpen() || !modalKeyHandler) return;
    modalKeyHandler(e);
  }, true);

  modalRoot.addEventListener('mousedown', function (e) {
    if (e.target === modalRoot) closeModal();
  });

  function buildModal(title, desc) {
    var m = U.el('div', 'modal');
    m.appendChild(U.el('h2', 'modal__title', title));
    if (desc) m.appendChild(U.el('p', 'modal__desc', desc));
    return m;
  }
  function actions(m) {
    var a = U.el('div', 'modal__actions');
    m.appendChild(a);
    return a;
  }
  function button(label, cls, fn) {
    var b = U.el('button', 'btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  /* ---------------- 드롭다운 ---------------- */
  var openDrop = null;

  function showDropdown(anchor, node, align) {
    hideDropdown();
    node.style.position = 'fixed';
    node.style.visibility = 'hidden';
    document.body.appendChild(node);
    var a = anchor.getBoundingClientRect();
    var w = node.offsetWidth, h = node.offsetHeight;
    var left = align === 'right' ? a.right - w : a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var top = a.bottom + 4;
    if (top + h > window.innerHeight - 8) top = Math.max(8, a.top - h - 4);
    node.style.left = left + 'px';
    node.style.top = top + 'px';
    node.style.visibility = '';
    openDrop = { node: node, anchor: anchor };
  }
  function hideDropdown() {
    if (openDrop) { openDrop.node.remove(); openDrop = null; }
  }
  document.addEventListener('mousedown', function (e) {
    if (!openDrop) return;
    if (openDrop.node.contains(e.target) || openDrop.anchor.contains(e.target)) return;
    hideDropdown();
  });
  window.addEventListener('resize', hideDropdown);

  /* ---------------- 문서 제목 ---------------- */
  var DEFAULT_TITLE = '제목 없는 스프레드시트';

  function initTitle() {
    var view = U.$('#docTitle');
    var input = U.$('#docTitleInput');

    var saved = U.load('title', DEFAULT_TITLE);
    apply(saved);

    function apply(v) {
      view.textContent = v;
      document.title = v;
      U.save('title', v);
    }
    function begin() {
      input.value = view.textContent;
      view.hidden = true;
      input.hidden = false;
      input.focus();
      input.select();
    }
    function end(commit) {
      if (input.hidden) return;
      if (commit) {
        var v = input.value.trim();
        apply(v === '' ? DEFAULT_TITLE : v);
      }
      input.hidden = true;
      view.hidden = false;
      if (typeof App !== 'undefined' && App.refocus) App.refocus();
    }

    view.addEventListener('dblclick', begin);
    view.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); begin(); }
    });
    input.addEventListener('keydown', function (e) {
      if (e.isComposing) return;
      if (e.key === 'Enter') { e.preventDefault(); end(true); }
      else if (e.key === 'Escape') { e.preventDefault(); end(false); }
    });
    input.addEventListener('blur', function () { end(true); });
  }

  /* ---------------- 프로필(아이디 / 사진) ---------------- */
  var ID_MAX = 10;
  var IMG_MAX_BYTES = 10 * 1024 * 1024;   // 10MB
  var profile = { name: '', image: null };

  function initProfile() {
    profile = U.load('profile', { name: '', image: null }) || { name: '', image: null };
    paintAvatar();
    U.$('#avatarBtn').addEventListener('click', openProfileDialog);
  }

  function paintAvatar() {
    var img = U.$('#avatarImg');
    var def = U.$('#avatarDefault');
    if (profile.image) {
      img.src = profile.image;
      img.hidden = false;
      def.style.display = 'none';
    } else {
      img.hidden = true;
      img.removeAttribute('src');
      def.style.display = '';
    }
    U.$('#avatarBtn').title = profile.name ? profile.name + ' - 계정 설정' : '계정 설정';
  }

  /* 저장 용량을 위해 256px 정사각형으로 줄여 보관 */
  function shrink(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var im = new Image();
      im.onload = function () {
        var S = 256;
        var cv = document.createElement('canvas');
        cv.width = S; cv.height = S;
        var ctx = cv.getContext('2d');
        var side = Math.min(im.width, im.height);
        ctx.drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, S, S);
        cb(null, cv.toDataURL('image/jpeg', 0.86));
      };
      im.onerror = function () { cb(new Error('이미지를 읽을 수 없습니다.')); };
      im.src = reader.result;
    };
    reader.onerror = function () { cb(new Error('파일을 읽을 수 없습니다.')); };
    reader.readAsDataURL(file);
  }

  function openProfileDialog() {
    var draft = { name: profile.name, image: profile.image };

    var m = buildModal('계정 설정', '프로필 사진과 아이디를 지정합니다.');

    var pick = U.el('div', 'profilepick');
    var pic = U.el('div', 'profilepick__pic');
    var picImg = document.createElement('img');
    pick.appendChild(pic);

    var side = U.el('div', 'profilepick__side');
    var fileBtn = U.el('button', 'btn btn--outline', '사진 업로드');
    fileBtn.type = 'button';
    var resetBtn = U.el('button', 'btn', '기본 이미지');
    resetBtn.type = 'button';
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;

    var row = U.el('div');
    row.style.cssText = 'display:flex;gap:6px;margin-left:-14px;';
    row.appendChild(fileBtn);
    row.appendChild(resetBtn);
    side.appendChild(row);
    side.appendChild(U.el('div', 'field__help', 'JPG · PNG · GIF, 10MB 이하'));
    var err = U.el('div', 'field__err', '');
    side.appendChild(err);
    pick.appendChild(side);
    m.appendChild(pick);

    var field = U.el('div', 'field');
    var lab = U.el('label', 'field__label', '아이디 (' + ID_MAX + '자 이내)');
    var nameInput = document.createElement('input');
    nameInput.className = 'field__input';
    nameInput.maxLength = ID_MAX;
    nameInput.value = draft.name;
    nameInput.placeholder = '아이디를 입력하세요';
    var count = U.el('div', 'field__help', '');
    lab.htmlFor = 'profileName';
    nameInput.id = 'profileName';
    field.appendChild(lab);
    field.appendChild(nameInput);
    field.appendChild(count);
    m.appendChild(field);

    function paintPreview() {
      pic.innerHTML = '';
      if (draft.image) {
        picImg.src = draft.image;
        pic.appendChild(picImg);
      } else {
        pic.innerHTML =
          '<svg viewBox="0 0 40 40" width="88" height="88">' +
          '<circle cx="20" cy="20" r="20" fill="#c4c7c5"/>' +
          '<circle cx="20" cy="16" r="6.5" fill="#fff"/>' +
          '<path d="M7 36c1.6-6.6 6.8-10 13-10s11.4 3.4 13 10z" fill="#fff"/></svg>';
      }
    }
    function paintCount() {
      count.textContent = nameInput.value.length + ' / ' + ID_MAX;
    }
    paintPreview();
    paintCount();
    nameInput.addEventListener('input', paintCount);

    fileBtn.addEventListener('click', function () { fileInput.click(); });
    resetBtn.addEventListener('click', function () {
      draft.image = null; err.textContent = ''; paintPreview();
    });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) { err.textContent = '이미지 파일만 올릴 수 있습니다.'; return; }
      if (f.size > IMG_MAX_BYTES) {
        err.textContent = '10MB 이하의 이미지만 올릴 수 있습니다. (' +
          (f.size / 1024 / 1024).toFixed(1) + 'MB)';
        return;
      }
      err.textContent = '';
      shrink(f, function (e2, dataUrl) {
        if (e2) { err.textContent = e2.message; return; }
        draft.image = dataUrl;
        paintPreview();
      });
    });

    m.appendChild(fileInput);

    var a = actions(m);
    a.appendChild(button('취소', '', closeModal));
    a.appendChild(button('저장', 'btn--primary', doSave));

    function doSave() {
      profile.name = nameInput.value.trim().slice(0, ID_MAX);
      profile.image = draft.image;
      U.save('profile', profile);
      paintAvatar();
      closeModal();
    }

    openModal(m, function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); doSave(); }
    });
    nameInput.focus();
  }

  /* ---------------- 툴바 접기 (좁아지면 ⋮) ---------------- */
  function initToolbar() {
    var inner = U.$('#toolbarInner');
    var more = U.$('#toolbarMore');
    var panel = U.$('#toolbarOverflow');
    var groups = Array.prototype.slice.call(inner.querySelectorAll('[data-tbg]'));
    var widths = [];

    function measure() {
      widths = groups.map(function (g) {
        return g.getBoundingClientRect().width + 11;  // 구분선 여백 포함
      });
    }

    function place(parent, list) {
      var cur = parent.children;
      var same = cur.length === list.length;
      if (same) {
        for (var i = 0; i < list.length; i++) {
          if (cur[i] !== list[i]) { same = false; break; }
        }
      }
      if (!same) parent.append.apply(parent, list);
    }

    function layout() {
      var avail = inner.getBoundingClientRect().width;
      var total = widths.reduce(function (a, b) { return a + b; }, 0);
      var fit = groups.length;
      if (total > avail) {
        var acc = 0;
        fit = 0;
        for (var i = 0; i < groups.length; i++) {
          acc += widths[i];
          if (acc > avail) break;
          fit++;
        }
        if (fit < 1) fit = 1;
      }
      /* 원래 순서를 유지한 채 배치 (여러 번 줄였다 늘려도 순서가 섞이지 않게) */
      place(inner, groups.slice(0, fit));
      place(panel, groups.slice(fit));

      var hidden = groups.length - fit;
      more.hidden = hidden === 0;
      if (hidden === 0 && !panel.hidden) closePanel();
    }

    function openPanel() {
      panel.hidden = false;
      panel.style.position = 'fixed';
      panel.style.visibility = 'hidden';
      var a = more.getBoundingClientRect();
      var w = panel.offsetWidth;
      panel.style.left = Math.max(8, Math.min(a.right - w, window.innerWidth - w - 8)) + 'px';
      panel.style.top = (a.bottom + 6) + 'px';
      panel.style.visibility = '';
    }
    function closePanel() { panel.hidden = true; }

    more.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.hidden) openPanel(); else closePanel();
    });
    document.addEventListener('mousedown', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || more.contains(e.target)) return;
      closePanel();
    });

    measure();
    layout();
    window.addEventListener('resize', function () {
      closePanel();
      layout();
    });
    /* 글꼴이 늦게 잡히는 경우 대비 */
    window.addEventListener('load', function () {
      groups.forEach(function (g, i) { if (g.parentNode !== inner) inner.appendChild(g); });
      measure();
      layout();
    });
  }

  return {
    init: function () { initTitle(); initProfile(); initToolbar(); },
    openModal: openModal,
    closeModal: closeModal,
    modalOpen: modalOpen,
    buildModal: buildModal,
    actions: actions,
    button: button,
    showDropdown: showDropdown,
    hideDropdown: hideDropdown
  };
})();
