import { createClient } from '@supabase/supabase-js';

// Configuration centralisée
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  throw new Error('Configuration Supabase incomplète');
}

// Client Supabase unique et partagé
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Test de connexion au démarrage
supabase.from('employes_cuisine_new').select('count').limit(1).then(({ error }) => {
  if (error) {
    console.error('❌ Erreur connexion Supabase:', error);
  } else {
    console.log('✅ API Caddy connectée à Supabase');
  }
}).catch(err => {
  console.error('❌ Erreur test connexion:', err);
});

/**
 * ========================================
 * API CADDY UNIFIÉE
 * ========================================
 * 
 * Remplace tous les services existants :
 * - supabase.js (service principal)
 * - supabase-cuisine.js (spécialisé cuisine)
 * - supabase-logistique.js (spécialisé logistique)  
 * - supabase-unified.js (tentative d'unification)
 * - supabase-secretariat.js (secrétariat)
 */

class CaddyAPI {
  constructor() {
    this.supabase = supabase;
  }

  // ==================== MODULES MÉTIER ====================
  
  employees = new EmployeesAPI(this.supabase);
  planning = new PlanningAPI(this.supabase);
  absences = new AbsencesAPI(this.supabase);
  logistics = new LogisticsAPI(this.supabase);
  secretariat = new SecretariatAPI(this.supabase);
  auth = new AuthAPI(this.supabase);

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Obtenir le client Supabase pour les cas spéciaux
   */
  getClient() {
    return this.supabase;
  }

  /**
   * Vérifier la connectivité
   */
  async healthCheck() {
    try {
      const { error } = await this.supabase
        .from('employes_cuisine_new')
        .select('count')
        .limit(1);
      
      return { healthy: !error, error };
    } catch (err) {
      return { healthy: false, error: err };
    }
  }
}

// ==================== MODULES SPÉCIALISÉS ====================

/**
 * Gestion des employés - Tous modules confondus
 */
class EmployeesAPI {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // ========== EMPLOYÉS CUISINE ==========
  
  async getCuisine() {
    try {
      const { data, error } = await this.supabase
        .from('employes_cuisine_new')
        .select('*')
        .eq('actif', true)
        .order('prenom');
      
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getCuisine:', err);
      return { data: [], error: err };
    }
  }

  async createCuisine(employeeData) {
    try {
      const { data, error } = await this.supabase
        .from('employes_cuisine_new')
        .insert([employeeData])
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur createCuisine:', err);
      return { data: null, error: err };
    }
  }

  async updateCuisine(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('employes_cuisine_new')
        .update(updates)
        .eq('id', id)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur updateCuisine:', err);
      return { data: null, error: err };
    }
  }

  async deleteCuisine(id) {
    try {
      const { error } = await this.supabase
        .from('employes_cuisine_new')
        .update({ actif: false })
        .eq('id', id);
      
      return { error };
    } catch (err) {
      console.error('❌ Erreur deleteCuisine:', err);
      return { error: err };
    }
  }

  // ========== EMPLOYÉS LOGISTIQUE ==========
  
  async getLogistique() {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .order('nom');
      
      // Fallback avec données statiques si erreur
      if (error) {
        console.warn('🔄 Fallback employés logistique');
        return { 
          data: this._getLogistiqueFallback(),
          error: null 
        };
      }
      
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getLogistique:', err);
      return { 
        data: this._getLogistiqueFallback(),
        error: null 
      };
    }
  }

  async updateLogistique(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur updateLogistique:', err);
      return { data: null, error: err };
    }
  }

  // ========== DONNÉES FALLBACK ==========
  
  _getLogistiqueFallback() {
    return [
      { id: 1, nom: 'Abdelaziz', profil: 'Moyen', langues: ['Arabe'], permis: true },
      { id: 2, nom: 'Shadi', profil: 'Fort', langues: ['Arabe', 'Anglais', 'Français'], permis: false },
      { id: 3, nom: 'Tamara', profil: 'Faible', langues: ['Luxembourgeois', 'Français'], permis: true },
      { id: 4, nom: 'Ahmad', profil: 'Moyen', langues: ['Arabe'], permis: true },
      { id: 5, nom: 'Juan', profil: 'Fort', langues: ['Arabe'], permis: true },
      { id: 6, nom: 'Basel', profil: 'Moyen', langues: ['Arabe', 'Anglais', 'Allemand'], permis: true },
      { id: 7, nom: 'Firas', profil: 'Fort', langues: ['Arabe'], permis: true },
      { id: 8, nom: 'José', profil: 'Fort', langues: ['Créole', 'Français'], permis: true },
      { id: 9, nom: 'Imad', profil: 'Moyen', langues: ['Arabe'], permis: true },
      { id: 10, nom: 'Mejrema', profil: 'Faible', langues: ['Yougoslave', 'Allemand'], permis: false },
      { id: 11, nom: 'Hassene', profil: 'Faible', langues: ['Arabe', 'Français'], permis: true },
      { id: 12, nom: 'Elton', profil: 'Faible', langues: ['Yougoslave', 'Français'], permis: false },
      { id: 13, nom: 'Mersad', profil: 'Faible', langues: ['Yougoslave', 'Français'], permis: false },
      { id: 14, nom: 'Siamak', profil: 'Fort', langues: ['Perse', 'Français', 'Anglais'], permis: true },
      { id: 15, nom: 'Mojoos', profil: 'Faible', langues: ['Tigrinya'], permis: false },
      { id: 16, nom: 'Medhanie', profil: 'Fort', langues: ['Tigrinya', 'Anglais', 'Français'], permis: true },
      { id: 17, nom: 'Tesfaldet', profil: 'Moyen', langues: ['Tigrinya'], permis: false },
      { id: 18, nom: 'Emahaston', profil: 'Fort', langues: ['Tigrinya', 'Français'], permis: false },
      { id: 19, nom: 'Hamed', profil: 'Moyen', langues: ['Perse', 'Anglais', 'Arabe'], permis: true },
      { id: 20, nom: 'Soroosh', profil: 'Fort', langues: ['Perse'], permis: true },
      { id: 21, nom: 'Cemalettin', profil: 'Moyen', langues: ['Turc'], permis: false }
    ];
  }
}

