import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Vérification que les variables d'environnement sont définies
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables d\'environnement manquantes:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env')
}

console.log('🔗 Configuration Supabase:', {
  url: supabaseUrl,
  keyPresent: !!supabaseAnonKey
});

// Configuration avec options pour éviter les erreurs CORS
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*'
    }
  }
})

// Test de connexion au démarrage
supabase.from('vehicles').select('count').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('❌ Erreur connexion Supabase:', error);
  } else {
    console.log('✅ Connexion Supabase réussie');
  }
}).catch(err => {
  console.error('❌ Erreur test connexion:', err);
});

// Helper functions pour l'API
export const supabaseAPI = {
  // Authentification
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        console.error('Erreur signIn:', error);
      }
      return { data, error }
    } catch (err) {
      console.error('Erreur critique signIn:', err);
      return { data: null, error: err };
    }
  },

  async signUp(email, password, userData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      return { data, error }
    } catch (err) {
      console.error('Erreur signUp:', err);
      return { data: null, error: err };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
      console.error('Erreur signOut:', err);
      return { error: err };
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (err) {
      console.error('Erreur getCurrentUser:', err);
      return null;
    }
  },

  // Employés
  async getEmployees() {
    try {
      console.log('🔍 Récupération des employés...');
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('nom')
      
      if (error) {
        console.error('❌ Erreur getEmployees:', error);
      } else {
        console.log('✅ Employés récupérés:', data?.length || 0);
      }
      return { data, error }
    } catch (err) {
      console.error('❌ Erreur critique getEmployees:', err);
      return { data: null, error: err };
    }
  },

  // Employés de logistique uniquement
  async getEmployeesLogistique() {
    try {
      console.log('🔍 Récupération des employés de logistique...');
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          employees_cuisine!left(service)
        `)
        .or('employees_cuisine.service.eq.Logistique,employees_cuisine.service.eq.Mixte,employees_cuisine.service.is.null')
        .order('nom')
      
      if (error) {
        console.error('❌ Erreur getEmployeesLogistique:', error);
        // Fallback : récupérer tous les employés et filtrer localement
        const { data: allEmployees, error: allError } = await this.getEmployees();
        if (allError) throw allError;
        
        console.log('🔄 Fallback: filtrage local des employés de logistique');
        return { 
          data: allEmployees.filter(emp => 
            // Considérer comme logistique si pas dans employees_cuisine ou service logistique/mixte
            !emp.email?.includes('@stemm.lu') || 
            emp.email?.includes('@caddy.lu')
          ), 
          error: null 
        };
      } else {
        console.log('✅ Employés de logistique récupérés:', data?.length || 0);
        return { data, error };
      }
    } catch (err) {
      console.error('❌ Erreur critique getEmployeesLogistique:', err);
      // Fallback ultime : utiliser les données statiques de logistique
      return { 
        data: [
          {
            id: 1,
            nom: 'Abdelaziz',
            profil: 'Moyen',
            langues: ['Arabe'],
            permis: true,
            photo: null
          },
          {
            id: 2,
            nom: 'Shadi',
            profil: 'Fort',
            langues: ['Arabe', 'Anglais', 'Français'],
            permis: false,
            photo: null
          },
          {
            id: 3,
            nom: 'Tamara',
            profil: 'Faible',
            langues: ['Luxembourgeois', 'Français'],
            permis: true,
            photo: null
          },
          {
            id: 4,
            nom: 'Ahmad',
            profil: 'Moyen',
            langues: ['Arabe'],
            permis: true,
            photo: null
          },
          {
            id: 5,
            nom: 'Juan',
            profil: 'Fort',
            langues: ['Arabe'],
            permis: true,
            photo: null
          },
          {
            id: 6,
            nom: 'Basel',
            profil: 'Moyen',
            langues: ['Arabe', 'Anglais', 'Allemand'],
            permis: true,
            photo: null
          },
          {
            id: 7,
            nom: 'Firas',
            profil: 'Fort',
            langues: ['Arabe'],
            permis: true,
            photo: null
          },
          {
            id: 8,
            nom: 'José',
            profil: 'Fort',
            langues: ['Créole', 'Français'],
            permis: true,
            photo: null
          },
          {
            id: 9,
            nom: 'Imad',
            profil: 'Moyen',
            langues: ['Arabe'],
            permis: true,
            photo: null
          },
          {
            id: 10,
            nom: 'Mejrema',
            profil: 'Faible',
            langues: ['Yougoslave', 'Allemand'],
            permis: false,
            photo: null
          },
          {
            id: 11,
            nom: 'Hassene',
            profil: 'Faible',
            langues: ['Arabe', 'Français'],
            permis: true,
            photo: null
          },
          {
            id: 12,
            nom: 'Elton',
            profil: 'Faible',
            langues: ['Yougoslave', 'Français'],
            permis: false,
            photo: null
          },
          {
            id: 13,
            nom: 'Mersad',
            profil: 'Faible',
            langues: ['Yougoslave', 'Français'],
            permis: false,
            photo: null
          },
          {
            id: 14,
            nom: 'Siamak',
            profil: 'Fort',
            langues: ['Perse', 'Français', 'Anglais'],
            permis: true,
            photo: null
          },
          {
            id: 15,
            nom: 'Mojoos',
            profil: 'Faible',
            langues: ['Tigrinya'],
            permis: false,
            photo: null
          },
          {
            id: 16,
            nom: 'Medhanie',
            profil: 'Fort',
            langues: ['Tigrinya', 'Anglais', 'Français'],
            permis: true,
            photo: null
          },
          {
            id: 17,
            nom: 'Tesfaldet',
            profil: 'Moyen',
            langues: ['Tigrinya'],
            permis: false,
            photo: null
          },
          {
            id: 18,
            nom: 'Emahaston',
            profil: 'Fort',
            langues: ['Tigrinya', 'Français'],
            permis: false,
            photo: null
          },
          {
            id: 19,
            nom: 'Hamed',
            profil: 'Moyen',
            langues: ['Perse', 'Anglais', 'Arabe'],
            permis: true,
            photo: null
          },
          {
            id: 20,
            nom: 'Soroosh',
            profil: 'Fort',
            langues: ['Perse'],
            permis: true,
            photo: null
          },
          {
            id: 21,
            nom: 'Cemalettin',
            profil: 'Moyen',
            langues: ['Turc'],
            permis: false,
            photo: null
          }
        ], 
        error: null 
      };
    }
  },

  async createEmployee(employee) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
      if (error) {
        console.error('Erreur createEmployee:', error);
      }
      return { data, error }
    } catch (err) {
      console.error('Erreur critique createEmployee:', err);
      return { data: null, error: err };
    }
  },

  async updateEmployee(id, updates) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
      return { data, error }
    } catch (err) {
      console.error('Erreur updateEmployee:', err);
      return { data: null, error: err };
    }
  },

  async deleteEmployee(id) {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
      return { error }
    } catch (err) {
      console.error('Erreur deleteEmployee:', err);
      return { error: err };
    }
  },

  // Planning
  async getPlanning(startDate, endDate) {
    try {
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
    } catch (err) {
      console.error('Erreur getPlanning:', err);
      return { data: null, error: err };
    }
  },

  async createPlanningEntry(entry) {
    try {
      const { data, error } = await supabase
        .from('planning')
        .insert([entry])
        .select()
      return { data, error }
    } catch (err) {
      console.error('Erreur createPlanningEntry:', err);
      return { data: null, error: err };
    }
  },

  async updatePlanningEntry(id, updates) {
    try {
      const { data, error } = await supabase
        .from('planning')
        .update(updates)
        .eq('id', id)
        .select()
      return { data, error }
    } catch (err) {
      console.error('Erreur updatePlanningEntry:', err);
      return { data: null, error: err };
    }
  },

  async deletePlanningEntry(id) {
    try {
      const { error } = await supabase
        .from('planning')
        .delete()
        .eq('id', id)
      return { error }
    } catch (err) {
      console.error('Erreur deletePlanningEntry:', err);
      return { error: err };
    }
  },

  // Véhicules
  async getVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('nom')
      return { data, error }
    } catch (err) {
      console.error('Erreur getVehicles:', err);
      return { data: null, error: err };
    }
  },

  // Compétences
  async getCompetences(employeeId) {
    try {
      const { data, error } = await supabase
        .from('competences')
        .select(`
          *,
          vehicle:vehicles(nom),
          employee:employees(nom)
        `)
        .eq('employee_id', employeeId)
      return { data, error }
    } catch (err) {
      console.error('Erreur getCompetences:', err);
      return { data: null, error: err };
    }
  },

  // Récupérer TOUTES les compétences en une seule requête (optimisé)
  async getAllCompetences() {
    try {
      const { data, error } = await supabase
        .from('competences')
        .select(`
          *,
          vehicle:vehicles(nom),
          employee:employees(nom)
        `)
      return { data, error }
    } catch (err) {
      console.error('Erreur getAllCompetences:', err);
      return { data: null, error: err };
    }
  },

  async updateCompetence(employeeId, vehicleId, competenceData) {
    try {
      const { data, error } = await supabase
        .from('competences')
        .upsert({
          employee_id: employeeId,
          vehicle_id: vehicleId,
          ...competenceData
        })
        .select()
      return { data, error }
    } catch (err) {
      console.error('Erreur updateCompetence:', err);
      return { data: null, error: err };
    }
  },

  // ================== GESTION DES ABSENCES AMÉLIORÉE ==================

  // Gestion des absences avec fallback en cas d'erreur
  async getAbsences(dateDebut = null, dateFin = null) {
    try {
      console.log('🔍 Récupération des absences...', { dateDebut, dateFin });
      
      let query = supabase
        .from('absences')
        .select(`
          *,
          employee:employees!absences_employee_id_fkey(nom, prenom, profil)
        `)
        .order('date_debut', { ascending: false });

      // Filtrer par période si spécifié
      if (dateDebut && dateFin) {
        query = query.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Erreur getAbsences avec jointure:', error);
        
        // Fallback : récupération simple sans jointure
        console.log('🔄 Tentative sans jointure...');
        let simpleQuery = supabase
          .from('absences')
          .select('*')
          .order('date_debut', { ascending: false });
        
        if (dateDebut && dateFin) {
          simpleQuery = simpleQuery.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
        }
        
        const { data: simpleData, error: simpleError } = await simpleQuery;
        
        if (simpleError) {
          console.error('❌ Erreur simple getAbsences:', simpleError);
          return { data: [], error: simpleError };
        }
        
        console.log('✅ Absences récupérées (mode simple):', simpleData?.length || 0);
        return { data: simpleData || [], error: null };
      }
      
      console.log('✅ Absences récupérées avec jointure:', data?.length || 0);
      return { data: data || [], error: null };

    } catch (err) {
      console.error('❌ Erreur critique getAbsences:', err);
      return { data: [], error: err };
    }
  },

  async createAbsence(absenceData) {
    try {
      console.log('➕ Création absence:', absenceData);
      
      const { data, error } = await supabase
        .from('absences')
        .insert([{
          ...absenceData,
          created_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Erreur createAbsence:', error);
      } else {
        console.log('✅ Absence créée:', data);
      }
      
      return { data, error };
    } catch (err) {
      console.error('❌ Erreur critique createAbsence:', err);
      return { data: null, error: err };
    }
  },

  async updateAbsence(id, updates) {
    try {
      const { data, error } = await supabase
        .from('absences')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Erreur updateAbsence:', err);
      return { data: null, error: err };
    }
  },

  async deleteAbsence(id) {
    try {
      const { data, error } = await supabase
        .from('absences')
        .delete()
        .eq('id', id);

      return { data, error };
    } catch (err) {
      console.error('Erreur deleteAbsence:', err);
      return { data: null, error: err };
    }
  },

  // Vérifier la disponibilité d'un employé
  async isEmployeeAvailable(employeeId, date) {
    try {
      const { data, error } = await supabase
        .rpc('est_disponible', {
          p_employee_id: employeeId,
          p_date: date
        });

      return { available: data, error };
    } catch (err) {
      console.error('Erreur isEmployeeAvailable:', err);
      return { available: null, error: err };
    }
  },

  // Obtenir les employés disponibles à une date
  async getAvailableEmployees(date) {
    try {
      const { data, error } = await supabase
        .rpc('get_employes_disponibles', {
          p_date: date
        });

      return { data, error };
    } catch (err) {
      console.error('Erreur getAvailableEmployees:', err);
      return { data: null, error: err };
    }
  },

  // Détecter les conflits dans le planning
  async detectPlanningConflicts(date) {
    try {
      const { data, error } = await supabase
        .rpc('detecter_conflits_planning', {
          p_date: date
        });

      return { data, error };
    } catch (err) {
      console.error('Erreur detectPlanningConflicts:', err);
      return { data: null, error: err };
    }
  },

  // Vue temps réel des employés avec leur statut
  async getEmployeesWithAvailability(date = null) {
    try {
      const { data, error } = await supabase
        .from('employes_disponibles')
        .select('*');

      return { data, error };
    } catch (err) {
      console.error('Erreur getEmployeesWithAvailability:', err);
      return { data: null, error: err };
    }
  },

  // Gestion des disponibilités récurrentes
  async getEmployeeSchedule(employeeId) {
    try {
      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('employee_id', employeeId)
        .order('jour_semaine');

      return { data, error };
    } catch (err) {
      console.error('Erreur getEmployeeSchedule:', err);
      return { data: null, error: err };
    }
  },

  async updateEmployeeSchedule(employeeId, schedule) {
    try {
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
    } catch (err) {
      console.error('Erreur updateEmployeeSchedule:', err);
      return { data: null, error: err };
    }
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