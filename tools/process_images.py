"""원본 사진 -> 아이 얼굴 모자이크 + 웹용 크기로 줄이기.

결과: site/media/photos/<이름>.jpg (큰 사진), <이름>_t.jpg (작은 미리보기)
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "server"))
import faceblur  # noqa: E402

SRC = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.abspath(os.path.join(HERE, "..", "media", "photos"))
os.makedirs(OUT, exist_ok=True)

# (원본 파일, 저장 이름, 얼굴 모자이크 여부, 추가로 가릴 영역[비율 x0,y0,x1,y1])
K = "KakaoTalk_20261008_232015678"
JOBS = [
    (K + "_03.jpg", "class-floor-game", True, []),
    (K + "_06.jpg", "class-family-tree", True, [(0.675, 0.36, 0.125)]),  # 옆얼굴은 자동 검출이 놓쳐서 수동 지정
    (K + ".jpg", "class-reading-desks", True, []),
    (K + "_04.jpg", "class-laughing-reading", True, []),
    (K + "_05.jpg", "class-science-water", True, []),
    (K + "_08.jpg", "class-reading-focus", True, []),
    (K + "_07.png", "class-animal-yoga", False, []),
    (K + "_01.jpg", "work-vegetable-man", False, []),
    (K + "_02.jpg", "work-vegetable-man-2", False, "NAME"),
    ("EBS_활동사진 (1).jpg", "class-phonics-cards", True, []),
    ("EBS_활동사진 (13).jpg", "class-alphabet-blocks", False, []),
    ("EBS_활동사진 (18).jpg", "class-emotion-craft", False, []),
    ("EBS_활동사진 (8).jpg", "class-word-game", False, []),
]


def save(img_bgr, name):
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    im = Image.fromarray(rgb)
    big = im.copy()
    big.thumbnail((2000, 2000), Image.LANCZOS)
    big.save(os.path.join(OUT, name + ".jpg"), quality=82, optimize=True, progressive=True)
    t = im.copy()
    t.thumbnail((800, 800), Image.LANCZOS)
    t.save(os.path.join(OUT, name + "_t.jpg"), quality=78, optimize=True, progressive=True)


if __name__ == "__main__":
    for src, name, blur, extra in JOBS:
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert("RGB")
        a = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
        n = 0
        if blur:
            boxes = faceblur.detect_faces(a, 0.6)
            # 너무 작은 상자(포스터 속 그림 등)는 제외
            H, W = a.shape[:2]
            boxes = [b for b in boxes if b[2] > W * 0.02 and 0.6 < b[2] / b[3] < 1.5]
            a = faceblur.pixelate_regions(a, boxes, grow=1.55)
            n = len(boxes)
        if isinstance(extra, list) and extra:
            H, W = a.shape[:2]
            man = [(c * W - w * W / 2, d * H - w * W / 2, w * W, w * W) for c, d, w in extra]
            a = faceblur.pixelate_regions(a, man, grow=1.3)
        if extra == "NAME":  # 학습지의 아이 이름 칸
            H, W = a.shape[:2]
            x0, y0, x1, y1 = int(W * 0.60), int(H * 0.02), int(W * 0.98), int(H * 0.09)
            roi = a[y0:y1, x0:x1]
            a[y0:y1, x0:x1] = cv2.resize(cv2.resize(roi, (6, 3), interpolation=cv2.INTER_AREA), (x1 - x0, y1 - y0), interpolation=cv2.INTER_NEAREST)
        save(a, name)
        print(name, "faces:", n, flush=True)
    # 중등부 (외부 무료 사진): 이미 얼굴 없음/먼 거리
    print("DONE")
