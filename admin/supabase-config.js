// ==============================
// 一箕地区ポータル Supabase設定
// ==============================

const SUPABASE_URL = "https://aeafysrkqtwgufmhwwdb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_st6zHh98O8_BFa-tsxgDvQ__r_CfbXb";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);