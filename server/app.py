"""잉글리시 브레인 스튜디오 율량주성점 홈페이지 서버.

파이썬 기본 기능만으로 동작하는 작은 서버입니다. (사진 처리에만 Pillow/OpenCV 사용)
실행:  py server/app.py            (내 컴퓨터에서만 접속)
       py server/app.py --public   (같은 와이파이의 휴대폰에서도 접속)
"""
import argparse
import hashlib
import hmac
import html
import io
import json
import mimetypes
import os
import re
import secrets
import shutil
import sys
import threading
import time
import uuid
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
import defaults  # noqa: E402

DATA = os.path.join(ROOT, "data")
WEB = os.path.join(ROOT, "web")
MEDIA = os.path.join(ROOT, "media")
UPLOADS = os.path.join(MEDIA, "uploads")
BACKUP = os.path.join(DATA, "backup")
CONTENT_FILE = os.path.join(DATA, "content.json")
AUTH_FILE = os.path.join(DATA, "auth.json")
for d in (DATA, UPLOADS, BACKUP):
    os.makedirs(d, exist_ok=True)

ROUTES = {
    "/": ("home", None),
    "/about": ("about", "원장 소개"),
    "/kindergarten": ("kinder", "유치부 영어"),
    "/elementary": ("elementary", "초등부 영어"),
    "/middle": ("middle", "중등부 영어"),
    "/gallery": ("gallery", "수업 사진"),
    "/videos": ("videos", "수업 영상"),
    "/reviews": ("reviews", "학부모 후기"),
    "/tuition": ("tuition", "수업료·시간표"),
    "/location": ("location", "오시는 길"),
    "/contact": ("contact", "상담·수업 문의"),
    "/admin": ("admin", "관리자"),
}
SECTIONS = {"about": dict, "site": dict, "slots": dict, "slotNotes": dict, "slotCaptions": dict, "texts": dict, "gallery": list, "videos": list, "posts": list, "reviews": list}
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
VID_EXT = {".mp4", ".mov", ".m4v"}
MAX_UPLOAD = 400 * 1024 * 1024

LOCK = threading.RLock()
SESSIONS = {}  # token -> 만료 시각
SESS_FILE = os.path.join(DATA, "sessions.json")


def _load_sessions():
    try:
        with open(SESS_FILE, encoding="utf-8") as f:
            now = time.time()
            SESSIONS.update({k: v for k, v in json.load(f).items() if v > now})
    except Exception:  # noqa: BLE001
        pass


def _save_sessions():
    try:
        with open(SESS_FILE, "w", encoding="utf-8") as f:
            json.dump(SESSIONS, f)
    except Exception:  # noqa: BLE001
        pass

FAILS = {}  # ip -> [시각...]
JOBS = {}  # 영상 처리 상태


# ───────────────────────── 저장소 ─────────────────────────
def load_content():
    with LOCK:
        if not os.path.exists(CONTENT_FILE):
            save_content(defaults.default_content())
        with open(CONTENT_FILE, encoding="utf-8") as f:
            c = json.load(f)
    base = defaults.default_content()
    for k, v in base.items():  # 새로 생긴 항목이 있으면 채워 넣기
        if k not in c:
            c[k] = v
        elif isinstance(v, dict):
            for kk, vv in v.items():
                c[k].setdefault(kk, vv)
    return c


def save_content(c):
    with LOCK:
        tmp = CONTENT_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(c, f, ensure_ascii=False, indent=2)
        os.replace(tmp, CONTENT_FILE)


def hash_pw(pw, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 240_000).hex()
    return {"salt": salt, "hash": h}


def pw_set():
    return os.path.exists(AUTH_FILE)


def pw_check(pw):
    try:
        with open(AUTH_FILE, encoding="utf-8") as f:
            a = json.load(f)
        return hmac.compare_digest(hash_pw(pw, a["salt"])["hash"], a["hash"])
    except Exception:
        return False


