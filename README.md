# SBS 아카데미 수강생 안내 페이지

GitHub Pages + Firebase Firestore + Firebase Storage로 동작하는 학원 안내 사이트.

## 파일 구조

```
academy-info/
├── index.html      # 수강생용 (모바일 우선)
├── admin.html      # 관리자용 (PC 우선)
├── config.js       # Firebase 설정 + API 헬퍼
├── manifest.json   # PWA 설정
├── icon-192.png    # PWA 아이콘 (선택)
└── icon-512.png    # PWA 아이콘 (선택)
```

## 동작 구조

```
[수강생 폰] ──→ [GitHub Pages] ──→ [Firestore (데이터)]
[관리자 PC] ──→ [admin.html]   ──→ [Firestore + Storage (이미지)]
```

---

## Firestore 컬렉션 구조

| 컬렉션 | 용도 | 필드 |
|--------|------|------|
| `posts` | 공지사항 | category, title, content, date |
| `schedule` | 학사일정 | date, category, title, description |
| `curriculum` | 커리큘럼 | name, startDate, endDate, description, classroom |
| `classrooms` | 강의장 | name, programs, description |
| `rules` | 학칙 | section, content, order |
| `settings` | 학원 정보 | (단일 문서 `default`) |
| `materialCategories` | 수업자료 카테고리 | name, parentId, color, icon, order, hidden |
| `materials` | 수업자료 콘텐츠 | categoryId, title, description, steps[], order, hidden |
| `_admin` | 관리자 비밀번호 | (단일 문서 `password`: value) |

### materials.steps 구조 (단계별 가이드)
```js
steps: [
  {
    title: "1단계 제목",
    content: "본문 텍스트 (줄바꿈 그대로)",
    imageUrl: "https://...",   // Firebase Storage URL
    imagePath: "materials/..." // 삭제용 경로
  },
  ...
]
```

---

## Firebase 콘솔 셋업 (1회)

### 1. Firestore 활성화
- Firestore Database → 데이터베이스 만들기 → 위치 asia-northeast3 → 테스트 모드

### 2. Firebase Storage 활성화 (이미지용)
- 좌측 메뉴 **빌드 → Storage**
- **시작하기** → 위치 asia-northeast3 → 테스트 모드

### 3. Firestore 보안 규칙
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{docId} {
      allow read: if true;
      allow write: if true;
    }
    match /_admin/password {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

### 4. Storage 보안 규칙
Storage → 규칙 탭:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if true;  // 임시. 운영 시 강화
    }
  }
}
```

### 5. 관리자 비밀번호 등록
- Firestore → `_admin` 컬렉션 시작
- 문서 ID: `password`
- 필드: `value` (string), 값: 원하는 비밀번호

---

## 수업자료 사용법

### 카테고리 구조
- 1단계: 최상위 카테고리 (예: 준비물, 자격증, 따즈아)
- 2단계: 하위 분류 (자격증 안에 컴퓨터그래픽스, GTQ 등)

부모 카테고리는 콘텐츠를 직접 갖지 않고, leaf(하위가 없는) 카테고리에만 콘텐츠를 추가할 수 있습니다.

### 단계별 가이드 작성
관리자 페이지 → 수업자료 → 카테고리 선택 → "새 자료 작성"

각 자료는 여러 단계(step)로 구성:
- 단계 제목
- 본문 (줄바꿈 그대로 표시됨)
- 이미지 첨부 (선택, 최대 5MB)

단계 순서 위/아래 이동 가능, 추가/삭제 가능.

### 숨김 기능
- 카테고리 숨김: 해당 카테고리와 그 안의 모든 자료가 수강생에게 안 보임
- 자료 숨김: 해당 자료만 수강생에게 안 보임

운영자(관리자 페이지)에는 항상 보이며 "[숨김]" 표시.

---

## GitHub Pages 배포

1. https://github.com/new → 새 저장소 (Public)
2. 파일 6개 업로드
3. Settings → Pages → main 브랜치 / root → Save
4. 1-2분 후 `https://{username}.github.io/{repo}/` 접근

---

## 카테고리 색상

학원 메뉴(상단)에서 사용하는 6가지 색상 (`m-1` ~ `m-6`):
- 1: 보라
- 2: 초록
- 3: 주황
- 4: 파랑
- 5: 핑크
- 6: 회색

수업자료 카테고리도 이 6가지 중 선택.

---

## 향후 확장

- 자료 검색 (현재는 공지/일정/커리큘럼만 검색됨)
- 카테고리 순서 드래그 변경
- 단계 안에 여러 이미지 첨부
- 동영상 첨부 (YouTube 임베드)
- Firebase Auth 도입으로 보안 강화
