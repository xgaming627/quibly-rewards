import { supabase } from "../supabase/client";
import { logger } from "../logger";
import { Database } from "../../types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

/**
 * Fetches tasks created by a specific parent, optionally filtered by state.
 * Filtering is pushed down to the Postgres DB via `.eq()` for O(log n) performance.
 *
 * @param creatorId - The parent's user ID (used as created_by filter).
 * @param state - Optional task state filter ('unlocked' | 'locked').
 */
export async function fetchTasksByCreator(
    creatorId: string,
    state?: Task["state"]
): Promise<Task[]> {
    try {
        let query = supabase.from("tasks").select("*").eq("created_by", creatorId);

        if (state) {
            query = query.eq("state", state);
        }

        const { data, error } = await query;

        if (error) {
            logger.error(`Error fetching tasks for creator ${creatorId}`, error);
            return [];
        }

        return data || [];
    } catch (err) {
        logger.error(`Unhandled exception in fetchTasksByCreator for ${creatorId}`, err);
        return [];
    }
}
