"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "../ui/GlassCard";
import { supabase } from "../../lib/supabase/client";
import { logger } from "../../lib/logger";

interface ChildBalance {
    child_id: string;
    child_name: string;
    current_points: number;
    late_tasks_count?: number;
}

interface PendingTask {
    id: string;
    title: string;
    emoji: string | null;
    point_value: number;
}

/**
 * ChildProgressView — Displays child balances from the child_balances view
 * and renders pending locked tasks needing parent approval.
 *
 * @param parentId - The authenticated parent's user ID (used to query tasks by created_by).
 */
export function ChildProgressView({ parentId }: { parentId: string }) {
    const [balances, setBalances] = useState<ChildBalance[]>([]);
    const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            // Fetch balances from the child_balances view (all children)
            const { data: balanceData, error: balanceError } = await supabase
                .from("child_balances")
                .select("*");

            if (balanceError) throw balanceError;
            setBalances((balanceData as ChildBalance[]) || []);

            // Fetch pending locked tasks created by this parent
            const { data: taskData, error: taskError } = await supabase
                .from("tasks")
                .select("id, title, emoji, point_value")
                .eq("created_by", parentId)
                .eq("state", "locked");

            if (taskError) throw taskError;
            setPendingTasks(taskData || []);

            // Fetch late tasks count for each child
            const nowIso = new Date().toISOString();
            const { data: lateTasks } = await supabase
                .from("tasks")
                .select("assigned_to")
                .lt("due_date", nowIso); // Removed .neq("state", "completed") as it is invalid state.

            const lateCounts = (lateTasks || []).reduce((acc: any, t: any) => {
                const id = t.assigned_to;
                acc[id] = (acc[id] || 0) + 1;
                return acc;
            }, {});

            setBalances(prev => prev.map(b => ({
                ...b,
                late_tasks_count: lateCounts[b.child_id] || 0
            })));

        } catch (error) {
            logger.error("Failed to load child progress", error);
        } finally {
            setIsLoading(false);
        }
    }, [parentId]);

    useEffect(() => {
        if (!parentId) return;
        fetchData();

        // 🟢 REALTIME SUBSCRIPTION
        const channel = supabase
            .channel('child_progress_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'point_ledger' },
                () => fetchData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                () => fetchData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications' },
                () => fetchData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [parentId, fetchData]);

    if (isLoading) {
        return <div className="animate-pulse h-40 bg-white/10 rounded-3xl" />;
    }

    if (balances.length === 0) {
        return (
            <GlassCard className="w-full text-center p-8">
                <p className="text-typography/70 mb-2">No children found yet.</p>
                <p className="text-xs text-typography/50">Create a child account to see their progress here!</p>
            </GlassCard>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-4">
                {balances.map((child) => (
                    <GlassCard
                        key={child.child_id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col p-5 gap-4 relative overflow-hidden group"
                    >
                        {/* Background Decorative Element */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-dopamine-cyan/5 rounded-bl-full -mr-8 -mt-8 blur-2xl group-hover:bg-dopamine-cyan/10 transition-colors" />

                        <div className="flex items-center justify-between z-10">
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black text-base text-typography truncate tracking-tight uppercase">
                                    {child.child_name || "Hero"}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    {child.late_tasks_count && child.late_tasks_count > 0 ? (
                                        <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20 flex items-center gap-1">
                                            <span className="animate-pulse">⚠️</span> {child.late_tasks_count} LATE
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black text-gentle-green bg-gentle-green/10 px-2.5 py-1 rounded-full border border-gentle-green/20 flex items-center gap-1">
                                            ✨ ALL CLEAR
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className="bg-slate-900/90 border-2 border-dopamine-yellow/50 px-4 py-2 rounded-2xl shadow-xl ring-1 ring-white/10 group-hover:border-dopamine-yellow transition-all">
                                    <p className="text-[10px] font-black text-dopamine-yellow uppercase tracking-widest text-center leading-none mb-1 opacity-50">Balance</p>
                                    <div className="flex items-baseline gap-1 justify-center">
                                        <span className="text-xl font-black text-white">{child.current_points}</span>
                                        <span className="text-[10px] font-bold text-white/50">PTS</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {pendingTasks.length > 0 && (
                <GlassCard className="mt-4 border-dopamine-cyan/30">
                    <h3 className="font-bold text-sm text-dopamine-cyan uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-dopamine-cyan animate-pulse"></span>
                        Pending Approvals
                    </h3>
                    <div className="flex flex-col gap-3">
                        {pendingTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between bg-black/20 rounded-xl p-3 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{task.emoji}</span>
                                    <span className="font-medium text-sm">{task.title}</span>
                                </div>
                                <span className="text-sm font-bold text-dopamine-yellow">+{task.point_value}</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
