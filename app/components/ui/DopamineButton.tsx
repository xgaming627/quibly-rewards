"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";

interface DopamineButtonProps extends HTMLMotionProps<"button"> {
    /** 
     * The explicit color restriction mapping per the constitution.
     * 'cyan': #00BAF0
     * 'yellow': #FFD757
     */
    variant?: "cyan" | "yellow";
    /** Optional size variant, defaults to 'md' */
    size?: "sm" | "md" | "lg";
    /** Children elements inside the button */
    children: React.ReactNode;
    /** Custom class overrides if necessary */
    className?: string;
}

/**
 * High-Impact Dopamine Action Button.
 * Used exclusively for completing chores, buying rewards, and resolving positive actions.
 * 
 * Physics logic:
 * - Introduces small spring-based scale on hover
 * - Drops down to exactly scale: 0.95 on tap (per Antigravity instructions)
 * - Returns with a satisfying spring release to avoid harsh digital 'snapping'
 * 
 * CSS coloring defaults to the constitution's hyper-specific dopamine themes.
 */
export const DopamineButton = React.forwardRef<HTMLButtonElement, DopamineButtonProps>(
    ({ variant = "cyan", size = "md", className, children, ...props }, ref) => {

        const baseColors = variant === "cyan"
            ? "bg-[#00BAF0] text-white shadow-[0_4px_20px_rgba(0,186,240,0.4)]"
            : "bg-[#F59E0B] text-[#4A4A59] shadow-[0_4px_20px_rgba(245,158,11,0.4)]";

        const sizeClasses = {
            sm: "px-4 py-2 text-sm",
            md: "px-6 py-3 text-fluid-base font-semibold",
            lg: "px-8 py-4 text-xl font-bold",
        };

        return (
            <motion.button
                ref={ref}
                className={cn(
                    "rounded-full transition-colors flex items-center justify-center gap-2 relative overflow-hidden",
                    baseColors,
                    sizeClasses[size],
                    className
                )}
                whileHover={{ 
                    scale: 1.05,
                    boxShadow: variant === "yellow" ? "0 0 25px rgba(245, 158, 11, 0.5)" : "0 0 25px rgba(0, 186, 240, 0.5)"
                } as any}
                whileTap={{ scale: 0.92 }}
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 15
                }}
                {...props}
            >
                {/* Subtle inner glass highlight */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-white/20 pointer-events-none rounded-full" />
                {children}
            </motion.button>
        );
    }
);

DopamineButton.displayName = "DopamineButton";
