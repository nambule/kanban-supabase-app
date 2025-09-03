import { supabase } from './supabase'

/**
 * Service pour gérer les tâches avec Supabase
 * Structure de table attendue :
 * - tasks: id, title, priority, compartment, status, size, note, when, due_date, start_date, hours, time_allocation, flagged, subtasks, completion, user_id, created_at, updated_at
 * - quick_tasks: id, title, user_id, created_at
 * 
 * Avec RLS (Row Level Security) activé pour sécuriser les données par utilisateur
 */

export const taskService = {
  // --- Gestion des tâches principales ---
  
  /**
   * Récupère toutes les tâches de l'utilisateur connecté avec les informations de compartiment
   */
  async getAllTasks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Try with foreign key join first, fall back to simple query if it fails
    let { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        compartments!fk_tasks_compartment (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    if (error && error.message.includes('fk_tasks_compartment')) {
      console.log('🔄 Foreign key join failed, trying simple query:', error.message)
      // Fall back to simple query without join
      const result = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      
      data = result.data
      error = result.error
      
      // Manually fetch compartment names for tasks
      if (data && data.length > 0) {
        const compartmentIds = [...new Set(data.map(t => t.compartment_id).filter(Boolean))]
        if (compartmentIds.length > 0) {
          const { data: compartments } = await supabase
            .from('compartments')
            .select('id, name')
            .in('id', compartmentIds)
            .eq('user_id', user.id)
          
          const compartmentMap = {}
          compartments?.forEach(c => {
            compartmentMap[c.id] = c
          })
          
          // Add compartment info to tasks
          data = data.map(task => ({
            ...task,
            compartments: task.compartment_id ? compartmentMap[task.compartment_id] : null
          }))
        }
      }
    }
    
    if (error) throw error
    return data || []
  },

  /**
   * Crée une nouvelle tâche
   */
  async createTask(task) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié')

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: task.title,
        priority: task.priority || 'P3',
        compartment_id: task.compartmentId,
        status: task.status || 'To Do',
        size: task.size || 'M',
        note: task.note || '',
        when: task.when || '',
        due_date: task.dueDate || null,
        start_date: task.startDate || null,
        hours: task.hours ? parseFloat(task.hours) : null,
        time_allocation: task.timeAllocation || 'one shot',
        flagged: task.flagged || false,
        subtasks: task.subtasks || [],
        completion: task.completion || 0,
        user_id: user.id
      }])
      .select(`
        *,
        compartments!fk_tasks_compartment (
          id,
          name
        )
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Met à jour une tâche existante de l'utilisateur connecté
   */
  async updateTask(taskId, updates) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const updateData = {}
    
    if ('title' in updates) updateData.title = updates.title
    if ('priority' in updates) updateData.priority = updates.priority
    if ('compartmentId' in updates) updateData.compartment_id = updates.compartmentId
    if ('status' in updates) updateData.status = updates.status
    if ('size' in updates) updateData.size = updates.size
    if ('note' in updates) updateData.note = updates.note
    if ('when' in updates) updateData.when = updates.when
    if ('dueDate' in updates) updateData.due_date = updates.dueDate || null
    if ('startDate' in updates) updateData.start_date = updates.startDate || null
    if ('hours' in updates) updateData.hours = updates.hours ? parseFloat(updates.hours) : null
    if ('timeAllocation' in updates) updateData.time_allocation = updates.timeAllocation
    if ('flagged' in updates) updateData.flagged = updates.flagged
    if ('subtasks' in updates) updateData.subtasks = updates.subtasks
    if ('completion' in updates) updateData.completion = updates.completion

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select(`
        *,
        compartments!fk_tasks_compartment (
          id,
          name
        )
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Supprime une tâche de l'utilisateur connecté
   */
  async deleteTask(taskId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) throw error
  },

  // --- Gestion des tâches rapides ---
  
  /**
   * Récupère toutes les tâches rapides de l'utilisateur connecté
   */
  async getQuickTasks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('quick_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  /**
   * Crée une tâche rapide
   */
  async createQuickTask(title) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié')

    const { data, error } = await supabase
      .from('quick_tasks')
      .insert([{ 
        title,
        user_id: user.id
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Supprime une tâche rapide de l'utilisateur connecté
   */
  async deleteQuickTask(quickTaskId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('quick_tasks')
      .delete()
      .eq('id', quickTaskId)
      .eq('user_id', user.id)

    if (error) throw error
  }
}