# ───────────────────────── 사진 처리 ─────────────────────────
def process_photo(raw, blur):
    """업로드한 사진 → 방향 바로잡기, 크기 줄이기, (선택) 아이 얼굴 모자이크. 저장 후 경로 반환."""
    import cv2
    import numpy as np
    from PIL import Image, ImageOps
    import faceblur

    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    faces = 0
    if blur:
        a = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
        boxes = faceblur.detect_faces(a, 0.6)
        H, W = a.shape[:2]
        boxes = [b for b in boxes if b[2] > W * 0.02 and 0.6 < b[2] / b[3] < 1.5]
        a = faceblur.pixelate_regions(a, boxes, grow=1.55)
        faces = len(boxes)
        im = Image.fromarray(cv2.cvtColor(a, cv2.COLOR_BGR2RGB))
    name = "p-" + uuid.uuid4().hex[:10]
    write_photo(im, name)
    return {"src": "/media/uploads/%s.jpg" % name, "thumb": "/media/uploads/%s_t.jpg" % name, "faces": faces}


def write_photo(im, name, folder=UPLOADS):
    from PIL import Image
    big = im.copy()
    big.thumbnail((2000, 2000), Image.LANCZOS)
    big.save(os.path.join(folder, name + ".jpg"), quality=84, optimize=True, progressive=True)
    t = im.copy()
    t.thumbnail((800, 800), Image.LANCZOS)
    t.save(os.path.join(folder, name + "_t.jpg"), quality=78, optimize=True, progressive=True)


def media_path(src):
    """/media/... 주소 → 실제 파일 경로 (밖으로 나가는 경로는 거부)."""
    if not src.startswith("/media/"):
        return None
    p = os.path.abspath(os.path.join(ROOT, unquote(src.split("?")[0]).lstrip("/")))
    return p if p.startswith(MEDIA + os.sep) and os.path.isfile(p) else None


def apply_mosaic(src, boxes):
    """사진 위의 지정한 곳(비율)을 모자이크해서 새 사진으로 저장."""
    import cv2
    import numpy as np
    from PIL import Image
    import faceblur

    p = media_path(src)
    if not p or not p.lower().endswith(".jpg") or p.endswith("_t.jpg"):
        raise ValueError("이 사진은 수정할 수 없습니다")
    im = Image.open(p).convert("RGB")
    a = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    H, W = a.shape[:2]
    man = []
    for b in boxes[:60]:
        cx, cy, r = float(b["x"]), float(b["y"]), float(b["r"])
        d = max(0.01, min(0.6, r)) * 2 * W
        man.append((cx * W - d / 2, cy * H - d / 2, d, d))
    a = faceblur.pixelate_regions(a, man, grow=1.0)
    im2 = Image.fromarray(cv2.cvtColor(a, cv2.COLOR_BGR2RGB))
    name = "p-" + uuid.uuid4().hex[:10]  # 원본은 그대로 두고 새 사진으로 저장 (브라우저 캐시 문제 방지)
    write_photo(im2, name)
    return {"src": "/media/uploads/%s.jpg" % name, "thumb": "/media/uploads/%s_t.jpg" % name}


def run_video_job(job_id, tmp, name, blur, entry, is_new=True):
    import videoblur
    try:
        mp4 = os.path.join(UPLOADS, name + ".mp4")
        poster = os.path.join(UPLOADS, name + ".jpg")

        def prog(x):
            JOBS[job_id]["progress"] = x

        videoblur.blur_video(tmp, mp4, poster, blur, prog)
        with LOCK:
            c = load_content()
            for v in c["videos"]:
                if v["id"] == entry["id"]:
                    v.pop("processing", None)
                    v.pop("replacing", None)
                    v["src"] = "/media/uploads/%s.mp4" % name
                    v["poster"] = "/media/uploads/%s.jpg" % name
            save_content(c)
        JOBS[job_id].update(state="done", progress=1.0)
    except Exception as e:  # noqa: BLE001
        JOBS[job_id].update(state="error", error=str(e))
        with LOCK:
            c = load_content()
            if is_new:
                c["videos"] = [v for v in c["videos"] if v["id"] != entry["id"]]
            else:  # 교체 실패: 원래 영상은 그대로 둡니다
                for v in c["videos"]:
                    if v["id"] == entry["id"]:
                        v.pop("replacing", None)
            save_content(c)
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass


