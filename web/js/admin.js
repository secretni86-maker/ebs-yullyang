/* 관리자 화면 — 원장님만 로그인해서 쓸 수 있습니다 */
(function () {
  "use strict";
  var E = window.EBS, esc = E.esc, $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = null, tab = "posts";
  var draft = { id: null, cat: "tuition", title: "", body: "", images: [] };

  function api(url, body, method) {
    return fetch(url, { method: method || "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Requested-With": "ebs" }, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (r.status === 401 && body !== undefined) { E.toast("로그인이 풀렸어요. 다시 로그인해 주세요"); setTimeout(function () { E.setMe({ admin: false, needSetup: false }); }, 600); } if (!r.ok) throw new Error(j.error || "문제가 생겼어요 (" + r.status + ")"); return j; }); }, function () { throw new Error("서버에 연결하지 못했어요. 컴퓨터에서 홈페이지가 켜져 있는지 확인해 주세요"); });
  }
  function getJson(url) { return fetch(url, { credentials: "same-origin" }).then(function (r) { return r.json(); }); }
  function upload(file, kind, blur, onProg, extra) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open("POST", "/api/admin/upload?kind=" + kind + "&blur=" + (blur ? 1 : 0) + "&name=" + encodeURIComponent(file.name) + (extra || ""));
      x.setRequestHeader("X-Requested-With", "ebs");
      x.upload.onprogress = function (e) { if (onProg && e.lengthComputable) onProg(e.loaded / e.total); };
      x.onload = function () { var j = {}; try { j = JSON.parse(x.responseText); } catch (e) {} if (x.status === 401) { E.toast("로그인이 풀렸어요. 다시 로그인해 주세요"); setTimeout(function () { E.setMe({ admin: false, needSetup: false }); }, 600); } x.status < 300 ? res(j) : rej(new Error(j.error || "올리지 못했어요")); };
      x.onerror = function () { rej(new Error("연결이 끊겼어요. 다시 시도해 주세요")); };
      x.send(file);
    });
  }
  function save(section, data) {
    return api("/api/admin/save", { section: section, data: data }).then(function (r) { E.C = r.content; return r; });
  }
  function uid(p) { return p + "-" + Math.random().toString(36).slice(2, 9); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function modal(html, onclose) {
    var m = $("#modal"); m.hidden = false;
    m.innerHTML = '<div class="box" role="dialog" aria-modal="true"><button class="xx" type="button" aria-label="닫기">✕</button>' + html + "</div>";
    function close() { m.hidden = true; m.innerHTML = ""; if (onclose) onclose(); }
    m.querySelector(".xx").onclick = close;
    m.onclick = function (e) { if (e.target === m) close(); };
    return { el: m.querySelector(".box"), close: close };
  }

  /* ───── 화면 ───── */
  function render(el) {
    root = el;
    if (!E.ME.admin) return drawLogin();
    drawPanel();
  }
  function drawLogin() {
    var setup = E.ME.needSetup;
    root.innerHTML = '<div class="login card"><h1>' + (setup ? "관리자 비밀번호 만들기" : "관리자 로그인") + '</h1><p style="color:var(--muted)">' +
      (setup ? "처음 한 번만 만듭니다. 이 비밀번호를 아는 사람만 사진·글·정보를 고칠 수 있어요. (6자 이상)" : "원장님만 들어올 수 있는 화면입니다.") + '</p><form id="lf"><div class="fld"><label for="pw">비밀번호</label><input id="pw" type="password" autocomplete="' + (setup ? "new-password" : "current-password") + '" required></div>' +
      (setup ? '<div class="fld"><label for="pw2">비밀번호 한 번 더</label><input id="pw2" type="password" autocomplete="new-password" required></div>' : "") +
      '<p id="lerr" style="color:#b3261e;min-height:1.4em;margin:0 0 8px"></p><button class="btn primary" style="width:100%" type="submit">' + (setup ? "비밀번호 만들고 시작하기" : "로그인") + "</button></form></div>";
    $("#lf", root).onsubmit = function (ev) {
      ev.preventDefault();
      var pw = $("#pw", root).value;
      if (setup && pw !== $("#pw2", root).value) { $("#lerr", root).textContent = "두 비밀번호가 달라요"; return; }
      fetch(setup ? "/api/setup" : "/api/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "실패"); }); })
        .then(function () { E.setMe({ admin: true, needSetup: false }); })
        .catch(function (e) { $("#lerr", root).textContent = e.message; });
    };
  }

  var TABS = [["posts", "글쓰기 (수업료·시간표)"], ["slots", "사진 자리 바꾸기"], ["gallery", "수업 사진 모음"], ["videos", "수업 영상"], ["reviews", "후기"], ["about", "원장 소개 글"], ["info", "학원 정보"], ["account", "비밀번호·로그아웃"]];
  function drawPanel() {
    root.innerHTML = '<h1>관리자</h1><p style="color:var(--muted);margin:0">원장님만 보이는 화면입니다. 바꾼 내용은 저장 즉시 홈페이지에 반영돼요.</p><div class="tabs" role="tablist">' +
      TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + '</div><div id="tabbody"></div>';
    $$("[data-tab]", root).forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; drawPanel(); }; });
    ({ posts: tPosts, slots: tSlots, gallery: tGallery, videos: tVideos, reviews: tReviews, about: tAbout, info: tInfo, account: tAccount })[tab]($("#tabbody", root));
  }

  /* ───── 글쓰기 ───── */
  function tPosts(el) {
    var C = E.C, editing = !!draft.id;
    var catOpts = Object.keys(E.POSTCATS).map(function (k) { return '<option value="' + k + '"' + (draft.cat === k ? " selected" : "") + ">" + E.POSTCATS[k] + "</option>"; }).join("");
    el.innerHTML = '<div class="card"><h3>' + (editing ? "글 수정하기" : "새 글 쓰기") + '</h3><div class="two"><div class="fld"><label for="pcat">분류</label><select id="pcat">' + catOpts + '</select></div><div class="fld"><label for="ptitle">제목</label><input id="ptitle" value="' + esc(draft.title) + '" placeholder="예) 2026년 겨울학기 수업료"></div></div>' +
      '<div class="fld"><label for="pbody">내용</label><textarea id="pbody" placeholder="수업료, 시간표 등을 자유롭게 적어 주세요. (표 사진을 올려도 좋아요)">' + esc(draft.body) + '</textarea></div>' +
      '<div class="fld"><label>사진</label><div class="thumbs" id="pthumbs"></div><label class="chk"><input type="checkbox" id="pblur" checked> 아이 얼굴이 있으면 자동으로 모자이크 (시간표·표 사진은 영향 없어요)</label>' +
      '<div><button class="btn sm" type="button" id="padd">＋ 사진 넣기</button><input id="pfile" type="file" accept="image/*" multiple hidden></div><span class="hint" style="font-size:.78rem;color:var(--muted)">올리면 바로 아래에 보여요.</span></div>' +
      '<div class="btnrow"><button class="btn primary sm" type="button" id="psave">' + (editing ? "수정 저장" : "등록") + "</button>" + (editing ? '<button class="tiny" type="button" id="pcancel">취소</button>' : "") + '</div><p id="pmsg" style="color:var(--sage);min-height:1.4em;margin:10px 0 0"></p></div><div class="card"><h3>등록한 글</h3><div id="plist"></div></div>';
    drawThumbs(); drawPostList();
    $("#pcat", el).onchange = function () { draft.cat = this.value; };
    $("#ptitle", el).oninput = function () { draft.title = this.value; };
    $("#pbody", el).oninput = function () { draft.body = this.value; };
    $("#padd", el).onclick = function () { $("#pfile", el).click(); };
    $("#pfile", el).onchange = function () {
      var files = Array.prototype.slice.call(this.files); this.value = "";
      files.forEach(function (f) {
        var tmp = { src: URL.createObjectURL(f), pending: true }; draft.images.push(tmp); drawThumbs();
        upload(f, "photo", $("#pblur", el).checked).then(function (r) { tmp.src = r.src; tmp.pending = false; tmp.faces = r.faces; drawThumbs(); if (r.faces) E.toast("얼굴 " + r.faces + "곳을 모자이크했어요"); })
          .catch(function (e) { draft.images = draft.images.filter(function (x) { return x !== tmp; }); drawThumbs(); E.toast(e.message); });
      });
    };
    $("#psave", el).onclick = function () {
      if (draft.images.some(function (i) { return i.pending; })) return E.toast("사진을 올리는 중이에요. 잠시만요");
      if (!draft.title.trim()) return E.toast("제목을 적어 주세요");
      var posts = E.C.posts.slice();
      var item = { id: draft.id || uid("post"), cat: draft.cat, title: draft.title.trim(), body: draft.body, images: draft.images.map(function (i) { return i.src; }), created: today() };
      if (draft.id) { posts = posts.map(function (p) { if (p.id === draft.id) { item.created = p.created; return item; } return p; }); } else posts.unshift(item);
      save("posts", posts).then(function () {
        var was = editing; draft = { id: null, cat: draft.cat, title: "", body: "", images: [] };
        tPosts(el); $("#pmsg", el).innerHTML = (was ? "수정했어요. " : "등록했어요. ") + '<a href="/tuition" data-link style="text-decoration:underline">홈페이지에서 보기</a>';
      }).catch(function (e) { E.toast(e.message); });
    };
    if ($("#pcancel", el)) $("#pcancel", el).onclick = function () { draft = { id: null, cat: "tuition", title: "", body: "", images: [] }; tPosts(el); };
  }
  function drawThumbs() {
    var t = $("#pthumbs"); if (!t) return;
    t.innerHTML = draft.images.map(function (im, i) {
      return '<div class="t" style="' + (im.pending ? "opacity:.55" : "") + '"><img src="' + esc(im.src) + '" alt="올린 사진 ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="사진 빼기">✕</button>' + (im.pending ? "" : '<button class="fix" type="button" data-fix="' + i + '">가리기</button>') + "</div>";
    }).join("");
    $$("[data-rm]", t).forEach(function (b) { b.onclick = function () { draft.images.splice(+b.dataset.rm, 1); drawThumbs(); }; });
    $$("[data-fix]", t).forEach(function (b) { b.onclick = function () { var im = draft.images[+b.dataset.fix]; mosaicEditor(im.src, function (n) { im.src = n; drawThumbs(); }); }; });
  }
  function drawPostList() {
    var l = $("#plist"); if (!l) return;
    var posts = E.C.posts;
    if (!posts.length) { l.innerHTML = '<p style="color:var(--muted)">아직 쓴 글이 없어요.</p>'; return; }
    l.innerHTML = posts.map(function (p) {
      return '<div class="arow"><img src="' + esc((p.images || [])[0] ? E.thumb(p.images[0]) : "/media/brand/symbol-orange.png") + '" alt=""><div class="t"><b>' + esc(p.title) + "</b><small>" + esc(E.POSTCATS[p.cat] || "") + " · " + esc(p.created) + " · 사진 " + (p.images || []).length + '장</small></div><div class="pmini"><button class="tiny" type="button" data-edit="' + esc(p.id) + '">수정</button><button class="tiny del" type="button" data-del="' + esc(p.id) + '">삭제</button></div></div>';
    }).join("");
    $$("[data-edit]", l).forEach(function (b) { b.onclick = function () { var p = E.C.posts.filter(function (x) { return x.id === b.dataset.edit; })[0]; draft = { id: p.id, cat: p.cat, title: p.title, body: p.body, images: (p.images || []).map(function (s) { return { src: s }; }) }; tPosts($("#tabbody", root)); window.scrollTo(0, 0); }; });
    $$("[data-del]", l).forEach(function (b) { b.onclick = function () { if (!confirm("이 글을 삭제할까요?")) return; save("posts", E.C.posts.filter(function (x) { return x.id !== b.dataset.del; })).then(function () { drawPostList(); E.toast("삭제했어요"); }); }; });
  }

  /* ───── 사진 자리 ───── */
  function tSlots(el) {
    var C = E.C, notes = C.slotNotes || {}, caps = C.slotCaptions || null;
    el.innerHTML = '<div class="card"><h3>홈페이지의 어느 자리에 어떤 사진을 쓸지 바꿀 수 있어요</h3><p style="color:var(--muted);font-size:.92rem">홈페이지를 보다가 오른쪽 아래 <b>“✎ 사진 바꾸기 ON”</b>을 켜면, 사진 위의 연필(✎)을 눌러 바로 바꿀 수도 있어요.</p>' +
      Object.keys(C.slots).map(function (k) { return '<div class="arow"><img src="' + esc(E.thumb(C.slots[k])) + '" alt=""><div class="t"><b>' + esc(notes[k] || k) + "</b>" + (caps && (k in caps) ? '<div class="fld" style="margin:6px 0 0"><input data-cap="' + esc(k) + '" value="' + esc(caps[k]) + '" aria-label="사진 아래 글씨" placeholder="사진 아래 글씨"></div>' : "") + "</div><button class=\"tiny\" type=\"button\" data-slot=\"" + esc(k) + '">바꾸기</button></div>'; }).join("") + "</div>";
    $$("[data-slot]", el).forEach(function (b) { b.onclick = function () { pickSlot(b.dataset.slot, function () { tSlots(el); }); }; });
    $$("[data-cap]", el).forEach(function (i) { i.onchange = function () { var o = {}; o[i.dataset.cap] = i.value; save("slotCaptions", o).then(function () { E.toast("글씨를 저장했어요"); }).catch(function (e) { E.toast(e.message); }); }; });
  }
  function pickSlot(slot, done) {
    var chosen = null;
    var m = modal('<h3>사진 바꾸기 — ' + esc((E.C.slotNotes || {})[slot] || slot) + '</h3><div class="tabs" id="ptabs"><button type="button" aria-selected="true" data-p="lib">내 사진 보관함</button><button type="button" aria-selected="false" data-p="new">새 사진 올리기</button></div><div id="pbody2"></div>');
    function lib() {
      $("#pbody2", m.el).innerHTML = '<p style="color:var(--muted);font-size:.9rem;margin:0">사진을 누르면 선택돼요.</p><div class="picker" id="pk">불러오는 중…</div><button class="btn primary sm" type="button" id="use" disabled>이 사진으로 바꾸기</button>';
      getJson("/api/admin/media").then(function (r) {
        $("#pk", m.el).innerHTML = r.items.map(function (i) { return '<button type="button" data-src="' + esc(i.src) + '" aria-pressed="false"><img src="' + esc(i.thumb) + '" alt=""></button>'; }).join("");
        $$("#pk button", m.el).forEach(function (b) { b.onclick = function () { $$("#pk button", m.el).forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); b.setAttribute("aria-pressed", "true"); chosen = b.dataset.src; $("#use", m.el).disabled = false; }; });
      });
      $("#use", m.el).onclick = function () { apply(chosen); };
    }
    function neu() {
      $("#pbody2", m.el).innerHTML = '<label class="chk"><input type="checkbox" id="nb" checked> 아이 얼굴 자동 모자이크</label><input id="nf" type="file" accept="image/*"><div id="npv" style="margin-top:14px"></div>';
      $("#nf", m.el).onchange = function () {
        var f = this.files[0]; if (!f) return;
        $("#npv", m.el).innerHTML = '<p>올리는 중… (얼굴을 찾는 데 몇 초 걸려요)</p>';
        upload(f, "photo", $("#nb", m.el).checked).then(function (r) {
          chosen = r.src;
          $("#npv", m.el).innerHTML = '<img src="' + esc(r.src) + '" alt="올린 사진" style="max-height:44vh;border-radius:10px"><p style="margin:10px 0">' + (r.faces ? "얼굴 " + r.faces + "곳을 모자이크했어요. 빠진 곳이 있으면 직접 가려 주세요." : "자동으로 찾은 얼굴이 없어요. 얼굴이 보이면 직접 가려 주세요.") + '</p><div class="btnrow"><button class="btn sm" type="button" id="fix">직접 가리기</button><button class="btn primary sm" type="button" id="use2">이 사진으로 바꾸기</button></div>';
          $("#fix", m.el).onclick = function () { mosaicEditor(chosen, function (n) { chosen = n; $("#npv img", m.el).src = n; }); };
          $("#use2", m.el).onclick = function () { apply(chosen); };
        }).catch(function (e) { $("#npv", m.el).innerHTML = '<p style="color:#b3261e">' + esc(e.message) + "</p>"; });
      };
    }
    function apply(src) {
      var s = {}; s[slot] = src;
      save("slots", s).then(function () { m.close(); E.render(); E.toast("사진을 바꿨어요"); if (done) done(); }).catch(function (e) { E.toast(e.message); });
    }
    $$("#ptabs button", m.el).forEach(function (b) { b.onclick = function () { $$("#ptabs button", m.el).forEach(function (x) { x.setAttribute("aria-selected", x === b); }); b.dataset.p === "lib" ? lib() : neu(); }; });
    lib();
  }

  /* ───── 직접 가리기(모자이크) ───── */
  function mosaicEditor(src, done) {
    var boxes = [], r = 0.06;
    var m = modal('<h3>직접 가리기</h3><p style="color:var(--muted);font-size:.9rem;margin:0 0 10px">가리고 싶은 얼굴을 눌러 동그라미를 놓으세요. 크기는 아래에서 조절해요.</p><div style="text-align:center"><div class="mos" id="mos"><img src="' + esc(src.split("?")[0] + "?e=" + Date.now()) + '" alt="가릴 사진"></div></div>' +
      '<div class="fld" style="margin-top:12px"><label for="rr">동그라미 크기</label><input id="rr" type="range" min="2" max="20" value="6"></div><div class="btnrow"><button class="btn primary sm" type="button" id="apply">모자이크 적용</button><button class="tiny" type="button" id="undo">되돌리기</button></div><p id="mm" style="min-height:1.4em;color:var(--sage)"></p>');
    var mos = $("#mos", m.el), img = $("img", mos);
    function draw() { $$("i", mos).forEach(function (n) { n.remove(); }); boxes.forEach(function (b) { var i = document.createElement("i"); var w = img.clientWidth; i.style.cssText = "left:" + b.x * 100 + "%;top:" + b.y * 100 + "%;width:" + b.r * 2 * w + "px;height:" + b.r * 2 * w + "px"; mos.appendChild(i); }); }
    mos.onclick = function (e) { var rc = img.getBoundingClientRect(); boxes.push({ x: (e.clientX - rc.left) / rc.width, y: (e.clientY - rc.top) / rc.height, r: r }); draw(); };
    $("#rr", m.el).oninput = function () { r = this.value / 100; };
    $("#undo", m.el).onclick = function () { boxes.pop(); draw(); };
    $("#apply", m.el).onclick = function () {
      if (!boxes.length) return ($("#mm", m.el).textContent = "먼저 사진을 눌러 가릴 곳을 정해 주세요");
      api("/api/admin/mosaic", { src: src, boxes: boxes }).then(function (res) { m.close(); done(res.src); E.toast("모자이크했어요"); }).catch(function (e) { $("#mm", m.el).textContent = e.message; });
    };
  }

  /* ───── 수업 사진 모음 ───── */
  function tGallery(el) {
    var list = E.C.gallery;
    el.innerHTML = '<div class="card"><h3>수업 사진 추가</h3><label class="chk"><input type="checkbox" id="gb" checked> 아이 얼굴 자동 모자이크</label><button class="btn sm" type="button" id="gadd">＋ 사진 올리기 (여러 장 가능)</button><input id="gf" type="file" accept="image/*" multiple hidden><p id="gm" style="color:var(--sage);min-height:1.4em;margin:8px 0 0"></p></div>' +
      '<div class="card"><h3>올린 사진 (' + list.length + '장)</h3>' + list.map(function (g, i) {
        return '<div class="arow"><img src="' + esc(g.thumb || g.src) + '" alt=""><div class="t"><div class="fld" style="margin:0"><input data-cap="' + i + '" value="' + esc(g.caption) + '" aria-label="사진 설명"></div><select data-cat="' + i + '" style="margin-top:6px;font-size:.8rem;padding:.3em" aria-label="분류">' + ["kinder", "elementary", "middle"].map(function (c) { return '<option value="' + c + '"' + (g.cat === c ? " selected" : "") + ">" + E.CATS[c] + "</option>"; }).join("") + '</select></div><div class="pmini" style="flex-direction:column"><button class="tiny" type="button" data-fix="' + i + '">가리기</button><button class="tiny del" type="button" data-del="' + i + '">삭제</button></div></div>';
      }).join("") + "</div>";
    $("#gadd", el).onclick = function () { $("#gf", el).click(); };
    $("#gf", el).onchange = function () {
      var files = Array.prototype.slice.call(this.files); this.value = ""; var added = [], n = 0;
      files.reduce(function (p, f) {
        return p.then(function () { $("#gm", el).textContent = "올리는 중… " + (++n) + "/" + files.length; return upload(f, "photo", $("#gb", el).checked).then(function (r) { added.push({ id: uid("g"), src: r.src, thumb: r.thumb, caption: "", cat: "kinder" }); }); });
      }, Promise.resolve()).then(function () { return save("gallery", added.concat(E.C.gallery)); }).then(function () { tGallery(el); $("#gm", el).textContent = added.length + "장을 올렸어요. 설명과 분류를 적어 주세요."; }).catch(function (e) { $("#gm", el).textContent = e.message; });
    };
    function commit() { save("gallery", E.C.gallery.slice()).then(function () { E.toast("저장했어요"); }); }
    $$("[data-cap]", el).forEach(function (i) { i.onchange = function () { E.C.gallery[+i.dataset.cap].caption = i.value; commit(); }; });
    $$("[data-cat]", el).forEach(function (i) { i.onchange = function () { E.C.gallery[+i.dataset.cat].cat = i.value; commit(); }; });
    $$("[data-del]", el).forEach(function (b) { b.onclick = function () { if (!confirm("이 사진을 모음에서 뺄까요?")) return; var l = E.C.gallery.slice(); l.splice(+b.dataset.del, 1); save("gallery", l).then(function () { tGallery(el); }); }; });
    $$("[data-fix]", el).forEach(function (b) { b.onclick = function () { var g = E.C.gallery[+b.dataset.fix]; mosaicEditor(g.src, function (n) { var l = E.C.gallery.slice(); l[+b.dataset.fix].src = n; l[+b.dataset.fix].thumb = n.replace(/\.jpg/, "_t.jpg"); save("gallery", l).then(function () { tGallery(el); }); }); }; });
  }


  /* 영상 썸네일(정지 화면) 바꾸기: 추천 장면을 누르거나, 막대로 고르거나, 사진을 올리기 */
  function thumbEditor(i, done) {
    var v = E.C.videos[i];
    var m = modal('<h3>썸네일 바꾸기 — ' + esc(v.title) + '</h3><p style="color:var(--muted);font-size:.9rem;margin:0 0 8px"><b>마음에 드는 장면을 누르면 바로 바뀌어요.</b></p>' +
      '<div class="picker" id="thstrip" style="grid-template-columns:repeat(3,1fr);max-height:none"><p style="grid-column:1/-1;color:var(--muted)">장면을 불러오는 중…</p></div>' +
      '<details style="margin-top:6px"><summary style="cursor:pointer;min-height:40px;display:flex;align-items:center;color:var(--muted);font-size:.9rem">다른 장면을 직접 고르기</summary>' +
      '<video id="thv" src="' + esc(v.src) + '" muted playsinline preload="auto" style="width:100%;max-height:40vh;background:#000;border-radius:10px;margin-top:6px"></video>' +
      '<input id="ths" type="range" min="0" max="100" value="0" step="0.1" style="width:100%;margin:10px 0" aria-label="장면 고르기"><button class="btn primary sm" type="button" id="thc">이 장면으로 정하기</button></details>' +
      '<hr style="border:0;border-top:1px solid var(--line);margin:16px 0"><p style="color:var(--muted);font-size:.9rem;margin:0 0 8px">또는 사진을 올려서 쓰기</p>' +
      '<label class="chk"><input type="checkbox" id="thb" checked> 아이 얼굴 자동 모자이크</label><input id="thf" type="file" accept="image/*"><p id="thm" style="min-height:1.4em;color:var(--sage);margin:8px 0 0"></p>');
    var vid = $("#thv", m.el), sl = $("#ths", m.el), msg = $("#thm", m.el), strip = $("#thstrip", m.el);
    function setPoster(src) {
      var l = E.C.videos.slice(); l[i].poster = src;
      save("videos", l).then(function () { m.close(); E.toast("썸네일을 바꿨어요"); done(); }).catch(function (e) { msg.textContent = e.message; });
    }
    function seek(t) { return new Promise(function (res) { if (Math.abs(vid.currentTime - t) < 0.05) return res(); var h = function () { vid.removeEventListener("seeked", h); res(); }; vid.addEventListener("seeked", h); vid.currentTime = t; }); }
    function draw(w) { var c = document.createElement("canvas"); var r = vid.videoHeight / vid.videoWidth; c.width = w || vid.videoWidth; c.height = Math.round(c.width * r); c.getContext("2d").drawImage(vid, 0, 0, c.width, c.height); return c; }
    function saveFrame(t) {
      msg.textContent = "저장 중…";
      return seek(t).then(function () {
        draw().toBlob(function (blob) {
          if (!blob) { msg.textContent = "장면을 가져오지 못했어요"; return; }
          upload(new File([blob], "thumb.jpg", { type: "image/jpeg" }), "photo", false).then(function (r) { setPoster(r.src); }).catch(function (e) { msg.textContent = e.message; });
        }, "image/jpeg", 0.9);
      });
    }
    vid.addEventListener("loadedmetadata", function () {
      var d = vid.duration || 1; sl.max = d; strip.innerHTML = "";
      var times = [0.08, 0.25, 0.4, 0.55, 0.7, 0.88].map(function (p) { return Math.min(d - 0.1, d * p); });
      times.reduce(function (p, t) {
        return p.then(function () { return seek(t); }).then(function () {
          var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "이 장면으로 정하기");
          var im = new Image(); im.src = draw(240).toDataURL("image/jpeg", 0.7); im.alt = ""; b.appendChild(im);
          b.style.aspectRatio = "auto"; b.onclick = function () { saveFrame(t); }; strip.appendChild(b);
        });
      }, Promise.resolve());
    });
    sl.oninput = function () { vid.currentTime = parseFloat(sl.value); };
    $("#thc", m.el).onclick = function () { if (!vid.videoWidth) { msg.textContent = "영상을 불러오는 중이에요. 잠시 뒤 다시 눌러 주세요"; return; } saveFrame(vid.currentTime); };
    $("#thf", m.el).onchange = function () {
      var f = this.files[0]; if (!f) return; msg.textContent = "올리는 중…";
      upload(f, "photo", $("#thb", m.el).checked).then(function (r) { setPoster(r.src); }).catch(function (e) { msg.textContent = e.message; });
    };
  }

  /* ───── 영상 ───── */
  var VCATS = { kinder: "유치부", elementary: "초등부", middle: "중등부", about: "학원 소개" };
  function tVideos(el) {
    var list = E.C.videos;
    el.innerHTML = '<div class="card"><h3>새 영상 올리기</h3><p style="color:var(--muted);font-size:.9rem;margin:0 0 10px">올린 영상은 휴대폰에서도 빨리 열리게 줄여 줍니다. 길이만큼 시간이 걸려요. (1분 영상 ≈ 1~2분)</p><label class="chk"><input type="checkbox" id="vb"> 아이 얼굴 자동 모자이크 (이미 가려서 찍은 영상이면 끄세요)</label><button class="btn sm" type="button" id="vadd">＋ 영상 고르기</button><input id="vf" type="file" accept="video/*" hidden><div class="bar" id="vbar" hidden><i></i></div><p id="vm" style="min-height:1.4em;color:var(--sage);margin:8px 0 0"></p></div>' +
      '<div class="card"><h3>영상 목록 (' + list.length + '개)</h3><p style="color:var(--muted);font-size:.85rem;margin:0 0 6px">제목·분류는 바로 저장돼요. <b>썸네일</b>은 목록에 보이는 정지 화면 바꾸기, <b>교체</b>는 같은 자리에 다른 영상을 올리고, <b>↑ ↓</b>는 순서 바꾸기, <b>삭제</b>는 목록에서 빼기예요.</p>' + list.map(function (v, i) {
        return '<div class="arow" style="grid-template-columns:72px 1fr"><img src="' + esc(v.poster || "") + '" alt=""><div class="t"><div class="fld" style="margin:0"><input data-t="' + i + '" value="' + esc(v.title) + '" aria-label="영상 제목"></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center"><select data-c="' + i + '" aria-label="분류" style="font-size:.8rem;padding:.3em">' + Object.keys(VCATS).map(function (k) { return '<option value="' + k + '"' + (v.cat === k ? " selected" : "") + ">" + VCATS[k] + "</option>"; }).join("") + "</select>" +
          '<button class="tiny" type="button" data-th="' + i + '">썸네일</button><button class="tiny" type="button" data-rep="' + i + '">교체</button><button class="tiny" type="button" data-up="' + i + '" aria-label="위로">↑</button><button class="tiny" type="button" data-dn="' + i + '" aria-label="아래로">↓</button><button class="tiny del" type="button" data-del="' + i + '">삭제</button>' +
          ((v.processing || v.replacing) ? '<small style="color:var(--accent)">처리 중…</small>' : "") + "</div></div></div>";
      }).join("") + '<input id="vrf" type="file" accept="video/*" hidden></div>';
    var bar = $("#vbar", el), fill = $("i", bar), msg = $("#vm", el);
    function send(file, replaceId) {
      bar.hidden = false; fill.style.width = "0"; msg.textContent = "올리는 중…";
      upload(file, "video", $("#vb", el).checked, function (p) { fill.style.width = p * 50 + "%"; }, replaceId ? "&replace=" + encodeURIComponent(replaceId) : "").then(function (r) {
        msg.textContent = "변환 중입니다. 이 창을 닫아도 계속 처리돼요.";
        (function poll() { getJson("/api/admin/job?id=" + r.job).then(function (j) { fill.style.width = 50 + (j.progress || 0) * 50 + "%"; if (j.state === "running") setTimeout(poll, 2500); else if (j.state === "done") { getJson("/api/content").then(function (c) { E.C = c; tVideos(el); E.toast("영상을 올렸어요"); }); } else { msg.textContent = "처리하지 못했어요: " + (j.error || ""); } }); })();
      }).catch(function (e) { msg.textContent = e.message; });
    }
    $("#vadd", el).onclick = function () { $("#vf", el).click(); };
    $("#vf", el).onchange = function () { var f = this.files[0]; this.value = ""; if (f) send(f); };

    $$("[data-th]", el).forEach(function (b) { b.onclick = function () { thumbEditor(+b.dataset.th, function () { tVideos(el); }); }; });
    var repId = null;
    $$("[data-rep]", el).forEach(function (b) { b.onclick = function () { repId = E.C.videos[+b.dataset.rep].id; $("#vrf", el).click(); }; });
    $("#vrf", el).onchange = function () { var f = this.files[0]; this.value = ""; if (f && repId) send(f, repId); };
    function commit(l, m) { return save("videos", l).then(function () { if (m) E.toast(m); }); }
    $$("[data-t]", el).forEach(function (i) { i.onchange = function () { var l = E.C.videos.slice(); l[+i.dataset.t].title = i.value; commit(l, "저장했어요"); }; });
    $$("[data-c]", el).forEach(function (i) { i.onchange = function () { var l = E.C.videos.slice(); l[+i.dataset.c].cat = i.value; commit(l, "분류를 바꿨어요"); }; });
    function move(i, d) { var l = E.C.videos.slice(), j = i + d; if (j < 0 || j >= l.length) return; var t = l[i]; l[i] = l[j]; l[j] = t; commit(l).then(function () { tVideos(el); }); }
    $$("[data-up]", el).forEach(function (b) { b.onclick = function () { move(+b.dataset.up, -1); }; });
    $$("[data-dn]", el).forEach(function (b) { b.onclick = function () { move(+b.dataset.dn, 1); }; });
    $$("[data-del]", el).forEach(function (b) { b.onclick = function () { var v = E.C.videos[+b.dataset.del]; if (!confirm("‘" + v.title + "’ 영상을 목록에서 뺄까요?")) return; var l = E.C.videos.slice(); l.splice(+b.dataset.del, 1); commit(l, "삭제했어요").then(function () { tVideos(el); }); }; });
  }

  /* ───── 후기 ───── */
  function tReviews(el) {
    var list = E.C.reviews;
    el.innerHTML = '<div class="card"><h3>후기 등록</h3><p style="color:var(--muted);font-size:.9rem;margin:0 0 12px">학부모님·학생이 직접 남기신 <b>실제 후기</b>만 등록해 주세요. 등록 전에 동의를 받아 주세요. 이름은 “초등 3학년 학부모님”처럼 익명으로 쓰는 걸 권해요.</p><div class="two"><div class="fld"><label for="rc">분류</label><select id="rc">' + Object.keys(E.CATS).map(function (k) { return '<option value="' + k + '">' + E.CATS[k] + "</option>"; }).join("") + '</select></div><div class="fld"><label for="rw">작성자 표시</label><input id="rw" placeholder="예) 초등 3학년 학부모님"></div></div><div class="fld"><label for="rt">후기 내용 (받은 그대로)</label><textarea id="rt"></textarea></div><button class="btn primary sm" type="button" id="radd">등록</button></div>' +
      '<div class="card"><h3>등록된 후기 (' + list.length + ")</h3>" + (list.length ? list.map(function (r, i) { return '<div class="arow" style="grid-template-columns:1fr auto"><div class="t"><b>' + esc(E.CATS[r.cat] || "") + " · " + esc(r.who) + "</b><small>" + esc(r.text.slice(0, 90)) + '…</small></div><button class="tiny del" type="button" data-del="' + i + '">삭제</button></div>'; }).join("") : '<p style="color:var(--muted)">아직 없어요. 등록 전에는 홈페이지에 “예시 화면”이 표시됩니다.</p>') + "</div>";
    $("#radd", el).onclick = function () {
      var t = $("#rt", el).value.trim(); if (!t) return E.toast("후기 내용을 적어 주세요");
      save("reviews", [{ id: uid("r"), cat: $("#rc", el).value, who: $("#rw", el).value.trim(), text: t, created: today() }].concat(E.C.reviews)).then(function () { tReviews(el); E.toast("등록했어요"); });
    };
    $$("[data-del]", el).forEach(function (b) { b.onclick = function () { if (!confirm("이 후기를 삭제할까요?")) return; var l = E.C.reviews.slice(); l.splice(+b.dataset.del, 1); save("reviews", l).then(function () { tReviews(el); }); }; });
  }


  /* ───── 원장 소개 글 ───── */
  function tAbout(el) {
    var a = E.C.about || {};
    function lines(x) { return esc((x || []).join("\n")); }
    el.innerHTML = '<div class="card"><h3>원장 소개 글 고치기</h3><p style="color:var(--muted);font-size:.9rem">원장 사진은 홈페이지에서 <b>✎ 사진 바꾸기</b>를 켜고 사진 위 연필을 눌러 바꿀 수 있어요. 목록은 <b>한 줄에 하나씩</b> 적어 주세요.</p><form id="af">' +
      '<div class="fld"><label for="a-lead">원장 소개 페이지 첫 문장</label><textarea id="a-lead" style="min-height:110px">' + esc(a.lead || "") + '</textarea></div>' +
      '<div class="fld"><label for="a-edu">학력 및 자격 (한 줄에 하나)</label><textarea id="a-edu">' + lines(a.education) + '</textarea></div>' +
      '<div class="fld"><label for="a-car">교육 경력 (한 줄에 하나)</label><textarea id="a-car">' + lines(a.career) + '</textarea></div>' +
      '<div class="fld"><label for="a-hb">홈 화면 짧은 소개 한 문장</label><textarea id="a-hb" style="min-height:80px">' + esc(a.homeBlurb || "") + '</textarea></div>' +
      '<div class="fld"><label for="a-hl">홈 화면 요약 목록 (한 줄에 하나, 3개 정도)</label><textarea id="a-hl" style="min-height:100px">' + lines(a.homeBullets) + '</textarea></div>' +
      '<div class="btnrow"><button class="btn primary" type="submit">저장</button><a class="btn" href="/about" data-link>원장 소개 페이지 보기</a></div></form></div>';
    function split(id) { return $(id, el).value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
    $("#af", el).onsubmit = function (ev) {
      ev.preventDefault();
      save("about", { lead: $("#a-lead", el).value, education: split("#a-edu"), career: split("#a-car"), homeBlurb: $("#a-hb", el).value, homeBullets: split("#a-hl") })
        .then(function () { E.toast("저장했어요"); E.render(); tAbout(el); }).catch(function (e) { E.toast(e.message); });
    };
  }

  /* ───── 학원 정보 ───── */
  var FIELDS = [["name", "학원 이름 (화면에 크게 나오는 이름)"], ["nameEn", "영문 이름"], ["shortName", "로고 옆 짧은 이름"], ["branch", "지점 이름 (독립하면 비워도 돼요)"], ["tagline", "한 줄 소개"], ["director", "원장 이름"], ["directorTitle", "직함"], ["phone", "전화번호"], ["address", "주소"], ["addressNote", "위치 설명"], ["blog", "네이버 블로그 주소"], ["instagram", "인스타그램 주소"], ["kakao", "카카오톡 채널 주소 (없으면 비워 두세요)"], ["reserve", "예약 링크 (네이버 예약 등, 없으면 비워 두세요)"], ["youtube", "유튜브 주소 (없으면 비워 두세요)"]];
  function tInfo(el) {
    var s = E.C.site;
    el.innerHTML = '<div class="card"><h3>학원 정보</h3><p style="color:var(--muted);font-size:.9rem">여기서 바꾸면 홈페이지 전체(머리글·바닥글·전화 버튼·검색 정보)에 한꺼번에 반영돼요. 프랜차이즈를 끝내고 독립할 때는 이름과 로고만 바꾸면 됩니다.</p><form id="inf">' + FIELDS.map(function (f) { return '<div class="fld"><label for="f-' + f[0] + '">' + f[1] + '</label><input id="f-' + f[0] + '" name="' + f[0] + '" value="' + esc(s[f[0]]) + '"></div>'; }).join("") +
      '<div class="fld"><label>로고 이미지</label><div style="display:flex;gap:12px;align-items:center"><img src="' + esc(s.logo) + '" alt="" width="48" height="48" style="object-fit:contain"><button class="btn sm" type="button" id="lg">로고 바꾸기</button><input id="lgf" type="file" accept="image/png,image/jpeg,image/webp" hidden></div></div>' +
      '<div class="two"><div class="fld"><label for="c-accent">포인트 색 (버튼·강조)</label><input type="color" id="c-accent" value="' + esc(s.accent) + '"></div><div class="fld"><label for="c-bg">바탕 색</label><input type="color" id="c-bg" value="' + esc(s.bg) + '"></div></div><button class="btn primary" type="submit">저장</button></form></div>';
    $("#lg", el).onclick = function () { $("#lgf", el).click(); };
    $("#lgf", el).onchange = function () { var f = this.files[0]; if (!f) return; upload(f, "logo", false).then(function (r) { var o = { logo: r.src }; save("site", o).then(function () { tInfo(el); E.render(); E.toast("로고를 바꿨어요 (배경이 투명한 PNG 사진이 가장 예뻐요)"); }); }).catch(function (e) { E.toast(e.message); }); };
    $("#inf", el).onsubmit = function (ev) {
      ev.preventDefault(); var o = {};
      FIELDS.forEach(function (f) { o[f[0]] = $("#f-" + f[0], el).value.trim(); });
      o.accent = $("#c-accent", el).value; o.bg = $("#c-bg", el).value;
      save("site", o).then(function () { E.render(); tInfo(el); E.toast("저장했어요"); }).catch(function (e) { E.toast(e.message); });
    };
  }

  /* ───── 계정 ───── */
  function tAccount(el) {
    el.innerHTML = '<div class="card"><h3>비밀번호 바꾸기</h3><form id="pf"><div class="fld"><label for="po">지금 비밀번호</label><input id="po" type="password" autocomplete="current-password" required></div><div class="fld"><label for="pn">새 비밀번호 (6자 이상)</label><input id="pn" type="password" autocomplete="new-password" required></div><button class="btn primary sm" type="submit">바꾸기</button></form></div><div class="card"><h3>로그아웃</h3><button class="btn sm" type="button" id="lo">로그아웃</button></div>';
    $("#pf", el).onsubmit = function (ev) { ev.preventDefault(); api("/api/admin/password", { old: $("#po", el).value, "new": $("#pn", el).value }).then(function () { E.toast("비밀번호를 바꿨어요"); ev.target.reset(); }).catch(function (e) { E.toast(e.message); }); };
    $("#lo", el).onclick = function () { api("/api/logout", {}).then(function () { document.body.classList.remove("edit-on"); E.setMe({ admin: false, needSetup: false }); }); };
  }

  window.EBSAdmin = {
    render: render,
    pickSlot: function (s) { pickSlot(s); },
    thumbById: function (id) { var i = E.C.videos.findIndex(function (v) { return v.id === id; }); if (i >= 0) thumbEditor(i, function () { E.render(); }); },
    saveCaption: function (slot, text) { var o = {}; o[slot] = text; return save("slotCaptions", o); },
    saveText: function (key, text) { var o = {}; o[key] = text; return save("texts", o); }
  };
})();
