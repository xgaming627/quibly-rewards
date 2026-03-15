import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind classes, resolving conflicts using tailwind-merge.
 * This ensures components can be securely extended with custom styles without unpredictability.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
