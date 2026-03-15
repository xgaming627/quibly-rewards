# Quibly Rewards: Agent Constitution & Design System Strictness

This document serves as the absolute source of truth for all autonomous agent operations within the "Quibly Rewards" platform project. Deviations from these rules are forbidden.

## 1. NEURODIVERGENT UI/UX & ANTIGRAVITY PREMIUM AESTHETIC

The application must strictly adhere to the "Google Antigravity Premium" design aesthetic. These tokens and patterns are mandatory:

*   **Base Environment Background**: `#F8F9FA`
*   **Primary Typography**: `#4A4A59`
*   **Glassmorphism Token**: `background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);` (Implement in Tailwind as `.glass-panel` utilities with `backdrop-blur-glass`).
*   **Fluid Typography**: Use CSS `clamp()` mapping in Tailwind (`text-fluid-base`) to prevent abrupt layout shifts. Static `px` or `rem` values for large body copy are discouraged.
*   **Dopamine Hit Colors**: Use `#FFD757` (Yellow) and `#00BAF0` (Cyan) EXCLUSIVELY for reward unlocks, completions, and positive reinforcement. Do NOT use them for primary structural elements like sidebars.

## 2. MASCOT STATE MAPPING (MANDATORY)

The application utilizes a mascot to provide psychological safety and eliminate Rejection Sensitive Dysphoria (RSD) triggers. Mascot image mapping is strict:

*   **`state="focus"`**: `/mascots/mascot-writing.png`
    *   *Usage*: Active task lists, homework categories, neutral empty states.
*   **`state="review"`**: `/mascots/mascot-investigating.png`
    *   *Usage*: Parent Dashboard when reviewing "Locked" tasks, global Error Boundary, "Gentle Reset" fallback UI.
*   **`state="success"`**: `/mascots/mascot-thumbsup.png`
    *   *Usage*: Standard task completions, logging into the application, root entry, Reward Shop catalog.
*   **`state="dopamine"`**: `/mascots/mascot-celebrating.png`
    *   *Usage*: EXCLUSIVELY alongside Framer Motion spring animations during instant task unlocks and successful reward purchases.

## 3. DATABASE & SECURITY ARCHITECTURE

*   **Backend**: Supabase (PostgreSQL).
*   **Security (RLS)**: Row Level Security (RLS) is non-negotiable. All database policies must enforce the `family_id` boundary. A user from family A must never have read/write access to rows belonging to family B.
*   **Ledger Immutability**: Points are NEVER stored as a static integer value in a users table.
    *   Points are calculated dynamically via the `public.child_balances` view derived from the `public.point_ledger`.
    *   Point deductions for behavior are FORBIDDEN. Negative points do not exist.

## 4. NEGATIVE PROMPTING (FORBIDDEN PRACTICES)

1.  **NO SSR/Server Components**: The Next.js application is strictly a Single Page Application (SPA). `use client` must be present at the top of every file. Server Actions and `getServerSideProps` are banned.
2.  **NO Generic High-Contrast Themes**: Avoid harsh black-on-white or generic UI frameworks without extensive customization to match the Antigravity Premium aesthetic.
3.  **NO Object-Oriented Component Classes**: Use functional programming patterns exclusively. Use React Hooks instead of class lifecycle methods (except for the global `ErrorBoundary` which requires `componentDidCatch`).
4.  **NO Undocumented Exports**: Every exported function, file, or complex hook must include detailed JSDoc/TSDoc blocks explaining the "Why" (the intent and psychological reasoning), not just the "How".
