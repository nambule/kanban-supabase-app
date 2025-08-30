import { useState, useEffect, useCallback } from 'react'
import { taskService } from '../services/taskService'
import { supabase } from '../services/supabase'

/**
 * Hook personnalisé pour gérer les tâches rapides avec Supabase
 */
export const useQuickTasks = () => {
  const [quickTasks, setQuickTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Charger toutes les tâches rapides
  const loadQuickTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await taskService.getQuickTasks()
      setQuickTasks(data)
    } catch (err) {
      console.error('Erreur lors du chargement des tâches rapides:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les tâches rapides au montage, mais seulement si authentifié
  useEffect(() => {
    const checkAuthAndLoadQuickTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          loadQuickTasks()
        } else {
          // User not authenticated yet, wait for auth state change
          setLoading(false)
        }
      } catch (err) {
        console.log('🔄 Auth check failed, will retry when auth state changes:', err.message)
        setLoading(false)
      }
    }
    
    checkAuthAndLoadQuickTasks()
  }, [loadQuickTasks])

  // Listen for auth state changes to load quick tasks when user becomes authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔄 User signed in, loading quick tasks...')
        loadQuickTasks()
      } else if (event === 'SIGNED_OUT') {
        console.log('🔄 User signed out, clearing quick tasks...')
        setQuickTasks([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadQuickTasks])

  // Ajouter une tâche rapide
  const addQuickTask = useCallback(async (title) => {
    try {
      setError(null)
      const newTask = await taskService.createQuickTask(title)
      setQuickTasks(prev => [...prev, newTask])
      return newTask
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la tâche rapide:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Supprimer une tâche rapide
  const removeQuickTask = useCallback(async (quickTaskId) => {
    try {
      setError(null)
      await taskService.deleteQuickTask(quickTaskId)
      setQuickTasks(prev => prev.filter(task => task.id !== quickTaskId))
    } catch (err) {
      console.error('Erreur lors de la suppression de la tâche rapide:', err)
      setError(err.message)
      throw err
    }
  }, [])

  return {
    quickTasks,
    loading,
    error,
    loadQuickTasks,
    addQuickTask,
    removeQuickTask
  }
}