-- ============================================================
--  EURIF Web · 0005_announcements.sql
--  1) 알림 그룹핑(group_id) + 조장의 알림 삭제 권한
--  2) 전체 공지(announcements) + 푸시 팬아웃
--  Supabase SQL Editor 에 실행 (0004 이후).
-- ============================================================

-- ── 1. 알림 그룹핑 + 조장 삭제 ──────────────────────────────
alter table public.notifications add column if not exists group_id uuid;
create index if not exists idx_notifications_group on public.notifications(group_id);

drop policy if exists "notifications leader delete" on public.notifications;
create policy "notifications leader delete" on public.notifications
  for delete to authenticated using (public.is_leader());

-- notify 헬퍼가 group_id 를 찍도록 갱신
create or replace function public.notify_others(
  p_actor uuid, p_type text, p_title text, p_body text, p_link text
) returns void language sql security definer set search_path = public as $$
  with g as (select gen_random_uuid() as gid)
  insert into public.notifications (user_id, actor_id, type, title, body, link, group_id)
  select pr.id, p_actor, p_type, p_title, p_body, p_link, g.gid
  from public.profiles pr, g
  where pr.id is distinct from p_actor;
$$;

create or replace function public.notify_one(
  p_user uuid, p_actor uuid, p_type text, p_title text, p_body text, p_link text
) returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, actor_id, type, title, body, link, group_id)
  select p_user, p_actor, p_type, p_title, p_body, p_link, gen_random_uuid()
  where p_user is not null and p_user is distinct from p_actor;
$$;

-- ── 2. 전체 공지 ────────────────────────────────────────────
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  author_id  uuid references public.profiles(id) on delete set null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_announcements_created on public.announcements(pinned desc, created_at desc);

alter table public.announcements enable row level security;
create policy "announce read" on public.announcements
  for select to authenticated using (true);
create policy "announce leader write" on public.announcements
  for all to authenticated using (public.is_leader()) with check (public.is_leader());

alter publication supabase_realtime add table public.announcements;

create or replace function public.tg_notify_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_others(
    auth.uid(), 'announce',
    '📢 ' || new.title,
    new.body,
    '/dashboard'
  );
  return new;
end;
$$;
create trigger trg_notify_announcement
  after insert on public.announcements
  for each row execute function public.tg_notify_announcement();

-- 끝.
