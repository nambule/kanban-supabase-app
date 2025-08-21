import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { AlertTriangle, Calendar as CalendarIcon, FileText } from 'lucide-react'
import { Select, SelectTrigger, SelectContent, SelectItem } from './ui/Select'
import { 
  PRIORITY_STYLES, 
  PRIORITY_DOT, 
  STATUS_COLORS, 
  SIZE_COLORS, 
  COMPARTMENT_COLORS,
  WHEN_OPTIONS 
} from '../utils/constants'
import { badgeStyle, compStyle, styleWhen, formatDateFR, isPast } from '../utils/helpers'

/**
 * Composant pour afficher une carte de tâche dans le Kanban
 */
const TaskCard = ({ 
  id, 
  index, 
  task, 
  onEdit, 
  onRemove, 
  onUpdate, 
  groupBy 
}) => {
  if (!task) return null

  const progress = (task.subtasks?.length || 0) === 0 
    ? 0 
    : Math.round(100 * (task.subtasks.filter((s) => s.status === "Done" || s.done === true).length) / (task.subtasks.length))

  const handleWhenChange = (newWhen) => {
    const value = newWhen === "__clear" ? "" : newWhen
    onUpdate(id, { when: value })
  }

  const handleCardClick = (e) => {
    // Ne pas ouvrir le modal si on clique sur le sélecteur "Quand"
    if (e.target.closest('[data-select-trigger]')) {
      return
    }
    onEdit()
  }

  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div 
          ref={provided.innerRef} 
          {...provided.draggableProps} 
          {...provided.dragHandleProps} 
          onClick={handleCardClick} 
          role="button" 
          tabIndex={0}
          onKeyDown={(e) => { 
            if (e.key === 'Enter' || e.key === ' ') { 
              e.preventDefault()
              onEdit()
            } 
          }}
          className={`group cursor-pointer mb-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow ${
            snapshot.isDragging ? "ring-2 ring-slate-300" : ""
          }`}
        >
          {/* Bandeau compartiment si groupé par priorité ou statut */}
          {(groupBy === "priority" || groupBy === "status") && (
            <div 
              className="mb-2 -mx-3 -mt-3 px-3 py-1.5 rounded-t-2xl border-b" 
              style={compStyle(COMPARTMENT_COLORS[task.compartment] || COMPARTMENT_COLORS.PM)}
            >
              <span className="text-xs font-medium tracking-wide">{task.compartment}</span>
            </div>
          )}

          {/* En-tête avec priorité et titre */}
          <div className="flex items-start gap-2 mb-2">
            <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${PRIORITY_STYLES[task.priority]}`}>
              <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority]}`}></span>
              {task.priority}
            </span>
            
            <div className="flex-1 text-sm font-medium text-slate-800 break-words">
              {task.title}
            </div>
          </div>

          {/* Statut et taille */}
          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
              style={badgeStyle(STATUS_COLORS[task.status])}
            >
              {task.status}
            </span>
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" 
              style={badgeStyle(SIZE_COLORS[task.size])}
            >
              {task.size}
            </span>
          </div>

          {/* Indicateurs supplémentaires */}
          {(task.flagged || task.dueDate || (task.note && task.note.trim())) && (
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
              {task.flagged && (
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  Risk
                </span>
              )}
              {task.dueDate && (
                <span className={`inline-flex items-center gap-1 ${isPast(task.dueDate) ? "text-red-600" : ""}`}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {formatDateFR(task.dueDate)}
                </span>
              )}
              {task.note && task.note.trim() && (
                <span className="inline-flex items-center" title="Note">
                  <FileText className="h-3.5 w-3.5"/>
                </span>
              )}
            </div>
          )}

          {/* Barre de progression des sous-tâches */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Subtasks</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Sélecteur "Quand" */}
          <div 
            className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center" 
            onClick={(e) => e.stopPropagation()} 
            onMouseDown={(e) => e.stopPropagation()} 
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="min-w-[150px]">
              <Select 
                value={task.when || ""} 
                onValueChange={handleWhenChange}
                className="task-card-select"
              >
                <SelectTrigger 
                  data-select-trigger
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-slate-200 whitespace-nowrap" 
                  style={styleWhen(task.when || "")}
                >
                  <CalendarIcon className="h-3 w-3 opacity-70" />
                  <span>{task.when || "To be defined"}</span>
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200 min-w-[180px]">
                  {/* Option de vidage */}
                  <SelectItem value="__clear">
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={styleWhen("")}>
                      <CalendarIcon className="h-3 w-3 opacity-70" />
                      To be defined
                    </span>
                  </SelectItem>
                  {WHEN_OPTIONS.filter(x => x !== "").map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full" style={styleWhen(opt)}>
                        <CalendarIcon className="h-3 w-3 opacity-70" />
                        {opt}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default TaskCard