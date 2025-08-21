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
      
      console.log('🔄 Tentative de connexion à Supabase...')
      const dbTasks = await taskService.getAllTasks()
      console.log('✅ Connexion réussie, tâches chargées:', dbTasks.length)
      
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
      console.error('❌ Erreur lors du chargement des tâches:', err)
      setError(`Erreur de connexion: ${err.message}`)
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
        // Vérifier si la tâche n'existe pas déjà pour éviter les doublons
        setTasks(prev => {
          if (prev[newTask.id]) {
            console.log('Tâche déjà présente, éviter la duplication:', newTask.id)
            return prev
          }
          return { ...prev, [newTask.id]: newTask }
        })
        
        // Mettre à jour l'ordre
        setOrder(prev => {
          const newOrder = { ...prev }
          
          // Vérifier si l'ID n'est pas déjà dans les listes pour éviter les doublons
          const taskAlreadyInCompartment = newTask.compartment && 
            newOrder.compartment[newTask.compartment] && 
            newOrder.compartment[newTask.compartment].includes(newTask.id)
            
          const taskAlreadyInPriority = newTask.priority && 
            newOrder.priority[newTask.priority] && 
            newOrder.priority[newTask.priority].includes(newTask.id)
            
          const taskAlreadyInStatus = newTask.status && 
            newOrder.status[newTask.status] && 
            newOrder.status[newTask.status].includes(newTask.id)
          
          // Ajouter seulement si pas déjà présent
          if (newTask.compartment && newOrder.compartment[newTask.compartment] && !taskAlreadyInCompartment) {
            newOrder.compartment[newTask.compartment].push(newTask.id)
          }
          if (newTask.priority && newOrder.priority[newTask.priority] && !taskAlreadyInPriority) {
            newOrder.priority[newTask.priority].push(newTask.id)
          }
          if (newTask.status && newOrder.status[newTask.status] && !taskAlreadyInStatus) {
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
            
            // Sauvegarder les positions actuelles avant de retirer
            const positions = {}
            Object.keys(newOrder).forEach(groupType => {
              Object.keys(newOrder[groupType]).forEach(column => {
                const index = newOrder[groupType][column].indexOf(taskId)
                if (index !== -1) {
                  positions[groupType] = { column, index }
                }
              })
            })
            
            // Retirer de toutes les colonnes
            Object.values(newOrder).forEach(group => {
              Object.keys(group).forEach(column => {
                group[column] = group[column].filter(id => id !== taskId)
              })
            })
            
            // Réajouter dans les bonnes colonnes à la même position si possible
            if (updatedTask.compartment && newOrder.compartment[updatedTask.compartment]) {
              const pos = positions.compartment
              if (pos && pos.column === updatedTask.compartment) {
                // Même colonne, remettre à la même position
                newOrder.compartment[updatedTask.compartment].splice(pos.index, 0, taskId)
              } else {
                // Nouvelle colonne, ajouter à la fin
                newOrder.compartment[updatedTask.compartment].push(taskId)
              }
            }
            
            if (updatedTask.priority && newOrder.priority[updatedTask.priority]) {
              const pos = positions.priority
              if (pos && pos.column === updatedTask.priority) {
                newOrder.priority[updatedTask.priority].splice(pos.index, 0, taskId)
              } else {
                newOrder.priority[updatedTask.priority].push(taskId)
              }
            }
            
            if (updatedTask.status && newOrder.status[updatedTask.status]) {
              const pos = positions.status
              if (pos && pos.column === updatedTask.status) {
                newOrder.status[updatedTask.status].splice(pos.index, 0, taskId)
              } else {
                newOrder.status[updatedTask.status].push(taskId)
              }
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