/**
 * Gestion du planning - Tous modules confondus
 */
class PlanningAPI {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // ========== PLANNING CUISINE ==========
  
  async getCuisinePlanning(date, session = 'matin') {
    try {
      const { data, error } = await this.supabase
        .from('planning_cuisine_new')
        .select('*')
        .eq('date', date)
        .eq('session', session);
      
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getCuisinePlanning:', err);
      return { data: [], error: err };
    }
  }

  async saveCuisinePlanning(planningData) {
    try {
      const { data, error } = await this.supabase
        .from('planning_cuisine_new')
        .upsert(planningData)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur saveCuisinePlanning:', err);
      return { data: null, error: err };
    }
  }

  // ========== PLANNING LOGISTIQUE ==========
  
  async getLogistiquePlanning(startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('planning')
        .select(`
          *,
          employee:employees(nom, profil, permis),
          vehicle:vehicles(nom, capacite)
        `)
        .gte('date', startDate)
        .lte('date', endDate);
      
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getLogistiquePlanning:', err);
      return { data: [], error: err };
    }
  }

  async saveLogistiquePlanning(planningData) {
    try {
      const { data, error } = await this.supabase
        .from('planning')
        .upsert(planningData)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur saveLogistiquePlanning:', err);
      return { data: null, error: err };
    }
  }

  // ========== POSTES ET CRÉNEAUX ==========
  
  getPostesCuisine() {
    // Postes en dur car table n'existe pas encore
    return {
      data: [
        { id: 1, nom: 'Cuisine chaude', couleur: '#ef4444', icone: '🔥' },
        { id: 2, nom: 'Sandwichs', couleur: '#f59e0b', icone: '🥪' },
        { id: 3, nom: 'Pain', couleur: '#eab308', icone: '🍞' },
        { id: 4, nom: 'Jus de fruits', couleur: '#22c55e', icone: '🧃' },
        { id: 5, nom: 'Vaisselle', couleur: '#3b82f6', icone: '🍽️' },
        { id: 6, nom: 'Légumerie', couleur: '#10b981', icone: '🥬' },
        { id: 7, nom: 'Self Midi', couleur: '#8b5cf6', icone: '🍽️' },
        { id: 8, nom: 'Equipe Pina et Saskia', couleur: '#ec4899', icone: '👥' }
      ],
      error: null
    };
  }

  getCreneauxCuisine() {
    // Créneaux en dur basés sur la configuration existante
    return {
      data: [
        { id: 1, nom: '8h' },
        { id: 2, nom: '10h' },
        { id: 3, nom: 'midi' },
        { id: 4, nom: '11h' },
        { id: 5, nom: '11h45' },
        { id: 6, nom: '8h-16h' },
        { id: 7, nom: '8h-12h' },
        { id: 8, nom: '11h-11h45' },
        { id: 9, nom: '11h45-12h45' }
      ],
      error: null
    };
  }
}

/**
 * Gestion des absences - Tous modules confondus
 */
class AbsencesAPI {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // ========== ABSENCES CUISINE ==========
  
