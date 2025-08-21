import { supabase } from './supabase'

/**
 * Service pour gérer les tâches Kanban avec Supabase
 * Structure de table attendue :
 * - tasks: id, title, priority, compartment, status, size, note, when, due_date, flagged, subtasks, user_id, created_at, updated_at
 * - quick_tasks: id, title, user_id, created_at
 * 
 * Avec RLS (Row Level Security) activé pour sécuriser les données par utilisateur
 */

export const taskService = {
  // --- Gestion des tâches principales ---
  
  /**
   * Récupère toutes les tâches
   */
  async getAllTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true })
    
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
        compartment: task.compartment,
        status: task.status || 'To Do',
        size: task.size || 'M',
        note: task.note || '',
        when: task.when || '',
        due_date: task.dueDate || null,
        flagged: task.flagged || false,
        subtasks: task.subtasks || [],
        user_id: user.id
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Met à jour une tâche existante
   */
  async updateTask(taskId, updates) {
    const updateData = {}
    
    if ('title' in updates) updateData.title = updates.title
    if ('priority' in updates) updateData.priority = updates.priority
    if ('compartment' in updates) updateData.compartment = updates.compartment
    if ('status' in updates) updateData.status = updates.status
    if ('size' in updates) updateData.size = updates.size
    if ('note' in updates) updateData.note = updates.note
    if ('when' in updates) updateData.when = updates.when
    if ('dueDate' in updates) updateData.due_date = updates.dueDate || null
    if ('flagged' in updates) updateData.flagged = updates.flagged
    if ('subtasks' in updates) updateData.subtasks = updates.subtasks

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Supprime une tâche
   */
  async deleteTask(taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error
  },

  // --- Gestion des tâches rapides ---
  
  /**
   * Récupère toutes les tâches rapides
   */
  async getQuickTasks() {
    const { data, error } = await supabase
      .from('quick_tasks')
      .select('*')
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
   * Supprime une tâche rapide
   */
  async deleteQuickTask(quickTaskId) {
    const { error } = await supabase
      .from('quick_tasks')
      .delete()
      .eq('id', quickTaskId)

    if (error) throw error
  }
}