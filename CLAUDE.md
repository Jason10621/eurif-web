@AGENTS.md

# EURIF 팀 워크스페이스 — 개발 노트

용인한국외국어대학교부설고등학교 다학제 연구 동아리 EURIF(5명)의 협업 사이트.
연구 주제: 수면 위상 지연의 다중변수 예측 모형(블루라이트·카페인·수면 부채).

## 스택
- Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 (`@theme inline`, `src/app/globals.css`)
- Supabase (Postgres + Auth + Storage + pgvector) · Recharts · lucide-react
- AI: `@google/genai` — 임베딩 `gemini-embedding-001` (768d), 답변 `gemini-3.6-flash`
- 배포: Vercel (`vercel --prod`, GitHub 연동 없음). 라이브: eurif-web.vercel.app

## 실행
```
npm run dev            # localhost:3000
npm run build          # 항상 이걸로 검증 (dev의 .next 캐시는 리팩터링 후 자주 깨짐 → rm -rf .next)
node scripts/seed-users.mjs        # 팀원 5명 계정 (비번은 .env.local SEED_PW_*)
node scripts/ingest-knowledge.mjs  # knowledge/*.md → Supabase pgvector (로컬 전용)
```

## 인증 (이메일 없음, 이름+비번)
- `profiles` ↔ `auth.users` 1:1. 로그인 시 이름으로 `profiles.email`(합성: `{login}@eurif.local`) 조회 후 `signInWithPassword`.
- `/api/auth/login` (service role로 이름→이메일 lookup) · `src/proxy.ts` (Next 16: middleware→proxy) 가 라우트 가드.
- 역할: `leader` / `member`. `is_leader()` SECURITY DEFINER 함수 + RLS.

## 구조
- `src/app/(app)/*` — 인증 필요 구역. `layout.tsx`가 `requireProfile()` + 사이드바 + `<AiWidget>`.
  - `dashboard` (시각화), `workspace` (과제·일지 탭), `resources` (자료실), `ai` (챗봇), `admin` (조장 전용), `settings`
  - 페이지별 `_components/`에 클라이언트 컴포넌트
- `src/lib/` — `supabase/{client,server,admin,middleware}`, `auth`, `dashboard`, `workspace`, `resources`, `admin`, `ai/*`
- `src/components/` — `ui.tsx`, `form.tsx`, `dialog.tsx`, `app-nav.tsx`, `ai/*`
- DB 스키마: `supabase/migrations/0001_init.sql` + `0002_seed.sql`

## 관례
- 대부분의 CRUD = 클라이언트에서 `createClient()`(브라우저) + `router.refresh()`. RLS가 보안 담당.
- 서버 라우트(`/api/*`)는 자체 인증(미들웨어 제외됨), 실패 시 401/403 JSON.
- 차트 색: `globals.css`의 `--chart-1..6` CSS 변수 (dataviz 검증 팔레트). Recharts에서 `fill="var(--chart-1)"`.
- AI 답변은 `sanitizeMath()`로 LaTeX 제거 후 react-markdown 렌더.
- `/ai` 페이지는 첫 메시지에서 `history.replaceState` 사용 (router.replace 하면 key 리마운트로 스트림 끊김).

## 주의
- Tailwind v4 — `tailwind.config` 없음. 색 토큰은 `:root` + `@media (prefers-color-scheme: dark)` + `@theme inline`.
- Gemini 3.x는 `maxOutputTokens`를 thinking과 공유 → 8192로 넉넉히.
- `knowledge/*.md`는 유리프 원자료(PDF/HWPX)를 정리한 것. 추가 문서는 `/admin` 업로드 또는 `knowledge/`에 넣고 재인제스트.
- OneDrive 밖(`C:\Users\Master\eurif-web`)에 있음.
