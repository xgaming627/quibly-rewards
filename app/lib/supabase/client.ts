import { createClient } from "@supabase/supabase-js";
import { Database } from "../../types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-for-build.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Standard Supabase client instance for SPA usage.
 * Relies entirely on Row Level Security (RLS) for data protection.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
