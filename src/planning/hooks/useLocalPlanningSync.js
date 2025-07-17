import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../../lib/supabase-cuisine';
import { supabase } from '../../lib/supabase';

/**
 * Hook pour la gestion manuelle du planning (Base de données uniquement)
 * Workflow : Chargement DB → Modifications temporaires → Sauvegarde manuelle
 */
export const useLocalPlanningSync = (selectedDate) => {
  const [board, setBoard] = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * Chargement du planning depuis la base de données au démarrage
   */
  const loadFromDB = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📥 Chargement planning depuis base de données...');
      
      const { data: boardData, error } = await supabaseCuisine.loadPlanningPartage(selectedDate);
      
      if (error) {
        console.error('❌ Erreur chargement planning:', error);
        setBoard({});
        return {};
      }
      
      console.log(`✅ Planning chargé depuis DB:`, Object.keys(boardData).length, 'cellules');
      setBoard(boardData);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      return boardData;
      
    } catch (error) {
      console.error('❌ Erreur chargement planning:', error);
      setBoard({});
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  /**
   * Statistiques du planning
   */
  const getStats = useCallback(() => {
    const totalAssignments = Object.values(board).reduce((sum, cell) => sum + (cell?.length || 0), 0);
    const filledCells = Object.values(board).filter(cell => cell && cell.length > 0).length;
    const totalCells = Object.keys(board).filter(key => key !== 'unassigned').length;
    
    return {
      totalAssignments,
      filledCells,
      totalCells,
      fillRate: totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0,
      lastSaved,
      hasUnsavedChanges
    };
  }, [board, lastSaved, hasUnsavedChanges]);

  /**
   * Sauvegarde MANUELLE du planning en base de données
   */
  const saveToDatabase = useCallback(async () => {
    if (isSaving) {
      console.log('⏳ Sauvegarde déjà en cours...');
      return { success: false, message: 'Sauvegarde en cours...' };
    }

    try {
      setIsSaving(true);
      toast.loading('💾 Sauvegarde du planning...', { id: 'save-planning' });
      
      console.log('💾 Sauvegarde manuelle planning...', Object.keys(board).length, 'cellules');
      
      const result = await supabaseCuisine.savePlanningPartage(board, selectedDate);
      
      if (result.success) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        
        const message = result.partial 
          ? `Planning sauvegardé partiellement (${result.saved}/${result.total})` 
          : 'Planning sauvegardé avec succès !';
          
        toast.success(message, { id: 'save-planning' });
        console.log('✅ Planning sauvegardé:', result);
        return { success: true, message };
      } else {
        throw new Error(result.error?.message || 'Erreur de sauvegarde');
      }
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde planning:', error);
      toast.error('Erreur lors de la sauvegarde', { id: 'save-planning' });
      return { success: false, message: 'Erreur de sauvegarde' };
    } finally {
      setIsSaving(false);
    }
  }, [board, selectedDate, isSaving]);

  /**
   * Reset COMPLET : vide l'interface ET supprime en base de données
   */
  const resetPlanning = useCallback(async () => {
    try {
      console.log('🗑️ Reset complet du planning...');
      
      // 1. Supprimer en base de données
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { error } = await supabase
        .from('planning_cuisine_new')
        .delete()
        .eq('date', dateStr);
      
      if (error) {
        console.error('❌ Erreur suppression DB:', error);
        toast.error('Erreur lors de la suppression en base');
        return { success: false };
      }
      
      // 2. Vider l'interface
      setBoard({});
      setHasUnsavedChanges(false);
      setLastSaved(null);
      
      console.log('✅ Planning complètement supprimé');
      toast.success('🗑️ Planning supprimé !');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erreur reset planning:', error);
      toast.error('Erreur lors du reset');
      return { success: false };
    }
  }, [selectedDate]);

  /**
   * Export planning (fonctionnalité existante)
   */
  const exportPlanning = useCallback(() => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const exportData = {
        date: dateStr,
        planning: board,
        exported_at: new Date().toISOString(),
        stats: getStats()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `planning-cuisine-${dateStr}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('📄 Planning exporté !');
      console.log('📄 Planning exporté:', dateStr);
      
    } catch (error) {
      console.error('❌ Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    }
  }, [selectedDate, board, getStats]);

  /**
   * Mise à jour du board avec marquage "non sauvegardé"
   */
  const updateBoard = useCallback((newBoard) => {
    setBoard(newBoard);
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Chargement initial depuis la base de données
   */
  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  return {
    board,
    setBoard: updateBoard, // Utilise updateBoard pour marquer les changements
    lastSaved,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    saveToDatabase, // Nouvelle fonction de sauvegarde manuelle
    resetPlanning,
    exportPlanning,
    getStats,
    loadFromDB // Pour recharger manuellement si besoin
  };
}; 