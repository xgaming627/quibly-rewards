"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    /** Optional class name to merge with the strict glass tokens */
    className?: string;
    /** Children elements to render inside the card */
    children: React.ReactNode;
}

/**
 * Primitive GlassCard Container.
 * Implements the explicit Antigravity constitution tokens:
 * - White background at 15% opacity
 * - Backdrop blur of 20px
 * - White border at 30% opacity
 * - Specific soft black dropshadow
 * 
 * Extends framer-motion's motion.div so parent components can naturally
 * orchestrate array entry/exit animations (like staggering task lists).
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(
                    "bg-white/15 backdrop-blur-glass border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl p-6",
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

GlassCard.displayName = "GlassCard";
