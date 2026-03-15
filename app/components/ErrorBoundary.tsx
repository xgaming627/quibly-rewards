"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Image from "next/image";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global SPA Error Boundary.
 * Catches all child component react rendering errors and prevents application whitescreen.
 * Uses the review mascot (mascot-investigating.png) to provide a non-threatening fallback.
 */
class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Explicitly silencing console logs per requirements.
        // In a production environment, this would pipe directly to an external telemetry service.
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
                    <div className="glass-panel max-w-lg w-full rounded-3xl p-8 flex flex-col items-center text-center">
                        <div className="relative w-48 h-48 mb-6">
                            <Image
                                src="/mascots/mascot-investigating.png"
                                alt="Investigating Mascot"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h2 className="text-2xl font-bold mb-4 text-typography opacity-90">
                            Oops! A Little Glitch
                        </h2>
                        <p className="text-lg opacity-75 mb-8 text-typography">
                            Don&apos;t worry, we&apos;re looking into it. Let&apos;s try gently resetting the page.
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="bg-dopamine-cyan/20 hover:bg-dopamine-cyan/30 text-typography px-6 py-3 rounded-full font-semibold transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
