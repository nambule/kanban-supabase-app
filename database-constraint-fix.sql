-- Database Constraint Fix for My Task Board
-- This script updates the check constraints to match the current application values
-- Run this in your Supabase SQL Editor

-- 1. Drop existing check constraints that are causing issues
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_when_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_compartment_check;

-- 2. Add updated check constraints with correct English values

-- Status constraint with all current status values including 'Cancelled'
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('To Do', 'To Analyze', 'In Progress', 'Done', 'Cancelled'));

-- When constraint with all current when values including 'Next Month'
ALTER TABLE public.tasks ADD CONSTRAINT tasks_when_check 
CHECK ("when" IN ('', 'Today', 'This Week', 'Next Week', 'This Month', 'Next Month'));

-- Remove compartment constraint to allow dynamic compartments
-- (The compartment constraint is too restrictive for the dynamic system)
-- Compartments are now managed through the compartments table with foreign key

-- 3. Add missing columns if they don't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hours NUMERIC;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_allocation TEXT DEFAULT 'one shot';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion INTEGER DEFAULT 0 CHECK (completion >= 0 AND completion <= 100);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Add compartment_id for foreign key relationship (if using compartments table)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS compartment_id UUID;

-- 5. Update any existing data from French to English (if needed)
-- Uncomment and run these if you have existing data with French values:

-- UPDATE public.tasks SET status = 'To Do' WHERE status = 'À faire';
-- UPDATE public.tasks SET status = 'To Analyze' WHERE status = 'À analyser';  
-- UPDATE public.tasks SET status = 'In Progress' WHERE status = 'En cours';
-- UPDATE public.tasks SET status = 'Done' WHERE status = 'Terminé';

-- UPDATE public.tasks SET "when" = 'Today' WHERE "when" = 'Aujourd''hui';
-- UPDATE public.tasks SET "when" = 'This Week' WHERE "when" = 'Cette semaine';
-- UPDATE public.tasks SET "when" = 'Next Week' WHERE "when" = 'Semaine prochaine';
-- UPDATE public.tasks SET "when" = 'This Month' WHERE "when" = 'Ce mois-ci';

-- 6. Create index for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_compartment_id ON public.tasks(compartment_id);
CREATE INDEX IF NOT EXISTS idx_tasks_when ON public.tasks("when");

-- 7. Update RLS policies for user_id (if using authentication)
-- DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;
-- CREATE POLICY "Users can manage their own tasks" ON public.tasks 
--     FOR ALL USING (auth.uid() = user_id);