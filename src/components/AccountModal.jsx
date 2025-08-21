import React, { useState } from 'react'
import { X, User, Mail } from 'lucide-react'

/**
 * Modale de gestion du compte utilisateur
 */
const AccountModal = ({ onClose, user }) => {
  // Vérifier si user existe
  if (!user) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 text-center">
          <p>Loading user information...</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 rounded">Close</button>
        </div>
      </div>
    )
  }

  const getInitials = (email) => {
    if (!email) return 'U'
    const name = email.split('@')[0]
    return name.substring(0, 2).toUpperCase()
  }

  const getAvatarColor = (email) => {
    if (!email) return 'bg-slate-500'
    
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ]
    
    const hash = email.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      tabIndex={-1}
    >
      <div className="min-h-full flex items-center justify-center py-12">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-600" />
            <h2 className="font-semibold text-lg">My Account</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Profil utilisateur */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${getAvatarColor(user?.email)} flex items-center justify-center text-white text-xl font-medium`}>
              {getInitials(user?.email)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-900">
                {user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Mail className="w-4 h-4" />
                {user?.email}
              </div>
            </div>
          </div>

          {/* Informations du compte */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-900">Account Information</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Email:</span>
                <span className="font-medium break-all">{user?.email || 'Not available'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Joined:</span>
                <span className="font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US') : 'Recently'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

export default AccountModal