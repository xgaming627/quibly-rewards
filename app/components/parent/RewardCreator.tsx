"use client";

import { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { DopamineButton } from "../ui/DopamineButton";
import { createReward } from "../../lib/dal/rewardMutations";
import { logger } from "../../lib/logger";

interface RewardCreatorProps {
    parentId: string;
    onRewardCreated?: () => void;
}

/**
 * RewardCreator — Glassmorphic form for adding new rewards to the shop.
 * @param parentId - The authenticated parent's user ID, used as created_by.
 */
export function RewardCreator({ parentId, onRewardCreated }: RewardCreatorProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [pointCost, setPointCost] = useState<number>(50);

    const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || pointCost <= 0) {
            setErrorMsg("Please provide a title and a valid point cost.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setErrorMsg("");

        try {
            await createReward({
                created_by: parentId,
                title,
                description: description || null,
                image_url: imageUrl || null,
                point_cost: pointCost,
            });

            setStatus("success");

            // Reset form
            setTitle("");
            setDescription("");
            setImageUrl("");
            setPointCost(50);

            if (onRewardCreated) onRewardCreated();
            setTimeout(() => setStatus("idle"), 3000);

        } catch (err: any) {
            logger.error("Failed to submit reward via form", err);
            setErrorMsg(err.message || "Failed to create reward.");
            setStatus("error");
        }
    };

    return (
        <GlassCard className="w-full flex justify-center border-dopamine-yellow/40">
            <form onSubmit={handleSubmit} className="w-full flex justify-center flex-col gap-5">
                <div className="flex justify-center items-center justify-between border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-typography drop-shadow-sm flex items-center gap-2">
                        <span className="text-dopamine-yellow">🎁</span>
                        Stock the Shop
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Reward Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Extra Screen Time"
                            className="w-full bg-black/20 text-typography px-4 rounded-2xl py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-yellow/50"
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Cost (Points)</label>
                        <input
                            type="number"
                            min={1}
                            value={pointCost}
                            onChange={(e) => setPointCost(Number(e.target.value))}
                            className="w-full bg-black/20 text-dopamine-yellow font-black text-xl px-4 rounded-2xl py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-yellow/50"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1 w-full">
                    <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Image URL (Optional)</label>
                    <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.png"
                        className="w-full bg-black/20 text-typography text-sm px-4 rounded-2xl py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-yellow/50"
                    />
                </div>

                <div className="flex flex-col gap-1 w-full">
                    <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Description (Optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="30 extra minutes on the iPad"
                        className="w-full bg-black/20 text-typography px-4 rounded-2xl py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-yellow/50 resize-none h-20"
                    />
                </div>

                {status === "error" && (
                    <div className="text-red-400 bg-red-400/10 border border-red-400/20 text-xs font-semibold px-4 py-2 rounded-xl text-center">
                        {errorMsg}
                    </div>
                )}

                {status === "success" && (
                    <div className="text-dopamine-yellow bg-dopamine-yellow/10 border border-dopamine-yellow/20 text-xs font-semibold px-4 py-2 rounded-xl text-center">
                        Reward Stocked Successfully!
                    </div>
                )}

                <DopamineButton
                    variant="yellow"
                    type="submit"
                    className="w-full mt-2"
                    disabled={status === "loading"}
                >
                    {status === "loading" ? "Stocking..." : "Add to Shop"}
                </DopamineButton>
            </form>
        </GlassCard>
    );
}
