# SBS 아카데미 수강생 안내 페이지

GitHub Pages + Firebase Firestore로 동작하는 학원 안내 사이트.

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
[수강생 폰] ──→ [GitHub Pages] ──→ [Firebase Firestore]
[관리자 PC] ──→ [admin.html]   ──→ [Firebase Firestore]
```

GAS 사용 안 함. Firebase SDK가 브라우저에서 직접 Firestore 호출.

---

## Firestore 컬렉션 구조

| 컬렉션 | 용도 | 필드 |
|--------|------|------|
| `posts` | 공지사항 | category, title, content, date |
| `schedule` | 학사일정 | date, category, title, description |
| `curriculum` | 커리큘럼 | name, startDate, endDate, description, classroom |
| `classrooms` | 강의장 | name, programs, description |
| `rules` | 학칙 | section, content, order |
| `settings` | 학원 정보 | (단일 문서 `default`: academyName, contact, phone, address, hours) |
| `_admin` | 관리자 비밀번호 | (단일 문서 `password`: value) |

## 카테고리

학사 / 세미나 / 특강 / 시설 / 평가 / 이벤트 / 취업 / 기타

---

## Firebase 콘솔 셋업 (1회)

1. https://console.firebase.google.com 에서 프로젝트 생성
2. 웹 앱 등록 → firebaseConfig 받기
3. `config.js`의 `firebaseConfig`를 본인 값으로 교체
4. Firestore 활성화 (테스트 모드)
5. `_admin/password` 문서 생성 (관리자 비밀번호)
6. 보안 규칙 설정

---

## GitHub Pages 배포

1. https://github.com/new 에서 새 저장소 생성 (Public)
2. 파일 7개 업로드 (index.html, admin.html, config.js, manifest.json, README.md, .gitignore + 아이콘)
3. Settings → Pages → main 브랜치 / root 선택 → Save
4. 1-2분 후 `https://{username}.github.io/{repo}/` 에서 접근

---

## 첫 데이터 입력

배포 후 처음에는 데이터가 비어있으니 관리자 페이지(`/admin.html`)로 접속해서 비밀번호 입력 → 공지/일정 추가.

학원 정보(전화/이메일/주소 등)는 일단 Firebase 콘솔에서 직접 추가:
- `settings` 컬렉션 → 문서 ID `default`
- 필드: `academyName`, `contact`, `phone`, `address`, `hours`

(2차에서 admin.html에 설정 페이지 추가 예정)

---

## 보안 규칙 (Firestore Rules)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{docId} {
      allow read: if true;
      allow write: if true;  // 임시. 운영 시작 시 강화 필요.
    }
    match /_admin/password {
      allow read: if true;   // 클라이언트 검증용
      allow write: if false;
    }
  }
}
```

**⚠️ 보안 강화 추천 (운영 시작 시)**

현재는 누구나 쓰기 가능. 더 안전하게 하려면:
1. Firebase Authentication 활성화
2. 운영자 계정 생성
3. 규칙: `allow write: if request.auth != null;`
4. admin.html에서 Firebase Auth로 로그인하게 수정

이건 2차 작업으로 넘기고, 일단 비밀번호 검증 + 비공개 운영자 페이지로 시작.

---

## 1차 기능 (현재)

**수강생 페이지 (`index.html`)**
- 홈: 인사 카드 + 최신 공지 + 다가오는 일정 + 6개 메뉴
- 공지사항: 카테고리 필터 + 상세
- 학사일정: 월별 그룹핑 + D-day
- 커리큘럼/강의장/학칙/세미나/문의

**관리자 페이지 (`admin.html`)**
- 비밀번호 로그인
- 공지사항 CRUD
- 학사일정 CRUD

## 2차 (예정)

- 관리자: 커리큘럼/강의장/학칙/설정 CRUD 추가
- 관리자: 공지 미리보기 (수강생 화면처럼)
- 보안: Firebase Auth 도입
- 첨부파일 (Firebase Storage)
- 검색
- 푸시 알림
