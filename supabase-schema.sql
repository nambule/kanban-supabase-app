-- Schema SQL pour Supabase - Application My Task Board
-- À exécuter dans l'éditeur SQL de Supabase

-- Table pour les tâches principales
CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1', 'P2', 'P3', 'P4', 'P5')),
    compartment TEXT NOT NULL CHECK (compartment IN ('PM', 'CPO', 'FER', 'NOVAE', 'MRH', 'CDA')),
    status TEXT NOT NULL DEFAULT 'À faire' CHECK (status IN ('À faire', 'À analyser', 'En cours', 'Terminé')),
    size TEXT NOT NULL DEFAULT 'M' CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL')),
    note TEXT DEFAULT '',
    "when" TEXT DEFAULT '' CHECK ("when" IN ('', 'Aujourd''hui', 'Cette semaine', 'Semaine prochaine', 'Ce mois-ci')),
    due_date DATE,
    flagged BOOLEAN DEFAULT false,
    subtasks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les tâches rapides
CREATE TABLE public.quick_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_tasks_compartment ON public.tasks(compartment);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at);
CREATE INDEX idx_quick_tasks_created_at ON public.quick_tasks(created_at);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON public.tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Politique RLS (Row Level Security) - À adapter selon vos besoins
-- Pour une utilisation simple, on autorise toutes les opérations
-- En production, vous devriez implémenter une authentification appropriée

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_tasks ENABLE ROW LEVEL SECURITY;

-- Politique permissive pour démonstration (à sécuriser en production)
CREATE POLICY "Allow all operations on tasks" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on quick_tasks" ON public.quick_tasks FOR ALL USING (true);

-- Exemples de données (optionnel)
INSERT INTO public.tasks (title, priority, compartment, status, size, note, "when", due_date, flagged, subtasks) VALUES
('Migration vers React 18', 'P1', 'FER', 'En cours', 'L', 'Attention aux breaking changes', 'Cette semaine', '2025-01-15', true, '[{"id": "1", "title": "Mise à jour des dépendances", "status": "Terminé"}, {"id": "2", "title": "Tests de régression", "status": "En cours"}]'),
('Refonte du design system', 'P2', 'CPO', 'À analyser', 'XL', 'Coordonner avec l''équipe UX', 'Ce mois-ci', NULL, false, '[]'),
('Optimisation des performances', 'P3', 'FER', 'À faire', 'M', '', '', NULL, false, '[]');

INSERT INTO public.quick_tasks (title) VALUES
('Corriger le bug de la sidebar'),
('Mettre à jour la documentation'),
('Planifier la prochaine release');