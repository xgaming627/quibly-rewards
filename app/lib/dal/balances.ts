import { supabase } from "../supabase/client";
import { logger } from "../logger";
import { Database } from "../../types/database.types";

type ChildBalance = Database["public"]["Views"]["child_balances"]["Row"];

/**
 * Fetches the derived point balance for a specific child.
 * Architectural Note: This hits the `child_balances` view instead of the `point_ledger`.
 * Postgres calculates the total points, avoiding an O(n) array reduction on the client,
 * maintaining memory efficiency.
 */
export async function fetchChildBalance(childId: string): Promise<ChildBalance | null> {
    try {
        const { data, error } = await supabase
            .from("child_balances")
            .select("*")
            .eq("child_id", childId)
            .single();

        if (error) {
            logger.error(`Error fetching child_balances view for child ${childId}`, error);
            return null;
        }

        return data;
    } catch (err) {
        logger.error(`Unhandled exception in fetchChildBalance for child ${childId}`, err);
        return null;
    }
}
