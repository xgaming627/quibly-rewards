"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase/client";
import { logger } from "../../lib/logger";
import { Database } from "../../types/database.types";
import { motion } from "framer-motion";

type PointLedgerRow = Database["public"]["Tables"]["point_ledger"]["Row"];

interface LedgerLogsProps {
    childId: string;
}

export function LedgerLogs({ childId }: LedgerLogsProps) {
    const [logs, setLogs] = useState<PointLedgerRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from("point_ledger")
                .select("*")
                .eq("child_id", childId)
                .order("created_at", { ascending: false })
                .limit(50); // Fetch top 50 recent transactions

            if (error) {
                logger.error("Failed to fetch logs", error);
                return;
            }

            if (mounted && data) {
                setLogs(data);
                setIsLoading(false);
            }
        };

        fetchLogs();

        // Subscribe to real-time updates for this child
        const subscription = supabase
            .channel(`ledger-${childId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "point_ledger",
                    filter: `child_id=eq.${childId}`
                },
                (payload) => {
                    const newLog = payload.new as PointLedgerRow;
                    setLogs((prev) => [newLog, ...prev]);
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [childId]);

    if (isLoading) {
        return <div className="animate-pulse h-32 bg-black/5 rounded-3xl" />;
    }

    if (logs.length === 0) {
        return (
            <div className="text-center p-8 text-typography/60 text-sm">
                No logs found for this child yet.
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log) => {
                const isPositive = log.point_delta > 0;
                const isZero = log.point_delta === 0;

                return (
                    <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/40 flex items-center justify-between gap-4 shadow-sm"
                    >
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm truncate ${(log.transaction_type as string) === 'streak_break' ? 'text-red-500' :
                                (log.transaction_type as string) === 'reward_request' ? 'text-dopamine-yellow' :
                                    'text-typography'
                                }`}>
                                {log.notes || (log.transaction_type as any).replace('_', ' ')}
                            </h4>
                            <span className="text-xs text-typography/60 uppercase tracking-widest font-bold">
                                {new Date(log.created_at).toLocaleString([], {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>

                        <div className={`shrink-0 font-black text-lg ${isPositive ? "text-dopamine-yellow" :
                            (log.transaction_type as string) === 'streak_break' ? "text-red-500" :
                                isZero ? "text-typography/50" : "text-red-500"
                            }`}>
                            {isPositive ? "+" : ""}{log.point_delta}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
