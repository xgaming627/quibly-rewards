-- ============================================================
-- Quibly Rewards — Phase 16 migration (Additive & Safe)
-- ============================================================

-- 1. Tasks Table Updates
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS preset_id uuid;

-- 2. Task Presets Table - Base Creation
CREATE TABLE IF NOT EXISTS public.task_presets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. Add Columns Individually (Ensures upgrade from any version)
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS point_value integer NOT NULL DEFAULT 10;
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS emoji text DEFAULT '✨';
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'daily';
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS schedule_data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS day_lock boolean NOT NULL DEFAULT false;
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS time_limit_minutes integer;
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS time_limit_bonus integer NOT NULL DEFAULT 0;
ALTER TABLE public.task_presets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Constraint (Safe Addition)
DO $$ 
BEGIN 
    ALTER TABLE public.task_presets 
    ADD CONSTRAINT schedule_type_check CHECK (schedule_type IN ('daily', 'range', 'days'));
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. RLS Setup
ALTER TABLE public.task_presets ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DROP POLICY IF EXISTS "Parents can manage their presets" ON public.task_presets;
CREATE POLICY "Parents can manage their presets" 
ON public.task_presets FOR ALL 
USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Children can view active presets" ON public.task_presets;
CREATE POLICY "Children can view active presets" 
ON public.task_presets FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = false
));

-- 6. Enum Update
DO $$ 
BEGIN 
    ALTER TYPE public.ledger_transaction_type ADD VALUE IF NOT EXISTS 'manual_adjustment';
EXCEPTION 
    WHEN duplicate_object THEN NULL; 
END $$;
