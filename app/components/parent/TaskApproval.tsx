"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase/client";
import { logger } from "../../lib/logger";
import { Database } from "../../types/database.types";
import { motion, AnimatePresence } from "framer-motion";
import { completeUnlockedTask } from "../../lib/dal/childMutations"; // using for actual completion

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function TaskApproval() {
    const [requests, setRequests] = useState<{ notif: Notification, taskId: string, childId: string, reason: string, taskTitle: string }[]>([]);
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
                    taskTitle: parts[4] || "Unknown Task"
                };
            });
            setRequests(parsed);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchRequests();
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
        <div className="space-y-4">
            <h3 className="font-black text-typography text-lg mb-2">Needs Approval</h3>
            <AnimatePresence>
                {requests.map((req) => (
                    <motion.div
                        key={req.notif.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0 }}
                        className="bg-dopamine-cyan/10 border border-dopamine-cyan/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                        <div>
                            <p className="text-typography text-sm font-bold truncate">Child #{req.childId.slice(0, 4)} completed a locked task</p>
                            <p className="text-typography/70 text-sm mt-1">Reason: <span className="italic">&quot;{req.reason}&quot;</span></p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => handleAction(req.notif.id, "reject", req.taskId, req.childId)}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-typography/60 transition-colors"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleAction(req.notif.id, "approve", req.taskId, req.childId)}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-dopamine-cyan text-background hover:scale-105 transition-transform"
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
