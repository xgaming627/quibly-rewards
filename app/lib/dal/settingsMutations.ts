import { supabase } from "../supabase/client";
import { logger } from "../logger";

export async function getStreakMultiplier(): Promise<number> {
    try {
        const { data, error } = await supabase
            .from("site_config")
            .select("streak_bonus_multiplier")
            .eq("id", 1)
            .single();

        if (error) {
            logger.error("Failed to fetch streak multiplier", error);
            return 0;
        }

        return data?.streak_bonus_multiplier || 0;
    } catch (err) {
        logger.error("getStreakMultiplier exception", err);
        return 0;
    }
}

export async function setStreakMultiplier(multiplier: number): Promise<void> {
    try {
        const { error } = await supabase
            .from("site_config")
            .update({ streak_bonus_multiplier: multiplier, updated_at: new Date().toISOString() })
            .eq("id", 1);

        if (error) {
            logger.error("Failed to update streak multiplier", error);
            throw error;
        }
    } catch (err) {
        logger.error("setStreakMultiplier exception", err);
        throw err;
    }
}
