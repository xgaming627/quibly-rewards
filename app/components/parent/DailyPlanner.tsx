"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { supabase } from "../../lib/supabase/client";
import { logger } from "../../lib/logger";
import { Database } from "../../types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface DailyPlannerProps {
    parentId: string;
}

export function DailyPlanner({ parentId }: DailyPlannerProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("recurrence", "daily")
                .eq("is_active", true)
                .order("sort_order", { ascending: true });

            if (error) throw error;
            setTasks(data || []);
        } catch (err) {
            logger.error("Failed to fetch tasks for planner", err);
        } finally {
            setIsLoading(false);
        }
    }, [parentId]);

    useEffect(() => {
        fetchTasks();

        const channel = supabase
            .channel('planner_task_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                () => fetchTasks()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTasks]);

    const handleReorder = async (newOrder: Task[], timeOfDay: string) => {
        // Update local state first for snappiness
        const updatedTasks = tasks.map(t => {
            if (t.time_of_day === timeOfDay) {
                const index = newOrder.findIndex(nt => nt.id === t.id);
                return { ...t, sort_order: index };
            }
            return t;
        });
        
        // This is a bit tricky with Reorder.Group because it only manages the subset
        // We need to merge them back correctly
        const otherTasks = tasks.filter(t => t.time_of_day !== timeOfDay);
        const finalTasks = [...otherTasks, ...newOrder.map((t, i) => ({ ...t, sort_order: i }))].sort((a, b) => {
            if (a.time_of_day !== b.time_of_day) return 0; // Relative order doesn't matter across groups here
            return a.sort_order - b.sort_order;
        });
        
        setTasks(finalTasks);

        // Update database
        try {
            const updates = newOrder.map((t, i) => ({
                id: t.id,
                sort_order: i
            }));

            for (const update of updates) {
                await supabase
                    .from("tasks")
                    .update({ sort_order: update.sort_order })
                    .eq("id", update.id);
            }
        } catch (err) {
            logger.error("Failed to save reorder", err);
        }
    };

    const renderSegment = (timeOfDay: "morning" | "afternoon" | "night", emoji: string, title: string) => {
        const segmentTasks = tasks.filter(t => t.time_of_day === timeOfDay);

        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{emoji}</span>
                    <h3 className="text-sm font-black text-typography uppercase tracking-widest">{title}</h3>
                    <span className="text-[10px] font-bold text-typography/30 ml-auto">{segmentTasks.length} Quests</span>
                </div>

                <Reorder.Group
                    axis="y"
                    values={segmentTasks}
                    onReorder={(newOrder) => handleReorder(newOrder, timeOfDay)}
                    className="flex flex-col gap-3"
                >
                    {segmentTasks.length === 0 ? (
                        <div className="p-6 border border-dashed border-white/10 rounded-2xl text-center text-typography/30 text-xs italic">
                            No quests scheduled for {title.toLowerCase()}
                        </div>
                    ) : (
                        segmentTasks.map(task => (
                            <Reorder.Item
                                key={task.id}
                                value={task}
                                className="cursor-grab active:cursor-grabbing"
                            >
                                <GlassCard className="p-3 border-white/5 flex items-center gap-3">
                                    <span className="text-xl">{task.emoji}</span>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-typography">{task.title}</h4>
                                        <p className="text-[10px] text-typography/40">{task.point_value} pts</p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="w-1 h-1 rounded-full bg-typography/20" />
                                        <div className="w-1 h-1 rounded-full bg-typography/20" />
                                        <div className="w-1 h-1 rounded-full bg-typography/20" />
                                    </div>
                                </GlassCard>
                            </Reorder.Item>
                        ))
                    )}
                </Reorder.Group>
            </div>
        );
    };

    if (isLoading) {
        return <div className="animate-pulse h-64 bg-white/5 rounded-3xl w-full" />;
    }

    return (
        <section className="flex flex-col gap-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {renderSegment("morning", "☀️", "Morning")}
                {renderSegment("afternoon", "🌤️", "Afternoon")}
                {renderSegment("night", "🌙", "Night")}
            </div>
            
            <GlassCard className="p-6 border-dopamine-cyan/20 bg-gradient-to-br from-dopamine-cyan/5 to-transparent">
                <div className="flex items-start gap-4">
                    <span className="text-2xl">💡</span>
                    <div>
                        <h4 className="text-sm font-bold text-dopamine-cyan mb-1">Planning Pro-tip</h4>
                        <p className="text-xs text-typography/60 leading-relaxed">
                            Drag and drop tasks to set the perfect flow for your child. 
                            Tasks appear on their Quest Board in this exact order to help them build a predictable routine.
                        </p>
                    </div>
                </div>
            </GlassCard>
        </section>
    );
}
