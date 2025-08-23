import React, { useEffect, useMemo, useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus,
  Search,
  Filter as FilterIcon,
  Calendar as CalendarIcon,
  AlertTriangle,
  X,
  ChevronDown,
  FileText,
  Eye,
  CheckSquare
} from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

/**
 * Kanban web app – single-file React component (JSX)
 * - TailwindCSS for styling
 * - Drag & drop with @hello-pangea/dnd
 * - LocalStorage persistence
 * - Grouping: Compartiment / Priorité / Statut
 * - Recherche + filtres par priorité
 * - Titre cliquable pour éditer (pas de bouton "Modifier")
 * - Champs supplémentaires: Statut & Charge (taille T‑shirt)
 */

// --- Constantes et helpers UI ---
const COMPARTMENTS = ["PM", "CPO", "FER", "NOVAE", "MRH", "CDA"];
const PRIORITIES = ["P1", "P2", "P3", "P4", "P5"];
const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 };
const STATUSES = ["À faire", "À analyser", "En cours", "Terminé"];
const SIZES = ["S", "M", "L", "XL", "XXL"];
const WHEN_OPTIONS = ["", "Aujourd'hui", "Cette semaine", "Semaine prochaine", "Ce mois-ci"];
const WHEN_COLORS = {
  "": { bg: "#F8FAFC", text: "#64748B" },               // slate-50 / 500 (très clair)
  "Aujourd'hui": { bg: "#FEE2E2", text: "#B91C1C" },    // red-100 / 700
  "Cette semaine": { bg: "#FFEDD5", text: "#C2410C" },  // orange-100 / 700
  "Semaine prochaine": { bg: "#FEF9C3", text: "#A16207" }, // amber-100 / 700 (jaune chaud)
  "Ce mois-ci": { bg: "#DBEAFE", text: "#1D4ED8" },     // blue-100 / 700
};
const styleWhen = (v) => ({ backgroundColor: (WHEN_COLORS[v]?.bg || "#F8FAFC"), color: (WHEN_COLORS[v]?.text || "#64748B") });
const WHEN_ORDER = { "Aujourd'hui": 1, "Cette semaine": 2, "Semaine prochaine": 3, "Ce mois-ci": 4, "": 5 };

const priorityStyles = {
  P1: "bg-red-100 text-red-700 border-red-200",
  P2: "bg-orange-100 text-orange-700 border-orange-200",
  P3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  P4: "bg-emerald-100 text-emerald-700 border-emerald-200",
  P5: "bg-blue-100 text-blue-700 border-blue-200",
};
const priorityDot = { P1: "bg-red-500", P2: "bg-orange-500", P3: "bg-yellow-500", P4: "bg-emerald-500", P5: "bg-blue-500" };

