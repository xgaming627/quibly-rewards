"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { logger } from "../../lib/logger";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, Gift } from "lucide-react";
import { Database } from "../../types/database.types";
import { completeUnlockedTask } from "../../lib/dal/childMutations";
import { purchaseReward } from "../../lib/dal/rewardMutations";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let mounted = true;

        // 1. Initial Fetch
        const fetchInitial = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", session.user.id)
                .order("created_at", { ascending: false })
                .limit(10); // Keep it light for the SPA

            if (error) {
                logger.error("Failed to fetch initial notifications", error);
                return;
            }

            if (mounted && data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        };

        fetchInitial();

        // 2. Realtime Subscription
        // Note: The channel name needs to be unique to avoid collisions
        const channel = supabase.channel('realtime_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                    // RLS ensures the user only receives their own notifications
                },
                (payload) => {
                    logger.info("Realtime notification received!", payload);
                    const newNotification = payload.new as Notification;

                    if (mounted) {
                        setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Keep top 10
                        setUnreadCount(prev => prev + 1);
                    }
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    logger.info("Realtime notification pipeline connected.");
                }
            });

        // 3. Cleanup on unmount
        return () => {
            mounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    const handleMarkAsRead = async () => {
        if (unreadCount === 0) return;

        setUnreadCount(0); // Optimistic clear
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", session.user.id)
                .eq("is_read", false);
        }
    };

    const handleApproval = async (notifId: string, action: "approve" | "reject", body: string) => {
        const parts = body.split("|");
        const taskId = parts[1];
        const childId = parts[2];

        // Optimistic UI
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            // 1. Mark as read immediately
            await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);

            // 2. Delete the 0-point block
            await supabase.from("point_ledger").delete().eq("task_id", taskId).eq("child_id", childId).eq("point_delta", 0);

            if (action === "approve") {
                const { data: taskData } = await supabase.from("tasks").select("*").eq("id", taskId).single();
                if (taskData) {
                    await completeUnlockedTask(childId, taskData);
                }
            }
        } catch (err) {
            logger.error("Approval error in bell", err);
        }
    };

    const handleRewardApproval = async (notifId: string, action: "grant" | "dismiss", body: string) => {
        const parts = body.split("|");
        const rewardId = parts[1];
        const childId = parts[2];

        // Optimistic UI
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);
            await supabase.from("point_ledger").delete().eq("reward_id", rewardId).eq("child_id", childId).eq("point_delta", 0);

            if (action === "grant") {
                await purchaseReward(childId, rewardId);
            }
        } catch (err) {
            logger.error("Reward approval error in bell", err);
        }
    };

    return (
        // 👇 Added z-[10000] to the outermost wrapper here
        <div className="relative z-[10000]">
            {/* Bell Icon & Badge */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && unreadCount > 0) handleMarkAsRead();
                }}
                className="relative p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 transition-colors shadow-lg"
            >
                <Bell className="text-typography w-6 h-6" />

                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.div
                            key={unreadCount}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className="absolute -top-2 -right-2 bg-red-400 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-background shadow-sm"
                        >
                            {unreadCount}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        // 👇 Kept z-[10000] here as well
                        className="absolute right-0 mt-4 w-96 bg-[#0f172a] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden z-[10000] text-left"
                    >
                        <div className="p-4 border-b border-black/5 bg-black/5">
                            <h3 className="font-bold text-sm uppercase tracking-widest text-typography">Alerts</h3>
                        </div>

                        <div className="max-h-96 overflow-y-auto p-2">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-typography/50 text-sm">
                                    No new alerts. You&apos;re all caught up! ✨
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {notifications.map(notif => {
                                        const isTaskRequest = notif.body.startsWith("TASK_REQUEST|");
                                        const isRewardRequest = notif.body.startsWith("REWARD_REQUEST|");
                                        let displayBody = notif.body;
                                        let reason = "";
                                        let taskId = "";
                                        let rewardId = "";
                                        let childId = "";

                                        if (isTaskRequest) {
                                            const parts = notif.body.split("|");
                                            taskId = parts[1];
                                            childId = parts[2];
                                            reason = parts[3] || "No reason provided";
                                            const taskTitle = parts[4] || "Unknown Task";
                                            displayBody = `${taskTitle}: "${reason}"`;
                                        } else if (isRewardRequest) {
                                            const parts = notif.body.split("|");
                                            rewardId = parts[1];
                                            childId = parts[2];
                                            reason = parts[3] || "No reason provided";
                                            displayBody = `Child wants this reward: "${reason}"`;
                                        }

                                        return (
                                            <div
                                                key={notif.id}
                                                className={`p-4 rounded-2xl transition-colors ${notif.is_read ? 'bg-transparent text-typography/70' : 'bg-white/5 text-typography font-medium'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-dopamine-cyan" />}
                                                    <h4 className="text-sm font-bold">
                                                        {isTaskRequest ? "Task Approval Request" : isRewardRequest ? "🎁 Reward Request" : notif.title}
                                                    </h4>
                                                </div>
                                                <p className="text-xs opacity-80 whitespace-pre-wrap pl-4 italic">{displayBody}</p>

                                                {isTaskRequest && !notif.is_read && (
                                                    <div className="flex gap-2 mt-3 pl-4">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApproval(notif.id, "reject", notif.body); }}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                                                        >
                                                            <X size={12} /> Reject
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApproval(notif.id, "approve", notif.body); }}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold bg-dopamine-cyan text-slate-950 hover:scale-[1.02] transition-transform"
                                                        >
                                                            <Check size={12} /> Approve
                                                        </button>
                                                    </div>
                                                )}

                                                {isRewardRequest && !notif.is_read && (
                                                    <div className="flex gap-2 mt-3 pl-4">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRewardApproval(notif.id, "dismiss", notif.body); }}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold bg-white/5 text-typography/60 hover:bg-white/10 transition-colors"
                                                        >
                                                            <X size={12} /> Dismiss
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRewardApproval(notif.id, "grant", notif.body); }}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold bg-dopamine-yellow text-slate-950 hover:scale-[1.02] transition-transform"
                                                        >
                                                            <Gift size={12} /> Grant Reward
                                                        </button>
                                                    </div>
                                                )}

                                                <span className="text-[10px] opacity-50 pl-4 mt-2 block">
                                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}