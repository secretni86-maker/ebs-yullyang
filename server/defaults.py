"""사이트의 처음 내용. 처음 실행할 때 data/content.json 으로 저장되고,
그 뒤에는 관리자 화면에서 고치면 됩니다. (파일을 직접 고쳐도 됩니다)
"""

P = "/media/photos/"


def default_content():
    return {
        # ───────── 학원 기본 정보 (여기만 바꾸면 사이트 전체에 반영) ─────────
        "site": {
            "name": "잉글리시 브레인 스튜디오 율량주성점",
            "nameEn": "English Brain Studio Yullyang-Juseong",
            "shortName": "잉글리시 브레인 스튜디오",
            "branch": "율량주성점",
            "tagline": "읽고, 말하고, 만들며 영어가 자라는 작은 스튜디오",
            "director": "Emma shin",
            "directorTitle": "원장",
            "phone": "010-8678-4105",
            "region": "충북 청주시 청원구",
            "address": "충북 청주시 청원구 율량로 124, 301호",
            "addressNote": "주성동 대원칸타빌 3차 · 선광 로즈웰 2차 아파트 사이, 뱃살도둑 건물 3층",
            "blog": "https://blog.naver.com/enbrains_emma",
            "instagram": "https://www.instagram.com/enbrains_emma",
            "kakao": "",
            "reserve": "",
            "youtube": "",
            "logo": "/media/brand/symbol-orange.png",
            "accent": "#C8641E",
            "ink": "#2b2623",
            "bg": "#faf6f0",
            "sage": "#6b7a68",
        },
        # ───────── 원장 소개 글 (관리자 화면 '원장 소개'에서 고칠 수 있어요) ─────────
        "about": {
            "lead": "아이마다 영어를 받아들이는 속도와 방법이 다르다고 믿습니다. 원장이 직접 아이들의 읽기·말하기·쓰기를 가까이에서 보며, 영어가 자연스럽게 ‘나의 말’이 되도록 돕습니다.",
            "education": [
                "영국 London & Bournemouth 거주, 국제학 전공",
                "미국 워싱턴 WVC 대학교 TESOL 과정 수료",
                "필리핀 세부 주니어 영어캠프 스탭 활동",
                "호주·미국 등 영어권 국가에서 근무 경험 다수",
                "교육청 주관 Talk 원어민 장학생 선발",
            ],
            "career": [
                "서울지역 10년, 총 12년 이상 영어 지도 (유치부부터 초·중·고 전 과정까지 폭넓은 티칭 경험)",
                "전 서울지역 YBM, 이보영토킹클럽 등 어학원 강사 활동 다수",
                "국제학교(전 CBIS / 현 SIE) 학생 대상 100% 영어 수업 진행",
                "제주·송도 국제학교 G1~G4 면접 대비 지도 및 다수 합격생 배출",
                "중등 내신 만점 다수 배출 공부법 전수, 고등 4→1등급 상향, 자기주도 공부법 지도 (SKY, 이대, 한양, 경희대 등 영어영역 1등급 졸업생 다수 배출)",
            ],
            "homeBlurb": "영어 지도 12년 이상. 유치부부터 중·고등까지 직접 가르쳐 온 원장이 수업을 맡습니다.",
            "homeBullets": [
                "미국 TESOL 과정 수료, 호주·미국 등 영어권 근무 경험",
                "서울 어학원·국제학교 영어 수업 경험",
                "중등 내신과 자기주도 학습법 지도",
            ],
        },
        # ───────── 사진이 들어가는 자리 (관리자 화면의 연필 버튼으로 바꿀 수 있어요) ─────────
        "slots": {
            "hero": P + "class-floor-game.jpg",
            "philosophy": P + "class-alphabet-blocks.jpg",
            "kinder": P + "class-family-tree.jpg",
            "elementary": P + "class-reading-desks.jpg",
            "middle": "/media/stock/middle-book.jpg",
            "about": "/media/brand/director.jpg",
            "act-read": P + "class-reading-focus.jpg",
            "act-speak": P + "class-phonics-cards.jpg",
            "act-write": P + "work-vegetable-man.jpg",
            "act-project": P + "class-emotion-craft.jpg",
            "kinder-hero": P + "class-animal-yoga.jpg",
            "kinder-a": P + "class-phonics-cards.jpg",
            "kinder-b": P + "class-emotion-craft.jpg",
            "kinder-c": P + "class-family-tree.jpg",
            "elementary-hero": P + "class-laughing-reading.jpg",
            "elementary-a": P + "class-science-water.jpg",
            "elementary-b": P + "work-vegetable-man-2.jpg",
            "elementary-c": P + "class-word-game.jpg",
            "middle-hero": "/media/stock/middle-library.jpg",
            "middle-a": "/media/stock/middle-book.jpg",
            "cta": P + "class-floor-game.jpg",
        },
        "slotNotes": {
            "hero": "홈 맨 위 큰 사진",
            "philosophy": "교육 철학 옆 사진",
            "kinder": "홈 · 유치부 카드",
            "elementary": "홈 · 초등부 카드",
            "middle": "홈 · 중등부 카드 (임시 사진)",
            "about": "원장님 사진",
            "act-read": "수업 활동 · 읽기",
            "act-speak": "수업 활동 · 말하기",
            "act-write": "수업 활동 · 쓰기",
            "act-project": "수업 활동 · 만들기·프로젝트",
            "kinder-hero": "유치부 페이지 맨 위",
            "kinder-a": "유치부 · 활동 1",
            "kinder-b": "유치부 · 활동 2",
            "kinder-c": "유치부 · 활동 3",
            "elementary-hero": "초등부 페이지 맨 위",
            "elementary-a": "초등부 · 활동 1",
            "elementary-b": "초등부 · 활동 2",
            "elementary-c": "초등부 · 활동 3",
            "middle-hero": "중등부 페이지 맨 위 (임시 사진)",
            "middle-a": "중등부 · 본문 사진 (임시 사진)",
            "cta": "상담 안내 배경 사진",
        },
        # ───────── 반별 페이지 사진 아래 글씨 (관리자 '사진 자리 바꾸기'에서 고칠 수 있어요) ─────────
        "slotCaptions": {
            "kinder-a": "그림 카드를 짚으며 소리와 단어를 맞춰요",
            "kinder-b": "감정 단어를 점토와 종이 인형으로 표현해요",
            "kinder-c": "My Family Tree를 만들며 가족을 영어로 소개해요",
            "elementary-a": "물이 담긴 컵을 관찰하며 영어로 이야기해요",
            "elementary-b": "My Vegetable Man — 내가 쓴 문장으로 소개해요",
            "elementary-c": "카드와 보드게임으로 단어 규칙을 익혀요",
            "middle-hero": "조용히 집중하는 학습 공간",
            "middle-a": "책을 깊이 읽는 시간",
            "cta": "함께 배우는 교실",
        },
        # ───────── 화면 글씨 고친 내용 (관리자가 홈페이지에서 직접 고치면 여기에 쌓여요) ─────────
        "texts": {},
        # ───────── 수업 사진 모음 ─────────
        "gallery": [
            {"id": "g-" + a, "src": P + a + ".jpg", "thumb": P + a + "_t.jpg", "caption": b, "cat": c}
            for a, b, c in [
                ("class-floor-game", "바닥에 둘러앉아 보드게임으로 알파벳 익히기", "kinder"),
                ("class-phonics-cards", "그림 카드를 짚으며 소리와 단어 맞추기", "kinder"),
                ("class-emotion-craft", "감정 단어를 점토와 종이 인형으로 표현하기", "kinder"),
                ("class-animal-yoga", "Animal yoga — 몸으로 배우는 영어 표현", "kinder"),
                ("class-family-tree", "My Family Tree 만들기 프로젝트", "kinder"),
                ("class-alphabet-blocks", "알파벳 블록으로 단어 만들어 보기", "kinder"),
                ("class-reading-desks", "각자 읽는 책을 펼치고 함께하는 읽기 시간", "elementary"),
                ("class-laughing-reading", "웃으며 이야기 나누는 읽기 수업", "elementary"),
                ("class-science-water", "물 컵을 관찰하며 영어로 말하는 과학 활동", "elementary"),
                ("class-reading-focus", "집중해서 읽고 밑줄 치는 시간", "elementary"),
                ("class-word-game", "카드와 보드게임으로 익히는 단어 규칙", "elementary"),
                ("work-vegetable-man", "My Vegetable Man — 쓰기 결과물", "elementary"),
                ("work-vegetable-man-2", "My Vegetable Man — 문장으로 소개하기", "elementary"),
            ]
        ],
        # ───────── 수업 영상 (제목은 관리자 화면에서 바꿀 수 있어요) ─────────
        "videos": [
            {"id": "v01", "src": "/media/videos/v01.mp4", "poster": "/media/videos/v01.jpg", "title": "교재를 함께 읽어 보는 시간", "cat": "elementary"},
            {"id": "v02", "src": "/media/videos/v02.mp4", "poster": "/media/videos/v02.jpg", "title": "수업을 마치고 선물 들고 인사", "cat": "kinder"},
            {"id": "v04", "src": "/media/videos/v04.mp4", "poster": "/media/videos/v04.jpg", "title": "I love my family — 발표하기", "cat": "kinder"},
            {"id": "v05", "src": "/media/videos/v05.mp4", "poster": "/media/videos/v05.jpg", "title": "책상에 앉아 책 펼치기", "cat": "kinder"},
            {"id": "v06", "src": "/media/videos/v06.mp4", "poster": "/media/videos/v06.jpg", "title": "읽고 빈칸 채우기 · 어휘와 문법", "cat": "middle"},
            {"id": "v07", "src": "/media/videos/v07.mp4", "poster": "/media/videos/v07.jpg", "title": "문장 완성하며 고쳐 쓰기", "cat": "middle"},
            {"id": "v08", "src": "/media/videos/v08.mp4", "poster": "/media/videos/v08.jpg", "title": "그리고 색칠하며 배우는 시간", "cat": "kinder"},
            {"id": "v09", "src": "/media/videos/v09.mp4", "poster": "/media/videos/v09.jpg", "title": "종이접시 동물 만들기", "cat": "kinder"},
            {"id": "v10", "src": "/media/videos/v10.mp4", "poster": "/media/videos/v10.jpg", "title": "블록으로 만들어 보는 활동", "cat": "kinder"},
            {"id": "v11", "src": "/media/videos/v11.mp4", "poster": "/media/videos/v11.jpg", "title": "우리 학원의 교육 소개", "cat": "about"},
        ],
        # ───────── 수업료·시간표·공지 글 (관리자가 작성) ─────────
        "posts": [],
        # ───────── 학부모 후기: 실제 후기만 등록하세요. 비어 있으면 '예시 화면'이 보입니다 ─────────
        "reviews": [],
    }
