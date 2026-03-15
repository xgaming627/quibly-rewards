"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { GlassCard } from "../ui/GlassCard";
import { fetchRewards, purchaseReward, Reward } from "../../lib/dal/rewardMutations";
import { requestReward } from "../../lib/dal/childMutations";
import { useGlobal } from "../../store/GlobalState";
import { logger } from "../../lib/logger";
import { ConfettiBurst } from "./ConfettiBurst";

interface RewardShopProps {
    childId: string;
    currentPoints: number;
    onPurchaseSuccess: (cost: number) => void;
}

export function RewardShop({ childId, currentPoints, onPurchaseSuccess }: RewardShopProps) {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [purchaseState, setPurchaseState] = useState<"idle" | "loading" | "success">("idle");
    const [isCooldown, setIsCooldown] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [requestingId, setRequestingId] = useState<string | null>(null);
    const [requestReason, setRequestReason] = useState("");
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [justPurchased, setJustPurchased] = useState<Reward | null>(null);

    const { profile } = useGlobal();

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            const data = await fetchRewards();
            if (mounted) {
                setRewards(data);
                setIsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const initiatePurchase = (reward: Reward) => {
        if (currentPoints < reward.point_cost || isCooldown) return;
        setSelectedReward(reward);
        setErrorMsg(null);
        setPurchaseState("idle");
        document.body.style.overflow = "hidden";
    };

    const confirmPurchase = async () => {
        if (!selectedReward || purchaseState === "loading" || isCooldown) return;

        setPurchaseState("loading");

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            await purchaseReward(childId, selectedReward.id);
            setPurchaseState("success");
            onPurchaseSuccess(selectedReward.point_cost);
            setJustPurchased(selectedReward);
            setIsCooldown(true);

            setTimeout(() => {
                closeCheckout();
                setTimeout(() => {
                    setJustPurchased(null);
                    setIsCooldown(false);
                }, 4000); 
            }, 2500);

        } catch (err: any) {
            logger.error("Purchase failed", err);
            setErrorMsg(err.message || "Your payment could not be processed. Please try again.");
            setPurchaseState("idle");
        }
    };

    const closeCheckout = () => {
        if (purchaseState === "loading") return;
        setSelectedReward(null);
        setPurchaseState("idle");
        document.body.style.overflow = "auto";
    };

    const handleRequestSubmit = async (rewardId: string) => {
        if (!requestReason.trim() || isSubmittingRequest) return;
        setIsSubmittingRequest(true);
        try {
            await requestReward(rewardId, childId, requestReason.trim());
            setRequestingId(null);
            setRequestReason("");
        } catch (err) {
            logger.error("Failed to request reward", err);
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-64 bg-white/10 rounded-3xl" />)}
            </div>
        );
    }

    if (rewards.length === 0) {
        return (
            <GlassCard className="text-center p-12">
                <span className="text-4xl mb-4 block">🎁</span>
                <p className="text-typography/60 text-sm max-w-sm mx-auto">
                    The shop is currently empty! Check back later when your parents stock it up.
                </p>
            </GlassCard>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6 relative">
            <ConfettiBurst
                isActive={purchaseState === "success" || !!justPurchased}
                onComplete={() => { }}
            />

            {/* Post-Purchase Confirmation Toast */}
            <AnimatePresence>
                {justPurchased && !selectedReward && (
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.9 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[15000] bg-white/10 backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] rounded-full px-6 py-4 flex items-center gap-4"
                    >
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Successfully purchased!</p>
                            <p className="text-white/60 text-xs">{justPurchased.title} has been added to your rewards.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Liquid Glass Checkout Modal */}
            <AnimatePresence>
                {selectedReward && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[20000] flex items-center justify-center w-full h-screen overflow-hidden bg-slate-950/60 backdrop-blur-md"
                    >
                        {/* Animated Background Orbs */}
                        <motion.div 
                            animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px]"
                        />
                        <motion.div 
                            animate={{ rotate: -360, scale: [1, 1.5, 1] }} 
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/30 rounded-full mix-blend-screen filter blur-[100px]"
                        />

                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full h-full md:w-[85%] md:h-[85%] max-w-6xl rounded-t-[3rem] md:rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20 bg-white/10 backdrop-blur-2xl relative z-10"
                        >
                            {/* LEFT COLUMN: Summary */}
                            <div className="w-full md:w-[45%] lg:w-[40%] p-6 md:p-12 lg:p-16 flex flex-col border-b md:border-b-0 md:border-r border-white/10 bg-black/20">
                                <button 
                                    onClick={closeCheckout} 
                                    disabled={purchaseState === "loading"}
                                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12 self-start font-medium text-sm disabled:opacity-50"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                    Cancel Order
                                </button>

                                <div className="flex flex-col gap-6 mt-4">
                                    <p className="text-white/40 font-semibold text-sm uppercase tracking-wider">Quibly Store</p>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-4xl relative overflow-hidden shrink-0 shadow-lg backdrop-blur-md">
                                            {selectedReward.image_url ? (
                                                <Image
                                                    src={selectedReward.image_url}
                                                    alt={selectedReward.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : "🎁"}
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="text-white font-bold text-2xl leading-tight">{selectedReward.title}</h3>
                                            <p className="text-white/50 text-sm mt-1 line-clamp-2">{selectedReward.description || "Digital Reward Item"}</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                                        <span className="text-white/70 font-medium text-lg">Total due</span>
                                        <span className="text-white font-black text-4xl">{selectedReward.point_cost} <span className="text-xl text-white/50">pts</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Payment Interface */}
                            <div className="w-full md:w-[55%] lg:w-[60%] p-6 md:p-12 lg:p-24 flex flex-col justify-center relative bg-white/5">
                                
                                <h2 className="text-3xl font-bold text-white mb-8">Checkout</h2>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-white/70 block">Payment Method</label>
                                        <div className="p-4 rounded-2xl border border-white/20 bg-white/5 flex items-center gap-4 shadow-lg relative overflow-hidden backdrop-blur-md">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-[100px]" />
                                            <div className="w-12 h-8 bg-black/40 rounded flex items-center justify-center overflow-hidden shrink-0 shadow-inner border border-white/10">
                                                <div className="w-full h-1 bg-cyan-400 shadow-[0_0_10px_cyan]" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-bold text-sm">{profile?.display_name}&apos;s Quibly Balance</p>
                                                <p className="text-cyan-400 font-medium text-xs mt-0.5">Available: {currentPoints} pts</p>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-white/70 block">Receipt Email</label>
                                        <input 
                                            type="email" 
                                            disabled
                                            value="felipe@quibly.rewards"
                                            className="w-full p-4 rounded-2xl border border-white/10 bg-black/20 text-white/80 text-sm font-medium outline-none backdrop-blur-md"
                                        />
                                    </div>
                                </div>

                                {errorMsg && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-400 text-sm font-medium backdrop-blur-md"
                                    >
                                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {errorMsg}
                                    </motion.div>
                                )}

                                <div className="mt-10">
                                    <button
                                        disabled={purchaseState === "loading" || purchaseState === "success"}
                                        onClick={confirmPurchase}
                                        className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 relative shadow-lg overflow-hidden
                                            ${purchaseState === "loading"
                                                ? "bg-white/10 text-white/50 cursor-wait border border-white/10"
                                                : purchaseState === "success"
                                                    ? "bg-green-500/80 text-white border border-green-400"
                                                    : "bg-white/20 hover:bg-white/30 text-white border border-white/30 active:scale-[0.98] backdrop-blur-lg"
                                            }`}
                                    >
                                        {purchaseState === "loading" ? (
                                            <div className="flex items-center gap-3">
                                                <svg className="animate-spin h-5 w-5 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing Secure Payment...
                                            </div>
                                        ) : purchaseState === "success" ? (
                                            <motion.div 
                                                initial={{ scale: 0.5, opacity: 0 }} 
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex items-center gap-2"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                                Payment Successful
                                            </motion.div>
                                        ) : (
                                            `Pay ${selectedReward.point_cost} pts`
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RESTORED MAIN SHOP GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map(reward => {
                    const canAfford = currentPoints >= reward.point_cost;
                    const deficit = reward.point_cost - currentPoints;
                    const isProcessing = selectedReward?.id === reward.id;

                    return (
                        <motion.div
                            key={reward.id}
                            layout
                            whileHover={canAfford && !isProcessing ? { scale: 1.05, y: -4 } : {}}
                            whileTap={canAfford && !isProcessing ? { scale: 0.95 } : {}}
                            onClick={() => canAfford && !isProcessing && initiatePurchase(reward)}
                            className={`
                                relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300
                                ${canAfford ? 'bg-white/10 backdrop-blur-glass border border-white/20 shadow-xl' : 'bg-black/5 border border-black/10'}
                                ${isProcessing ? 'opacity-80 scale-95' : ''}
                            `}
                        >
                            {/* Grayscale filter for unaffordable items */}
                            {!canAfford && !isProcessing && (
                                <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                                    <span className="text-3xl mb-2 grayscale">🔒</span>
                                    <p className="text-sm font-bold text-typography/80 uppercase tracking-widest mb-4">
                                        Need {deficit} more pts
                                    </p>

                                    {requestingId === reward.id ? (
                                        <div className="w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                placeholder="Why do you deserve this?..."
                                                value={requestReason}
                                                onChange={(e) => setRequestReason(e.target.value)}
                                                className="w-full bg-white/10 text-typography px-4 py-2 rounded-xl text-xs placeholder:text-typography/40 border border-white/20 outline-none focus:border-dopamine-cyan/50"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setRequestingId(null)}
                                                    className="flex-1 py-2 rounded-xl text-xs font-bold text-typography/60 hover:bg-white/5"
                                                    disabled={isSubmittingRequest}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleRequestSubmit(reward.id)}
                                                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-dopamine-cyan text-background hover:scale-105 transition-transform"
                                                    disabled={isSubmittingRequest}
                                                >
                                                    {isSubmittingRequest ? "Sending..." : "Send Request"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRequestingId(reward.id);
                                            }}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-typography transition-colors absolute bottom-4"
                                        >
                                            Request Anyway
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Stock Badge */}
                            <div className="absolute top-4 right-4 z-20">
                                {reward.stock !== null ? (
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm border ${reward.stock > 0 ? 'bg-white/90 text-slate-900 border-white' : 'bg-red-500 text-white border-red-600'}`}>
                                        {reward.stock > 0 ? `${reward.stock} Left` : 'Sold Out'}
                                    </span>
                                ) : (
                                    <span className="bg-dopamine-cyan/80 text-white px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter border border-dopamine-cyan shadow-sm">
                                        Infinite
                                    </span>
                                )}
                            </div>

                            {/* Image Placeholder or Actual Image */}
                            <div className={`h-32 w-full flex items-center justify-center text-4xl relative overflow-hidden ${!canAfford ? 'grayscale opacity-60' : ''}`}>
                                {reward.image_url ? (
                                    <Image
                                        src={reward.image_url}
                                        alt={reward.title}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-dopamine-cyan/20 to-dopamine-yellow/20 flex items-center justify-center">
                                        🎁
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className={`p-5 flex flex-col gap-2 relative z-10 bg-white/5 ${!canAfford ? 'grayscale opacity-60' : ''}`}>
                                <h3 className="font-bold text-lg text-typography truncate">{reward.title}</h3>
                                {reward.description && (
                                    <p className="text-xs text-typography/70 line-clamp-2 min-h-[2rem]">
                                        {reward.description}
                                    </p>
                                )}

                                <div className="mt-4 flex items-center justify-between">
                                    <span className="bg-dopamine-cyan/15 text-dopamine-cyan font-black px-4 py-2 rounded-xl text-sm border border-dopamine-cyan/20 shadow-sm">
                                        {reward.point_cost} pts
                                    </span>

                                    {isCooldown && !isProcessing && (
                                        <span className="text-[10px] uppercase font-bold text-typography/40 tracking-widest">
                                            Cooling down...
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}