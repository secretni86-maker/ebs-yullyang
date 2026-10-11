"""영상 한 개를 (선택) 아이 얼굴 모자이크 + 가볍게 압축해서 저장합니다."""
import os
import subprocess

import cv2
import imageio_ffmpeg

import faceblur

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
TARGET_W = 720



def imwrite_u(path, img):
    """한글 경로에서도 저장되는 이미지 쓰기 (cv2.imwrite 는 한글 경로를 못 씁니다)."""
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 82])
    if ok:
        buf.tofile(path)

def blur_video(src, dst_mp4, dst_poster, blur=True, progress=None):
    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        raise RuntimeError("영상을 열 수 없습니다")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    W, H = int(cap.get(3)), int(cap.get(4))
    s = TARGET_W / W if W > TARGET_W else 1.0
    ow, oh = int(W * s) // 2 * 2, int(H * s) // 2 * 2
    cmd = [FFMPEG, "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", "%dx%d" % (ow, oh), "-r", str(fps), "-i", "-",
           "-i", src, "-map", "0:v", "-map", "1:a?",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-shortest", dst_mp4]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    held, n, poster_done = [], 0, False
    fr = None
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        fr = cv2.resize(fr, (ow, oh), interpolation=cv2.INTER_AREA)
        if blur:
            boxes = faceblur.detect_faces(fr, 0.55, deep=(n % 3 == 0))
            held = [(b, 6) for b in boxes] if boxes else [(b, k - 1) for b, k in held if k > 1]
            fr = faceblur.pixelate_regions(fr, [b for b, _ in held], grow=1.6)
        if not poster_done and n >= fps:
            imwrite_u(dst_poster, fr)
            poster_done = True
        p.stdin.write(fr.tobytes())
        n += 1
        if progress and n % 30 == 0:
            progress(min(0.99, n / total))
    p.stdin.close()
    p.wait()
    if not poster_done and fr is not None:
        imwrite_u(dst_poster, fr)
    if p.returncode != 0:
        raise RuntimeError("영상 변환 실패")
