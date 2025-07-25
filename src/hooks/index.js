/**
 * ========================================
 * HOOKS CENTRALISÉS - NOUVELLE ARCHITECTURE
 * ========================================
 * 
 * Point d'entrée unique pour tous les hooks
 * Remplace les hooks dispersés dans l'ancienne architecture
 */

// Hooks principaux utilisant le store Zustand
export { default as useEmployees } from './useEmployees';
export { default as usePlanning } from './usePlanning';
export { default as useAbsences } from './useAbsences';

// Hook du store principal
export { default as useCaddyStore } from '../store';

// Anciens hooks gardés pour compatibilité temporaire
// (à supprimer progressivement lors de la migration)
export { useSafeState, useSafeObject, useSafeError } from './useSafeState';
export { useDataCache } from './useDataCache';

/**
 * ========================================
 * HOOKS COMPOSÉS - NOUVELLE ARCHITECTURE
 * ========================================
 */

/**
 * Hook composé pour la gestion complète d'un module
 * Combine employés, planning et absences pour un service
 */
export const useModule = (service = 'cuisine') => {
  const employees = useEmployees(service);
  const planning = usePlanning(service);
  const absences = useAbsences(service);
  
  // Store global pour l'état partagé
  const {
    selectedDate,
    selectedSession,
    user,
    setSelectedDate,
    setSelectedSession,
    healthCheck
  } = useCaddyStore(state => ({
    selectedDate: state.selectedDate,
    selectedSession: state.selectedSession,
    user: state.user,
    setSelectedDate: state.setSelectedDate,
    setSelectedSession: state.setSelectedSession,
    healthCheck: state.healthCheck
  }));

  /**
   * Charger toutes les données du module
   */
  const loadAll = async () => {
    const promises = [
      employees.load(),
      planning.load(),
      absences.load()
    ];

    // Charger véhicules et compétences pour logistique
    if (service === 'logistique') {
      const { loadVehicles, loadCompetences } = useCaddyStore.getState();
      promises.push(loadVehicles(), loadCompetences());
    }

    try {
      await Promise.all(promises);
      console.log(`✅ Module ${service} entièrement chargé`);
    } catch (error) {
      console.error(`❌ Erreur chargement module ${service}:`, error);
    }
  };

  /**
   * Obtenir un tableau de bord complet du module
   */
  const getDashboard = () => {
    const employeeStats = employees.getStats();
    const planningStats = planning.getStats();
    const absenceStats = absences.getStats();

    return {
      service,
      employees: {
        total: employeeStats.total,
        actifs: employeeStats.actifs,
        stats: employeeStats
      },
      planning: {
        assignments: planningStats.totalAssignments,
        employeesUsed: planningStats.uniqueEmployees,
        coverage: planningStats.coverage,
        hasUnsavedChanges: planning.hasUnsavedChanges
      },
      absences: {
        total: absenceStats.total,
        absentToday: absenceStats.absentAujourdhui,
        conflicts: absences.hasConflicts,
        stats: absenceStats
      },
      selectedDate,
      selectedSession,
      lastUpdate: new Date()
    };
  };

  /**
   * Actions globales du module
   */
  const actions = {
    loadAll,
    getDashboard,
    setDate: setSelectedDate,
    setSession: setSelectedSession,
    healthCheck
  };

  return {
    // Données des sous-modules
    employees,
    planning,
    absences,
    
    // État global
    selectedDate,
    selectedSession,
    user,
    service,
    
    // Actions globales
    ...actions,
    
    // Données agrégées
    dashboard: getDashboard(),
    
    // État de chargement global
    loading: employees.loading || planning.loading || absences.loading,
    
    // Indicateurs d'état
    hasData: !employees.isEmpty || planning.hasData || !absences.isEmpty,
    hasUnsavedChanges: planning.hasUnsavedChanges
  };
};

/**
 * Hook pour la navigation et l'état UI global
 */
export const useNavigation = () => {
  const {
    selectedService,
    selectedDate,
    selectedSession,
    user,
    setSelectedService,
    setSelectedDate,
    setSelectedSession,
    signOut
  } = useCaddyStore(state => ({
    selectedService: state.selectedService,
    selectedDate: state.selectedDate,
    selectedSession: state.selectedSession,
    user: state.user,
    setSelectedService: state.setSelectedService,
    setSelectedDate: state.setSelectedDate,
    setSelectedSession: state.setSelectedSession,
    signOut: state.signOut
  }));

  return {
    // État actuel
    currentService: selectedService,
    currentDate: selectedDate,
    currentSession: selectedSession,
    user,
    
    // Navigation
    goToService: setSelectedService,
    goToDate: setSelectedDate,
    goToSession: setSelectedSession,
    logout: signOut,
    
    // Utilitaires
    isLoggedIn: !!user,
    canAccess: (service) => {
      // Logique d'autorisation simple
      if (!user) return false;
      if (user.role === 'admin') return true;
      return user.service === service || user.service === 'all';
    }
  };
};

/**
 * Hook pour les notifications et messages d'état
 */
export const useNotifications = () => {
  const {
    hasUnsavedChanges,
    lastUpdate
  } = useCaddyStore(state => ({
    hasUnsavedChanges: state.hasUnsavedChanges,
    lastUpdate: state.lastUpdate
  }));

  const getStatusMessage = () => {
    if (hasUnsavedChanges) {
      return {
        type: 'warning',
        message: 'Vous avez des modifications non sauvegardées'
      };
    }

    if (lastUpdate) {
      const timeSinceUpdate = Date.now() - lastUpdate.getTime();
      if (timeSinceUpdate < 30000) { // 30 secondes
        return {
          type: 'success',
          message: 'Données à jour'
        };
      }
    }

    return {
      type: 'info',
      message: 'Prêt'
    };
  };

  return {
    hasUnsavedChanges,
    lastUpdate,
    statusMessage: getStatusMessage()
  };
};

/**
 * Hook pour la synchronisation des données
 */
export const useSync = () => {
  const {
    lastUpdate,
    loading,
    healthCheck
  } = useCaddyStore(state => ({
    lastUpdate: state.lastUpdate,
    loading: state.loading,
    healthCheck: state.healthCheck
  }));

  const isOnline = navigator.onLine;

  const getConnectionStatus = () => {
    if (!isOnline) return 'offline';
    if (Object.values(loading).some(Boolean)) return 'syncing';
    if (lastUpdate && Date.now() - lastUpdate.getTime() < 60000) return 'synced';
    return 'unknown';
  };

  return {
    isOnline,
    lastUpdate,
    connectionStatus: getConnectionStatus(),
    healthCheck,
    isSyncing: Object.values(loading).some(Boolean)
  };
};

// Export de tous les hooks pour faciliter l'importation
export default {
  useEmployees,
  usePlanning,
  useAbsences,
  useModule,
  useNavigation,
  useNotifications,
  useSync,
  useCaddyStore
}; 