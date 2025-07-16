import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../../lib/supabase-cuisine';

/**
 * Hook pour la gestion de la sauvegarde du planning
 * Extrait du composant CuisinePlanningInteractive
 */
export const usePlanningSync = (selectedDate) => {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  /**
   * Sauvegarde d'une assignation individuelle
   */
  const saveAssignment = useCallback(async (item, cellId) => {
    try {
      // Gestion de la suppression
      if (cellId === 'DELETE') {
        if (item.planningId) {
          await supabaseCuisine.deletePlanningCuisine(item.planningId);
          console.log(`🗑️ Suppression planning ID ${item.planningId} pour ${item.employee.nom}`);
        }
        return;
      }

      // CORRECTION AMÉLIORÉE: Parser correctement les cellId avec créneaux contenant des tirets
      const dashIndex = cellId.indexOf('-');
      if (dashIndex === -1) {
        toast.error(`Erreur: Format cellId invalide (${cellId})`);
        return;
      }
      
      const posteIdStr = cellId.substring(0, dashIndex);
      const creneau = cellId.substring(dashIndex + 1);
      const posteId = parseInt(posteIdStr, 10);
      
      if (isNaN(posteId)) {
        toast.error(`Erreur: ID poste invalide (${posteIdStr})`);
        return;
      }
      
      console.log(`💾 Sauvegarde: posteId=${posteId}, creneau="${creneau}", employeeId=${item.employeeId}`);
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const planningData = {
        date: dateStr,
        poste_id: posteId,
        creneau: creneau,
        employee_id: item.employeeId,
      };
      
      if (item.planningId) {
        // Update existant
        const updateResult = await supabaseCuisine.updatePlanningCuisine(item.planningId, {
          poste_id: posteId,
          creneau: creneau,
        });
        
        if (updateResult.error) {
          console.error('❌ Erreur mise à jour planning:', updateResult.error);
          toast.error(`Erreur mise à jour: ${updateResult.error.message}`);
          return;
        }
        
        console.log(`✅ Mise à jour planning ID ${item.planningId}`);
      } else {
        // Nouvelle création
        const { data, error } = await supabaseCuisine.createPlanningCuisine(planningData);
        
        if (error) {
          console.error('❌ Erreur création planning:', error);
          toast.error(`Erreur sauvegarde: ${error.message}`);
          return;
        }
        
        if (data) {
          item.planningId = data.id;
          setLastSaved(new Date());
          console.log(`✅ Nouveau planning créé ID ${data.id}`);
          
          // VÉRIFICATION IMMÉDIATE : Contrôler que la donnée est bien en base
          const { data: verification, error: verifyError } = await supabaseCuisine.supabase
            .from('planning_cuisine')
            .select('*')
            .eq('id', data.id)
            .single();
          
          if (verifyError) {
            console.warn('⚠️ Impossible de vérifier la sauvegarde:', verifyError);
          } else if (verification) {
            console.log('✅ VÉRIFICATION OK - Donnée confirmée en base:', verification);
          } else {
            console.error('❌ VÉRIFICATION ÉCHOUÉE - Donnée non trouvée en base!');
            toast.error('Attention: problème de sauvegarde détecté');
          }
        }
      }
      
      toast.success('Assignation sauvegardée', { duration: 1000 });
    } catch (error) {
      console.error('❌ Erreur saveAssignment:', error);
      toast.error('Erreur de sauvegarde');
    }
  }, [selectedDate]);

  /**
   * Sauvegarde complète du planning
   */
  const saveAllPlanning = useCallback(async (board) => {
    try {
      setSaving(true);
      let savedCount = 0;
      
      // Parcourir toutes les cellules du board et sauvegarder
      for (const cellId of Object.keys(board)) {
        if (cellId === 'unassigned') continue;
        
        const items = board[cellId] || [];
        for (const item of items) {
          if (!item.planningId) {
            await saveAssignment(item, cellId);
            savedCount++;
          }
        }
      }
      
      setLastSaved(new Date());
      toast.success(`Planning sauvegardé ! (${savedCount} nouvelles affectations)`, { duration: 2000 });
      
      return { success: true, count: savedCount };
      
    } catch (error) {
      console.error('Erreur sauvegarde complète:', error);
      toast.error('Erreur lors de la sauvegarde');
      return { success: false, error };
    } finally {
      setSaving(false);
    }
  }, [saveAssignment]);

  /**
   * Suppression complète du planning pour une date
   */
  const clearPlanning = useCallback(async () => {
    try {
      setSaving(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { error } = await supabaseCuisine.supabase
        .from('planning_cuisine')
        .delete()
        .eq('date', dateStr);
      
      if (error) {
        console.error('❌ Erreur suppression planning:', error);
        toast.error('Erreur lors de la suppression');
        return { success: false, error };
      }
      
      setLastSaved(new Date());
      toast.success(`Planning du ${dateStr} supprimé avec succès`);
      return { success: true };
      
    } catch (error) {
      console.error('Erreur suppression planning:', error);
      toast.error('Erreur lors de la suppression');
      return { success: false, error };
    } finally {
      setSaving(false);
    }
  }, [selectedDate]);

  /**
   * Obtenir les statistiques de sauvegarde
   */
  const getSyncStats = useCallback(() => {
    return {
      saving,
      lastSaved,
      lastSavedFormatted: lastSaved ? format(lastSaved, 'HH:mm:ss') : null
    };
  }, [saving, lastSaved]);

  return {
    saving,
    lastSaved,
    saveAssignment,
    saveAllPlanning,
    clearPlanning,
    getSyncStats
  };
}; 