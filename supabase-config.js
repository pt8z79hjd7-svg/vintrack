// חיבור ל-Supabase — מפתחות ציבוריים (בטוחים בצד-לקוח, מוגנים ע"י RLS)
const SUPABASE_URL = "https://clfctpetgnydfwyjsbuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-RjSZYGfIR_1OLg7kGTm8A_2Or48Rq0";
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