# ───────────────────────── 검색엔진용 페이지 정보 ─────────────────────────
def page_meta(path, c):
    s = c["site"]
    key, label = ROUTES.get(path, ("home", None))
    brand = s["name"]
    region = "청주 율량·주성동"
    titles = {
        "home": "%s 영어학원 | %s" % (region, brand),
        "about": "원장 소개 | %s" % brand,
        "kinder": "청주 유치부 영어 | %s" % brand,
        "elementary": "청주 초등 영어 | %s" % brand,
        "middle": "청주 중등 영어 · 내신 대비 | %s" % brand,
        "gallery": "수업 사진 | %s" % brand,
        "videos": "수업 영상 | %s" % brand,
        "reviews": "학부모 후기 | %s" % brand,
        "tuition": "수업료·시간표 | %s" % brand,
        "location": "오시는 길 | 청주시 청원구 율량로 124 | %s" % brand,
        "contact": "상담·수업 문의 | %s" % brand,
        "admin": "관리자 | %s" % brand,
    }
    descs = {
        "home": "충북 청주시 청원구 율량·주성동의 영어 스튜디오. 유치부·초등부·중등부 아이들이 읽고 말하고 쓰고 발표하며 영어를 배웁니다. 상담과 수업 문의 환영.",
        "about": "영어 지도 12년 이상, %s 원장이 직접 아이들과 수업합니다. 교육 철학과 이력을 소개합니다." % s["director"],
        "kinder": "청주 유치부 영어. 그림책, 파닉스, 말하기, Show & Tell, 만들기 프로젝트로 영어와 친해지는 시간.",
        "elementary": "청주 초등 영어. 읽기·어휘·말하기·쓰기·듣기와 발표, 프로젝트, 융합 활동으로 영어 실력을 단단하게.",
        "middle": "청주 중등 영어. 학교 영어와 내신, 독해·문법·어휘·서술형까지 차분하게 준비하는 수업.",
        "gallery": "율량·주성동 영어 스튜디오의 실제 수업 사진 모음.",
        "videos": "아이들이 영어로 읽고 말하고 만드는 실제 수업 영상.",
        "reviews": "학부모님과 학생들의 수업 후기.",
        "tuition": "대상, 인원, 수업 시간, 시간표와 수업료 안내.",
        "location": "%s 에 있습니다. 주성동 대원칸타빌 3차, 선광 로즈웰 2차 아파트 사이 뱃살도둑 건물 3층." % s["address"],
        "contact": "전화, 문자, 블로그, 인스타그램으로 편하게 상담과 수업을 문의하세요. %s" % s["phone"],
        "admin": "관리자",
    }
    ld = {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "name": brand,
        "alternateName": s.get("nameEn", ""),
        "description": descs["home"],
        "telephone": s["phone"],
        "address": {"@type": "PostalAddress", "addressCountry": "KR", "addressRegion": "충청북도",
                    "addressLocality": "청주시 청원구", "streetAddress": "율량로 124, 301호"},
        "founder": {"@type": "Person", "name": s["director"]},
        "sameAs": [u for u in (s.get("blog"), s.get("instagram"), s.get("youtube")) if u],
    }
    return titles.get(key, brand), descs.get(key, ""), ld, key


