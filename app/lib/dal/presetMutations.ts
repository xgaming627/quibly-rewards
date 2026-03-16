import { supabase } from "../supabase/client";
import { logger } from "../logger";
import { Database } from "../../types/database.types";

export interface TaskPreset {
    id: string;
    parent_id: string;
    title: string;
    description: string | null;
    point_value: number;
    emoji: string | null;
    is_active: boolean;
    schedule_type: 'daily' | 'range' | 'days';
    schedule_data: any;
    day_lock: boolean;
    time_limit_minutes: number | null;
    time_limit_bonus: number;
    time_of_day: 'morning' | 'afternoon' | 'night';
    sort_order: number;
    weekly_persistence: boolean;
    created_at: string;
}

/**
 * Fetch all presets for a parent.
 */
export async function fetchPresets(parentId: string): Promise<TaskPreset[]> {
    if (!parentId || parentId.length < 32) {
        logger.warn("fetchPresets called with invalid parentId", { parentId });
        return [];
    }

    const { data, error } = await supabase
        .from("task_presets")
        .select("*")
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false });

    if (error) {
        logger.error("Failed to fetch presets", error);
        return [];
    }
    return data as TaskPreset[];
}

/**
 * Toggle a preset's active status.
 */
export async function togglePreset(id: string, isActive: boolean) {
    const { error } = await supabase
        .from("task_presets")
        .update({ is_active: isActive })
        .eq("id", id);

    if (error) {
        logger.error("Failed to toggle preset", error);
        throw error;
    }
}

/**
 * Create a new task preset.
 */
export async function createPreset(preset: Partial<TaskPreset>) {
    if (!preset.parent_id || preset.parent_id.length < 32) {
        throw new Error("Cannot create preset: invalid or missing parent_id");
    }

    const { data, error } = await supabase
        .from("task_presets")
        .insert(preset as any)
        .select()
        .single();

    if (error) {
        logger.error("Failed to create preset", error);
        throw error;
    }
    return data;
}

/**
 * Materializes presets into tasks for a given child.
 * This should be called when the child logs in or the dashboard is refreshed.
 */
export async function materializePresetsForChild(childId: string, parentId?: string) {
    let finalParentId = parentId;

    if (!finalParentId) {
        // Resolve parent from child's assignments if not provided
        const { data } = await supabase
            .from("tasks")
            .select("created_by")
            .eq("assigned_to", childId)
            .limit(1)
            .maybeSingle();
        finalParentId = data?.created_by;
    }

    if (!finalParentId) return;

    const presets = await fetchPresets(finalParentId);
    const activePresets = presets.filter(p => p.is_active);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayIso = today.toISOString().split('T')[0];

    // Calculate week bounds
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartIso = weekStart.toISOString().split('T')[0];

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekEndIso = weekEnd.toISOString().split('T')[0];

    for (const preset of activePresets) {
        let shouldCreate = false;
        let dueDate = todayIso + 'T23:59:59';
        let checkStart = todayIso + 'T00:00:00';
        let checkEnd = todayIso + 'T23:59:59';

        if (preset.weekly_persistence) {
            shouldCreate = true;
            dueDate = weekEndIso + 'T23:59:59';
            checkStart = weekStartIso + 'T00:00:00';
            checkEnd = weekEndIso + 'T23:59:59';
        } else if (preset.schedule_type === 'daily') {
            shouldCreate = true;
        } else if (preset.schedule_type === 'days') {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayName = dayNames[now.getDay()];
            if (preset.schedule_data.selectedDays?.includes(todayName)) {
                shouldCreate = true;
            }
        } else if (preset.schedule_type === 'range') {
            const start = new Date(preset.schedule_data.startDate);
            const end = new Date(preset.schedule_data.endDate);
            if (now >= start && now <= end) {
                shouldCreate = true;
            }
        }

        if (shouldCreate) {
            // Check if task already exists for this preset (within its persistence window)
            // CRITICAL: We check for ANY task with this preset_id and due_date range
            // regardless of whether it's unassigned or assigned to this specific child.
            const { data: existing, error: checkError } = await supabase
                .from("tasks")
                .select("id")
                .eq("preset_id", preset.id)
                .gte("due_date", checkStart)
                .lte("due_date", checkEnd)
                .limit(1);

            if (checkError) {
                logger.error("Error checking for existing tasks", checkError);
                continue;
            }

            if (!existing || existing.length === 0) {
                logger.info("Materializing task from preset", { presetId: preset.id, childId });
                const { error: insertError } = await supabase.from("tasks").insert({
                    created_by: finalParentId,
                    assigned_to: null, // Default to unassigned for simplicity in shared environments
                    preset_id: preset.id,
                    title: preset.title,
                    description: preset.description,
                    emoji: preset.emoji,
                    point_value: preset.point_value,
                    due_date: dueDate,
                    recurrence: preset.weekly_persistence ? 'weekly' : 'daily',
                    state: preset.day_lock ? 'locked' : 'unlocked',
                    time_limit_minutes: preset.time_limit_minutes,
                    time_limit_bonus: preset.time_limit_bonus,
                    time_of_day: preset.time_of_day,
                    sort_order: preset.sort_order
                });

                if (insertError) {
                    // This might happen if another process inserted it simultaneously (once we add the DB constraint)
                    logger.warn("Potential race condition during task materialization", insertError);
                }
            }
        }
    }
}
