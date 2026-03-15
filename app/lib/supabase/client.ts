import { createClient } from "@supabase/supabase-js";
import { Database } from "../../types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bogcioohmwtmxpzsxysw.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZ2Npb29obXd0bXhwenN4eXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTQ3MzQsImV4cCI6MjA4ODk5MDczNH0.XswTtMArl6_IshW_T0kGioUmcJrxi7tuJpVREnsaXRw";

/**
 * Check if the Supabase configuration is present.
 */
export const isSupabaseConfigured = true;

/**
 * Standard Supabase client instance for SPA usage.
 * Relies entirely on Row Level Security (RLS) for data protection.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
