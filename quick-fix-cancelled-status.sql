-- Quick Fix for 'Cancelled' Status Issue
-- Run this in your Supabase SQL Editor to immediately fix the status constraint

-- Drop the existing status constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add new status constraint that includes 'Cancelled' and uses English values
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('To Do', 'To Analyze', 'In Progress', 'Done', 'Cancelled'));

-- If you have existing data with French status values, uncomment these lines:
-- UPDATE public.tasks SET status = 'To Do' WHERE status = 'À faire';
-- UPDATE public.tasks SET status = 'To Analyze' WHERE status = 'À analyser';  
-- UPDATE public.tasks SET status = 'In Progress' WHERE status = 'En cours';
-- UPDATE public.tasks SET status = 'Done' WHERE status = 'Terminé';