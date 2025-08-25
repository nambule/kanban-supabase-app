-- Migration to add user-specific compartments support
-- Execute this in Supabase SQL editor

-- 1. Create compartments table
CREATE TABLE public.compartments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    color_bg TEXT DEFAULT '#EEF2FF',
    color_text TEXT DEFAULT '#3730A3', 
    color_border TEXT DEFAULT '#C7D2FE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name),
    UNIQUE(user_id, position)
);

-- 2. Add RLS policy for compartments
ALTER TABLE public.compartments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to manage only their own compartments
CREATE POLICY "Users can manage their own compartments" 
ON public.compartments 
FOR ALL 
USING (auth.uid() = user_id);

-- 3. Remove compartment constraint from tasks table
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_compartment_check;

-- 4. Add foreign key relationship to compartments
-- First, we need to add user_id to tasks table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'user_id') THEN
        ALTER TABLE public.tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Update RLS policy for tasks to be user-specific
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks" 
ON public.tasks 
FOR ALL 
USING (auth.uid() = user_id);

-- 6. Same for quick_tasks
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quick_tasks' AND column_name = 'user_id') THEN
        ALTER TABLE public.quick_tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DROP POLICY IF EXISTS "Allow all operations on quick_tasks" ON public.quick_tasks;
CREATE POLICY "Users can manage their own quick_tasks" 
ON public.quick_tasks 
FOR ALL 
USING (auth.uid() = user_id);

-- 7. Add trigger for compartments updated_at
CREATE TRIGGER update_compartments_updated_at 
    BEFORE UPDATE ON public.compartments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Create indexes for better performance
CREATE INDEX idx_compartments_user_id ON public.compartments(user_id);
CREATE INDEX idx_compartments_position ON public.compartments(user_id, position);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_user_compartment ON public.tasks(user_id, compartment);
CREATE INDEX idx_quick_tasks_user_id ON public.quick_tasks(user_id);

-- 9. Insert default compartments for existing users (if any)
-- This will need to be run after users exist, or can be done programmatically
-- INSERT INTO public.compartments (name, user_id, position, color_bg, color_text, color_border)
-- SELECT 'PM', id, 0, '#EEF2FF', '#3730A3', '#C7D2FE' FROM auth.users
-- UNION ALL
-- SELECT 'CPO', id, 1, '#ECFEFF', '#155E75', '#A5F3FC' FROM auth.users
-- UNION ALL  
-- SELECT 'FER', id, 2, '#FEE2E2', '#991B1B', '#FECACA' FROM auth.users
-- UNION ALL
-- SELECT 'NOVAE', id, 3, '#FAE8FF', '#6B21A8', '#F5D0FE' FROM auth.users
-- UNION ALL
-- SELECT 'MRH', id, 4, '#DCFCE7', '#065F46', '#BBF7D0' FROM auth.users
-- UNION ALL
-- SELECT 'CDA', id, 5, '#FFE4E6', '#9F1239', '#FECDD3' FROM auth.users;