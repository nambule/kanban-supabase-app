-- =====================================================
-- FONCTION SIMPLIFIÉE POUR SUPPRIMER LES DONNÉES UTILISATEUR
-- =====================================================
-- Exécutez cette fonction dans le SQL Editor de Supabase

-- Créer une fonction simple pour supprimer les données utilisateur
CREATE OR REPLACE FUNCTION delete_user()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid := auth.uid();
  task_count int;
  quick_task_count int;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF user_id IS NULL THEN
    RETURN json_build_object('error', 'Non authentifié');
  END IF;

  -- Supprimer toutes les tâches de l'utilisateur
  DELETE FROM tasks WHERE tasks.user_id = user_id;
  GET DIAGNOSTICS task_count = ROW_COUNT;
  
  -- Supprimer toutes les tâches rapides de l'utilisateur
  DELETE FROM quick_tasks WHERE quick_tasks.user_id = user_id;
  GET DIAGNOSTICS quick_task_count = ROW_COUNT;

  -- Retourner le résultat
  RETURN json_build_object(
    'success', true,
    'message', 'Données utilisateur supprimées avec succès',
    'user_id', user_id,
    'tasks_deleted', task_count,
    'quick_tasks_deleted', quick_task_count
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
-- TEST DE LA FONCTION (optionnel)
-- =====================================================
-- Pour tester que la fonction fonctionne, vous pouvez l'appeler avec :
-- SELECT delete_user();

-- =====================================================
-- NOTES
-- =====================================================
-- Cette fonction supprime seulement les données dans les tables
-- Le compte auth.users restera actif mais sans données
-- L'utilisateur pourra toujours se reconnecter mais avec un board vide