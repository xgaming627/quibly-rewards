"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfettiBurst } from "./ConfettiBurst";
import { CountdownTimer } from "./CountdownTimer";
import { Database } from "../../types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

type TaskCardStatus = "ready" | "processing" | "completed" | "sent";

interface TaskCardProps {
    task: Task;
    onComplete: (task: Task) => Promise<void>;
    onRequestApproval: (task: Task, reason: string) => Promise<void>;
}

/**
 * TaskCard — Individual quest card component.
 * Renders a glassmorphic card with the task emoji, title, and point value.
 *
 * Interaction paths:
 * - Unlocked: Click → processing → confetti burst → "Done!" state
 * - Locked: Click → processing → "Sent to Parent ✨" slide-in
 *
 * Anti-double-click: `isProcessing` disables interaction immediately on click.
 * Anti-RSD: No red, no negative language, purely positive reinforcement.
 */
export function TaskCard({ task, onComplete, onRequestApproval }: TaskCardProps) {
    const [status, setStatus] = useState<TaskCardStatus | "asking_reason">("ready");
    const [showConfetti, setShowConfetti] = useState(false);
    const [reason, setReason] = useState("");

    const isLocked = task.state === "locked";

    const handleClick = async () => {
        if (status !== "ready") return;

        if (isLocked) {
            setStatus("asking_reason");
            return;
        }

        setStatus("processing");
        try {
            await onComplete(task);
            setShowConfetti(true);
            setStatus("completed");
        } catch {
            setStatus("ready");
        }
    };

    const submitReason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;

        setStatus("processing");
        try {
            await onRequestApproval(task, reason.trim());
            setStatus("sent");
        } catch {
            setStatus("asking_reason");
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={status === "ready" ? { scale: 1.03, y: -4 } : {}}
            whileTap={status === "ready" ? { scale: 0.97 } : {}}
            onClick={handleClick}
            className={`
                relative cursor-pointer select-none overflow-visible
                bg-white/10 backdrop-blur-glass border rounded-3xl p-5
                shadow-[0_8px_32px_rgba(0,0,0,0.08)]
                transition-colors duration-300
                ${status === "ready" ? "border-white/20 hover:border-dopamine-yellow/40" : ""}
                ${status === "completed" ? "border-dopamine-yellow/50 bg-dopamine-yellow/10" : ""}
                ${status === "sent" ? "border-dopamine-cyan/40 bg-dopamine-cyan/5" : ""}
                ${status === "processing" ? "border-white/30 opacity-80" : ""}
            `}
        >
            {/* Confetti overlay */}
            <ConfettiBurst
                isActive={showConfetti}
                onComplete={() => setShowConfetti(false)}
            />

            {/* Card Content */}
            <div className="flex items-center gap-4 relative z-10">
                {/* Emoji Badge */}
                <motion.div
                    animate={status === "completed" ? {
                        scale: [1, 1.3, 1],
                        rotate: [0, 10, -10, 0]
                    } : {}}
                    transition={{ duration: 0.5 }}
                    className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
                        ${isLocked ? "bg-dopamine-cyan/15 border border-dopamine-cyan/20" : "bg-dopamine-yellow/15 border border-dopamine-yellow/20"}
                    `}
                >
                    {task.emoji || "✨"}
                </motion.div>

                {/* Title & Meta */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-typography text-sm">
                        {task.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {isLocked && (
                            <span className="text-[10px] font-bold text-dopamine-cyan/80 uppercase tracking-widest">
                                🔒 Needs Approval
                            </span>
                        )}
                        {!isLocked && status === "ready" && (
                            <span className="text-[10px] font-bold text-dopamine-yellow/80 uppercase tracking-widest">
                                Tap to Complete
                            </span>
                        )}
                        {!isLocked && status === "ready" && task.time_limit_minutes && task.time_limit_bonus > 0 && (
                            <div className="w-full mt-0.5">
                                <CountdownTimer
                                    createdAt={task.created_at}
                                    recurrence={task.recurrence}
                                    timeLimitMinutes={task.time_limit_minutes}
                                    bonusPoints={task.time_limit_bonus}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Points Badge / Status Indicator */}
                <div className="flex-shrink-0">
                    {status === "ready" && (
                        <div className="flex flex-col items-end gap-1">
                            <motion.div
                                className={`
                                    bg-slate-900/90 px-3 py-1.5 rounded-xl border-2 shadow-lg flex items-center gap-1.5
                                    ${isLocked
                                        ? "border-dopamine-cyan/50 shadow-dopamine-cyan/10"
                                        : "border-dopamine-yellow/50 shadow-dopamine-yellow/10"
                                    }
                                `}
                            >
                                <span className={`text-base font-black ${isLocked ? "text-dopamine-cyan" : "text-dopamine-yellow"}`}>
                                    {task.point_value}
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isLocked ? "text-dopamine-cyan/70" : "text-dopamine-yellow/70"}`}>
                                    pts
                                </span>
                            </motion.div>
                        </div>
                    )}

                    {status === "processing" && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                            className="w-8 h-8 rounded-full border-2 border-dopamine-yellow/30 border-t-dopamine-yellow"
                        />
                    )}

                    {status === "completed" && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className="bg-dopamine-yellow/20 text-dopamine-yellow px-3 py-1.5 rounded-xl font-bold text-xs border border-dopamine-yellow/30"
                        >
                            ✅ Done!
                        </motion.div>
                    )}

                    {status === "sent" && (
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="bg-dopamine-cyan/20 text-dopamine-cyan px-3 py-1.5 rounded-xl font-bold text-xs border border-dopamine-cyan/30"
                        >
                            Sent ✨
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Reason Input expanding block */}
            <AnimatePresence>
                {status === "asking_reason" && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={submitReason} className="mt-4 flex gap-2">
                            <input
                                type="text"
                                placeholder="Why did you request this?"
                                value={reason}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                                className="flex-1 bg-black/20 text-white placeholder-white/50 text-sm px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-dopamine-cyan/50"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={!reason.trim()}
                                className="bg-dopamine-cyan/20 text-dopamine-cyan font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed border border-dopamine-cyan/30"
                            >
                                Send
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pulsing glow for completed state */}
            {status === "completed" && (
                <motion.div
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                        boxShadow: "0 0 30px rgba(255, 215, 87, 0.3)",
                    }}
                    animate={{
                        boxShadow: [
                            "0 0 15px rgba(255, 215, 87, 0.2)",
                            "0 0 30px rgba(255, 215, 87, 0.4)",
                            "0 0 15px rgba(255, 215, 87, 0.2)",
                        ],
                    }}
                    transition={{ repeat: 2, duration: 1.2 }}
                />
            )}
        </motion.div>
    );
}
