// ============================================================
//  ここだけ書き換える
//  Supabase ダッシュボード → Project Settings → API（または Data API）
//  この2つは「公開してよい値」。ブラウザに必ず載るので隠す意味がない。
//  データは RLS（schema.sql）で守っている。
//  ※ service_role key は絶対にここに書かない。
// ============================================================
window.SUPABASE_URL      = "https://xxxxxxxxxxxxxxxx.supabase.co";
window.SUPABASE_ANON_KEY = "ここに anon / publishable キーを貼る";
