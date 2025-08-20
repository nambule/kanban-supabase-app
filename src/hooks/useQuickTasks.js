import { useState, useEffect, useCallback } from 'react'
import { taskService } from '../services/taskService'

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

  // Charger les tâches rapides au montage
  useEffect(() => {
    loadQuickTasks()
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