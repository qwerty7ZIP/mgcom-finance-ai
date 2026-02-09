import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY не заданы. " +
      "Вход и личный кабинет работать не будут.",
  );
}

export const supabaseBrowser =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true },
      })
    : null;
