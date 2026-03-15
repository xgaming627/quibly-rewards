"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Image from "next/image";
import { DopamineButton } from "./ui/DopamineButton";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    isAuthError: boolean;
    error: Error | null;
}

/**
 * Specialized Auth Error Boundary.
 * Catches unauthorized access errors and renders a calming,
 * non-threatening fallback UI instead of a generic server error.
 * Designed to avoid triggering Rejection Sensitive Dysphoria (RSD).
 */
class AuthErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        isAuthError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        const isAuthError =
            error.message?.includes("unauthorized") ||
            error.message?.includes("Unauthorized") ||
            error.message?.includes("not authenticated") ||
            error.message?.includes("permission") ||
            error.message?.includes("403") ||
            error.message?.includes("401");

        return { hasError: true, isAuthError, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Silenced per requirements. Would pipe to external telemetry in production.
    }

    private handleReturn = () => {
        window.location.href = "/login";
    };

    private handleRetry = () => {
        this.setState({ hasError: false, isAuthError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.state.isAuthError) {
                return (
                    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
                        <div className="glass-panel max-w-lg w-full rounded-3xl p-8 flex flex-col items-center text-center">
                            <div className="relative w-40 h-40 mb-6">
                                <Image
                                    src="/mascots/mascot-investigating.png"
                                    alt="Investigating Mascot"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <h2 className="text-2xl font-bold mb-3 text-typography">
                                Access Restricted
                            </h2>
                            <p className="text-sm text-typography/70 mb-8 max-w-xs">
                                It looks like you don&apos;t have permission to view this page.
                                No worries — let&apos;s get you back on track!
                            </p>
                            <DopamineButton
                                variant="cyan"
                                onClick={this.handleReturn}
                                className="w-full max-w-xs"
                            >
                                Return to Login
                            </DopamineButton>
                        </div>
                    </div>
                );
            }

            // Generic error fallback (non-auth)
            return (
                <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
                    <div className="glass-panel max-w-lg w-full rounded-3xl p-8 flex flex-col items-center text-center">
                        <div className="relative w-40 h-40 mb-6">
                            <Image
                                src="/mascots/mascot-investigating.png"
                                alt="Investigating Mascot"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-typography opacity-90">
                            Oops! A Little Glitch
                        </h2>
                        <p className="text-sm text-typography/70 mb-8">
                            Don&apos;t worry, we&apos;re looking into it. Let&apos;s try gently resetting.
                        </p>
                        <DopamineButton
                            variant="yellow"
                            onClick={this.handleRetry}
                            className="w-full max-w-xs"
                        >
                            Try Again
                        </DopamineButton>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AuthErrorBoundary;
