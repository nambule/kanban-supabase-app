import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Select, SelectTrigger, SelectContent, SelectItem } from './ui/Select'
import { 
  PRIORITIES, 
  COMPARTMENTS, 
  STATUSES, 
  SIZES,
  PRIORITY_STYLES,
  PRIORITY_DOT,
  STATUS_COLORS,
  SIZE_COLORS
} from '../utils/constants'
import { badgeStyle } from '../utils/helpers'

/**
 * Modale pour créer/éditer une tâche
 */
const TaskModal = ({ 
  onClose, 
  onSave, 
  onDelete, 
  tasks = {}, 
  editingId, 
  initialColumn, 
  groupBy, 
  prefillTitle = "", 
  fromQuickId = null,
  loading = false
}) => {
  const editing = editingId ? tasks[editingId] : null
  
  const [title, setTitle] = useState(editing?.title || prefillTitle || "")
  const [priority, setPriority] = useState(
    editing?.priority || 
    (groupBy === "priority" && PRIORITIES.includes(initialColumn) ? initialColumn : "P3")
  )
  const [compartment, setCompartment] = useState(
    editing?.compartment || 
    (fromQuickId ? "" : (groupBy === "compartment" && COMPARTMENTS.includes(initialColumn) ? initialColumn : COMPARTMENTS[0]))
  )
  const [status, setStatus] = useState(
    editing?.status || 
    (groupBy === "status" && STATUSES.includes(initialColumn) ? initialColumn : "À faire")
  )
  const [size, setSize] = useState(editing?.size || "M")
  const [note, setNote] = useState(editing?.note || "")
  const [dueDate, setDueDate] = useState(editing?.dueDate || "")
  const [flagged, setFlagged] = useState(!!editing?.flagged)
  
  // Normaliser les sous-tâches
  const normalizeSubtasks = (arr) => 
    (arr || []).map((s) => s.status ? s : { ...s, status: s.done ? "Terminé" : "À faire" })
  
  const [subtasks, setSubtasks] = useState(normalizeSubtasks(editing?.subtasks || []))
  const [subInput, setSubInput] = useState("")

  const handleAddSubtask = () => {
    if (!subInput.trim()) return
    setSubtasks(prev => [...prev, { 
      id: Math.random().toString(36).slice(2, 10), 
      title: subInput.trim(), 
      status: "À faire" 
    }])
    setSubInput("")
  }

  const handleRemoveSubtask = (id) => {
    setSubtasks(prev => prev.filter(x => x.id !== id))
  }

  const handleSubtaskStatusChange = (subId, newStatus) => {
    setSubtasks(prev => prev.map(x => x.id === subId ? { ...x, status: newStatus } : x))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) return
    if (fromQuickId && !compartment) return
    
    const taskData = {
      id: editing?.id,
      title: title.trim(),
      priority,
      compartment,
      status,
      size,
      note,
      dueDate,
      flagged,
      subtasks,
      fromQuickId
    }
    
    try {
      await onSave(taskData)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    
    try {
      await onDelete(editingId)
      onClose()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} 
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} 
      tabIndex={-1}
    >
      <div className="w-full max-w-xl max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0 max-h-full">
          {/* En-tête */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold">
              {editing ? "Modifier la tâche" : "Nouvelle tâche"}
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Titre */}
            <div>
              <label className="text-sm text-slate-600">Titre</label>
              <input 
                autoFocus 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Ex. Export vers portail"
                disabled={loading}
              />
            </div>

            {/* Priorité et Compartiment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Priorité</label>
                <div className="mt-1">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${PRIORITY_STYLES[priority]}`}>
                          <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[priority]}`}></span>
                          {priority}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${PRIORITY_STYLES[p]}`}>
                            <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[p]}`}></span>
                            {p}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Compartiment</label>
                <select 
                  value={compartment} 
                  onChange={(e) => setCompartment(e.target.value)} 
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" 
                  required={!!fromQuickId}
                  disabled={loading}
                >
                  {fromQuickId && (<option value="">— choisir —</option>)}
                  {COMPARTMENTS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Statut et Charge */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Statut</label>
                <div className="mt-1">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                      <div className="flex items-center">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                          style={badgeStyle(STATUS_COLORS[status])}
                        >
                          {status}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                            style={badgeStyle(STATUS_COLORS[s])}
                          >
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Charge (T‑shirt)</label>
                <div className="mt-1">
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                      <div className="flex items-center">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                          style={badgeStyle(SIZE_COLORS[size])}
                        >
                          {size}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                            style={badgeStyle(SIZE_COLORS[s])}
                          >
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Échéance et Flag */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Échéance</label>
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  disabled={loading}
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm mt-auto">
                  <input 
                    type="checkbox" 
                    checked={flagged} 
                    onChange={() => setFlagged(f => !f)}
                    disabled={loading}
                  />
                  Marquer comme à risque
                </label>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-sm text-slate-600">Note</label>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Note interne (non affichée sur le board)" 
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 h-28"
                disabled={loading}
              />
            </div>

            {/* Sous-tâches */}
            <div>
              <div className="text-sm text-slate-600">Sous-tâches</div>
              <div className="mt-2 flex gap-2">
                <input 
                  value={subInput} 
                  onChange={(e) => setSubInput(e.target.value)} 
                  placeholder="Ajouter une sous-tâche"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  onClick={handleAddSubtask} 
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 max-h-36 overflow-auto">
                {subtasks.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <span className={s.status === "Terminé" ? "line-through text-slate-400" : ""}>
                        {s.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {["À faire", "En cours", "Terminé"].map(status => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleSubtaskStatusChange(s.id, status)}
                            className={`px-2 py-0.5 rounded-full border text-xs transition-all ${
                              s.status === status 
                                ? 'ring-2 ring-blue-300' 
                                : 'hover:scale-105'
                            }`}
                            style={badgeStyle(STATUS_COLORS[status])}
                            title={`Marquer comme: ${status}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSubtask(s.id)} 
                        className="text-slate-400 hover:text-red-600 ml-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {subtasks.length === 0 && (
                  <li className="px-3 py-2 text-xs text-slate-400">
                    Pas encore de sous-tâches
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Pied avec boutons */}
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            {editing && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className="mr-auto px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                disabled={loading}
              >
                Supprimer
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={loading || !title.trim() || (fromQuickId && !compartment)}
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal