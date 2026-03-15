"use client";

import { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { DopamineButton } from "../ui/DopamineButton";
import { createTask, CreateTaskPayload } from "../../lib/dal/parentMutations";
import { logger } from "../../lib/logger";

interface TaskCreatorProps {
    parentId: string;
    assignedTo: string;
    onTaskCreated?: () => void;
}

/**
 * TaskCreator — Glassmorphic form for provisioning new tasks.
 * @param parentId - The authenticated parent's user ID, used as created_by.
 */
export function TaskCreator({ parentId, assignedTo, onTaskCreated }: TaskCreatorProps) {
    const [title, setTitle] = useState("");
    const [emoji, setEmoji] = useState("✨");
    const [pointValue, setPointValue] = useState<number>(10);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | "">("");
    const [timeLimitBonus, setTimeLimitBonus] = useState<number>(0);
    const [recurrence, setRecurrence] = useState<CreateTaskPayload["recurrence"]>("daily");
    const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "night">("morning");
    const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isLocked, setIsLocked] = useState(false);

    const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !emoji.trim() || pointValue <= 0) {
            setErrorMsg("Please fill out all fields with valid data.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setErrorMsg("");

        try {
            await createTask({
                created_by: parentId,
                assigned_to: assignedTo || null,
                title,
                emoji,
                point_value: pointValue,
                time_limit_minutes: timeLimitMinutes === "" ? null : Number(timeLimitMinutes),
                time_limit_bonus: timeLimitBonus,
                recurrence: recurrence,
                time_of_day: timeOfDay,
                due_date: `${dueDate}T23:59:59`,
                state: isLocked ? "locked" : "unlocked"
            });

            setStatus("success");

            // Reset form
            setTitle("");
            setEmoji("✨");
            setPointValue(10);
            setTimeLimitMinutes("");
            setTimeLimitBonus(0);
            setRecurrence("daily");
            setIsLocked(false);

            if (onTaskCreated) onTaskCreated();

            setTimeout(() => setStatus("idle"), 3000);

        } catch (err: any) {
            logger.error("Failed to submit task via form", err);
            setErrorMsg(err.message || "Failed to create task.");
            setStatus("error");
        }
    };

    return (
        <GlassCard className="w-full flex justify-center border-dopamine-cyan/40">
            <form onSubmit={handleSubmit} className="w-full flex justify-center flex-col gap-5">
                <div className="flex justify-center items-center justify-between border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-typography drop-shadow-sm flex items-center gap-2">
                        <span className="text-dopamine-cyan">★</span>
                        Create New Task
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                    {/* Emoji Select */}
                    <div className="flex flex-col gap-1 w-full md:col-span-1">
                        <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Icon</label>
                        <input
                            type="text"
                            maxLength={2}
                            value={emoji}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmoji(e.target.value)}
                            className="bg-black/20 text-3xl text-center rounded-2xl py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-cyan/50"
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full md:col-span-3">
                        <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Task Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                            placeholder="Clean your room"
                            className="w-full bg-black/20 text-typography px-4 rounded-2xl py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-cyan/50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Point Reward</label>
                        <div className="relative">
                            <input
                                type="number"
                                min={1}
                                max={1000}
                                value={pointValue}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPointValue(Number(e.target.value))}
                                className="w-full bg-black/20 text-dopamine-yellow font-black text-xl px-4 rounded-2xl py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-yellow/50"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-typography/50 text-xs font-bold uppercase pointer-events-none">Pts</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full h-full justify-between items-center bg-black/20 rounded-2xl p-3 border border-white/20">
                        <label className="text-[10px] w-full text-center font-bold text-typography/70 uppercase tracking-widest">Time of Day</label>
                        <select
                            value={timeOfDay}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeOfDay(e.target.value as "morning" | "afternoon" | "night")}
                            className="w-full bg-transparent text-center font-semibold text-sm appearance-none cursor-pointer focus:outline-none"
                        >
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="night">Night</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 w-full h-full justify-between items-center bg-black/20 rounded-2xl p-3 border border-white/20">
                        <label className="text-[10px] w-full text-center font-bold text-typography/70 uppercase tracking-widest">Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full bg-transparent text-center font-semibold text-sm cursor-pointer focus:outline-none [color-scheme:dark]"
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full h-full justify-between items-center bg-black/20 rounded-2xl p-3 border border-white/20">
                        <label className="text-[10px] w-full text-center font-bold text-typography/70 uppercase tracking-widest">Recurrence</label>
                        <select
                            value={recurrence}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRecurrence(e.target.value as CreateTaskPayload["recurrence"])}
                            className="w-full bg-transparent text-center font-semibold text-sm appearance-none cursor-pointer focus:outline-none"
                        >
                            <option value="all_time">One Time</option>
                            <option value="daily">Daily Reset</option>
                            <option value="weekly">Weekly Reset</option>
                        </select>
                    </div>

                    <div
                        className={`flex w-full h-full flex-col justify-center items-center rounded-2xl p-3 border cursor-pointer transition-colors ${isLocked ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}
                        onClick={() => setIsLocked(!isLocked)}
                    >
                        <span className="text-2xl mb-1">{isLocked ? "🔒" : "🔓"}</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest">{isLocked ? "Locked" : "Unlocked"}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Time Limit (Mins)</label>
                        <input
                            type="number"
                            min={1}
                            placeholder="Optional... e.g 30"
                            value={timeLimitMinutes}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeLimitMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full bg-black/20 text-typography px-4 rounded-2xl py-3 border border-white/20 focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Bonus Points</label>
                        <div className="relative">
                            <input
                                type="number"
                                min={0}
                                disabled={timeLimitMinutes === ""}
                                value={timeLimitBonus}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeLimitBonus(Number(e.target.value))}
                                className={`w-full bg-black/20 font-black px-4 rounded-2xl py-3 border border-white/20 focus:outline-none ${timeLimitMinutes === "" ? 'opacity-50 text-typography/50' : 'text-dopamine-cyan'}`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-typography/50 text-xs font-bold uppercase pointer-events-none">Pts</span>
                        </div>
                    </div>
                </div>

                {status === "error" && (
                    <div className="text-red-400 bg-red-400/10 border border-red-400/20 text-xs font-semibold px-4 py-2 rounded-xl text-center">
                        {errorMsg}
                    </div>
                )}

                {status === "success" && (
                    <div className="text-dopamine-cyan bg-dopamine-cyan/10 border border-dopamine-cyan/20 text-xs font-semibold px-4 py-2 rounded-xl text-center">
                        Task Provisioned Successfully!
                    </div>
                )}

                <DopamineButton
                    variant="cyan"
                    type="submit"
                    className="w-full mt-2"
                    disabled={status === "loading"}
                >
                    {status === "loading" ? "Deploying..." : "Provision Task"}
                </DopamineButton>
            </form>
        </GlassCard>
    );
}
