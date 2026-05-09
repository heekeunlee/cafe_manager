import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://njkiqxqthgmknvtplrbn.supabase.co";
const fallbackSupabaseKey = "sb_publishable_y0ccr_mrzx46oksS67Zvhg_bRel80l4";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
