-- ============================================================
--  いま台帳に足したい「棚」だけを、ここに置きます
--
--  ★この紙は、クロちゃん（Claude）が書きます。
--    GASが読んで、そのまま台帳に流します。
--    まーく様の手は要りません（鍵を1回だけ入れていただければ）。
--
--  ★何度流しても、こわれない書き方にしてあります
--    （if not exists / drop policy if exists）。
--  ★表を落とす・中身を消すような文は、GASがはじきます。
-- ============================================================

-- ------------------------------------------------------------
-- ① ごいけんの置き場（2026/11/11・まーく様のご指示）
--      「フィードバックページも導入して(自由形式)」
--    書けるのは、ログインした人だけ。
--    読めるのは「自分が書いたもの」と「まーく様」だけです。
-- ------------------------------------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  who        text not null default '',
  body       text not null,
  created_at timestamptz not null default now(),
  done       boolean not null default false
);

alter table public.feedback enable row level security;

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists feedback_update on public.feedback;
create policy feedback_update on public.feedback
  for update to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

grant select, insert on public.feedback to authenticated;
grant update (done) on public.feedback to authenticated;

-- ------------------------------------------------------------
-- ② 分からない欄を「不明」のまま残せるようにする
--      （2026/11/11・まーく様のご指示）
--      「また、不明点は抜かしてもよい。」
--      「空白部分は「不明」扱いにしてください」
--
--    ★「待ち0分（即乗せ）」と「待ち時間が分からない」は別もの。
--      0として数えると、平均も時間単価も下がって、嘘の数字になります。
-- ------------------------------------------------------------
alter table public.rides alter column dep      drop not null;
alter table public.rides alter column wait_min drop not null;
alter table public.rides alter column ride_min drop not null;
alter table public.rides alter column fare     drop not null;

-- ------------------------------------------------------------
-- ③ ふきだしのひとことを、自由に足せるようにする
--      （2026/11/14・まーく様のご指示）
--      「吹き出しに追加したい一言 みたいな検索枠も付けて
--        自由にふやせるようにしてください」
--
--    ★足したものは、みんなの画面に出ます（台帳に入れるため）。
--    ★消せるのは「足した本人」と まーく様だけです。
--      画面のボタンだけでなく、台帳の側（RLS）でも止めます。
-- ------------------------------------------------------------
create table if not exists public.says (
  id         uuid primary key default gen_random_uuid(),
  text       text not null,
  good       boolean not null default true,
  user_id    uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.says enable row level security;

drop policy if exists says_select on public.says;
create policy says_select on public.says
  for select to authenticated
  using (true);

drop policy if exists says_insert on public.says;
create policy says_insert on public.says
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists says_delete on public.says;
create policy says_delete on public.says
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, delete on public.says to authenticated;

-- ------------------------------------------------------------
-- ④ ふきだしのひとことを、あとから直せるようにする
--      （2026/11/14・まーく様のご指示）
--      「また、既にある吹き出し内容の修正もできるようにしてください」
--
--    ★直せるのは「足した本人」と まーく様だけです。
--      消すときと同じ守りにします。
-- ------------------------------------------------------------
drop policy if exists says_update on public.says;
create policy says_update on public.says
  for update to authenticated
  using      (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

grant update (text, good) on public.says to authenticated;
