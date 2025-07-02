import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Vérification que les variables d'environnement sont définies
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions pour l'API
export const supabaseAPI = {
  // Authentification
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Employés
  async getEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('nom')
    return { data, error }
  },

  async createEmployee(employee) {
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
    return { data, error }
  },

  async updateEmployee(id, updates) {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deleteEmployee(id) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Planning
  async getPlanning(startDate, endDate) {
    const { data, error } = await supabase
      .from('planning')
      .select(`
        *,
        employee:employees(nom, profil, permis),
        vehicle:vehicles(nom, capacite)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
    return { data, error }
  },

  async createPlanningEntry(entry) {
    const { data, error } = await supabase
      .from('planning')
      .insert([entry])
      .select()
    return { data, error }
  },

  async updatePlanningEntry(id, updates) {
    const { data, error } = await supabase
      .from('planning')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deletePlanningEntry(id) {
    const { error } = await supabase
      .from('planning')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Véhicules
  async getVehicles() {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('nom')
    return { data, error }
  },

  // Compétences
  async getCompetences(employeeId) {
    const { data, error } = await supabase
      .from('competences')
      .select(`
        *,
        vehicle:vehicles(nom),
        employee:employees(nom)
      `)
      .eq('employee_id', employeeId)
    return { data, error }
  },

  // Récupérer TOUTES les compétences en une seule requête (optimisé)
  async getAllCompetences() {
    const { data, error } = await supabase
      .from('competences')
      .select(`
        *,
        vehicle:vehicles(nom),
        employee:employees(nom)
      `)
    return { data, error }
  },

  async updateCompetence(employeeId, vehicleId, competenceData) {
    const { data, error } = await supabase
      .from('competences')
      .upsert({
        employee_id: employeeId,
        vehicle_id: vehicleId,
        ...competenceData
      })
      .select()
    return { data, error }
  },

  // ================== NOUVELLES FONCTIONS ABSENCES ==================

  // Gestion des absences
  async getAbsences(dateDebut = null, dateFin = null) {
    let query = supabase
      .from('absences')
      .select(`
        *,
        employee:employees(nom, prenom, profil),
        remplacant:employees!absences_remplacant_id_fkey(nom, prenom)
      `)
      .order('date_debut', { ascending: false });

    // Filtrer par période si spécifié
    if (dateDebut && dateFin) {
      query = query.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async createAbsence(absenceData) {
    const { data, error } = await supabase
      .from('absences')
      .insert([{
        ...absenceData,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    return { data, error };
  },

  async updateAbsence(id, updates) {
    const { data, error } = await supabase
      .from('absences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    return { data, error };
  },

  async deleteAbsence(id) {
    const { data, error } = await supabase
      .from('absences')
      .delete()
      .eq('id', id);

    return { data, error };
  },

  // Vérifier la disponibilité d'un employé
  async isEmployeeAvailable(employeeId, date) {
    const { data, error } = await supabase
      .rpc('est_disponible', {
        p_employee_id: employeeId,
        p_date: date
      });

    return { available: data, error };
  },

  // Obtenir les employés disponibles à une date
  async getAvailableEmployees(date) {
    const { data, error } = await supabase
      .rpc('get_employes_disponibles', {
        p_date: date
      });

    return { data, error };
  },

  // Détecter les conflits dans le planning
  async detectPlanningConflicts(date) {
    const { data, error } = await supabase
      .rpc('detecter_conflits_planning', {
        p_date: date
      });

    return { data, error };
  },

  // Vue temps réel des employés avec leur statut
  async getEmployeesWithAvailability(date = null) {
    const { data, error } = await supabase
      .from('employes_disponibles')
      .select('*');

    return { data, error };
  },

  // Gestion des disponibilités récurrentes
  async getEmployeeSchedule(employeeId) {
    const { data, error } = await supabase
      .from('disponibilites')
      .select('*')
      .eq('employee_id', employeeId)
      .order('jour_semaine');

    return { data, error };
  },

  async updateEmployeeSchedule(employeeId, schedule) {
    // Supprimer l'ancien planning
    await supabase
      .from('disponibilites')
      .delete()
      .eq('employee_id', employeeId);

    // Insérer le nouveau
    const { data, error } = await supabase
      .from('disponibilites')
      .insert(schedule.map(s => ({
        employee_id: employeeId,
        ...s
      })));

    return { data, error };
  },

  // Fonction pour le planning intelligent intégrant les absences
  async getPlanningWithAvailability(dateDebut, dateFin) {
    try {
      // Récupérer planning, absences et employés en parallèle
      const [planningResult, absencesResult, employeesResult] = await Promise.all([
        this.getPlanning(dateDebut, dateFin),
        this.getAbsences(dateDebut, dateFin),
        this.getEmployees()
      ]);

      if (planningResult.error) throw planningResult.error;
      if (absencesResult.error) throw absencesResult.error;
      if (employeesResult.error) throw employeesResult.error;

      const planning = planningResult.data || [];
      const absences = absencesResult.data || [];
      const employees = employeesResult.data || [];

      // Enrichir le planning avec les informations d'absence
      const enrichedPlanning = planning.map(planItem => {
        const employee = employees.find(e => e.id === planItem.employee_id);
        const employeeAbsences = absences.filter(a => 
          a.employee_id === planItem.employee_id &&
          a.statut === 'Confirmée' &&
          planItem.date >= a.date_debut &&
          planItem.date <= a.date_fin
        );

        return {
          ...planItem,
          employee,
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
      console.error('Erreur getPlanningWithAvailability:', error);
      return { data: null, conflicts: [], error };
    }
  },

  // Suggérer des remplacements pour une absence
  async suggestReplacements(absentEmployeeId, vehicleId, date) {
    try {
      // Obtenir les employés disponibles
      const { data: availableEmployees, error: availError } = await this.getAvailableEmployees(date);
      if (availError) throw availError;

      // Obtenir les compétences pour ce véhicule
      const { data: competences, error: compError } = await this.getAllCompetences();
      if (compError) throw compError;

      // Filtrer les employés compétents pour ce véhicule
      const competentEmployees = availableEmployees.filter(emp => 
        competences.some(c => 
          c.employee_id === emp.id && 
          c.vehicle_id === vehicleId &&
          c.niveau > 0
        )
      );

      // Obtenir l'employé absent pour les règles d'insertion
      const { data: employees, error: empError } = await this.getEmployees();
      if (empError) throw empError;
      
      const absentEmployee = employees.find(e => e.id === absentEmployeeId);

      // Appliquer les règles d'insertion sociale pour le classement
      const sortedSuggestions = competentEmployees.sort((a, b) => {
        // Privilégier les profils forts si l'absent était faible
        if (absentEmployee?.profil === 'Faible') {
          if (a.profil === 'Fort' && b.profil !== 'Fort') return -1;
          if (b.profil === 'Fort' && a.profil !== 'Fort') return 1;
        }

        // Privilégier la diversité des langues
        const absentLanguages = absentEmployee?.langues || [];
        const aHasDifferentLang = a.langues?.some(lang => !absentLanguages.includes(lang));
        const bHasDifferentLang = b.langues?.some(lang => !absentLanguages.includes(lang));
        
        if (aHasDifferentLang && !bHasDifferentLang) return -1;
        if (bHasDifferentLang && !aHasDifferentLang) return 1;

        return 0;
      });

      return { data: sortedSuggestions, error: null };

    } catch (error) {
      console.error('Erreur suggestReplacements:', error);
      return { data: [], error };
    }
  },

  // ================== ANALYTICS AVANCÉES ==================

  // Statistiques d'absence
  async getAbsenceStats(dateDebut, dateFin) {
    try {
      const { data: absences, error } = await this.getAbsences(dateDebut, dateFin);
      if (error) throw error;

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
        const employeeName = absence.employee?.nom || 'Inconnu';
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
      console.error('Erreur getAbsenceStats:', error);
      return { data: null, error };
    }
  }
} 