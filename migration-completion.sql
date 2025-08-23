-- Add completion column and time tracking fields to tasks table
-- This migration adds a completion field to track task progress independently of subtasks
-- and updates subtasks to include nextAction field
-- Also adds start date, hours and time allocation fields
-- Run this SQL command in your Supabase SQL editor

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completion INTEGER DEFAULT 0;

-- Add a check constraint to ensure completion is between 0 and 100
ALTER TABLE tasks 
ADD CONSTRAINT completion_range_check 
CHECK (completion >= 0 AND completion <= 100);

-- Add time tracking fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS hours DECIMAL(5,1) DEFAULT NULL;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS time_allocation VARCHAR(20) DEFAULT 'one shot';

-- Add a check constraint for time_allocation values
ALTER TABLE tasks 
ADD CONSTRAINT time_allocation_check 
CHECK (time_allocation IN ('one shot', 'per week', 'per 2 weeks'));

-- Update any existing records to have default values
UPDATE tasks 
SET completion = 0 
WHERE completion IS NULL;

UPDATE tasks 
SET time_allocation = 'one shot' 
WHERE time_allocation IS NULL;

-- Note: Subtasks are stored as JSON array, so nextAction field will be handled in the application
-- Each subtask object can now include: {id, title, status, nextAction}
-- The application ensures only one subtask can be marked as nextAction = true