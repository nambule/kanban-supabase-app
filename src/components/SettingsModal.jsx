import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, GripVertical, Edit } from 'lucide-react'

/**
 * Modal for managing application settings (compartments management)
 */
const SettingsModal = ({ onClose }) => {
  const [compartments, setCompartments] = useState([])
  const [newCompartment, setNewCompartment] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)

  // Load compartments from constants or localStorage
  useEffect(() => {
    // Get compartments from localStorage or use default
    const saved = localStorage.getItem('kanban-compartments')
    if (saved) {
      try {
        setCompartments(JSON.parse(saved))
      } catch (e) {
        // If parsing fails, use default compartments
        setCompartments(["PM", "CPO", "FER", "NOVAE", "MRH", "CDA"])
      }
    } else {
      setCompartments(["PM", "CPO", "FER", "NOVAE", "MRH", "CDA"])
    }
  }, [])

  // Save compartments to localStorage
  const saveCompartments = (newCompartments) => {
    localStorage.setItem('kanban-compartments', JSON.stringify(newCompartments))
    setCompartments(newCompartments)
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('compartmentsUpdated', { 
      detail: { compartments: newCompartments } 
    }))
  }

  // Add new compartment
  const handleAddCompartment = () => {
    if (!newCompartment.trim()) return
    if (compartments.includes(newCompartment.trim())) {
      alert('This compartment already exists')
      return
    }
    
    const newCompartments = [...compartments, newCompartment.trim()]
    saveCompartments(newCompartments)
    setNewCompartment('')
  }

  // Delete compartment
  const handleDeleteCompartment = (compartmentToDelete) => {
    if (compartments.length <= 1) {
      alert('You must have at least one compartment')
      return
    }
    
    if (confirm(`Are you sure you want to delete "${compartmentToDelete}"?\nAll tasks in this compartment will need to be reassigned.`)) {
      const newCompartments = compartments.filter(c => c !== compartmentToDelete)
      saveCompartments(newCompartments)
    }
  }

  // Start editing
  const handleStartEdit = (compartment) => {
    setEditingId(compartment)
    setEditingValue(compartment)
  }

  // Save edit
  const handleSaveEdit = () => {
    if (!editingValue.trim()) {
      setEditingId(null)
      return
    }
    
    if (editingValue.trim() !== editingId && compartments.includes(editingValue.trim())) {
      alert('This compartment already exists')
      return
    }
    
    const newCompartments = compartments.map(c => 
      c === editingId ? editingValue.trim() : c
    )
    saveCompartments(newCompartments)
    setEditingId(null)
    setEditingValue('')
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingValue('')
  }

  // Handle key press in edit mode
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // Handle key press for new compartment
  const handleNewCompartmentKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddCompartment()
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e, compartment) => {
    setDraggedItem(compartment)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, targetCompartment) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem === targetCompartment) {
      setDraggedItem(null)
      return
    }

    const draggedIndex = compartments.indexOf(draggedItem)
    const targetIndex = compartments.indexOf(targetCompartment)
    
    const newCompartments = [...compartments]
    newCompartments.splice(draggedIndex, 1)
    newCompartments.splice(targetIndex, 0, draggedItem)
    
    saveCompartments(newCompartments)
    setDraggedItem(null)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Compartments Management */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                Manage Compartments
              </h3>
              
              {/* Add new compartment */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCompartment}
                  onChange={(e) => setNewCompartment(e.target.value)}
                  onKeyDown={handleNewCompartmentKeyDown}
                  placeholder="Add new compartment..."
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddCompartment}
                  disabled={!newCompartment.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {/* Existing compartments list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {compartments.map((compartment, index) => (
                  <div
                    key={compartment}
                    draggable
                    onDragStart={(e) => handleDragStart(e, compartment)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, compartment)}
                    className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 ${
                      draggedItem === compartment ? 'opacity-50' : ''
                    } hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-move`}
                  >
                    {/* Drag handle */}
                    <GripVertical className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    
                    {/* Compartment name (editable) */}
                    <div className="flex-1">
                      {editingId === compartment ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          onBlur={handleSaveEdit}
                          className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {compartment}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {editingId === compartment ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(compartment)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompartment(compartment)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 <strong>Tips:</strong> Drag compartments to reorder them. Changes are saved automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal