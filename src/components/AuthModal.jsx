import React, { useState } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

/**
 * Modale d'authentification avec Login et Signup
 */
const AuthModal = ({ onClose, onSignIn, onSignUp, loading = false, error }) => {
  const [mode, setMode] = useState('signin') // 'signin' ou 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long')
      return
    }

    try {
      if (mode === 'signin') {
        await onSignIn(email.trim(), password)
      } else {
        await onSignUp(email.trim(), password)
        setLocalError('')
        alert('Registration successful! Check your email to confirm your account.')
      }
    } catch (err) {
      setLocalError(err.message || 'An error occurred')
    }
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setLocalError('')
  }

  const displayError = error || localError

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      tabIndex={-1}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-600" />
            <h2 className="font-semibold text-lg">
              {mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {displayError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {displayError}
            </div>
          )}

          {mode === 'signup' && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
  A confirmation email will be sent after registration.
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none"
                disabled={loading}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-slate-500">
                Minimum 6 characters
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {mode === 'signin' ? 'Signing in...' : 'Signing up...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Sign Up'
            )}
          </button>

          {/* Switch Mode */}
          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              {mode === 'signin' ? 'Don\'t have an account?' : 'Already have an account?'}
              {' '}
              <button
                type="button"
                onClick={switchMode}
                className="text-slate-900 font-medium hover:underline"
                disabled={loading}
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AuthModal