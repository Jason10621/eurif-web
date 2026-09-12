-- ============================================================
--  EURIF Web · 0001_init.sql
--  스키마: profiles / project_info / phases / project_goals /
--          analysis_results / tasks / logs / resources /
--          documents + document_chunks(pgvector) / ai_chat
--  + 트리거 · RLS · Storage 버킷/정책
--  Supabase SQL Editor 에 그대로 붙여넣고 실행하세요.
-- ============================================================

-- ── 확장 ────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector (임베딩)

-- ============================================================
--  공통 트리거 함수
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
--  1. PROFILES (팀원)  ·  auth.users 와 1:1
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null unique,                         -- 한글 이름 = 로그인 ID
  email       text not null unique,                         -- 합성 이메일 {login_id}@eurif.local
  role        text not null default 'member' check (role in ('leader','member')),
  part        text check (part in ('정보학','약학','뇌과학·수면위상','생명공학','정책')),
  student_no  text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'EURIF 팀원 프로필';

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- 조장 여부 (RLS 재귀 방지 위해 SECURITY DEFINER)
create or replace function public.is_leader()
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'leader'
  );
$$;

-- 신규 auth.users → profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, part, student_no)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role','member'),
    new.raw_user_meta_data->>'part',
    new.raw_user_meta_data->>'student_no'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  2. 대시보드용  ·  project_info / phases / project_goals / analysis_results
-- ============================================================
create table public.project_info (
  id               int primary key default 1 check (id = 1),
  title            text not null default 'EURIF · 수면 위상 지연 다중변수 예측 모형',
  subtitle         text not null default '블루라이트 · 카페인 · 수면 부채의 독립적 기여도 분석',
  description      text,
  target_sample    int  not null default 40,
  collected_sample int  not null default 0,
  start_date       date,
  end_date         date,
  updated_at       timestamptz not null default now()
);
create trigger trg_project_info_updated before update on public.project_info
  for each row execute function public.set_updated_at();

create table public.phases (
  id          int generated always as identity primary key,
  phase_no    int  not null,
  name        text not null,
  description text,
  start_date  date,
  end_date    date,
  status      text not null default 'planned' check (status in ('planned','active','done')),
  progress    int  not null default 0 check (progress between 0 and 100),
  order_index int  not null default 0,
  updated_at  timestamptz not null default now()
);
create trigger trg_phases_updated before update on public.phases
  for each row execute function public.set_updated_at();

create table public.project_goals (
  id          int generated always as identity primary key,
  title       text not null,
  category    text not null default '기타',
  weight      numeric not null default 1 check (weight > 0),
  done        boolean not null default false,
  order_index int not null default 0,
  updated_at  timestamptz not null default now()
);
create trigger trg_goals_updated before update on public.project_goals
  for each row execute function public.set_updated_at();

-- 회귀 분석 결과 (초기엔 '예상값', 실제 분석 후 is_final=true 로 갱신)
create table public.analysis_results (
  id            int generated always as identity primary key,
  variable      text not null,
  beta          numeric,
  beta_std      numeric,
  p_value       numeric,
  vif           numeric,
  r2_individual numeric,
  is_final      boolean not null default false,
  note          text,
  updated_at    timestamptz not null default now()
);
create trigger trg_analysis_updated before update on public.analysis_results
  for each row execute function public.set_updated_at();

-- ============================================================
--  3. TASKS  ·  조장 → 조원 과제
-- ============================================================
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  assignee_id  uuid not null references public.profiles(id) on delete cascade,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  phase_id     int references public.phases(id) on delete set null,
  due_date     date,
  status       text not null default 'todo' check (status in ('todo','in_progress','done')),
  priority     text not null default 'normal' check (priority in ('low','normal','high')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_tasks_assignee on public.tasks(assignee_id);
create index idx_tasks_status   on public.tasks(status);
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================================
--  4. LOGS  ·  업무 일지
-- ============================================================
create table public.logs (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  title      text,
  content    text not null,
  log_date   date not null default current_date,
  phase_id   int  references public.phases(id) on delete set null,
  task_id    uuid references public.tasks(id) on delete set null,
  tags       text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_logs_author on public.logs(author_id);
create index idx_logs_date   on public.logs(log_date desc);
create trigger trg_logs_updated before update on public.logs
  for each row execute function public.set_updated_at();

-- ============================================================
--  5. RESOURCES  ·  자료실
-- ============================================================
create table public.resources (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category     text not null default '기타'
               check (category in ('논문','연구자료','실험자료','데이터','참고링크','정책','기타')),
  url          text,
  storage_path text,                 -- Supabase Storage: 'resources' 버킷 경로
  file_name    text,
  file_size    bigint,
  mime_type    text,
  part         text,
  uploaded_by  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint resources_has_target check (url is not null or storage_path is not null)
);
create index idx_resources_category on public.resources(category);
create trigger trg_resources_updated before update on public.resources
  for each row execute function public.set_updated_at();

-- ============================================================
--  6. AI 지식 베이스  ·  documents + document_chunks (pgvector 768d)
-- ============================================================
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  source       text,
  storage_path text,
  mime_type    text,
  byte_size    bigint,
  category     text,
  status       text not null default 'pending'
               check (status in ('pending','processing','ready','error')),
  chunk_count  int not null default 0,
  error        text,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);

create table public.document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content     text not null,
  token_count int,
  embedding   vector(768),            -- Gemini text-embedding-004 / gemini-embedding-001 (output_dimensionality=768)
  created_at  timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index idx_chunks_document  on public.document_chunks(document_id);
create index idx_chunks_embedding on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

-- 유사도 검색 RPC (코사인)
create or replace function public.match_document_chunks(
  query_embedding vector(768),
  match_count int default 8,
  similarity_threshold float default 0.0
)
returns table (
  id uuid, document_id uuid, document_title text,
  chunk_index int, content text, similarity float
)
language sql stable as $$
  select c.id, c.document_id, d.title, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where d.status = 'ready'
    and 1 - (c.embedding <=> query_embedding) > similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
--  7. AI 채팅 기록
-- ============================================================
create table public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null default '새 대화',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_conv_updated before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  sources         jsonb,
  created_at      timestamptz not null default now()
);
create index idx_ai_messages_conv on public.ai_messages(conversation_id, created_at);

