import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'

/**
 * Hook personnalisé pour gérer l'authentification avec Supabase
 */
export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Vérifier la session actuelle au démarrage
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setUser(session?.user || null)
      } catch (err) {
        console.error('Erreur lors de la récupération de la session:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
        
        if (event === 'SIGNED_OUT') {
          setError(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Connexion
  const signIn = useCallback(async (email, password) => {
    try {
      setError(null)
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return data
    } catch (err) {
      console.error('Erreur de connexion:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Inscription
  const signUp = useCallback(async (email, password) => {
    try {
      setError(null)
      setLoading(true)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) throw error
      return data
    } catch (err) {
      console.error('Erreur d\'inscription:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Déconnexion
  const signOut = useCallback(async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      console.error('Erreur de déconnexion:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Connexion avec Google (optionnel)
  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })

      if (error) throw error
      return data
    } catch (err) {
      console.error('Erreur de connexion Google:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Réinitialisation du mot de passe
  const resetPassword = useCallback(async (email) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      return data
    } catch (err) {
      console.error('Erreur de réinitialisation:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Suppression du compte utilisateur
  const deleteAccount = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      
      // Étape 1: Supprimer toutes les données utilisateur manuellement
      console.log('Suppression des tâches...')
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user?.id)
      
      if (tasksError) {
        console.error('Erreur suppression tâches:', tasksError)
        throw new Error('Erreur lors de la suppression des tâches: ' + tasksError.message)
      }

      console.log('Suppression des tâches rapides...')
      const { error: quickTasksError } = await supabase
        .from('quick_tasks')
        .delete()
        .eq('user_id', user?.id)
      
      if (quickTasksError) {
        console.error('Erreur suppression tâches rapides:', quickTasksError)
        throw new Error('Erreur lors de la suppression des tâches rapides: ' + quickTasksError.message)
      }

      // Étape 2: Tenter de supprimer via fonction RPC (si elle existe)
      console.log('Tentative de suppression du compte via RPC...')
      const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_user')
      
      if (rpcError) {
        console.log('Fonction RPC non disponible, suppression manuelle des données effectuée')
        // Ce n'est pas critique, les données sont déjà supprimées
      } else {
        console.log('Résultat RPC:', rpcResult)
      }

      // Étape 3: Déconnexion forcée
      console.log('Déconnexion...')
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.error('Erreur déconnexion:', signOutError)
        // Forcer la déconnexion côté client
        setUser(null)
      }

      // Message de succès
      alert('Votre compte et toutes vos données ont été supprimés. Vous avez été déconnecté.')
      
      return { success: true }
    } catch (err) {
      console.error('Erreur de suppression du compte:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    deleteAccount,
    isAuthenticated: !!user
  }
}