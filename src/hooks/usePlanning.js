import { useCallback } from 'react';
import useCaddyStore from '../store';
import { api } from '../services/api';

/**
 * ========================================
 * HOOK PLANNING - NOUVELLE ARCHITECTURE
 * ========================================
 * 
 * Remplace tous les hooks de planning complexes
 * Utilise le store Zustand centralisé
 */

export const usePlanning = (service = 'cuisine') => {
  // Récupérer les données et actions du store
  const store = useCaddyStore();
  
  const {
    planning,
    selectedDate,
    selectedSession,
    loading,
    hasUnsavedChanges,
    loadPlanning,
    savePlanning,
    updatePlanningLocal,
    markAsUnsaved,
    markAsSaved,
    setSelectedDate,
    setSelectedSession
  } = store;
  
  // Adapter le planning selon le service
  const servicePlanning = planning[service];

  // ==================== ACTIONS PRINCIPALES ====================

  /**
   * Charger le planning pour une date/session
   */
  const load = useCallback(async (date = selectedDate, session = selectedSession) => {
    await loadPlanning(service, date, session);
  }, [loadPlanning, service, selectedDate, selectedSession]);

  /**
   * Sauvegarder le planning
   */
  const save = useCallback(async () => {
    return await savePlanning(service, servicePlanning);
  }, [savePlanning, service, servicePlanning]);

  /**
   * Mettre à jour le planning localement (pour drag & drop)
   */
  const updateLocal = useCallback((newPlanning) => {
    updatePlanningLocal(service, newPlanning);
  }, [updatePlanningLocal, service]);

  /**
   * Réinitialiser le planning
   */
  const reset = useCallback(() => {
    if (service === 'cuisine') {
      // Créer un board vide avec la structure correcte
      const { data: postes } = api.planning.getPostesCuisine();
      const { data: creneaux } = api.planning.getCreneauxCuisine();
      
      const emptyBoard = {};
      postes.forEach(poste => {
        emptyBoard[poste.nom] = {};
        creneaux.forEach(creneau => {
          emptyBoard[poste.nom][creneau.nom] = [];
        });
      });
      
      updateLocal(emptyBoard);
    } else {
      updateLocal([]);
    }
  }, [service, updateLocal]);

  // ==================== GESTION DRAG & DROP (CUISINE) ====================

  /**
   * Gérer le drag & drop pour la cuisine
   */
  const handleDragEnd = useCallback((result) => {
    if (!result.destination || service !== 'cuisine') return;

    const { source, destination, draggableId } = result;
    
    // Parser les IDs
    const [sourcePoste, sourceCreneau] = source.droppableId.split('::');
    const [destPoste, destCreneau] = destination.droppableId.split('::');
    const employeeId = parseInt(draggableId);

    // Copier le planning actuel
    const newPlanning = JSON.parse(JSON.stringify(servicePlanning));

    // Trouver l'employé à déplacer
    const sourceEmployees = newPlanning[sourcePoste]?.[sourceCreneau] || [];
    const employeeIndex = sourceEmployees.findIndex(emp => emp.id === employeeId);
    
    if (employeeIndex === -1) return;

    const employee = sourceEmployees[employeeIndex];

    // Retirer de la source
    sourceEmployees.splice(employeeIndex, 1);

    // Ajouter à la destination
    if (!newPlanning[destPoste]) newPlanning[destPoste] = {};
    if (!newPlanning[destPoste][destCreneau]) newPlanning[destPoste][destCreneau] = [];
    
    newPlanning[destPoste][destCreneau].splice(destination.index, 0, employee);

    // Mettre à jour le store
    updateLocal(newPlanning);
  }, [servicePlanning, service, updateLocal]);

  /**
   * Ajouter un employé à un poste/créneau
   */
  const addEmployeeToSlot = useCallback((employee, posteNom, creneauNom) => {
    if (service !== 'cuisine') return;

    const newPlanning = JSON.parse(JSON.stringify(servicePlanning));
    
    if (!newPlanning[posteNom]) newPlanning[posteNom] = {};
    if (!newPlanning[posteNom][creneauNom]) newPlanning[posteNom][creneauNom] = [];
    
    // Vérifier que l'employé n'est pas déjà dans ce slot
    const exists = newPlanning[posteNom][creneauNom].some(emp => emp.id === employee.id);
    if (exists) return;
    
    newPlanning[posteNom][creneauNom].push(employee);
    updateLocal(newPlanning);
  }, [servicePlanning, service, updateLocal]);

  /**
   * Retirer un employé d'un poste/créneau
   */
  const removeEmployeeFromSlot = useCallback((employeeId, posteNom, creneauNom) => {
    if (service !== 'cuisine') return;

    const newPlanning = JSON.parse(JSON.stringify(servicePlanning));
    
    if (newPlanning[posteNom]?.[creneauNom]) {
      newPlanning[posteNom][creneauNom] = newPlanning[posteNom][creneauNom]
        .filter(emp => emp.id !== employeeId);
    }
    
    updateLocal(newPlanning);
  }, [servicePlanning, service, updateLocal]);

  // ==================== DONNÉES DÉRIVÉES ====================

  /**
   * Obtenir les employés d'un poste/créneau
   */
  const getEmployeesInSlot = useCallback((posteNom, creneauNom) => {
    if (service === 'cuisine') {
      return servicePlanning[posteNom]?.[creneauNom] || [];
    }
    return [];
  }, [servicePlanning, service]);

  /**
   * Vérifier si un employé est assigné quelque part
   */
  const isEmployeeAssigned = useCallback((employeeId) => {
    if (service === 'cuisine') {
      return Object.values(servicePlanning).some(poste =>
        Object.values(poste).some(creneau =>
          creneau.some(emp => emp.id === employeeId)
        )
      );
    } else {
      return servicePlanning.some(entry => entry.employee_id === employeeId);
    }
  }, [servicePlanning, service]);

  /**
   * Obtenir les statistiques du planning
   */
  const getStats = useCallback(() => {
    const stats = {
      totalAssignments: 0,
      employeesUsed: new Set(),
      coverage: {}
    };

    if (service === 'cuisine') {
      Object.keys(servicePlanning).forEach(posteNom => {
        stats.coverage[posteNom] = {};
        Object.keys(servicePlanning[posteNom]).forEach(creneauNom => {
          const employees = servicePlanning[posteNom][creneauNom];
          stats.totalAssignments += employees.length;
          employees.forEach(emp => stats.employeesUsed.add(emp.id));
          stats.coverage[posteNom][creneauNom] = employees.length;
        });
      });
    } else {
      stats.totalAssignments = servicePlanning.length;
      servicePlanning.forEach(entry => stats.employeesUsed.add(entry.employee_id));
    }

    stats.uniqueEmployees = stats.employeesUsed.size;
    return stats;
  }, [servicePlanning, service]);

  /**
   * Obtenir les postes et créneaux (pour cuisine)
   */
  const getPostesAndCreneaux = useCallback(() => {
    if (service === 'cuisine') {
      return {
        postes: api.planning.getPostesCuisine().data,
        creneaux: api.planning.getCreneauxCuisine().data
      };
    }
    return { postes: [], creneaux: [] };
  }, [service]);

  /**
   * Vérifier les conflits potentiels
   */
  const getConflicts = useCallback(() => {
    const conflicts = [];

    if (service === 'cuisine') {
      // Vérifier les employés assignés à plusieurs créneaux en même temps
      const employeeAssignments = {};
      
      Object.keys(servicePlanning).forEach(posteNom => {
        Object.keys(servicePlanning[posteNom]).forEach(creneauNom => {
          servicePlanning[posteNom][creneauNom].forEach(employee => {
            if (!employeeAssignments[employee.id]) {
              employeeAssignments[employee.id] = [];
            }
            employeeAssignments[employee.id].push({
              poste: posteNom,
              creneau: creneauNom,
              employee
            });
          });
        });
      });

      // Trouver les conflits temporels
      Object.values(employeeAssignments).forEach(assignments => {
        if (assignments.length > 1) {
          // Vérifier si les créneaux se chevauchent
          // Pour simplifier, on considère que tous les créneaux peuvent conflictuér
          conflicts.push({
            type: 'multiple_assignments',
            employee: assignments[0].employee,
            assignments
          });
        }
      });
    }

    return conflicts;
  }, [servicePlanning, service]);

  // ==================== GESTION DES DATES/SESSIONS ====================

  /**
   * Changer la date sélectionnée
   */
  const changeDate = useCallback((newDate) => {
    setSelectedDate(newDate);
  }, []);

  /**
   * Changer la session sélectionnée
   */
  const changeSession = useCallback((newSession) => {
    setSelectedSession(newSession);
  }, []);

  /**
   * Aller au jour suivant
   */
  const nextDay = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  }, [selectedDate]);

  /**
   * Aller au jour précédent
   */
  const previousDay = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  }, [selectedDate]);

  // ==================== RETOUR DU HOOK ====================

  return {
    // Données
    planning: servicePlanning,
    selectedDate,
    selectedSession,
    loading,
    hasUnsavedChanges,
    
    // Actions principales
    load,
    save,
    updateLocal,
    reset,
    
    // Drag & Drop (cuisine)
    handleDragEnd,
    addEmployeeToSlot,
    removeEmployeeFromSlot,
    
    // Navigation
    changeDate,
    changeSession,
    nextDay,
    previousDay,
    
    // Utilitaires
    getEmployeesInSlot,
    isEmployeeAssigned,
    getStats,
    getPostesAndCreneaux,
    getConflicts,
    
    // État
    isEmpty: service === 'cuisine' ? Object.keys(servicePlanning).length === 0 : servicePlanning.length === 0,
    hasData: service === 'cuisine' ? Object.keys(servicePlanning).length > 0 : servicePlanning.length > 0
  };
};

// Export par défaut
export default usePlanning; 