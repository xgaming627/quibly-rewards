"use client";

import React from "react";
import Image from "next/image";
import { cn } from "../../lib/cn";

export type MascotState = "focus" | "review" | "success" | "dopamine";

interface MascotAvatarProps {
    /** The strict emotional state controlling which mascot image to display */
    state: MascotState;
    /** Optional size override, defaults to w-32 h-32 */
    className?: string;
    /** Whether the image should load with standard priority or high priority */
    priority?: boolean;
}

/**
 * The Central Mascot Engine.
 * This component acts as the visual governor of the app's emotional tone.
 * It strictly maps the four allowable states to their designated placeholder assets,
 * ensuring UI consistency and preventing Rejection Sensitive Dysphoria (RSD) triggers.
 * 
 * Mapping:
 * - "focus" -> mascot-writing.png
 * - "review" -> mascot-investigating.png
 * - "success" -> mascot-thumbsup.png
 * - "dopamine" -> mascot-celebrating.png
 */
export function MascotAvatar({
    state,
    className,
    priority = false,
}: MascotAvatarProps) {
    // Strict mapping function ensuring we only fetch defined assets
    const getMascotPath = (s: MascotState): string => {
        switch (s) {
            case "focus":
                return "/mascots/mascot-writing.png";
            case "review":
                return "/mascots/mascot-investigating.png";
            case "success":
                return "/mascots/mascot-thumbsup.png";
            case "dopamine":
                return "/mascots/mascot-celebrating.png";
            default:
                // Fallback to success (safest emotional state) if something breaks typing
                return "/mascots/mascot-thumbsup.png";
        }
    };

    const getAltText = (s: MascotState): string => {
        return `Mascot in ${s} state`;
    };

    return (
        <div className={cn("relative w-32 h-32 transition-transform duration-500", className)}>
            <Image
                src={getMascotPath(state)}
                alt={getAltText(state)}
                fill
                className="object-contain"
                priority={priority}
            />
        </div>
    );
}
