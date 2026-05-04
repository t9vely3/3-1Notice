# SBS 아카데미 수강생 안내 페이지

GitHub Pages + Firebase Firestore + Storage 기반 학원 안내 사이트.

## 파일 구조

```
academy-info/
├── index.html      # 수강생용 (모바일 우선, Pretendard 폰트)
├── admin.html      # 관리자용 (PC 우선)
├── config.js       # Firebase 설정 + API 헬퍼 + 회차 진행률 계산
├── manifest.json   # PWA 설정
├── icon-192.png    # PWA 아이콘 (선택)
└── icon-512.png    # PWA 아이콘 (선택)
```

## 수강생 페이지 메뉴

홈 화면 메뉴 5개:

| 메뉴 | 내용 |
|------|------|
| **수업일정** | 캘린더, 색상별 일정 표시 |
| **수업안내** | 수업자료 (단계별 가이드, 카테고리 트리 구조) |
| **비대면** | 비대면 수업 안내 (강의장 데이터 사용) |
| **이용안내** | 학칙, 이용 규정 (아코디언) |
| **특강 / 세미나** | 특강·세미나 카테고리의 공지 |

## 홈 화면 구성

상단부터:

1. **헤더** — 로고 + 페이지 이름 + 검색/벨 아이콘
2. **안내사항** (노란색) — 운영자가 작성한 짧은 안내 (멘토 연락 시간 등). 비워두면 안 보임
3. **요약** — 오늘 날짜 + 5월 수업 진행률 게이지 + 통계 (휴강일/새 공지)
4. **메뉴** — 5개 한 줄
5. **다가오는 일정** — 최대 3건, 가까운 순
6. **최신 공지** — 최대 3건
7. **하단 탭바** — 홈/일정/공지/검색

---

## 진행률 게이지 (회차 기반)

홈 화면 게이지바는 **회차** 기반으로 자동 계산됩니다.

### 작동 방식

운영자가 학사일정 캘린더에 일정을 등록할 때, 색상마다 **분류(type)**를 지정합니다:

| 분류 | 의미 | 진행률 처리 |
|------|------|-------------|
| **수업일** | 정상 수업, 월수금/화목금 수업 등 | 회차로 카운트됨 |
| **휴강/공강** | 어린이날, 부처님오신날, 임시휴강 등 | 회차에서 제외, 휴강일수에 잡힘 |
| **기타** | 특강, 이벤트 등 | 카운트 안 됨 |

### 계산 예시

5월에 운영자가 등록한 일정:
- "정상 수업" (수업일) 12개
- "휴강" (휴강일) 2개

→ 실제 회차 = 12개 (수업일)
→ 단, 휴강일과 같은 날짜의 수업일은 자동 제외 (10회차 = 12 - 2)
→ 표기: **"5월 수업 · 10회 중 4회차"**
→ 게이지 채움 비율 = 4 / 10 = 40%
→ D-day = 마지막 수업일까지 남은 일수

### 색상 분류 변경 방법

관리자 페이지 → **일정 색상** → 각 색상 편집 → 분류 선택

기본 색상은 이미 분류가 설정되어 있어요:
- 정상 수업 → 수업일
- 휴강/공강 → 휴강/공강
- 월수금 수업 → 수업일
- 화목금 수업 → 수업일

---

## Firestore 컬렉션

| 컬렉션 | 용도 | 주요 필드 |
|--------|------|----------|
| `posts` | 공지사항 | category, title, content, date |
| `schedule` | 학사일정 | date, colorId, title, description |
| `scheduleColors` | 일정 색상 | name, color, **type**, order |
| `curriculum` | 커리큘럼 (선택, 사이드바 메뉴에서만) | name, startDate, endDate |
| `classrooms` | 비대면 정보 | name, description, programs |
| `rules` | 이용안내 | section, content, order |
| `materialCategories` | 수업안내 카테고리 | name, parentId, color, icon |
| `materials` | 수업안내 콘텐츠 | categoryId, title, steps[] |
| `settings` | 학원정보 + **notice** | notice, academyName, phone... |
| `_admin` | 관리자 비밀번호 | password.value |

---

## 관리자 기능

### 콘텐츠
- **공지사항** — 카테고리별 공지 작성/편집/삭제
- **학사일정** — 단일/반복 일정 등록, 색상으로 구분
- **수업자료** — 카테고리 트리 + 단계별 가이드 (이미지 첨부)

### 학원 정보
- **커리큘럼** — 과정명, 개강/종강일, 강의장, 수업 요일 (참고용)
- **강의장** — 강의장 이름, 설명, 설치 프로그램
- **학칙** — 학칙 항목 추가/순서 변경

### 설정
- **일정 색상** — 색상 정의 + **분류 (수업일/휴강일/기타)** 지정
- **학원 정보** — **안내사항** + 연락처 정보

---

## 첫 사용 순서

1. **Firebase 셋업 완료** (Firestore + Storage 활성화)
2. **GitHub Pages 배포**
3. **관리자 페이지 접속 → 로그인**
4. **학원 정보** 탭에서:
   - **안내사항**에 멘토 연락 시간 등 입력
   - 전화/이메일/주소 입력
5. **일정 색상** 탭에서 색상 분류 확인 (기본값 OK)
6. **학사일정** 탭에서 반복 일정으로 5월 수업일 일괄 등록
   - 휴강일은 단일 일정으로 추가 (분류: 휴강)
7. **공지사항** / **수업자료** 등 콘텐츠 추가
8. 수강생 페이지에서 진행률 게이지 확인

---

## Firebase 콘솔 셋업

### 1. Firestore 활성화
- Firestore Database → 데이터베이스 만들기
- 위치: asia-northeast3 → 테스트 모드

### 2. Storage 활성화
- Storage → 시작하기
- 위치: asia-northeast3 → 테스트 모드

### 3. 보안 규칙 (테스트용)

**Firestore:**
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

**Storage:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

### 4. 관리자 비밀번호 등록
Firestore → `_admin` 컬렉션 → `password` 문서 → 필드 `value` (string) → 원하는 비밀번호

---

## 디자인

- **폰트**: Pretendard (CDN 로드)
- **본문 글자 크기**: 약 9pt (10~10.5px)
- **컬러 시스템**: 네이비 액센트 + 카테고리별 5색 (보라/녹/주/파/분홍)
- **모바일 최적화**: 480px 최대 너비, 하단 탭바, safe-area 대응