// Pastilles de couleur (HEX) pour Statut et Charge (taille)
const STATUS_COLORS = {
  "À faire":   { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" }, // slate-100/700/300
  "À analyser":{ bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" }, // sky-100/800/200
  "En cours":  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }, // amber-100/800/200
  "Terminé":   { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald-100/800/200
};
const SIZE_COLORS = {
  S:   { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald
  M:   { bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" }, // sky
  L:   { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" }, // violet
  XL:  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }, // amber
  XXL: { bg: "#FFE4E6", text: "#9F1239", border: "#FECDD3" }, // rose
};
const badgeStyle = (c) => ({ backgroundColor: c.bg, color: c.text, borderColor: c.border });

// Couleurs par compartiment (bandeau en tête de carte)
const COMPARTMENT_COLORS = {
  PM:   { bg: "#EEF2FF", text: "#3730A3", border: "#C7D2FE" }, // indigo soft
  CPO:  { bg: "#ECFEFF", text: "#155E75", border: "#A5F3FC" }, // cyan soft
  FER:  { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" }, // red soft
  NOVAE:{ bg: "#FAE8FF", text: "#6B21A8", border: "#F5D0FE" }, // purple soft
  MRH:  { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald soft
  CDA:  { bg: "#FFE4E6", text: "#9F1239", border: "#FECDD3" }, // rose soft
};
const compStyle = (c) => ({ backgroundColor: c.bg, color: c.text, borderColor: c.border });

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const formatDateFR = (iso) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const isPast = (iso) => iso && new Date(iso).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
function addDaysISO(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

// Order helpers
function emptyOrder() {
  return {
    compartment: Object.fromEntries(COMPARTMENTS.map((c) => [c, []])),
    priority: Object.fromEntries(PRIORITIES.map((p) => [p, []])),
    status: Object.fromEntries(STATUSES.map((s) => [s, []])),
  };
}

// --- Seed initial: aucun élément (l'utilisateur créera manuellement) ---
function seedEmpty() {
  return { tasks: {}, order: emptyOrder() };
}

const STORAGE_KEY = "kanban_rh_v4"; // inclut quickTasks dans le stockage

// Modale des tâches rapides
function QuickTasksModal({ onClose, onAdd, onRemove, onClassify, quickTasks }) {
  const [input, setInput] = useState("");
  function add() { const v = input.trim(); if(!v) return; onAdd(v); setInput(""); }
  
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }} onKeyDown={(e)=>{ if(e.key==='Escape') onClose(); }} tabIndex={-1}>
      <div className="w-full max-w-xl max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold">Tâches rapides</div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="flex gap-2">
            <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Titre de la tâche rapide" className="flex-1 rounded-xl border border-slate-300 px-3 py-2"/>
            <button onClick={add} className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"><Plus className="h-4 w-4"/></button>
          </div>
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 max-h-80 overflow-auto">
            {quickTasks.map(q => (
              <li key={q.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="truncate">{q.title}</div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>onClassify(q.id)} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs">Classer</button>
                  <button onClick={()=>onRemove(q.id)} className="text-slate-400 hover:text-red-600"><X className="h-4 w-4"/></button>
                </div>
              </li>
            ))}
            {quickTasks.length===0 && (
              <li className="px-3 py-8 text-center text-sm text-slate-400">Aucune tâche rapide pour le moment.</li>
            )}
          </ul>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200">Fermer</button>
        </div>
      </div>
    </div>
  );
}

// --- App ---
export default function AppKanban() {
  const [tasks, setTasks] = useState({});
  const [order, setOrder] = useState(emptyOrder());
  const [groupBy, setGroupBy] = useState("compartment"); // "compartment" | "priority" | "status"
  const [viewMode, setViewMode] = useState("full"); // "compact" | "standard" | "full"
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState({ P1: true, P2: true, P3: true, P4: true, P5: true });
  const [statusFilterState, setStatusFilterState] = useState({ "À faire": true, "À analyser": true, "En cours": true, "Terminé": false });
  const [sortBy, setSortBy] = useState("none"); // 'none' | 'priorityAsc' | 'priorityDesc'
  const [modal, setModal] = useState({ open: false, editingId: null, initialColumn: null, prefillTitle: "", fromQuickId: null });
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTasks, setQuickTasks] = useState([]);
  
  // Close filters popover on outside click / Escape
  const filterRef = useRef(null);
  useEffect(() => {
    function onDocMouseDown(e) {
      const el = filterRef.current;
      if (el && el.open && !el.contains(e.target)) {
        try { el.open = false; } catch(_) {}
        el.removeAttribute('open');
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        const el = filterRef.current;
        if (el && el.open) { try { el.open = false; } catch(_) {} el.removeAttribute('open'); }
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // load / persist
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.tasks && parsed.order) { setTasks(parsed.tasks); setOrder(parsed.order); setQuickTasks(parsed.quickTasks || []); return; }
      } catch (e) { /* ignore */ }
    }
    const s = seedEmpty(); setTasks(s.tasks); setOrder(s.order); setQuickTasks([]);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, order, quickTasks }));
  }, [tasks, order, quickTasks]);

  const columns = groupBy === "compartment" ? COMPARTMENTS : groupBy === "priority" ? PRIORITIES : STATUSES;

  const visibleIdsByColumn = useMemo(() => {
    const current = (order && order[groupBy]) || {};
    const res = {};
    columns.forEach((col) => {
      let ids = (current[col] || []).filter((id) => {
        const t = tasks[id]; if (!t) return false;
        const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
        const matchesPriority = priorityFilter[t.priority];
        const matchesStatus = statusFilterState[t.status];
        return matchesSearch && matchesPriority && matchesStatus;
      });
      const rank = (id) => {
        const prio = tasks[id]?.priority;
        return (prio && PRIORITY_RANK[prio]) ? PRIORITY_RANK[prio] : 99;
      };
      const whenRank = (id) => (WHEN_ORDER[tasks[id]?.when || ""]) || 99;
      if (sortBy === "priorityAsc") {
        ids.sort((a,b) => rank(a) - rank(b));
      } else if (sortBy === "priorityDesc") {
        ids.sort((a,b) => rank(b) - rank(a));
      } else if (sortBy === "whenAsc") {
        ids.sort((a,b) => whenRank(a) - whenRank(b));
      } else if (sortBy === "whenDesc") {
        ids.sort((a,b) => whenRank(b) - whenRank(a));
      }
      res[col] = ids;
    });
    return res;
  }, [order, groupBy, columns, tasks, search, priorityFilter, statusFilterState, sortBy]);

  const displayedColumns = useMemo(() => {
    let cols = columns;
    if (groupBy === "status") {
      cols = cols.filter(c => !(c === "Terminé" && (!statusFilterState["Terminé"] || (visibleIdsByColumn[c]?.length || 0) === 0)));
    }
    return cols;
  }, [columns, groupBy, statusFilterState, visibleIdsByColumn]);

  function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setOrder((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const fromList = Array.from(copy[groupBy][source.droppableId] || []);
      const toList = source.droppableId === destination.droppableId
        ? fromList
        : Array.from(copy[groupBy][destination.droppableId] || []);
      fromList.splice(source.index, 1);
      toList.splice(destination.index, 0, draggableId);
      copy[groupBy][source.droppableId] = fromList;
      copy[groupBy][destination.droppableId] = toList;
      return copy;
    });

    if (source.droppableId !== destination.droppableId) {
      setTasks((prev) => {
        const t = prev[draggableId]; if (!t) return prev;
        const updated = { ...prev };
        if (groupBy === "compartment") updated[draggableId] = { ...t, compartment: destination.droppableId };
        else if (groupBy === "priority") updated[draggableId] = { ...t, priority: destination.droppableId };
        else updated[draggableId] = { ...t, status: destination.droppableId };
        return updated;
      });
    }
  }

  function openCreate(initialColumn) { setModal({ open: true, editingId: null, initialColumn, prefillTitle: "", fromQuickId: null }); }
  function openEdit(id) { setModal({ open: true, editingId: id, initialColumn: null, prefillTitle: "", fromQuickId: null }); }
  function closeModal() { setModal({ open: false, editingId: null, initialColumn: null, prefillTitle: "", fromQuickId: null }); }

  function ensureInOrder(copy, tId, t) {
    // retire l'id de toutes les colonnes, puis l'ajoute aux bonnes
    for (const g of ["compartment", "priority", "status"]) {
      for (const col in copy[g]) {
        copy[g][col] = (copy[g][col] || []).filter((x) => x !== tId);
      }
    }
    // sécurise les clés manquantes
    if (!copy.compartment[t.compartment]) copy.compartment[t.compartment] = [];
    if (!copy.priority[t.priority]) copy.priority[t.priority] = [];
    if (!copy.status[t.status]) copy.status[t.status] = [];

    copy.compartment[t.compartment].push(tId);
    copy.priority[t.priority].push(tId);
    copy.status[t.status].push(tId);
  }
  function upsertTask(data) {
    if (!data.title?.trim()) return;

    if (data.id) {
      setTasks((prev) => ({ ...prev, [data.id]: { ...prev[data.id], ...data } }));
      setOrder((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        const t = { ...tasks[data.id], ...data };
        ensureInOrder(copy, data.id, t);
        return copy;
      });
    } else {
      const id = uid();
      const safePriority = PRIORITIES.includes(data.priority) ? data.priority : "P3";
      const safeStatus = STATUSES.includes(data.status) ? data.status : "À faire";
      const safeCompartment = COMPARTMENTS.includes(data.compartment) ? data.compartment : COMPARTMENTS[0];
      const t = {
        id,
        title: data.title,
        priority: safePriority,
        compartment: safeCompartment,
        status: safeStatus,
        size: data.size || "M",
        note: data.note || "",
        when: data.when || "",
        dueDate: data.dueDate || "",
        flagged: !!data.flagged,
        subtasks: data.subtasks || [],
        completion: data.completion || 0,
      };
      setTasks((prev) => ({ ...prev, [id]: t }));
      setOrder((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        ensureInOrder(copy, id, t);
        return copy;
      });
    }

    if (data.fromQuickId) setQuickTasks((qs) => qs.filter((q) => q.id !== data.fromQuickId));
    closeModal();
  }


  function toggleSubtask(taskId, subId) {
    setTasks((prev) => {
      const t = prev[taskId];
      const subtasks = (t.subtasks || []).map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
      return { ...prev, [taskId]: { ...t, subtasks } };
    });
  }
  
  function removeTask(id) {
    // supprime la tâche et la retire de tous les ordres (compartment/priority/status)
    setTasks((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setOrder((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      for (const g of ["compartment", "priority", "status"]) {
        for (const col in copy[g]) {
          copy[g][col] = (copy[g][col] || []).filter((x) => x !== id);
        }
      }
      return copy;
    });
  }
  
  function updateTask(id, patch) {
    setTasks(prev => {
      const t = prev[id]; if (!t) return prev;
      const next = { ...t, ...patch };
      return { ...prev, [id]: next };
    });
    if ('priority' in patch || 'compartment' in patch || 'status' in patch) {
      setOrder(prev => {
        const copy = JSON.parse(JSON.stringify(prev));
        const base = tasks[id] || {};
        const next = { ...base, ...patch };
        ensureInOrder(copy, id, next);
        return copy;
      });
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-xl font-semibold tracking-tight">My Board</div>

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…"
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 outline-none text-sm" />
            </div>

            {/* Filters popover */}
            <details ref={filterRef} className="relative">
              <summary className="list-none select-none inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm cursor-pointer">
                <FilterIcon className="h-4 w-4" /> Filtres <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="text-xs font-medium uppercase text-slate-500 mb-2">Priorité</div>
                {PRIORITIES.map((p) => (
                  <label key={p} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={priorityFilter[p]} onChange={() => setPriorityFilter((s) => ({ ...s, [p]: !s[p] }))} />
                    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${priorityStyles[p]}`}>
                      <span className={`h-2 w-2 rounded-full ${priorityDot[p]}`}></span>{p}
                    </span>
                  </label>
                ))}
                <div className="text-xs font-medium uppercase text-slate-500 mt-3 mb-2">Statut</div>
                {STATUSES.map((s) => (
                  <label key={s} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={statusFilterState[s]} onChange={() => setStatusFilterState((x) => ({ ...x, [s]: !x[s] }))} />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(STATUS_COLORS[s])}>{s}</span>
                  </label>
                ))}
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">Réinitialiser filtres</div>
                  <button onClick={() => { setPriorityFilter({ P1: true, P2: true, P3: true, P4: true, P5: true }); setStatusFilterState({ "À faire": true, "À analyser": true, "En cours": true, "Terminé": true }); }} className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200">Réinitialiser</button>
                </div>
              </div>
            </details>

            {/* Group by */}
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="text-slate-500">Regrouper par</span>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200">
                <option value="compartment">Compartiment</option>
                <option value="priority">Priorité</option>
                <option value="status">Statut</option>
              </select>
              </div>

              <div className="inline-flex items-center gap-2 text-sm">
                <span className="text-slate-500">Trier</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200">
                  <option value="none">Aucun</option>
                  <option value="priorityAsc">P1→P5</option>
                  <option value="priorityDesc">P5→P1</option>
                  <option value="whenAsc">Quand↑</option>
                  <option value="whenDesc">Quand↓</option>
                </select>
              </div>

              {/* View Mode */}
              <div className="inline-flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-slate-500" />
                <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200">
                  <option value="compact">Compact</option>
                  <option value="standard">Standard</option>
                  <option value="full">Full</option>
                </select>
              </div>

              <button onClick={() => setQuickOpen(true)} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800">Tâche rapide</button>
            </div>
        </div>
      </header>

      {/* Board */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${displayedColumns.length}, minmax(220px, 1fr))` }}>
            {displayedColumns.map((col) => (
              <div key={col} className="flex flex-col">
                <div className="mb-2 rounded-2xl border overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-2 py-1.5" style={groupBy==='compartment' ? compStyle(COMPARTMENT_COLORS[col] || COMPARTMENT_COLORS.PM) : undefined}>
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold ${groupBy==='compartment' ? '' : 'text-slate-700'}`}>{col}</div>
                      <span className={`text-xs ${groupBy==='compartment' ? 'opacity-70' : 'text-slate-400'}`}>{visibleIdsByColumn[col]?.length || 0}</span>
                    </div>
                    <button onClick={() => openCreate(col)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200">
                      <Plus className="h-4 w-4" /> Ajouter
                    </button>
                  </div>

                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={`min-h-[120px] p-2 ${snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-white'}`}
                      >
                        {(visibleIdsByColumn[col] || []).map((id, index) => (
                          <TaskCard key={id} id={id} index={index} task={tasks[id]} onEdit={() => openEdit(id)} onRemove={() => removeTask(id)} onToggleSubtask={toggleSubtask} onUpdate={updateTask} groupBy={groupBy} viewMode={viewMode} />
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

      {modal.open && (
        <TaskModal
          onClose={closeModal}
          onSave={upsertTask}
          onDelete={removeTask}
          tasks={tasks}
          editingId={modal.editingId}
          initialColumn={modal.initialColumn}
          groupBy={groupBy}
          prefillTitle={modal.prefillTitle}
          fromQuickId={modal.fromQuickId}
        />
      )}

      {quickOpen && (
        <QuickTasksModal
          onClose={() => setQuickOpen(false)}
          onAdd={(title) => setQuickTasks((qs) => [...qs, { id: uid(), title, createdAt: Date.now() }])}
          onRemove={(id) => setQuickTasks((qs) => qs.filter(q => q.id !== id))}
          onClassify={(id) => { const q = quickTasks.find(x => x.id === id); if(!q) return; setModal({ open:true, editingId:null, initialColumn:null, prefillTitle:q.title, fromQuickId:id }); setQuickOpen(false); }}
          quickTasks={quickTasks}
        />
      )}
    </div>
  );
}

function TaskCard({ id, index, task, onEdit, onRemove, onToggleSubtask, onUpdate, groupBy, viewMode }) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={onEdit} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onEdit(); } }}
          className={`group cursor-pointer mb-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow ${snapshot.isDragging ? "ring-2 ring-slate-300" : ""}`}
        >
          {/* Compartment banner for priority/status grouping */}
          {viewMode !== "compact" && (groupBy === "priority" || groupBy === "status") && (
              <div className="mb-2 -mx-3 -mt-3 px-3 py-1.5 rounded-t-2xl border-b" style={compStyle(COMPARTMENT_COLORS[task.compartment] || COMPARTMENT_COLORS.PM)}>
                <span className="text-xs font-medium tracking-wide">{task.compartment}</span>
              </div>
            )}

          {/* Title and Priority - Always visible */}
          <div className="flex items-start gap-2 mb-2">
            <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${priorityStyles[task.priority]}`}>
              <span className={`h-2 w-2 rounded-full ${priorityDot[task.priority]}`}></span>
              {task.priority}
            </span>
            <div className="flex-1 text-sm font-medium text-slate-800 break-words">{task.title}</div>
          </div>

          {/* Status and Size badges - Hidden in compact mode */}
          {viewMode !== "compact" && (
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(STATUS_COLORS[task.status])}>{task.status}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(SIZE_COLORS[task.size])}>{task.size}</span>
            </div>
          )}

          {/* Risk, Due Date, Subtask count, Note - Hidden in compact mode */}
          {viewMode !== "compact" && (task.flagged || task.dueDate || (task.subtasks && task.subtasks.length > 0) || (task.note && task.note.trim())) && (
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
              {task.flagged && (<span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-red-500" />Risque</span>)}
              {task.dueDate && (<span className={`inline-flex items-center gap-1 ${isPast(task.dueDate) ? "text-red-600" : ""}`}><CalendarIcon className="h-3.5 w-3.5" />{formatDateFR(task.dueDate)}</span>)}
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" />
                  {task.subtasks.filter(subtask => subtask.status === "Terminé").length}/{task.subtasks.length}
                </span>
              )}
              {task.note && task.note.trim() && (<span className="inline-flex items-center" title="Note"><FileText className="h-3.5 w-3.5"/></span>)}
            </div>
          )}

          {/* Progress bar - Visible in all modes */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{task.completion || 0}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  (task.completion || 0) === 100 ? 'bg-emerald-500' : (task.completion || 0) > 0 ? 'bg-blue-500' : 'bg-slate-300'
                }`}
                style={{ width: `${task.completion || 0}%` }}
              ></div>
            </div>
          </div>

          {/* When selector - Only visible in full mode */}
          {viewMode === "full" && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center" onClick={(e)=>e.stopPropagation()} onMouseDown={(e)=>e.stopPropagation()} onPointerDown={(e)=>e.stopPropagation()}>
              <div className="w-full flex justify-center">
                <Select value={task.when || ""} onValueChange={(v)=> onUpdate(id, { when: v === "__clear" ? "" : v })}>
                  <SelectTrigger className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-slate-200 whitespace-nowrap w-[120px]" style={styleWhen(task.when || "")}>
                    <CalendarIcon className="h-3 w-3 opacity-70" />
                    <span>{task.when || "To be defined"}</span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 min-w-[180px]">
                    <SelectItem value="__clear">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={styleWhen("")}>
                        <CalendarIcon className="h-3 w-3 opacity-70" />
                        To be defined
                      </span>
                    </SelectItem>
                    {WHEN_OPTIONS.filter(x=>x!=="").map((opt)=>(
                      <SelectItem key={opt} value={opt}>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={styleWhen(opt)}>
                          <CalendarIcon className="h-3 w-3 opacity-70" />{opt}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

function TaskModal({ onClose, onSave, onDelete, tasks, editingId, initialColumn, groupBy, prefillTitle = "", fromQuickId = null }) {
  const editing = editingId ? tasks[editingId] : null;
  const [title, setTitle] = useState(editing?.title || prefillTitle || "");
  const [priority, setPriority] = useState(editing?.priority || (groupBy === "priority" && PRIORITIES.includes(initialColumn) ? initialColumn : "P3"));
  const [compartment, setCompartment] = useState(editing?.compartment || (fromQuickId ? "" : (groupBy === "compartment" && COMPARTMENTS.includes(initialColumn) ? initialColumn : COMPARTMENTS[0])));
  const [status, setStatus] = useState(editing?.status || (groupBy === "status" && STATUSES.includes(initialColumn) ? initialColumn : "À faire"));
  const [size, setSize] = useState(editing?.size || "M");
  const [note, setNote] = useState(editing?.note || "");
  const [dueDate, setDueDate] = useState(editing?.dueDate || "");
  const [flagged, setFlagged] = useState(!!editing?.flagged);
  const [completion, setCompletion] = useState(editing?.completion || 0);
  const normalizeSubtasks = (arr) => (arr || []).map((s) => s.status ? s : { ...s, status: s.done ? "Terminé" : "À faire" });
  const [subtasks, setSubtasks] = useState(normalizeSubtasks(editing?.subtasks || []));
  const [subInput, setSubInput] = useState("");

  function addSub() { if (!subInput.trim()) return; setSubtasks((s) => [...s, { id: uid(), title: subInput.trim(), status: "À faire" }]); setSubInput(""); }
  function removeSub(id) { setSubtasks((s) => s.filter((x) => x.id !== id)); }
  function toggleSubDone(id) { setSubtasks((s) => s.map((x) => x.id === id ? { ...x, done: !x.done } : x)); }
  function submit(e) { e.preventDefault(); onSave({ id: editing?.id, title, priority, compartment, status, size, note, dueDate, flagged, subtasks, completion, fromQuickId }); }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }} onKeyDown={(e)=>{ if(e.key==='Escape') onClose(); }} tabIndex={-1}>
      <div className="w-full max-w-xl max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <form onSubmit={submit} className="flex-1 overflow-hidden flex flex-col min-h-0 max-h-full">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="font-semibold">{editing ? "Modifier la tâche" : "Nouvelle tâche"}</div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
          </div>

          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div>
              <label className="text-sm text-slate-600">Titre</label>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300" placeholder="Ex. Export vers portail" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Priorité</label>
                <div className="mt-1">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${priorityStyles[priority]}`}>
                          <span className={`h-2 w-2 rounded-full ${priorityDot[priority]}`}></span>{priority}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${priorityStyles[p]}`}>
                            <span className={`h-2 w-2 rounded-full ${priorityDot[p]}`}></span>{p}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Compartiment</label>
                <select value={compartment} onChange={(e) => setCompartment(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" required={!!fromQuickId}>
                  {fromQuickId && (<option value="">— choisir —</option>) }
                  {COMPARTMENTS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Statut</label>
                <div className="mt-1">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full rounded-xl border border-slate-300 px-2 py-2">
                      <div className="flex items-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(STATUS_COLORS[status])}>{status}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(STATUS_COLORS[s])}>{s}</span>
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(SIZE_COLORS[size])}>{size}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200">
                      {SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(SIZE_COLORS[s])}>{s}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Échéance</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm mt-auto">
                  <input type="checkbox" checked={flagged} onChange={() => setFlagged((f) => !f)} />
                  Marquer comme à risque
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-600">Note</label>
              <textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Note interne (non affichée sur le board)" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 h-28"></textarea>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-3 block">Avancement de la tâche</label>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>0%</span>
                  <span className="font-medium">{completion}%</span>
                  <span>100%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={completion}
                  onChange={(e) => setCompletion(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCompletion(val)}
                      className={`px-1 py-0.5 rounded ${completion === val ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-600">Sous-tâches</div>
              <div className="mt-2 flex gap-2">
                <input value={subInput} onChange={(e) => setSubInput(e.target.value)} placeholder="Ajouter une sous-tâche"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2" />
                <button type="button" onClick={addSub} className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"><Plus className="h-4 w-4" /></button>
              </div>
              <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 max-h-36 overflow-auto">
                {subtasks.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <span className={s.status === "Terminé" ? "line-through text-slate-400" : ""}>{s.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={s.status} onValueChange={(v)=> setSubtasks((arr)=> arr.map(x => x.id === s.id ? {...x, status: v} : x))}>
                        <SelectTrigger className="rounded-lg border border-slate-300 px-2 py-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(STATUS_COLORS[s.status])}>{s.status}</span>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200">
                          {["À faire","En cours","Terminé"].map(st => (
                            <SelectItem key={st} value={st}>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={badgeStyle(STATUS_COLORS[st])}>{st}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button type="button" onClick={() => removeSub(s.id)} className="text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
                {subtasks.length === 0 && (
                  <li className="px-3 py-2 text-xs text-slate-400">Pas encore de sous-tâches</li>
                )}
              </ul>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            {editing && (<button type="button" onClick={() => { onDelete(editingId); onClose(); }} className="mr-auto px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100">Supprimer</button>)}
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200">Annuler</button>
            <button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
