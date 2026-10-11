"""원본 영상 -> 아이 얼굴 모자이크 + 가볍게 압축 (모바일에서 빨리 열리도록).

사용: py process_videos.py            (실습4 폴더의 mp4 전체)
결과: site/media/videos/ 에 영상(mp4)과 대표 이미지(jpg)가 저장됩니다.
"""
import glob
import os
import subprocess
import sys

import cv2
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "server"))
import faceblur  # noqa: E402

SRC = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.abspath(os.path.join(HERE, "..", "media", "videos"))
os.makedirs(OUT, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# 원장님 본인이 나오는 영상은 모자이크하지 않습니다. (파일 이름 끝부분으로 구분)
NO_BLUR = {"231620277", "231639942", "231651717", "232549589"}  # 원장님 / 교재·포스터 화면
TARGET_W = 720
THR = float(os.environ.get('BLUR_THR', '0.55'))   # 낮을수록 더 꼼꼼히(가끔 엉뚱한 곳도) 가림
DEEP = int(os.environ.get('BLUR_DEEP', '3'))


def imwrite_u(path, img):
    """한글 경로에서도 저장되는 이미지 쓰기 (cv2.imwrite 는 한글 경로를 못 씁니다)."""
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 82])
    if ok:
        buf.tofile(path)


def process(path, idx):
    tag = os.path.basename(path)
    blur = not (os.environ.get('NO_BLUR_ALL') == '1' or any(t in tag for t in NO_BLUR))
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    W, H = int(cap.get(3)), int(cap.get(4))
    s = TARGET_W / W
    ow, oh = TARGET_W, int(H * s) // 2 * 2
    name = "v%02d" % idx
    out = os.path.join(OUT, name + ".mp4")
    cmd = [FFMPEG, "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", "%dx%d" % (ow, oh), "-r", str(fps), "-i", "-",
           "-i", path, "-map", "0:v", "-map", "1:a?",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-shortest", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    held = []  # (boxes, 남은 프레임) : 한두 프레임 놓쳐도 가려지도록 잠깐 유지
    n = 0
    poster_done = False
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        fr = cv2.resize(fr, (ow, oh), interpolation=cv2.INTER_AREA)
        if blur:
            # 매 프레임: 원본 + 90도 회전 검출 (deep=False 가 빠름), 3프레임마다 확대 검출
            boxes = faceblur.detect_faces(fr, THR, deep=(n % DEEP == 0))
            if boxes:
                held = [(b, 6) for b in boxes]
            else:
                held = [(b, k - 1) for b, k in held if k > 1]
            use = [b for b, _ in held]
            fr = faceblur.pixelate_regions(fr, use, grow=1.6)
        if not poster_done and n >= fps * 1.0:
            imwrite_u(os.path.join(OUT, name + ".jpg"), fr)
            poster_done = True
        p.stdin.write(fr.tobytes())
        n += 1
    p.stdin.close()
    p.wait()
    if not poster_done:
        imwrite_u(os.path.join(OUT, name + ".jpg"), fr)
    print(name, tag, "blur" if blur else "no-blur", n, "frames", flush=True)


if __name__ == "__main__":
    vids = sorted(glob.glob(os.path.join(SRC, "*.mp4")), key=lambda p: os.path.basename(p).lstrip("1"))
    only = sys.argv[1:]
    for i, v in enumerate(vids, 1):
        if only and ("v%02d" % i) not in only:
            continue
        process(v, i)
    print("DONE")
