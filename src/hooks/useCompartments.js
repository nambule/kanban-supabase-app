import { useState, useEffect, useCallback } from 'react'
import { compartmentService } from '../services/compartmentService'

/**
 * Hook pour gérer les compartiments utilisateur
 */
export const useCompartments = () => {
  const [compartments, setCompartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger les compartiments de l'utilisateur
  const loadCompartments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Loading user compartments...')
      const data = await compartmentService.getUserCompartments()
      
      if (data.length === 0) {
        // Aucun compartiment trouvé, essayer de migrer ou initialiser
        console.log('📦 No compartments found, initializing...')
        const initialized = await compartmentService.migrateFromLocalStorage()
        setCompartments(initialized || [])
      } else {
        setCompartments(data)
      }
      
      console.log('✅ Compartments loaded:', data.length)
    } catch (err) {
      console.error('❌ Error loading compartments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les compartiments au montage
  useEffect(() => {
    loadCompartments()
  }, [loadCompartments])

  // Créer un nouveau compartiment
  const createCompartment = useCallback(async (name) => {
    try {
      setError(null)
      console.log('🔄 Creating compartment:', name)
      
      const newCompartment = await compartmentService.createCompartment(name)
      const updatedCompartments = [...compartments, newCompartment].sort((a, b) => a.position - b.position)
      setCompartments(updatedCompartments)
      
      // Émettre un événement pour notifier les autres composants
      console.log('🔔 Emitting compartmentsUpdated event with:', updatedCompartments.map(c => c.name))
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', { 
        detail: { compartments: updatedCompartments } 
      }))
      
      console.log('✅ Compartment created:', newCompartment.name)
      return newCompartment
    } catch (err) {
      console.error('❌ Error creating compartment:', err)
      setError(err.message)
      throw err
    }
  }, [compartments])

  // Mettre à jour un compartiment
  const updateCompartment = useCallback(async (id, updates) => {
    try {
      setError(null)
      console.log('🔄 Updating compartment:', id, updates)
      
      const updatedCompartment = await compartmentService.updateCompartment(id, updates)
      setCompartments(prev => prev.map(comp => 
        comp.id === id ? updatedCompartment : comp
      ).sort((a, b) => a.position - b.position))
      
      // Émettre un événement pour notifier les autres composants
      const updatedCompartments = compartments.map(comp => 
        comp.id === id ? updatedCompartment : comp
      ).sort((a, b) => a.position - b.position)
      console.log('🔔 Emitting compartmentsUpdated event (update) with:', updatedCompartments.map(c => c.name))
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', { 
        detail: { compartments: updatedCompartments } 
      }))
      
      console.log('✅ Compartment updated:', updatedCompartment.name)
      return updatedCompartment
    } catch (err) {
      console.error('❌ Error updating compartment:', err)
      setError(err.message)
      throw err
    }
  }, [compartments])

  // Supprimer un compartiment
  const deleteCompartment = useCallback(async (id) => {
    try {
      setError(null)
      console.log('🔄 Deleting compartment:', id)
      
      await compartmentService.deleteCompartment(id)
      const updatedCompartments = compartments.filter(comp => comp.id !== id)
      setCompartments(updatedCompartments)
      
      // Émettre un événement pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', { 
        detail: { compartments: updatedCompartments } 
      }))
      
      console.log('✅ Compartment deleted')
      return true
    } catch (err) {
      console.error('❌ Error deleting compartment:', err)
      setError(err.message)
      throw err
    }
  }, [compartments])

  // Réorganiser les compartiments
  const reorderCompartments = useCallback(async (reorderedCompartments) => {
    try {
      setError(null)
      console.log('🔄 Reordering compartments...')
      
      // Mettre à jour l'état local immédiatement pour une meilleure UX
      setCompartments(reorderedCompartments)
      
      // Envoyer les IDs dans le bon ordre au service
      const compartmentIds = reorderedCompartments.map(comp => comp.id)
      await compartmentService.reorderCompartments(compartmentIds)
      
      // Émettre un événement pour notifier les autres composants
      console.log('🔔 Emitting compartmentsUpdated event (reorder) with:', reorderedCompartments.map(c => c.name))
      window.dispatchEvent(new CustomEvent('compartmentsUpdated', { 
        detail: { compartments: reorderedCompartments } 
      }))
      
      console.log('✅ Compartments reordered')
      return true
    } catch (err) {
      console.error('❌ Error reordering compartments:', err)
      setError(err.message)
      // En cas d'erreur, recharger depuis la base de données
      loadCompartments()
      throw err
    }
  }, [loadCompartments])

  // Obtenir les noms des compartiments pour compatibilité avec l'ancien système
  const getCompartmentNames = useCallback(() => {
    return compartments.map(comp => comp.name)
  }, [compartments])

  return {
    compartments,
    compartmentNames: getCompartmentNames(),
    loading,
    error,
    loadCompartments,
    createCompartment,
    updateCompartment,
    deleteCompartment,
    reorderCompartments
  }
}