-- ============================================================
--  EURIF Web · 0004_push.sql   (웹푸시)
--  push_subscriptions 테이블 + notifications INSERT 시 fanout 트리거
--  Supabase SQL Editor 에 실행 (0003 이후).
--
--  ⚠️ 아래 두 값을 실제 값으로 바꾸고 실행하세요:
--    __FANOUT_URL__    →  https://eurif-web.vercel.app/api/push/fanout
--    __PUSH_SECRET__   →  .env.local / Vercel 의 PUSH_FANOUT_SECRET 값
-- ============================================================

create extension if not exists pg_net;

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,          -- { p256dh, auth }
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_push_sub_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
create policy "push subs own" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 새 알림 → fanout API 호출 (해당 유저의 구독 기기로 푸시)
create or replace function public.tg_push_fanout()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := '__FANOUT_URL__',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', '__PUSH_SECRET__'
    ),
    body    := jsonb_build_object('notification_id', new.id::text),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

create trigger trg_push_fanout
  after insert on public.notifications
  for each row execute function public.tg_push_fanout();

-- 끝.
