import { useState, useEffect, useCallback } from 'react'
import { taskService } from '../services/taskService'
import { transformTaskFromDB, reorganizeTaskOrder, createEmptyOrder } from '../utils/helpers'
import { COMPARTMENTS, PRIORITIES, STATUSES } from '../utils/constants'

/**
 * Hook personnalisé pour gérer les tâches Kanban avec Supabase
 */
export const useTasks = () => {
  const [tasks, setTasks] = useState({})
  const [order, setOrder] = useState(createEmptyOrder(COMPARTMENTS, PRIORITIES, STATUSES))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger toutes les tâches depuis Supabase
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const dbTasks = await taskService.getAllTasks()
      const tasksMap = {}
      
      dbTasks.forEach(dbTask => {
        const task = transformTaskFromDB(dbTask)
        if (task) {
          tasksMap[task.id] = task
        }
      })
      
      setTasks(tasksMap)
      setOrder(reorganizeTaskOrder(tasksMap, 'compartment'))
    } catch (err) {
      console.error('Erreur lors du chargement des tâches:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les tâches au montage
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Créer une nouvelle tâche
  const createTask = useCallback(async (taskData) => {
    try {
      setError(null)
      const dbTask = await taskService.createTask(taskData)
      const newTask = transformTaskFromDB(dbTask)
      
      if (newTask) {
        setTasks(prev => ({ ...prev, [newTask.id]: newTask }))
        
        // Mettre à jour l'ordre
        setOrder(prev => {
          const newOrder = { ...prev }
          
          // Ajouter dans toutes les catégories appropriées
          if (newTask.compartment && newOrder.compartment[newTask.compartment]) {
            newOrder.compartment[newTask.compartment].push(newTask.id)
          }
          if (newTask.priority && newOrder.priority[newTask.priority]) {
            newOrder.priority[newTask.priority].push(newTask.id)
          }
          if (newTask.status && newOrder.status[newTask.status]) {
            newOrder.status[newTask.status].push(newTask.id)
          }
          
          return newOrder
        })
      }
      
      return newTask
    } catch (err) {
      console.error('Erreur lors de la création de la tâche:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Mettre à jour une tâche
  const updateTask = useCallback(async (taskId, updates) => {
    try {
      setError(null)
      const dbTask = await taskService.updateTask(taskId, updates)
      const updatedTask = transformTaskFromDB(dbTask)
      
      if (updatedTask) {
        setTasks(prev => ({ ...prev, [taskId]: updatedTask }))
        
        // Si les propriétés de groupement ont changé, réorganiser l'ordre
        if ('priority' in updates || 'compartment' in updates || 'status' in updates) {
          setOrder(prev => {
            const newOrder = JSON.parse(JSON.stringify(prev))
            
            // Retirer de toutes les colonnes
            Object.values(newOrder).forEach(group => {
              Object.keys(group).forEach(column => {
                group[column] = group[column].filter(id => id !== taskId)
              })
            })
            
            // Réajouter dans les bonnes colonnes
            if (updatedTask.compartment && newOrder.compartment[updatedTask.compartment]) {
              newOrder.compartment[updatedTask.compartment].push(taskId)
            }
            if (updatedTask.priority && newOrder.priority[updatedTask.priority]) {
              newOrder.priority[updatedTask.priority].push(taskId)
            }
            if (updatedTask.status && newOrder.status[updatedTask.status]) {
              newOrder.status[updatedTask.status].push(taskId)
            }
            
            return newOrder
          })
        }
      }
      
      return updatedTask
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la tâche:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Supprimer une tâche
  const deleteTask = useCallback(async (taskId) => {
    try {
      setError(null)
      await taskService.deleteTask(taskId)
      
      setTasks(prev => {
        const newTasks = { ...prev }
        delete newTasks[taskId]
        return newTasks
      })
      
      setOrder(prev => {
        const newOrder = JSON.parse(JSON.stringify(prev))
        
        // Retirer de toutes les colonnes
        Object.values(newOrder).forEach(group => {
          Object.keys(group).forEach(column => {
            group[column] = group[column].filter(id => id !== taskId)
          })
        })
        
        return newOrder
      })
    } catch (err) {
      console.error('Erreur lors de la suppression de la tâche:', err)
      setError(err.message)
      throw err
    }
  }, [])

  // Réorganiser les tâches par drag & drop
  const reorderTasks = useCallback((source, destination, draggableId, groupBy) => {
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    setOrder(prev => {
      const newOrder = JSON.parse(JSON.stringify(prev))
      const fromList = Array.from(newOrder[groupBy][source.droppableId] || [])
      const toList = source.droppableId === destination.droppableId
        ? fromList
        : Array.from(newOrder[groupBy][destination.droppableId] || [])
      
      fromList.splice(source.index, 1)
      toList.splice(destination.index, 0, draggableId)
      
      newOrder[groupBy][source.droppableId] = fromList
      newOrder[groupBy][destination.droppableId] = toList
      
      return newOrder
    })

    // Si changement de colonne, mettre à jour la tâche
    if (source.droppableId !== destination.droppableId) {
      const updates = {}
      if (groupBy === 'compartment') updates.compartment = destination.droppableId
      else if (groupBy === 'priority') updates.priority = destination.droppableId
      else updates.status = destination.droppableId
      
      updateTask(draggableId, updates).catch(err => {
        console.error('Erreur lors de la mise à jour après drag & drop:', err)
        // En cas d'erreur, recharger les données
        loadTasks()
      })
    }
  }, [updateTask, loadTasks])

  return {
    tasks,
    order,
    loading,
    error,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks
  }
}