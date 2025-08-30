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
  PRIORITIES,
  STATUSES,
  PRIORITY_STYLES,
  PRIORITY_DOT,
  STATUS_COLORS,
  COMPARTMENT_COLORS,
  WHEN_ORDER,
  PRIORITY_RANK
} from './utils/constants'
import { useCompartments } from './hooks/useCompartments'
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
  const { compartments: compartmentObjects, compartmentNames } = useCompartments()
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
  const [authMode, setAuthMode] = useState('signin')

  // Gestion du mode sombre
  useEffect(() => {
    localStorage.setItem('kanban-dark-mode', JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Listen for compartment updates from settings
  useEffect(() => {
    const handleCompartmentUpdate = (event) => {
      setCompartments(event.detail.compartments)
    }

    window.addEventListener('compartmentsUpdated', handleCompartmentUpdate)
    
    return () => {
      window.removeEventListener('compartmentsUpdated', handleCompartmentUpdate)
    }
  }, [])

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
  const columns = groupBy === "compartment" ? compartmentNames 
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

  // Check if all compartments are empty (no tasks at all)
  const hasAnyTasks = Object.keys(tasks).length > 0
  const allColumnsEmpty = displayedColumns.every(col => (visibleIdsByColumn[col]?.length || 0) === 0)

  // Gestion du drag & drop
  const onDragEnd = (result) => {
    reorderTasks(result.source, result.destination, result.draggableId, groupBy, compartmentObjects)
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
    // Map compartment name to ID for database operations
    let processedTaskData = { ...taskData }
    if (taskData.compartment && !taskData.compartmentId) {
      console.log(`🔍 Looking for compartment: "${taskData.compartment}"`)
      console.log('Available compartments:', compartmentObjects?.map(c => ({ id: c.id, name: c.name })))
      
      const compartment = compartmentObjects?.find(c => c.name === taskData.compartment)
      if (compartment) {
        processedTaskData.compartmentId = compartment.id
        console.log(`✅ Mapped compartment "${taskData.compartment}" to ID ${compartment.id}`)
      } else {
        console.error(`❌ Could not find compartment with name "${taskData.compartment}"`)
        // Don't proceed without a compartment ID
        alert(`Error: Could not find compartment "${taskData.compartment}". Please try refreshing the page.`)
        return
      }
    }
    
    if (processedTaskData.id) {
      await updateTask(processedTaskData.id, processedTaskData)
    } else {
      await createTask(processedTaskData)
    }
    
    // Supprimer la tâche rapide si applicable
    if (processedTaskData.fromQuickId) {
      await removeQuickTask(processedTaskData.fromQuickId)
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <div className="max-w-4xl w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Image and features */}
              <div className="order-2 lg:order-1">
                <div className="relative">
                  {/* Task Board Illustration */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Design Column */}
                      <div className="space-y-3">
                        <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-medium text-center">
                          Design
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-3/4"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-1/2"></div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-2/3"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-4/5"></div>
                        </div>
                      </div>
                      
                      {/* Development Column */}
                      <div className="space-y-3">
                        <div className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-lg text-sm font-medium text-center">
                          Development
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-4/5"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-1/3"></div>
                        </div>
                      </div>
                      
                      {/* Launch Column */}
                      <div className="space-y-3">
                        <div className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-lg text-sm font-medium text-center">
                          Launch
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-3/5"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-4/5"></div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-1/2"></div>
                          <div className="h-2 bg-slate-300 dark:bg-slate-500 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating elements for visual appeal */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-500 rounded-full opacity-60 animate-pulse"></div>
                  <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-emerald-500 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                
                {/* Features list */}
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Start simple, grow complex</h3>
                  
                  <div className="grid gap-2">
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Drag & drop simplicity</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>Customize everything</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Power features when you need them</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      <span>Your workflow, your way</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side - Sign in content */}
              <div className="order-1 lg:order-2 text-center lg:text-left space-y-8">
                <div>
                  <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                    <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">My Task Board</h1>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                      FREE
                    </span>
                  </div>
                  <p className="text-xl text-slate-600 dark:text-slate-400 mb-2">Organize your tasks efficiently</p>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-3">As simple or as powerful as you need it to be</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">✨ Completely free to use • No limits • No ads</p>
                </div>
                
                <div className="space-y-6">
                  {/* Primary CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => {
                        setAuthMode('signup')
                        setAuthOpen(true)
                      }}
                      className="flex-1 px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 font-semibold text-base transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      Sign Up Free
                    </button>
                    <button 
                      onClick={() => {
                        setAuthMode('signin')
                        setAuthOpen(true)
                      }}
                      className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-base transition-all duration-200"
                    >
                      Sign In
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">No credit card required • Get started in seconds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {authOpen && (
          <AuthModal
            onClose={() => setAuthOpen(false)}
            onSignIn={signIn}
            onSignUp={signUp}
            loading={authLoading}
            error={authError}
            defaultMode={authMode}
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
                      ? (() => {
                          const compartmentObj = compartmentObjects.find(c => c.name === col)
                          if (compartmentObj && compartmentObj.color_bg) {
                            return compStyle({
                              bg: compartmentObj.color_bg,
                              text: compartmentObj.color_text,
                              border: compartmentObj.color_border
                            })
                          }
                          return compStyle(COMPARTMENT_COLORS[col] || COMPARTMENT_COLORS.PM)
                        })()
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

        {/* Empty State Guide - shown when no tasks exist */}
        {!hasAnyTasks && (
          <div className="mt-8 text-center">
            <div className="max-w-2xl mx-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Welcome to your Kanban Board! 🎯
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Get started by creating your first task. Here's how the board works:
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Create Tasks</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Click the <strong>"Add"</strong> button in any compartment to create a new task
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span className="text-green-600 dark:text-green-400 text-sm font-semibold">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Organize</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Drag and drop tasks between compartments and set priorities
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                      <span className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Manage Compartments</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Click your profile menu → <strong>"Settings"</strong> to customize compartment names and colors
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-400 text-sm font-semibold">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Track Progress</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Use different compartments to organize work by team, project, or workflow stage
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                      <span className="text-orange-600 dark:text-orange-400 text-sm font-semibold">5</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">Quick Tasks</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Use <strong>"Quick Task"</strong> for rapid idea capture, then organize later
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  💡 <strong>Tip:</strong> You can group tasks by Compartment, Priority, or Status using the dropdown above
                </p>
                <button 
                  onClick={() => openCreate(displayedColumns[0])} 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Task
                </button>
              </div>
            </div>
          </div>
        )}
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
          compartments={compartmentNames}
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