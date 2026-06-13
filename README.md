# MacroLens — AI 투자 리서치 플랫폼

개인 투자자를 위한 AI 투자 리서치 앱입니다.  
종목 조회, 퀀트 전략·타이밍 분석, AI 기업·매크로 분석을 한곳에서 확인할 수 있습니다.

**매수/매도 추천은 하지 않습니다.** 모든 점수와 AI 해석은 참고용 리서치 도구입니다.

## 기능

| 탭 | 기능 |
|---|---|
| **종목** | 관심종목 리스트, 실시간 시세, 종목 상세(재무지표 + 차트), 관심종목 타이밍 |
| **퀀트** | 8대 투자 전략 카드, 전략 적합도·진입 환경, 순위 TOP 10, 백테스트, 팩터 랭킹(고급) |
| **AI 분석** | 기업 요약, 투자 포인트, 리스크, 매크로 영향, 핵심 지표, 종합 의견 |

### 퀀트 · 타이밍

- **전략 적합도**: 현재 시장에서 해당 스타일(성장·가치·배당 등)이 얼마나 유리한지 보여주는 상대 지표
- **진입 환경**: 전략 상위 종목들의 타이밍 점수 평균 (매수 신호가 아님)
- **기업 점수 / 진입 점수**: 유니버스 내 재무·기술적 환경의 상대 순위
- **백테스트**: 과거 데이터 기반 시뮬레이션 (미래 수익 보장 없음)
- **기본 / 고급 모드**: 초보자용 전략 카드 ↔ 팩터 가중치·랭킹·스creener

### 기타

- 상단 검색창: 티커 자동완성, 종목 상세 이동, 관심종목 추가
- 첫 퀀트 방문 시 온보딩 안내 + 면책 고지

## 기술 스택

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (관심종목, Railway)
- **AI:** OpenAI API (gpt-4o-mini)
- **시장 데이터:** Yahoo Finance, Finnhub (선택)

## 설치 · 실행

### 1. 사전 준비

- Node.js 22+
- OpenAI API 키 (AI 분석·해석)
- Finnhub API 키 (선택, 없으면 Yahoo로 재무 데이터 보완)

### 2. 환경 변수

`.env.example`을 복사해 `.env.local`을 만듭니다.

```
OPENAI_API_KEY=sk-...
FINNHUB_API_KEY=...          # 선택
DATABASE_URL=...               # Railway PostgreSQL
```

### 3. 개발 서버

```bash
npm install
npm run dev
```

브라우저: [http://localhost:3000](http://localhost:3000)

**Windows PowerShell** — 앱이 안 열리면:

```powershell
npm.cmd run dev:reset
```

### 4. 프로덕션

```bash
npm run build
npm start
```

Railway 배포: `main` 브랜치 push 시 자동 배포.

## 프로젝트 구조 (요약)

```
app/
├── stocks/          # 관심종목
├── quant/           # 퀀트 · 전략 · 타이밍
├── analyze/         # AI 분석
└── api/
    ├── quant/       # 전략, 랭킹, 백테스트, warmup
    ├── timing/      # 진입 점수, 기회, 관심종목 타이밍
    └── stocks/      # 시세, 차트, 검색

lib/
├── quant/           # 팩터 엔진, 전략, 백테스트, Yahoo 보완
├── timing/          # 진입 점수 계산
└── yahoo.ts         # Yahoo Finance 연동

components/
├── quant/           # QuantPanel, StrategyOverview, Backtest
├── timing/          # 오늘의 기회, 타이밍 차트
└── onboarding/      # 퀀트 첫 방문 안내
```

## 데이터 · 면책

- **데이터 출처:** Finnhub(설정 시) + Yahoo Finance. API 지연·누락·오차 가능.
- **퀀트 점수:** 상대 순위·환경 지표이며 투자 조언·매매 추천이 아님.
- **백테스트:** 과거 시뮬레이션. 거래비용·슬리피지 미반영 가능.
- **AI 분석:** 참고용. 실시간 시장을 완전히 반영하지 않을 수 있음.
- **투자 책임:** 모든 판단과 결과는 사용자 본인에게 있습니다.

## 베타 출시 체크리스트

- [x] 전략 적합도·진입 환경 점수 정상화
- [x] Finnhub 누락 시 Yahoo 재무 보완
- [x] 퀀트 첫 로드 로딩 UX + 백그라운드 워밍
- [x] 면책·데이터 출처 UI
- [x] 퀀트 온보딩 모달
- [ ] 모니터링/에러 트래킹 (Sentry 등)
- [ ] 로그인·멀티 디바이스 관심종목 동기화
