import { supabase } from "../supabase/client";
import { logger } from "../logger";
import { Database } from "../../types/database.types";

export type Reward = Database["public"]["Tables"]["rewards"]["Row"];
export type CreateRewardPayload = Database["public"]["Tables"]["rewards"]["Insert"];

/**
 * Creates a new reward in the shop.
 * @security RLS ensures only is_admin=true users can insert rewards.
 */
export async function createReward(payload: CreateRewardPayload): Promise<Reward> {
    logger.info("Provisioning new reward", { title: payload.title });

    try {
        const { data, error } = await supabase
            .from("rewards")
            .insert([payload])
            .select()
            .single();

        if (error) {
            logger.error("Failed to provision reward", error);
            throw new Error(error.message);
        }

        return data;
    } catch (err: any) {
        logger.error("Reward creation exception", err);
        throw err;
    }
}

/**
 * Fetches all active rewards in the system.
 */
export async function fetchRewards(): Promise<Reward[]> {
    try {
        const { data, error } = await supabase
            .from("rewards")
            .select("*")
            .eq("is_active", true)
            .order("point_cost", { ascending: true });

        if (error) {
            logger.error("Error fetching rewards", error);
            return [];
        }

        return data || [];
    } catch (err) {
        logger.error("Unhandled exception in fetchRewards", err);
        return [];
    }
}

/**
 * Executes an atomic reward purchase via PostgreSQL RPC.
 * This guarantees no overdrafts can occur even with rapid concurrent clicks.
 *
 * @param childId - The user ID of the child purchasing the reward.
 * @param rewardId - The UUID of the reward being purchased.
 * @returns The JSON response from the RPC function (success, new_balance).
 */
export async function purchaseReward(childId: string, rewardId: string) {
    logger.info("Attempting atomic reward purchase", { childId, rewardId });

    try {
        const { data, error } = await supabase.rpc("purchase_reward", {
            p_child_id: childId,
            p_reward_id: rewardId
        });

        if (error) {
            logger.error("Purchase RPC failed", error);
            throw new Error(error.message);
        }

        return data;
    } catch (err: any) {
        logger.error("Purchase exception", err);
        throw err;
    }
}
/**
 * Adjusts points for a child manually.
 * Updates balance, logs to ledger, and sends a notification.
 */
export async function adjustPoints(childId: string, delta: number, notes: string) {
    logger.info("Manual point adjustment", { childId, delta, notes });

    // 1. Get current balance
    const { data: balanceData, error: fetchError } = await supabase
        .from("child_balances")
        .select("current_points")
        .eq("child_id", childId)
        .maybeSingle();

    if (fetchError) throw fetchError;

    // 2. Atomic update: We ONLY insert into the ledger. 
    // The Profiles table NO LONGER has current_points. 
    // The child_balances view handles the derivation.

    // 3. Log to ledger
    const { error: ledgerError } = await supabase
        .from("point_ledger")
        .insert({
            child_id: childId,
            point_delta: delta,
            transaction_type: "parent_adjustment" as any,
            notes: notes
        });

    if (ledgerError) {
        logger.error("Failed to log adjustment to ledger", ledgerError);
    }

    // 4. Send notification to child
    await supabase.from("notifications").insert({
        user_id: childId,
        title: delta > 0 ? "Points Added! ✨" : "Points Deducted",
        body: `ADJUSTMENT|${delta}|${notes}`
    });
}
