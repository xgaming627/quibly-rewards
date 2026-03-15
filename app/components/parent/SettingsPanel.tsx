"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import { DopamineButton } from "../ui/DopamineButton";
import { getStreakMultiplier, setStreakMultiplier } from "../../lib/dal/settingsMutations";

export function SettingsPanel() {
    const [multiplier, setMultiplier] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            const val = await getStreakMultiplier();
            if (mounted) {
                setMultiplier(val);
                setIsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setStatus("idle");
        try {
            await setStreakMultiplier(multiplier);
            setStatus("success");
            setTimeout(() => setStatus("idle"), 3000);
        } catch (e) {
            setStatus("error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse h-32 bg-white/10 rounded-3xl" />
        );
    }

    return (
        <GlassCard className="w-full max-w-xl mx-auto border-white/20">
            <h2 className="text-xl font-black text-typography mb-4 flex items-center gap-2">
                <span className="text-dopamine-yellow">🔥</span> Streak Engine Settings
            </h2>

            <p className="text-sm text-typography/70 mb-6">
                Configure the bonus multiplier for daily streaks. The multiplier is the number of extra points awarded per chore for each day of the streak. For example, if the multiplier is 2, on a 5-day streak every completed chore grants +10 Bonus Points.
            </p>

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-2">Streak Bonus Multiplier (Pts/Day)</label>
                <div className="relative">
                    <input
                        type="number"
                        min={0}
                        value={multiplier}
                        onChange={(e) => setMultiplier(Number(e.target.value))}
                        className="w-full bg-black/20 text-dopamine-yellow font-black text-xl px-4 rounded-2xl py-3 border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-yellow/50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-typography/50 text-xs font-bold uppercase pointer-events-none">Pts</span>
                </div>
            </div>

            <div className="mt-8">
                {status === "success" && (
                    <div className="text-dopamine-cyan bg-dopamine-cyan/10 border border-dopamine-cyan/20 text-xs font-semibold px-4 py-2 rounded-xl text-center mb-4">
                        Settings saved successfully!
                    </div>
                )}
                {status === "error" && (
                    <div className="text-red-400 bg-red-400/10 border border-red-400/20 text-xs font-semibold px-4 py-2 rounded-xl text-center mb-4">
                        Failed to save settings.
                    </div>
                )}
                <DopamineButton
                    variant="yellow"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full"
                >
                    {isSaving ? "Saving..." : "Save Config"}
                </DopamineButton>
            </div>
        </GlassCard>
    );
}
