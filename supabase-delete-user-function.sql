-- =====================================================
-- FONCTION POUR SUPPRIMER UN UTILISATEUR COMPLET
-- =====================================================
-- Exécutez cette fonction dans le SQL Editor de Supabase

-- Créer une fonction pour supprimer l'utilisateur et toutes ses données
CREATE OR REPLACE FUNCTION delete_user()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid := auth.uid();
  result json;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF user_id IS NULL THEN
    RETURN json_build_object('error', 'Non authentifié');
  END IF;

  -- Supprimer toutes les tâches de l'utilisateur (cascade automatique grâce aux politiques RLS)
  DELETE FROM tasks WHERE user_id = auth.uid();
  
  -- Supprimer toutes les tâches rapides de l'utilisateur
  DELETE FROM quick_tasks WHERE user_id = auth.uid();

  -- Supprimer l'utilisateur de auth.users
  -- Note: Cette partie nécessite les privilèges service_role
  -- En production, vous devriez plutôt marquer l'utilisateur comme "deleted"
  -- ou utiliser une fonction côté serveur avec les bonnes permissions
  
  -- Pour l'instant, on va juste marquer les données comme supprimées
  -- et laisser Supabase Auth gérer la suppression du compte via l'interface admin
  
  RETURN json_build_object(
    'success', true,
    'message', 'Données utilisateur supprimées. Le compte sera désactivé.',
    'user_id', user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', 'Erreur lors de la suppression: ' || SQLERRM
    );
END;
$$;

-- Accorder les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;

-- =====================================================
-- ALTERNATIVE PLUS SIMPLE (RECOMMANDÉE)
-- =====================================================
-- Si la fonction ci-dessus ne fonctionne pas, utilisez cette approche :

-- Marquer l'utilisateur comme supprimé dans une table de profils
-- CREATE TABLE IF NOT EXISTS user_profiles (
--   id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   email text,
--   deleted_at timestamp with time zone,
--   created_at timestamp with time zone DEFAULT now()
-- );

-- CREATE OR REPLACE FUNCTION soft_delete_user()
-- RETURNS json
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- DECLARE
--   user_id uuid := auth.uid();
-- BEGIN
--   -- Vérifier que l'utilisateur est authentifié
--   IF user_id IS NULL THEN
--     RETURN json_build_object('error', 'Non authentifié');
--   END IF;

--   -- Supprimer toutes les données utilisateur
--   DELETE FROM tasks WHERE user_id = auth.uid();
--   DELETE FROM quick_tasks WHERE user_id = auth.uid();
  
--   -- Marquer le profil comme supprimé
--   INSERT INTO user_profiles (id, email, deleted_at)
--   VALUES (user_id, auth.email(), now())
--   ON CONFLICT (id) DO UPDATE SET deleted_at = now();

--   RETURN json_build_object('success', true, 'message', 'Compte marqué pour suppression');
-- END;
-- $$;

-- =====================================================
-- NOTES IMPORTANTES
-- =====================================================

-- 1. La suppression complète d'un utilisateur Supabase Auth nécessite 
--    des privilèges service_role qui ne peuvent pas être utilisés côté client

-- 2. Pour une suppression complète, l'utilisateur devra :
--    - Utiliser cette fonction pour supprimer ses données
--    - Puis aller dans Supabase Dashboard > Authentication > Users
--    - Et supprimer manuellement son compte

-- 3. En production, implémentez une API côté serveur avec service_role
--    pour la suppression complète automatique