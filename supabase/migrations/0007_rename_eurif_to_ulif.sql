-- ============================================================
--  ULIF Web · 0007_rename_eurif_to_ulif.sql
--  "EURIF" → "ULIF" 명칭 변경. 코드/UI 쪽은 이미 반영됨 — 이 마이그레이션은
--  0002_seed.sql 로 이미 DB에 들어가 있는 실제 값(title 기본값으로 채워진
--  project_info.title, INSERT로 명시된 project_info.description)을 갱신한다.
--  단순 문자열 치환만 수행하며 스키마 구조는 바꾸지 않는다.
-- ============================================================

alter table public.project_info
  alter column title set default 'ULIF · 수면 위상 지연 다중변수 예측 모형';

update public.project_info
  set title = 'ULIF · 수면 위상 지연 다중변수 예측 모형'
  where title = 'EURIF · 수면 위상 지연 다중변수 예측 모형';

update public.project_info
  set description = replace(description, 'EURIF', 'ULIF')
  where description like '%EURIF%';

comment on table public.profiles is 'ULIF 팀원 프로필';
