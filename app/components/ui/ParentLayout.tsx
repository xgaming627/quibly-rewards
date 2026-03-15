"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DopamineButton } from "./DopamineButton";
import { MascotAvatar } from "./MascotAvatar";
import { supabase } from "../../lib/supabase/client";
import { useGlobal } from "../../store/GlobalState";
import { Home, Star, LogOut, Settings, ClipboardList, Zap, LayoutDashboard, CalendarDays, Workflow } from "lucide-react";

/**
 * Parent Layout Component (SPA Form).
 * Wraps the Parent Dashboard views with a glassmorphic sidebar.
 */
export function ParentLayout({ children, activeTab, onTabChange }: { children: React.ReactNode, activeTab: string, onTabChange: (tab: string) => void }) {
    const { profile } = useGlobal();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // GlobalState handles the session nullification naturally
    };

    const navItems = [
        { id: "dashboard", label: "HQ", icon: LayoutDashboard },
        { id: "planner", label: "Planner", icon: CalendarDays },
        { id: "rewards", label: "Rewards", icon: Star },
        { id: "automation", label: "Automation", icon: Workflow },
        { id: "logs", label: "Activity Logs", icon: ClipboardList },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="flex w-full min-h-screen relative overflow-hidden z-10 text-left">
            {/* Glassmorphic Sidebar */}
            <motion.aside
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 h-full w-[260px] z-50 p-4"
            >
                <div className="h-full bg-white/10 backdrop-blur-glass border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col p-5 gap-6">
                    {/* Profile Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                        <MascotAvatar state="success" className="w-10 h-10" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-typography truncate">
                                {profile?.display_name || "Parent"}
                            </p>
                            <p className="text-[10px] font-medium text-typography/50 uppercase tracking-widest">
                                Parent Mode
                            </p>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-2 flex-1">
                        {navItems.map((item) => {
                            const isActive = activeTab === item.id;
                            const Icon = item.icon;
                            return (
                                <button key={item.id} onClick={() => onTabChange(item.id)} className="w-full text-left">
                                    <motion.div
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isActive
                                            ? "bg-dopamine-cyan/20 border border-dopamine-cyan/30 text-dopamine-cyan shadow-[0_0_20px_rgba(0,186,240,0.15)]"
                                            : "text-typography/70 hover:bg-white/10 hover:text-typography"
                                            }`}
                                    >
                                        <Icon size={18} className={isActive ? "text-dopamine-cyan" : ""} />
                                        <span className="text-sm font-semibold">{item.label}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="nav-indicator"
                                                className="ml-auto w-1.5 h-1.5 rounded-full bg-dopamine-cyan"
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        )}
                                    </motion.div>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Sign Out */}
                    <div className="pt-4 border-t border-white/10">
                        <DopamineButton
                            variant="yellow"
                            size="sm"
                            onClick={handleLogout}
                            className="w-full justify-center gap-2 shadow-none border border-white/10"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </DopamineButton>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-[260px] p-8 relative z-10 w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                            filter: { type: "tween" }
                        }}
                        className="w-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
