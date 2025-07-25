import { useCallback } from 'react';
import useCaddyStore from '../store';

/**
 * ========================================
 * HOOK EMPLOYÉS - NOUVELLE ARCHITECTURE
 * ========================================
 * 
 * Remplace useEmployeeManagement et tous les hooks dispersés
 * Utilise le store Zustand centralisé
 */

export const useEmployees = (service = 'cuisine') => {
  // Récupérer les données et actions du store
  const {
    employees,
    loading,
    loadEmployees,
    updateEmployee,
    createEmployee,
    deleteEmployee
  } = useCaddyStore(state => ({
    employees: state.employees[service] || [],
    loading: state.loading.employees,
    loadEmployees: state.loadEmployees,
    updateEmployee: state.updateEmployee,
    createEmployee: state.createEmployee,
    deleteEmployee: state.deleteEmployee
  }));

  // ==================== ACTIONS WRAPPÉES ====================

  /**
   * Charger les employés du service
   */
  const load = useCallback(async () => {
    await loadEmployees(service);
  }, [loadEmployees, service]);

  /**
   * Créer un nouvel employé
   */
  const create = useCallback(async (employeeData) => {
    return await createEmployee(service, employeeData);
  }, [createEmployee, service]);

  /**
   * Mettre à jour un employé
   */
  const update = useCallback(async (id, updates) => {
    return await updateEmployee(service, id, updates);
  }, [updateEmployee, service]);

  /**
   * Supprimer un employé
   */
  const remove = useCallback(async (id) => {
    return await deleteEmployee(service, id);
  }, [deleteEmployee, service]);

  // ==================== DONNÉES DÉRIVÉES ====================

  /**
   * Filtrer les employés par critères
   */
  const filterEmployees = useCallback((searchTerm = '', filters = {}) => {
    let filtered = employees;

    // Filtrage par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(emp => {
        const name = service === 'cuisine' ? emp.prenom : emp.nom;
        return name?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filtrage par profil (logistique)
    if (filters.profil && service === 'logistique') {
      filtered = filtered.filter(emp => emp.profil === filters.profil);
    }

    // Filtrage par langue
    if (filters.langue) {
      filtered = filtered.filter(emp => {
        if (service === 'cuisine') {
          return emp.langue_parlee?.toLowerCase().includes(filters.langue.toLowerCase());
        } else {
          return emp.langues?.some(lang => 
            lang.toLowerCase().includes(filters.langue.toLowerCase())
          );
        }
      });
    }

    // Filtrage par compétence (cuisine)
    if (filters.competence && service === 'cuisine') {
      const competenceField = filters.competence.toLowerCase().replace(' ', '_');
      filtered = filtered.filter(emp => emp[competenceField] === true);
    }

    // Filtrage par permis (logistique)
    if (filters.permis !== undefined && service === 'logistique') {
      filtered = filtered.filter(emp => emp.permis === filters.permis);
    }

    return filtered;
  }, [employees, service]);

  /**
   * Obtenir les compétences d'un employé (cuisine)
   */
  const getEmployeeCompetences = useCallback((employeeId) => {
    if (service !== 'cuisine') return [];

    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return [];

    const competences = [];
    const competenceFields = [
      'cuisine_chaude',
      'sandwichs', 
      'pain',
      'jus_de_fruits',
      'vaisselle',
      'legumerie',
      'self_midi',
      'equipe_pina_saskia'
    ];

    competenceFields.forEach(field => {
      if (employee[field]) {
        // Convertir le nom du champ en nom lisible
        const nom = field.replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        competences.push(nom);
      }
    });

    return competences;
  }, [employees, service]);

  /**
   * Obtenir les statistiques des employés
   */
  const getStats = useCallback(() => {
    const stats = {
      total: employees.length,
      actifs: employees.filter(emp => emp.actif !== false).length
    };

    if (service === 'logistique') {
      stats.profils = {
        Fort: employees.filter(emp => emp.profil === 'Fort').length,
        Moyen: employees.filter(emp => emp.profil === 'Moyen').length,
        Faible: employees.filter(emp => emp.profil === 'Faible').length
      };
      stats.permis = employees.filter(emp => emp.permis).length;
    }

    if (service === 'cuisine') {
      stats.competences = {};
      const competenceFields = [
        'cuisine_chaude',
        'sandwichs', 
        'pain',
        'jus_de_fruits',
        'vaisselle',
        'legumerie',
        'self_midi',
        'equipe_pina_saskia'
      ];

      competenceFields.forEach(field => {
        const nom = field.replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        stats.competences[nom] = employees.filter(emp => emp[field]).length;
      });
    }

    return stats;
  }, [employees, service]);

  /**
   * Vérifier la disponibilité d'un employé
   */
  const isEmployeeAvailable = useCallback((employeeId, date, session = 'matin') => {
    // Cette logique sera améliorée quand on intégrera les absences
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return false;

    // Pour l'instant, considérer l'employé comme disponible s'il est actif
    return employee.actif !== false;
  }, [employees]);

  // ==================== RETOUR DU HOOK ====================

  return {
    // Données
    employees,
    loading,
    
    // Actions
    load,
    create,
    update,
    remove,
    
    // Utilitaires
    filterEmployees,
    getEmployeeCompetences,
    getStats,
    isEmployeeAvailable,
    
    // Propriétés dérivées
    totalEmployees: employees.length,
    activeEmployees: employees.filter(emp => emp.actif !== false).length,
    isEmpty: employees.length === 0
  };
};

// Export par défaut
export default useEmployees; 