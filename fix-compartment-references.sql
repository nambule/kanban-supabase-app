-- Fix compartment references in tasks table
-- This migration ensures tasks reference compartment names instead of IDs

-- 1. First, remove the old compartment constraint that only allows hardcoded values
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_compartment_check;

-- 2. The compartment column should now allow any text value (compartment names)
-- No need to add a new constraint since compartment names are validated in the application

-- 3. Update any existing tasks that might have compartment IDs to use compartment names
-- This query will update tasks that have UUID-like compartment values to use the actual compartment names
UPDATE public.tasks 
SET compartment = c.name
FROM public.compartments c
WHERE tasks.compartment = c.id::text;

-- 4. Optional: Add an index on compartment for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_compartment ON public.tasks(compartment);

-- 5. Verify the migration worked
-- This should show tasks with compartment names, not UUIDs
-- SELECT DISTINCT compartment FROM public.tasks ORDER BY compartment;