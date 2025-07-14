import { supabase } from './supabase';

/**
 * 🏗️ API SUPABASE UNIFIÉE
 * 
 * Remplace tous les clients disparates (supabase-cuisine, supabase-secretariat, etc.)
 * par une seule API cohérente et optimisée.
 * 
 * OBJECTIFS :
 * ✅ Éliminer les redondances de tables
 * ✅ Centraliser toutes les requêtes  
 * ✅ Éviter les boucles infinies
 * ✅ Garantir la cohérence des données
 */

export const unifiedSupabase = {
  
  // ==================== EMPLOYÉS UNIFIÉS ====================
  
  employees: {
    /**
     * Récupérer tous les employés
     */
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('nom');
        
        return { data: data || [], error };
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
          .from('employees')
          .select('*')
          .or('department.eq.cuisine,department.is.null') // Support legacy + nouveaux
          .order('nom');
        
        // Transformer pour compatibilité avec l'ancien format
        const transformedData = (data || []).map(emp => ({
          employee_id: emp.id,
          employee: emp,
          photo_url: emp.photo_url || null
        }));
        
        return { data: transformedData, error };
      } catch (err) {
        console.error('❌ Erreur getCuisine employees:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer les employés de logistique/transport
     * REMPLACE: supabaseAPI.getEmployees() pour logistique
     */
    async getLogistique() {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .or('department.eq.logistique,department.is.null') // Support legacy
          .order('nom');
        
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getLogistique employees:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Mettre à jour un employé (unifié)
     */
    async update(employeeId, updates) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .update(updates)
          .eq('id', employeeId)
          .select();
        
        return { data: data?.[0] || null, error };
      } catch (err) {
        console.error('❌ Erreur update employee:', err);
        return { data: null, error: err };
      }
    }
  },

  // ==================== COMPÉTENCES UNIFIÉES ====================
  
  competences: {
    /**
     * Récupérer toutes les compétences
     */
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('competences')
          .select('*');
        
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getAll competences:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer les compétences cuisine
     * REMPLACE: supabaseCuisine.getCompetencesCuisineSimple()
     */
    async getByCuisine() {
      try {
        const { data, error } = await supabase
          .from('competences')
          .select('*')
          .or('type.eq.cuisine,poste_cuisine_id.not.is.null') // Support legacy
          .order('employee_id');
        
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getByCuisine competences:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer les compétences véhicules
     * REMPLACE: supabaseAPI.getAllCompetences() pour véhicules
     */
    async getByVehicule() {
      try {
        const { data, error } = await supabase
          .from('competences')
          .select(`
            *,
            vehicle:vehicles(nom),
            employee:employees(nom)
          `)
          .or('type.eq.vehicule,vehicle_id.not.is.null') // Support legacy
          .order('employee_id');
        
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getByVehicule competences:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Mettre à jour une compétence
     */
    async update(employeeId, competenceData) {
      try {
        const { data, error } = await supabase
          .from('competences')
          .upsert(competenceData)
          .eq('employee_id', employeeId)
          .select();
        
        return { data: data?.[0] || null, error };
      } catch (err) {
        console.error('❌ Erreur update competence:', err);
        return { data: null, error: err };
      }
    }
  },

  // ==================== PLANNING UNIFIÉ ====================
  
  planning: {
    /**
     * Récupérer le planning général
     */
    async getGeneral(startDate, endDate) {
      try {
        let query = supabase
          .from('planning')
          .select(`
            *,
            employee:employees(nom, profil, permis),
            vehicle:vehicles(nom, capacite)
          `);

        if (startDate && endDate) {
          query = query.gte('date', startDate).lte('date', endDate);
        }
        
        const { data, error } = await query.order('date');
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getGeneral planning:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer le planning cuisine
     * REMPLACE: supabaseCuisine.getPlanningCuisine()
     */
    async getByCuisine(dateDebut = null, dateFin = null) {
      try {
        let query = supabase
          .from('planning_cuisine')
          .select(`
            *,
            employee:employees(*),
            poste:postes_cuisine(*)
          `);
        
        if (dateDebut) {
          if (dateFin) {
            query = query.gte('date', dateDebut).lte('date', dateFin);
          } else {
            query = query.eq('date', dateDebut);
          }
        }
        
        const { data, error } = await query.order('date').order('creneau');
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getByCuisine planning:', err);
        return { data: [], error: err };
      }
    }
  },

  // ==================== POSTES UNIFIÉS ====================
  
  postes: {
    /**
     * Récupérer les postes de cuisine
     * REMPLACE: supabaseCuisine.getPostes()
     */
    async getCuisine() {
      try {
        const { data, error } = await supabase
          .from('postes_cuisine')
          .select('*')
          .eq('actif', true)
          .order('ordre_affichage');
        
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getCuisine postes:', err);
        return { data: [], error: err };
      }
    }
  },

  // ==================== ABSENCES UNIFIÉES ====================
  
  absences: {
    /**
     * Récupérer les absences générales
     */
    async getGeneral(dateDebut = null, dateFin = null) {
      try {
        let query = supabase
          .from('absences')
          .select(`
            *,
            employee:employees!absences_employee_id_fkey(nom, prenom, profil)
          `)
          .order('date_debut', { ascending: false });

        if (dateDebut && dateFin) {
          query = query.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
        }

        const { data, error } = await query;
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getGeneral absences:', err);
        return { data: [], error: err };
      }
    },

    /**
     * Récupérer les absences de cuisine
     * REMPLACE: supabaseCuisine.getAbsencesCuisine()
     */
    async getByCuisine(dateDebut = null, dateFin = null) {
      try {
        let query = supabase
          .from('absences_cuisine')
          .select(`
            *,
            employee:employees(*)
          `)
          .order('date_debut', { ascending: false });

        if (dateDebut && dateFin) {
          query = query.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
        }

        const { data, error } = await query;
        return { data: data || [], error };
      } catch (err) {
        console.warn('⚠️ Table absences_cuisine n\'existe pas encore, fallback...');
        // Fallback vers absences générales filtrées
        return await this.getGeneral(dateDebut, dateFin);
      }
    },

    /**
     * Créer une absence
     */
    async create(absenceData) {
      try {
        const { data, error } = await supabase
          .from('absences')
          .insert(absenceData)
          .select();
        
        return { data: data?.[0] || null, error };
      } catch (err) {
        console.error('❌ Erreur create absence:', err);
        return { data: null, error: err };
      }
    }
  },

  // ==================== VÉHICULES ====================
  
  vehicles: {
    /**
     * Récupérer tous les véhicules
     */
    async getAll() {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('nom');
        
        return { data: data || [], error };
      } catch (err) {
        console.error('❌ Erreur getAll vehicles:', err);
        return { data: [], error: err };
      }
    }
  },

  // ==================== UTILITAIRES ====================
  
  /**
   * Test de connexion unifié
   */
  async testConnection() {
    try {
      console.log('🔍 Test connexion API unifiée...');
      
      const { data, error } = await supabase
        .from('employees')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Erreur test connexion:', error);
        return { success: false, error };
      }
      
      console.log('✅ API unifiée connectée avec succès');
      return { success: true, data };
    } catch (err) {
      console.error('❌ Erreur critique test connexion:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Fonction de migration (pour plus tard)
   */
  async migrateLegacyData() {
    console.log('🚀 Migration des données legacy vers API unifiée...');
    // TODO: Implémenter la migration
    return { success: true, message: 'Migration à implémenter' };
  }
};

// Test automatique de connexion au démarrage
unifiedSupabase.testConnection().catch(err => {
  console.warn('⚠️ Impossible de tester la connexion unifiée:', err);
});

export default unifiedSupabase; 