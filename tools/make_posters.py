"""이미 만든 영상에서 대표 이미지(포스터)를 뽑습니다."""
import glob, os, cv2
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "media", "videos")
for v in sorted(glob.glob(os.path.join(D, "v*.mp4"))):
    c = cv2.VideoCapture(v); fps = c.get(5) or 30
    c.set(1, int(fps * 1.2)); ok, f = c.read()
    if not ok:
        c.set(1, 0); ok, f = c.read()
    if ok:
        ok2, buf = cv2.imencode(".jpg", f, [cv2.IMWRITE_JPEG_QUALITY, 82]); buf.tofile(v[:-4] + ".jpg"); print(os.path.basename(v))
