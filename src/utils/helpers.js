import { WHEN_COLORS, STATUS_COLORS, SIZE_COLORS, COMPARTMENT_COLORS, STATUS_MAPPING, WHEN_MAPPING } from './constants'

// Fonctions utilitaires pour l'application Kanban

export const uid = () => Math.random().toString(36).slice(2, 10)

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const formatDateFR = (iso) => 
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })

export const isPast = (iso) => 
  iso && new Date(iso).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)

export const addDaysISO = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Fonctions de style
export const styleWhen = (value) => ({
  backgroundColor: WHEN_COLORS[value]?.bg || "#F8FAFC",
  color: WHEN_COLORS[value]?.text || "#64748B"
})

export const badgeStyle = (colorConfig) => ({
  backgroundColor: colorConfig.bg,
  color: colorConfig.text,
  borderColor: colorConfig.border
})

export const compStyle = (colorConfig) => ({
  backgroundColor: colorConfig.bg,
  color: colorConfig.text,
  borderColor: colorConfig.border
})

// Conversion des données Supabase vers le format frontend avec normalisation
export const transformTaskFromDB = (dbTask) => {
  if (!dbTask) return null
  
  return {
    id: dbTask.id,
    title: dbTask.title,
    priority: dbTask.priority,
    compartment: dbTask.compartment,
    status: STATUS_MAPPING[dbTask.status] || dbTask.status, // Normaliser le statut
    size: dbTask.size,
    note: dbTask.note,
    when: WHEN_MAPPING[dbTask.when] || dbTask.when, // Normaliser le when
    dueDate: dbTask.due_date,
    flagged: dbTask.flagged,
    subtasks: dbTask.subtasks || [],
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at
  }
}

// Conversion des données frontend vers le format Supabase
export const transformTaskToDB = (task) => {
  return {
    title: task.title,
    priority: task.priority,
    compartment: task.compartment,
    status: task.status,
    size: task.size,
    note: task.note || '',
    when: task.when || '',
    due_date: task.dueDate || null,
    flagged: task.flagged || false,
    subtasks: task.subtasks || []
  }
}

// Gestion de l'ordre des colonnes
export const createEmptyOrder = (compartments, priorities, statuses) => {
  return {
    compartment: Object.fromEntries(compartments.map((c) => [c, []])),
    priority: Object.fromEntries(priorities.map((p) => [p, []])),
    status: Object.fromEntries(statuses.map((s) => [s, []]))
  }
}

// Réorganise l'ordre des tâches selon leur groupement
export const reorganizeTaskOrder = (tasks, groupBy) => {
  const order = createEmptyOrder(
    ["PM", "CPO", "FER", "NOVAE", "MRH", "CDA"],
    ["P1", "P2", "P3", "P4", "P5"],
    ["To Do", "To Analyze", "In Progress", "Done"]
  )

  Object.values(tasks).forEach(task => {
    if (task.compartment && order.compartment[task.compartment]) {
      order.compartment[task.compartment].push(task.id)
    }
    if (task.priority && order.priority[task.priority]) {
      order.priority[task.priority].push(task.id)
    }
    if (task.status && order.status[task.status]) {
      order.status[task.status].push(task.id)
    }
  })

  return order
}