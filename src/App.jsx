import React, { useState, useMemo, useRef, useEffect } from 'react'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import {
  Plus,
  Search,
  Filter as FilterIcon,
  ChevronDown,
  Eye,
  Moon,
  Sun
} from 'lucide-react'

import { useTasks } from './hooks/useTasks'
import { useQuickTasks } from './hooks/useQuickTasks'
import { useAuth } from './hooks/useAuth'
import TaskCard from './components/TaskCard'
import TaskModal from './components/TaskModal'
import QuickTasksModal from './components/QuickTasksModal'
import AuthModal from './components/AuthModal'
import AccountMenu from './components/AccountMenu'

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
  const [viewMode, setViewMode] = useState("full")
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('kanban-dark-mode')
    return saved ? JSON.parse(saved) : false
  })
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState({ 
    P1: true, P2: true, P3: true, P4: true, P5: true 
  })
  const [statusFilterState, setStatusFilterState] = useState({ 
    "To Do": true, "To Analyze": true, "In Progress": true, "Done": false 
  })
  const [sortBy, setSortBy] = useState("none")
  const [modal, setModal] = useState({ 
    open: false, editingId: null, initialColumn: null, prefillTitle: "", fromQuickId: null 
  })
  const [quickOpen, setQuickOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  // Gestion du mode sombre
  useEffect(() => {
    localStorage.setItem('kanban-dark-mode', JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Hook d'authentification
  const { 
    user, 
    loading: authLoading, 
    error: authError,
    signIn, 
    signUp, 
    signOut, 
    isAuthenticated 
  } = useAuth()

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

  // Référence pour fermer les filtres et menu visualisation
  const filterRef = useRef(null)
  const viewRef = useRef(null)

  // Fermer les filtres et menu visualisation au clic extérieur ou Escape
  useEffect(() => {
    function onDocMouseDown(e) {
      const filterEl = filterRef.current
      const viewEl = viewRef.current
      
      if (filterEl && filterEl.open && !filterEl.contains(e.target)) {
        try { filterEl.open = false } catch(_) {}
        filterEl.removeAttribute('open')
      }
      
      if (viewEl && viewEl.open && !viewEl.contains(e.target)) {
        try { viewEl.open = false } catch(_) {}
        viewEl.removeAttribute('open')
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        const filterEl = filterRef.current
        const viewEl = viewRef.current
        
        if (filterEl && filterEl.open) { 
          try { filterEl.open = false } catch(_) {} 
          filterEl.removeAttribute('open') 
        }
        if (viewEl && viewEl.open) { 
          try { viewEl.open = false } catch(_) {} 
          viewEl.removeAttribute('open') 
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
        c === "Done" && 
        (!statusFilterState["Done"] || (visibleIdsByColumn[c]?.length || 0) === 0)
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
    setStatusFilterState({ "To Do": true, "To Analyze": true, "In Progress": true, "Done": true })
  }

  // Affichage du chargement de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    )
  }

  // Redirection vers l'authentification si pas connecté
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">My Kanban Board</h1>
            <p className="text-slate-600 dark:text-slate-400">Organize your tasks efficiently</p>
          </div>
          <button 
            onClick={() => setAuthOpen(true)}
            className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
        {authOpen && (
          <AuthModal
            onClose={() => setAuthOpen(false)}
            onSignIn={signIn}
            onSignUp={signUp}
            loading={authLoading}
            error={authError}
          />
        )}
      </div>
    )
  }

  // Affichage du chargement des tâches
  if (tasksLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    )
  }

  // Affichage des erreurs
  if (tasksError || quickError) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">
          Error: {tasksError || quickError}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">My Board</div>

          <div className="ml-auto flex items-center gap-2">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search…"
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-slate-300 dark:focus:border-slate-600 outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" 
              />
            </div>

            {/* Filtres */}
            <details ref={filterRef} className="relative">
              <summary className="list-none select-none inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm cursor-pointer text-slate-900 dark:text-white">
                <FilterIcon className="h-4 w-4" /> Filters <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl z-30">
                <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-2">Priority</div>
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
                
                <div className="text-xs font-medium uppercase text-slate-500 mt-3 mb-2">Status</div>
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
                  <div className="text-xs text-slate-500">Reset filters</div>
                  <button 
                    onClick={resetFilters} 
                    className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </details>

            {/* Groupement */}
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Group by</span>
              <select 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value)} 
                className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
              >
                <option value="compartment">Compartment</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Tri */}
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">Sort</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)} 
                className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
              >
                <option value="none">None</option>
                <option value="priorityAsc">P1→P5</option>
                <option value="priorityDesc">P5→P1</option>
                <option value="whenAsc">When↑</option>
                <option value="whenDesc">When↓</option>
              </select>
            </div>

            {/* View Mode & Dark Mode */}
            <details ref={viewRef} className="relative">
              <summary className="list-none select-none inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm cursor-pointer text-slate-900 dark:text-white">
                <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span>View</span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl z-50">
                <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-2">Display Mode</div>
                <div className="space-y-2 mb-4">
                  {[
                    { value: "compact", label: "Compact", desc: "Title + Priority only" },
                    { value: "standard", label: "Standard", desc: "Everything except when selector" },
                    { value: "full", label: "Full", desc: "All elements visible" }
                  ].map((mode) => (
                    <label key={mode.value} className="flex items-start gap-2 py-1 cursor-pointer">
                      <input 
                        type="radio" 
                        name="viewMode" 
                        value={mode.value}
                        checked={viewMode === mode.value}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="mt-0.5"
                      />
                      <div className="text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">{mode.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{mode.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400 mb-2">Theme</div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition-colors"
                  >
                    {darkMode ? (
                      <>
                        <Sun className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-slate-900 dark:text-white">Switch to Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-900">Switch to Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </details>

            {/* Tâche rapide */}
            <button 
              onClick={() => setQuickOpen(true)} 
              className="relative inline-flex items-center gap-1 text-sm px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
            >
Quick Task
              {quickTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {quickTasks.length}
                </span>
              )}
            </button>

            {/* Menu compte utilisateur */}
            <AccountMenu user={user} onSignOut={signOut} />
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
                <div className="mb-2 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm bg-white dark:bg-slate-800">
                  {/* En-tête de colonne */}
                  <div 
                    className="flex items-center justify-between px-2 py-1.5" 
                    style={groupBy === 'compartment' 
                      ? compStyle(COMPARTMENT_COLORS[col] || COMPARTMENT_COLORS.PM) 
                      : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold ${groupBy === 'compartment' ? '' : 'text-slate-700 dark:text-slate-300'}`}>
                        {col}
                      </div>
                      <span className={`text-xs ${groupBy === 'compartment' ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>
                        {visibleIdsByColumn[col]?.length || 0}
                      </span>
                    </div>
                    <button 
                      onClick={() => openCreate(col)} 
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>

                  {/* Zone de drop */}
                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`min-h-[120px] p-2 relative ${
                          snapshot.isDraggingOver ? 'bg-slate-100 dark:bg-slate-700' : 'bg-white dark:bg-slate-800'
                        }`}
                        style={{ overflow: 'visible' }}
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
                            viewMode={viewMode}
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