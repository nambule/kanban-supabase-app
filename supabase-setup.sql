-- =====================================================
-- CONFIGURATION SUPABASE POUR L'AUTHENTIFICATION
-- =====================================================
-- Exécutez ces commandes dans le SQL Editor de Supabase

-- 1. Ajouter la colonne user_id aux tables existantes
-- =====================================================

-- Ajouter user_id à la table tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ajouter user_id à la table quick_tasks  
ALTER TABLE quick_tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Activer Row Level Security (RLS)
-- =====================================================

-- Activer RLS sur les tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_tasks ENABLE ROW LEVEL SECURITY;

-- 3. Créer les politiques de sécurité
-- =====================================================

-- Politiques pour la table 'tasks'
-- Les utilisateurs ne peuvent voir/modifier que leurs propres tâches

-- Politique de lecture
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Politique d'insertion
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique de mise à jour
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Politique de suppression
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour la table 'quick_tasks'
-- Les utilisateurs ne peuvent voir/modifier que leurs propres tâches rapides

-- Politique de lecture
CREATE POLICY "Users can view own quick tasks" ON quick_tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Politique d'insertion
CREATE POLICY "Users can insert own quick tasks" ON quick_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique de mise à jour
CREATE POLICY "Users can update own quick tasks" ON quick_tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Politique de suppression
CREATE POLICY "Users can delete own quick tasks" ON quick_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- 4. (Optionnel) Migration des données existantes
-- =====================================================
-- Si vous avez déjà des données dans vos tables sans user_id,
-- vous pouvez les assigner à un utilisateur spécifique :

-- Remplacez 'USER_ID_HERE' par l'ID d'un utilisateur existant
-- UPDATE tasks SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE quick_tasks SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;

-- 5. Vérification des politiques
-- =====================================================
-- Vérifiez que les politiques sont bien créées :

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('tasks', 'quick_tasks');

-- =====================================================
-- CONFIGURATION DANS SUPABASE DASHBOARD
-- =====================================================

-- 1. Allez dans Authentication > Settings
-- 2. Configurez les paramètres d'authentification :
--    - Activez "Enable email confirmations" si souhaité
--    - Configurez les URLs de redirection
--    - Personnalisez les templates d'emails

-- 3. (Optionnel) Configurez les providers OAuth :
--    - Google, GitHub, etc.

-- =====================================================
-- VARIABLES D'ENVIRONNEMENT REQUISES
-- =====================================================

-- Dans votre fichier .env :
-- VITE_SUPABASE_URL=your_supabase_url
-- VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

-- =====================================================
-- NOTES DE SÉCURITÉ
-- =====================================================

-- ✅ RLS activé sur toutes les tables
-- ✅ Politiques par utilisateur configurées
-- ✅ Les données sont isolées par user_id
-- ✅ Suppression en cascade si un utilisateur est supprimé
-- ⚠️  N'exposez JAMAIS la service_role key côté client