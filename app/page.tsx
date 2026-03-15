"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGlobal } from "./store/GlobalState";
import { LoginView } from "./components/views/LoginView";
import { MascotAvatar } from "./components/ui/MascotAvatar";
import { ParentDashboardView } from "./components/views/ParentDashboardView";
import { ChildDashboardView } from "./components/views/ChildDashboardView";

export default function Home() {
    const { activeView, isLoading } = useGlobal();

    // Standard view transition configuration for a liquid, premium feel
    const viewVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, filter: "blur(4px)" },
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
            filter: { type: "tween" }
        }
    };

    if (isLoading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background">
                <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <MascotAvatar state="focus" className="w-24 h-24 grayscale opacity-50" />
                </motion.div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background">
            {/* Decorative background glows */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-dopamine-cyan/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-dopamine-yellow/10 rounded-full blur-[120px] pointer-events-none" />

            <AnimatePresence mode="wait">
                {activeView === "auth" && (
                    <motion.div key="auth" className="w-full flex justify-center w-full" {...viewVariants}>
                        <LoginView />
                    </motion.div>
                )}

                {activeView === "dashboard_parent" && (
                    <motion.div key="dashboard_parent" className="w-full flex justify-center w-full" {...viewVariants}>
                        <ParentDashboardView />
                    </motion.div>
                )}

                {activeView === "dashboard_child" && (
                    <motion.div key="dashboard_child" className="w-full flex justify-center w-full" {...viewVariants}>
                        <ChildDashboardView />
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
