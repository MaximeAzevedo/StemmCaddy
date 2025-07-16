import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../../lib/supabase-cuisine';

/**
 * Hook pour la gestion partagée du planning (Base de données + Sync auto)
 * Remplace localStorage par base de données pour partage multi-utilisateurs
 */
export const useLocalPlanningSync = (selectedDate) => {
  const [board, setBoard] = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Référence pour éviter les sauvegardes en boucle
  const lastBoardRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  /**
   * Chargement du planning depuis la base de données
   */
  const loadFromDB = useCallback(async () => {
    try {
      const { data: boardData, error } = await supabaseCuisine.loadPlanningPartage(selectedDate);
      
      if (error) {
        console.error('❌ Erreur chargement planning:', error);
        return {};
      }
      
      console.log(`📥 Planning chargé depuis DB:`, Object.keys(boardData).length, 'cellules');
      return boardData;
      
    } catch (error) {
      console.error('❌ Erreur chargement planning:', error);
      return {};
    }
  }, [selectedDate]);

  /**
   * Sauvegarde du planning en base de données (debounced)
   */
  const saveToDB = useCallback(async (boardData) => {
    if (isSaving) {
      console.log('⏳ Sauvegarde déjà en cours, skip...');
      return { success: true };
    }

    try {
      setIsSaving(true);
      const result = await supabaseCuisine.savePlanningPartage(boardData, selectedDate);
      
      if (result.success) {
        setLastSaved(new Date());
        lastBoardRef.current = JSON.stringify(boardData);

        // Broadcast pour synchronisation mode TV
        window.dispatchEvent(new CustomEvent('planning-updated', {
          detail: {
            date: format(selectedDate, 'yyyy-MM-dd'),
            planning: boardData,
            timestamp: Date.now()
          }
        }));

        console.log(`💾 Planning sauvegardé en DB:`, Object.keys(boardData).length, 'cellules');
        return { success: true };
      } else {
        throw result.error;
      }

    } catch (error) {
      console.error('❌ Erreur sauvegarde planning:', error);
      toast.error('Erreur de sauvegarde planning');
      return { success: false, error };
    } finally {
      setIsSaving(false);
    }
  }, [selectedDate, isSaving]);

  /**
   * Chargement initial depuis la base de données
   */
  useEffect(() => {
    const loadInitial = async () => {
      const initialBoard = await loadFromDB();
      setBoard(initialBoard);
      setLastSync(new Date());
      lastBoardRef.current = JSON.stringify(initialBoard);
    };
    
    loadInitial();
  }, [loadFromDB]);

  /**
   * Auto-sauvegarde DEBOUNCED à chaque changement du board
   */
  useEffect(() => {
    // Éviter la sauvegarde si :
    // 1. Pas encore de sync initial
    // 2. Board vide 
    // 3. Contenu identique à la dernière sauvegarde
    if (!lastSync || Object.keys(board).length === 0) {
      return;
    }

    const currentBoardStr = JSON.stringify(board);
    if (currentBoardStr === lastBoardRef.current) {
      return; // Pas de changement
    }

    // Débouncer la sauvegarde (attendre 2 secondes)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      console.log('💾 Auto-sauvegarde déclenchée...');
      saveToDB(board);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [board, lastSync, saveToDB]);

  /**
   * Synchronisation automatique avec les autres utilisateurs (polling 30s)
   */
  useEffect(() => {
    if (!lastSync) return;

    const interval = setInterval(async () => {
      try {
        const { hasChanges } = await supabaseCuisine.checkPlanningChanges(selectedDate, lastSync);
        
        if (hasChanges) {
          console.log('🔄 Changements détectés par un autre utilisateur, rechargement...');
          const updatedBoard = await loadFromDB();
          setBoard(updatedBoard);
          setLastSync(new Date());
          lastBoardRef.current = JSON.stringify(updatedBoard);
          toast.success('Planning mis à jour par un autre utilisateur', { duration: 2000 });
        }
      } catch (error) {
        console.warn('Erreur sync automatique:', error);
      }
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [lastSync, selectedDate, loadFromDB]);

  /**
   * Reset du planning actuel
   */
  const resetPlanning = useCallback(async () => {
    const emptyBoard = {};
    setBoard(emptyBoard);
    
    // Sauvegarder planning vide en DB
    await saveToDB(emptyBoard);
    
    // Broadcast reset
    window.dispatchEvent(new CustomEvent('planning-reset', {
      detail: { date: format(selectedDate, 'yyyy-MM-dd') }
    }));
    
    toast.success('Planning remis à zéro !');
    console.log(`🗑️ Planning reseté pour ${format(selectedDate, 'yyyy-MM-dd')}`);
  }, [selectedDate, saveToDB]);

  /**
   * Export du planning actuel
   */
  const exportPlanning = useCallback(() => {
    const data = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      planning: board,
      exportedAt: new Date().toISOString(),
      version: '3.0-shared-db'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-${format(selectedDate, 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Planning exporté !');
  }, [selectedDate, board]);

  /**
   * Rechargement manuel depuis la DB
   */
  const reloadFromDB = useCallback(async () => {
    const updatedBoard = await loadFromDB();
    setBoard(updatedBoard);
    setLastSync(new Date());
    lastBoardRef.current = JSON.stringify(updatedBoard);
    toast.success('Planning rechargé depuis la base !');
  }, [loadFromDB]);

  /**
   * Statistiques du planning partagé
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
      lastSaved
    };
  }, [board, lastSaved]);

  return {
    board,
    setBoard,
    lastSaved,
    resetPlanning,
    exportPlanning,
    reloadFromDB, // Nouvelle fonction pour forcer le rechargement
    getStats, // ✅ Fonction statistiques rajoutée
    isShared: true, // Indicateur que c'est partagé
    isSaving, // Indicateur de sauvegarde en cours
    lastSync // Pour debug/interface
  };
}; 