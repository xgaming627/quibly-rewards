"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { MascotAvatar, MascotState } from "../ui/MascotAvatar";
import { DopamineButton } from "../ui/DopamineButton";
import { supabase } from "../../lib/supabase/client";
import { logger } from "../../lib/logger";

/**
 * SPA Login Authentication View.
 * Handles Supabase email/password sign-in and dictates the Mascot avatar state based on user interaction.
 * Exclusively uses component-level React state to manage localized form logic before dispatching
 * the session to the Global context.
 */
export function LoginView() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [mascotState, setMascotState] = useState<MascotState>("success");

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMascotState("review");
        setErrorMessage("");

        try {
            if (isSignUp) {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    // By default, let's assign the parent role on sign up so they can
                    // immediately access the dashboard to create children.
                    options: {
                        data: {
                            role: 'parent'
                        }
                    }
                });

                if (error) throw error;

                // If email confirmation is required by Supabase, session might be null
                if (!data.session) {
                    setStatus("success");
                    setErrorMessage("Check your email for the confirmation link!");
                    setMascotState("success");
                    return;
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    if (error.message.includes("Email not confirmed")) {
                        throw new Error("Please confirm your email address before signing in.");
                    }
                    throw error;
                }
            }

            // GlobalState listener implicitly handles successful sessions
            setMascotState("success");
        } catch (err: any) {
            logger.error("Authentication failed", err);
            setStatus("error");
            setErrorMessage(err.message || "Authentication failed.");
            setMascotState("focus");
        } finally {
            if (status !== "error" && status !== "success") setStatus("idle");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen p-6 relative z-10">
            <GlassCard
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.05, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full max-w-md flex flex-col items-center gap-6"
            >
                <MascotAvatar state={mascotState} className="w-32 h-32 mb-2" priority />

                <div className="text-center w-full">
                    <h1 className="text-2xl font-bold text-typography mb-2">
                        {isSignUp ? "Create Family Account" : "Welcome Back"}
                    </h1>
                    <p className="text-sm text-typography/70">
                        {isSignUp ? "Start managing chores like a pro" : "Sign in to Quibly Rewards"}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-xs font-semibold text-typography/80 uppercase tracking-widest pl-2">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setMascotState("focus");
                            }}
                            className="w-full bg-white/20 border border-white/30 rounded-2xl px-4 py-3 text-typography placeholder:text-typography/50 focus:outline-none focus:ring-2 focus:ring-dopamine-cyan/50 transition-all font-medium"
                            placeholder="parent@family.com"
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-xs font-semibold text-typography/80 uppercase tracking-widest pl-2">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setMascotState("focus");
                            }}
                            className="w-full bg-white/20 border border-white/30 rounded-2xl px-4 py-3 text-typography placeholder:text-typography/50 focus:outline-none focus:ring-2 focus:ring-dopamine-cyan/50 transition-all font-medium"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    {status === "error" && (
                        <div className="w-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm py-2 px-4 rounded-xl text-center font-medium">
                            {errorMessage}
                        </div>
                    )}

                    {status === "success" && (
                        <div className="w-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm py-2 px-4 rounded-xl text-center font-medium">
                            {errorMessage}
                        </div>
                    )}

                    <DopamineButton
                        variant={isSignUp ? "yellow" : "cyan"}
                        type="submit"
                        className="w-full mt-4"
                        disabled={status === "loading"}
                    >
                        {status === "loading" ? "Processing..." : (isSignUp ? "Create Account" : "Enter")}
                    </DopamineButton>

                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setErrorMessage("");
                            setStatus("idle");
                        }}
                        className="text-sm text-typography/60 hover:text-typography transition-colors mt-2"
                    >
                        {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                    </button>
                </form>
            </GlassCard>
        </div>
    );
}
