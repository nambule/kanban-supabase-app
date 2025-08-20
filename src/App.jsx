import React, { useState, useMemo, useRef, useEffect } from 'react'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import {
  Plus,
  Search,
  Filter as FilterIcon,
  ChevronDown
} from 'lucide-react'

import { useTasks } from './hooks/useTasks'
import { useQuickTasks } from './hooks/useQuickTasks'
import TaskCard from './components/TaskCard'
import TaskModal from './components/TaskModal'
import QuickTasksModal from './components/QuickTasksModal'

import {
  COMPARTMENTS,
  PRIORITIES,
  STATUSES,
  PRIORITY_STYLES,
  PRIORITY_DOT,
  STATUS_COLORS,
  COMPARTMENT_COLORS,
  WHEN_ORDER,
  PRIORITY_RANK
} from './utils/constants'
import { badgeStyle, compStyle } from './utils/helpers'

/**
 * Application Kanban principale avec intégration Supabase
 */
function App() {
  // État local de l'interface
  const [groupBy, setGroupBy] = useState("compartment")
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState({ 
    P1: true, P2: true, P3: true, P4: true, P5: true 
  })
  const [statusFilterState, setStatusFilterState] = useState({ 
    "À faire": true, "À analyser": true, "En cours": true, "Terminé": false 
  })
  const [sortBy, setSortBy] = useState("none")
  const [modal, setModal] = useState({ 
    open: false, editingId: null, initialColumn: null, prefillTitle: "", fromQuickId: null 
  })
  const [quickOpen, setQuickOpen] = useState(false)

  // Hooks personnalisés pour les données
  const { 
    tasks, 
    order, 
    loading: tasksLoading, 
    error: tasksError,
    createTask, 
    updateTask, 
    deleteTask, 
    reorderTasks 
  } = useTasks()

  const { 
    quickTasks, 
    loading: quickLoading, 
    error: quickError,
    addQuickTask, 
    removeQuickTask 
  } = useQuickTasks()

  // Référence pour fermer les filtres
  const filterRef = useRef(null)

  // Fermer les filtres au clic extérieur ou Escape
  useEffect(() => {
    function onDocMouseDown(e) {
      const el = filterRef.current
      if (el && el.open && !el.contains(e.target)) {
        try { el.open = false } catch(_) {}
        el.removeAttribute('open')
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        const el = filterRef.current
        if (el && el.open) { 
          try { el.open = false } catch(_) {} 
          el.removeAttribute('open') 
        }
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Colonnes selon le groupement
  const columns = groupBy === "compartment" ? COMPARTMENTS 
    : groupBy === "priority" ? PRIORITIES 
    : STATUSES

  // Filtrage et tri des tâches visibles
  const visibleIdsByColumn = useMemo(() => {
    const current = (order && order[groupBy]) || {}
    const res = {}
    
    columns.forEach((col) => {
      let ids = (current[col] || []).filter((id) => {
        const t = tasks[id]
        if (!t) return false
        
        const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
        const matchesPriority = priorityFilter[t.priority]
        const matchesStatus = statusFilterState[t.status]
        
        return matchesSearch && matchesPriority && matchesStatus
      })
      
      // Fonctions de tri
      const priorityRank = (id) => {
        const prio = tasks[id]?.priority
        return (prio && PRIORITY_RANK[prio]) ? PRIORITY_RANK[prio] : 99
      }
      
      const whenRank = (id) => (WHEN_ORDER[tasks[id]?.when || ""]) || 99
      
      // Appliquer le tri
      if (sortBy === "priorityAsc") {
        ids.sort((a,b) => priorityRank(a) - priorityRank(b))
      } else if (sortBy === "priorityDesc") {
        ids.sort((a,b) => priorityRank(b) - priorityRank(a))
      } else if (sortBy === "whenAsc") {
        ids.sort((a,b) => whenRank(a) - whenRank(b))
      } else if (sortBy === "whenDesc") {
        ids.sort((a,b) => whenRank(b) - whenRank(a))
      }
      
      res[col] = ids
    })
    
    return res
  }, [order, groupBy, columns, tasks, search, priorityFilter, statusFilterState, sortBy])

  // Colonnes affichées (masquer "Terminé" si vide et pas filtré)
  const displayedColumns = useMemo(() => {
    let cols = columns
    if (groupBy === "status") {
      cols = cols.filter(c => !(
        c === "Terminé" && 
        (!statusFilterState["Terminé"] || (visibleIdsByColumn[c]?.length || 0) === 0)
      ))
    }
    return cols
  }, [columns, groupBy, statusFilterState, visibleIdsByColumn])

  // Gestion du drag & drop
  const onDragEnd = (result) => {
    reorderTasks(result.source, result.destination, result.draggableId, groupBy)
  }

  // Gestion des modales
  const openCreate = (initialColumn) => {
    setModal({ 
      open: true, editingId: null, initialColumn, prefillTitle: "", fromQuickId: null 
    })
  }

  const openEdit = (id) => {
    setModal({ 
      open: true, editingId: id, initialColumn: null, prefillTitle: "", fromQuickId: null 
    })
  }

  const closeModal = () => {
    setModal({ 
      open: false, editingId: null, initialColumn: null, prefillTitle: "", fromQuickId: null 
    })
  }

  // Sauvegarde d'une tâche
  const handleSaveTask = async (taskData) => {
    if (taskData.id) {
      await updateTask(taskData.id, taskData)
    } else {
      await createTask(taskData)
    }
    
    // Supprimer la tâche rapide si applicable
    if (taskData.fromQuickId) {
      await removeQuickTask(taskData.fromQuickId)
    }
    
    closeModal()
  }

  // Classification d'une tâche rapide
  const handleClassifyQuickTask = (quickId) => {
    const quickTask = quickTasks.find(x => x.id === quickId)
    if (!quickTask) return
    
    setModal({ 
      open: true, 
      editingId: null, 
      initialColumn: null, 
      prefillTitle: quickTask.title, 
      fromQuickId: quickId 
    })
    setQuickOpen(false)
  }

  // Réinitialiser les filtres
  const resetFilters = () => {
    setPriorityFilter({ P1: true, P2: true, P3: true, P4: true, P5: true })
    setStatusFilterState({ "À faire": true, "À analyser": true, "En cours": true, "Terminé": true })
  }

  // Affichage du chargement initial
  if (tasksLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Chargement...</div>
      </div>
    )
  }

  // Affichage des erreurs
  if (tasksError || quickError) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="text-red-600">
          Erreur: {tasksError || quickError}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-xl font-semibold tracking-tight">My Board</div>

          <div className="ml-auto flex items-center gap-2">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Rechercher…"
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 outline-none text-sm" 
              />
            </div>

            {/* Filtres */}
            <details ref={filterRef} className="relative">
              <summary className="list-none select-none inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm cursor-pointer">
                <FilterIcon className="h-4 w-4" /> Filtres <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-30">
                <div className="text-xs font-medium uppercase text-slate-500 mb-2">Priorité</div>
                {PRIORITIES.map((p) => (
                  <label key={p} className="flex items-center gap-2 py-1 text-sm">
                    <input 
                      type="checkbox" 
                      checked={priorityFilter[p]} 
                      onChange={() => setPriorityFilter(s => ({ ...s, [p]: !s[p] }))} 
                    />
                    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${PRIORITY_STYLES[p]}`}>
                      <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[p]}`}></span>
                      {p}
                    </span>
                  </label>
                ))}
                
                <div className="text-xs font-medium uppercase text-slate-500 mt-3 mb-2">Statut</div>
                {STATUSES.map((s) => (
                  <label key={s} className="flex items-center gap-2 py-1 text-sm">
                    <input 
                      type="checkbox" 
                      checked={statusFilterState[s]} 
                      onChange={() => setStatusFilterState(x => ({ ...x, [s]: !x[s] }))} 
                    />
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
                      style={badgeStyle(STATUS_COLORS[s])}
                    >
                      {s}
                    </span>
                  </label>
                ))}
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">Réinitialiser filtres</div>
                  <button 
                    onClick={resetFilters} 
                    className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            </details>

            {/* Groupement */}
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="text-slate-500">Regrouper par</span>
              <select 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value)} 
                className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                <option value="compartment">Compartiment</option>
                <option value="priority">Priorité</option>
                <option value="status">Statut</option>
              </select>
            </div>

            {/* Tri */}
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="text-slate-500">Trier</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)} 
                className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                <option value="none">Aucun</option>
                <option value="priorityAsc">P1→P5</option>
                <option value="priorityDesc">P5→P1</option>
                <option value="whenAsc">Quand↑</option>
                <option value="whenDesc">Quand↓</option>
              </select>
            </div>

            {/* Tâche rapide */}
            <button 
              onClick={() => setQuickOpen(true)} 
              className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              Tâche rapide
            </button>
          </div>
        </div>
      </header>

      {/* Tableau Kanban */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div 
            className="grid gap-4" 
            style={{ gridTemplateColumns: `repeat(${displayedColumns.length}, minmax(220px, 1fr))` }}
          >
            {displayedColumns.map((col) => (
              <div key={col} className="flex flex-col">
                <div className="mb-2 rounded-2xl border overflow-hidden shadow-sm">
                  {/* En-tête de colonne */}
                  <div 
                    className="flex items-center justify-between px-2 py-1.5" 
                    style={groupBy === 'compartment' 
                      ? compStyle(COMPARTMENT_COLORS[col] || COMPARTMENT_COLORS.PM) 
                      : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold ${groupBy === 'compartment' ? '' : 'text-slate-700'}`}>
                        {col}
                      </div>
                      <span className={`text-xs ${groupBy === 'compartment' ? 'opacity-70' : 'text-slate-400'}`}>
                        {visibleIdsByColumn[col]?.length || 0}
                      </span>
                    </div>
                    <button 
                      onClick={() => openCreate(col)} 
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200"
                    >
                      <Plus className="h-4 w-4" /> Ajouter
                    </button>
                  </div>

                  {/* Zone de drop */}
                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`min-h-[120px] p-2 ${
                          snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-white'
                        }`}
                      >
                        {(visibleIdsByColumn[col] || []).map((id, index) => (
                          <TaskCard 
                            key={id} 
                            id={id} 
                            index={index} 
                            task={tasks[id]} 
                            onEdit={() => openEdit(id)} 
                            onUpdate={updateTask}
                            groupBy={groupBy} 
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Modale de tâche */}
      {modal.open && (
        <TaskModal
          onClose={closeModal}
          onSave={handleSaveTask}
          onDelete={deleteTask}
          tasks={tasks}
          editingId={modal.editingId}
          initialColumn={modal.initialColumn}
          groupBy={groupBy}
          prefillTitle={modal.prefillTitle}
          fromQuickId={modal.fromQuickId}
          loading={false}
        />
      )}

      {/* Modale des tâches rapides */}
      {quickOpen && (
        <QuickTasksModal
          onClose={() => setQuickOpen(false)}
          onAdd={addQuickTask}
          onRemove={removeQuickTask}
          onClassify={handleClassifyQuickTask}
          quickTasks={quickTasks}
          loading={quickLoading}
        />
      )}
    </div>
  )
}

export default App