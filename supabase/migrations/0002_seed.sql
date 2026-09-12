-- ============================================================
--  EURIF Web · 0002_seed.sql   (대시보드 초기 데이터)
--  숫자(progress / done / collected_sample)는 추정치입니다 —
--  실제 진행 상황에 맞게 나중에 대시보드나 SQL 에서 수정하세요.
--  0001_init.sql 실행 후 이 파일을 실행하세요.
-- ============================================================

-- ── 프로젝트 개요 ───────────────────────────────────────────
insert into public.project_info (id, description, target_sample, collected_sample, start_date, end_date)
values (
  1,
  'EURIF 5인(정보학·약학·뇌과학수면·생명공학·정책) 다학제 연구. 고등학생 대상 2주 관찰연구로 수집한 데이터에 다중선형회귀분석을 적용하여, 블루라이트 노출·오후 카페인 섭취·수면 부채 누적이 수면 위상 지연(Y, 분)에 미치는 독립적 기여도를 규명한다.',
  40,
  0,
  date '2026-05-01',
  date '2026-09-30'
)
on conflict (id) do update
  set description = excluded.description,
      target_sample = excluded.target_sample,
      start_date = excluded.start_date,
      end_date = excluded.end_date;

-- ── 프로젝트 단계 (Phase 1~6) ──────────────────────────────
insert into public.phases (phase_no, name, description, status, progress, order_index, start_date, end_date) values
 (1, '사전 준비',      '참여자 모집·동의서 수령, MEQ 크로노타입 설문, 구글폼 설계·배포, 카페인 함량표 배포', 'done',   100, 1, date '2026-05-01', date '2026-05-24'),
 (2, '1차 데이터 수집', 'D1–D7 매일 아침 전날 데이터 입력(취침·기상·블루라이트·카페인). D5부터 수면 부채 산출 시작',  'active',  55, 2, date '2026-05-25', date '2026-06-07'),
 (3, '2차 데이터 수집', 'D8–D14 동일 절차 반복. 주말 데이터는 MSFsc 계산용 별도 마킹. 최소 10일치 완성 데이터 목표',   'planned',  0, 3, date '2026-06-08', date '2026-06-21'),
 (4, '데이터 정제',     '결측치 확인, Z-score 이상치 제거(|Z|>3), 개인별 기준 취침시각 계산, 수면 부채 변수 최종 산출', 'planned',  0, 4, date '2026-06-22', date '2026-06-28'),
 (5, '통계 분석',      '단순 모형 3종 + 통합 모형 다중선형회귀. R²·조정R²·β·표준화 β*·p-value·VIF 산출',        'planned',  0, 5, date '2026-06-29', date '2026-07-12'),
 (6, '결과 정리·발표',  '회귀 결과 해석, 시나리오 판정, 한계점 논의, 정책 제언 작성, 연구 보고서·발표 자료 완성',        'planned',  0, 6, date '2026-07-13', date '2026-08-15');

-- ── 프로젝트 목표 체크리스트 (도넛 진척도 + 카테고리 막대) ──
insert into public.project_goals (title, category, weight, done, order_index) values
 ('연구 주제·가설(H1~H4) 확정',        '기획', 1.0, true,  1),
 ('선행 연구 자료조사 (5개 파트)',       '조사', 1.0, true,  2),
 ('이론적 배경 수식화 (β 계수 도출)',    '조사', 1.0, true,  3),
 ('Chrono-Twin 시뮬레이터 모듈 제작',   '개발', 1.0, true,  4),
 ('구글폼 설문지 설계·배포',            '수집', 1.0, true,  5),
 ('참여자 40명 모집·동의서 수령',        '수집', 1.0, false, 6),
 ('1차 데이터 수집 (D1–D7)',           '수집', 1.5, false, 7),
 ('2차 데이터 수집 (D8–D14)',          '수집', 1.5, false, 8),
 ('데이터 정제·이상치 처리',            '분석', 1.0, false, 9),
 ('다중선형회귀 분석 실행',             '분석', 1.5, false, 10),
 ('결과 해석·시나리오(A/B/C) 판정',      '분석', 1.0, false, 11),
 ('정책 제언 문서 작성',               '정책', 1.0, false, 12),
 ('팀 협업 웹사이트 구축',              '개발', 1.0, false, 13),
 ('최종 보고서·발표 자료 완성',          '발표', 1.5, false, 14);

-- ── 회귀 분석 결과 (예상값 — 실제 분석 후 is_final=true, 실제 수치로 갱신) ──
insert into public.analysis_results (variable, beta, beta_std, p_value, vif, r2_individual, is_final, note) values
 ('블루라이트 노출', 0.18,  0.42, null, null, null, false, 'Czeisler 2006 · 전윤서(생명공학) 파트. 조정 노출 1분당 위상 지연 +0.18분. 청소년 멜라토닌 억제 취약성 반영해 상향. 표준화 참조값 SD_BL=35분.'),
 ('오후 카페인',    0.22,  0.35, null, null, null, false, 'Drake 2013 · 홍서준(약학) 파트. 혈중 잔류 1mg당 위상 지연 +0.22분 (250mg→40분 지연 스케일링). 반감기 5.5h. SD_CAF=60mg.'),
 ('수면 부채 누적',  0.045, 0.28, null, null, null, false, 'Roenneberg 2003 MSFsc · 이정욱(정보학) 파트. 직전 5일 부채 1분당 위상 지연 +0.045분. SD_DEBT=150분.');

-- 끝. 다음: Settings → API 에서 키 3개 복사 → .env.local 작성
