# Block Puzzle - HTML5 Canvas 기반 블록 퍼즐 게임

클래식 테트리스 스타일의 현대적인 블록 퍼즐 게임입니다. 네온 색상, 부드러운 애니메이션, 다국어 지원이 특징입니다.

## 🎮 게임 특징

### 핵심 기능
- **10x20 그리드**: 클래식 테트리스 크기의 게임 보드
- **7가지 블록**: I, O, T, S, Z, J, L 테트로미노
- **네온 색상**: 화려한 색상과 글로우 효과
- **다음 블록 미리보기**: 게임 사이드바에 다음 3개 블록 표시
- **Hold 기능 (H 키)**: 블록을 보관했다가 나중에 사용
- **하드드롭**: 스페이스바로 즉시 하강
- **레벨 시스템**: 10줄 클리어마다 레벨 상승, 속도 증가
- **콤보 시스템**: 연속 줄 클리어 시 보너스 점수
- **효과음**: Web Audio API 기반 동적 사운드

### 조작 방법
- **좌우 이동**: 좌우 화살표 키 또는 A/D
- **회전**: 위쪽 화살표 또는 Z 키
- **소프트 드롭**: 아래쪽 화살표 또는 S (속도 향상)
- **하드드롭**: 스페이스바 (즉시 하강)
- **Hold**: H 키 또는 HOLD 버튼
- **모바일**: 화면 터치 또는 온스크린 버튼 사용

### 모바일 특화
- 터치 제스처:
  - **좌우 스와이프**: 블록 이동
  - **아래 스와이프**: 하드드롭
  - **위 스와이프**: 회전
- 온스크린 버튼: 방향키 대체
- 반응형 디자인 (360px부터 지원)

## 🌍 다국어 지원

12개 언어 완벽 지원:
- 한국어 (ko)
- English (en)
- 中文 (zh)
- हिन्दी (hi)
- Русский (ru)
- 日本語 (ja)
- Español (es)
- Português (pt)
- Bahasa Indonesia (id)
- Türkçe (tr)
- Deutsch (de)
- Français (fr)

언어 선택기는 우측 상단의 🌐 버튼을 클릭합니다.

## 📊 게임 메커니즘

### 점수 계산
- **1줄 클리어**: 100점 (콤보 배수 적용)
- **콤보 배수**: 1.2^(콤보-1)
  - 1연속: 100점
  - 2연속: 120점
  - 3연속: 144점
  - 4연속 이상: 초고속 보너스

### 레벨 진행
- 10줄마다 레벨 업
- 레벨이 올라갈수록 낙하 속도 증가
- 최대 속도에서도 플레이 가능

### 게임 오버
- 새 블록이 이미 배치된 블록과 충돌할 때
- 점수 기록, 레벨, 클리어 라인 저장

## 🎨 디자인 원칙

### 2026 UI/UX 트렌드
- **Glassmorphism 2.0**: 반투명 배경과 블러 효과
- **Microinteractions**: 스무드한 애니메이션과 즉각적 피드백
- **Dark Mode First**: 기본 어두운 테마
- **네온 스타일**: 활기찬 블록 색상과 글로우
- **미니멀리즘**: 깔끔한 레이아웃과 명확한 정보 계층

### 색상 팔레트
- **주색상**: #9b59b6 (보라)
- **블록 색상**:
  - I (Cyan): #00d4ff
  - O (Yellow): #ffff00
  - T (Magenta): #ff00ff
  - S (Green): #00ff00
  - Z (Pink): #ff0080
  - J (Orange): #ff8000
  - L (Blue): #0080ff

## 📁 파일 구조

```
block-puzzle/
├── index.html              # 메인 HTML (GA4, AdSense, OG태그)
├── manifest.json           # PWA 설정
├── sw.js                   # Service Worker (오프라인)
├── css/
│   └── style.css          # 반응형 스타일
├── js/
│   ├── app.js             # 게임 메인 로직 (Canvas 기반)
│   ├── sound-engine.js    # Web Audio API 효과음
│   ├── i18n.js            # 다국어 관리
│   └── locales/           # 12개 언어 JSON
│       ├── ko.json
│       ├── en.json
│       ├── zh.json
│       ├── hi.json
│       ├── ru.json
│       ├── ja.json
│       ├── es.json
│       ├── pt.json
│       ├── id.json
│       ├── tr.json
│       ├── de.json
│       └── fr.json
├── icon-192.svg           # PWA 192x192 아이콘
├── icon-512.svg           # PWA 512x512 아이콘
└── README.md             # 이 파일
```

## 🚀 로컬 테스트

### Python HTTP Server
```bash
cd "E:/Fire Project/projects/block-puzzle"
python -m http.server 8000
# http://localhost:8000 에서 접속
```

### Node.js 서버
```bash
npx serve .
```

## ✅ 완성도 검증

### Code 검증
- ✅ HTML 문법 오류 없음
- ✅ CSS 문법 오류 없음
- ✅ JavaScript 콘솔 에러 없음

### 기능 테스트
- ✅ 게임 시작 및 블록 생성
- ✅ 블록 이동, 회전, 드롭
- ✅ 줄 클리어 및 점수 계산
- ✅ 레벨 시스템
- ✅ Hold 기능
- ✅ 일시정지/재개
- ✅ 최고 기록 저장 (localStorage)

### UI/UX 테스트
- ✅ 모바일 반응형 (360px~)
- ✅ 데스크톱 레이아웃
- ✅ 다크모드 디스플레이
- ✅ 터치 제스처 작동
- ✅ 애니메이션 부드러움

### PWA 검증
- ✅ manifest.json 유효
- ✅ 아이콘 존재 (192, 512)
- ✅ Service Worker 등록

### i18n 검증
- ✅ 12개 언어 파일 완비
- ✅ 언어 선택기 작동
- ✅ 모든 UI 텍스트 번역됨
- ✅ localStorage 언어 저장

### 광고 영역
- ✅ 상단 배너 (AdSense)
- ✅ 하단 배너 (GameOver 화면)
- ✅ 플레이스홀더 표시

## 🎯 수익 최적화

### AdMob 적용 (앱 버전)
- 상단 배너 광고
- 하단 배너 광고
- 게임오버 화면 전면 광고

### AdSense 적용 (웹 버전)
- 상단 디스플레이 광고
- 하단 디스플레이 광고
- 결과 페이지 광고

### 추가 수익 기회
- 광고 제거 (인앱 결제 미적용, 향후 추가)
- 프리미엄 스킨 (구현 예정)
- 특별 블록 테마

## 🔧 유지보수

### 개선 사항
- 향후 게임 모드 추가 가능 (Endless, Time Attack, Puzzle)
- 온라인 랭킹 시스템
- 소셜 공유 기능 강화
- 모바일 앱 배포 (Cordova/Capacitor)

### 성능 최적화
- Canvas 렌더링 최적화
- 메모리 누수 방지
- 로컬스토리지 정리

## 📜 라이선스

Copyright 2026 DopaBrain. All rights reserved.

---

**업데이트**: 2026-02-10
**버전**: 1.0.0
**개발**: Claude Code (Anthropic)
