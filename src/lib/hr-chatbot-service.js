// ========================================
// SERVICE CHATBOT RH AUTONOME - CADDY CUISINE
// ========================================
// Accès direct Supabase + Function Calling GPT-4o Mini
// Utilise: absences_cuisine_advanced, employes_cuisine_new, planning_cuisine_new

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase directe (autonome)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration OpenAI pour Function Calling
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

/**
 * 🤖 SERVICE CHATBOT RH AUTONOME
 * Gestion complète employés, absences, planning via langage naturel
 */
export class HRChatbotService {
  constructor() {
    this.employeesCache = null;
    this.lastCacheUpdate = null;
    this.CACHE_DURATION = 300000; // 5 minutes
  }

  // =====================================
  // 🔍 FONCTIONS UTILITAIRES
  // =====================================

  /**
   * Cache intelligent des employés
   */
  async getEmployees() {
    const now = Date.now();
    if (!this.employeesCache || !this.lastCacheUpdate || 
        (now - this.lastCacheUpdate) > this.CACHE_DURATION) {
      
      const { data, error } = await supabase
        .from('employes_cuisine_new')
        .select('*')
        .eq('actif', true)
        .order('prenom');
      
      if (error) throw new Error(`Erreur chargement employés: ${error.message}`);
      
      this.employeesCache = data;
      this.lastCacheUpdate = now;
    }
    
    return this.employeesCache;
  }

  /**
   * Calcule la similarité entre deux chaînes (Distance de Levenshtein simplifiée)
   */
  calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    // Distance de Levenshtein simplifiée
    const editDistance = this.levenshteinDistance(s1, s2);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Distance de Levenshtein pour mesurer la différence entre deux mots
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1, // substitution
            matrix[j][i - 1] + 1,     // insertion
            matrix[j - 1][i] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Recherche intelligente d'employé par nom avec suggestions
   */
  async findEmployee(searchName) {
    const employees = await this.getEmployees();
    const search = searchName.toLowerCase().trim();
    
    // 1. Recherche exacte d'abord
    let found = employees.find(emp => 
      emp.prenom.toLowerCase() === search
    );
    
    if (found) {
      return { employee: found, confidence: 100, type: 'exact' };
    }
    
    // 2. Recherche par inclusion
    found = employees.find(emp => 
      emp.prenom.toLowerCase().includes(search) ||
      search.includes(emp.prenom.toLowerCase())
    );
    
    if (found) {
      return { employee: found, confidence: 85, type: 'inclusion' };
    }
    
    // 3. Recherche floue avec similarité
    const suggestions = employees.map(emp => ({
      employee: emp,
      similarity: this.calculateSimilarity(search, emp.prenom)
    })).filter(s => s.similarity >= 0.6) // 60% de similarité minimum
      .sort((a, b) => b.similarity - a.similarity);
    
    if (suggestions.length > 0) {
      return {
        employee: suggestions[0].employee,
        confidence: Math.round(suggestions[0].similarity * 100),
        type: 'fuzzy',
        suggestions: suggestions.slice(0, 3).map(s => ({
          name: s.employee.prenom,
          confidence: Math.round(s.similarity * 100)
        }))
      };
    }
    
    return null;
  }

  /**
   * Parse les dates intelligemment
   */
  parseDate(dateText) {
    if (!dateText) return new Date();
    
    const text = dateText.toLowerCase();
    const today = new Date();
    
    // Mots-clés temporels
    if (text.includes('aujourd\'hui')) return today;
    if (text.includes('demain')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    }
    if (text.includes('après-demain')) {
      const dayAfter = new Date(today);
      dayAfter.setDate(today.getDate() + 2);
      return dayAfter;
    }
    
    // Jours de la semaine
    const daysMap = {
      'lundi': 1, 'mardi': 2, 'mercredi': 3, 
      'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0
    };
    
    for (const [day, targetDay] of Object.entries(daysMap)) {
      if (text.includes(day)) {
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
        return targetDate;
      }
    }
    
    // Format ISO ou français
    const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return new Date(isoMatch[0]);
    }
    
    const frMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (frMatch) {
      const [, day, month, year] = frMatch;
      return new Date(year, month - 1, day);
    }
    
    return today;
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(date) {
    return date.toLocaleDateString('fr-FR');
  }

  /**
   * Formate une date pour la DB
   */
  formatDateForDB(date) {
    return date.toISOString().split('T')[0];
  }

  // =====================================
  // 📋 FONCTIONS CRUD ABSENCES
  // =====================================

