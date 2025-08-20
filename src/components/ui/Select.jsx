import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export const Select = ({ value, onValueChange, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Extraire le trigger et le content des children
  let trigger = null
  let content = null

  React.Children.forEach(children, (child) => {
    if (child.type === SelectTrigger) {
      trigger = child
    } else if (child.type === SelectContent) {
      content = child
    }
  })

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {React.cloneElement(trigger, { isOpen })}
      </div>
      {isOpen && (
        <div className="absolute z-[60] bottom-full mb-1 left-0 right-0">
          {React.cloneElement(content, { onValueChange, setIsOpen })}
        </div>
      )}
    </div>
  )
}

export const SelectTrigger = ({ children, className = '', isOpen, ...props }) => {
  return (
    <button
      type="button"
      className={`flex items-center justify-between cursor-pointer ${className}`}
      {...props}
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )
}

export const SelectContent = ({ children, onValueChange, setIsOpen, className = '' }) => {
  const handleItemClick = (value) => {
    onValueChange(value)
    setIsOpen(false)
  }

  return (
    <div className={`bg-white border shadow-lg rounded-lg py-1 ${className}`}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { onItemClick: handleItemClick })
      )}
    </div>
  )
}

export const SelectItem = ({ value, children, onItemClick, className = '' }) => {
  return (
    <div
      className={`px-3 py-2 hover:bg-slate-100 cursor-pointer ${className}`}
      onClick={() => onItemClick(value)}
    >
      {children}
    </div>
  )
}