"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { type Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";
import { logger } from "../lib/logger";
import { fetchProfile } from "../lib/dal/profiles";
import { Database } from "../types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type ActiveView =
    | "auth"
    | "dashboard_parent"
    | "dashboard_child"
    | "reward_shop"
    | "task_review";

interface GlobalStateContextType {
    session: Session | null;
    profile: Profile | null;
    activeView: ActiveView;
    setSession: (session: Session | null) => void;
    setProfile: (profile: Profile | null) => void;
    setActiveView: (view: ActiveView) => void;
    isLoading: boolean;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

/**
 * Global application state provider.
 * Manages the current authenticated session, the localized user profile,
 * and the SPA view routing state.
 *
 * Routing logic:
 * - is_admin = true  → dashboard_parent
 * - is_admin = false → dashboard_child
 * - Fallback: user_metadata.role from signup
 */
export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activeView, setActiveView] = useState<ActiveView>("auth");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const hydrateSession = async (currentSession: Session | null) => {
            if (!currentSession) {
                if (mounted) {
                    setSession(null);
                    setProfile(null);
                    setActiveView("auth");
                    setIsLoading(false);
                }
                return;
            }

            if (mounted) setSession(currentSession);

            const userProfile = await fetchProfile(currentSession.user.id);
            if (mounted) {
                setProfile(userProfile);

                // Determine admin status: prefer DB truth, fall back to signup metadata
                const isAdmin = userProfile?.is_admin ??
                    (currentSession.user.user_metadata?.role === "parent");

                if (isAdmin) {
                    setActiveView("dashboard_parent");
                } else {
                    setActiveView("dashboard_child");
                }
                setIsLoading(false);
            }
        };

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                logger.error("Error confirming initial session", error);
            }
            hydrateSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                hydrateSession(session);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        session,
        profile,
        activeView,
        setSession,
        setProfile,
        setActiveView,
        isLoading
    };

    return (
        <GlobalStateContext.Provider value={value}>
            {children}
        </GlobalStateContext.Provider>
    );
}

export function useGlobal() {
    const context = useContext(GlobalStateContext);
    if (context === undefined) {
        throw new Error("useGlobal must be used within a GlobalStateProvider");
    }
    return context;
}
