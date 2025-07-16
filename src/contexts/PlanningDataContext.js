import React, { createContext, useContext, useState, useCallback } from 'react';
import { format } from 'date-fns';

const PlanningDataContext = createContext();

export const usePlanningData = () => {
  const context = useContext(PlanningDataContext);
  if (!context) {
    throw new Error('usePlanningData must be used within a PlanningDataProvider');
  }
  return context;
};

export const PlanningDataProvider = ({ children }) => {
  // ✅ États centralisés - UNE SEULE SOURCE DE VÉRITÉ
  const [planningData, setPlanningData] = useState({
    postes: [],
    employeesCuisine: [],
    planning: [],
    absences: [],
    competencesMap: {},
    selectedDate: new Date(),
    currentSession: 'matin',
    loading: false,
    lastUpdate: null
  });

  // ✅ Fonction pour mettre à jour toutes les données (utilisée par le planning interactif)
  const updatePlanningData = useCallback((newData) => {
    console.log('📊 CONTEXTE - Mise à jour des données:', Object.keys(newData));
    setPlanningData(prev => ({
      ...prev,
      ...newData,
      lastUpdate: new Date()
    }));
  }, []);

  // ✅ Fonction pour obtenir les employés d'un poste (LOGIQUE CENTRALISÉE)
  const getEmployeesForPosteCreneau = useCallback((posteName, creneau) => {
    const { postes, planning, employeesCuisine, absences, selectedDate } = planningData;
    
    console.log(`🔍 CONTEXTE - getEmployeesForPosteCreneau:`, { posteName, creneau });
    
    const poste = postes.find(p => p.nom === posteName);
    if (!poste) {
      console.warn(`❌ CONTEXTE - Poste "${posteName}" non trouvé`);
      return [];
    }
    
    // Filtrer les employés présents (pas absents)
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const absentEmployeeIds = absences
      .filter(abs => abs.statut === 'Confirmée' && dateStr >= abs.date_debut && dateStr <= abs.date_fin)
      .map(abs => abs.employee_id);
    
    const presentEmployees = employeesCuisine.filter(ec => !absentEmployeeIds.includes(ec.employee.id));

    // Logique principale : récupérer du planning
    let filteredPlanning;
    if (creneau) {
      // Avec créneau spécifique
      filteredPlanning = planning.filter(p => p.poste_id === poste.id && p.creneau === creneau);
    } else {
      // Sans créneau = tous les employés du poste
      filteredPlanning = planning.filter(p => p.poste_id === poste.id);
    }
    
    console.log(`📋 CONTEXTE - Planning filtré:`, filteredPlanning.length, 'entrées');

    const result = filteredPlanning.map(p => {
      const employeeCuisine = presentEmployees.find(ec => ec.employee_id === p.employee_id);
      if (!employeeCuisine) {
        console.warn(`❌ CONTEXTE - EmployeeCuisine non trouvé pour employee_id ${p.employee_id}`);
        return null;
      }
      
      return {
        ...p,
        employee: employeeCuisine.employee,
        photo_url: employeeCuisine.photo_url
      };
    }).filter(Boolean);
    
    console.log(`🎯 CONTEXTE - Résultat final:`, result.length, 'employés pour', posteName, creneau || 'global');
    return result;
  }, [planningData]);

  const value = {
    // Données
    ...planningData,
    // Actions
    updatePlanningData,
    getEmployeesForPosteCreneau
  };

  return (
    <PlanningDataContext.Provider value={value}>
      {children}
    </PlanningDataContext.Provider>
  );
}; 