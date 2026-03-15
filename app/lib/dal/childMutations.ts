import { supabase } from "../supabase/client";
import { logger } from "../logger";
import { Database } from "../../types/database.types";
import { getStreakMultiplier } from "./settingsMutations";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

/**
 * Completes an unlocked task for a child.
 * Writes a `task_completion` row to the point_ledger.
 * Now includes Streak and Time-Limit Bonus logic for Phase 8.
 *
 * @param childId - The child's user ID
 * @param task - The full task row being completed
 * @returns The newly created ledger row, or null if already completed
 */
export async function completeUnlockedTask(
    childId: string,
    task: Task
): Promise<Database["public"]["Tables"]["point_ledger"]["Row"] | null> {
    logger.info("Completing unlocked task", { childId, taskId: task.id });

    try {
        // Idempotency check: has this task already been completed today/this week/ever?
        const now = new Date();
        let checkDate = new Date(0); // For all-time tasks, check since beginning of time

        if (task.recurrence === "daily") {
            checkDate = new Date(now);
            checkDate.setHours(0, 0, 0, 0);
        } else if (task.recurrence === "weekly") {
            checkDate = new Date(now);
            checkDate.setDate(now.getDate() - now.getDay()); // Sunday start
            checkDate.setHours(0, 0, 0, 0);
        }

        const { data: existing } = await supabase
            .from("point_ledger")
            .select("id")
            .eq("child_id", childId)
            .eq("task_id", task.id)
            .eq("transaction_type", "task_completion")
            .gte("created_at", checkDate.toISOString())
            .maybeSingle();

        if (existing) {
            logger.info("Task already completed for this period, skipping duplicate", { taskId: task.id });
            return null;
        }

        // --- PHASE 8/9 BONUS CALCULATIONS ---
        let totalPoints = task.point_value;
        let bonusNotes = [];

        // 1. Time Limit Bonus
        if (task.time_limit_minutes && task.time_limit_bonus > 0) {
            let startTimeMs = new Date(task.created_at).getTime();

            if (task.recurrence === "daily") {
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                if (startTimeMs < today.getTime()) {
                    startTimeMs = today.getTime();
                }
            } else if (task.recurrence === "weekly") {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay()); // Sunday
                weekStart.setHours(0, 0, 0, 0);
                if (startTimeMs < weekStart.getTime()) {
                    startTimeMs = weekStart.getTime();
                }
            }

            const diffMinutes = (now.getTime() - startTimeMs) / (1000 * 60);

            if (diffMinutes <= task.time_limit_minutes) {
                totalPoints += task.time_limit_bonus;
                bonusNotes.push(`+${task.time_limit_bonus} Time Bonus`);
            }
        }

        // 2. Streak Bonus
        const { data: profile } = await supabase
            .from("profiles")
            .select("current_streak, last_streak_date")
            .eq("id", childId)
            .single();

        let currentStreak = profile?.current_streak || 0;
        const lastStreakDate = profile?.last_streak_date ? new Date(profile.last_streak_date) : null;
        const todayDateStr = new Date().toISOString().split('T')[0];

        // Reset streak if they missed yesterday
        if (lastStreakDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            if (lastStreakDate < yesterday) {
                // Streak broken! Log it.
                if (currentStreak > 0) {
                    await supabase.from("point_ledger").insert({
                        child_id: childId,
                        transaction_type: "streak_break" as any,
                        point_delta: 0,
                        notes: `Lost ${currentStreak} day streak 😿`
                    });
                }
                currentStreak = 0;
            }
        }

        const streakMultiplier = await getStreakMultiplier();
        if (streakMultiplier > 0 && currentStreak > 0) {
            const streakBonus = streakMultiplier * currentStreak;
            totalPoints += streakBonus;
            bonusNotes.push(`+${streakBonus} Streak Bonus (x${currentStreak})`);
        }

        const notes = `Completed: ${task.title}` + (bonusNotes.length > 0 ? ` [${bonusNotes.join(', ')}]` : '');

        // --- INSERT LEDGER ---
        const { data, error } = await supabase
            .from("point_ledger")
            .insert({
                child_id: childId,
                task_id: task.id,
                transaction_type: "task_completion",
                point_delta: totalPoints,
                notes: notes
            })
            .select()
            .single();

        if (error) {
            logger.error("Failed to write task completion to ledger", error);
            throw new Error(error.message);
        }

        // --- UPDATE STREAK ---
        // If they accomplished something today and haven't logged a streak for today yet
        if (profile?.last_streak_date !== todayDateStr) {
            await supabase
                .from("profiles")
                .update({
                    current_streak: currentStreak + 1,
                    last_streak_date: todayDateStr
                })
                .eq("id", childId);
        }

        return data;
    } catch (err: any) {
        logger.error("completeUnlockedTask exception", err);
        throw err;
    }
}