-- ============================================================
--  8. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.project_info     enable row level security;
alter table public.phases           enable row level security;
alter table public.project_goals    enable row level security;
alter table public.analysis_results enable row level security;
alter table public.tasks            enable row level security;
alter table public.logs             enable row level security;
alter table public.resources        enable row level security;
alter table public.documents        enable row level security;
alter table public.document_chunks  enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages      enable row level security;

-- profiles
create policy "profiles read (all members)" on public.profiles
  for select to authenticated using (true);
create policy "profiles update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles leader manage" on public.profiles
  for all to authenticated using (public.is_leader()) with check (public.is_leader());

-- project_info / phases / project_goals / analysis_results  (읽기=팀원, 쓰기=조장)
create policy "project_info read"  on public.project_info  for select to authenticated using (true);
create policy "project_info write" on public.project_info  for all to authenticated using (public.is_leader()) with check (public.is_leader());
create policy "phases read"  on public.phases  for select to authenticated using (true);
create policy "phases write" on public.phases  for all to authenticated using (public.is_leader()) with check (public.is_leader());
create policy "goals read"  on public.project_goals  for select to authenticated using (true);
create policy "goals write" on public.project_goals  for all to authenticated using (public.is_leader()) with check (public.is_leader());
create policy "analysis read"  on public.analysis_results  for select to authenticated using (true);
create policy "analysis write" on public.analysis_results  for all to authenticated using (public.is_leader()) with check (public.is_leader());

-- tasks
create policy "tasks read (all)" on public.tasks
  for select to authenticated using (true);
create policy "tasks leader insert" on public.tasks
  for insert to authenticated with check (public.is_leader());
create policy "tasks update (leader or assignee)" on public.tasks
  for update to authenticated
  using (public.is_leader() or assignee_id = auth.uid())
  with check (public.is_leader() or assignee_id = auth.uid());
create policy "tasks leader delete" on public.tasks
  for delete to authenticated using (public.is_leader());

-- logs
create policy "logs read (all)" on public.logs
  for select to authenticated using (true);
create policy "logs insert self" on public.logs
  for insert to authenticated with check (author_id = auth.uid());
create policy "logs update (own or leader)" on public.logs
  for update to authenticated
  using (author_id = auth.uid() or public.is_leader())
  with check (author_id = auth.uid() or public.is_leader());
create policy "logs delete (own or leader)" on public.logs
  for delete to authenticated using (author_id = auth.uid() or public.is_leader());

-- resources
create policy "resources read (all)" on public.resources
  for select to authenticated using (true);
create policy "resources insert self" on public.resources
  for insert to authenticated with check (uploaded_by = auth.uid());
create policy "resources update (own or leader)" on public.resources
  for update to authenticated
  using (uploaded_by = auth.uid() or public.is_leader())
  with check (uploaded_by = auth.uid() or public.is_leader());
create policy "resources delete (own or leader)" on public.resources
  for delete to authenticated using (uploaded_by = auth.uid() or public.is_leader());

-- documents / document_chunks  (읽기=팀원, 쓰기=조장; 서버 인제스트는 service_role 로 RLS 우회)
create policy "documents read (all)" on public.documents
  for select to authenticated using (true);
create policy "documents leader manage" on public.documents
  for all to authenticated using (public.is_leader()) with check (public.is_leader());
create policy "chunks read (all)" on public.document_chunks
  for select to authenticated using (true);
create policy "chunks leader manage" on public.document_chunks
  for all to authenticated using (public.is_leader()) with check (public.is_leader());

-- ai_conversations / ai_messages  (본인 것만)
create policy "conversations own" on public.ai_conversations
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "messages own" on public.ai_messages
  for all to authenticated
  using (exists (select 1 from public.ai_conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c
                      where c.id = conversation_id and c.user_id = auth.uid()));

-- ============================================================
--  9. STORAGE 버킷 + 정책
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('resources','resources', false),
  ('ai-documents','ai-documents', false)
on conflict (id) do nothing;

-- resources 버킷: 5인 팀 내부 공유 (인증 팀원 전체 읽기/쓰기, 삭제도 팀원)
create policy "resources bucket (members)" on storage.objects
  for all to authenticated
  using (bucket_id = 'resources')
  with check (bucket_id = 'resources');

-- ai-documents 버킷: 조장만
create policy "ai-documents bucket (leader)" on storage.objects
  for all to authenticated
  using (bucket_id = 'ai-documents' and public.is_leader())
  with check (bucket_id = 'ai-documents' and public.is_leader());

-- 끝. 다음: 0002_seed.sql 실행
