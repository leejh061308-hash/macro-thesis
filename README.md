# MacroLens — AI 투자 리서치 플랫폼

개인 투자자를 위한 AI 투자 리서치 앱입니다.  
종목 조회, 시장 뉴스, AI 기반 기업·매크로 분석을 한곳에서 확인할 수 있습니다.

**매수/매도 추천은 하지 않습니다.**

## 기능 (MVP)

| 탭 | 기능 |
|---|---|
| **종목** | 관심종목 리스트, 실시간 시세, 종목 상세(재무지표 + 차트) |
| **뉴스** | 최신 시장 뉴스 + OpenAI 3줄 요약 |
| **AI 분석** | 기업 요약, 투자 포인트, 리스크, 매크로 영향, 핵심 지표, 종합 의견 |

- 상단 검색창: 티커 자동완성, 종목 상세 이동, 관심종목 추가
- 기본 관심종목: MUFG, IBM, ORCL, NVDA, MSFT

## 기술 스택

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** SQLite (better-sqlite3)
- **AI:** OpenAI API (gpt-4o-mini)
- **주가 데이터:** Yahoo Finance API (yahoo-finance2)

---

## 설치 방법

### 1. 사전 준비

- [Node.js](https://nodejs.org/) 18.17 이상
- [OpenAI API 키](https://platform.openai.com/api-keys) (뉴스 요약·AI 분석용)

### 2. 패키지 설치

```bash
cd C:\Users\poweruser\Projects\macro-thesis
npm install
```

### 3. 환경 변수 설정

`.env.example`을 복사해 `.env.local`을 만듭니다.

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env.local
```

**Mac / Linux:**

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 API 키를 입력합니다.

```
OPENAI_API_KEY=sk-여기에-본인의-API-키-입력
```

---

## 실행 방법

### 개발 서버

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

**Windows PowerShell**에서는 `npm` 대신 `npm.cmd`를 사용하세요.

```powershell
npm.cmd run dev:reset
```

> **앱이 안 열리거나 무한 로딩**이면 `dev:reset`을 사용하세요.  
> 오래된 서버 프로세스 종료 + 캐시 삭제 + 재시작을 한 번에 수행합니다.

일반 실행:

```powershell
npm.cmd run dev
```

### Internal Server Error / Cannot find module './331.js'

오래된 dev 서버가 실행 중이거나 `.next` 캐시가 손상된 경우 발생합니다.

```powershell
# 1. 실행 중인 터미널에서 Ctrl+C 로 서버 종료
# 2. 캐시 삭제 후 재시작
npm.cmd run dev:clean
```

여전히 오류가 나면 포트 3000을 점유한 프로세스를 종료한 뒤 다시 시도하세요.

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

npm.cmd run dev:clean
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

---

## 사용 방법

1. **종목 탭** — 관심종목 카드를 탭하면 상세 페이지(재무지표, 1일/1주/1개월/1년 차트)로 이동
2. **검색** — 상단 검색창에 티커 입력 → 자동완성 선택 또는 `+ 관심`으로 관심종목 추가
3. **뉴스 탭** — 시장 뉴스 목록 확인 (AI가 3줄 이내로 요약)
4. **AI 분석 탭** — 종목 선택 후 `분석 시작` 클릭

---

## 프로젝트 구조

```
macro-thesis/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts       # AI 종목 분석
│   │   ├── news/route.ts          # 뉴스 + AI 요약
│   │   ├── search/route.ts        # 티커 검색 자동완성
│   │   ├── stocks/route.ts        # 관심종목 시세
│   │   ├── stocks/[ticker]/route.ts        # 종목 상세
│   │   ├── stocks/[ticker]/chart/route.ts  # 주가 차트
│   │   └── watchlist/route.ts     # 관심종목 추가
│   ├── stocks/
│   │   ├── page.tsx               # 관심종목 리스트
│   │   └── [ticker]/page.tsx      # 종목 상세
│   ├── news/page.tsx              # 뉴스 탭
│   ├── analyze/page.tsx           # AI 분석 탭
│   ├── layout.tsx                 # 레이아웃 (헤더 + 하단 네비)
│   ├── page.tsx                   # / → /stocks 리다이렉트
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── AppHeader.tsx          # 로고 + 검색창
│   │   └── BottomNav.tsx          # 하단 3탭 네비게이션
│   ├── search/SearchBar.tsx       # 티커 검색 자동완성
│   ├── stocks/
│   │   ├── StockCard.tsx          # 종목 카드
│   │   ├── StockMetrics.tsx       # 재무 지표 그리드
│   │   └── StockChart.tsx         # 주가 차트 (Recharts)
│   ├── news/NewsCard.tsx          # 뉴스 카드
│   └── analyze/
│       ├── AnalyzePanel.tsx       # 분석 입력 패널
│       └── AnalysisSections.tsx   # 분석 결과 6개 섹션
├── lib/
│   ├── db.ts                      # SQLite (관심종목, 뉴스 캐시)
│   ├── yahoo.ts                   # Yahoo Finance 연동
│   ├── openai.ts                  # OpenAI 클라이언트
│   ├── format.ts                  # 숫자/날짜 포맷
│   ├── types.ts                   # TypeScript 타입
│   └── prompts/
│       ├── analysis.ts            # AI 분석 프롬프트
│       └── news.ts                # 뉴스 요약 프롬프트
├── data/                          # SQLite DB (자동 생성, gitignore)
├── .env.example
├── package.json
└── README.md
```

---

## 데이터베이스

앱 최초 실행 시 `data/macrolens.db` SQLite 파일이 자동 생성됩니다.

| 테이블 | 용도 |
|---|---|
| `watchlist` | 관심종목 (티커, 이름, 정렬순서) |
| `news_cache` | AI 요약된 뉴스 캐시 |

---

## 주의사항

- 본 앱은 **투자 조언이 아닌 참고용 리서치 도구**입니다.
- AI 분석은 실시간 시장 데이터를 직접 반영하지 않을 수 있습니다.
- Yahoo Finance API는 비공식 API이며, 데이터 지연·오류가 발생할 수 있습니다.
- OpenAI API 사용량에 따라 요금이 발생합니다.

## MVP 제외 항목

로그인, 결제, 광고, 알림, 커뮤니티, 백테스트는 포함되지 않습니다.
