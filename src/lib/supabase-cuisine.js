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
        .eq('employees.statut', 'Actif')
        .in('service', ['Cuisine', 'Mixte']);
      
      if (error) {
        console.error('❌ Erreur getEmployeesCuisine:', error);
        // Fallback : récupérer tous et filtrer localement
        const { data: allData, error: allError } = await supabase
          .from('employees_cuisine')
          .select(`
            *,
            employee:employees(*)
          `)
          .eq('employees.statut', 'Actif');
        
        if (allError) throw allError;
        
        console.log('🔄 Fallback: filtrage local des employés de cuisine');
        return { 
          data: allData.filter(ec => 
            ec.service === 'Cuisine' || ec.service === 'Mixte'
          ), 
          error: null 
        };
      } else {
        console.log('✅ Employés de cuisine récupérés:', data?.length || 0);
        return { data, error };
      }
    } catch (error) {
      console.error('❌ Erreur critique getEmployeesCuisine:', error);
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
        .eq('employees.statut', 'Actif')
        .in('service', ['Cuisine', 'Mixte']);
      
      if (error) {
        console.error('❌ Erreur getEmployeesCuisineWithCompetences:', error);
        // Fallback : récupérer tous et filtrer localement
        const { data: allData, error: allError } = await supabase
          .from('employees_cuisine')
          .select(`
            *,
            employee:employees(*)
          `)
          .eq('employees.statut', 'Actif');
        
        if (allError) throw allError;
        
        console.log('🔄 Fallback: filtrage local des employés de cuisine avec compétences');
        return { 
          data: allData.filter(ec => 
            ec.service === 'Cuisine' || ec.service === 'Mixte'
          ), 
          error: null 
        };
      } else {
        console.log('✅ Employés de cuisine avec compétences récupérés:', data?.length || 0);
        return { data, error };
      }
    } catch (error) {
      console.error('❌ Erreur critique getEmployeesCuisineWithCompetences:', error);
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

  async getPlanningCuisineRange(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('planning_cuisine')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      return { data, error };
    } catch (error) {
      console.error('Erreur getPlanningCuisineRange:', error);
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
      const { data: absences, error } = await supabase
        .from('absences')
        .select('id')
        .eq('employee_id', employeeId)
        .lte('date_debut', date)
        .gte('date_fin', date);
      
      if (error) throw error;
      
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
  },

  // ==================== GESTION DES ABSENCES CUISINE ====================
  
  async getAbsencesCuisine(dateDebut = null, dateFin = null) {
    try {
      console.log('🔍 Récupération des absences cuisine...', { dateDebut, dateFin });
      
      let query = supabase
        .from('absences_cuisine')
        .select(`
          *,
          employee:employees!absences_cuisine_employee_id_fkey(nom, prenom, profil)
        `)
        .order('date_debut', { ascending: false });

      // Filtrer par période si spécifié
      if (dateDebut && dateFin) {
        query = query.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Erreur getAbsencesCuisine avec jointure:', error);
        
        // Fallback : récupération simple sans jointure
        console.log('🔄 Tentative sans jointure...');
        let simpleQuery = supabase
          .from('absences_cuisine')
          .select('*')
          .order('date_debut', { ascending: false });
        
        if (dateDebut && dateFin) {
          simpleQuery = simpleQuery.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
        }
        
        const { data: simpleData, error: simpleError } = await simpleQuery;
        
        if (simpleError) {
          console.error('❌ Erreur simple getAbsencesCuisine:', simpleError);
          return { data: [], error: simpleError };
        }
        
        console.log('✅ Absences cuisine récupérées (mode simple):', simpleData?.length || 0);
        return { data: simpleData || [], error: null };
      }
      
      console.log('✅ Absences cuisine récupérées avec jointure:', data?.length || 0);
      return { data: data || [], error: null };

    } catch (err) {
      console.error('❌ Erreur critique getAbsencesCuisine:', err);
      return { data: [], error: err };
    }
  },

  async getAbsencesCuisineRange(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('absences_cuisine')
        .select('*')
        .gte('date_debut', startDate)
        .lte('date_fin', endDate);

      return { data, error };
    } catch (error) {
      console.error('Erreur getAbsencesCuisineRange:', error);
      return { data: null, error };
    }
  },

  async createAbsenceCuisine(absenceData) {
    try {
      console.log('➕ Création absence cuisine:', absenceData);
      
      const { data, error } = await supabase
        .from('absences_cuisine')
        .insert([{
          ...absenceData,
          created_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Erreur createAbsenceCuisine:', error);
      } else {
        console.log('✅ Absence cuisine créée:', data);
      }
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur critique createAbsenceCuisine:', err);
      return { data: null, error: err };
    }
  },

  async updateAbsenceCuisine(id, updates) {
    try {
      const { data, error } = await supabase
        .from('absences_cuisine')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Erreur updateAbsenceCuisine:', err);
      return { data: null, error: err };
    }
  },

  async updateAbsenceCuisineRange(startDate, endDate, updates) {
    try {
      const { data, error } = await supabase
        .from('absences_cuisine')
        .update(updates)
        .gte('date_debut', startDate)
        .lte('date_fin', endDate);

      return { data, error };
    } catch (err) {
      console.error('Erreur updateAbsenceCuisineRange:', err);
      return { data: null, error: err };
    }
  },

  async deleteAbsenceCuisine(id) {
    try {
      const { data, error } = await supabase
        .from('absences_cuisine')
        .delete()
        .eq('id', id);

      return { data, error };
    } catch (err) {
      console.error('Erreur deleteAbsenceCuisine:', err);
      return { data: null, error: err };
    }
  },

  async deleteAbsenceCuisineRange(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('absences_cuisine')
        .delete()
        .gte('date_debut', startDate)
        .lte('date_fin', endDate);

      return { data, error };
    } catch (err) {
      console.error('Erreur deleteAbsenceCuisineRange:', err);
      return { data: null, error: err };
    }
  },

  // Statistiques d'absence cuisine
  async getAbsenceStatsCuisine(dateDebut, dateFin) {
    try {
      const { data: absences, error } = await this.getAbsencesCuisine(dateDebut, dateFin);
      if (error) throw error;

      const { data: employeesCuisine, error: empError } = await this.getEmployeesCuisine();
      if (empError) throw empError;

      const stats = {
        total: absences.length,
        parType: {},
        parStatut: {},
        parEmploye: {},
        dureesMoyennes: {},
        tendances: []
      };

      absences.forEach(absence => {
        // Par type
        stats.parType[absence.type_absence] = (stats.parType[absence.type_absence] || 0) + 1;
        
        // Par statut
        stats.parStatut[absence.statut] = (stats.parStatut[absence.statut] || 0) + 1;
        
        // Par employé
        const employeeCuisine = employeesCuisine.find(ec => ec.employee_id === absence.employee_id);
        const employeeName = employeeCuisine?.employee?.nom || 'Inconnu';
        stats.parEmploye[employeeName] = (stats.parEmploye[employeeName] || 0) + 1;
        
        // Durées
        const debut = new Date(absence.date_debut);
        const fin = new Date(absence.date_fin);
        const duree = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)) + 1;
        
        if (!stats.dureesMoyennes[absence.type_absence]) {
          stats.dureesMoyennes[absence.type_absence] = [];
        }
        stats.dureesMoyennes[absence.type_absence].push(duree);
      });

      // Calculer les moyennes
      Object.keys(stats.dureesMoyennes).forEach(type => {
        const durees = stats.dureesMoyennes[type];
        stats.dureesMoyennes[type] = {
          moyenne: durees.reduce((a, b) => a + b, 0) / durees.length,
          total: durees.length
        };
      });

      return { data: stats, error: null };

    } catch (error) {
      console.error('Erreur getAbsenceStatsCuisine:', error);
      return { data: null, error };
    }
  },

  // Fonction pour le planning intelligent intégrant les absences cuisine
  async getPlanningCuisineWithAvailability(dateDebut, dateFin) {
    try {
      // Récupérer planning, absences et employés en parallèle
      const [planningResult, absencesResult, employeesResult] = await Promise.all([
        this.getPlanningCuisine(dateDebut, dateFin),
        this.getAbsencesCuisine(dateDebut, dateFin),
        this.getEmployeesCuisine()
      ]);

      if (planningResult.error) throw planningResult.error;
      if (absencesResult.error) throw absencesResult.error;
      if (employeesResult.error) throw employeesResult.error;

      const planning = planningResult.data || [];
      const absences = absencesResult.data || [];
      const employeesCuisine = employeesResult.data || [];

      // Enrichir le planning avec les informations d'absence
      const enrichedPlanning = planning.map(planItem => {
        const employeeCuisine = employeesCuisine.find(ec => ec.employee_id === planItem.employee_id);
        const employeeAbsences = absences.filter(a => 
          a.employee_id === planItem.employee_id &&
          a.statut === 'Confirmée' &&
          planItem.date >= a.date_debut &&
          planItem.date <= a.date_fin
        );

        return {
          ...planItem,
          employeeCuisine,
          isAbsent: employeeAbsences.length > 0,
          absenceInfo: employeeAbsences[0] || null,
          needsReplacement: employeeAbsences.length > 0
        };
      });

      return { 
        data: enrichedPlanning,
        conflicts: enrichedPlanning.filter(p => p.isAbsent),
        error: null 
      };

    } catch (error) {
      console.error('Erreur getPlanningCuisineWithAvailability:', error);
      return { data: null, conflicts: [], error };
    }
  }
};

export default supabaseCuisine; 