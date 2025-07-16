import { supabase } from './supabase';

/**
 * ========================================
 * API UNIFIÉE SUPABASE
 * ========================================
 * 
 * Cette bibliothèque centralise l'accès aux données
 * et remplace progressivement les anciennes API spécialisées
 */

export const unifiedSupabase = {
  
  // ==================== EMPLOYÉS UNIFIÉS ====================
  
  employees: {
    
    /**
     * Récupérer tous les employés
     * REMPLACE: supabase.getEmployees()
     */
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('nom');
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur getAll employees:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer les employés de cuisine
     * REMPLACE: supabaseCuisine.getEmployeesCuisine()
     */
    async getCuisine() {
      try {
        const { data, error } = await supabase
          .from('employes_cuisine_new')
          .select('*')
          .eq('actif', true)
          .order('prenom');
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur getCuisine employees:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer les employés logistique
     * REMPLACE: supabaseLogistique.getEmployeesLogistique()
     */
    async getLogistique() {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .or('department.eq.logistique,department.is.null')
          .eq('statut', 'Actif')
          .order('nom');
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur getLogistique employees:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Créer un nouvel employé cuisine
     */
    async createCuisine(employeeData) {
      try {
        const { data, error } = await supabase
          .from('employes_cuisine_new')
          .insert(employeeData)
          .select();
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur createCuisine employee:', err);
        return { data: null, error: err };
      }
    },

    /**
     * Mettre à jour un employé cuisine
     */
    async updateCuisine(id, updates) {
      try {
        const { data, error } = await supabase
          .from('employes_cuisine_new')
          .update(updates)
          .eq('id', id)
          .select();
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur updateCuisine employee:', err);
        return { data: null, error: err };
      }
    }
  },

  // ==================== PLANNING UNIFIÉ ====================
  
  planning: {
    
    /**
     * Récupérer le planning logistique
     * REMPLACE: supabaseLogistique.getPlanningLogistique()
     */
    async getLogistique(dateDebut = null, dateFin = null) {
      try {
        let query = supabase
          .from('planning')
          .select(`
            *,
            employee:employees(*),
            vehicle:vehicles(*)
          `);
        
        if (dateDebut) {
          if (dateFin) {
            query = query.gte('date', dateDebut).lte('date', dateFin);
          } else {
            query = query.eq('date', dateDebut);
          }
        }
        
        const { data, error } = await query.order('date').order('heure_debut');
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur getLogistique planning:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer le planning cuisine
     * REMPLACE: supabaseCuisine.getPlanningCuisine()
     */
    async getCuisine(dateDebut = null, dateFin = null) {
      try {
        let query = supabase
          .from('planning_cuisine_new')
          .select(`
            *,
            employe:employes_cuisine_new(id, prenom, photo_url)
          `);
        
        if (dateDebut) {
          if (dateFin) {
            query = query.gte('date', dateDebut).lte('date', dateFin);
          } else {
            query = query.eq('date', dateDebut);
          }
        }
        
        const { data, error } = await query.order('date').order('heure_debut');
        
        if (error) throw error;
        
        // Adapter le format pour la compatibilité
        const planningAdapte = data.map(item => ({
          id: item.id,
          date: item.date,
          employee_id: item.employee_id,
          poste: {
            nom: item.poste,
            couleur: item.poste_couleur,
            icone: item.poste_icone
          },
          creneau: item.creneau,
          heure_debut: item.heure_debut,
          heure_fin: item.heure_fin,
          role: item.role,
          notes: item.notes,
          employee: item.employe ? {
            id: item.employe.id,
            nom: item.employe.prenom,
            prenom: item.employe.prenom,
            photo_url: item.employe.photo_url
          } : null
        }));
        
        return { data: planningAdapte, error: null };
      } catch (error) {
        console.error('❌ Erreur getCuisine planning:', error);
        return { data: [], error };
      }
    },

    /**
     * Créer une affectation planning cuisine
     */
    async createCuisine(planningData) {
      try {
        const { data, error } = await supabase
          .from('planning_cuisine_new')
          .insert(planningData)
          .select();
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur createCuisine planning:', err);
        return { data: null, error: err };
      }
    },

    /**
     * Mettre à jour une affectation planning cuisine
     */
    async updateCuisine(id, updates) {
      try {
        const { data, error } = await supabase
          .from('planning_cuisine_new')
          .update(updates)
          .eq('id', id)
          .select();
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur updateCuisine planning:', err);
        return { data: null, error: err };
      }
    },

    /**
     * Supprimer une affectation planning cuisine
     */
    async deleteCuisine(id) {
      try {
        const { data, error } = await supabase
          .from('planning_cuisine_new')
          .delete()
          .eq('id', id);
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur deleteCuisine planning:', err);
        return { data: null, error: err };
      }
    }
  },

  // ==================== ABSENCES UNIFIÉES ====================
  
  absences: {
    
    /**
     * Récupérer les absences logistique
     * REMPLACE: supabaseLogistique.getAbsencesLogistique()
     */
    async getLogistique(dateDebut = null, dateFin = null) {
      try {
        let query = supabase
          .from('absences')
          .select(`
            *,
            employee:employees(*)
          `);
        
        if (dateDebut && dateFin) {
          query = query.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
        } else if (dateDebut) {
          query = query.lte('date_debut', dateDebut).gte('date_fin', dateDebut);
        }
        
        const { data, error } = await query.order('date_debut');
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur getLogistique absences:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer les absences cuisine
     * REMPLACE: supabaseCuisine.getAbsencesCuisine()
     */
    async getCuisine(dateDebut = null, dateFin = null) {
      try {
        let query = supabase
          .from('absences_cuisine_new')
          .select(`
            *,
            employe:employes_cuisine_new(id, prenom, photo_url)
          `);
        
        if (dateDebut && dateFin) {
          query = query.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
        } else if (dateDebut) {
          query = query.lte('date_debut', dateDebut).gte('date_fin', dateDebut);
        }
        
        const { data, error } = await query.order('date_debut');
        
        if (error) throw error;
        
        return { data, error };
      } catch (error) {
        console.error('❌ Erreur getCuisine absences:', error);
        return { data: [], error };
      }
    },

    /**
     * Créer une absence cuisine
     */
    async createCuisine(absenceData) {
      try {
        const { data, error } = await supabase
          .from('absences_cuisine_new')
          .insert(absenceData)
          .select(`
            *,
            employe:employes_cuisine_new(id, prenom, photo_url)
          `);
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur createCuisine absence:', err);
        return { data: null, error: err };
      }
    },

    /**
     * Mettre à jour une absence cuisine
     */
    async updateCuisine(id, updates) {
      try {
        const { data, error } = await supabase
          .from('absences_cuisine_new')
          .update(updates)
          .eq('id', id)
          .select();
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur updateCuisine absence:', err);
        return { data: null, error: err };
      }
    },

    /**
     * Supprimer une absence cuisine
     */
    async deleteCuisine(id) {
      try {
        const { data, error } = await supabase
          .from('absences_cuisine_new')
          .delete()
          .eq('id', id);
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur deleteCuisine absence:', err);
        return { data: null, error: err };
      }
    }
  },

  // ==================== VÉHICULES ====================
  
  vehicles: {
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('nom');
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur getAll vehicles:', err);
        return { data: [], error: err };
      }
    }
  },

  // ==================== COMPÉTENCES ====================
  
  competences: {
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('competences')
          .select(`
            *,
            employee:employees(*),
            vehicle:vehicles(*)
          `)
          .order('created_at');
        
        return { data, error };
      } catch (err) {
        console.error('❌ Erreur getAll competences:', err);
        return { data: [], error: err };
      }
    }
  }
};

export default unifiedSupabase; 