def render_shell(path, host):
    c = load_content()
    title, desc, ld, key = page_meta(path, c)
    with open(os.path.join(WEB, "app.html"), encoding="utf-8") as f:
        t = f.read()
    base = "http://" + host
    og_img = base + (c["slots"].get("hero") or "")
    robots = "noindex,nofollow" if key == "admin" else "index,follow"
    head = (
        "<title>%s</title>\n<meta name=\"description\" content=\"%s\">\n<meta name=\"robots\" content=\"%s\">\n"
        "<link rel=\"canonical\" href=\"%s\">\n<meta property=\"og:type\" content=\"website\">\n"
        "<meta property=\"og:title\" content=\"%s\">\n<meta property=\"og:description\" content=\"%s\">\n"
        "<meta property=\"og:image\" content=\"%s\">\n<meta property=\"og:locale\" content=\"ko_KR\">\n"
        "<meta name=\"theme-color\" content=\"%s\">\n<script type=\"application/ld+json\">%s</script>\n"
    ) % (html.escape(title), html.escape(desc, True), robots, html.escape(base + path, True), html.escape(title, True),
         html.escape(desc, True), html.escape(og_img, True), html.escape(c["site"]["bg"], True),
         json.dumps(ld, ensure_ascii=False).replace("</", "<\\/"))
    boot = "<script>window.__BOOT__=%s;</script>" % json.dumps(public_content(c), ensure_ascii=False).replace("</", "<\\/")
    return t.replace("<!--HEAD-->", head).replace("<!--BOOT-->", boot).encode("utf-8")


def public_content(c):
    out = {k: c[k] for k in ("site", "about", "slots", "slotNotes", "slotCaptions", "texts", "gallery", "videos", "posts", "reviews")}
    out["videos"] = [v for v in c["videos"] if not v.get("processing")]
    return out


