"use client";

import React from "react";
import { useGlobal } from "../../store/GlobalState";
import { GlassCard } from "../ui/GlassCard";
import { MascotAvatar } from "../ui/MascotAvatar";
import { TaskCreator } from "../parent/TaskCreator";
import { ChildProgressView } from "../parent/ChildProgressView";
import { RewardCreator } from "../parent/RewardCreator";
import { RewardManagement } from "../parent/RewardManagement";
import { NotificationBell } from "../parent/NotificationBell";
import { SettingsPanel } from "../parent/SettingsPanel";
import { TaskApproval } from "../parent/TaskApproval";
import { LedgerLogs } from "../parent/LedgerLogs";
import { ParentLayout } from "../ui/ParentLayout";
import { PresetManager } from "../parent/PresetManager";
import { PointAdjuster } from "../parent/PointAdjuster";
import { TaskList } from "../parent/TaskList";
import { DailyPlanner } from "../parent/DailyPlanner";
import { supabase } from "../../lib/supabase/client";

export function ParentDashboardView() {
    const { session, profile } = useGlobal();

    // Use session user ID as the parent identifier
    const parentId = session?.user?.id;

    const [activeTab, setActiveTab] = React.useState("dashboard");
    const [children, setChildren] = React.useState<{ id: string; display_name: string }[]>([]);
    const [selectedChildId, setSelectedChildId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!parentId) return;
        const fetchChildren = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("id, display_name")
                .eq("is_admin", false);

            if (data && data.length > 0) {
                setChildren(data as { id: string; display_name: string }[]);
                setSelectedChildId((prev: string | null) => prev || data[0].id);
            }
        };
        fetchChildren();
    }, [parentId]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (!parentId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-typography">
                <MascotAvatar state="focus" className="w-24 h-24 mb-4 opacity-50 grayscale" />
                <h2 className="text-xl font-bold">Session Error</h2>
                <p className="text-typography/70 mt-2">Could not resolve your session. Please sign in again.</p>
                <button onClick={handleLogout} className="mt-6 text-sm underline text-dopamine-cyan">Return to Login</button>
            </div>
        );
    }

    return (
        <ParentLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === "dashboard" && (
                <div key="dashboard-content" className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-20 mt-12 relative">
                    {/* Dashboard Header */}
                    <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl relative z-50">
                        <div className="flex items-center gap-4">
                            <MascotAvatar state="focus" className="w-16 h-16 shadow-lg rounded-full border-2 border-white/20 bg-background" priority />
                            <div>
                                <h1 className="text-2xl font-black text-typography tracking-tight">Parent HQ</h1>
                                <p className="text-sm font-medium text-typography/60">Commander: {profile?.display_name || "Parent"}</p>
                            </div>
                        </div>
                        {/* Real-time sync notifications */}
                        <div className="hidden sm:block">
                            <NotificationBell />
                        </div>
                    </header>

                    {/* Dashboard Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">

                        {/* LEFT: Management & Alerts */}
                        <div className="lg:col-span-4 flex flex-col gap-8">
                            <section>
                                <h2 className="text-[10px] font-black text-typography/50 uppercase tracking-[0.3em] mb-4 pl-1">
                                    Priority Alerts
                                </h2>
                                <TaskApproval />
                            </section>

                            <section>
                                <h2 className="text-[10px] font-black text-typography/50 uppercase tracking-[0.3em] mb-4 pl-1">
                                    Family Economy
                                </h2>
                                <ChildProgressView parentId={parentId} />
                            </section>
                        </div>

                        {/* CENTER: Operations */}
                        <div className="lg:col-span-5 flex flex-col gap-8">
                            <section>
                                <h2 className="text-[10px] font-black text-typography/50 uppercase tracking-[0.3em] mb-4 pl-1">
                                    Task Operations
                                </h2>
                                <div className="flex flex-col gap-8">
                                    <TaskCreator parentId={parentId} assignedTo={selectedChildId || ""} />
                                    <TaskList parentId={parentId} />
                                </div>
                            </section>
                        </div>

                        {/* RIGHT: Quick Tools & Stats */}
                        <div className="lg:col-span-3 flex flex-col gap-8">
                            <section>
                                <h2 className="text-[10px] font-black text-typography/50 uppercase tracking-[0.3em] mb-4 pl-1">
                                    Quick Tools
                                </h2>
                                <div className="flex flex-col gap-4">
                                    <PointAdjuster childrenData={children} />

                                    <GlassCard className="p-5 border-white/5 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                                        <h3 className="font-bold text-xs text-typography mb-1">Epic Streak</h3>
                                        <p className="text-[10px] text-typography/50">Bonus active for all children</p>
                                    </GlassCard>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "automation" && (
                <div className="w-full max-w-5xl mx-auto mt-12 pb-20">
                    <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                        <h1 className="text-2xl font-black text-typography tracking-tight">Task Automation</h1>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        <div className="flex flex-col gap-4">
                            <p className="text-typography/70 mb-2 text-sm">
                                Create task templates that automatically generate quests for your children.
                            </p>
                            <PresetManager parentId={parentId} />
                        </div>
                        <div className="flex flex-col gap-6">
                            <GlassCard className="p-6 border-white/5 bg-white/5">
                                <h3 className="text-sm font-bold text-typography mb-4">How it works</h3>
                                <ul className="text-xs text-typography/60 space-y-4">
                                    <li className="flex gap-2">🤖 <span>Presets automatically materialize into tasks when a child opens their dashboard.</span></li>
                                    <li className="flex gap-2">🔄 <span>Choose between Daily routines, specific Days of the week, or Date Ranges.</span></li>
                                    <li className="flex gap-2">⚡ <span>Combine with point adjustments for a complete family economy experience.</span></li>
                                </ul>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "logs" && (
                <div className="w-full max-w-5xl mx-auto mt-12 pb-20">
                    <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                        <h1 className="text-2xl font-black text-typography tracking-tight">Activity Logs</h1>
                        {children.length > 0 && (
                            <select
                                className="bg-white/10 text-typography px-4 py-2 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-dopamine-cyan/50"
                                value={selectedChildId || ""}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedChildId(e.target.value)}
                            >
                                {children.map((child: { id: string; display_name: string }) => (
                                    <option key={child.id} value={child.id} className="bg-background text-typography">
                                        {child.display_name}&apos;s Logs
                                    </option>
                                ))}
                            </select>
                        )}
                    </header>

                    {selectedChildId ? (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <LedgerLogs childId={selectedChildId} />
                        </div>
                    ) : (
                        <div className="text-center p-12 text-typography/60">
                            No children found to display logs for.
                        </div>
                    )}
                </div>
            )}

            {activeTab === "rewards" && (
                <div className="w-full max-w-5xl mx-auto mt-12 pb-20">
                    <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                        <h1 className="text-2xl font-black text-typography tracking-tight">Reward Management</h1>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-typography/70 mb-6 text-sm">
                                Create new rewards here. They will instantly appear in your child&apos;s Reward Shop.
                            </p>
                            <RewardCreator parentId={parentId} />
                        </div>
                        <div>
                            <p className="text-typography/70 mb-6 text-sm">
                                Manage existing rewards, update stock, lock items, or change prices.
                            </p>
                            <RewardManagement parentId={parentId} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "planner" && (
                <div className="w-full max-w-5xl mx-auto mt-12 pb-20">
                    <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-typography tracking-tight">Daily Planner</h1>
                            <p className="text-sm font-medium text-typography/60 mt-1">Design the perfect flow for your child&apos;s routine.</p>
                        </div>
                    </header>
                    <DailyPlanner parentId={parentId} />
                </div>
            )}

            {activeTab === "settings" && (
                <div className="w-full max-w-5xl mx-auto mt-12 pb-20">
                    <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                        <h1 className="text-2xl font-black text-typography tracking-tight">Family Settings</h1>
                    </header>
                    <SettingsPanel />
                </div>
            )}
        </ParentLayout>
    );
}
