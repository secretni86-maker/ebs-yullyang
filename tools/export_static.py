"""홈페이지를 GitHub Pages 에 올릴 수 있는 '정적 사이트'로 내보냅니다.

사용:  py tools/export_static.py  [저장소 이름] [GitHub 아이디]
결과:  ../_pages/ 폴더 (이 폴더가 그대로 GitHub Pages 의 내용이 됩니다)

주의: GitHub Pages 는 '보여주기만' 합니다. 관리자 화면(글쓰기·사진 바꾸기)은 내 컴퓨터에서
      홈페이지를 켜서 고친 뒤, 이 도구를 다시 실행해서 새로 올려야 반영됩니다.
"""
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(ROOT, "server"))
import app as site  # noqa: E402

REPO = sys.argv[1] if len(sys.argv) > 1 else "ebs-yullyang"
USER = sys.argv[2] if len(sys.argv) > 2 else "secretni86-maker"
BASE = "/" + REPO
SITE_URL = "https://%s.github.io/%s" % (USER, REPO)
OUT = os.path.abspath(os.path.join(ROOT, "..", "_pages"))


def collect_media(obj, found):
    if isinstance(obj, str):
        if obj.startswith("/media/"):
            found.add(obj.split("?")[0])
    elif isinstance(obj, list):
        for x in obj:
            collect_media(x, found)
    elif isinstance(obj, dict):
        for v in obj.values():
            collect_media(v, found)


def main():
    if os.path.isdir(OUT):
        for name in os.listdir(OUT):
            if name == ".git":
                continue
            p = os.path.join(OUT, name)
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    os.makedirs(OUT, exist_ok=True)

    content = site.load_content()
    pub = site.public_content(content)

    # 1) 쓰이는 사진·영상만 복사 (+ 작은 미리보기 사진)
    found = set(["/media/brand/favicon.png"])
    collect_media(pub, found)
    for src in list(found):
        if src.endswith(".jpg") and not src.endswith("_t.jpg"):
            found.add(src[:-4] + "_t.jpg")
    copied = 0
    for src in sorted(found):
        p = os.path.join(ROOT, src.lstrip("/").replace("/", os.sep))
        if os.path.isfile(p):
            dst = os.path.join(OUT, src.lstrip("/").replace("/", os.sep))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(p, dst)
            copied += 1

    # 2) 화면 파일 (css/js)
    shutil.copytree(os.path.join(ROOT, "web", "css"), os.path.join(OUT, "static", "css"))
    shutil.copytree(os.path.join(ROOT, "web", "js"), os.path.join(OUT, "static", "js"))
    os.remove(os.path.join(OUT, "static", "js", "admin.js"))  # 관리 기능은 정적 사이트에 넣지 않음

    # 3) 페이지별 HTML
    static_flags = '<script>window.__BASE__="%s";window.__STATIC__=true;</script>\n' % BASE
    routes = [r for r in site.ROUTES if r != "/admin"]
    for r in routes:
        html = site.render_shell(r, "__HOST__").decode("utf-8")
        html = html.replace("http://__HOST__", SITE_URL)
        html = re.sub(r'<script src="/static/js/admin\.js"></script>\s*', "", html)
        html = html.replace('"/static/', '"%s/static/' % BASE).replace('"/media/', '"%s/media/' % BASE)
        html = html.replace("<script>window.__BOOT__", static_flags + "<script>window.__BOOT__", 1)
        folder = OUT if r == "/" else os.path.join(OUT, r.strip("/"))
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)
        if r == "/":  # 없는 주소로 들어와도 홈이 보이게
            shutil.copyfile(os.path.join(folder, "index.html"), os.path.join(OUT, "404.html"))

    with open(os.path.join(OUT, ".nojekyll"), "w") as f:
        f.write("")
    urls = "".join("<url><loc>%s%s</loc></url>" % (SITE_URL, "" if r == "/" else r) for r in routes)
    with open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">%s</urlset>' % urls)
    with open(os.path.join(OUT, "robots.txt"), "w") as f:
        f.write("User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n" % SITE_URL)

    size = sum(os.path.getsize(os.path.join(d, x)) for d, _, fs in os.walk(OUT) for x in fs if ".git" not in d) / 1e6
    print("내보내기 완료: %s  (파일 복사 %d개, 약 %.0fMB)" % (OUT, copied, size))
    print("주소(공개 후):", SITE_URL + "/")


if __name__ == "__main__":
    main()
