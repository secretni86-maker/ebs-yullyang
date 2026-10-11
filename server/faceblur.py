"""아이 얼굴 자동 모자이크 (사진/영상 공용).

OpenCV 의 YuNet 얼굴 검출 모델을 사용합니다. 인터넷 연결 없이 이 컴퓨터에서만 동작합니다.
"""
import os
import shutil
import tempfile
import cv2
import numpy as np

MODEL = os.path.join(os.path.dirname(__file__), "models", "yunet.onnx")
_det = None


def _detector(w, h, thr):
    global _det
    if _det is None:
        # OpenCV 는 한글 경로를 못 읽으므로 영문 임시 폴더로 복사해서 사용
        tmp = os.path.join(tempfile.gettempdir(), "ebs_yunet.onnx")
        if not os.path.exists(tmp) or os.path.getsize(tmp) != os.path.getsize(MODEL):
            part = tmp + ".%d" % os.getpid()  # 여러 프로세스가 동시에 복사해도 깨지지 않게
            shutil.copyfile(MODEL, part)
            os.replace(part, tmp)
        _det = cv2.FaceDetectorYN.create(tmp, "", (w, h), thr, 0.3, 5000)
    _det.setInputSize((w, h))
    _det.setScoreThreshold(thr)
    return _det


def _detect_once(img, thr):
    h, w = img.shape[:2]
    det = _detector(w, h, thr)
    _, faces = det.detect(img)
    out = []
    if faces is not None:
        for f in faces:
            x, y, fw, fh = f[:4]
            out.append((float(x), float(y), float(fw), float(fh), float(f[-1])))
    return out


def _iou(a, b):
    ax2, ay2, bx2, by2 = a[0] + a[2], a[1] + a[3], b[0] + b[2], b[1] + b[3]
    iw = max(0, min(ax2, bx2) - max(a[0], b[0]))
    ih = max(0, min(ay2, by2) - max(a[1], b[1]))
    inter = iw * ih
    u = a[2] * a[3] + b[2] * b[3] - inter
    return inter / u if u > 0 else 0


def detect_faces(img, thr=0.5, deep=True):
    """얼굴 상자 목록 [(x,y,w,h)] 반환. deep=True 면 확대/회전도 시도해서 더 꼼꼼히 찾습니다."""
    H, W = img.shape[:2]
    found = []
    # 1) 원본(긴 변 1280 이하)
    s = min(1.0, 1280 / max(H, W))
    small = cv2.resize(img, None, fx=s, fy=s) if s < 1 else img
    for (x, y, w, h, sc) in _detect_once(small, thr):
        found.append((x / s, y / s, w / s, h / s))
    if deep:
        # 2) 1.6배 확대한 타일 (작은 얼굴)
        up = 1.6
        big_s = min(up, 2400 / max(H, W)) if max(H, W) < 2400 else 0
        if big_s > 1.05:
            big = cv2.resize(img, None, fx=big_s, fy=big_s)
            for (x, y, w, h, sc) in _detect_once(big, thr):
                found.append((x / big_s, y / big_s, w / big_s, h / big_s))
        elif max(H, W) >= 2400:
            # 큰 사진은 4분할 타일로 한 번 더
            th, tw = H // 2, W // 2
            ov = int(0.15 * max(th, tw))
            for ty in (0, th):
                for tx in (0, tw):
                    y0, x0 = max(0, ty - ov), max(0, tx - ov)
                    y1, x1 = min(H, ty + th + ov), min(W, tx + tw + ov)
                    tile = img[y0:y1, x0:x1]
                    ts = min(1.0, 1280 / max(tile.shape[:2]))
                    t2 = cv2.resize(tile, None, fx=ts, fy=ts) if ts < 1 else tile
                    for (x, y, w, h, sc) in _detect_once(t2, thr):
                        found.append((x / ts + x0, y / ts + y0, w / ts, h / ts))
        # 3) 90도 회전본 (옆으로 누운 얼굴)
        for rot, code in ((90, cv2.ROTATE_90_CLOCKWISE), (-90, cv2.ROTATE_90_COUNTERCLOCKWISE)):
            r = cv2.rotate(small, code)
            rh, rw = r.shape[:2]
            for (x, y, w, h, sc) in _detect_once(r, max(thr, 0.6)):
                if rot == 90:  # 시계방향 회전 -> 원래 좌표로
                    ox, oy, ow, oh = y, rw - (x + w), h, w
                else:
                    ox, oy, ow, oh = rh - (y + h), x, h, w
                found.append((ox / s, oy / s, ow / s, oh / s))
    # 중복 제거
    merged = []
    for f in sorted(found, key=lambda b: -b[2] * b[3]):
        if all(_iou(f, m) < 0.3 for m in merged):
            merged.append(f)
    return merged


def pixelate_regions(img, boxes, grow=1.45):
    """각 얼굴 상자를 타원 모양으로 모자이크."""
    H, W = img.shape[:2]
    out = img.copy()
    for (x, y, w, h) in boxes:
        cx, cy = x + w / 2, y + h / 2 + h * 0.05
        rw, rh = w * grow / 2, h * grow / 2
        x0, y0 = int(max(0, cx - rw)), int(max(0, cy - rh))
        x1, y1 = int(min(W, cx + rw)), int(min(H, cy + rh))
        if x1 - x0 < 4 or y1 - y0 < 4:
            continue
        roi = out[y0:y1, x0:x1]
        bs = max(6, int(min(x1 - x0, y1 - y0) / 7))
        small = cv2.resize(roi, (max(1, (x1 - x0) // bs), max(1, (y1 - y0) // bs)), interpolation=cv2.INTER_AREA)
        pix = cv2.resize(small, (x1 - x0, y1 - y0), interpolation=cv2.INTER_NEAREST)
        mask = np.zeros((y1 - y0, x1 - x0), np.uint8)
        cv2.ellipse(mask, ((x1 - x0) // 2, (y1 - y0) // 2), ((x1 - x0) // 2, (y1 - y0) // 2), 0, 0, 360, 255, -1)
        mask = cv2.GaussianBlur(mask, (0, 0), max(1, bs / 4))
        m = (mask.astype(np.float32) / 255.0)[..., None]
        out[y0:y1, x0:x1] = (pix * m + roi * (1 - m)).astype(np.uint8)
    return out


def blur_image(img, thr=0.5, deep=True):
    boxes = detect_faces(img, thr, deep)
    return pixelate_regions(img, boxes), len(boxes)