  async getCuisineAbsences(startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('absences_cuisine_new')
        .select('*')
        .gte('date_debut', startDate)
        .lte('date_fin', endDate)
        .order('date_debut', { ascending: false });
      
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getCuisineAbsences:', err);
      return { data: [], error: err };
    }
  }

  async createCuisineAbsence(absenceData) {
    try {
      // Ne pas inclure le champ statut qui n'existe pas
      const cleanData = { ...absenceData };
      delete cleanData.statut;

      const { data, error } = await this.supabase
        .from('absences_cuisine_new')
        .insert([cleanData])
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur createCuisineAbsence:', err);
      return { data: null, error: err };
    }
  }

  async updateCuisineAbsence(id, updates) {
    try {
      // Ne pas inclure le champ statut qui n'existe pas
      const cleanUpdates = { ...updates };
      delete cleanUpdates.statut;

      const { data, error } = await this.supabase
        .from('absences_cuisine_new')
        .update(cleanUpdates)
        .eq('id', id)
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur updateCuisineAbsence:', err);
      return { data: null, error: err };
    }
  }

  async deleteCuisineAbsence(id) {
    try {
      const { error } = await this.supabase
        .from('absences_cuisine_new')
        .delete()
        .eq('id', id);
      
      return { error };
    } catch (err) {
      console.error('❌ Erreur deleteCuisineAbsence:', err);
      return { error: err };
    }
  }

  // ========== ABSENCES LOGISTIQUE ==========
  
  async getLogistiqueAbsences(startDate, endDate) {
    try {
      let query = this.supabase
        .from('absences')
        .select('*')
        .order('date_debut', { ascending: false });

      if (startDate && endDate) {
        query = query.or(`date_debut.lte.${endDate},date_fin.gte.${startDate}`);
      }

      const { data, error } = await query;
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getLogistiqueAbsences:', err);
      return { data: [], error: err };
    }
  }

  async createLogistiqueAbsence(absenceData) {
    try {
      const { data, error } = await this.supabase
        .from('absences')
        .insert([absenceData])
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur createLogistiqueAbsence:', err);
      return { data: null, error: err };
    }
  }
}

/**
 * Gestion logistique - Véhicules et compétences
 */
class LogisticsAPI {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getVehicles() {
    try {
      const { data, error } = await this.supabase
        .from('vehicles')
        .select('*')
        .order('nom');
      
      // Fallback avec données statiques
      if (error) {
        return {
          data: [
            { id: 1, nom: 'Crafter 23', capacite: 3 },
            { id: 2, nom: 'Crafter 21', capacite: 3 },
            { id: 3, nom: 'Jumper', capacite: 3 },
            { id: 4, nom: 'Ducato', capacite: 3 },
            { id: 5, nom: 'Transit', capacite: 8 }
          ],
          error: null
        };
      }
      
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getVehicles:', err);
      return { data: [], error: err };
    }
  }

  async getCompetences() {
    try {
      const { data, error } = await this.supabase
        .from('competences')
        .select(`
          *,
          vehicle:vehicles(nom),
          employee:employees(nom)
        `);
      
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getCompetences:', err);
      return { data: [], error: err };
    }
  }

  async updateCompetence(employeeId, vehicleId, competenceData) {
    try {
      const { data, error } = await this.supabase
        .from('competences')
        .upsert({
          employee_id: employeeId,
          vehicle_id: vehicleId,
          ...competenceData
        })
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur updateCompetence:', err);
      return { data: null, error: err };
    }
  }
}

/**
 * Gestion secrétariat - Denrées alimentaires
 */
class SecretariatAPI {
  constructor(supabase) {
    this.supabase = supabase;
  }

  getTableName(annee = null) {
    return annee ? `denrees_alimentaires_${annee}` : 'denrees_alimentaires_2025';
  }

  async getDenreesAlimentaires(annee = 2025) {
    try {
      const tableName = this.getTableName(annee);
      
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .order('annee', { ascending: false })
        .order('mois', { ascending: false })
        .order('fournisseur');
      
      return { data: data || [], error };
    } catch (err) {
      console.error('❌ Erreur getDenreesAlimentaires:', err);
      return { data: [], error: err };
    }
  }

  async createDenreeAlimentaire(denree) {
    try {
      const tableName = this.getTableName(denree.annee);
      
      const { data, error } = await this.supabase
        .from(tableName)
        .insert([denree])
        .select();
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur createDenreeAlimentaire:', err);
      return { data: null, error: err };
    }
  }
}

/**
 * Gestion authentification
 */
class AuthAPI {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur signIn:', err);
      return { data: null, error: err };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      return { error };
    } catch (err) {
      console.error('❌ Erreur signOut:', err);
      return { error: err };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user;
    } catch (err) {
      console.error('❌ Erreur getCurrentUser:', err);
      return null;
    }
  }
}

// ==================== EXPORT DE L'API UNIFIÉE ====================

export const api = new CaddyAPI();

// Export des modules pour un accès direct si nécessaire
export const {
  employees,
  planning,
  absences,
  logistics,
  secretariat,
  auth
} = api;

// Export par défaut
export default api; 