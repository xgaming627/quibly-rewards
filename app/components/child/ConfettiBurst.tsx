"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiBurstProps {
    /** Controls visibility of the burst */
    isActive: boolean;
    /** Called when all particles finish animating */
    onComplete?: () => void;
}

/**
 * ConfettiBurst — Pure Framer Motion celebratory particle system.
 * Spawns ~16 circles that burst outward from center using the dopamine
 * color palette (#FFD757 yellow, #00BAF0 cyan).
 *
 * Zero external dependencies. Auto-removes after animation.
 * Designed to deliver an instantaneous visual reward (the "dopamine hit").
 */
export function ConfettiBurst({ isActive, onComplete }: ConfettiBurstProps) {
    const particles = React.useMemo(() => {
        const colors = ["#F59E0B", "#00BAF0", "#F59E0B", "#00BAF0", "#A3F0AF", "#F59E0B"];
        return Array.from({ length: 16 }, (_, i) => ({
            id: i,
            color: colors[i % colors.length],
            angle: (i / 16) * 360,
            distance: 60 + Math.random() * 50,
            size: 6 + Math.random() * 6,
            delay: Math.random() * 0.1,
        }));
    }, []);

    // Auto-dismiss after animation duration to prevent memory consumption
    React.useEffect(() => {
        if (isActive && onComplete) {
            const timer = setTimeout(() => {
                onComplete();
            }, 1000); // Animation duration is approx 0.8s
            return () => clearTimeout(timer);
        }
    }, [isActive, onComplete]);

    return (
        <AnimatePresence>
            {isActive && (
                <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-visible">
                    {particles.map((p) => {
                        const radians = (p.angle * Math.PI) / 180;
                        const x = Math.cos(radians) * p.distance;
                        const y = Math.sin(radians) * p.distance;

                        return (
                            <motion.div
                                key={p.id}
                                className="absolute rounded-full"
                                style={{
                                    width: p.size,
                                    height: p.size,
                                    backgroundColor: p.color,
                                } as any}
                                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                animate={{
                                    x,
                                    y,
                                    scale: [0, 1.5, 0.8],
                                    opacity: [1, 1, 0],
                                }}
                                transition={{
                                    duration: 0.7,
                                    delay: p.delay,
                                    ease: "easeOut",
                                }}
                            />
                        );
                    })}

                    {/* Central glow pulse */}
                    <motion.div
                        className="absolute w-20 h-20 rounded-full"
                        style={{
                            background: "radial-gradient(circle, rgba(244,158,11,0.5) 0%, transparent 70%)",
                        } as any}
                        initial={{ scale: 0, opacity: 0.8 }}
                        animate={{ scale: [0, 2.5], opacity: [0.8, 0] }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                </div>
            )}
        </AnimatePresence>
    );
}
