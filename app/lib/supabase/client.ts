import { createClient } from "@supabase/supabase-js";
import { Database } from "../../types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Check if the Supabase configuration is present.
 * This is used to gate features or show a configuration warning.
 */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseUrl.includes("supabase.co") && supabaseAnonKey);

if (!isSupabaseConfigured) {
    if (typeof window !== "undefined") {
        console.warn(
            "⚠️ Supabase is not configured. Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
    }
}

/**
 * Standard Supabase client instance for SPA usage.
 * Relies entirely on Row Level Security (RLS) for data protection.
 */
export const supabase = createClient<Database>(
    supabaseUrl || "https://unconfigured.supabase.co", 
    supabaseAnonKey || "unconfigured"
);
