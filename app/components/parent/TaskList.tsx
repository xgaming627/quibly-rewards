"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { DopamineButton } from "../ui/DopamineButton";
import { supabase } from "../../lib/supabase/client";
import { updateTask, deleteTask } from "../../lib/dal/parentMutations";
import { logger } from "../../lib/logger";
import { Database } from "../../types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface TaskListProps {
    parentId: string;
}

export function TaskList({ parentId }: TaskListProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTasks(data || []);
        } catch (err) {
            logger.error("Failed to fetch tasks in TaskList", err);
        } finally {
            setIsLoading(false);
        }
    }, [parentId]);

    useEffect(() => {
        fetchTasks();

        const channel = supabase
            .channel('parent_task_list_updates')
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

    const handleEdit = (task: Task) => {
        setEditingTask(task);
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await deleteTask(taskId);
            setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== taskId));
        } catch (err) {
            logger.error("Failed to delete task", err);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask) return;

        try {
            await updateTask(editingTask.id, {
                title: editingTask.title,
                emoji: editingTask.emoji,
                point_value: editingTask.point_value,
                recurrence: editingTask.recurrence,
            });
            setEditingTask(null);
            fetchTasks();
        } catch (err) {
            logger.error("Failed to update task", err);
        }
    };

    if (isLoading) {
        return <div className="animate-pulse h-40 bg-white/5 rounded-3xl" />;
    }

    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-typography/50 uppercase tracking-[0.3em] mb-2 pl-1">
                Active Quests
            </h3>
            
            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {tasks.map((task: Task) => (
                        <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <GlassCard className="p-4 border-white/5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-2xl w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 flex-shrink-0">
                                        {task.emoji || "✨"}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-typography truncate">
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] font-black text-dopamine-yellow uppercase tracking-widest bg-dopamine-yellow/10 px-1.5 py-0.5 rounded border border-dopamine-yellow/20">
                                                {task.point_value} PTS
                                            </span>
                                            <span className="text-[9px] font-bold text-typography/40 uppercase tracking-tighter">
                                                {task.recurrence.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(task)}
                                        className="p-2 text-typography/40 hover:text-dopamine-cyan transition-colors"
                                        title="Edit Quest"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(task.id)}
                                        className="p-2 text-typography/40 hover:text-red-400 transition-colors"
                                        title="Delete Quest"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                    {tasks.length === 0 && (
                        <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-8 text-center">
                            <p className="text-sm text-typography/40 italic">No active quests found. Create one above! 🚀</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Edit Modal / Inline Overlay */}
            <AnimatePresence>
                {editingTask && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
                    >
                        <GlassCard className="max-w-md w-full p-6 border-dopamine-cyan/50">
                            <form onSubmit={handleUpdate} className="flex flex-col gap-6">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <h2 className="text-xl font-bold text-typography flex items-center gap-2">
                                        <span className="text-dopamine-cyan">✎</span>
                                        Edit Quest
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setEditingTask(null)}
                                        className="text-typography/40 hover:text-typography transition-colors text-2xl"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-typography/50 uppercase tracking-widest pl-1">Icon</label>
                                            <input
                                                type="text"
                                                maxLength={2}
                                                value={editingTask.emoji || ""}
                                                onChange={(e) => setEditingTask({ ...editingTask, emoji: e.target.value })}
                                                className="bg-black/40 text-2xl text-center rounded-xl py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-dopamine-cyan/50"
                                            />
                                        </div>
                                        <div className="col-span-3 flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-typography/50 uppercase tracking-widest pl-1">Title</label>
                                            <input
                                                type="text"
                                                value={editingTask.title}
                                                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                                className="bg-black/40 text-typography px-4 rounded-xl py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-dopamine-cyan/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-typography/50 uppercase tracking-widest pl-1">Points</label>
                                            <input
                                                type="number"
                                                value={editingTask.point_value}
                                                onChange={(e) => setEditingTask({ ...editingTask, point_value: Number(e.target.value) })}
                                                className="bg-black/40 text-dopamine-yellow font-black px-4 rounded-xl py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-dopamine-yellow/50"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-typography/50 uppercase tracking-widest pl-1">Recurrence</label>
                                            <select
                                                value={editingTask.recurrence}
                                                onChange={(e) => setEditingTask({ ...editingTask, recurrence: e.target.value as Task["recurrence"] })}
                                                className="bg-black/40 text-typography px-2 rounded-xl py-2 border border-white/10 focus:outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="all_time">One Time</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <DopamineButton variant="cyan" type="submit" className="w-full">
                                    Save Changes
                                </DopamineButton>
                            </form>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
