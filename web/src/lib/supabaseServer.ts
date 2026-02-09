import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не заданы. " +
      "Маршруты, использующие БД, переключатся на заглушки/локальные данные.",
  );
}

export const supabaseServer = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

