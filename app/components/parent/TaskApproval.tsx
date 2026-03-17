"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase/client";
import { logger } from "../../lib/logger";
import { Database } from "../../types/database.types";
import { motion, AnimatePresence } from "framer-motion";
import { completeUnlockedTask } from "../../lib/dal/childMutations"; // using for actual completion

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function TaskApproval() {
    const [requests, setRequests] = useState<{ notif: Notification, taskId: string, childId: string, reason: string, taskTitle: string, childName: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRequests = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("is_read", false)
            .ilike("body", "TASK_REQUEST|%")
            .order("created_at", { ascending: false });

        if (error) {
            logger.error("Failed to fetch task requests", error);
        } else if (data) {
            const parsed = data.map(notif => {
                const parts = notif.body.split("|");
                return {
                    notif,
                    taskId: parts[1],
                    childId: parts[2],
                    reason: parts[3] || "No reason provided",
                    taskTitle: parts[4] || "Unknown Task",
                    childName: parts[5] || parts[2].slice(0, 4) // Fallback to ID slice
                };
            });
            setRequests(parsed);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchRequests();

        const channel = supabase
            .channel('task_approval_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications' },
                () => fetchRequests()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleAction = async (requestId: string, action: "approve" | "reject", taskId: string, childId: string) => {
        // Optimistic UI update
        setRequests(prev => prev.filter(r => r.notif.id !== requestId));

        try {
            // 1. Mark notification as read
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", requestId);

            // 2. Delete the 0-point block from the ledger so the task is "freed"
            await supabase
                .from("point_ledger")
                .delete()
                .eq("task_id", taskId)
                .eq("child_id", childId)
                .eq("point_delta", 0);

            // 3. If approved, process the actual completion granting real points
            if (action === "approve") {
                const { data: taskData } = await supabase
                    .from("tasks")
                    .select("*")
                    .eq("id", taskId)
                    .single();

                if (taskData) {
                    await completeUnlockedTask(childId, taskData);
                }
            }

        } catch (err) {
            logger.error(`Failed to ${action} task request`, err);
            fetchRequests(); // Revert optimistic update on failure
        }
    };

    if (isLoading) {
        return <div className="animate-pulse h-24 bg-white/10 rounded-3xl" />;
    }

    if (requests.length === 0) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
                <p className="text-typography/60 text-sm">No pending task approvals.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-full overflow-hidden">
            <h3 className="font-black text-typography text-lg mb-2">Needs Approval</h3>
            <AnimatePresence>
                {requests.map((req) => (
                    <motion.div
                        key={req.notif.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0 }}
                        className="bg-dopamine-cyan/10 border border-dopamine-cyan/30 rounded-2xl p-4 flex flex-col gap-4 relative group"
                    >
                        <div className="pr-4">
                            <p className="text-typography text-sm font-bold">
                                <span className="text-dopamine-cyan">{req.childName}</span> requested to complete <span className="text-dopamine-yellow">{req.taskTitle}</span>
                            </p>
                            <p className="text-typography/70 text-xs mt-2 bg-black/20 p-2 rounded-lg italic">
                                &quot;{req.reason}&quot;
                            </p>
                        </div>
                        <div className="flex items-center gap-2 w-full">
                            <button
                                onClick={() => handleAction(req.notif.id, "reject", req.taskId, req.childId)}
                                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-typography/60 transition-colors border border-white/10"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleAction(req.notif.id, "approve", req.taskId, req.childId)}
                                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-dopamine-cyan text-background hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-dopamine-cyan/20"
                            >
                                Approve
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
