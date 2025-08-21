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


  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    isAuthenticated: !!user
  }
}