/**
 * Requests parent approval for a locked task.
 * Updates the task's state to signal it is pending review.
 * The child sees a "Sent to Parent" acknowledgment to preserve the dopamine loop.
 *
 * @param taskId - The UUID of the locked task
 * @param childId - The child's user ID (for the notification)
 * @param reason - The reason the child provided for completion
 */
export async function requestLockedTaskApproval(
    taskId: string,
    childId: string,
    reason: string
): Promise<void> {
    logger.info("Requesting locked task approval", { taskId, childId });

    try {
        // 1. Insert 0-point ledger block to trigger frontend anti-spam filter
        const { error: blockError } = await supabase
            .from("point_ledger")
            .insert({
                child_id: childId,
                task_id: taskId,
                transaction_type: "task_completion",
                point_delta: 0,
                notes: `[PENDING APPROVAL] Reason: ${reason}`
            });

        if (blockError) {
            logger.error("Failed to insert approval ledger block", blockError);
            throw new Error(blockError.message);
        }

        // 2. Fetch the task to find the creator (parent)
        // 2. Fetch the task to find the creator (parent)
        const { data: taskData, error: taskError } = await supabase
            .from("tasks")
            .select("created_by, title")
            .eq("id", taskId)
            .single();

        if (taskError || !taskData) {
            logger.error("Failed to fetch task creator", taskError);
            throw new Error(taskError?.message || "Task not found");
        }

        // 3. Insert structured parent notification (TASK_REQUEST|taskId|childId|Reason|TaskTitle)
        // Now targeting the parent specifically so their NotificationBell shows it!
        const { error: notifError } = await supabase
            .from("notifications")
            .insert({
                user_id: taskData.created_by,
                title: "Task Approval Request",
                body: `TASK_REQUEST|${taskId}|${childId}|${reason}|${taskData.title}`
            });

        if (notifError) {
            logger.error("Failed to create approval notification", notifError);
            throw new Error(notifError.message);
        }
    } catch (err: any) {
        logger.error("requestLockedTaskApproval exception", err);
        throw err;
    }
}

/**
 * Requests parent approval to purchase an unaffordable reward.
 *
 * @param rewardId - The UUID of the reward
 * @param childId - The child's user ID (for the notification)
 * @param reason - The reason the child provided for wanting it
 */
export async function requestReward(
    rewardId: string,
    childId: string,
    reason: string
): Promise<void> {
    logger.info("Requesting reward", { rewardId, childId });

    try {
        // 1. Insert 0-point ledger block to trigger frontend anti-spam filter
        const { error: blockError } = await supabase
            .from("point_ledger")
            .insert({
                child_id: childId,
                reward_id: rewardId,
                transaction_type: "reward_request" as any,
                point_delta: 0,
                notes: `[PENDING REQUEST] Reason: ${reason}`
            });

        if (blockError) {
            logger.error("Failed to insert reward request ledger block", blockError);
            throw new Error(blockError.message);
        }

        // 2. Fetch the reward to find the creator (parent)
        const { data: rewardData, error: rewardError } = await supabase
            .from("rewards")
            .select("created_by")
            .eq("id", rewardId)
            .single();

        if (rewardError || !rewardData) {
            logger.error("Failed to fetch reward creator", rewardError);
            throw new Error(rewardError?.message || "Reward not found");
        }

        // 3. Insert structured parent notification (REWARD_REQUEST|rewardId|childId|Reason)
        const { error: notifError } = await supabase
            .from("notifications")
            .insert({
                user_id: rewardData.created_by,
                title: "Reward Request",
                body: `REWARD_REQUEST|${rewardId}|${childId}|${reason}`
            });

        if (notifError) {
            logger.error("Failed to create reward notification", notifError);
            throw new Error(notifError.message);
        }
    } catch (err: any) {
        logger.error("requestReward exception", err);
        throw err;
    }
}
