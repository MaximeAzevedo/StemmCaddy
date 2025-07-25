import { useCallback } from 'react';
import useCaddyStore from '../store';
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns';

/**
 * ========================================
 * HOOK ABSENCES - NOUVELLE ARCHITECTURE
 * ========================================
 * 
 * Remplace tous les hooks d'absences dispersés
 * Utilise le store Zustand centralisé
 */

export const useAbsences = (service = 'cuisine') => {
  // Récupérer les données et actions du store
  const {
    absences,
    employees,
    selectedDate,
    loading,
    loadAbsences,
    createAbsence,
    updateAbsence,
    deleteAbsence
  } = useCaddyStore(state => ({
    absences: state.absences[service] || [],
    employees: state.employees[service] || [],
    selectedDate: state.selectedDate,
    loading: state.loading.absences,
    loadAbsences: state.loadAbsences,
    createAbsence: state.createAbsence,
    updateAbsence: state.updateAbsence,
    deleteAbsence: state.deleteAbsence
  }));

  // ==================== ACTIONS PRINCIPALES ====================

  /**
   * Charger les absences pour une période
   */
  const load = useCallback(async (startDate = null, endDate = null) => {
    // Par défaut, charger la semaine courante
    if (!startDate || !endDate) {
      startDate = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      endDate = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    }
    
    await loadAbsences(service, startDate, endDate);
  }, [loadAbsences, service, selectedDate]);

  /**
   * Créer une nouvelle absence
   */
  const create = useCallback(async (absenceData) => {
    return await createAbsence(service, absenceData);
  }, [createAbsence, service]);

  /**
   * Mettre à jour une absence
   */
  const update = useCallback(async (id, updates) => {
    return await updateAbsence(service, id, updates);
  }, [updateAbsence, service]);

  /**
   * Supprimer une absence
   */
  const remove = useCallback(async (id) => {
    return await deleteAbsence(service, id);
  }, [deleteAbsence, service]);

  // ==================== DONNÉES DÉRIVÉES ====================

  /**
   * Filtrer les absences par critères
   */
  const filterAbsences = useCallback((filters = {}) => {
    let filtered = absences;

    // Filtrage par employé
    if (filters.employeeId) {
      filtered = filtered.filter(absence => absence.employee_id === filters.employeeId);
    }

    // Filtrage par type d'absence
    if (filters.type) {
      filtered = filtered.filter(absence => absence.type_absence === filters.type);
    }

    // Filtrage par statut (logistique)
    if (filters.statut && service === 'logistique') {
      filtered = filtered.filter(absence => absence.statut === filters.statut);
    }

    // Filtrage par période
    if (filters.startDate && filters.endDate) {
      const periodStart = parseISO(filters.startDate);
      const periodEnd = parseISO(filters.endDate);
      
      filtered = filtered.filter(absence => {
        const absenceStart = parseISO(absence.date_debut);
        const absenceEnd = parseISO(absence.date_fin);
        
        // Vérifier si l'absence chevauche avec la période
        return isWithinInterval(absenceStart, { start: periodStart, end: periodEnd }) ||
               isWithinInterval(absenceEnd, { start: periodStart, end: periodEnd }) ||
               (absenceStart <= periodStart && absenceEnd >= periodEnd);
      });
    }

    // Filtrage par mot-clé dans le motif
    if (filters.motif) {
      filtered = filtered.filter(absence => 
        absence.motif?.toLowerCase().includes(filters.motif.toLowerCase())
      );
    }

    return filtered;
  }, [absences, service]);

  /**
   * Obtenir les absences d'un employé pour une date
   */
  const getEmployeeAbsencesForDate = useCallback((employeeId, date) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const checkDate = parseISO(dateStr);
    
    return absences.filter(absence => {
      if (absence.employee_id !== employeeId) return false;
      
      const startDate = parseISO(absence.date_debut);
      const endDate = parseISO(absence.date_fin);
      
      return isWithinInterval(checkDate, { start: startDate, end: endDate });
    });
  }, [absences]);

  /**
   * Vérifier si un employé est absent à une date donnée
   */
  const isEmployeeAbsent = useCallback((employeeId, date = selectedDate) => {
    const employeeAbsences = getEmployeeAbsencesForDate(employeeId, date);
    return employeeAbsences.length > 0;
  }, [getEmployeeAbsencesForDate, selectedDate]);

  /**
   * Obtenir les employés disponibles pour une date
   */
  const getAvailableEmployees = useCallback((date = selectedDate) => {
    return employees.filter(employee => !isEmployeeAbsent(employee.id, date));
  }, [employees, isEmployeeAbsent, selectedDate]);

  /**
   * Obtenir les employés absents pour une date
   */
  const getAbsentEmployees = useCallback((date = selectedDate) => {
    const absentEmployeeIds = new Set();
    
    absences.forEach(absence => {
      const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
      const checkDate = parseISO(dateStr);
      const startDate = parseISO(absence.date_debut);
      const endDate = parseISO(absence.date_fin);
      
      if (isWithinInterval(checkDate, { start: startDate, end: endDate })) {
        absentEmployeeIds.add(absence.employee_id);
      }
    });
    
    return employees.filter(employee => absentEmployeeIds.has(employee.id));
  }, [absences, employees, selectedDate]);

  /**
   * Obtenir les statistiques des absences
   */
  const getStats = useCallback((startDate = null, endDate = null) => {
    let filteredAbsences = absences;
    
    if (startDate && endDate) {
      filteredAbsences = filterAbsences({ startDate, endDate });
    }
    
    const stats = {
      total: filteredAbsences.length,
      parType: {},
      parEmploye: {},
      dureeMoyenne: 0,
      absentAujourdhui: getAbsentEmployees().length
    };

    // Ajouter statut pour logistique
    if (service === 'logistique') {
      stats.parStatut = {};
    }

    let totalDuree = 0;
    
    filteredAbsences.forEach(absence => {
      // Par type
      stats.parType[absence.type_absence] = (stats.parType[absence.type_absence] || 0) + 1;
      
      // Par statut (logistique)
      if (service === 'logistique' && absence.statut) {
        stats.parStatut[absence.statut] = (stats.parStatut[absence.statut] || 0) + 1;
      }
      
      // Par employé
      const employee = employees.find(emp => emp.id === absence.employee_id);
      const employeeName = employee ? 
        (service === 'cuisine' ? employee.prenom : employee.nom) : 
        'Inconnu';
      stats.parEmploye[employeeName] = (stats.parEmploye[employeeName] || 0) + 1;
      
      // Durée
      const debut = parseISO(absence.date_debut);
      const fin = parseISO(absence.date_fin);
      const duree = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)) + 1;
      totalDuree += duree;
    });
    
    stats.dureeMoyenne = filteredAbsences.length > 0 ? 
      Math.round(totalDuree / filteredAbsences.length * 10) / 10 : 0;
    
    return stats;
  }, [absences, employees, service, filterAbsences, getAbsentEmployees]);

  /**
   * Détecter les conflits d'absences
   */
  const getConflicts = useCallback(() => {
    const conflicts = [];
    
    // Regrouper les absences par employé
    const absencesByEmployee = {};
    absences.forEach(absence => {
      if (!absencesByEmployee[absence.employee_id]) {
        absencesByEmployee[absence.employee_id] = [];
      }
      absencesByEmployee[absence.employee_id].push(absence);
    });
    
    // Vérifier les chevauchements pour chaque employé
    Object.entries(absencesByEmployee).forEach(([employeeId, employeeAbsences]) => {
      for (let i = 0; i < employeeAbsences.length; i++) {
        for (let j = i + 1; j < employeeAbsences.length; j++) {
          const absence1 = employeeAbsences[i];
          const absence2 = employeeAbsences[j];
          
          const start1 = parseISO(absence1.date_debut);
          const end1 = parseISO(absence1.date_fin);
          const start2 = parseISO(absence2.date_debut);
          const end2 = parseISO(absence2.date_fin);
          
          // Vérifier le chevauchement
          if (start1 <= end2 && start2 <= end1) {
            const employee = employees.find(emp => emp.id === parseInt(employeeId));
            conflicts.push({
              type: 'overlap',
              employee,
              absence1,
              absence2,
              overlapStart: start1 > start2 ? start1 : start2,
              overlapEnd: end1 < end2 ? end1 : end2
            });
          }
        }
      }
    });
    
    return conflicts;
  }, [absences, employees]);

  /**
   * Obtenir les absences par semaine
   */
  const getAbsencesByWeek = useCallback((date = selectedDate) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    
    return filterAbsences({
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEnd, 'yyyy-MM-dd')
    });
  }, [filterAbsences, selectedDate]);

  /**
   * Obtenir le planning d'absences pour la semaine
   */
  const getWeeklyAbsencePlanning = useCallback((date = selectedDate) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weeklyPlanning = {};
    
    // Initialiser les jours de la semaine
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayKey = format(day, 'yyyy-MM-dd');
      weeklyPlanning[dayKey] = [];
    }
    
    // Remplir avec les absences
    const weekAbsences = getAbsencesByWeek(date);
    weekAbsences.forEach(absence => {
      const startDate = parseISO(absence.date_debut);
      const endDate = parseISO(absence.date_fin);
      
      // Ajouter l'absence à chaque jour concerné de la semaine
      Object.keys(weeklyPlanning).forEach(dayKey => {
        const day = parseISO(dayKey);
        if (isWithinInterval(day, { start: startDate, end: endDate })) {
          const employee = employees.find(emp => emp.id === absence.employee_id);
          weeklyPlanning[dayKey].push({
            ...absence,
            employee
          });
        }
      });
    });
    
    return weeklyPlanning;
  }, [getAbsencesByWeek, employees, selectedDate]);

  // ==================== UTILITAIRES ====================

  /**
   * Valider les données d'absence
   */
  const validateAbsence = useCallback((absenceData) => {
    const errors = [];
    
    if (!absenceData.employee_id) {
      errors.push('Employé requis');
    }
    
    if (!absenceData.date_debut) {
      errors.push('Date de début requise');
    }
    
    if (!absenceData.date_fin) {
      errors.push('Date de fin requise');
    }
    
    if (absenceData.date_debut && absenceData.date_fin) {
      const debut = parseISO(absenceData.date_debut);
      const fin = parseISO(absenceData.date_fin);
      
      if (debut > fin) {
        errors.push('La date de début doit être antérieure à la date de fin');
      }
    }
    
    if (!absenceData.type_absence) {
      errors.push('Type d\'absence requis');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  /**
   * Obtenir les types d'absence disponibles
   */
  const getAbsenceTypes = useCallback(() => {
    return ['Maladie', 'Congé', 'Formation', 'Absent'];
  }, []);

  /**
   * Obtenir les statuts d'absence disponibles (logistique)
   */
  const getAbsenceStatuses = useCallback(() => {
    if (service === 'logistique') {
      return ['En attente', 'Confirmée', 'Refusée'];
    }
    return [];
  }, [service]);

  // ==================== RETOUR DU HOOK ====================

  return {
    // Données
    absences,
    employees,
    loading,
    
    // Actions
    load,
    create,
    update,
    remove,
    
    // Filtrage et recherche
    filterAbsences,
    getEmployeeAbsencesForDate,
    isEmployeeAbsent,
    getAvailableEmployees,
    getAbsentEmployees,
    
    // Statistiques et analyse
    getStats,
    getConflicts,
    getAbsencesByWeek,
    getWeeklyAbsencePlanning,
    
    // Utilitaires
    validateAbsence,
    getAbsenceTypes,
    getAbsenceStatuses,
    
    // Propriétés dérivées
    totalAbsences: absences.length,
    isEmpty: absences.length === 0,
    hasConflicts: getConflicts().length > 0
  };
};

// Export par défaut
export default useAbsences; 