"use client";

import React, { useEffect, useState, useCallback } from "react";
import { GlassCard } from "../ui/GlassCard";
import { DopamineButton } from "../ui/DopamineButton";
import { supabase } from "../../lib/supabase/client";
import { fetchAllParentRewards, deleteReward, updateReward, Reward } from "../../lib/dal/parentRewardMutations";

interface RewardManagementProps {
    parentId: string;
}

export function RewardManagement({ parentId }: RewardManagementProps) {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Reward>>({});

    const loadRewards = useCallback(async () => {
        setLoading(true);
        const data = await fetchAllParentRewards(parentId);
        setRewards(data);
        setLoading(false);
    }, [parentId]);

    useEffect(() => {
        loadRewards();

        const channel = supabase
            .channel('parent_reward_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rewards' },
                () => loadRewards()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [parentId, loadRewards]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this reward forever?")) return;
        await deleteReward(id);
        setRewards(prev => prev.filter(r => r.id !== id));
    };

    const handleToggleActive = async (reward: Reward) => {
        const newStatus = !reward.is_active;
        await updateReward(reward.id, { is_active: newStatus });
        setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, is_active: newStatus } : r));
    };

    const handleStartEdit = (reward: Reward) => {
        setEditingId(reward.id);
        setEditForm({
            title: reward.title,
            description: reward.description,
            image_url: reward.image_url,
            point_cost: reward.point_cost,
            stock: reward.stock
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSaveEdit = async (id: string) => {
        await updateReward(id, editForm);
        setRewards(prev => prev.map(r => r.id === id ? { ...r, ...editForm } : r));
        setEditingId(null);
        setEditForm({});
    };

    if (loading) {
        return <div className="animate-pulse h-32 bg-white/10 rounded-3xl w-full" />;
    }

    if (rewards.length === 0) {
        return (
            <GlassCard className="text-center p-8 w-full border-white/20">
                <p className="text-typography/60 text-sm">No rewards created yet. Add some on the left!</p>
            </GlassCard>
        );
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            {rewards.map(reward => {
                const isEditing = editingId === reward.id;

                return (
                    <GlassCard key={reward.id} className={`flex flex-col gap-4 p-5 transition-opacity ${!reward.is_active && !isEditing && 'opacity-60 grayscale-[50%]'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1 mr-4">
                                {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="text"
                                            value={editForm.title || ""}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full bg-black/20 text-typography font-bold text-lg px-3 rounded-xl py-2 border border-dopamine-cyan/30 focus:outline-none focus:border-dopamine-cyan/50"
                                            placeholder="Reward Title"
                                        />
                                        <textarea
                                            value={editForm.description || ""}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full bg-black/20 text-typography/80 text-xs px-3 rounded-xl py-2 border border-white/10 focus:outline-none focus:border-dopamine-cyan/30 min-h-[60px]"
                                            placeholder="Reward Description"
                                        />
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-1">Image URL</label>
                                            <input
                                                type="text"
                                                value={editForm.image_url || ""}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, image_url: e.target.value }))}
                                                className="w-full bg-black/20 text-typography text-xs px-3 rounded-xl py-2 border border-white/10 focus:outline-none focus:border-dopamine-cyan/30"
                                                placeholder="https://example.com/image.png"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            {reward.image_url && (
                                                <img 
                                                    src={reward.image_url} 
                                                    alt={reward.title} 
                                                    className="w-12 h-12 rounded-xl object-cover border border-white/10"
                                                />
                                            )}
                                            <div>
                                                <h3 className="font-bold text-typography text-lg">{reward.title}</h3>
                                                {reward.description && <p className="text-typography/60 text-xs mt-1">{reward.description}</p>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                                <div className="flex gap-2">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => handleSaveEdit(reward.id)}
                                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gentle-green/20 border border-gentle-green/30 text-gentle-green hover:bg-gentle-green/30 transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-typography/60 hover:bg-white/10 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleStartEdit(reward)}
                                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-dopamine-cyan/10 border border-dopamine-cyan/20 text-dopamine-cyan hover:bg-dopamine-cyan/20 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(reward)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-colors ${reward.is_active ? 'bg-gentle-green/10 border-gentle-green/20 text-gentle-green hover:bg-gentle-green/20' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}
                                            >
                                                {reward.is_active ? "Active" : "Locked"}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(reward.id)}
                                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                            >
                                                Del
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-1">Point Cost</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={isEditing ? (editForm.point_cost ?? "") : reward.point_cost}
                                    onChange={(e) => isEditing && setEditForm(prev => ({ ...prev, point_cost: Number(e.target.value) }))}
                                    disabled={!isEditing}
                                    className={`w-full bg-black/20 text-dopamine-yellow font-black text-sm px-3 rounded-xl py-2 border focus:outline-none transition-colors ${isEditing ? 'border-dopamine-yellow/30' : 'border-white/10 opacity-80'}`}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-typography/70 uppercase tracking-widest pl-1">Stock (Empty = ∞)</label>
                                <input
                                    type="number"
                                    min={0}
                                    placeholder="Infinite"
                                    value={isEditing ? (editForm.stock ?? "") : (reward.stock ?? "")}
                                    onChange={(e) => isEditing && setEditForm(prev => ({ ...prev, stock: e.target.value === "" ? null : Number(e.target.value) }))}
                                    disabled={!isEditing}
                                    className={`w-full bg-black/20 text-dopamine-cyan font-black text-sm px-3 rounded-xl py-2 border focus:outline-none transition-colors ${isEditing ? 'border-dopamine-cyan/30' : 'border-white/10 opacity-80'}`}
                                />
                            </div>
                        </div>
                    </GlassCard>
                );
            })}
        </div>
    );
}
