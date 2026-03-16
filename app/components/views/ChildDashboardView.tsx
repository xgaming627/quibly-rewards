"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { MascotAvatar } from "../ui/MascotAvatar";
import { ChildLayout } from "../ui/ChildLayout";
import { TaskCard } from "../child/TaskCard";
import { RewardShop } from "../child/RewardShop";
import { useGlobal } from "../../store/GlobalState";
import { supabase } from "../../lib/supabase/client";
import { completeUnlockedTask, requestLockedTaskApproval } from "../../lib/dal/childMutations";
import { materializePresetsForChild } from "../../lib/dal/presetMutations";
import { logger } from "../../lib/logger";
import { Database } from "../../types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type PointLedgerEntry = Database["public"]["Tables"]["point_ledger"]["Row"];

export function ChildDashboardView() {
    const { session, profile } = useGlobal();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
    const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
    const [allTimeTasks, setAllTimeTasks] = useState<Task[]>([]);
    const [missingTasks, setMissingTasks] = useState<Task[]>([]);
    const [currentPoints, setCurrentPoints] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showReset, setShowReset] = useState(false);
    const [adjustmentAlert, setAdjustmentAlert] = useState<{ delta: number; reason: string; id: string } | null>(null);

    const childId = session?.user?.id;

    const checkAdjustments = useCallback(async () => {
        if (!childId) return;
        const { data } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", childId)
            .is("is_read", false)
            .like("body", "ADJUSTMENT|%")
            .order("created_at", { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            const parts = data[0].body.split("|");
            setAdjustmentAlert({
                delta: parseInt(parts[1]) || 0,
                reason: parts[2] || "Manual adjustment",
                id: data[0].id
            });
        }
    }, [childId]);

    const fetchData = useCallback(async (options?: { skipMaterialize?: boolean }) => {
        if (!childId) return;

        try {
            await checkAdjustments();

            // 0. Materialize presets for this child. 
            // We only do this on full refresh or mount, NOT on every realtime update 
            // to prevent the "feedback loop" of insertions triggering updates.
            if (!options?.skipMaterialize) {
                const { data: adminData } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("is_admin", true)
                    .limit(1)
                    .maybeSingle();

                if (adminData?.id) {
                    await materializePresetsForChild(childId, adminData.id);
                }
            }

            // 1. Fetch all active tasks assigned to this child OR unassigned (for 2-person simplicity)
            const { data: taskData } = await supabase
                .from("tasks")
                .select("*")
                .or(`assigned_to.eq.${childId},assigned_to.is.null`)
                .eq("is_active", true)
                .order("created_at", { ascending: false });
            // ... existing code continues

            const allTasks = taskData || [];

            // 2. Fetch ledger entries
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const weekStart = new Date(todayStart);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());

            const { data: ledgerData } = await supabase
                .from("point_ledger")
                .select("task_id, created_at, transaction_type")
                .eq("child_id", childId)
                .eq("transaction_type", "task_completion");

            const completedLedger = ledgerData || [];

            // 3. Filter tasks
            const nowIso = new Date().toISOString();
            
            const availableDaily = allTasks.filter(t => 
                t.recurrence === "daily" && 
                (!t.due_date || t.due_date >= nowIso) &&
                !completedLedger.some(l => l.task_id === t.id && new Date(l.created_at) >= todayStart)
            ).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

            const availableWeekly = allTasks.filter(t => 
                t.recurrence === "weekly" && 
                (!t.due_date || t.due_date >= nowIso) &&
                !completedLedger.some(l => l.task_id === t.id && new Date(l.created_at) >= weekStart)
            );

            const availableAllTime = allTasks.filter(t => 
                t.recurrence === "all_time" && 
                !completedLedger.some(l => l.task_id === t.id)
            );

            setDailyTasks(availableDaily);
            setWeeklyTasks(availableWeekly);
            setAllTimeTasks(availableAllTime);

            // 4. Missing Tasks (Only show if they were missed but still relevant to see, OR just log them)
            // For now, keep as is but focus on active ones for the main board
            const missed = allTasks.filter(t =>
                t.due_date &&
                t.due_date < nowIso &&
                !completedLedger.some(l => l.task_id === t.id)
            );
            setMissingTasks(missed);

            // 5. Fetch child balance
            const { data: balanceData } = await supabase
                .from("child_balances")
                .select("current_points")
                .eq("child_id", childId)
                .maybeSingle();

            setCurrentPoints(balanceData?.current_points || 0);

            // Gentle Reset
            if (availableDaily.length > 0 && new Date().getHours() < 10) {
                setShowReset(true);
            }
        } catch (err) {
            logger.error("Failed to load child dashboard data", err);
        } finally {
            setIsLoading(false);
        }
    }, [childId, checkAdjustments]);

    useEffect(() => {
        fetchData();

        if (!childId) return;

        const channel = supabase
            .channel('child_dashboard_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'point_ledger' },
                () => fetchData({ skipMaterialize: true })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                () => fetchData({ skipMaterialize: true })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rewards' },
                () => fetchData({ skipMaterialize: true })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications' },
                () => fetchData({ skipMaterialize: true })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => fetchData({ skipMaterialize: true })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'child_balances' },
                () => fetchData({ skipMaterialize: true })
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, childId]);

    const handleDismissAdjustment = async () => {
        if (!adjustmentAlert) return;
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", adjustmentAlert.id);
        setAdjustmentAlert(null);
        fetchData();
    };

    const handleComplete = async (task: Task) => {
        if (!childId) return;
        const result = await completeUnlockedTask(childId, task);
        if (result) {
            setCurrentPoints(prev => prev + result.point_delta);
        }
        if (task.recurrence === "daily") {
            setDailyTasks(prev => prev.filter(t => t.id !== task.id));
        } else if (task.recurrence === "weekly") {
            setWeeklyTasks(prev => prev.filter(t => t.id !== task.id));
        } else {
            setAllTimeTasks(prev => prev.filter(t => t.id !== task.id));
        }
        setMissingTasks(prev => prev.filter(t => t.id !== task.id));
    };

    const handleRequestApproval = async (task: Task, reason: string) => {
        if (!childId) return;
        await requestLockedTaskApproval(task.id, childId, reason);
        if (task.recurrence === "daily") {
            setDailyTasks(prev => prev.filter(t => t.id !== task.id));
        } else if (task.recurrence === "weekly") {
            setWeeklyTasks(prev => prev.filter(t => t.id !== task.id));
        } else {
            setAllTimeTasks(prev => prev.filter(t => t.id !== task.id));
        }
        setMissingTasks(prev => prev.filter(t => t.id !== task.id));
    };

    return (
        <ChildLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === "dashboard" && (
                <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 mt-8 pb-20">
                    <header className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <MascotAvatar state="dopamine" className="w-14 h-14" priority />
                            <div>
                                <h1 className="text-2xl font-black text-typography tracking-tight">Quest Board</h1>
                                <p className="text-sm font-medium text-typography/60">Hey {profile?.display_name || "Explorer"}! 🌟</p>
                            </div>
                        </div>

                        <motion.div
                            key={currentPoints}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="bg-slate-900/90 backdrop-blur-md border-2 border-dopamine-yellow/50 rounded-2xl px-6 py-3 flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                        >
                            <span className="text-3xl font-black text-dopamine-yellow drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{currentPoints}</span>
                            <span className="text-xs font-black text-dopamine-yellow/80 uppercase tracking-tighter">Points</span>
                        </motion.div>
                    </header>

                    <AnimatePresence>
                        {showReset && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="bg-gentle-green/15 border border-gentle-green/30 rounded-2xl p-4 flex items-center gap-3">
                                    <span className="text-2xl">🌱</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gentle-green">Fresh Start!</p>
                                        <p className="text-xs text-gentle-green/70">Your daily quests have reset. A brand new chance to earn! ✨</p>
                                    </div>
                                    <button onClick={() => setShowReset(false)} className="text-gentle-green/50 hover:text-gentle-green text-lg transition-colors">✕</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {adjustmentAlert && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
                            >
                                <GlassCard className="max-w-sm w-full p-8 border-dopamine-yellow/50 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dopamine-yellow to-transparent" />
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-dopamine-yellow/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <span className="text-4xl">{adjustmentAlert.delta > 0 ? "💰" : "⚖️"}</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-typography mb-2">Points {adjustmentAlert.delta > 0 ? "Added!" : "Adjusted"}</h2>
                                        <p className="text-4xl font-black text-dopamine-yellow mb-6">{adjustmentAlert.delta > 0 ? `+${adjustmentAlert.delta}` : adjustmentAlert.delta} pts</p>
                                        <div className="bg-white/5 rounded-2xl p-4 mb-8">
                                            <p className="text-xs font-bold text-typography/40 uppercase tracking-widest mb-1">Reason</p>
                                            <p className="text-sm text-typography/80 italic">&quot;{adjustmentAlert.reason}&quot;</p>
                                        </div>
                                        <button onClick={handleDismissAdjustment} className="w-full py-4 rounded-2xl bg-dopamine-yellow text-slate-950 font-black text-sm uppercase tracking-widest shadow-xl shadow-dopamine-yellow/20 active:scale-95 transition-all">Got it! ✨</button>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse h-24 bg-white/10 rounded-3xl" />)}
                        </div>
                    )}

                    {!isLoading && (
                        <>
                            {missingTasks.length > 0 && (
                                <section className="bg-red-500/5 border border-red-500/10 rounded-[2rem] p-6 mb-8">
                                    <h2 className="text-red-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        Incomplete Quests
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70 grayscale-[0.5]">
                                        {missingTasks.map(task => <TaskCard key={task.id} task={task} onComplete={handleComplete} onRequestApproval={handleRequestApproval} />)}
                                    </div>
                                </section>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                <div className="lg:col-span-8 flex flex-col gap-10">
                                    <section>
                                        <h2 className="text-xl font-black text-typography mb-4 flex items-center gap-2"><span className="text-dopamine-yellow">☀️</span> Daily Quests</h2>
                                        {dailyTasks.length === 0 ? (
                                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-typography/60 text-sm italic">All caught up for today! ✨</div>
                                        ) : (
                                            <div className="flex flex-col gap-8">
                                                {["morning", "afternoon", "night"].map((time) => {
                                                    const tasks = dailyTasks.filter(t => t.time_of_day === time || (!t.time_of_day && time === "morning"));
                                                    if (tasks.length === 0) return null;
                                                    
                                                    const icons: Record<string, string> = { morning: "🌅", afternoon: "☀️", night: "🌙" };
                                                    const labels: Record<string, string> = { morning: "Morning", afternoon: "Afternoon", night: "Night" };

                                                    return (
                                                        <div key={time} className="flex flex-col gap-4">
                                                            <div className="flex items-center gap-2 opacity-50">
                                                                <span className="text-sm">{icons[time]}</span>
                                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-typography">{labels[time]}</h3>
                                                                <div className="flex-1 h-[1px] bg-white/10" />
                                                            </div>
                                                            <motion.div 
                                                                variants={{
                                                                    hidden: { opacity: 0 },
                                                                    show: {
                                                                        opacity: 1,
                                                                        transition: { staggerChildren: 0.05 }
                                                                    }
                                                                }}
                                                                initial="hidden"
                                                                animate="show"
                                                                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                                            >
                                                                <AnimatePresence mode="popLayout">
                                                                    {tasks.map((task: Task) => <TaskCard key={task.id} task={task} onComplete={handleComplete} onRequestApproval={handleRequestApproval} />)}
                                                                </AnimatePresence>
                                                            </motion.div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>

                                    {weeklyTasks.length >= 0 && (
                                        <section>
                                            <h2 className="text-xl font-black text-typography mb-4 flex items-center gap-2"><span className="text-dopamine-cyan">📅</span> Weekly Quests</h2>
                                            {weeklyTasks.length === 0 ? (
                                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center text-typography/60 text-sm">All caught up for the week!</div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <AnimatePresence>
                                                        {weeklyTasks.map((task: Task) => <TaskCard key={task.id} task={task} onComplete={handleComplete} onRequestApproval={handleRequestApproval} />)}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    {allTimeTasks.length > 0 && (
                                        <section>
                                            <h2 className="text-xl font-black text-typography mb-4 flex items-center gap-2"><span className="text-purple-400">🏆</span> All-time Quests</h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <AnimatePresence>
                                                    {allTimeTasks.map((task: Task) => <TaskCard key={task.id} task={task} onComplete={handleComplete} onRequestApproval={handleRequestApproval} />)}
                                                </AnimatePresence>
                                            </div>
                                        </section>
                                    )}
                                </div>

                                <div className="lg:col-span-4 flex flex-col gap-10">
                                    <GlassCard className="p-6 border-dopamine-cyan/20">
                                        <h3 className="text-xs font-bold text-dopamine-cyan uppercase tracking-[0.2em] mb-4">Explorer Tips</h3>
                                        <ul className="text-xs text-typography/60 space-y-3">
                                            <li className="flex gap-2">✨ <span>Check back daily for new quests!</span></li>
                                            <li className="flex gap-2">🚀 <span>Complete All-time Quests for huge point boosts.</span></li>
                                            <li className="flex gap-2">🎁 <span>Visit the shop to spend your points.</span></li>
                                        </ul>
                                    </GlassCard>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === "rewards" && (
                <div className="w-full max-w-4xl mx-auto mt-12 pb-20">
                    <header className="flex items-center justify-between mb-8 gap-4">
                        <div className="flex items-center gap-4">
                            <MascotAvatar state="success" className="w-16 h-16" />
                            <div>
                                <h1 className="text-2xl font-black text-typography tracking-tight">Reward Shop</h1>
                                <p className="text-sm font-medium text-typography/60">Spend your hard-earned points!</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/90 px-4 py-2 rounded-2xl border-2 border-dopamine-yellow/50 shadow-lg flex items-center gap-2">
                            <span className="text-2xl font-black text-dopamine-yellow">{currentPoints}</span>
                            <span className="text-[10px] font-bold text-dopamine-yellow/70 uppercase tracking-widest">pts</span>
                        </div>
                    </header>

                    {childId ? (
                        <RewardShop childId={childId} currentPoints={currentPoints} onPurchaseSuccess={(cost) => setCurrentPoints(prev => prev - cost)} />
                    ) : (
                        <div className="text-center p-12">Loading...</div>
                    )}
                </div>
            )}
        </ChildLayout>
    );
}
