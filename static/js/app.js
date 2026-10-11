/* 잉글리시 브레인 스튜디오 율량주성점 — 화면 그리기 */
(function () {
  "use strict";
  var C = window.__BOOT__ || { site: {}, slots: {}, gallery: [], videos: [], posts: [], reviews: [] };
  var BASE = window.__BASE__ || "";      // 예: "/ebs-yullyang" (내 컴퓨터에서는 빈 값)
  var STATIC = !!window.__STATIC__;      // 정적 사이트(관리 기능 없음)
  function prefixDeep(o) {
    if (!BASE) return o;
    if (typeof o === "string") return o.indexOf("/media/") === 0 ? BASE + o : o;
    if (Array.isArray(o)) return o.map(prefixDeep);
    if (o && typeof o === "object") { var r = {}; Object.keys(o).forEach(function (k) { r[k] = prefixDeep(o[k]); }); return r; }
    return o;
  }
  C = prefixDeep(C);
  function fixLinks(root) {
    if (!BASE) return;
    Array.prototype.forEach.call((root || document).querySelectorAll('[href^="/"],[src^="/"],[poster^="/"]'), function (el) {
      ["href", "src", "poster"].forEach(function (a) {
        var v = el.getAttribute(a);
        if (v && v.charAt(0) === "/" && v.charAt(1) !== "/" && v.indexOf(BASE + "/") !== 0 && v !== BASE) el.setAttribute(a, BASE + v);
      });
    });
  }
  function stripBase(p) { if (BASE && p.indexOf(BASE) === 0) p = p.slice(BASE.length); return p.replace(/\/$/, "") || "/"; }
  var ME = { admin: false, needSetup: false };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) ? u : ""; }
  function telHref() { return "tel:" + String(C.site.phone || "").replace(/[^\d+]/g, ""); }
  function smsHref() { return "sms:" + String(C.site.phone || "").replace(/[^\d+]/g, ""); }
  function thumb(src) { return /\/(photos|uploads)\/[^?]+\.jpg/.test(src || "") && !/_t\.jpg/.test(src) ? src.replace(/\.jpg/, "_t.jpg") : src; }
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2600); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  var CATS = { kinder: "유치부", elementary: "초등부", middle: "중등부", reading: "읽기", speaking: "말하기", writing: "쓰기", overall: "전체 수업" };
  var POSTCATS = { tuition: "수업료", schedule: "시간표", notice: "공지", news: "수업 소식" };

  /* ───────── 공통 조각 ───────── */
  function ph(slot, o) {
    o = o || {};
    var src = C.slots[slot] || "";
    var use = o.full ? src : thumb(src);
    return '<figure class="ph ' + (o.cls || "") + '" data-slot="' + esc(slot) + '"><img src="' + esc(use) + '" alt="' + esc(o.alt || "") + '"' +
      (o.eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">' +
      (ME.admin ? '<button class="editpen" type="button" data-act="pick-slot" data-slot="' + esc(slot) + '" aria-label="사진 바꾸기">✎</button>' : "") + "</figure>";
  }
  function link(href, text, cls, extra) { return '<a href="' + esc(href) + '" class="' + (cls || "") + '" data-link ' + (extra || "") + ">" + text + "</a>"; }
  function ext(href, text, cls) { return '<a href="' + esc(href) + '" class="' + (cls || "") + '" target="_blank" rel="noopener noreferrer">' + text + "</a>"; }
  function ctas(light) {
    var s = C.site, h = '<a class="btn primary" href="' + telHref() + '">전화 상담 ' + esc(s.phone) + "</a>";
    h += link("/contact", "수업 문의", "btn " + (light ? "ghost-light" : ""));
    if (safeUrl(s.reserve)) h += ext(s.reserve, "예약하기", "btn " + (light ? "ghost-light" : ""));
    return '<div class="btnrow">' + h + "</div>";
  }
  function head(eyebrow, title, lead, extra) {
    return '<div class="sechead rv' + (extra ? " row" : "") + '"><div><span class="eyebrow">' + esc(eyebrow) + '</span><h2 class="h2">' + title + "</h2>" + (lead ? '<p class="lead">' + lead + "</p>" : "") + "</div>" + (extra || "") + "</div>";
  }
  function paras(t) { return String(t || "").split(/\n{2,}/).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join(""); }
  function dateStr(iso) { return String(iso || "").slice(0, 10).replace(/-/g, "."); }

  function ctaBlock() {
    return '<section class="cta"><figure class="ph bg" data-slot="cta"><img src="' + esc(C.slots.cta) + '" alt="" loading="lazy">' +
      (ME.admin ? '<button class="editpen" type="button" data-act="pick-slot" data-slot="cta" aria-label="사진 바꾸기">✎</button>' : "") + '</figure><div class="in rv"><span class="eyebrow" style="color:#ffd9b8">CONSULTATION</span>' +
      '<h2>우리 아이에게 맞는 수업이 궁금하다면?</h2><p>아이의 현재 영어 경험과 성향을 먼저 들어보고, 어떤 수업이 어울릴지 차분히 안내해 드립니다. 편하게 연락 주세요.</p>' + ctas(true) + "</div></section>";
  }

  /* ───────── 헤더 / 푸터 ───────── */
  var NAV = [
    { href: "/about", t: "원장 소개" },
    { t: "수업", dd: [["/kindergarten", "유치부"], ["/elementary", "초등부"], ["/middle", "중등부"]] },
    { t: "수업 모습", dd: [["/gallery", "수업 사진"], ["/videos", "수업 영상"]] },
    { href: "/reviews", t: "학부모 후기" },
    { href: "/tuition", t: "수업료·시간표" },
    { href: "/location", t: "오시는 길" }
  ];
  var DRAWER = [["/about", "원장 소개", "Director"], ["/kindergarten", "유치부", "Kindergarten"], ["/elementary", "초등부", "Elementary"], ["/middle", "중등부", "Middle School"],
    ["/gallery", "수업 사진", "Gallery"], ["/videos", "수업 영상", "Video"], ["/reviews", "학부모 후기", "Review"], ["/tuition", "수업료·시간표", "Tuition"], ["/location", "오시는 길", "Location"], ["/contact", "상담·수업 문의", "Contact"]];

  function drawHeader(path) {
    var s = C.site, cur = function (h) { return h === path ? ' aria-current="page"' : ""; };
    var nav = NAV.map(function (n) {
      if (n.dd) return '<div class="dd"><button type="button" aria-haspopup="true">' + n.t + ' <span aria-hidden="true" style="font-size:.7em">▾</span></button><div>' +
        n.dd.map(function (d) { return '<a href="' + d[0] + '" data-link' + cur(d[0]) + ">" + d[1] + "</a>"; }).join("") + "</div></div>";
      return '<a href="' + n.href + '" data-link' + cur(n.href) + ">" + n.t + "</a>";
    }).join("");
    $("#hdr").innerHTML = '<div class="in"><a class="brand" href="/" data-link aria-label="' + esc(s.name) + ' 홈"><img src="' + esc(s.logo) + '" alt="" width="38" height="38"><span><b>' + esc(s.shortName) + "</b><small>" + esc(s.branch) + '</small></span></a>' +
      '<nav class="nav" aria-label="주 메뉴">' + nav + '<a class="btn primary" href="/contact" data-link>상담 문의</a></nav>' +
      '<button class="burger" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="drawer"><i></i><i></i><i></i></button></div>' +
      '<div class="drawer" id="drawer">' + DRAWER.map(function (d) { return '<a class="l" href="' + d[0] + '" data-link' + cur(d[0]) + ">" + d[1] + "<small>" + d[2] + "</small></a>"; }).join("") +
      '<div class="btnrow"><a class="btn primary" href="' + telHref() + '">전화 상담 ' + esc(s.phone) + '</a><a class="btn" href="/contact" data-link>수업 문의</a></div></div>';
  }
  function drawFooter() {
    var s = C.site, b = safeUrl(s.blog), i = safeUrl(s.instagram);
    $("#ftr").innerHTML = '<div class="wrap"><div class="cols"><div><div class="nm">' + esc(s.name) + "</div><div>" + esc(s.nameEn) + '</div><p style="margin-top:12px;color:#a99d90">' + esc(s.tagline) + '</p></div>' +
      "<div><h4>CONTACT</h4><div class=\"fl\"><span>원장 " + esc(s.director) + '</span><a href="' + telHref() + '">' + esc(s.phone) + "</a><span>" + esc(s.address) + "</span><span style=\"color:#a99d90\">" + esc(s.addressNote) + "</span></div></div>" +
      '<div><h4>LINKS</h4><div class="fl">' + (b ? ext(b, "네이버 블로그") : "") + (i ? ext(i, "인스타그램") : "") + (safeUrl(s.kakao) ? ext(s.kakao, "카카오톡 상담") : "") + (safeUrl(s.youtube) ? ext(s.youtube, "유튜브") : "") +
      link("/contact", "상담·수업 문의") + link("/location", "오시는 길") + "</div></div></div>" +
      '<div class="copy"><span>© ' + new Date().getFullYear() + " " + esc(s.name) + '</span>' + (STATIC ? "" : '<a href="/admin" data-link style="opacity:.55">관리</a>') + '</div></div>';
  }
  function drawCtaBar(path) {
    var bar = $("#ctabar");
    var hide = path === "/admin" || path === "/contact";
    bar.innerHTML = '<a class="btn primary" href="' + telHref() + '">전화 상담</a><a class="btn" href="/contact" data-link>수업 문의</a>';
    bar.style.display = hide ? "none" : "";
    document.body.classList.toggle("has-cta", !hide);
  }
  function drawAdminPill(path) {
    var old = $(".adminpill"); if (old) old.remove();
    if (!ME.admin || path === "/admin") return;
    var d = document.createElement("div"); d.className = "adminpill";
    var on = document.body.classList.contains("edit-on");
    d.innerHTML = '<button type="button" data-act="toggle-edit" aria-pressed="' + on + '">✎ 사진 바꾸기 ' + (on ? "ON" : "OFF") + '</button><a href="/admin" data-link>관리자</a>';
    document.body.appendChild(d);
  }

  /* ───────── 페이지 ───────── */
  var DA = { lead: "", education: [], career: [], homeBlurb: "", homeBullets: [] };
  function A() { var a = C.about || {}; return { lead: a.lead || DA.lead, education: a.education || [], career: a.career || [], homeBlurb: a.homeBlurb || "", homeBullets: a.homeBullets || [] }; }
  var P = {};

  P["/"] = function () {
    var s = C.site, h = "";
    h += '<section class="hero"><figure class="ph bg" data-slot="hero"><img src="' + esc(C.slots.hero) + '" alt="아이들이 바닥에 둘러앉아 영어 알파벳 보드게임을 하는 수업 모습" fetchpriority="high">' +
      (ME.admin ? '<button class="editpen" type="button" data-act="pick-slot" data-slot="hero" aria-label="사진 바꾸기">✎</button>' : "") + '</figure>' +
      (ME.admin ? '<button class="heropick" type="button" data-act="pick-slot" data-slot="hero">📷 첫 사진 바꾸기</button>' : "") +
      '<div class="in wrap"><span class="eyebrow">청주 청원구 · 율량 · 주성동</span><h1>읽고, 말하고, 만들며<br>영어가 자라는 시간</h1>' +
      '<p class="sub">유치부 · 초등부 · 중등부. 수업의 절반은 영어로, 나머지는 읽기·말하기·쓰기·발표·프로젝트로 채우는 작은 영어 스튜디오입니다.</p>' + ctas(true) + "</div></section>";
    h += '<div class="facts"><div><small>WHERE</small><b>청주시 청원구 율량로 124</b><span class="fsub">주성동 · 율량동 사이</span></div><div><small>FOR</small><b>유치부 · 초등부 · 중등부</b></div>' +
      '<div><small>HOW</small><b>영어 약 50% + 활동 수업</b></div><div><small>CALL</small><b><a href="' + telHref() + '" style="text-decoration:none">' + esc(s.phone) + '</a></b><span class="fsub">' + esc(s.directorTitle) + " " + esc(s.director) + "</span></div></div>";

    h += '<section class="s"><div class="wrap split"><div class="rv">' + ph("philosophy", { alt: "알파벳 블록을 맞춰 보는 아이들과 원서가 가득한 교실", cls: "" }) + '</div><div class="rv"><span class="eyebrow">OUR PHILOSOPHY</span>' +
      '<h2 class="h2">영어가 ‘공부’가 아니라<br>‘나의 말’이 되도록</h2><p class="lead">외워서 시험을 보는 영어보다, 읽고 말하고 써 보며 스스로 쓰게 되는 영어를 지향합니다. 아이마다 속도는 다르다고 생각해서, 한 명 한 명을 가까이에서 살핍니다.</p>' +
      '<ol class="pri"><li><span class="n">01</span><div><b>손으로, 몸으로 먼저</b><span>그림 카드, 블록, 보드게임, 만들기로 소리와 글자를 눈앞에서 만나게 합니다.</span></div></li>' +
      '<li><span class="n">02</span><div><b>읽기·말하기·쓰기의 균형</b><span>한 영역에 치우치지 않고, 듣고 생각하고 표현하는 힘을 함께 키웁니다.</span></div></li>' +
      '<li><span class="n">03</span><div><b>나이에 맞는 다음 걸음</b><span>유치부는 친해지기, 초등부는 읽고 표현하기, 중등부는 학교 영어와 서술형으로 이어집니다.</span></div></li></ol></div></div></section>';

    h += '<section class="s tight paper"><div class="wrap"><div class="dir rv">' + ph("about", { alt: s.director + " 원장", cls: "", full: true }) + '<div><span class="eyebrow">DIRECTOR</span><h3>' + esc(s.director) + " " + esc(s.directorTitle) + '</h3>' +
      "<p style=\"color:var(--muted);margin:0\">" + esc(A().homeBlurb) + "</p><ul>" + A().homeBullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" + link("/about", "원장 소개 더 보기", "btn sm") + "</div></div></div></section>";

    h += '<section class="s"><div class="wrap">' + head("CLASSES", "우리 아이는 어느 반일까요?", "나이와 경험에 맞춰 수업이 나뉩니다.") + '<div class="classes">' +
      [["kinder", "/kindergarten", "KINDERGARTEN", "유치부", "그림책과 놀이로 영어와 친해지는 첫걸음", "유치부 영어 수업 사진"],
       ["elementary", "/elementary", "ELEMENTARY", "초등부", "읽고 말하고 쓰며 생각을 키우는 시간", "초등부 영어 수업 사진"],
       ["middle", "/middle", "MIDDLE SCHOOL", "중등부", "학교 영어와 서술형을 차분하게 준비", "중등부 학습 분위기 사진"]].map(function (c) {
        return '<a class="ccard rv" href="' + c[1] + '" data-link>' + ph(c[0], { alt: c[5] }) + '<div class="t"><small>' + c[2] + "</small><h3>" + c[3] + "</h3><p>" + c[4] + '</p><span class="arrow">자세히 보기 →</span></div></a>';
      }).join("") + "</div></div></section>";

    h += '<section class="s alt"><div class="wrap">' + head("IN THE CLASSROOM", "수업 시간, 아이들은 이런 걸 해요", "교재를 풀기만 하는 시간이 아닙니다. 읽은 것을 말로 옮기고, 직접 써 보고, 만들어서 발표합니다.") + '<div class="acts">' +
      [["act-read", "READING", "읽기", "책을 펼쳐 소리 내어 읽고, 읽은 내용을 내 말로 이야기해 봅니다.", "책을 읽는 아이"],
       ["act-speak", "SPEAKING", "말하기·듣기", "그림 카드와 게임 속에서 소리를 듣고 따라 말하며 입에 붙입니다.", "그림 카드를 짚는 아이들"],
       ["act-write", "WRITING", "쓰기", "배운 표현으로 문장을 만들고, 나만의 글과 그림으로 완성합니다.", "아이가 쓴 My Vegetable Man"],
       ["act-project", "PROJECT", "만들기·프로젝트", "표정 인형, 가족 나무처럼 손으로 만들며 영어로 소개하고 발표합니다.", "감정 단어 점토 활동"]].map(function (a) {
        return '<div class="act rv">' + ph(a[0], { alt: a[4] }) + '<span class="en">' + a[1] + "</span><h3>" + a[2] + "</h3><p>" + a[3] + "</p></div>";
      }).join("") + '</div><div class="skills rv">' + ["생각하기", "발표", "프로젝트", "STEAM 융합 활동", "Show & Tell"].map(function (x) { return '<span class="chip">' + x + "</span>"; }).join("") + "</div></div></section>";

    var g = C.gallery.slice(0, 10);
    h += '<section class="s"><div class="wrap">' + head("CLASS GALLERY", "실제 수업의 순간들", "꾸미지 않은 수업 사진입니다. 아이들 얼굴은 보호를 위해 모자이크 처리했습니다.", link("/gallery", "사진 전체 보기 →", "more")) + "</div>" +
      '<div class="wrap"><div class="rail" role="list" aria-label="수업 사진 (옆으로 넘겨 보세요)">' + g.map(function (it, i) {
        return '<figure class="ph zoom" role="listitem" data-lb="home" data-i="' + i + '"><img src="' + esc(it.thumb || it.src) + '" alt="' + esc(it.caption) + '" loading="lazy" decoding="async"><figcaption class="cap">' + esc(it.caption) + "</figcaption></figure>";
      }).join("") + '</div><p class="railhint">← 옆으로 밀어서 보세요 · 사진을 누르면 크게 볼 수 있어요</p></div></section>';

    var vids = C.videos.filter(function (v) { return v.cat !== "about"; }).slice(0, 3);
    h += '<section class="s paper"><div class="wrap">' + head("CLASS VIDEO", "움직이는 수업 모습", "짧은 영상으로 수업 분위기를 먼저 만나 보세요.", link("/videos", "영상 전체 보기 →", "more")) +
      '<div class="vfeat">' + vids.map(vcard).join("") + "</div>" + snsBlock() + "</div></section>";

    h += '<section class="s"><div class="wrap">' + head("REVIEW", "학부모님의 이야기", "", link("/reviews", "후기 전체 보기 →", "more")) + reviewsBlock(3) + "</div></section>";

    h += '<section class="s alt"><div class="wrap">' + head("TUITION & SCHEDULE", "수업료 · 시간표", "반별 시간표와 수업료는 아래 안내를 확인해 주세요.", link("/tuition", "자세히 보기 →", "more")) + postsBlock(["tuition", "schedule"], 2) + "</div></section>";

    h += '<section class="s"><div class="wrap"><div class="twocol rv">' + '<div><span class="eyebrow">LOCATION</span><h2 class="h2">오시는 길</h2><div class="info">' + infoRows() + "</div>" +
      '<div class="btnrow" style="margin-top:22px">' + link("/location", "지도·길 안내", "btn") + '<a class="btn primary" href="' + telHref() + '">전화하기</a></div></div>' + mapBox() + "</div></div></section>";
    h += ctaBlock();
    return h;
  };

  function vcard(v, big) {
    return '<button class="vcard' + (big ? " big" : "") + ' rv" type="button" data-act="play" data-id="' + esc(v.id) + '"><figure class="ph"><img src="' + esc(v.poster) + '" alt="" loading="lazy"><span class="play"><i></i></span>' + (ME.admin ? '<span class="editpen" role="button" tabindex="0" data-act="edit-thumb" data-id="' + esc(v.id) + '" aria-label="썸네일 바꾸기" title="썸네일 바꾸기">✎</span>' : "") + '</figure><b>' + esc(v.title) + "</b></button>";
  }
  function snsBlock() {
    var s = C.site, b = safeUrl(s.blog), i = safeUrl(s.instagram);
    function card(url, t, d, label) {
      return url ? '<a class="snscard rv" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer"><div><b>' + t + "</b><small>" + d + '</small></div><span class="go">' + label + " ↗</span></a>"
        : '<div class="snscard empty rv"><div><b>' + t + "</b><small>링크 준비 중</small></div></div>";
    }
    return '<div class="sns">' + card(b, "네이버 블로그", "최근 수업 활동과 소식", "블로그 보기") + card(i, "인스타그램", "@enbrains_emma", "인스타 보기") + "</div>";
  }
  function reviewsBlock(limit, cat) {
    var list = C.reviews.filter(function (r) { return !cat || cat === "all" || r.cat === cat; });
    if (!C.reviews.length) {
      var cards = [0, 1, 2].map(function (i) {
        return '<div class="rcard sample rv"><span class="samplebadge">예시 화면 · 실제 후기가 아닙니다</span><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="who" style="margin-top:16px">학년 · 분류 표시 자리</div></div>';
      }).join("");
      return '<div class="notice">아직 등록된 후기가 없습니다. 실제 학부모님·학생의 후기가 등록되면 이곳에 그대로 표시됩니다. 아래는 화면 구성을 보여 주는 <b>예시</b>입니다.</div><div class="rgrid">' + cards + "</div>";
    }
    if (!list.length) return '<div class="empty">이 분류의 후기가 아직 없습니다.</div>';
    return '<div class="rgrid">' + list.slice(0, limit || 99).map(function (r) {
      return '<div class="rcard rv"><span class="tag">' + esc(CATS[r.cat] || "후기") + "</span><blockquote>“" + esc(r.text) + "”</blockquote><div class=\"who\">" + esc(r.who || "") + "</div></div>";
    }).join("") + "</div>";
  }
  function postHTML(p) {
    var imgs = (p.images || []).map(function (src, i) {
      return '<figure class="ph zoom" data-lb="post-' + esc(p.id) + '" data-i="' + i + '"><img src="' + esc(src) + '" alt="' + esc(p.title) + ' 이미지 ' + (i + 1) + '" loading="lazy"></figure>';
    }).join("");
    return '<article class="post rv"><div class="meta"><span class="chip" style="min-height:26px;font-size:.78rem">' + esc(POSTCATS[p.cat] || "안내") + "</span><span>" + esc(dateStr(p.created)) + "</span></div><h3>" + esc(p.title) + "</h3>" +
      (p.body ? '<div class="body">' + esc(p.body) + "</div>" : "") + (imgs ? '<div class="imgs n' + Math.min(4, p.images.length) + '">' + imgs + "</div>" : "") + "</article>";
  }
  function postsBlock(cats, limit) {
    var list = C.posts.filter(function (p) { return !cats || cats.indexOf(p.cat) >= 0; }).sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); });
    if (!list.length) return '<div class="empty rv"><b style="font-family:var(--serif);font-size:1.1rem;color:var(--ink)">수업료와 시간표를 준비하고 있습니다</b><br>곧 이곳에 안내가 올라옵니다. 지금 궁금하신 점은 전화·문자로 편하게 문의해 주세요.<div class="btnrow" style="justify-content:center;margin-top:18px"><a class="btn primary" href="' + telHref() + '">' + esc(C.site.phone) + '</a><a class="btn" href="' + smsHref() + '">문자 보내기</a></div></div>';
    return '<div class="posts">' + list.slice(0, limit || 99).map(postHTML).join("") + "</div>";
  }
  function infoRows() {
    var s = C.site;
    return "<div><small>ADDRESS</small>" + esc(s.address) + '<br><span style="color:var(--muted);font-size:.92rem">' + esc(s.addressNote) + '</span></div><div><small>PHONE</small><a href="' + telHref() + '">' + esc(s.phone) + "</a></div><div><small>DIRECTOR</small>" + esc(s.directorTitle) + " " + esc(s.director) + "</div>";
  }
  function mapBox() {
    var q = encodeURIComponent("충북 청주시 청원구 율량로 124");
    return '<div class="mapbox"><iframe title="학원 위치 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + q + '&hl=ko&z=16&output=embed"></iframe></div>';
  }

  P["/about"] = function () {
    var s = C.site;
    return '<section class="s"><div class="wrap"><div class="split"><div class="rv">' + ph("about", { alt: s.director + " 원장", full: true }) + '</div><div class="rv"><span class="eyebrow">DIRECTOR</span><h1 class="h2" style="font-size:clamp(1.9rem,6vw,3rem)">' + esc(s.director) + " " + esc(s.directorTitle) + "</h1>" +
      '<p class="lead">' + esc(A().lead) + "</p>" +
      '<h3 style="margin:30px 0 8px;font-size:1.15rem">학력 및 자격</h3><ul class="dir" style="display:block;padding-left:1.1em;color:var(--muted)">' + A().education.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
      '<h3 style="margin:26px 0 8px;font-size:1.15rem">교육 경력</h3><ul class="dir" style="display:block;padding-left:1.1em;color:var(--muted)">' + A().career.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
      '<div style="margin-top:28px">' + ctas(false) + "</div></div></div></div></section>" +
      (C.videos.some(function (v) { return v.cat === "about"; }) ? '<section class="s tight alt"><div class="wrap">' + head("VIDEO", "학원 소개 영상", "") + '<div class="vfeat">' + C.videos.filter(function (v) { return v.cat === "about"; }).map(function (v) { return vcard(v); }).join("") + "</div></div></section>" : "") + ctaBlock();
  };

  function classPage(o) {
    var h = '<section class="cover-wrap">' + ph(o.hero, { cls: "cover", alt: o.heroAlt, eager: true, full: true }) + "</section>";
    h += '<section class="phead"><div class="wrap"><span class="eyebrow">' + o.en + "</span><h1>" + o.title + '</h1><p class="lead">' + o.lead + "</p></div></section>";
    h += '<section class="s tight"><div class="wrap"><div class="twocol"><div class="rv"><h2 class="h2" style="font-size:1.5rem">수업에서 이렇게 해요</h2><ul class="list">' +
      o.items.map(function (i) { return "<li><b>" + i[0] + "</b><span>" + i[1] + "</span></li>"; }).join("") + '</ul></div><div class="rv"><h2 class="h2" style="font-size:1.5rem">' + o.sideTitle + "</h2>" + o.side + "</div></div></div></section>";
    h += '<section class="s tight alt"><div class="wrap">' + head("IN CLASS", o.trioTitle, "") + '<div class="trio">' + o.trio.map(function (t) { return '<div class="rv">' + ph(t[0], { alt: t[1] }) + capHTML(t[0], t[1]) + "</div>"; }).join("") + "</div>" + (o.note ? '<p class="tempnote">' + o.note + "</p>" : "") + "</div></section>";
    if (o.videos && o.videos.length) h += '<section class="s tight"><div class="wrap">' + head("VIDEO", "수업 영상", "") + '<div class="vfeat">' + o.videos.map(function (v) { return vcard(v); }).join("") + "</div></div></section>";
    return h + ctaBlock();
  }
  function capHTML(slot, dflt) {
    var txt = (C.slotCaptions && C.slotCaptions[slot] != null) ? C.slotCaptions[slot] : dflt;
    var edit = ME.admin && document.body.classList.contains("edit-on");
    return '<p class="capline' + (edit ? " capedit" : "") + '" style="margin:10px 0 0;font-size:.92rem;color:var(--muted)"' + (edit ? ' contenteditable="true" spellcheck="false" role="textbox" aria-label="사진 아래 글씨 (고치면 자동 저장)" data-capslot="' + esc(slot) + '" data-orig="' + esc(txt) + '"' : "") + ">" + esc(txt) + "</p>" + (edit ? '<small class="caphint">✎ 글씨를 눌러 바로 고치세요 (자동 저장)</small>' : "");
  }
  var vc = function (cat) { return C.videos.filter(function (v) { return v.cat === cat; }).slice(0, 3); };

  P["/kindergarten"] = function () {
    return classPage({
      hero: "kinder-hero", heroAlt: "유치부 아이들이 몸으로 동물 요가를 하며 영어 표현을 배우는 모습", en: "KINDERGARTEN", title: "유치부<br>영어와 친해지는 첫걸음",
      lead: "영어를 ‘배우는 것’이기 전에 ‘재미있는 일상’으로 만나는 시간입니다. 그림책을 보고, 몸을 움직이고, 직접 만들며 영어의 소리와 말에 자연스럽게 익숙해집니다.",
      items: [["영어 노출", "수업의 절반 가까이를 영어로 진행해 소리와 표현을 자주 만납니다."], ["그림책", "그림을 보며 이야기를 따라가고, 반복되는 문장을 함께 들려주고 말해 봅니다."], ["말하기", "기본 문장 패턴을 게임과 놀이 안에서 반복해 자연스럽게 입에 붙입니다."], ["읽기의 기초", "알파벳 소리(파닉스)를 그림 카드, 알파벳 블록, 단어 카드로 글자와 연결합니다."], ["Show & Tell", "내가 만든 것, 좋아하는 것을 친구들 앞에서 영어로 소개해 봅니다."], ["만들기·프로젝트", "My Family Tree, 감정 표정 인형처럼 손으로 만들며 표현을 익힙니다."]],
      sideTitle: "이런 아이에게 어울려요", side: '<ul class="list"><li><b>처음</b><span>영어가 처음이라 낯선 아이</span></li><li><b>호기심</b><span>만지고 만들며 배우는 걸 좋아하는 아이</span></li><li><b>자신감</b><span>소리 내어 말하는 게 아직 조심스러운 아이</span></li></ul><div class="btnrow" style="margin-top:22px"><a class="btn primary" href="' + telHref() + '">전화 상담</a>' + '<a class="btn" href="/contact" data-link>수업 문의</a></div>',
      trioTitle: "유치부 수업 장면", trio: [["kinder-a", "그림 카드를 짚으며 소리와 단어를 맞춰요"], ["kinder-b", "감정 단어를 점토와 종이 인형으로 표현해요"], ["kinder-c", "My Family Tree를 만들며 가족을 영어로 소개해요"]], videos: vc("kinder")
    });
  };
  P["/elementary"] = function () {
    return classPage({
      hero: "elementary-hero", heroAlt: "초등부 아이들이 웃으며 책을 읽는 수업 모습", en: "ELEMENTARY", title: "초등부<br>읽고 말하고 쓰며 생각을 키워요",
      lead: "영어책을 읽고, 어휘를 쌓고, 내 생각을 말과 글로 표현하는 균형 잡힌 수업입니다. 발표와 프로젝트, 융합 활동을 통해 ‘영어로 생각하는 힘’을 길러 갑니다.",
      items: [["읽기", "학년에 맞는 책을 소리 내어 읽고, 내용을 내 말로 이야기합니다."], ["어휘", "단어 카드와 보드게임으로 철자와 소리의 규칙을 재미있게 익힙니다."], ["말하기·듣기", "짝과 대화하고 질문하며, 듣고 이해한 것을 영어로 되받아 말합니다."], ["쓰기", "배운 표현으로 문장을 만들고, 짧은 글로 이어 갑니다."], ["생각하기", "왜 그럴까, 어떻게 될까를 영어로 묻고 답하며 생각의 폭을 넓힙니다."], ["발표·프로젝트", "만든 작품과 결과물을 친구들 앞에서 발표합니다."], ["STEAM 활동", "물 관찰 같은 과학·융합 활동을 영어로 진행해 흥미를 넓힙니다."]],
      sideTitle: "이런 아이에게 어울려요", side: '<ul class="list"><li><b>읽기</b><span>영어책 읽기를 꾸준히 이어 가고 싶은 아이</span></li><li><b>표현</b><span>배운 것을 말과 글로 써 보고 싶은 아이</span></li><li><b>탐구</b><span>실험·만들기 같은 활동으로 배울 때 즐거운 아이</span></li></ul><div class="btnrow" style="margin-top:22px"><a class="btn primary" href="' + telHref() + '">전화 상담</a><a class="btn" href="/contact" data-link>수업 문의</a></div>',
      trioTitle: "초등부 수업 장면", trio: [["elementary-a", "물이 담긴 컵을 관찰하며 영어로 이야기해요"], ["elementary-b", "My Vegetable Man — 내가 쓴 문장으로 소개해요"], ["elementary-c", "카드와 보드게임으로 단어 규칙을 익혀요"]], videos: vc("elementary")
    });
  };
  P["/middle"] = function () {
    return classPage({
      hero: "middle-hero", heroAlt: "조용히 책을 읽으며 공부하는 학구적인 분위기", en: "MIDDLE SCHOOL", title: "중등부<br>학교 영어를 차분하고 깊이 있게",
      lead: "학교 영어와 내신을 중심에 두고, 독해·문법·어휘·쓰기를 균형 있게 다룹니다. 서술형과 영어로 생각하고 표현하는 힘까지 차분하게 준비합니다.",
      items: [["학교 영어", "학교 진도와 평가 방식에 맞춰 단계별로 준비합니다."], ["독해", "글의 흐름과 핵심을 파악하고, 근거를 찾아 답하는 연습을 합니다."], ["문법", "규칙을 외우기보다 문장 안에서 쓰임을 이해합니다."], ["어휘", "문맥 속에서 단어를 익히고, 빈칸 채우기로 확인합니다."], ["쓰기·서술형", "내 생각을 문장으로 정리해 서술형 문항에도 대비합니다."], ["영어로 생각하기", "읽은 내용을 요약하고 의견을 말하며 표현력을 키웁니다."]],
      sideTitle: "이런 학생에게 어울려요", side: '<ul class="list"><li><b>내신</b><span>학교 영어 성적을 안정적으로 올리고 싶은 학생</span></li><li><b>서술형</b><span>서술형 답안 작성이 어려운 학생</span></li><li><b>습관</b><span>스스로 공부하는 방법을 익히고 싶은 학생</span></li></ul><div class="btnrow" style="margin-top:22px"><a class="btn primary" href="' + telHref() + '">전화 상담</a><a class="btn" href="/contact" data-link>수업 문의</a></div>',
      trioTitle: "중등부 학습 분위기", trio: [["middle-hero", "조용히 집중하는 학습 공간"], ["middle-a", "책을 깊이 읽는 시간"], ["cta", "함께 배우는 교실"]], videos: vc("middle"),
      note: "※ 중등부 사진은 학구적인 학습 분위기를 보여 주는 이미지입니다. 실제 수업 사진은 준비되는 대로 교체됩니다."
    });
  };

  P["/gallery"] = function () {
    return '<section class="phead"><div class="wrap"><span class="eyebrow">CLASS GALLERY</span><h1>수업 사진</h1><p class="lead">실제 수업의 모습입니다. 사진을 누르면 크게 볼 수 있고, 옆으로 넘길 수 있어요. 아이들 얼굴은 모자이크 처리했습니다.</p></div></section>' +
      '<section class="s tight" style="padding-top:10px"><div class="wrap"><div class="filters" role="group" aria-label="사진 분류">' + [["all", "전체"], ["kinder", "유치부"], ["elementary", "초등부"], ["middle", "중등부"]].map(function (f, i) { return '<button class="chip" type="button" data-act="gfilter" data-f="' + f[0] + '" aria-pressed="' + (i === 0) + '">' + f[1] + "</button>"; }).join("") + '</div><div id="ggrid" class="grid"></div></div></section>' + ctaBlock();
  };
  function fillGallery(f) {
    var list = C.gallery.filter(function (g) { return f === "all" || g.cat === f; });
    $("#ggrid").innerHTML = list.length ? list.map(function (it, i) {
      return '<figure class="ph zoom" data-lb="gallery" data-i="' + i + '"><img src="' + esc(it.thumb || it.src) + '" alt="' + esc(it.caption) + '" loading="lazy" decoding="async"><figcaption class="cap">' + esc(it.caption) + "</figcaption></figure>";
    }).join("") : '<div class="empty" style="column-span:all">이 분류의 사진을 준비하고 있습니다.</div>';
    LB.groups.gallery = list;
  }

  P["/videos"] = function () {
    return '<section class="phead"><div class="wrap"><span class="eyebrow">CLASS VIDEO</span><h1>수업 영상</h1><p class="lead">아이들이 영어로 읽고, 말하고, 만드는 실제 수업 영상입니다. 얼굴은 모자이크 처리되어 있습니다.</p></div></section>' +
      '<section class="s tight" style="padding-top:10px"><div class="wrap">' + (C.videos.length ? '<div class="vgrid">' + C.videos.map(function (v) { return vcard(v); }).join("") + "</div>" : '<div class="empty">영상을 준비하고 있습니다.</div>') + snsBlock() + "</div></section>" + ctaBlock();
  };

  P["/reviews"] = function () {
    var chips = ["all", "kinder", "elementary", "middle", "reading", "speaking", "writing", "overall"], lab = { all: "전체" };
    return '<section class="phead"><div class="wrap"><span class="eyebrow">REVIEW</span><h1>학부모 후기</h1><p class="lead">실제 학부모님과 학생이 남겨 주신 이야기만 싣습니다.</p></div></section>' +
      '<section class="s tight" style="padding-top:10px"><div class="wrap">' + (C.reviews.length ? '<div class="filters">' + chips.map(function (c, i) { return '<button class="chip" type="button" data-act="rfilter" data-f="' + c + '" aria-pressed="' + (i === 0) + '">' + (lab[c] || CATS[c]) + "</button>"; }).join("") + "</div>" : "") +
      '<div id="rlist">' + reviewsBlock(99) + '</div><div class="rv" style="margin-top:56px;text-align:center"><h2 class="h2" style="font-size:1.5rem">우리 아이에게 맞는 수업이 궁금하다면?</h2><p class="lead" style="margin:0 auto 22px">상담으로 아이에게 맞는 수업인지 먼저 확인해 보세요.</p><div class="btnrow" style="justify-content:center">' +
      '<a class="btn primary" href="' + telHref() + '">전화 상담</a><a class="btn" href="/contact" data-link>수업 문의</a></div></div></div></section>';
  };

  P["/tuition"] = function () {
    return '<section class="phead"><div class="wrap"><span class="eyebrow">TUITION &amp; SCHEDULE</span><h1>수업료 · 시간표</h1><p class="lead">대상, 수업 시간, 시간표, 수업료를 안내합니다. 반 구성은 아이의 나이와 영어 경험에 따라 상담 후 정해집니다.</p></div></section>' +
      '<section class="s tight" style="padding-top:10px"><div class="wrap">' + postsBlock(null) + '<div class="rv" style="margin-top:44px">' + ctas(false) + "</div></div></section>";
  };

  P["/location"] = function () {
    var q = encodeURIComponent("충북 청주시 청원구 율량로 124");
    return '<section class="phead"><div class="wrap"><span class="eyebrow">LOCATION</span><h1>오시는 길</h1><p class="lead">' + esc(C.site.addressNote) + "</p></div></section>" +
      '<section class="s tight" style="padding-top:10px"><div class="wrap"><div class="twocol"><div class="rv"><div class="info">' + infoRows() + '</div><div class="btnrow" style="margin-top:22px"><a class="btn" target="_blank" rel="noopener noreferrer" href="https://map.naver.com/p/search/' + q + '">네이버 지도</a><a class="btn" target="_blank" rel="noopener noreferrer" href="https://map.kakao.com/?q=' + q + '">카카오맵</a><a class="btn primary" href="' + telHref() + '">전화하기</a></div></div>' + mapBox() + "</div></div></section>" + ctaBlock();
  };

  P["/contact"] = function () {
    var s = C.site, b = safeUrl(s.blog), i = safeUrl(s.instagram), k = safeUrl(s.kakao), r = safeUrl(s.reserve);
    function way(href, ic, t, d, cls, tgt) { return href ? '<a class="way ' + (cls || "") + '" href="' + esc(href) + '"' + (tgt ? ' target="_blank" rel="noopener noreferrer"' : "") + '><span class="ic">' + ic + "</span><span><b>" + t + "</b><small>" + d + "</small></span></a>" : '<div class="way off"><span class="ic">' + ic + "</span><span><b>" + t + "</b><small>준비 중</small></span></div>"; }
    return '<section class="phead"><div class="wrap"><span class="eyebrow">CONTACT</span><h1>상담 · 수업 문의</h1><p class="lead">아이의 나이와 영어 경험을 편하게 알려 주세요. 어떤 수업이 어울릴지 함께 이야기 나눠 드립니다.</p></div></section>' +
      '<section class="s tight" style="padding-top:10px"><div class="wrap"><div class="ways">' + way(telHref(), "📞", "전화 상담", esc(s.phone), "big") + way(smsHref(), "💬", "문자 문의", "남겨 주시면 확인 후 연락드려요") +
      way(r, "📅", "예약하기", "상담·수업 예약", "", 1) + way(k, "🟡", "카카오톡 상담", "채널로 편하게 문의", "", 1) + way(b, "📝", "네이버 블로그", "수업 소식 보기", "", 1) + way(i, "📷", "인스타그램", "@enbrains_emma", "", 1) + '</div><div class="info" style="margin-top:36px">' + infoRows() + "</div></div></section>";
  };

  P["/admin"] = function () { return '<div id="adminroot" class="wrap adm">불러오는 중…</div>'; };

  var TITLES = { "/": "", "/about": "원장 소개", "/kindergarten": "청주 유치부 영어", "/elementary": "청주 초등 영어", "/middle": "청주 중등 영어 · 내신 대비", "/gallery": "수업 사진", "/videos": "수업 영상", "/reviews": "학부모 후기", "/tuition": "수업료·시간표", "/location": "오시는 길", "/contact": "상담·수업 문의", "/admin": "관리자" };

  /* ───────── 라이트박스 ───────── */
  var LB = { groups: {}, items: [], i: 0, el: null };
  LB.open = function (items, i) {
    LB.items = items; LB.i = i; LB.el = $("#lb"); LB.el.hidden = false; document.body.style.overflow = "hidden"; LB.draw(); LB.el.querySelector(".x").focus();
  };
  LB.draw = function () {
    var it = LB.items[LB.i]; if (!it) return;
    var n = LB.items.length;
    LB.el.innerHTML = '<button class="x" type="button" aria-label="닫기">✕</button><span class="cnt">' + (it.video ? "" : (LB.i + 1) + " / " + n) + '</span><div class="stage">' +
      (it.video ? '<video src="' + esc(it.video) + '" poster="' + esc(it.poster || "") + '" controls playsinline autoplay></video>' : '<img src="' + esc(it.src) + '" alt="' + esc(it.caption || "") + '">') +
      (n > 1 && !it.video ? '<button class="pv" type="button" aria-label="이전 사진">‹</button><button class="nx" type="button" aria-label="다음 사진">›</button>' : "") + '</div><div class="capb">' + esc(it.caption || "") + "</div>";
  };
  LB.close = function () { var v = $("video", LB.el); if (v) v.pause(); LB.el.hidden = true; LB.el.innerHTML = ""; document.body.style.overflow = ""; };
  LB.step = function (d) { var n = LB.items.length; LB.i = (LB.i + d + n) % n; LB.draw(); };


  /* ───────── 화면 글씨 고치기 (관리자 · 사진 바꾸기 ON 일 때) ───────── */
  var TXT_SEL = "main h1, main h2, main h3, main .lead, main .sub, main .eyebrow, main .act p, main .pri span, main .pri b, main .list span, main .list b, main .ccard p, main .railhint, main .tempnote, main .notice, main .facts small, main .facts b, main .facts .fsub";
  var TXT_SKIP = ".post, .rcard, .vcard, .picker, .adm, .capline, .info, a, button, [data-capslot]";
  function elText(el) {
    return Array.prototype.map.call(el.childNodes, function (n) { return n.nodeName === "BR" ? "\n" : n.textContent; }).join("").replace(/[ \t]+\n/g, "\n").trim();
  }
  function setElText(el, t) { el.innerHTML = esc(t).replace(/\n/g, "<br>"); }
  function applyTexts() {
    var edit = ME.admin && document.body.classList.contains("edit-on");
    var tx = C.texts || {};
    $$(TXT_SEL).forEach(function (el) {
      if (el.closest(TXT_SKIP.replace(", a, button", ""))) return;
      if (el.children.length && Array.prototype.some.call(el.children, function (c) { return c.nodeName !== "BR"; })) return;
      var orig = elText(el); if (!orig) return;
      var key = path + "|" + orig;
      el.dataset.tkey = key;
      if (tx[key] != null) setElText(el, tx[key]);
      var inLink = !!el.closest("a, button");
      if (edit && !inLink) {
        el.setAttribute("contenteditable", "true"); el.setAttribute("spellcheck", "false"); el.setAttribute("role", "textbox");
        el.setAttribute("aria-label", "글씨 고치기 (고치면 자동 저장)"); el.dataset.text = key; el.dataset.orig = elText(el); el.classList.add("txtedit");
      }
    });
    if (edit && !$(".texthint")) {
      var h = document.createElement("div"); h.className = "texthint";
      h.innerHTML = "✎ 점선 글씨를 눌러 바로 고치세요 · 엔터 = 저장 · Shift+엔터 = 줄바꿈 · 다 지우면 원래 문구로 돌아가요";
      document.body.appendChild(h);
    } else if (!edit) { var o = $(".texthint"); if (o) o.remove(); }
  }

  /* ───────── 라우터 ───────── */
  var path = stripBase(location.pathname);
  function render(p, push) {
    p = (p || "/").replace(/\/$/, "") || "/";
    if (!P[p] || (STATIC && p === "/admin")) p = "/";
    path = p;
    if (push) history.pushState({}, "", BASE + p);
    document.body.classList.remove("menu-open");
    var colors = C.site;
    var root = document.documentElement.style;
    root.setProperty("--accent", colors.accent); root.setProperty("--ink", colors.ink); root.setProperty("--bg", colors.bg); root.setProperty("--sage", colors.sage);
    drawHeader(p);
    $("#main").innerHTML = P[p]();
    applyTexts();
    drawFooter(); drawCtaBar(p); drawAdminPill(p);
    fixLinks($("#hdr")); fixLinks($("#main")); fixLinks($("#ftr")); fixLinks($("#ctabar"));
    if (push) {
      var t = TITLES[p];
      document.title = (p === "/" ? "청주 율량·주성동 영어학원 | " + C.site.name : t + " | " + C.site.name);
      window.scrollTo(0, 0); $("#main").focus({ preventScroll: true });
    }
    if (p === "/gallery") fillGallery("all");
    if (p === "/admin" && window.EBSAdmin) window.EBSAdmin.render($("#adminroot"));
    LB.groups.home = C.gallery.slice(0, 10);
    C.posts.forEach(function (po) { LB.groups["post-" + po.id] = (po.images || []).map(function (s) { return { src: s, caption: po.title }; }); });
    reveal();
    onScroll();
  }
  function reveal() {
    var els = $$(".rv:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    els.forEach(function (e) { io.observe(e); });
  }
  function onScroll() { $("#hdr").classList.toggle("scrolled", window.scrollY > 8); }

  /* ───────── 이벤트 ───────── */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-link]");
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && a.target !== "_blank") {
      var u = new URL(a.href, location.href);
      if (u.origin === location.origin && P[stripBase(u.pathname)] && !(STATIC && stripBase(u.pathname) === "/admin")) { e.preventDefault(); render(stripBase(u.pathname), true); return; }
    }
    var b = e.target.closest("[data-act]");
    if (b) {
      var act = b.dataset.act;
      if (act === "toggle-edit") { var on = document.body.classList.toggle("edit-on"); ls("ebs-edit", on ? "1" : "0"); var y = window.scrollY; render(path, false); window.scrollTo(0, y); return; }
      if (act === "edit-thumb") { e.preventDefault(); e.stopPropagation(); if (window.EBSAdmin) window.EBSAdmin.thumbById(b.dataset.id); return; }
      if (act === "pick-slot") { e.preventDefault(); e.stopPropagation(); if (window.EBSAdmin) window.EBSAdmin.pickSlot(b.dataset.slot); return; }
      if (act === "play") { var v = C.videos.filter(function (x) { return x.id === b.dataset.id; })[0]; if (v) LB.open([{ video: v.src, poster: v.poster, caption: v.title }], 0); return; }
      if (act === "gfilter") { $$('[data-act="gfilter"]').forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); fillGallery(b.dataset.f); return; }
      if (act === "rfilter") { $$('[data-act="rfilter"]').forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); $("#rlist").innerHTML = reviewsBlock(99, b.dataset.f); reveal(); return; }
    }
    var z = e.target.closest("[data-lb]");
    if (z && !e.target.closest(".editpen")) { var g = LB.groups[z.dataset.lb] || []; if (g.length) LB.open(g, +z.dataset.i); return; }
    if (e.target.closest(".burger")) { var o = document.body.classList.toggle("menu-open"); $(".burger").setAttribute("aria-expanded", o); return; }
    if (LB.el && !LB.el.hidden) {
      if (e.target.closest(".x") || e.target.classList.contains("stage")) LB.close();
      else if (e.target.closest(".pv")) LB.step(-1);
      else if (e.target.closest(".nx")) LB.step(1);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (LB.el && !LB.el.hidden) { if (e.key === "Escape") LB.close(); if (e.key === "ArrowLeft") LB.step(-1); if (e.key === "ArrowRight") LB.step(1); }
    else if (e.key === "Escape") document.body.classList.remove("menu-open");
  });
  var tx = null;
  document.addEventListener("touchstart", function (e) { if (LB.el && !LB.el.hidden) tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (tx == null || !LB.el || LB.el.hidden) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50 && LB.items.length > 1 && !LB.items[LB.i].video) LB.step(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener("keydown", function (e) {
    var c = e.target.closest && e.target.closest("[data-capslot]");
    if (c && e.key === "Enter") { e.preventDefault(); c.blur(); }
    var t = e.target.closest && e.target.closest("[data-text]");
    if (t && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); t.blur(); }
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-text]")) e.preventDefault();
  }, true);
  document.addEventListener("paste", function (e) {
    var tt = e.target.closest && e.target.closest("[data-text]");
    if (tt) { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text").replace(/\r?\n/g, " ")); return; }
    var c = e.target.closest && e.target.closest("[data-capslot]");
    if (c) { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text").replace(/\s+/g, " ")); }
  });
  document.addEventListener("focusout", function (e) {
    var tt = e.target.closest && e.target.closest("[data-text]");
    if (tt && window.EBSAdmin) {
      var val = (tt.innerText || tt.textContent).replace(/\n{2,}/g, "\n").trim();
      if (val === tt.dataset.orig) return;
      window.EBSAdmin.saveText(tt.dataset.text, val).then(function () {
        tt.dataset.orig = val; toast(val ? "글씨를 저장했어요" : "원래 문구로 돌렸어요"); if (!val) render(path, false);
      }).catch(function (er) { toast(er.message); });
      return;
    }
    var c = e.target.closest && e.target.closest("[data-capslot]");
    if (!c || !window.EBSAdmin) return;
    var v = c.textContent.replace(/\s+/g, " ").trim();
    if (v === c.dataset.orig) return;
    window.EBSAdmin.saveCaption(c.dataset.capslot, v).then(function () { c.dataset.orig = v; toast("글씨를 저장했어요"); }).catch(function (er) { toast(er.message); });
  });
  window.addEventListener("popstate", function () { render(stripBase(location.pathname), false); });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("load", function () { /* 자주 보는 첫 페이지 이미지 미리 확보 */ });

  /* ───────── 시작 ───────── */
  window.EBS = { get C() { return C; }, set C(v) { C = v; }, get ME() { return ME; }, esc: esc, toast: toast, render: function () { render(path, false); }, setMe: function (m) { ME = m; render(path, false); }, go: function (p) { render(p, true); }, thumb: thumb, CATS: CATS, POSTCATS: POSTCATS };
  render(path, false);
  if (!STATIC) fetch("/api/me", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (m) {
    ME = m;
    if (m.admin && ls("ebs-edit") === "1") document.body.classList.add("edit-on");
    if (m.admin || path === "/admin") render(path, false);
  }).catch(function () {});
})();
