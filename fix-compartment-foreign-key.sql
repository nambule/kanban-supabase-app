-- Proper fix: Use compartment IDs as foreign keys instead of names
-- This prevents conflicts when different users create compartments with same names

-- 1. First, add a new column for compartment_id
ALTER TABLE public.tasks ADD COLUMN compartment_id UUID;

-- 2. Update existing tasks to use compartment IDs
-- For existing tasks that reference compartment names, find the matching compartment ID for the task's user
UPDATE public.tasks 
SET compartment_id = c.id
FROM public.compartments c
WHERE c.name = tasks.compartment 
AND c.user_id = tasks.user_id;

-- 3. For tasks that don't have a user_id yet (if any), we need to handle them
-- This shouldn't happen if the previous migrations were run, but just in case:
UPDATE public.tasks 
SET compartment_id = c.id
FROM public.compartments c
WHERE c.name = tasks.compartment 
AND tasks.user_id IS NULL
AND c.user_id = (SELECT id FROM auth.users LIMIT 1); -- Assign to first user as fallback

-- 4. Make compartment_id NOT NULL and add foreign key constraint
ALTER TABLE public.tasks ALTER COLUMN compartment_id SET NOT NULL;

ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_compartment 
FOREIGN KEY (compartment_id) REFERENCES public.compartments(id) ON DELETE RESTRICT;

-- 5. Remove the old compartment column (after confirming data migration worked)
-- Uncomment these lines after verifying the migration worked correctly:
-- ALTER TABLE public.tasks DROP COLUMN compartment;

-- 6. Add index for performance
CREATE INDEX idx_tasks_compartment_id ON public.tasks(compartment_id);
CREATE INDEX idx_tasks_user_compartment ON public.tasks(user_id, compartment_id);

-- 7. Verification queries (run these to check migration success)
-- SELECT COUNT(*) FROM tasks WHERE compartment_id IS NULL; -- Should be 0
-- SELECT t.id, t.title, c.name as compartment_name, c.user_id 
-- FROM tasks t JOIN compartments c ON t.compartment_id = c.id LIMIT 10;