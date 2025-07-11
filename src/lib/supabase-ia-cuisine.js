import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * API Supabase pour l'Assistant IA de Cuisine
 * Gestion des compétences, absences, plannings intelligents
 */
export const supabaseIACuisine = {
  
  // Exposer le client Supabase pour les tests
  supabase,
  
  // ==================== COMPÉTENCES ====================
  
  /**
   * Récupérer toutes les compétences disponibles
   * @returns {Promise} Liste des compétences
   */
  async getCompetences() {
    try {
      const { data, error } = await supabase
        .from('competences')
        .select('*')
        .order('categorie', { ascending: true })
        .order('nom', { ascending: true });

      if (error) {
        console.error('Erreur getCompetences:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique getCompetences:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Obtenir les compétences d'un employé
   * @param {number} employeId - ID de l'employé
   * @returns {Promise} Compétences de l'employé
   */
  async getCompetencesEmploye(employeId) {
    try {
      const { data, error } = await supabase
        .from('employe_competences')
        .select(`
          *,
          competences (
            id,
            nom,
            description,
            niveau_requis,
            categorie
          )
        `)
        .eq('employe_id', employeId)
        .order('competences.categorie', { ascending: true });

      if (error) {
        console.error('Erreur getCompetencesEmploye:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique getCompetencesEmploye:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Mettre à jour une compétence d'employé
   * @param {number} employeId - ID de l'employé
   * @param {number} competenceId - ID de la compétence
   * @param {number} niveau - Nouveau niveau (1-5)
   * @param {string} validateur - Nom du validateur
   * @returns {Promise} Résultat de la mise à jour
   */
  async updateCompetenceEmploye(employeId, competenceId, niveau, validateur = 'IA') {
    try {
      const { data, error } = await supabase
        .from('employe_competences')
        .upsert({
          employe_id: employeId,
          competence_id: competenceId,
          niveau_actuel: niveau,
          validateur: validateur,
          date_validation: new Date().toISOString().split('T')[0]
        })
        .select();

      if (error) {
        console.error('Erreur updateCompetenceEmploye:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique updateCompetenceEmploye:', err);
      return { data: null, error: err };
    }
  },

  // ==================== ABSENCES ====================

  /**
   * Récupérer toutes les absences
   * @param {string} statut - Filtrer par statut (optionnel)
   * @returns {Promise} Liste des absences
   */
  async getAbsences(statut = null) {
    try {
      let query = supabase
        .from('absences')
        .select('*')
        .order('date_debut', { ascending: false });

      if (statut) {
        query = query.eq('statut', statut);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur getAbsences:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique getAbsences:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Ajouter une absence
   * @param {Object} absence - Données de l'absence
   * @returns {Promise} Résultat de l'ajout
   */
  async ajouterAbsence(absence) {
    try {
      const { data, error } = await supabase
        .from('absences')
        .insert([{
          employe_id: absence.employeId,
          employe_nom: absence.employeNom,
          date_debut: absence.dateDebut,
          date_fin: absence.dateFin,
          motif: absence.motif || 'Non spécifié',
          statut: absence.statut || 'planifiee',
          remplacant_id: absence.remplacantId || null,
          remplacant_nom: absence.remplacantNom || null,
          notes: absence.notes || null,
          created_by: absence.createdBy || 'IA',
          ia_suggestion: absence.iaSuggestion || true
        }])
        .select()
        .single();

      if (error) {
        console.error('Erreur ajouterAbsence:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique ajouterAbsence:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Suggérer un remplaçant pour une absence
   * @param {number} employeAbsentId - ID de l'employé absent
   * @param {string} date - Date de l'absence (YYYY-MM-DD)
   * @param {string} poste - Poste à pourvoir
   * @returns {Promise} Suggestions de remplaçants
   */
  async suggererRemplacant(employeAbsentId, date, poste) {
    try {
      const { data, error } = await supabase
        .rpc('suggest_replacement', {
          p_employe_absent_id: employeAbsentId,
          p_date: date,
          p_poste: poste
        });

      if (error) {
        console.error('Erreur suggererRemplacant:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique suggererRemplacant:', err);
      return { data: null, error: err };
    }
  },

  // ==================== EMPLOYÉS DISPONIBLES ====================

  /**
   * Obtenir les employés disponibles pour une date/heure/poste
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {string} heureDebut - Heure de début (HH:MM)
   * @param {string} heureFin - Heure de fin (HH:MM)
   * @param {string} poste - Poste recherché (optionnel)
   * @returns {Promise} Liste des employés disponibles
   */
  async getEmployesDisponibles(date, heureDebut = '06:00', heureFin = '20:00', poste = null) {
    try {
      const { data, error } = await supabase
        .rpc('get_employes_disponibles', {
          p_date: date,
          p_heure_debut: heureDebut,
          p_heure_fin: heureFin,
          p_poste: poste
        });

      if (error) {
        console.error('Erreur getEmployesDisponibles:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique getEmployesDisponibles:', err);
      return { data: null, error: err };
    }
  },

  // ==================== PLANNINGS IA ====================

  /**
   * Récupérer les plannings IA pour une semaine
   * @param {string} semaine - Date du lundi (YYYY-MM-DD)
   * @returns {Promise} Plannings de la semaine
   */
  async getPlanningsIA(semaine) {
    try {
      const { data, error } = await supabase
        .from('plannings_ia')
        .select('*')
        .eq('semaine', semaine)
        .order('jour', { ascending: true })
        .order('heure_debut', { ascending: true });

      if (error) {
        console.error('Erreur getPlanningsIA:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique getPlanningsIA:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Créer un planning IA optimisé
   * @param {string} semaine - Date du lundi (YYYY-MM-DD)
   * @param {Object} contraintes - Contraintes du planning
   * @returns {Promise} Planning optimisé
   */
  async genererPlanningOptimise(semaine, contraintes = {}) {
    try {
      // Logique de génération de planning optimisé
      // Pour l'instant, on va simuler avec des données de base
      const planningsGeneres = [];
      const postes = ['Cuisine chaude', 'Cuisine froide', 'Pâtisserie'];
      const heuresService = [
        { debut: '06:00', fin: '14:00' },
        { debut: '14:00', fin: '22:00' }
      ];

      // Obtenir les employés disponibles
      const { data: employes } = await this.getEmployesDisponibles(semaine);
      
      if (!employes || employes.length === 0) {
        return { data: [], error: 'Aucun employé disponible' };
      }

      // Génération simple du planning (à améliorer avec algorithme d'optimisation)
      for (let jour = 1; jour <= 7; jour++) {
        for (const poste of postes) {
          for (const horaire of heuresService) {
            // Sélectionner un employé au hasard parmi ceux compétents
            const employesCompetents = employes.filter(emp => 
              emp.competences_pertinentes.some(comp => 
                comp.competence.toLowerCase().includes(poste.toLowerCase())
              )
            );

            if (employesCompetents.length > 0) {
              const employe = employesCompetents[Math.floor(Math.random() * employesCompetents.length)];
              
              planningsGeneres.push({
                semaine,
                employe_id: employe.employe_id,
                employe_nom: employe.employe_nom,
                poste,
                jour,
                heure_debut: horaire.debut,
                heure_fin: horaire.fin,
                statut: 'propose',
                confidence_ia: 0.8,
                raison_ia: `Assigné selon compétences disponibles pour ${poste}`
              });
            }
          }
        }
      }

      // Insérer en base
      const { data, error } = await supabase
        .from('plannings_ia')
        .insert(planningsGeneres)
        .select();

      if (error) {
        console.error('Erreur genererPlanningOptimise:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique genererPlanningOptimise:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Valider un planning IA
   * @param {number} planningId - ID du planning
   * @param {string} validatedBy - Nom du validateur
   * @returns {Promise} Résultat de la validation
   */
  async validerPlanningIA(planningId, validatedBy) {
    try {
      const { data, error } = await supabase
        .from('plannings_ia')
        .update({
          statut: 'valide',
          validated_by: validatedBy
        })
        .eq('id', planningId)
        .select()
        .single();

      if (error) {
        console.error('Erreur validerPlanningIA:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique validerPlanningIA:', err);
      return { data: null, error: err };
    }
  },

  // ==================== ACTIONS IA ====================

  /**
   * Enregistrer une action IA
   * @param {Object} action - Données de l'action
   * @returns {Promise} Résultat de l'enregistrement
   */
  async enregistrerActionIA(action) {
    try {
      const { data, error } = await supabase
        .from('ia_actions')
        .insert([{
          action_type: action.type,
          intent: action.intent,
          user_input: action.userInput,
          parametres: action.parametres,
          resultat: action.resultat,
          statut: action.statut || 'success',
          execution_time_ms: action.executionTime,
          user_id: action.userId
        }])
        .select()
        .single();

      if (error) {
        console.error('Erreur enregistrerActionIA:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique enregistrerActionIA:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Mettre à jour le feedback d'une action IA
   * @param {number} actionId - ID de l'action
   * @param {number} feedback - Note de 1 à 5
   * @param {Object} correction - Correction utilisateur (optionnelle)
   * @returns {Promise} Résultat de la mise à jour
   */
  async mettreAJourFeedbackIA(actionId, feedback, correction = null) {
    try {
      const { data, error } = await supabase
        .from('ia_actions')
        .update({
          feedback_utilisateur: feedback,
          correction_utilisateur: correction
        })
        .eq('id', actionId)
        .select()
        .single();

      if (error) {
        console.error('Erreur mettreAJourFeedbackIA:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique mettreAJourFeedbackIA:', err);
      return { data: null, error: err };
    }
  },

  // ==================== CONFIGURATION IA ====================

  /**
   * Obtenir la configuration IA
   * @returns {Promise} Configuration
   */
  async getConfigurationIA() {
    try {
      const { data, error } = await supabase
        .from('ia_config')
        .select('*')
        .order('cle', { ascending: true });

      if (error) {
        console.error('Erreur getConfigurationIA:', error);
        return { data: null, error };
      }

      // Convertir en objet pour faciliter l'usage
      const config = {};
      data.forEach(item => {
        config[item.cle] = item.valeur;
      });

      return { data: config, error: null };
    } catch (err) {
      console.error('Erreur technique getConfigurationIA:', err);
      return { data: null, error: err };
    }
  },

  // ==================== ANALYSES ====================

  /**
   * Analyser les compétences de l'équipe
   * @returns {Promise} Analyse des compétences
   */
  async analyserCompetencesEquipe() {
    try {
      const { data: competences, error: errorComp } = await supabase
        .from('employe_competences')
        .select(`
          *,
          competences (nom, categorie, niveau_requis)
        `);

      if (errorComp) {
        console.error('Erreur analyserCompetencesEquipe:', errorComp);
        return { data: null, error: errorComp };
      }

      // Analyser les données
      const analyse = {
        totalEmployes: new Set(competences.map(c => c.employe_id)).size,
        totalCompetences: new Set(competences.map(c => c.competence_id)).size,
        repartitionNiveaux: {},
        repartitionCategories: {},
        competencesManquantes: [],
        employesMultiCompetents: []
      };

      // Calculer les répartitions
      competences.forEach(comp => {
        const niveau = comp.niveau_actuel;
        const categorie = comp.competences.categorie;
        
        analyse.repartitionNiveaux[niveau] = (analyse.repartitionNiveaux[niveau] || 0) + 1;
        analyse.repartitionCategories[categorie] = (analyse.repartitionCategories[categorie] || 0) + 1;
      });

      return { data: analyse, error: null };
    } catch (err) {
      console.error('Erreur technique analyserCompetencesEquipe:', err);
      return { data: null, error: err };
    }
  },

  // ==================== UTILITAIRES ====================

  /**
   * Formater les erreurs Supabase pour affichage utilisateur
   * @param {Object} error - Erreur Supabase
   * @returns {string} Message d'erreur formaté
   */
  formatError(error) {
    if (!error) return 'Erreur inconnue';
    
    // Erreurs de contrainte unique
    if (error.code === '23505') {
      return 'Cette entrée existe déjà';
    }
    
    // Erreurs de validation
    if (error.code === '23514') {
      return 'Données invalides (vérifiez les valeurs saisies)';
    }
    
    // Erreurs de fonction
    if (error.message?.includes('function')) {
      return 'Fonctionnalité non disponible (base de données à mettre à jour)';
    }
    
    // Erreur générique
    return error.message || 'Erreur de connexion à la base de données';
  }
};

export default supabaseIACuisine; 