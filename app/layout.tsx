"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalStateProvider } from "./store/GlobalState";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/**
 * Root Layout for the SPA.
 * Next.js will only render this on the client because of the `use client` directive.
 * We wrap the entire application in the Error Boundary to prevent whitescreens,
 * and the GlobalStateProvider to distribute SPA state.
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <title>Quibly Rewards</title>
                <meta name="description" content="Neurodivergent-friendly reward platform" />
            </head>
            <body suppressHydrationWarning className={`${inter.variable} antialiased selection:bg-dopamine-cyan/30`}>
                <ErrorBoundary>
                    <GlobalStateProvider>
                        {children}
                    </GlobalStateProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
