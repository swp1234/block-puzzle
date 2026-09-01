# Block Puzzle

DopaBrain의 브라우저용 낙하 블록 게임입니다. 키보드와 터치 조작, 홀드, 일시정지, 현재 브라우저의 최고 기록·미완료 게임 저장을 지원합니다.

## 제품 계약

- 경로: `/block-puzzle/`
- 언어: `ko`, `en`, `zh`, `hi`, `ru`, `ja`, `es`, `pt`, `id`, `tr`, `de`, `fr`
- URL 입력: 허용된 `lang`과 `source=zh_dopabrain_games_block`만 유지
- 저장: 점수와 진행 상태는 `localStorage`에만 저장
- 광고: Google Auto Ads 1회 로드, 게임 종료 시점의 H5 전면 광고만 요청
- 광고는 점수, 게임 상태, 잠금 해제에 영향을 주지 않음
- 분석: 보기·시작·완료·성공한 공유·관련 게임 이동만 페이지당 1회 기록하며 점수·등급·보드 상태는 전송하지 않음
- 공유: 결과 없이 정규화된 게임 URL만 공유

## 주요 파일

- `index.html`: 메타데이터와 화면 구조
- `js/app.js`: 게임 및 분석 이벤트
- `js/i18n.js`, `js/locales/`: 다국어 UI
- `manifest.json`, `sw.js`: `/block-puzzle/` 범위 PWA 캐시

## 검증

저장소 루트에서 실행합니다.

```powershell
npm run verify:zh-block-puzzle-path
```

검증기는 중국어 가이드 연결, 12개 언어, 모바일·데스크톱 런타임, 비공개 이벤트 계약과 18개 결함 변이를 확인합니다.

업데이트: 2026-09-01
