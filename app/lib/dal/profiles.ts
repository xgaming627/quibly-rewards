import { supabase } from "../supabase/client";
import { logger } from "../logger";
import { Database } from "../../types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Fetches a user profile by ID.
 * Uses .maybeSingle() to gracefully handle missing rows (e.g., new signups
 * where the trigger hasn't fired yet).
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            logger.error(`Error fetching profile for user ${userId}`, error);
            return null;
        }

        return data;
    } catch (err) {
        logger.error(`Unhandled exception in fetchProfile for user ${userId}`, err);
        return null;
    }
}

/**
 * Fetches all child profiles (is_admin = false).
 * Used by the parent dashboard to display all children and their progress.
 */
export async function fetchChildren(): Promise<Profile[]> {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("is_admin", false);

        if (error) {
            logger.error("Error fetching children", error);
            return [];
        }

        return data || [];
    } catch (err) {
        logger.error("Unhandled exception in fetchChildren", err);
        return [];
    }
}
