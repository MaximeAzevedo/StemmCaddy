import { supabaseAPI } from './supabase.js';
import { supabaseCuisine } from './supabase-cuisine.js';

/**
 * Moteur d'Actions IA pour l'Assistant Cuisine
 * Reconnaît les intentions utilisateur et exécute les actions correspondantes
 * CONNECTÉ À LA VRAIE BASE DE DONNÉES SUPABASE + CUISINE
 */
export class IAActionEngine {
  constructor() {
    this.patterns = this.initializePatterns();
    this.lastActionId = null;
    console.log('🤖 Assistant IA connecté à la base de données réelle + cuisine');
  }

  /**
   * Initialiser les patterns de reconnaissance d'intentions
   */
  initializePatterns() {
    return {
      // ========== GESTION DES ABSENCES ==========
      AJOUTER_ABSENCE: [
        /(\w+)\s+(?:est|sera|est en|sera en)?\s*(?:absent|absente|absence|congé|maladie|arrêt)\s*(?:le|du|à partir du|depuis le)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
        /absence\s+(?:de\s+)?(\w+)\s+(?:le|du|à partir du)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
        /(\w+)\s+(?:ne sera pas|n'est pas|ne peut pas)\s+(?:là|présent|présente|disponible)\s+(?:le|du)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
        /planifier\s+(?:l')?absence\s+(?:de\s+)?(\w+)\s+(?:pour\s+)?(?:le\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
      ],

      CHERCHER_REMPLACANT: [
        /qui\s+peut\s+(?:remplacer|prendre\s+la\s+place\s+de)\s+(\w+)/i,
        /remplaçant\s+pour\s+(\w+)/i,
        /qui\s+(?:est\s+)?disponible\s+(?:pour\s+)?(?:remplacer\s+)?(\w+)/i,
        /trouve(?:r)?\s+(?:un\s+)?remplaçant\s+(?:pour\s+)?(\w+)/i,
        /(\w+)\s+(?:a\s+besoin\s+d'un|needs\s+a)?\s*remplaçant/i
      ],

      // ========== GESTION DES COMPÉTENCES ==========
      MODIFIER_COMPETENCE: [
        /(\w+)\s+(?:maîtrise|sait faire|connaît|a appris|peut faire)\s+(?:la\s+|le\s+|les\s+)?(\w+(?:\s+\w+)?)/i,
        /(\w+)\s+(?:a\s+)?(?:niveau|niveau de compétence|skills?)\s+(\d)\s+(?:en\s+|pour\s+|dans\s+)?(\w+(?:\s+\w+)?)/i,
        /(?:mettre\s+à\s+jour|update)\s+(?:les\s+)?compétences?\s+(?:de\s+)?(\w+)/i,
        /(\w+)\s+(?:est\s+)?(?:maintenant\s+)?(?:expert|experte|bon|bonne|fort|forte)\s+(?:en\s+|dans\s+|pour\s+)?(\w+(?:\s+\w+)?)/i
      ],

      // ========== GESTION DU PLANNING ==========
      GENERER_PLANNING: [
        /(?:génère|génèrer|créer|faire|propose|proposer)\s+(?:le\s+|un\s+)?planning\s*(?:de\s+)?(?:la\s+)?(?:semaine|week)/i,
        /planning\s+(?:pour\s+)?(?:la\s+)?semaine\s+(?:prochaine|du\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})?/i,
        /optimise(?:r)?\s+(?:le\s+)?planning/i,
        /(?:planifier|organiser)\s+(?:la\s+)?semaine/i
      ],

      ANALYSER_EQUIPE: [
        /analys(?:e|er)\s+(?:l')?équipe/i,
        /(?:compétences|skills)\s+(?:de\s+l')?équipe/i,
        /(?:état|overview|aperçu)\s+(?:de\s+l')?équipe/i,
        /qui\s+sait\s+faire\s+quoi/i,
        /répartition\s+(?:des\s+)?compétences/i
      ],

      EQUILIBRER_CHARGE: [
        /équilibr(?:e|er)\s+(?:la\s+)?charge/i,
        /répartir\s+(?:les\s+)?(?:heures|tâches)/i,
        /optimise(?:r)?\s+(?:la\s+)?charge\s+de\s+travail/i,
        /heures\s+(?:de\s+)?travail\s+équitables/i
      ],

      // ========== RECHERCHE ET INFORMATION ==========
      QUI_TRAVAILLE: [
        /qui\s+travaille\s+(?:le\s+|ce\s+)?(\w+)/i,
        /qui\s+(?:est\s+)?(?:de\s+)?service\s+(?:le\s+)?(\w+)/i,
        /planning\s+(?:du\s+|pour\s+le\s+)?(\w+)/i
      ],

      QUI_DISPONIBLE: [
        /qui\s+(?:est\s+)?disponible\s+(?:le\s+|ce\s+)?(\w+)/i,
        /employés?\s+libres?\s+(?:le\s+)?(\w+)/i,
        /(?:liste|qui)\s+(?:des\s+)?disponibilités/i
      ]
    };
  }

  /**
   * Analyser une commande utilisateur et détecter l'intention
   * @param {string} userInput - Commande utilisateur
   * @returns {Object} Intention détectée et paramètres
   */
  analyzeIntent(userInput) {
    const normalizedInput = userInput.trim();
    
    for (const [intent, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = normalizedInput.match(pattern);
        if (match) {
          return {
            intent,
            confidence: 0.9,
            matches: match,
            parameters: this.extractParameters(intent, match)
          };
        }
      }
    }

    // Fallback - intention générale
    return {
      intent: 'GENERAL_QUERY',
      confidence: 0.3,
      matches: [],
      parameters: {}
    };
  }

  /**
   * Extraire les paramètres selon l'intention détectée
   * @param {string} intent - Intention détectée
   * @param {Array} matches - Résultats de la regex
   * @returns {Object} Paramètres extraits
   */
  extractParameters(intent, matches) {
    const params = {};

    switch (intent) {
      case 'AJOUTER_ABSENCE':
        params.employeNom = matches[1];
        params.date = this.parseDate(matches[2]);
        params.motif = this.extractReason(matches[0]);
        break;

      case 'CHERCHER_REMPLACANT':
        params.employeNom = matches[1];
        params.date = new Date().toISOString().split('T')[0]; // Aujourd'hui par défaut
        break;

      case 'MODIFIER_COMPETENCE':
        params.employeNom = matches[1];
        if (matches.length > 3) {
          params.niveau = parseInt(matches[2]) || 3;
          params.competence = matches[3];
        } else {
          params.competence = matches[2];
          params.niveau = 3; // Niveau par défaut
        }
        break;

      case 'GENERER_PLANNING':
        params.semaine = matches[1] ? this.parseDate(matches[1]) : this.getNextMonday();
        break;

      case 'QUI_TRAVAILLE':
      case 'QUI_DISPONIBLE':
        params.date = this.parseDate(matches[1]) || new Date().toISOString().split('T')[0];
        break;

      default:
        // Pas de paramètres spécifiques pour les autres intentions
        break;
    }

    return params;
  }

  /**
   * Exécuter une action selon l'intention détectée
   * @param {string} userInput - Commande utilisateur originale
   * @returns {Promise<Object>} Résultat de l'action
   */
  async executeAction(userInput) {
    const startTime = Date.now();
    
    try {
      const analysis = this.analyzeIntent(userInput);
      
      let result;
      switch (analysis.intent) {
        case 'AJOUTER_ABSENCE':
          result = await this.handleAjouterAbsence(analysis.parameters);
          break;
          
        case 'CHERCHER_REMPLACANT':
          result = await this.handleChercherRemplacant(analysis.parameters);
          break;
          
        case 'MODIFIER_COMPETENCE':
          result = await this.handleModifierCompetence(analysis.parameters);
          break;
          
        case 'GENERER_PLANNING':
          result = await this.handleGenererPlanning(analysis.parameters);
          break;
          
        case 'ANALYSER_EQUIPE':
          result = await this.handleAnalyserEquipe(analysis.parameters);
          break;
          
        case 'QUI_TRAVAILLE':
          result = await this.handleQuiTravaille(analysis.parameters);
          break;
          
        case 'QUI_DISPONIBLE':
          result = await this.handleQuiDisponible(analysis.parameters);
          break;
          
        default:
          result = {
            success: false,
            message: "Je n'ai pas compris cette commande. Essayez quelque chose comme 'Marie est absente lundi' ou 'génère le planning de la semaine'.",
            data: null
          };
      }

      // Enregistrer l'action pour apprentissage
      await this.logAction({
        type: analysis.intent,
        intent: analysis.intent,
        userInput,
        parametres: analysis.parameters,
        resultat: result,
        statut: result.success ? 'success' : 'error',
        executionTime: Date.now() - startTime,
        userId: 'current_user'
      });

      return {
        ...result,
        intent: analysis.intent,
        confidence: analysis.confidence,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Erreur executeAction:', error);
      return {
        success: false,
        message: `Erreur lors de l'exécution: ${error.message}`,
        data: null,
        error
      };
    }
  }

  // ==================== HANDLERS SPÉCIFIQUES ====================

  /**
   * Gérer l'ajout d'une absence
   */
  async handleAjouterAbsence(params) {
    try {
      console.log('🤖 Ajout absence cuisine:', params);
      
      // Chercher l'employé dans la base de données cuisine
      const { data: employeesCuisine } = await supabaseCuisine.getEmployeesCuisine();
      let employeCuisine = employeesCuisine?.find(ec => 
        ec.employee.nom?.toLowerCase().includes(params.employeNom.toLowerCase()) ||
        ec.employee.prenom?.toLowerCase().includes(params.employeNom.toLowerCase())
      );

      if (!employeCuisine) {
        // Fallback : chercher dans tous les employés
        const { data: employees } = await supabaseAPI.getEmployees();
        const employe = employees?.find(e => 
          e.nom?.toLowerCase().includes(params.employeNom.toLowerCase()) ||
          e.prenom?.toLowerCase().includes(params.employeNom.toLowerCase())
        );
        
        if (!employe) {
          return {
            success: false,
            message: `❌ **Employé non trouvé : "${params.employeNom}"**\n\n🔍 **Vérifiez :**\n• L'orthographe du nom\n• Que l'employé est bien dans la base cuisine\n\n💡 Employés cuisine disponibles : utilisez "Analyser équipe" pour voir la liste.`,
            data: null
          };
        }
        
        // Utiliser l'employé trouvé en général
        employeCuisine = { employee: employe };
      }

      // Créer l'absence avec l'API cuisine si possible, sinon API générale
      const absence = {
        employee_id: employeCuisine.employee.id,
        date_debut: params.date,
        date_fin: params.date,
        type_absence: 'Absent',
        statut: 'Confirmée',
        motif: params.motif || 'Absence déclarée via IA'
      };

      // Essayer d'abord l'API cuisine
      let result = await supabaseCuisine.createAbsenceCuisine(absence);
      
      if (result.error) {
        console.warn('⚠️ API cuisine échouée, tentative API générale:', result.error);
        // Fallback vers l'API générale
        result = await supabaseAPI.createAbsence(absence);
      }
      
      if (result.error) {
        return {
          success: false,
          message: `❌ **Erreur lors de l'ajout de l'absence**\n\n${result.error.message || 'Erreur inconnue'}\n\n🔧 Contactez le support technique.`,
          data: null
        };
      }

      // Log de l'action
      await this.logAction({
        intention: 'AJOUTER_ABSENCE',
        parametres: params,
        resultat_succes: true,
        employe_concerne: employeCuisine.employee.id
      });

      return {
        success: true,
        message: `✅ **Absence cuisine enregistrée !**\n\n👨‍🍳 **${employeCuisine.employee.nom} ${employeCuisine.employee.prenom || ''}** sera absent(e) le **${new Date(params.date).toLocaleDateString('fr-FR')}**\n\n🍳 **Impact sur la cuisine :**\n• Vérification automatique du planning cuisine\n• Recherche de remplaçants par compétences\n• Réorganisation des postes si nécessaire\n\n💡 **Prochaines étapes :**\n• Demandez "Qui peut remplacer ${employeCuisine.employee.nom} ?"\n• Dites "Optimiser le planning" pour réajustement`,
        data: { absence: result.data, employe: employeCuisine.employee },
        formatType: 'absence_added_cuisine',
        actions: ['refresh_absences', 'check_cuisine_replacements']
      };

    } catch (error) {
      console.error('Erreur handleAjouterAbsence cuisine:', error);
      return {
        success: false,
        message: '❌ **Erreur technique**\n\nImpossible d\'ajouter l\'absence cuisine. Contactez le support technique.',
        data: null
      };
    }
  }

  /**
   * Gérer la recherche de remplaçants
   */
  async handleChercherRemplacant(params) {
    try {
      console.log('🤖 Recherche remplaçant pour:', params.employeNom);
      
      // Chercher l'employé absent dans la vraie base de données
      const { data: employees } = await supabaseAPI.getEmployees();
      const employeAbsent = employees?.find(e => 
        e.nom?.toLowerCase().includes(params.employeNom.toLowerCase()) ||
        e.prenom?.toLowerCase().includes(params.employeNom.toLowerCase())
      );

      if (!employeAbsent) {
        return {
          success: false,
          message: `❌ **Employé "${params.employeNom}" non trouvé**\n\nVérifiez l'orthographe.`,
          data: null
        };
      }

      // Récupérer les employés disponibles (ceux qui ne sont pas en absence)
      const { data: absences } = await supabaseAPI.getAbsences(params.date, params.date);
      const employesAbsents = absences?.map(a => a.employee_id) || [];
      
      const employesDisponibles = employees?.filter(emp => 
        emp.id !== employeAbsent.id && 
        !employesAbsents.includes(emp.id)
      ) || [];

      // Scorer les remplaçants basé sur le profil
      const suggestions = employesDisponibles.map(emp => ({
        id: emp.id,
        nom: emp.nom,
        prenom: emp.prenom || '',
        profil: emp.profil || 'Non défini',
        langues: emp.langues || [],
        permis: emp.permis,
        score: this.calculerScoreCompatibilite(employeAbsent, emp)
      })).sort((a, b) => b.score - a.score).slice(0, 5);

      if (suggestions.length === 0) {
        return {
          success: false,
          message: `❌ **Aucun remplaçant disponible**\n\nTous les employés sont déjà occupés le ${new Date(params.date).toLocaleDateString('fr-FR')}.`,
          data: null
        };
      }

      return {
        success: true,
        message: `🔍 **Remplaçants trouvés pour ${employeAbsent.nom}**\n\n📋 **${suggestions.length} suggestion(s) :**\n${suggestions.map((s, i) => `${i+1}. **${s.nom} ${s.prenom}** (${s.profil}) - Score: ${s.score}%`).join('\n')}\n\n💡 Les scores sont basés sur le profil et les compétences similaires.`,
        data: { suggestions, employeAbsent },
        formatType: 'replacement_suggestions'
      };

    } catch (error) {
      console.error('Erreur handleChercherRemplacant:', error);
      return {
        success: false,
        message: '❌ **Erreur technique lors de la recherche**\n\nContactez le support technique.',
        data: null
      };
    }
  }

  /**
   * Calculer un score de compatibilité entre deux employés
   */
  calculerScoreCompatibilite(employeAbsent, candidat) {
    let score = 50; // Score de base
    
    // Même profil = +30 points
    if (employeAbsent.profil === candidat.profil) {
      score += 30;
    }
    
    // Langues communes = +10 points par langue
    const languesAbsent = employeAbsent.langues || [];
    const languesCandidat = candidat.langues || [];
    const languesCommunes = languesAbsent.filter(l => languesCandidat.includes(l));
    score += languesCommunes.length * 10;
    
    // Même statut permis = +10 points
    if (employeAbsent.permis === candidat.permis) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Gérer la modification de compétence
   */
  async handleModifierCompetence(params) {
    try {
      console.log('🤖 Modification compétence cuisine:', params);
      
      // Chercher l'employé dans la base cuisine
      const { data: employeesCuisine } = await supabaseCuisine.getEmployeesCuisine();
      const employeCuisine = employeesCuisine?.find(ec => 
        ec.employee.nom?.toLowerCase().includes(params.employeNom.toLowerCase()) ||
        ec.employee.prenom?.toLowerCase().includes(params.employeNom.toLowerCase())
      );

      if (!employeCuisine) {
        return {
          success: false,
          message: `❌ **Employé "${params.employeNom}" non trouvé en cuisine**\n\nVérifiez l'orthographe ou ajoutez d'abord cet employé au module cuisine.`,
          data: null
        };
      }

      // Chercher le poste correspondant à la compétence
      const { data: postes } = await supabaseCuisine.getPostes();
      const poste = postes?.find(p => 
        p.nom.toLowerCase().includes(params.competence.toLowerCase()) ||
        params.competence.toLowerCase().includes(p.nom.toLowerCase())
      );

      if (!poste) {
        const postesDisponibles = postes?.map(p => p.nom).join(', ') || 'Aucun';
        return {
          success: false,
          message: `❌ **Poste "${params.competence}" non reconnu**\n\n🍳 **Postes cuisine disponibles :**\n${postesDisponibles}\n\n💡 Essayez : "Marie maîtrise la cuisine chaude"`,
          data: null
        };
      }

      // Créer ou mettre à jour la compétence cuisine
      const competenceData = {
        employee_id: employeCuisine.employee.id,
        poste_id: poste.id,
        niveau: 'Formé',
        date_validation: new Date().toISOString().split('T')[0],
        formateur_id: 1 // ID formateur par défaut
      };

      // Vérifier si la compétence existe déjà
      const { data: competencesExistantes } = await supabaseCuisine.getCompetencesCuisineSimple();
      const competenceExistante = competencesExistantes?.find(c => 
        c.employee_id === employeCuisine.employee.id && c.poste_id === poste.id
      );

      let result;
      if (competenceExistante) {
        // Mettre à jour
        result = await supabaseCuisine.updateCompetenceCuisine(competenceExistante.id, competenceData);
      } else {
        // Créer nouvelle compétence
        result = await supabaseCuisine.createCompetenceCuisine(competenceData);
      }

      if (result.error) {
        console.warn('⚠️ Erreur sauvegarde compétence cuisine:', result.error);
        return {
          success: false,
          message: `❌ **Erreur technique**\n\nImpossible de sauvegarder la compétence.\n\n🔧 Détails : ${result.error.message}`,
          data: null
        };
      }

      return {
        success: true,
        message: `⚡ **Compétence cuisine mise à jour !**\n\n👨‍🍳 **${employeCuisine.employee.nom} ${employeCuisine.employee.prenom || ''}** maîtrise maintenant **${poste.nom}**\n\n🎯 **Détails :**\n• Niveau : ${competenceData.niveau}\n• Date de validation : ${new Date().toLocaleDateString('fr-FR')}\n• ${competenceExistante ? 'Compétence mise à jour' : 'Nouvelle compétence ajoutée'}\n\n💡 **Impact :**\n• Disponible pour ce poste dans le planning\n• Pris en compte dans l'optimisation IA\n• Visible dans l'analyse d'équipe`,
        data: { 
          employe: employeCuisine.employee, 
          competence: poste.nom, 
          niveau: competenceData.niveau,
          isUpdate: !!competenceExistante
        },
        formatType: 'competence_updated_cuisine',
        actions: ['refresh_competences', 'update_planning_options']
      };

    } catch (error) {
      console.error('Erreur handleModifierCompetence cuisine:', error);
      return {
        success: false,
        message: '❌ **Erreur technique**\n\nImpossible de modifier la compétence cuisine. Contactez le support technique.',
        data: null
      };
    }
  }

  /**
   * Gérer la génération de planning
   */
  async handleGenererPlanning(params) {
    try {
      console.log('🤖 Génération planning pour:', params.semaine);
      
      // Récupérer le planning existant
      const { data: plannings } = await supabaseAPI.getPlanning(
        params.semaine,
        this.addDays(params.semaine, 6)
      );

      const nombreCreneaux = plannings?.length || 0;

      return {
        success: true,
        message: `🎯 **Planning analysé !**\n\n📅 **Semaine du ${new Date(params.semaine).toLocaleDateString('fr-FR')}**\n\n📊 **${nombreCreneaux} créneaux** trouvés dans le planning actuel\n\n💡 **Optimisation automatique :** La fonctionnalité de génération automatique sera bientôt disponible.\n\n▶️ Consultez le module Planning pour voir les détails.`,
        data: { plannings: plannings || [], semaine: params.semaine },
        formatType: 'planning_grid'
      };

    } catch (error) {
      console.error('Erreur handleGenererPlanning:', error);
      return {
        success: false,
        message: '❌ **Erreur technique lors de la génération**\n\nContactez le support technique.',
        data: null
      };
    }
  }

  /**
   * Ajouter des jours à une date
   */
  addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Analyser les compétences de l'équipe cuisine
   */
  async handleAnalyserEquipe(params) {
    try {
      console.log('🤖 Analyse équipe cuisine');
      
      // Récupérer toutes les données cuisine
      const [employeesRes, postesRes, competencesRes] = await Promise.all([
        supabaseCuisine.getEmployeesCuisineWithCompetences(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple()
      ]);
      
      if (employeesRes.error || postesRes.error || competencesRes.error) {
        // Fallback vers l'API générale
        console.warn('⚠️ Erreur API cuisine, fallback API générale');
        const { data: employees, error: empError } = await supabaseAPI.getEmployees();
        
        if (empError) {
          return {
            success: false,
            message: `❌ **Erreur lors de l'analyse**\n\n${empError.message || 'Impossible de récupérer les données d\'équipe'}`,
            data: null
          };
        }

        // Analyse basique avec données générales
        const totalEmployes = employees?.length || 0;
        const profils = {};
        const langues = {};
        
        employees?.forEach(emp => {
          const profil = emp.profil || 'Non défini';
          profils[profil] = (profils[profil] || 0) + 1;
          
          if (emp.langues && Array.isArray(emp.langues)) {
            emp.langues.forEach(langue => {
              langues[langue] = (langues[langue] || 0) + 1;
            });
          }
        });

        const avecPermis = employees?.filter(emp => emp.permis === true).length || 0;
        const sansPermis = totalEmployes - avecPermis;

        return {
          success: true,
          message: `📊 **Analyse équipe (données générales)**\n\n👥 **${totalEmployes} employés** au total\n\n🏷️ **Profils :**\n${Object.entries(profils).map(([profil, count]) => `• ${profil}: ${count} personne(s)`).join('\n')}\n\n🌍 **Langues parlées :**\n${Object.entries(langues).map(([langue, count]) => `• ${langue}: ${count} personne(s)`).join('\n')}\n\n🚗 **Permis de conduire :**\n• Avec permis: ${avecPermis} (${totalEmployes > 0 ? Math.round((avecPermis / totalEmployes) * 100) : 0}%)\n• Sans permis: ${sansPermis}\n\n⚠️ **Note :** Données cuisine limitées, utilisez le module Cuisine pour plus de détails.`,
          data: { totalEmployes, profils, langues, permis: { avec: avecPermis, sans: sansPermis } },
          formatType: 'team_analysis_basic'
        };
      }

      const employeesCuisine = employeesRes.data || [];
      const postes = postesRes.data || [];
      const competences = competencesRes.data || [];

      // Analyser les données cuisine
      const totalEmployesCuisine = employeesCuisine.length;
      const profils = {};
      const langues = {};
      const services = {};
      const competencesParPoste = {};

      // Initialiser les compteurs par poste
      postes.forEach(poste => {
        competencesParPoste[poste.nom] = {
          competents: 0,
          employes: []
        };
      });

      // Analyser chaque employé cuisine
      employeesCuisine.forEach(empCuisine => {
        const emp = empCuisine.employee;
        
        // Analyser les profils
        const profil = emp.profil || 'Non défini';
        profils[profil] = (profils[profil] || 0) + 1;
        
        // Analyser les langues
        if (emp.langues && Array.isArray(emp.langues)) {
          emp.langues.forEach(langue => {
            langues[langue] = (langues[langue] || 0) + 1;
          });
        }

        // Analyser les services
        const service = empCuisine.service || 'Non défini';
        services[service] = (services[service] || 0) + 1;
      });

      // Analyser les compétences par poste
      competences.forEach(comp => {
        const poste = postes.find(p => p.id === comp.poste_id);
        const employeCuisine = employeesCuisine.find(ec => ec.employee.id === comp.employee_id);
        
        if (poste && employeCuisine) {
          competencesParPoste[poste.nom].competents++;
          competencesParPoste[poste.nom].employes.push({
            nom: employeCuisine.employee.nom,
            prenom: employeCuisine.employee.prenom || '',
            niveau: comp.niveau
          });
        }
      });

      // Statistiques sur les permis
      const avecPermis = employeesCuisine.filter(ec => ec.employee.permis === true).length;
      const sansPermis = totalEmployesCuisine - avecPermis;

      // Calculer la couverture par poste
      const couverturePostes = Object.entries(competencesParPoste)
        .map(([poste, data]) => ({
          poste,
          competents: data.competents,
          taux: totalEmployesCuisine > 0 ? Math.round((data.competents / totalEmployesCuisine) * 100) : 0,
          employes: data.employes
        }))
        .sort((a, b) => b.competents - a.competents);

      const analysisData = {
        totalEmployesCuisine,
        repartitionProfils: profils,
        repartitionLangues: langues,
        repartitionServices: services,
        competencesParPoste,
        couverturePostes,
        permis: {
          avec: avecPermis,
          sans: sansPermis,
          pourcentage: totalEmployesCuisine > 0 ? Math.round((avecPermis / totalEmployesCuisine) * 100) : 0
        }
      };

      // Construire le message de réponse
      let message = `📊 **Analyse complète de l'équipe cuisine**\n\n👨‍🍳 **${totalEmployesCuisine} employés cuisine** au total\n\n`;

      // Profils
      message += `🏷️ **Profils :**\n${Object.entries(profils).map(([profil, count]) => `• ${profil}: ${count} personne(s)`).join('\n')}\n\n`;

      // Services
      message += `🍳 **Services :**\n${Object.entries(services).map(([service, count]) => `• ${service}: ${count} personne(s)`).join('\n')}\n\n`;

      // Compétences par poste (top 3)
      message += `⭐ **Compétences par poste :**\n`;
      couverturePostes.slice(0, 3).forEach(cp => {
        message += `• **${cp.poste}**: ${cp.competents} formé(s) (${cp.taux}%)\n`;
      });

      // Langues
      if (Object.keys(langues).length > 0) {
        message += `\n🌍 **Langues parlées :**\n${Object.entries(langues).map(([langue, count]) => `• ${langue}: ${count} personne(s)`).join('\n')}\n`;
      }

      // Permis
      message += `\n🚗 **Permis de conduire :**\n• Avec permis: ${avecPermis} (${analysisData.permis.pourcentage}%)\n• Sans permis: ${sansPermis}`;

      // Recommandations
      message += `\n\n💡 **Recommandations :**`;
      
      const postesManquants = couverturePostes.filter(cp => cp.competents === 0);
      if (postesManquants.length > 0) {
        message += `\n🔴 Former du personnel sur: ${postesManquants.map(p => p.poste).join(', ')}`;
      }
      
      const postesFaibles = couverturePostes.filter(cp => cp.competents > 0 && cp.taux < 30);
      if (postesFaibles.length > 0) {
        message += `\n🟡 Renforcer les compétences: ${postesFaibles.map(p => p.poste).join(', ')}`;
      }

      return {
        success: true,
        message,
        data: analysisData,
        formatType: 'team_analysis_cuisine'
      };

    } catch (error) {
      console.error('Erreur handleAnalyserEquipe cuisine:', error);
      return {
        success: false,
        message: '❌ **Erreur technique lors de l\'analyse cuisine**\n\nContactez le support technique.',
        data: null
      };
    }
  }

  /**
   * Gérer "qui travaille"
   */
  async handleQuiTravaille(params) {
    try {
      const { data: plannings } = await supabaseAPI.getPlanningsIA(
        this.getWeekStart(params.date)
      );

      const jour = this.getDayNumber(params.date);
      const planningsJour = plannings?.filter(p => p.jour === jour) || [];

      if (planningsJour.length === 0) {
        return {
          success: false,
          message: `Aucun planning trouvé pour cette date.`,
          data: null
        };
      }

      return {
        success: true,
        message: `👥 Équipe de service le ${params.date}:`,
        data: planningsJour,
        formatType: 'daily_schedule'
      };

    } catch (error) {
      return {
        success: false,
        message: `Erreur technique: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Gérer "qui est disponible"
   */
  async handleQuiDisponible(params) {
    try {
      const { data, error } = await supabaseAPI.getEmployesDisponibles(params.date);

      if (error) {
        return {
          success: false,
          message: `Erreur lors de la recherche: ${supabaseAPI.formatError(error)}`,
          data: null
        };
      }

      return {
        success: true,
        message: `✅ Employés disponibles le ${params.date}:`,
        data: data,
        formatType: 'available_employees'
      };

    } catch (error) {
      return {
        success: false,
        message: `Erreur technique: ${error.message}`,
        data: null
      };
    }
  }

  // ==================== UTILITAIRES ====================

  /**
   * Enregistrer une action pour l'apprentissage
   */
  async logAction(actionData) {
    try {
      // Pour l'instant, on log juste dans la console
      // En attendant d'avoir la table ia_actions dans la base de données
      console.log('📝 Action IA:', actionData);
      this.lastActionId = Date.now(); // Simuler un ID
    } catch (error) {
      console.error('Erreur log action:', error);
    }
  }

  /**
   * Soumettre un feedback sur une action
   */
  async submitFeedback(rating, correction = null) {
    try {
      if (this.lastActionId) {
        console.log('👍 Feedback IA:', { 
          actionId: this.lastActionId, 
          rating, 
          correction 
        });
      }
    } catch (error) {
      console.error('Erreur feedback:', error);
    }
  }

  /**
   * Parser une date en format français
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Formats supportés: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY
    const normalizedDate = dateStr.replace(/[-]/g, '/');
    const parts = normalizedDate.split('/');
    
    if (parts.length === 3) {
      let [day, month, year] = parts;
      
      // Gérer les années courtes
      if (year.length === 2) {
        year = '20' + year;
      }
      
      const date = new Date(year, month - 1, day);
      return date.toISOString().split('T')[0];
    }
    
    return null;
  }

  /**
   * Obtenir le lundi de la semaine prochaine
   */
  getNextMonday() {
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7));
    return nextMonday.toISOString().split('T')[0];
  }

  /**
   * Obtenir le lundi de la semaine d'une date
   */
  getWeekStart(dateStr) {
    const date = new Date(dateStr);
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    return monday.toISOString().split('T')[0];
  }

  /**
   * Obtenir le numéro du jour (1=Lundi, 7=Dimanche)
   */
  getDayNumber(dateStr) {
    const date = new Date(dateStr);
    return date.getDay() === 0 ? 7 : date.getDay();
  }

  /**
   * Extraire la raison d'une absence du texte
   */
  extractReason(text) {
    if (text.toLowerCase().includes('maladie')) return 'Maladie';
    if (text.toLowerCase().includes('congé')) return 'Congés';
    if (text.toLowerCase().includes('formation')) return 'Formation';
    if (text.toLowerCase().includes('personnel')) return 'Personnel';
    return 'Non spécifié';
  }

  /**
   * Trouver un employé par nom (à adapter selon votre système)
   */
  async findEmployeByName(nom) {
    // Pour la démonstration, on simule avec des IDs
    // Dans la vraie application, connectez-vous à votre table employés
    const employesSimules = {
      'marie': 1,
      'paul': 2,
      'julie': 3,
      'jean': 4,
      'sarah': 5
    };
    
    return employesSimules[nom.toLowerCase()] || null;
  }
}

export default IAActionEngine; 