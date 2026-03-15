"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { supabase } from "../../lib/supabase/client";
import { fetchPresets, togglePreset, createPreset, TaskPreset } from "../../lib/dal/presetMutations";
import { logger } from "../../lib/logger";

interface PresetManagerProps {
    parentId: string;
}

export function PresetManager({ parentId }: PresetManagerProps) {
    const [presets, setPresets] = useState<TaskPreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreator, setShowCreator] = useState(false);

    // Form state for new preset
    const [newPreset, setNewPreset] = useState<Partial<TaskPreset>>({
        title: "",
        emoji: "📋",
        point_value: 10,
        schedule_type: "daily",
        schedule_data: { selectedDays: [], startDate: "", endDate: "" },
        is_active: true,
        day_lock: false,
        time_limit_minutes: null,
        time_limit_bonus: 0,
        time_of_day: "morning",
        weekly_persistence: false
    });

    const loadPresets = useCallback(async () => {
        try {
            const data = await fetchPresets(parentId);
            setPresets(data);
        } catch (err) {
            logger.error("Failed to load presets", err);
        } finally {
            setIsLoading(false);
        }
    }, [parentId]);

    useEffect(() => {
        loadPresets();

        const channel = supabase
            .channel('preset_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'task_presets', filter: `parent_id=eq.${parentId}` },
                () => loadPresets()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadPresets, parentId]);

    const handleToggle = async (id: string, active: boolean) => {
        await togglePreset(id, active);
        setPresets(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
    };

    const handleCreate = async () => {
        if (!newPreset.title) return;
        try {
            const created = await createPreset({
                ...newPreset,
                parent_id: parentId
            });
            setPresets(prev => [created, ...prev]);
            setShowCreator(false);
            setNewPreset({
                title: "",
                emoji: "📋",
                point_value: 10,
                schedule_type: "daily",
                schedule_data: { selectedDays: [], startDate: "", endDate: "" },
                is_active: true,
                day_lock: false,
                time_limit_minutes: null,
                time_limit_bonus: 0,
                time_of_day: "morning",
                weekly_persistence: false
            });
        } catch (err) {
            logger.error("Failed to create preset", err);
        }
    };

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-typography flex items-center gap-2">
                    <span className="text-dopamine-cyan">🔄</span> Task Presets
                </h2>
                <button
                    onClick={() => setShowCreator(!showCreator)}
                    className="bg-dopamine-cyan/10 hover:bg-dopamine-cyan/20 text-dopamine-cyan text-xs font-bold px-4 py-2 rounded-xl transition-all border border-dopamine-cyan/20"
                >
                    {showCreator ? "Cancel" : "+ New Preset"}
                </button>
            </div>

            <AnimatePresence>
                {showCreator && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <GlassCard className="p-4 border-dopamine-cyan/30">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Preset Name (e.g. Morning Routine)"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-typography outline-none focus:border-dopamine-cyan/50 transition-colors"
                                        value={newPreset.title}
                                        onChange={e => setNewPreset({ ...newPreset, title: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        className="w-12 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-center text-xl outline-none"
                                        value={newPreset.emoji ?? "📋"}
                                        onChange={e => setNewPreset({ ...newPreset, emoji: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1">
                                        <span className="text-xs font-bold text-typography/50">Points:</span>
                                        <input
                                            type="number"
                                            className="w-12 bg-transparent text-typography font-black outline-none"
                                            value={(newPreset as any).point_value ?? 0}
                                            onChange={e => setNewPreset({ ...newPreset, point_value: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <select
                                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-typography outline-none"
                                        value={(newPreset as any).schedule_type ?? "daily"}
                                        onChange={e => setNewPreset({ ...newPreset, schedule_type: e.target.value as any })}
                                    >
                                        <option value="daily">Every Day</option>
                                        <option value="range">Date Range</option>
                                        <option value="days">Specific Days</option>
                                    </select>
                                    <select
                                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-typography outline-none"
                                        value={newPreset.time_of_day ?? "morning"}
                                        onChange={e => setNewPreset({ ...newPreset, time_of_day: e.target.value as any })}
                                    >
                                        <option value="morning">Morning</option>
                                        <option value="afternoon">Afternoon</option>
                                        <option value="night">Night</option>
                                    </select>
                                </div>

                                {/* Advanced Schedulers */}
                                {newPreset.schedule_type === 'days' && (
                                    <div className="flex flex-wrap gap-2 py-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                                            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                            const fullName = dayNames[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day)];
                                            const isSelected = newPreset.schedule_data?.selectedDays?.includes(fullName);
                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => {
                                                        const current = newPreset.schedule_data?.selectedDays || [];
                                                        const next = isSelected ? current.filter((d: string) => d !== fullName) : [...current, fullName];
                                                        setNewPreset({ ...newPreset, schedule_data: { ...newPreset.schedule_data, selectedDays: next } });
                                                    }}
                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${isSelected ? 'bg-dopamine-cyan border-dopamine-cyan text-slate-950' : 'bg-white/5 border-white/10 text-typography/40'}`}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {newPreset.schedule_type === 'range' && (
                                    <div className="flex gap-2 py-2">
                                        <input
                                            type="date"
                                            className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-[10px] text-typography"
                                            value={newPreset.schedule_data?.startDate || ""}
                                            onChange={e => setNewPreset({ ...newPreset, schedule_data: { ...newPreset.schedule_data, startDate: e.target.value } })}
                                        />
                                        <span className="text-typography/40 text-xs self-center">to</span>
                                        <input
                                            type="date"
                                            className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-[10px] text-typography"
                                            value={newPreset.schedule_data?.endDate || ""}
                                            onChange={e => setNewPreset({ ...newPreset, schedule_data: { ...newPreset.schedule_data, endDate: e.target.value } })}
                                        />
                                    </div>
                                )}

                                {/* Advanced Features: Lock & Time */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-typography/40 uppercase pl-1">Approval</span>
                                        <button
                                            onClick={() => setNewPreset({ ...newPreset, day_lock: !newPreset.day_lock })}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${newPreset.day_lock ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-gentle-green/10 border-gentle-green/30 text-gentle-green'}`}
                                        >
                                            <span className="text-xs">{newPreset.day_lock ? '🔒 Locked' : '🔓 Unlocked'}</span>
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-typography/40 uppercase pl-1">Weekly Persistence</span>
                                        <button
                                            onClick={() => setNewPreset({ ...newPreset, weekly_persistence: !newPreset.weekly_persistence })}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${newPreset.weekly_persistence ? 'bg-dopamine-cyan/10 border-dopamine-cyan/30 text-dopamine-cyan' : 'bg-white/5 border-white/10 text-typography/40'}`}
                                        >
                                            <span className="text-xs">{newPreset.weekly_persistence ? '✨ One for the Week' : '👤 Once/Day'}</span>
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-typography/40 uppercase pl-1">Limit (Mins)</span>
                                        <input
                                            type="number"
                                            placeholder="e.g. 30"
                                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-typography outline-none focus:border-dopamine-cyan/50"
                                            value={newPreset.time_limit_minutes || ""}
                                            onChange={e => setNewPreset({ ...newPreset, time_limit_minutes: parseInt(e.target.value) || null })}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-typography/40 uppercase pl-1">Bonus Pts</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-typography outline-none focus:border-dopamine-cyan/50"
                                            value={newPreset.time_limit_bonus || 0}
                                            onChange={e => setNewPreset({ ...newPreset, time_limit_bonus: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleCreate}
                                        className="bg-dopamine-cyan text-white text-xs font-bold px-8 py-3 rounded-xl shadow-lg shadow-dopamine-cyan/20 active:scale-95 transition-all"
                                    >
                                        Provision Template
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-3">
                {isLoading ? (
                    <div className="animate-pulse h-16 bg-white/5 rounded-2xl" />
                ) : presets.length === 0 ? (
                    <div className="text-center p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-typography/40 text-sm italic">
                        No presets yet. Create one to automate daily tasks! 🤖
                    </div>
                ) : (
                    presets.map(preset => (
                        <GlassCard key={preset.id} className="p-3 border-white/5 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{preset.emoji}</span>
                                <div>
                                    <h4 className="text-sm font-bold text-typography">{preset.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-dopamine-cyan/10 text-dopamine-cyan font-bold uppercase tracking-wider">
                                            {preset.schedule_type}
                                        </span>
                                        <span className="text-[10px] text-typography/40 font-bold">
                                            {preset.point_value} pts
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle(preset.id, !preset.is_active)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors relative ${preset.is_active ? 'bg-dopamine-cyan' : 'bg-white/10'}`}
                            >
                                <motion.div
                                    animate={{ x: preset.is_active ? 24 : 0 }}
                                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                            </button>
                        </GlassCard>
                    ))
                )}
            </div>
        </section>
    );
}
