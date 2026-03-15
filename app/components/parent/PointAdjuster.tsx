"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { adjustPoints } from "../../lib/dal/rewardMutations"; // I'll check if this exists or create it
import { logger } from "../../lib/logger";

interface PointAdjusterProps {
    childrenData: { id: string; display_name: string }[];
}

export function PointAdjuster({ childrenData }: PointAdjusterProps) {
    const [selectedChild, setSelectedChild] = useState("");
    const [amount, setAmount] = useState(10);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    // Auto-select first child when list loads
    React.useEffect(() => {
        if (childrenData.length > 0 && !selectedChild) {
            setSelectedChild(childrenData[0].id);
        }
    }, [childrenData, selectedChild]);

    const handleAdjust = async (type: "give" | "take") => {
        if (!selectedChild || amount <= 0 || isSubmitting) return;

        setIsSubmitting(true);
        setStatus("idle");

        try {
            logger.info(`Adjusting points for ${selectedChild}: ${type} ${amount}`);
            const delta = type === "give" ? amount : -amount;
            await adjustPoints(selectedChild, delta, reason || `Manual adjustment by parent`);

            setStatus("success");
            setReason("");
            setTimeout(() => setStatus("idle"), 3000);
        } catch (err) {
            logger.error("Failed to adjust points", err);
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <GlassCard className="p-5 border-white/5 hover:border-white/20 transition-all">
            <h3 className="font-bold text-xs text-typography mb-4 flex items-center gap-2">
                <span className="text-dopamine-yellow">⚖️</span> Quick Adjust
            </h3>

            <div className="flex flex-col gap-3">
                <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-typography outline-none focus:border-dopamine-yellow/50"
                    value={selectedChild}
                    onChange={e => setSelectedChild(e.target.value)}
                >
                    {childrenData.map(c => (
                        <option key={c.id} value={c.id} className="bg-slate-900">{c.display_name}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center">
                        <span className="text-xs font-bold text-typography/30 mr-2">PTS</span>
                        <input
                            type="number"
                            className="bg-transparent text-sm font-black text-typography outline-none w-full"
                            value={amount}
                            onChange={e => setAmount(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>

                <input
                    type="text"
                    placeholder="Reason (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-typography outline-none"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                        onClick={() => handleAdjust("give")}
                        disabled={isSubmitting}
                        className="py-2.5 rounded-xl bg-gentle-green/20 hover:bg-gentle-green/30 text-gentle-green text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? "..." : "Add"}
                    </button>
                    <button
                        onClick={() => handleAdjust("take")}
                        disabled={isSubmitting}
                        className="py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? "..." : "Deduct"}
                    </button>
                </div>

                {status === "success" && (
                    <motion.p
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[10px] text-gentle-green font-bold text-center mt-2"
                    >
                        Points adjusted! Child notified. ✨
                    </motion.p>
                )}
            </div>
        </GlassCard>
    );
}
