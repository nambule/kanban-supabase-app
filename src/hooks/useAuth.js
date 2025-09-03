import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { seedUserData } from '../utils/seedUserData'

/**
 * Hook personnalisé pour gérer l'authentification avec Supabase
 */
export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isTabSwitching, setIsTabSwitching] = useState(false)

  // Track tab visibility to detect tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🔄 Tab hidden - setting tab switching flag')
        setIsTabSwitching(true)
      } else {
        console.log('🔄 Tab visible - clearing tab switching flag after delay')
        // Clear the flag after a short delay to allow for any auth events
        setTimeout(() => setIsTabSwitching(false), 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

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
        console.log('🔐 Auth state change event:', event, session?.user?.id, 'isTabSwitching:', isTabSwitching)
        
        // Ignore events during tab switching to prevent unnecessary reloads
        if (isTabSwitching && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
          console.log('🔄 Ignoring auth event during tab switching to prevent reload')
          return
        }
        
        // Ignore token refresh events to prevent unnecessary reloads when switching tabs
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Ignoring TOKEN_REFRESHED event to prevent reload')
          return
        }
        
        setUser(session?.user || null)
        setLoading(false)
        
        if (event === 'SIGNED_OUT') {
          setError(null)
        }
        
        // Seed user data after successful signup confirmation
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if user has any compartments (indicating they're not new)
          // Do this asynchronously without blocking the auth state update
          setTimeout(async () => {
            try {
              const { data: compartments } = await supabase
                .from('compartments')
                .select('id')
                .eq('user_id', session.user.id)
                .limit(1)
              
              // If no compartments exist, seed the user with initial data
              if (!compartments || compartments.length === 0) {
                console.log('🌱 New user detected, seeding initial data...')
                await seedUserData(session.user.id)
                
                // Emit event to refresh compartments
                window.dispatchEvent(new CustomEvent('userDataSeeded', { 
                  detail: { userId: session.user.id } 
                }))
              }
            } catch (err) {
              console.error('Error checking/seeding user data:', err)
              // Don't prevent the app from loading even if seeding fails
            }
          }, 100)
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
      setLoading(true)
      console.log('🔄 Signing out user...')
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear user state immediately
      setUser(null)
      console.log('✅ User signed out successfully')
    } catch (err) {
      console.error('❌ Erreur de déconnexion:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
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