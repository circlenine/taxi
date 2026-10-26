-- ============================================================
--  つけ待ち台帳 / Supabase スキーマ
--  Supabase ダッシュボード → SQL Editor に丸ごと貼って Run
--  何度実行しても壊れないように書いてある（再実行OK）
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. プロフィール（表示名・管理者フラグ）
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. 乗務記録
--    dep = 乗せた時刻を小数の「時」で持つ（25.5 = 25:30 = 翌1:30）
-- ------------------------------------------------------------
create table if not exists public.rides (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  work_date  date not null,
  place      text not null default '',
  dep        numeric(5,2) not null check (dep >= 0 and dep < 36),
  wait_min   integer not null default 0 check (wait_min >= 0 and wait_min <= 1440),
  ride_min   integer not null default 0 check (ride_min >= 0 and ride_min <= 1440),
  fare       integer not null check (fare >= 0 and fare <= 1000000),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2-2. 記録用スプレッドシートに合わせて足した列
--      （まーく様のご指示・2026/10/26）
--      いままでスプシで付けていた「種」と「他」を、ここでも持つ。
--      どちらも無くても動くので、あとから足しても壊れない。
-- ------------------------------------------------------------
alter table public.rides add column if not exists method text not null default '';
alter table public.rides add column if not exists note   text not null default '';

create index if not exists rides_work_date_idx on public.rides (work_date desc);
create index if not exists rides_user_idx      on public.rides (user_id);

-- ------------------------------------------------------------
-- 3. ユーザーが作られたら profiles を自動で作る
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- すでに作ってしまったユーザーぶんを埋める
insert into public.profiles (id, display_name)
select u.id, split_part(u.email,'@',1)
from auth.users u
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4. 管理者判定（RLSの中から呼ぶので security definer）
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ------------------------------------------------------------
-- 5. RLS（ここが本体の守り）
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.rides    enable row level security;

-- --- profiles ---
drop policy if exists profiles_read       on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_read on public.profiles
  for select to authenticated using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 自分で自分を管理者に昇格できないよう、更新できる列を display_name だけに絞る
revoke update on public.profiles from authenticated;
grant  update (display_name) on public.profiles to authenticated;

-- --- rides ---
drop policy if exists rides_read       on public.rides;
drop policy if exists rides_insert_own on public.rides;
drop policy if exists rides_update_own on public.rides;
drop policy if exists rides_delete_own on public.rides;

-- ログインしていれば全員の記録を読める（3人で共有する台帳なので）
create policy rides_read on public.rides
  for select to authenticated using (true);

-- 書けるのは自分名義だけ。ただし管理者は、ほかの人の名義でも入れられる
-- ★記録用スプレッドシートから まとめて移すときに要ります（2026/10/26）。
--   移すのは1人（管理者）で、名義は元の記録者のままにしたいためです。
create policy rides_insert_own on public.rides
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- 直せる・消せるのは自分の記録だけ。管理者は全部できる
create policy rides_update_own on public.rides
  for update to authenticated
  using      (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy rides_delete_own on public.rides
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- 6. 管理者を1人立てる
--    ↓ メールアドレスを書き換えてから、この2行だけ選択して Run
-- ------------------------------------------------------------
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'ここに管理者のメール');

-- 確認用
-- select p.display_name, p.is_admin, u.email from public.profiles p join auth.users u on u.id = p.id;