  /**
   * 🎯 CORE : Créer une absence (version interne avec employé résolu)
   * @param {Object} employee - Objet employé résolu
   * @param {string} dateDebut - Date début
   * @param {string} dateFin - Date fin  
   * @param {string} typeAbsence - Type d'absence
   * @param {string} motif - Motif
   * @param {string} heureDebut - Heure début
   * @param {string} heureFin - Heure fin
   */
  async _coreCreerAbsence(employee, dateDebut, dateFin, typeAbsence = 'Absent', motif = null, heureDebut = null, heureFin = null) {
    console.log(`🎯 _coreCreerAbsence: ${employee.prenom}, ${dateDebut} -> ${dateFin}, type: ${typeAbsence}`);
    
    try {
      const dateDebutParsed = this.parseDate(dateDebut);
      const dateFinParsed = this.parseDate(dateFin || dateDebut);
      
      if (!dateDebutParsed || !dateFinParsed) {
        throw new Error('Format de date invalide');
      }

      const absenceData = {
        employe_id: employee.id,
        date_debut: this.formatDateForDB(dateDebutParsed),
        date_fin: this.formatDateForDB(dateFinParsed),
        type_absence: typeAbsence,
        motif: motif,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('absences_cuisine_advanced')
        .insert([absenceData])
        .select()
        .single();

      if (error) throw error;

      const baseMessage = `✅ Absence créée: ${employee.prenom} - ${typeAbsence} du ${this.formatDate(dateDebutParsed)} au ${this.formatDate(dateFinParsed)}`;
      
      return {
        success: true,
        data,
        message: baseMessage
      };
      
    } catch (error) {
      console.error('❌ Erreur _coreCreerAbsence:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Impossible de créer l'absence: ${error.message}`
      };
    }
  }

  /**
   * 🌟 PUBLIC : Créer une absence (avec recherche intelligente de nom)
   */
  async creerAbsence(employeNom, dateDebut, dateFin, typeAbsence = 'Absent', motif = null, heureDebut = null, heureFin = null) {
    return await this.withEmployeeNameResolution(
      this._coreCreerAbsence,
      employeNom,
      "créer une absence",
      dateDebut, dateFin, typeAbsence, motif, heureDebut, heureFin
    );
  }

  /**
   * Modifier une absence existante
   */
  async modifierAbsence(absenceId, nouvelleDonnees) {
    try {
      console.log(`🔧 modifierAbsence: ID ${absenceId}`, nouvelleDonnees);
      
      const { data, error } = await supabase
        .from('absences_cuisine_advanced')
        .update(nouvelleDonnees)
        .eq('id', absenceId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        data,
        message: `✅ Absence ID ${absenceId} modifiée avec succès`
      };
    } catch (error) {
      console.error('❌ Erreur modifierAbsence:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Impossible de modifier l'absence: ${error.message}`
      };
    }
  }

  /**
   * Supprimer une absence
   */
  async supprimerAbsence(absenceId) {
    try {
      console.log(`🗑️ supprimerAbsence: ID ${absenceId}`);
      
      const { error } = await supabase
        .from('absences_cuisine_advanced')
        .delete()
        .eq('id', absenceId);
      
      if (error) throw error;
      
      return {
        success: true,
        message: `✅ Absence ID ${absenceId} supprimée`
      };
    } catch (error) {
      console.error('❌ Erreur supprimerAbsence:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Impossible de supprimer l'absence: ${error.message}`
      };
    }
  }

  /**
   * Obtenir les absences d'une date
   */
  async obtenirAbsencesDuJour(date = null) {
    try {
      const targetDate = date ? this.parseDate(date) : new Date();
      const dateStr = this.formatDateForDB(targetDate);
      
      console.log(`📅 obtenirAbsencesDuJour: ${dateStr}`);
      
      const { data, error } = await supabase
        .from('absences_cuisine_advanced')
        .select(`
          *,
          employes_cuisine_new (prenom, langue_parlee)
        `)
        .lte('date_debut', dateStr)
        .gte('date_fin', dateStr)
        .order('type_absence');
      
      if (error) throw error;
      
      return {
        success: true,
        data,
        count: data.length,
        message: data.length === 0 
          ? `✅ Aucune absence le ${this.formatDate(targetDate)}`
          : `📋 ${data.length} absence(s) le ${this.formatDate(targetDate)}`
      };
    } catch (error) {
      console.error('❌ Erreur obtenirAbsencesDuJour:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Impossible de récupérer les absences: ${error.message}`
      };
    }
  }

  // =====================================
  // 📅 FONCTIONS CRUD PLANNING
  // =====================================

  /**
   * 🎯 CORE : Affecter un employé au planning (version interne avec employé résolu)
   * @param {Object} employee - Objet employé résolu
   * @param {string} date - Date
   * @param {string} poste - Poste
   * @param {string} creneau - Créneau
   * @param {string} role - Rôle
   */
  async _coreAffecterEmployePlanning(employee, date, poste, creneau, role = 'Équipier') {
    console.log(`👥 _coreAffecterEmployePlanning: ${employee.prenom} → ${poste} le ${date} (${creneau})`);
    
    try {
      const targetDate = this.parseDate(date);
      if (!targetDate) {
        throw new Error('Format de date invalide');
      }

      const planningData = {
        employe_id: employee.id,
        date: this.formatDateForDB(targetDate),
        poste: this.mapPosteToDatabase(poste),
        creneau: creneau,
        role: role,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('planning_cuisine_new')
        .insert([planningData])
        .select()
        .single();

      if (error) throw error;

      const baseMessage = `✅ ${employee.prenom} affecté(e) à ${poste} le ${this.formatDate(targetDate)} (${creneau})`;
      
      return {
        success: true,
        data,
        message: baseMessage
      };
      
    } catch (error) {
      console.error('❌ Erreur _coreAffecterEmployePlanning:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Impossible d'affecter au planning: ${error.message}`
      };
    }
  }

  /**
   * 🌟 PUBLIC : Affecter un employé au planning (avec recherche intelligente de nom)
   */
  async affecterEmployePlanning(employeNom, date, poste, creneau, role = 'Équipier') {
    return await this.withEmployeeNameResolution(
      this._coreAffecterEmployePlanning,
      employeNom,
      "affecter au planning",
      date, poste, creneau, role
    );
  }

  /**
   * Désaffecter un employé du planning
   */
  async desaffecterEmployePlanning(planningId) {
    try {
      console.log(`🗑️ desaffecterEmployePlanning: ID ${planningId}`);
      
      const { error } = await supabase
        .from('planning_cuisine_new')
        .delete()
        .eq('id', planningId);
      
      if (error) throw error;
      
      return {
        success: true,
        message: `✅ Affectation planning ID ${planningId} supprimée`
      };
    } catch (error) {
      console.error('❌ Erreur desaffecterEmployePlanning:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Impossible de désaffecter: ${error.message}`
      };
    }
  }

  /**
   * Obtenir le planning d'une date
   */
  async obtenirPlanningDuJour(date = null) {
    try {
      const targetDate = date ? this.parseDate(date) : new Date();
      const dateStr = this.formatDateForDB(targetDate);
      
      console.log(`📋 obtenirPlanningDuJour: ${dateStr}`);
      
      const { data, error } = await supabase
        .from('planning_cuisine_new')
        .select(`
          *,
          employes_cuisine_new (prenom, langue_parlee, profil)
        `)
        .eq('date', dateStr)
        .order('creneau')
        .order('poste');
      
      if (error) throw error;
      
      return {
        success: true,
        data,
        count: data.length,
        message: data.length === 0 
          ? `📅 Aucun planning le ${this.formatDate(targetDate)}`
          : `📋 ${data.length} affectation(s) le ${this.formatDate(targetDate)}`
      };
    } catch (error) {
      console.error('❌ Erreur obtenirPlanningDuJour:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Impossible de récupérer le planning: ${error.message}`
      };
    }
  }

  // =====================================
  // 🔍 FONCTIONS RECHERCHE & ANALYSE
  // =====================================

  /**
   * Chercher des remplaçants pour un poste
   */
  async chercherRemplacants(poste, date = null, excludeEmployeeIds = []) {
    try {
      console.log(`🔍 chercherRemplacants pour ${poste}`);
      
      const targetDate = date ? this.parseDate(date) : new Date();
      const dateStr = this.formatDateForDB(targetDate);
      
      // Récupérer tous les employés compétents pour ce poste
      const employees = await this.getEmployees();
      const posteField = this.getPosteField(poste);
      
      let candidats = employees.filter(emp => 
        emp[posteField] === true && 
        emp.actif === true &&
        !excludeEmployeeIds.includes(emp.id)
      );
      
      // Vérifier qui est disponible (pas absent)
      const { data: absences } = await supabase
        .from('absences_cuisine_advanced')
        .select('employee_id')
        .lte('date_debut', dateStr)
        .gte('date_fin', dateStr);
      
      const employesAbsents = absences?.map(abs => abs.employee_id) || [];
      
      candidats = candidats.filter(emp => 
        !employesAbsents.includes(emp.id)
      );
      
      return {
        success: true,
        data: candidats,
        count: candidats.length,
        message: candidats.length === 0 
          ? `❌ Aucun remplaçant disponible pour ${poste}`
          : `✅ ${candidats.length} remplaçant(s) trouvé(s) pour ${poste}`
      };
    } catch (error) {
      console.error('❌ Erreur chercherRemplacants:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Erreur recherche remplaçants: ${error.message}`
      };
    }
  }

  /**
   * Mapper nom poste → champ DB
   */
  getPosteField(poste) {
    const mapping = {
      'Cuisine chaude': 'cuisine_chaude',
      'Sandwichs': 'sandwichs',
      'Chef Sandwichs': 'chef_sandwichs', 
      'Vaisselle': 'vaisselle',
      'Légumerie': 'legumerie',
      'Pain': 'pain',
      'Jus de fruits': 'jus_de_fruits',
      'Self': 'self_midi',
      'Self Midi': 'self_midi'
    };
    
    return mapping[poste] || 'legumerie'; // Default fallback
  }

  /**
   * 🎯 HELPER : Mapper nom poste vers format base de données
   * @param {string} poste - Nom du poste
   * @returns {string} Nom du poste formaté pour la DB
   */
  mapPosteToDatabase(poste) {
    const mapping = {
      'Cuisine chaude': 'cuisine_chaude',
      'Sandwichs': 'sandwichs', 
      'Vaisselle': 'vaisselle',
      'Légumerie': 'legumerie',
      'Self': 'self',
      'Pain': 'pain',
      'Jus': 'jus'
    };
    return mapping[poste] || poste.toLowerCase().replace(/\s+/g, '_');
  }

  // =====================================
  // 🤖 FONCTION CALLING OPENAI
  // =====================================

  /**
   * Configuration des fonctions pour OpenAI Function Calling
   */
  getFunctionDefinitions() {
    return [
      {
        name: "creer_absence",
        description: "Créer une nouvelle absence pour un employé ou une fermeture de service",
        parameters: {
          type: "object",
          properties: {
            employe_nom: {
              type: "string",
              description: "Nom/prénom de l'employé (null pour fermeture service)"
            },
            date_debut: {
              type: "string", 
              description: "Date de début (format naturel: 'demain', 'lundi', etc.)"
            },
            date_fin: {
              type: "string",
              description: "Date de fin (optionnel, par défaut = date_debut)"
            },
            type_absence: {
              type: "string",
              enum: ["Absent", "Congé", "Maladie", "Formation", "Rendez-vous", "Fermeture"],
              description: "Type d'absence"
            },
            motif: {
              type: "string",
              description: "Motif détaillé de l'absence"
            },
            heure_debut: {
              type: "string",
              description: "Heure début pour rendez-vous (format HH:MM)"
            },
            heure_fin: {
              type: "string", 
              description: "Heure fin pour rendez-vous (format HH:MM)"
            }
          },
          required: ["date_debut", "type_absence"]
        }
      },
      {
        name: "obtenir_absences_du_jour",
        description: "Voir toutes les absences d'une date donnée",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date à consulter (optionnel, par défaut aujourd'hui)"
            }
          }
        }
      },
      {
        name: "obtenir_absences_employe",
        description: "Voir toutes les absences d'un employé spécifique",
        parameters: {
          type: "object",
          properties: {
            employe_nom: {
              type: "string",
              description: "Nom/prénom de l'employé"
            },
            date_debut: {
              type: "string",
              description: "Date début pour filtrer (optionnel)"
            },
            date_fin: {
              type: "string",
              description: "Date fin pour filtrer (optionnel)"
            }
          },
          required: ["employe_nom"]
        }
      },
      {
        name: "affecter_employe_planning", 
        description: "Assigner un employé à un poste dans le planning",
        parameters: {
          type: "object",
          properties: {
            employe_nom: {
              type: "string",
              description: "Nom/prénom de l'employé"
            },
            date: {
              type: "string",
              description: "Date d'affectation"
            },
            poste: {
              type: "string",
              description: "Nom du poste (Cuisine chaude, Sandwichs, Vaisselle, etc.)"
            },
            creneau: {
              type: "string", 
              description: "Créneau horaire (8h-12h, 10h, 11h-11h45, etc.)"
            },
            role: {
              type: "string",
              description: "Rôle (Équipier, Chef, etc.)",
              default: "Équipier"
            }
          },
          required: ["employe_nom", "date", "poste", "creneau"]
        }
      },
      {
        name: "obtenir_planning_du_jour",
        description: "Voir le planning d'une date donnée", 
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date à consulter (optionnel, par défaut aujourd'hui)"
            }
          }
        }
      },
      {
        name: "chercher_remplacants",
        description: "Trouver des employés disponibles pour remplacer sur un poste",
        parameters: {
          type: "object", 
          properties: {
            poste: {
              type: "string",
              description: "Nom du poste à couvrir"
            },
            date: {
              type: "string",
              description: "Date pour laquelle chercher (optionnel)"
            }
          },
          required: ["poste"]
        }
      },
      {
        name: "modifier_absence",
        description: "Modifier une absence existante d'un employé",
        parameters: {
          type: "object",
          properties: {
            employe_nom: {
              type: "string",
              description: "Nom/prénom de l'employé dont on veut modifier l'absence"
            },
            date: {
              type: "string",
              description: "Date de l'absence à modifier (optionnel, par défaut aujourd'hui)"
            },
            nouvelles_donnees: {
              type: "object",
              description: "Nouvelles données (type_absence, motif, dates, etc.)"
            }
          },
          required: ["employe_nom", "nouvelles_donnees"]
        }
      },
      {
        name: "supprimer_absence",
        description: "Supprimer une absence d'un employé",
        parameters: {
          type: "object",
          properties: {
            employe_nom: {
              type: "string",
              description: "Nom/prénom de l'employé dont on veut supprimer l'absence"
            },
            date: {
              type: "string",
              description: "Date de l'absence à supprimer (optionnel, par défaut aujourd'hui)"
            }
          },
          required: ["employe_nom"]
        }
      }
    ];
  }

  /**
   * Exécuter une fonction appelée par l'IA
   */
  async executeFunctionCall(functionName, args) {
    console.log(`🎯 Exécution fonction: ${functionName}`, args);
    
    try {
      switch (functionName) {
        case 'creer_absence':
          return await this.creerAbsence(
            args.employe_nom,
            args.date_debut,
            args.date_fin || args.date_debut,
            args.type_absence,
            args.motif,
            args.heure_debut,
            args.heure_fin
          );
          
        case 'obtenir_absences_du_jour':
          return await this.obtenirAbsencesDuJour(args.date);
          
        case 'obtenir_absences_employe':
          return await this.obtenirAbsencesEmploye(
            args.employe_nom,
            args.date_debut,
            args.date_fin
          );
          
        case 'affecter_employe_planning':
          return await this.affecterEmployePlanning(
            args.employe_nom,
            args.date,
            args.poste,
            args.creneau,
            args.role
          );
          
        case 'obtenir_planning_du_jour':
          return await this.obtenirPlanningDuJour(args.date);
          
        case 'chercher_remplacants':
          return await this.chercherRemplacants(args.poste, args.date);
          
        case 'modifier_absence':
          return await this.modifierAbsenceParEmploye(
            args.employe_nom,
            args.date,
            args.nouvelles_donnees
          );
          
        case 'supprimer_absence':
          return await this.supprimerAbsenceParEmploye(
            args.employe_nom,
            args.date
          );
          
        default:
          throw new Error(`Fonction inconnue: ${functionName}`);
      }
    } catch (error) {
      console.error(`❌ Erreur exécution ${functionName}:`, error);
      return {
        success: false,
        error: error.message,
        message: `❌ Erreur: ${error.message}`
      };
    }
  }

  /**
   * 🧠 MIDDLEWARE : Recherche intelligente d'employé avec gestion centralisée
   * @param {string} searchName - Nom recherché
   * @param {string} context - Contexte pour le message (ex: "créer absence", "affecter planning")
   * @returns {Object} { employee, confidence, type, suggestionMessage }
   */
  async intelligentEmployeeSearch(searchName, context = "action") {
    console.log(`🧠 IntelligentSearch: "${searchName}" (contexte: ${context})`);
    
    const result = await this.findEmployee(searchName);
    if (!result) {
      throw new Error(`Aucun employé trouvé pour "${searchName}"`);
    }

    // 🎯 Construction du message intelligent contextualisé
    let suggestionMessage = '';
    const employeeName = result.employee.prenom;
    
    if (result.type === 'fuzzy' && result.confidence < 80) {
      suggestionMessage = `\n\n🤔 **J'ai trouvé "${employeeName}" (${result.confidence}% de similarité)**`;
      
      if (result.suggestions && result.suggestions.length > 1) {
        suggestionMessage += `\n\nAutres possibilités :\n${result.suggestions.slice(1).map(s => `• ${s.name} (${s.confidence}%)`).join('\n')}`;
      }
      
      suggestionMessage += `\n\n✅ **J'ai procédé avec ${employeeName}** - dis-moi si ce n'était pas la bonne personne ! 😊`;
      
    } else if (result.type === 'inclusion') {
      suggestionMessage = `\n\n✅ **Trouvé : ${employeeName}** (correspondance partielle)`;
    }
    // Si exact match, pas de message supplémentaire

    return {
      employee: result.employee,
      confidence: result.confidence,
      type: result.type,
      suggestionMessage,
      suggestions: result.suggestions
    };
  }

  /**
   * 🎯 HOOK PATTERN : Wrapper pour fonctions utilisant des noms d'employés
   * @param {Function} targetFunction - Fonction cible à exécuter
   * @param {string} employeeName - Nom de l'employé
   * @param {string} context - Contexte de l'action
   * @param {...any} args - Autres arguments de la fonction
   */
  async withEmployeeNameResolution(targetFunction, employeeName, context, ...args) {
    try {
      // 🧠 Recherche intelligente centralisée
      const searchResult = await this.intelligentEmployeeSearch(employeeName, context);
      
      // 🎯 Exécution de la fonction cible avec l'employé résolu
      const functionResult = await targetFunction.call(this, searchResult.employee, ...args);
      
      // 🎨 Enrichissement du message avec suggestions intelligentes
      if (functionResult.success && searchResult.suggestionMessage) {
        functionResult.message += searchResult.suggestionMessage;
      }
      
      return {
        ...functionResult,
        searchMetadata: {
          originalSearch: employeeName,
          resolvedName: searchResult.employee.prenom,
          confidence: searchResult.confidence,
          type: searchResult.type
        }
      };
      
    } catch (error) {
      console.error(`❌ Erreur withEmployeeNameResolution (${context}):`, error);
      return {
        success: false,
        error: error.message,
        message: `❌ ${error.message}`
      };
    }
  }

  /**
   * Traitement principal du message utilisateur avec historique
   * @param {string} userMessage - Message actuel de l'utilisateur
   * @param {Array} messageHistory - Historique des messages (optionnel)
   */
  async processUserMessage(userMessage, messageHistory = []) {
    try {
      const currentDate = new Date().toLocaleDateString('fr-FR');
      console.log(`💬 Processing: "${userMessage}"`);
      console.log(`📅 Date actuelle envoyée à l'IA: ${currentDate}`);
      console.log(`📜 Historique reçu: ${messageHistory.length} messages`);
      
      // 🧠 Construction de l'historique GPT avec contexte
      const gptMessages = [
        {
          role: 'system',
          content: `Salut ! Moi c'est Rémy, ton collègue assistant RH cuisine ! 👨‍🍳

📅 On est le ${new Date().toLocaleDateString('fr-FR', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})} et je suis là pour te donner un coup de main !

🤝 Je parle comme un vrai collègue - décontracté, sympa, mais efficace quand il faut ! 
Je connais toute l'équipe cuisine et j'adore aider au quotidien.

🎯 CE QUE JE PEUX FAIRE POUR TOI :
• 🏠 Déclarer les absences (maladie, congé, rdv médical...)
• 📋 Organiser le planning (qui va où, quand...)
• 🔍 Trouver des remplaçants au pied levé
• 📊 Te dire qui bosse aujourd'hui ou qui est absent

🗣️ COMMENT JE PARLE :
• Comme un pote de boulot - naturel et détendu
• J'aime bien les emojis pour égayer 😊
• Je structure mes réponses clairement
• Je confirme toujours ce que j'ai fait
• Je reste professionnel mais pas coincé !

💬 EXEMPLES DE CE QUE TU PEUX ME DIRE :
"Marie malade demain" / "Qui bosse aujourd'hui ?" / "Mets Paul sur Pain demain" / "Fermeture vendredi"

🧠 CONTEXTE CONVERSATIONNEL :
TRÈS IMPORTANT - Tu dois maintenir le contexte de la conversation. Si l'utilisateur répond à une de tes questions précédentes, utilise le contexte pour comprendre sa réponse.`
        }
      ];

      // 🔄 Ajout de l'historique récent (5 derniers messages max pour éviter token overflow)
      if (messageHistory && messageHistory.length > 0) {
        const recentHistory = messageHistory.slice(-5); // Garder seulement les 5 derniers
        
        recentHistory.forEach(msg => {
          if (msg.type === 'user') {
            gptMessages.push({
              role: 'user',
              content: msg.content
            });
          } else if (msg.type === 'bot') {
            gptMessages.push({
              role: 'assistant', 
              content: msg.content
            });
          }
        });
        
        console.log(`📜 Historique ajouté: ${recentHistory.length} messages`);
      }

      // 💬 Ajout du message actuel
      gptMessages.push({
        role: 'user',
        content: userMessage
      });
      
      // Appel OpenAI avec Function Calling
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: gptMessages, // ✅ MAINTENANT avec historique !
          functions: this.getFunctionDefinitions(),
          function_call: 'auto',
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      const completion = await response.json();
      
      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${completion.error?.message || 'Unknown error'}`);
      }

      const message = completion.choices[0].message;
      
      // Si l'IA veut appeler une fonction
      if (message.function_call) {
        const functionName = message.function_call.name;
        const functionArgs = JSON.parse(message.function_call.arguments);
        
        console.log(`🔧 Function call: ${functionName}`, functionArgs);
        
        // Exécuter la fonction
        const functionResult = await this.executeFunctionCall(functionName, functionArgs);
        
        // Deuxième appel pour générer la réponse finale
        const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Tu es Rémy, le collègue RH sympa ! 😊 On est le ${new Date().toLocaleDateString('fr-FR')}. Résume ce que tu viens de faire avec un ton décontracté et naturel, comme si tu parlais à un pote de boulot. Utilise des emojis pour rendre ça plus fun ! 🎯`
              },
              {
                role: 'user',
                content: userMessage
              },
              {
                role: 'assistant',
                content: null,
                function_call: message.function_call
              },
              {
                role: 'function',
                name: functionName,
                content: JSON.stringify(functionResult)
              }
            ],
            temperature: 0.1
          })
        });

        const finalCompletion = await finalResponse.json();
        
        return {
          success: true,
          message: finalCompletion.choices[0].message.content,
          functionCalled: functionName,
          functionResult: functionResult,
          rawResponse: completion
        };
      } else {
        // Réponse directe sans fonction
        return {
          success: true,
          message: message.content,
          functionCalled: null,
          functionResult: null,
          rawResponse: completion
        };
      }
      
    } catch (error) {
      console.error('❌ Erreur processUserMessage:', error);
      return {
        success: false,
        message: `❌ Erreur: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 🔍 HELPER : Trouver une absence par employé et date
   * @param {Object} employee - Objet employé 
   * @param {string} date - Date de l'absence
   * @returns {Object} Absence trouvée ou null
   */
  async _findAbsenceByEmployeeAndDate(employee, date = null) {
    try {
      const targetDate = date ? this.parseDate(date) : new Date();
      const dateStr = this.formatDateForDB(targetDate);
      
      console.log(`🔍 Recherche absence: ${employee.prenom} le ${dateStr}`);
      
      const { data: absences, error } = await supabase
        .from('absences_cuisine_advanced')
        .select('*')
        .eq('employe_id', employee.id)
        .eq('date_debut', dateStr)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (!absences || absences.length === 0) {
        return null;
      }
      
      // Retourner la plus récente si plusieurs
      return absences[0];
      
    } catch (error) {
      console.error('❌ Erreur _findAbsenceByEmployeeAndDate:', error);
      return null;
    }
  }

  /**
   * 🎯 CORE : Supprimer une absence par employé et date (version interne avec employé résolu)
   * @param {Object} employee - Objet employé résolu
   * @param {string} date - Date de l'absence (optionnel, par défaut aujourd'hui)
   */
  async _coreSupprimerAbsenceParEmploye(employee, date = null) {
    console.log(`🗑️ _coreSupprimerAbsenceParEmploye: ${employee.prenom} le ${date || 'aujourd\'hui'}`);
    
    try {
      // Trouver l'absence
      const absence = await this._findAbsenceByEmployeeAndDate(employee, date);
      
      if (!absence) {
        const dateStr = date ? this.formatDate(this.parseDate(date)) : 'aujourd\'hui';
        throw new Error(`Aucune absence trouvée pour ${employee.prenom} le ${dateStr}`);
      }
      
      // Supprimer l'absence
      const { error } = await supabase
        .from('absences_cuisine_advanced')
        .delete()
        .eq('id', absence.id);
      
      if (error) throw error;
      
      const dateStr = this.formatDate(this.parseDate(absence.date_debut));
      return {
        success: true,
        data: absence,
        message: `✅ Absence de ${employee.prenom} supprimée (${absence.type_absence} du ${dateStr})`
      };
      
    } catch (error) {
      console.error('❌ Erreur _coreSupprimerAbsenceParEmploye:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ ${error.message}`
      };
    }
  }

  /**
   * 🌟 PUBLIC : Supprimer une absence par nom d'employé (avec recherche intelligente)
   */
  async supprimerAbsenceParEmploye(employeNom, date = null) {
    return await this.withEmployeeNameResolution(
      this._coreSupprimerAbsenceParEmploye,
      employeNom,
      "supprimer une absence",
      date
    );
  }

  /**
   * 🎯 CORE : Modifier une absence par employé et date (version interne avec employé résolu)
   * @param {Object} employee - Objet employé résolu
   * @param {string} date - Date de l'absence
   * @param {Object} nouvellesDonnees - Nouvelles données
   */
  async _coreModifierAbsenceParEmploye(employee, date, nouvellesDonnees) {
    console.log(`🔧 _coreModifierAbsenceParEmploye: ${employee.prenom} le ${date}`);
    
    try {
      // Trouver l'absence
      const absence = await this._findAbsenceByEmployeeAndDate(employee, date);
      
      if (!absence) {
        const dateStr = date ? this.formatDate(this.parseDate(date)) : 'aujourd\'hui';
        throw new Error(`Aucune absence trouvée pour ${employee.prenom} le ${dateStr}`);
      }
      
      // Modifier l'absence
      const { data, error } = await supabase
        .from('absences_cuisine_advanced')
        .update(nouvellesDonnees)
        .eq('id', absence.id)
        .select()
        .single();
      
      if (error) throw error;
      
      const dateStr = this.formatDate(this.parseDate(absence.date_debut));
      return {
        success: true,
        data,
        message: `✅ Absence de ${employee.prenom} modifiée (${dateStr})`
      };
      
    } catch (error) {
      console.error('❌ Erreur _coreModifierAbsenceParEmploye:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ ${error.message}`
      };
    }
  }

  /**
   * 🌟 PUBLIC : Modifier une absence par nom d'employé (avec recherche intelligente)
   */
  async modifierAbsenceParEmploye(employeNom, date, nouvellesDonnees) {
    return await this.withEmployeeNameResolution(
      this._coreModifierAbsenceParEmploye,
      employeNom,
      "modifier une absence",
      date, nouvellesDonnees
    );
  }

  /**
   * 🎯 CORE : Obtenir les absences d'un employé (version interne avec employé résolu)
   * @param {Object} employee - Objet employé résolu
   * @param {string} dateDebut - Date début (optionnel)
   * @param {string} dateFin - Date fin (optionnel)
   */
  async _coreObtenirAbsencesEmploye(employee, dateDebut = null, dateFin = null) {
    console.log(`📋 _coreObtenirAbsencesEmploye: ${employee.prenom}`);
    
    try {
      let query = supabase
        .from('absences_cuisine_advanced')
        .select('*')
        .eq('employe_id', employee.id)
        .order('date_debut', { ascending: false });
      
      if (dateDebut) {
        query = query.gte('date_debut', this.formatDateForDB(this.parseDate(dateDebut)));
      }
      
      if (dateFin) {
        query = query.lte('date_debut', this.formatDateForDB(this.parseDate(dateFin)));
      }
      
      const { data: absences, error } = await query;
      
      if (error) throw error;
      
      if (!absences || absences.length === 0) {
        return {
          success: true,
          data: [],
          message: `📋 Aucune absence trouvée pour ${employee.prenom}`
        };
      }
      
      // Formater les absences pour l'affichage
      const absencesFormatees = absences.map(abs => {
        const debut = this.formatDate(this.parseDate(abs.date_debut));
        const fin = abs.date_fin ? this.formatDate(this.parseDate(abs.date_fin)) : debut;
        return `• ${abs.type_absence} du ${debut}${fin !== debut ? ` au ${fin}` : ''} ${abs.motif ? `(${abs.motif})` : ''}`;
      });
      
      const message = `📋 **Absences de ${employee.prenom} :**\n${absencesFormatees.join('\n')}`;
      
      return {
        success: true,
        data: absences,
        message
      };
      
    } catch (error) {
      console.error('❌ Erreur _coreObtenirAbsencesEmploye:', error);
      return {
        success: false,
        error: error.message,
        message: `❌ Impossible d'obtenir les absences: ${error.message}`
      };
    }
  }

  /**
   * 🌟 PUBLIC : Obtenir les absences d'un employé (avec recherche intelligente)
   */
  async obtenirAbsencesEmploye(employeNom, dateDebut = null, dateFin = null) {
    return await this.withEmployeeNameResolution(
      this._coreObtenirAbsencesEmploye,
      employeNom,
      "consulter les absences",
      dateDebut, dateFin
    );
  }
}

// Instance singleton
export const hrChatbot = new HRChatbotService();
export default hrChatbot; 