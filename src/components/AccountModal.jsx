import React, { useState } from 'react'
import { X, User, Mail, Trash2, AlertTriangle } from 'lucide-react'

/**
 * Modale de gestion du compte utilisateur
 */
const AccountModal = ({ onClose, user, onDeleteAccount, loading = false }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'supprimer') {
      return
    }

    try {
      const result = await onDeleteAccount()
      if (result?.success) {
        // Fermer la modale immédiatement après succès
        onClose()
        // L'utilisateur sera déconnecté automatiquement
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error)
      alert('Erreur lors de la suppression du compte: ' + (error.message || 'Erreur inconnue'))
      // Réinitialiser le formulaire de confirmation en cas d'erreur
      setDeleteConfirmText('')
      setShowDeleteConfirm(false)
    }
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
            <h2 className="font-semibold text-lg">Mon compte</h2>
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
                {user?.email?.split('@')[0] || 'Utilisateur'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Mail className="w-4 h-4" />
                {user?.email}
              </div>
            </div>
          </div>

          {/* Informations du compte */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-900">Informations du compte</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Email :</span>
                <span className="font-medium break-all">{user?.email || 'Non disponible'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Inscrit le :</span>
                <span className="font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'Récemment'}
                </span>
              </div>
            </div>
          </div>

          {/* Zone de danger */}
          <div className="space-y-3">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Zone de danger
            </h3>
            
            {!showDeleteConfirm ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-700 mb-3">
                  La suppression de votre compte est irréversible. Toutes vos tâches seront définitivement perdues.
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer mon compte
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <div className="text-sm text-red-700 font-medium">
                  ⚠️ Confirmation requise
                </div>
                <div className="text-sm text-red-600">
                  Cette action est irréversible. Tapez <strong>"supprimer"</strong> pour confirmer :
                </div>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Tapez 'supprimer'"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm"
                  disabled={loading}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading || deleteConfirmText.toLowerCase() !== 'supprimer'}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Confirmer la suppression
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    disabled={loading}
                    className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button 
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Fermer
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

export default AccountModal