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

-- ------------------------------------------------------------
-- ⑤ ふきだしのひとことを、1つ足す（2026/11/14・まーく様のご指示）
--      「出た！合わせてロングマァン！ も、吹き出しに入れてください」
--
--    ★すでに台帳へ写したあとだと、コードに足すだけでは出ません。
--      ここで1行だけ入れます。
--    ★同じものが入っていれば、何もしません（二重に入れない）。
--    ★まだ1つも入っていないときも、何もしません
--      （そのときは、画面を開いたときに まとめて写されます）。
-- ------------------------------------------------------------
insert into public.says (text, good, user_id)
select '出た！合わせてロングマァン！', true,
       (select user_id from public.says limit 1)
where exists (select 1 from public.says)
  and not exists (select 1 from public.says
                  where text = '出た！合わせてロングマァン！');

-- ------------------------------------------------------------
-- ⑥ ふきだしのひとことを、6つ足す（2026/11/15・まーく様のご指示）
--      おらァ！教習所からやり直せ！／ジャストポイント？オーケー？／
--      もうちょっと頑張ろ？あと６時間！／もう、帰りたいよォ！／
--      敗北者じゃけェ…／今から車を動かす！･･･何度で～もっ♬
--
--    ★台帳に1つでも入っていると、画面は台帳のほうだけを出します。
--      なので、コードに足すだけでは出ません。ここで入れます。
--    ★同じものが入っていれば、何もしません（二重に入れない）。
--    ★good は「ほめ（true）」か「ぼやき（false）」。
--      交互に出す決まりが、かたよらないように分けてあります。
-- ------------------------------------------------------------
insert into public.says (text, good, user_id)
select v.t, v.g, (select user_id from public.says limit 1)
from (values
  ('おらァ！教習所からやり直せ！', false),
  ('もう、帰りたいよォ！',         false),
  ('敗北者じゃけェ…',             false),
  ('ジャストポイント？オーケー？', true),
  ('もうちょっと頑張ろ？あと６時間！', true),
  ('今から車を動かす！･･･何度で～もっ♬', true)
) as v(t, g)
where exists (select 1 from public.says)
  and not exists (select 1 from public.says s where s.text = v.t);

-- ------------------------------------------------------------
-- ⑦ 日報（紙）の写真を読むための置き場（2026/11/15・まーく様のご指示）
--      「紙の日報データが毎日作られていて、写真を撮って記録している」
--      「写真をアップロードして、反映する機能を追加して欲しいです」
--
--    ★写真は、ここに小さくして置きます（別の置き場は作りません）。
--    ★見られるのは、置いた本人と まーく様だけです（下の決まり）。
--      売上の記録なので、人に見える形には絶対にしません。
--    ★読んだ結果は rows_json に入ります。
--      そのままでは記録に入りません。画面で確かめてから入れます。
-- ------------------------------------------------------------
create table if not exists public.nippo_scan (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  work_date  date,
  img        text not null default '',    -- 写真（小さくしたもの）
  state      text not null default 'new', -- new → read → done
  note       text not null default '',    -- 読めなかった理由など
  rows_json  text not null default '',    -- 読み取った行（JSON）
  created_at timestamptz not null default now()
);
alter table public.nippo_scan enable row level security;

drop policy if exists nippo_select on public.nippo_scan;
create policy nippo_select on public.nippo_scan
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists nippo_insert on public.nippo_scan;
create policy nippo_insert on public.nippo_scan
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists nippo_update on public.nippo_scan;
create policy nippo_update on public.nippo_scan
  for update to authenticated
  using      (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists nippo_delete on public.nippo_scan;
create policy nippo_delete on public.nippo_scan
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.nippo_scan to authenticated;
create index if not exists nippo_scan_state_idx on public.nippo_scan (state, created_at);

-- ------------------------------------------------------------
-- ⑧ ふきだしのひとことを、もう1つ足す（2026/11/16・まーく様のご指示）
--      「ガァチィ？！ も、ふきだしに追加してください」
--    ★同じものが入っていれば、何もしません（二重に入れない）。
-- ------------------------------------------------------------
insert into public.says (text, good, user_id)
select 'ガァチィ？！', true, (select user_id from public.says limit 1)
where exists (select 1 from public.says)
  and not exists (select 1 from public.says where text = 'ガァチィ？！');

-- ------------------------------------------------------------
-- ⑨ 顔から出る字（ははは）を、各自で変えられるようにする
--      （まーく様のご指示・2026/11/22
--        「ははは（顔アイコンから出る文字）の部分も
--          各自で変えたい人もいるかもなので 変える用の欄も
--          ふきだしの欄の下に入れてください
--          各自で変更申請したら、全体が統一して変わる仕組みに」）
--
--    ★1人1行だけ。だれかが変えたら、みんなの画面がその字になります。
--    ★だれが変えたかは残します（あとで分かるように）。
--    ★消せません。字を変えるだけです（顔そのものは増やさないため）。
-- ------------------------------------------------------------
create table if not exists public.faces (
  k          text primary key,            -- dai / shun / jin / ana
  fx         text not null,               -- 顔から出る字
  user_id    uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.faces enable row level security;

drop policy if exists faces_select on public.faces;
create policy faces_select on public.faces
  for select to authenticated using (true);

drop policy if exists faces_insert on public.faces;
create policy faces_insert on public.faces
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists faces_update on public.faces;
create policy faces_update on public.faces
  for update to authenticated
  using (true) with check (user_id = auth.uid());

grant select, insert, update on public.faces to authenticated;

-- ------------------------------------------------------------
-- ⑩ 地図のピンの場所を、自分で決められるようにする
--      （まーく様のご指示・2026/11/23
--        「地図のピンの位置を設定できる機能も追加してください」）
--
--    ★これまでは、場所の分かっている乗り場にしか ピンを打てませんでした
--      （あてずっぽうの場所に打つほうが、何も出さないより ずっと悪いため）。
--      ここに入れておけば、その乗り場にも ピンが立ちます。
--    ★乗り場の名前で1行。だれかが決めたら、みんなの地図に出ます。
--    ★消せるのは、決めた本人と まーく様だけです。
-- ------------------------------------------------------------
create table if not exists public.places (
  name       text primary key,            -- 乗り場の名前（スプシ・台帳と同じ字）
  lat        double precision not null,
  lng        double precision not null,
  user_id    uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.places enable row level security;

drop policy if exists places_select on public.places;
create policy places_select on public.places
  for select to authenticated using (true);

drop policy if exists places_insert on public.places;
create policy places_insert on public.places
  for insert to authenticated with check (user_id = auth.uid());

-- 直せるのは、決めた本人と まーく様だけ
drop policy if exists places_update on public.places;
create policy places_update on public.places
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.is_admin)
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists places_delete on public.places;
create policy places_delete on public.places
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.is_admin)
  );

grant select, insert, update, delete on public.places to authenticated;
