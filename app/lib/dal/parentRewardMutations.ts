import { supabase } from "../supabase/client";
import { logger } from "../logger";
import { Database } from "../../types/database.types";

export type Reward = Database["public"]["Tables"]["rewards"]["Row"];

export async function updateReward(
    rewardId: string,
    updates: Partial<Omit<Reward, "id" | "created_at" | "created_by">>
): Promise<void> {
    try {
        const { error } = await supabase
            .from("rewards")
            .update(updates)
            .eq("id", rewardId);

        if (error) {
            logger.error("Failed to update reward", error);
            throw new Error(error.message);
        }
    } catch (err: any) {
        logger.error("updateReward exception", err);
        throw err;
    }
}

export async function deleteReward(rewardId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from("rewards")
            .delete()
            .eq("id", rewardId);

        if (error) {
            logger.error("Failed to delete reward", error);
            throw new Error(error.message);
        }
    } catch (err: any) {
        logger.error("deleteReward exception", err);
        throw err;
    }
}

export async function fetchAllParentRewards(parentId: string): Promise<Reward[]> {
    try {
        const { data, error } = await supabase
            .from("rewards")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            logger.error("Failed to fetch parent rewards", error);
            throw new Error(error.message);
        }

        return data || [];
    } catch (err: any) {
        logger.error("fetchAllParentRewards exception", err);
        return [];
    }
}
