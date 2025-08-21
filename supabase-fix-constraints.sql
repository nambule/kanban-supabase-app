-- =====================================================
-- CORRECTION DES CONTRAINTES POUR STATUTS ANGLAIS
-- =====================================================
-- Exécutez ce script dans Supabase Dashboard > SQL Editor

-- 1. Supprimer les anciennes contraintes
-- =====================================================

-- Supprimer la contrainte de statut si elle existe
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Supprimer la contrainte de when si elle existe  
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_when_check;

-- Supprimer la contrainte de priority si elle existe
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- Supprimer la contrainte de compartment si elle existe
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_compartment_check;

-- Supprimer la contrainte de size si elle existe
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_size_check;

-- 2. Mettre à jour les données existantes (OPTIONNEL)
-- =====================================================

-- Convertir les statuts français vers anglais dans les données existantes
UPDATE tasks SET status = 'To Do' WHERE status = 'À faire';
UPDATE tasks SET status = 'To Analyze' WHERE status = 'À analyser';
UPDATE tasks SET status = 'In Progress' WHERE status = 'En cours';
UPDATE tasks SET status = 'Done' WHERE status = 'Terminé';

-- Convertir les valeurs when françaises vers anglais
UPDATE tasks SET "when" = 'Today' WHERE "when" = 'Aujourd''hui';
UPDATE tasks SET "when" = 'This Week' WHERE "when" = 'Cette semaine';
UPDATE tasks SET "when" = 'Next Week' WHERE "when" = 'Semaine prochaine';
UPDATE tasks SET "when" = 'This Month' WHERE "when" = 'Ce mois-ci';

-- Convertir les sous-tâches (JSON) - ATTENTION: ceci est plus complexe
-- Vous pouvez ignorer cette partie si vous n'avez pas beaucoup de sous-tâches
UPDATE tasks 
SET subtasks = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'status' = 'À faire' THEN jsonb_set(elem, '{status}', '"To Do"')
      WHEN elem->>'status' = 'À analyser' THEN jsonb_set(elem, '{status}', '"To Analyze"')
      WHEN elem->>'status' = 'En cours' THEN jsonb_set(elem, '{status}', '"In Progress"')
      WHEN elem->>'status' = 'Terminé' THEN jsonb_set(elem, '{status}', '"Done"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(subtasks) as elem
)
WHERE subtasks IS NOT NULL AND jsonb_array_length(subtasks) > 0;

-- 3. Créer les nouvelles contraintes avec les valeurs anglaises
-- =====================================================

-- Contrainte pour les statuts en anglais
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('To Do', 'To Analyze', 'In Progress', 'Done'));

-- Contrainte pour when en anglais
ALTER TABLE tasks ADD CONSTRAINT tasks_when_check 
  CHECK ("when" IN ('', 'Today', 'This Week', 'Next Week', 'This Month'));

-- Contrainte pour les priorités (inchangé)
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('P1', 'P2', 'P3', 'P4', 'P5'));

-- Contrainte pour les compartments (inchangé)
ALTER TABLE tasks ADD CONSTRAINT tasks_compartment_check 
  CHECK (compartment IN ('PM', 'CPO', 'FER', 'NOVAE', 'MRH', 'CDA'));

-- Contrainte pour les tailles (inchangé)
ALTER TABLE tasks ADD CONSTRAINT tasks_size_check 
  CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL'));

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Vérifier que les contraintes ont été créées
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'tasks'::regclass 
AND contype = 'c';

-- Vérifier quelques tâches pour s'assurer que les données sont correctes
SELECT id, title, status, "when", priority, compartment, size 
FROM tasks 
LIMIT 5;

-- =====================================================
-- NOTES IMPORTANTES
-- =====================================================

-- ⚠️  SAUVEGARDEZ VOS DONNÉES avant d'exécuter ce script
-- ✅  Ce script convertit toutes les données françaises vers l'anglais
-- ✅  Les nouvelles contraintes acceptent uniquement les valeurs anglaises
-- ✅  L'application fonctionnera maintenant avec les statuts anglais