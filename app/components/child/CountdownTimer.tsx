"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database } from "../../types/database.types";

interface CountdownTimerProps {
    createdAt: string;
    recurrence: Database["public"]["Tables"]["tasks"]["Row"]["recurrence"];
    timeLimitMinutes: number;
    bonusPoints: number;
}

export function CountdownTimer({ createdAt, recurrence, timeLimitMinutes, bonusPoints }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        let startTimeMs = new Date(createdAt).getTime();

        // If it's a recurring task, the "countdown" starts at the beginning of the current cycle.
        const now = new Date();
        if (recurrence === "daily") {
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            if (startTimeMs < today.getTime()) {
                startTimeMs = today.getTime();
            }
        } else if (recurrence === "weekly") {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay()); // Sunday
            weekStart.setHours(0, 0, 0, 0);
            if (startTimeMs < weekStart.getTime()) {
                startTimeMs = weekStart.getTime();
            }
        }

        const limitMs = timeLimitMinutes * 60 * 1000;
        const expireTime = startTimeMs + limitMs;

        const updateTimer = () => {
            const currentTime = Date.now();
            const remaining = Math.max(0, expireTime - currentTime);
            setTimeLeft(remaining);

            if (remaining === 0) {
                setIsExpired(true);
            }
        };

        updateTimer();

        if (Date.now() >= expireTime) {
            setIsExpired(true);
            return;
        }

        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [createdAt, recurrence, timeLimitMinutes]);

    if (isExpired) return null;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    const timeString = `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-lg mt-1 w-fit"
        >
            <span className="text-[10px] font-black text-red-400 tracking-widest tabular-nums animate-pulse">
                ⏳ {timeString}
            </span>
            <span className="text-[9px] font-bold text-red-400/80 uppercase">
                for +{bonusPoints} pts
            </span>
        </motion.div>
    );
}