# ───────────────────────── HTTP ─────────────────────────
class H(BaseHTTPRequestHandler):
    server_version = "EBS-Site/1.0"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *a):
        if "--quiet" not in sys.argv:
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % a))

    # --- 도우미 ---
    def send_bytes(self, code, body, ctype, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        if self.command == "POST":  # 본문을 다 읽지 않고 답한 경우에도 연결이 꼬이지 않도록
            self.send_header("Connection", "close")
            self.close_connection = True
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def send_json(self, obj, code=200, extra=None):
        self.send_bytes(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8",
                        dict({"Cache-Control": "no-store"}, **(extra or {})))

    def is_admin(self):
        ck = SimpleCookie(self.headers.get("Cookie", ""))
        m = ck.get("ebs_admin")
        exp = SESSIONS.get(m.value) if m else None
        return bool(exp and exp > time.time())

    def need_admin(self):
        if not self.is_admin():
            self.send_json({"error": "로그인이 필요합니다"}, 401)
            return False
        if self.headers.get("X-Requested-With") != "ebs":
            self.send_json({"error": "잘못된 요청입니다"}, 403)
            return False
        return True

    def body_json(self, limit=5_000_000):
        raw = self._raw if getattr(self, "_raw", None) is not None else b""
        if len(raw) > limit:
            raise ValueError("too big")
        return json.loads(raw or b"{}")

    def serve_file(self, path, immutable=False, revalidate=False):
        if not os.path.isfile(path):
            return self.send_bytes(404, "찾을 수 없습니다".encode(), "text/plain; charset=utf-8")
        size = os.path.getsize(path)
        mtime = int(os.path.getmtime(path))
        etag = '"%x-%x"' % (mtime, size)
        if revalidate and self.headers.get("If-None-Match") == etag:  # 바뀌지 않았으면 다시 받지 않게
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            return
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        start, end, code = 0, size - 1, 200
        rng = self.headers.get("Range")
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else size - 1
                elif m.group(2):
                    start = max(0, size - int(m.group(2)))
                if start >= size or end < start:
                    self.send_response(416)
                    self.send_header("Content-Range", "bytes */%d" % size)
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                end = min(end, size - 1)
                code = 206
        length = end - start + 1
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-cache" if revalidate else ("public, max-age=2592000, immutable" if immutable else "public, max-age=300"))
        if revalidate:
            self.send_header("ETag", etag)
        if code == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.end_headers()
        if self.command == "HEAD":
            return
        try:
            with open(path, "rb") as f:
                f.seek(start)
                left = length
                while left > 0:
                    chunk = f.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (ConnectionError, BrokenPipeError):
            pass

    # --- GET ---
    do_HEAD = lambda self: self.do_GET()  # noqa: E731

    def do_GET(self):
        u = urlparse(self.path)
        path = u.path
        if len(path) > 1 and path.endswith("/"):
            path = path[:-1]
        host = self.headers.get("Host", "localhost")
        try:
            if path in ROUTES:
                return self.send_bytes(200, render_shell(path, host), "text/html; charset=utf-8", {"Cache-Control": "no-cache"})
            if path.startswith("/static/"):
                p = os.path.abspath(os.path.join(WEB, unquote(path[len("/static/"):])))
                if not p.startswith(WEB + os.sep):
                    return self.send_bytes(403, b"", "text/plain")
                return self.serve_file(p, revalidate=True)
            if path.startswith("/media/"):
                p = os.path.abspath(os.path.join(ROOT, unquote(path).lstrip("/")))
                if not p.startswith(MEDIA + os.sep):
                    return self.send_bytes(403, b"", "text/plain")
                return self.serve_file(p, immutable="/uploads/" in path and "v=" not in (u.query or ""))
            if path == "/api/content":
                return self.send_json(public_content(load_content()))
            if path == "/api/me":
                return self.send_json({"admin": self.is_admin(), "needSetup": not pw_set()})
            if path == "/api/admin/media":
                if not self.is_admin():
                    return self.send_json({"error": "로그인이 필요합니다"}, 401)
                items = []
                for folder, base in ((UPLOADS, "/media/uploads/"), (os.path.join(MEDIA, "photos"), "/media/photos/"),
                                     (os.path.join(MEDIA, "stock"), "/media/stock/")):
                    if os.path.isdir(folder):
                        for fn in sorted(os.listdir(folder), key=lambda x: -os.path.getmtime(os.path.join(folder, x))):
                            if fn.lower().endswith(".jpg") and not fn.endswith("_t.jpg"):
                                t = fn[:-4] + "_t.jpg"
                                items.append({"src": base + fn, "thumb": base + (t if os.path.exists(os.path.join(folder, t)) else fn)})
                return self.send_json({"items": items})
            if path == "/api/admin/job":
                if not self.is_admin():
                    return self.send_json({"error": "로그인이 필요합니다"}, 401)
                j = JOBS.get(parse_qs(u.query).get("id", [""])[0])
                return self.send_json(j or {"state": "unknown"})
            if path == "/sitemap.xml":
                base = "http://" + host
                urls = "".join("<url><loc>%s%s</loc></url>" % (base, p) for p in ROUTES if p != "/admin")
                return self.send_bytes(200, ('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">%s</urlset>' % urls).encode(), "application/xml")
            if path == "/robots.txt":
                return self.send_bytes(200, ("User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: http://%s/sitemap.xml\n" % host).encode(), "text/plain")
            if path == "/favicon.ico":
                return self.serve_file(os.path.join(MEDIA, "brand", "favicon.png"))
            return self.send_bytes(404, render_shell("/", host).replace(b"<title>", b"<title>(404) "), "text/html; charset=utf-8")
        except (ConnectionError, BrokenPipeError):
            pass

    # --- POST ---
    def do_POST(self):
        u = urlparse(self.path)
        path, q = u.path, parse_qs(u.query)
        try:
            self._raw = None
            if path != "/api/admin/upload":  # 사진·영상 업로드만 스트리밍, 나머지는 본문을 먼저 다 읽어 둡니다
                n = int(self.headers.get("Content-Length") or 0)
                self._raw = self.rfile.read(n) if 0 < n <= 8_000_000 else b""
            elif not self.is_admin():
                n = int(self.headers.get("Content-Length") or 0)
                if n <= 50_000_000:
                    self.rfile.read(n)
            if path == "/api/login":
                ip = self.client_address[0]
                now = time.time()
                FAILS[ip] = [t for t in FAILS.get(ip, []) if now - t < 600]
                if len(FAILS[ip]) >= 8:
                    return self.send_json({"error": "잠시 후 다시 시도해 주세요 (10분)"}, 429)
                d = self.body_json()
                if not pw_set() or not pw_check(str(d.get("password", ""))):
                    FAILS[ip].append(now)
                    return self.send_json({"error": "비밀번호가 맞지 않습니다"}, 401)
                return self.send_json({"ok": True}, 200, {"Set-Cookie": self.new_session()})
            if path == "/api/setup":  # 처음 한 번만: 비밀번호 만들기
                if pw_set():
                    return self.send_json({"error": "이미 설정되어 있습니다"}, 403)
                pw = str(self.body_json().get("password", ""))
                if len(pw) < 6:
                    return self.send_json({"error": "비밀번호는 6자 이상으로 만들어 주세요"}, 400)
                with open(AUTH_FILE, "w", encoding="utf-8") as f:
                    json.dump(hash_pw(pw), f)
                return self.send_json({"ok": True}, 200, {"Set-Cookie": self.new_session()})
            if path == "/api/logout":
                ck = SimpleCookie(self.headers.get("Cookie", ""))
                if ck.get("ebs_admin"):
                    SESSIONS.pop(ck["ebs_admin"].value, None)
                    _save_sessions()
                return self.send_json({"ok": True}, 200, {"Set-Cookie": "ebs_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict"})

            if not path.startswith("/api/admin/"):
                return self.send_json({"error": "없는 주소"}, 404)
            if not self.need_admin():
                return
            if path == "/api/admin/password":
                d = self.body_json()
                if not pw_check(str(d.get("old", ""))) or len(str(d.get("new", ""))) < 6:
                    return self.send_json({"error": "현재 비밀번호가 다르거나, 새 비밀번호가 6자 미만입니다"}, 400)
                with open(AUTH_FILE, "w", encoding="utf-8") as f:
                    json.dump(hash_pw(str(d["new"])), f)
                return self.send_json({"ok": True})
            if path == "/api/admin/save":
                d = self.body_json()
                sec, val = d.get("section"), d.get("data")
                if sec not in SECTIONS or not isinstance(val, SECTIONS[sec]):
                    return self.send_json({"error": "저장할 수 없는 항목"}, 400)
                with LOCK:
                    c = load_content()
                    if sec == "about":  # 글 + 목록(줄 단위)
                        clean = {}
                        for k, v in val.items():
                            if k in ("education", "career", "homeBullets") and isinstance(v, list):
                                clean[k] = [str(x).strip() for x in v if str(x).strip()][:30]
                            elif k in ("lead", "homeBlurb"):
                                clean[k] = str(v).strip()[:2000]
                        c["about"].update(clean)
                    elif sec == "texts":  # 화면 글씨 고치기: 빈 글씨는 '원래 문구로 되돌리기'
                        for k, v in val.items():
                            k = str(k)[:400]
                            v = str(v).strip()[:1500]
                            if v:
                                c["texts"][k] = v
                            else:
                                c["texts"].pop(k, None)
                    elif sec in ("site", "slots", "slotNotes", "slotCaptions"):
                        c[sec].update({k: str(v) for k, v in val.items() if isinstance(k, str)})
                    else:
                        c[sec] = val
                    save_content(c)
                return self.send_json({"ok": True, "content": public_content(load_content())})
            if path == "/api/admin/upload":
                n = int(self.headers.get("Content-Length") or 0)
                if n <= 0 or n > MAX_UPLOAD:
                    return self.send_json({"error": "파일이 비었거나 너무 큽니다 (400MB 이하)"}, 400)
                name = unquote(q.get("name", ["file"])[0])
                ext = os.path.splitext(name)[1].lower()
                kind = q.get("kind", ["photo"])[0]
                blur = q.get("blur", ["1"])[0] == "1"
                if kind == "photo":
                    if ext not in IMG_EXT:
                        return self.send_json({"error": "사진 파일(jpg, png, webp)만 올릴 수 있어요"}, 400)
                    raw = self.rfile.read(n)
                    try:
                        return self.send_json(process_photo(raw, blur))
                    except Exception as e:  # noqa: BLE001
                        return self.send_json({"error": "사진을 읽지 못했어요: %s" % e}, 400)
                if kind == "logo":
                    from PIL import Image
                    if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
                        return self.send_json({"error": "png, jpg 파일만 올릴 수 있어요"}, 400)
                    im = Image.open(io.BytesIO(self.rfile.read(n))).convert("RGBA")
                    im.thumbnail((600, 600))
                    nm = "logo-" + uuid.uuid4().hex[:8] + ".png"
                    im.save(os.path.join(UPLOADS, nm))
                    return self.send_json({"src": "/media/uploads/" + nm})
                if kind == "video":
                    if ext not in VID_EXT:
                        return self.send_json({"error": "영상 파일(mp4, mov)만 올릴 수 있어요"}, 400)
                    jid = uuid.uuid4().hex[:8]
                    tmp = os.path.join(DATA, "tmp_%s%s" % (jid, ext))
                    left = n
                    with open(tmp, "wb") as f:
                        while left > 0:
                            chunk = self.rfile.read(min(1 << 20, left))
                            if not chunk:
                                break
                            f.write(chunk)
                            left -= len(chunk)
                    rep = q.get("replace", [""])[0]
                    with LOCK:
                        c = load_content()
                        target = next((v for v in c["videos"] if v["id"] == rep), None) if rep else None
                        if target:  # 기존 영상 교체: 제목·분류·자리는 그대로
                            vid, is_new, entry = target["id"], False, target
                            target["replacing"] = True
                        else:
                            vid, is_new = "v-" + uuid.uuid4().hex[:8], True
                            entry = {"id": vid, "src": "", "poster": "", "title": os.path.splitext(name)[0][:40], "cat": "kinder", "processing": True}
                            c["videos"].append(entry)
                        save_content(c)
                    JOBS[jid] = {"state": "running", "progress": 0.0, "video": vid}
                    threading.Thread(target=run_video_job, args=(jid, tmp, "vid-%s-%s" % (vid, jid), blur, entry, is_new), daemon=True).start()
                    return self.send_json({"job": jid, "id": vid})
                return self.send_json({"error": "알 수 없는 종류"}, 400)
            if path == "/api/admin/mosaic":
                d = self.body_json()
                try:
                    return self.send_json(apply_mosaic(str(d.get("src", "")), d.get("boxes", [])))
                except Exception as e:  # noqa: BLE001
                    return self.send_json({"error": str(e)}, 400)
            return self.send_json({"error": "없는 주소"}, 404)
        except (ConnectionError, BrokenPipeError):
            pass
        except Exception as e:  # noqa: BLE001
            try:
                self.send_json({"error": "처리 중 오류: %s" % e}, 500)
            except Exception:  # noqa: BLE001
                pass

    def new_session(self):
        tok = secrets.token_urlsafe(32)
        SESSIONS[tok] = time.time() + 60 * 60 * 24 * 14
        _save_sessions()
        return "ebs_admin=%s; Path=/; Max-Age=%d; HttpOnly; SameSite=Strict" % (tok, 60 * 60 * 24 * 14)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--public", action="store_true", help="같은 와이파이의 다른 기기에서도 접속 허용")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    host = "0.0.0.0" if a.public else "127.0.0.1"
    load_content()
    _load_sessions()
    srv = ThreadingHTTPServer((host, a.port), H)
    srv.daemon_threads = True
    print("홈페이지가 열렸습니다 →  http://localhost:%d" % a.port)
    print("관리자 화면            →  http://localhost:%d/admin" % a.port)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
