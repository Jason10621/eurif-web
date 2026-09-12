-- ============================================================
--  EURIF Web · 0003_notifications.sql
--  인앱 알림: notifications 테이블 + 이벤트 트리거 + 실시간
--  Supabase SQL Editor 에 붙여넣고 실행 (0001, 0002 이후).
-- ============================================================

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,  -- 받는 사람
  actor_id   uuid references public.profiles(id) on delete set null,          -- 한 사람
  type       text not null,          -- task / task_done / log / resource / phase
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications own read" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications own delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
-- INSERT 는 아래 트리거(SECURITY DEFINER)로만.

-- ── 실시간 구독 ─────────────────────────────────────────────
alter publication supabase_realtime add table public.notifications;

-- ============================================================
--  헬퍼: 특정 이벤트를 나(actor) 빼고 전원에게 알림
-- ============================================================
create or replace function public.notify_others(
  p_actor uuid, p_type text, p_title text, p_body text, p_link text
)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, actor_id, type, title, body, link)
  select pr.id, p_actor, p_type, p_title, p_body, p_link
  from public.profiles pr
  where pr.id is distinct from p_actor;
$$;

create or replace function public.notify_one(
  p_user uuid, p_actor uuid, p_type text, p_title text, p_body text, p_link text
)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, actor_id, type, title, body, link)
  select p_user, p_actor, p_type, p_title, p_body, p_link
  where p_user is not null and p_user is distinct from p_actor;
$$;

create or replace function public.actor_name(p_actor uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select name from public.profiles where id = p_actor), '누군가');
$$;

-- ============================================================
--  트리거들
-- ============================================================

-- 과제 배정 → 담당자에게
create or replace function public.tg_notify_task_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_one(
    new.assignee_id, auth.uid(), 'task',
    '새 과제가 배정되었어요',
    new.title,
    '/workspace?tab=tasks'
  );
  return new;
end;
$$;
create trigger trg_notify_task_assigned
  after insert on public.tasks
  for each row execute function public.tg_notify_task_assigned();

-- 과제 완료 → 배정한 사람에게
create or replace function public.tg_notify_task_done()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and coalesce(old.status,'') <> 'done' then
    perform public.notify_one(
      new.created_by, auth.uid(), 'task_done',
      public.actor_name(new.assignee_id) || ' 님이 과제를 완료했어요',
      new.title,
      '/workspace?tab=tasks'
    );
  end if;
  return new;
end;
$$;
create trigger trg_notify_task_done
  after update on public.tasks
  for each row execute function public.tg_notify_task_done();

-- 새 업무 일지 → 나머지 전원
create or replace function public.tg_notify_new_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_others(
    new.author_id, 'log',
    public.actor_name(new.author_id) || ' 님이 업무 일지를 작성했어요',
    coalesce(new.title, left(new.content, 40)),
    '/dashboard'
  );
  return new;
end;
$$;
create trigger trg_notify_new_log
  after insert on public.logs
  for each row execute function public.tg_notify_new_log();

-- 새 자료 → 나머지 전원
create or replace function public.tg_notify_new_resource()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_others(
    new.uploaded_by, 'resource',
    public.actor_name(new.uploaded_by) || ' 님이 자료를 올렸어요',
    new.title,
    '/resources'
  );
  return new;
end;
$$;
create trigger trg_notify_new_resource
  after insert on public.resources
  for each row execute function public.tg_notify_new_resource();

-- 프로젝트 단계 상태 변경 → 전원
create or replace function public.tg_notify_phase_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare label text;
begin
  if new.status is distinct from old.status then
    label := case new.status
      when 'active' then '진행 중으로'
      when 'done' then '완료로'
      else '예정으로' end;
    perform public.notify_others(
      auth.uid(), 'phase',
      'Phase ' || new.phase_no || ' (' || new.name || ') 상태가 ' || label || ' 바뀌었어요',
      null,
      '/dashboard'
    );
  end if;
  return new;
end;
$$;
create trigger trg_notify_phase_change
  after update on public.phases
  for each row execute function public.tg_notify_phase_change();

-- 끝.
