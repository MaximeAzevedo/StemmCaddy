import { supabase } from './supabase';

export const supabaseCuisine = {
  // ==================== POSTES DE CUISINE ====================
  
  async getPostes() {
    try {
      const { data, error } = await supabase
        .from('postes_cuisine')
        .select('*')
        .eq('actif', true)
        .order('ordre_affichage');
      
      return { data, error };
    } catch (error) {
      console.error('Erreur getPostes:', error);
      return { data: null, error };
    }
  },

  async createPoste(posteData) {
    try {
      const { data, error } = await supabase
        .from('postes_cuisine')
        .insert([posteData])
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Erreur createPoste:', error);
      return { data: null, error };
    }
  },

  async updatePoste(id, posteData) {
    try {
      const { data, error } = await supabase
        .from('postes_cuisine')
        .update(posteData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Erreur updatePoste:', error);
      return { data: null, error };
    }
  },

  // ==================== EMPLOYÉS CUISINE ====================
  
  async getEmployeesCuisine() {
    try {
      const { data, error } = await supabase
        .from('employees_cuisine')
        .select(`
          *,
          employee:employees(*)
        `)
        .eq('employees.statut', 'Actif');
      
      return { data, error };
    } catch (error) {
      console.error('Erreur getEmployeesCuisine:', error);
      return { data: null, error };
    }
  },

  async getEmployeesCuisineWithCompetences() {
    try {
      const { data, error } = await supabase
        .from('employees_cuisine')
        .select(`
          *,
          employee:employees(*)
        `)
        .eq('employees.statut', 'Actif');
      
      return { data, error };
    } catch (error) {
      console.error('Erreur getEmployeesCuisineWithCompetences:', error);
      return { data: null, error };
    }
  },

  async createEmployeeCuisine(employeeCuisineData) {
    try {
      const { data, error } = await supabase
        .from('employees_cuisine')
        .insert([employeeCuisineData])
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Erreur createEmployeeCuisine:', error);
      return { data: null, error };
    }
  },

  async updateEmployeeCuisine(employeeId, employeeCuisineData) {
    try {
      const { data, error } = await supabase
        .from('employees_cuisine')
        .update(employeeCuisineData)
        .eq('employee_id', employeeId)
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Erreur updateEmployeeCuisine:', error);
      return { data: null, error };
    }
  },

  // ==================== COMPÉTENCES CUISINE ====================
  
  async getCompetencesCuisine(employeeId = null) {
    try {
      let query = supabase
        .from('competences_cuisine')
        .select(`
          *,
          employee:employees(*),
          poste:postes_cuisine(*),
          formateur:employees!competences_cuisine_formateur_id_fkey(*)
        `);
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      return { data, error };
    } catch (error) {
      console.error('Erreur getCompetencesCuisine:', error);
      return { data: null, error };
    }
  },

  // Version simplifiée sans jointures pour performances / conflit RLS
  async getCompetencesCuisineSimple(employeeId = null) {
    try {
      let query = supabase
        .from('competences_cuisine')
        .select('*'); // Pas de jointure, simple listing

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      console.error('Erreur getCompetencesCuisineSimple:', error);
      return { data: null, error };
    }
  },

  async createCompetenceCuisine(competenceData) {
    try {
      const { data, error } = await supabase
        .from('competences_cuisine')
        .insert([competenceData])
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Erreur createCompetenceCuisine:', error);
      return { data: null, error };
    }
  },

  async updateCompetenceCuisine(id, competenceData) {
    try {
      const { data, error } = await supabase
        .from('competences_cuisine')
        .update(competenceData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Erreur updateCompetenceCuisine:', error);
      return { data: null, error };
    }
  },

  async deleteCompetenceCuisine(id) {
    try {
      const { data, error } = await supabase
        .from('competences_cuisine')
        .delete()
        .eq('id', id);
      
      return { data, error };
    } catch (error) {
      console.error('Erreur deleteCompetenceCuisine:', error);
      return { data: null, error };
    }
  },

  // ==================== PLANNING CUISINE ====================
  
  async getPlanningCuisine(dateDebut = null, dateFin = null) {
    try {
      let query = supabase
        .from('planning_cuisine')
        .select(`
          *,
          employee:employees(*),
          poste:postes_cuisine(*)
        `);
      
      // Si aucune date n'est fournie, récupérer tout le planning
      if (dateDebut) {
        if (dateFin) {
          query = query.gte('date', dateDebut).lte('date', dateFin);
        } else {
          query = query.eq('date', dateDebut);
        }
      }
      // Si pas de date, on récupère tout (pas de filtre de date)
      
      const { data, error } = await query.order('date').order('creneau');
      
      return { data, error };
    } catch (error) {
      console.error('Erreur getPlanningCuisine:', error);
      return { data: null, error };
    }
  },

  async createPlanningCuisine(planningData) {
    try {
      const { data, error } = await supabase
        .from('planning_cuisine')
        .insert([planningData])
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Erreur createPlanningCuisine:', error);
      return { data: null, error };
    }
  },

  async updatePlanningCuisine(id, planningData) {
    try {
      const { data, error } = await supabase
        .from('planning_cuisine')
        .update(planningData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Erreur updatePlanningCuisine:', error);
      return { data: null, error };
    }
  },

  async deletePlanningCuisine(id) {
    try {
      const { data, error } = await supabase
        .from('planning_cuisine')
        .delete()
        .eq('id', id);
      
      return { data, error };
    } catch (error) {
      console.error('Erreur deletePlanningCuisine:', error);
      return { data: null, error };
    }
  },

  // ==================== CRÉNEAUX HORAIRES ====================
  
  async getCreneaux() {
    try {
      const { data, error } = await supabase
        .from('creneaux_cuisine')
        .select('*')
        .eq('actif', true)
        .order('ordre_affichage');
      
      return { data, error };
    } catch (error) {
      console.error('Erreur getCreneaux:', error);
      return { data: null, error };
    }
  },

  // ==================== FONCTIONS MÉTIER ====================
  
  async getAvailableEmployeesCuisine(date, creneau, posteId = null) {
    try {
      // Récupérer tous les employés cuisine
      const { data: allEmployees, error: empError } = await this.getEmployeesCuisineWithCompetences();
      if (empError) throw empError;

      // Récupérer les absences pour cette date
      const { data: absences, error: absError } = await supabase
        .from('absences')
        .select('employee_id')
        .lte('date_debut', date)
        .gte('date_fin', date);
      if (absError) throw absError;

      // Récupérer le planning existant
      const { data: planning, error: planError } = await this.getPlanningCuisine(date);
      if (planError) throw planError;

      const absentIds = absences.map(a => a.employee_id);
      const planifiedIds = planning
        .filter(p => p.creneau === creneau)
        .map(p => p.employee_id);

      // Filtrer les employés disponibles
      let availableEmployees = allEmployees.filter(emp => 
        !absentIds.includes(emp.employee.id) && 
        !planifiedIds.includes(emp.employee.id)
      );

      // Si un poste spécifique est demandé, filtrer par compétences
      if (posteId) {
        availableEmployees = availableEmployees.filter(emp =>
          emp.competences_cuisine.some(comp => comp.poste.id === posteId)
        );
      }

      return { data: availableEmployees.map(emp => emp.employee), error: null };
    } catch (error) {
      console.error('Erreur getAvailableEmployeesCuisine:', error);
      return { data: null, error };
    }
  },

  async isEmployeeAvailableCuisine(employeeId, date) {
    try {
      // Vérifier les absences
      const { data: absences, error: absError } = await supabase
        .from('absences')
        .select('id')
        .eq('employee_id', employeeId)
        .lte('date_debut', date)
        .gte('date_fin', date);
      
      if (absError) throw absError;
      
      const available = absences.length === 0;
      return { available, error: null };
    } catch (error) {
      console.error('Erreur isEmployeeAvailableCuisine:', error);
      return { available: false, error };
    }
  },

  async getStatistiquesCuisine(date) {
    try {
      const [postesResult, employeesResult, planningResult] = await Promise.all([
        this.getPostes(),
        this.getEmployeesCuisine(),
        this.getPlanningCuisine(date)
      ]);

      if (postesResult.error || employeesResult.error || planningResult.error) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const stats = {
        totalPostes: postesResult.data.length,
        totalEmployees: employeesResult.data.length,
        employeesPlanned: new Set(planningResult.data.map(p => p.employee_id)).size,
        postesOccupes: new Set(planningResult.data.map(p => p.poste_id)).size,
        tauxOccupationEmployees: Math.round((new Set(planningResult.data.map(p => p.employee_id)).size / employeesResult.data.length) * 100),
        tauxOccupationPostes: Math.round((new Set(planningResult.data.map(p => p.poste_id)).size / postesResult.data.length) * 100)
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Erreur getStatistiquesCuisine:', error);
      return { data: null, error };
    }
  },

  // ==================== GESTION DES REMPLACEMENTS ====================
  
  async suggestReplacementCuisine(employeeId, date, creneau) {
    try {
      // Récupérer les affectations de l'employé absent
      const { data: affectations, error: affError } = await this.getPlanningCuisine(date);
      if (affError) throw affError;

      const employeeAffectations = affectations.filter(a => 
        a.employee_id === employeeId && a.creneau === creneau
      );

      if (employeeAffectations.length === 0) {
        return { data: [], error: null };
      }

      const suggestions = [];

      for (const affectation of employeeAffectations) {
        // Trouver des remplaçants compétents
        const { data: availableEmployees, error: availError } = await this.getAvailableEmployeesCuisine(
          date, 
          creneau, 
          affectation.poste_id
        );
        
        if (availError) continue;

        const suggestion = {
          poste: affectation.poste,
          creneau: affectation.creneau,
          remplacants: availableEmployees.slice(0, 3) // Top 3 suggestions
        };

        suggestions.push(suggestion);
      }

      return { data: suggestions, error: null };
    } catch (error) {
      console.error('Erreur suggestReplacementCuisine:', error);
      return { data: null, error };
    }
  }
};

export default supabaseCuisine; 