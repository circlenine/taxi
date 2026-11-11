// ============================================================
//  ここだけ書き換える
//  Supabase ダッシュボード → Project Settings → API（または Data API）
//  この2つは「公開してよい値」。ブラウザに必ず載るので隠す意味がない。
//  データは RLS（schema.sql）で守っている。
//  ※ service_role key は絶対にここに書かない。
// ============================================================
window.SUPABASE_URL      = "https://kazrozdgjihwjntfjvbo.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_NQGPyeprpK8PFNpT56mkHA_Yyvwmf-f";
