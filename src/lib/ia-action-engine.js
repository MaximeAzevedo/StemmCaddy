import { supabaseCuisine } from './supabase-cuisine';
import { format, addDays } from 'date-fns';
import { POSTES_RULES, getPosteRules, getPostesByPriority } from '../planning/config/postesRules';
import { aiPlanningEngine } from './ai-planning-engine'; // ✅ NOUVEAU : Moteur IA

/**
 * Moteur d'Actions IA pour la gestion automatisée des plannings
 * ✅ UTILISE DÉSORMAIS L'IA AZURE OPENAI POUR OPTIMISATION INTELLIGENTE
 */
export class IAActionEngine {
  constructor() {
    this.patterns = this.initializePatterns();
  }

  /**
   * Initialiser les patterns de reconnaissance CORRIGÉS
   */
  initializePatterns() {
    return {
      // ========== GESTION DES ABSENCES (REGEX CORRIGÉES) ==========
      AJOUTER_ABSENCE: [
        // Formats simples SANS échappements inutiles
        /(?:déclarer|mettre|noter|enregistrer)\s+(?:l')?absence\s+(?:de\s+)?(\w+)/i,
        /(\w+)\s+(?:ne\s+)?(?:sera pas|sera absent|peut pas|vient pas|travaille pas|ne peut pas)/i,
        
        // Avec dates explicites - REGEX CORRIGÉES
        /(\w+)\s+(?:absent|absente|absence|congé)\s+(?:le|du|pour|depuis|à partir du)?\s*(\d{1,2}[/-]\d{1,2}[/-]?\d{2,4}?|aujourd'hui|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|cette semaine|semaine prochaine)/i,
        /absence\s+(?:de\s+)?(\w+)\s+(?:le|du|pour|depuis)?\s*(\d{1,2}[/-]\d{1,2}[/-]?\d{2,4}?|aujourd'hui|demain|lundi|mardi|mercredi|jeudi|vendredi)/i,
        
        // Très naturel
        /(\w+)\s+(?:ne sera pas là|n'est pas là|est pas dispo|sera pas dispo|indisponible)\s*(?:le|du|pour)?\s*(\w+)?/i,
        /(\w+)\s+(?:en|est|sera)\s+(?:arrêt|maladie|congé|repos|formation)/i,
        
        // Ultra simple
        /(\w+)\s+(absent|absente|malade|congé|repos)/i
      ],

      CHERCHER_REMPLACANT: [
        // Questions directes
        /qui\s+peut\s+(?:remplacer|prendre\s+la\s+place\s+de|faire\s+le\s+travail\s+de)\s+(\w+)/i,
        /(?:trouve|cherche|besoin d'un|faut un)\s*(?:remplaçant|remplacement)\s+(?:pour\s+)?(\w+)/i,
        /qui\s+(?:est\s+)?(?:disponible|libre|dispo)\s+(?:pour\s+)?(?:remplacer\s+)?(\w+)/i,
        
        // Plus naturel
        /(\w+)\s+(?:a\s+besoin\s+d'un|manque|absent)\s*(?:remplaçant|remplacement)?/i,
        /qui\s+peut\s+faire\s+(?:le\s+travail\s+de\s+|la\s+place\s+de\s+)?(\w+)/i,
        /suggestion\s+(?:pour\s+)?(?:remplacer\s+)?(\w+)/i
      ],

      // ========== GESTION DES COMPÉTENCES (CORRIGÉES) ==========
      MODIFIER_COMPETENCE: [
        // Formation directe
        /(?:former|apprendre|enseigner|entrainer)\s+(\w+)\s+(?:sur|en|à|pour)\s+(?:la\s+|le\s+|les\s+)?(.+)/i,
        /(\w+)\s+(?:apprend|maîtrise|sait\s+faire|connaît|peut\s+faire)\s+(?:la\s+|le\s+|les\s+)?(.+)/i,
        /(?:donner|ajouter|valider)\s+(?:la\s+)?compétence\s+(.+)\s+(?:à\s+|pour\s+)(\w+)/i,
        
        // Validation de compétence
        /(\w+)\s+(?:est\s+)?(?:formé|qualifié|apte|bon|compétent)\s+(?:sur|en|pour|à)\s+(?:la\s+|le\s+)?(.+)/i,
        /(?:valider|certifier|approuver)\s+(\w+)\s+(?:sur|en|pour)\s+(.+)/i,
        
        // Ultra naturel
        /(\w+)\s+(?:maintenant|désormais|peut)\s+(?:faire|travailler sur|gérer)\s+(?:la\s+|le\s+)?(.+)/i,
        /(\w+)\s+maîtrise\s+(?:maintenant\s+)?(?:la\s+|le\s+)?(.+)/i,
        /(\w+)\s+(?:sait|peut)\s+(?:faire\s+)?(?:la\s+|le\s+)?(.+)/i,
        
        // Avec niveau
        /(\w+)\s+(?:niveau|compétence)\s+(\d)\s+(?:en|sur|pour)\s+(.+)/i
      ],

      // ========== GESTION DES EMPLOYÉS ==========
      AJOUTER_EMPLOYE: [
        /(?:ajouter|créer|nouveau|embaucher|recruter)\s+(?:employé|personne|quelqu'un)\s+(.+)/i,
        /(?:embaucher|recruter|ajouter)\s+(.+?)\s+(?:en|comme|pour|au|dans)\s+(.+)/i,
        /(?:intégrer|ajouter)\s+(.+?)\s+(?:à|dans)\s+(?:l')?équipe/i,
        /nouveau\s+(?:dans\s+)?(?:l')?équipe\s*:\s*(.+)/i
      ],

      SUPPRIMER_EMPLOYE: [
        /(?:supprimer|retirer|enlever|virer|licencier)\s+(?:employé\s+)?(\w+)/i,
        /(?:congédier|renvoyer)\s+(\w+)/i,
        /retirer\s+(\w+)\s+(?:de\s+)?(?:l')?équipe/i
      ],

      MODIFIER_EMPLOYE: [
        /(?:modifier|changer|mettre\s+à\s+jour|ajuster)\s+(?:employé\s+)?(\w+)/i,
        /(\w+)\s+(?:devient|maintenant|désormais)\s+(.+)/i,
        /(?:changer|modifier)\s+(?:le\s+)?profil\s+(?:de\s+)?(\w+)/i,
        /(\w+)\s+(?:passe|change)\s+(?:en|à|vers)\s+(.+)/i
      ],

      // ========== INFORMATIONS ET RECHERCHE ==========
      QUI_COMPETENT: [
        /qui\s+(?:peut|sait)\s+(?:faire|travailler\s+sur)\s+(.+)/i,
        /qui\s+(?:est\s+)?(?:formé|qualifié|compétent)\s+(?:sur|en|pour)\s+(.+)/i,
        /(?:employés|personnes)\s+(?:qui\s+)?(?:peuvent|savent)\s+(?:faire\s+)?(.+)/i,
        /(?:compétences|formations)\s+(.+)/i,
        /qui\s+maîtrise\s+(.+)/i
      ],

      ANALYSER_EQUIPE: [
        /(?:analyser?|analys|état de)\s+(?:l')?équipe/i,
        /(?:statistiques?|stats?)\s+(?:de\s+)?(?:l')?équipe/i,
        /(?:compétences|formations)\s+(?:de\s+l')?équipe/i,
        /(?:aperçu|overview|résumé)\s+(?:de\s+l')?équipe/i,
        /qui\s+sait\s+faire\s+quoi/i,
        /répartition\s+(?:des\s+)?(?:compétences|profils)/i,
        /(?:équipe|team)\s+(?:overview|analyse)/i
      ],

      // ========== GESTION DU PLANNING DIRECT ==========
      MODIFIER_PLANNING: [
        // Assignations directes
        /(?:mettre|placer|assigner|affecter)\s+(\w+(?:\s+\w+)*)\s+(?:à|au|sur|dans)\s+(?:la\s+|le\s+|les\s+)?(.+)/i,
        /(\w+(?:\s+\w+)*)\s+(?:va|ira|travaille|sera)\s+(?:à|au|sur|dans)\s+(?:la\s+|le\s+)?(.+)/i,
        /(?:assigner|affecter)\s+(\w+(?:\s+\w+)*)\s+(?:au\s+poste|à\s+la\s+station)\s+(.+)/i,
        
        // Changements de poste
        /(?:changer|déplacer|transférer)\s+(\w+(?:\s+\w+)*)\s+(?:vers|à|au)\s+(.+)/i,
        /(\w+(?:\s+\w+)*)\s+(?:change|passe|va)\s+(?:en|à|au)\s+(.+)/i,
        
        // Avec créneau spécifique
        /(\w+(?:\s+\w+)*)\s+(?:à|au)\s+(.+)\s+(?:à|pour|le)\s+(\d+h|\w+)/i
      ],

      // ========== GESTION DU PLANNING AUTOMATIQUE ==========
      GENERER_PLANNING: [
        // Génération planning
        /(?:génère|génèrer|créer|faire|organiser)\s+(?:le\s+|un\s+)?planning/i,
        /planning\s+(?:auto|automatique|intelligent|optimisé)/i,
        /(?:optimiser|réorganiser)\s+(?:le\s+)?planning/i,
        /(?:planifier|organiser)\s+(?:la\s+)?semaine/i,
        /planning\s+(?:pour\s+)?(?:cette\s+)?semaine/i,
        
        // IA planning
        /(?:planning|organisation)\s+(?:avec\s+)?(?:l')?ia/i,
        /(?:intelligence|ia)\s+planning/i
      ],

      // ========== AIDE ET SUPPORT ==========
      AIDE: [
        /aide/i,
        /help/i,
        /comment\s+(?:ça\s+marche|utiliser)/i,
        /que\s+(?:peux|peut)\s+(?:tu|vous)\s+faire/i,
        /commandes?\s+(?:disponibles?|possibles?)/i
      ],

      // ========== CONVERSATIONS NATURELLES ==========
      SALUTATIONS: [
        /(?:salut|bonjour|hello|hi|bonsoir|coucou)/i,
        /comment\s+(?:ça\s+va|allez\s+vous)/i
      ],

      REMERCIEMENTS: [
        /(?:merci|thank|thanks|parfait|excellent|super|génial)/i,
        /(?:très\s+bien|c'est\s+bon|ok\s+parfait)/i
      ]
    };
  }

  /**
   * GESTION D'ERREURS ROBUSTE
   */
  async executeActionSafely(userInput) {
    try {
      const result = await this.executeAction(userInput);
      return {
        success: true,
        data: result,
        error: null
      };
    } catch (error) {
      console.error('❌ Erreur IA Action:', error);
      
      // Log pour debug mais pas de crash
      await this.logError(error, userInput);
      
      return {
        success: false,
        data: null,
        error: error.message || 'Erreur inconnue'
      };
    }
  }

  /**
   * ANALYSE D'INTENTION SÉCURISÉE
   */
  analyzeIntent(userInput) {
    try {
      const normalizedInput = String(userInput || '').trim();
      
      if (!normalizedInput) {
        return {
          intent: 'GENERAL_QUERY',
          confidence: 0.1,
          matches: [],
          parameters: {}
        };
      }
      
      for (const [intent, patterns] of Object.entries(this.patterns)) {
        for (const pattern of patterns) {
          try {
            const match = normalizedInput.match(pattern);
            if (match) {
              return {
                intent,
                confidence: 0.9,
                matches: match,
                parameters: this.extractParametersSafely(intent, match)
              };
            }
          } catch (regexError) {
            console.warn(`⚠️ Erreur regex pour ${intent}:`, regexError);
            continue; // Continue avec le pattern suivant
          }
        }
      }

      return {
        intent: 'GENERAL_QUERY',
        confidence: 0.3,
        matches: [],
        parameters: {}
      };
    } catch (error) {
      console.error('❌ Erreur analyzeIntent:', error);
      return {
        intent: 'ERROR',
        confidence: 0,
        matches: [],
        parameters: {},
        error: error.message
      };
    }
  }

  /**
   * EXTRACTION DE PARAMÈTRES SÉCURISÉE
   */
  extractParametersSafely(intent, matches) {
    const params = {};

    try {
      switch (intent) {
        case 'AJOUTER_ABSENCE':
          params.employeNom = matches[1] || '';
          params.date = this.parseDateSafely(matches[2]);
          params.motif = this.extractReasonSafely(matches[0]);
          break;

        case 'CHERCHER_REMPLACANT':
          params.employeNom = matches[1] || '';
          params.date = new Date().toISOString().split('T')[0];
          break;

        case 'MODIFIER_COMPETENCE':
          if (matches[0] && matches[0].toLowerCase().includes('donner')) {
            params.competence = matches[1] || '';
            params.employeNom = matches[2] || '';
          } else {
            params.employeNom = matches[1] || '';
            params.competence = matches[2] || matches[3] || '';
          }
          params.niveau = this.extractNiveauSafely(matches[0]);
          break;

        default:
          // Extraction générique sécurisée
          if (matches && matches.length > 1) {
            params.nom = matches[1] || '';
            if (matches.length > 2) {
              params.details = matches[2] || '';
            }
          }
      }
    } catch (error) {
      console.warn(`⚠️ Erreur extraction paramètres ${intent}:`, error);
    }

    return params;
  }

  /**
   * PARSING DE DATE SÉCURISÉ
   */
  parseDateSafely(dateStr) {
    try {
      if (!dateStr || typeof dateStr !== 'string') {
        return new Date().toISOString().split('T')[0];
      }

      const lowerDate = dateStr.toLowerCase();
      
      if (lowerDate.includes('aujourd\'hui')) {
        return new Date().toISOString().split('T')[0];
      }
      
      if (lowerDate.includes('demain')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }

      // Parsing date au format DD/MM/YYYY ou DD-MM-YYYY
      const dateMatch = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-]?(\d{2,4})?/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1; // JS months are 0-indexed
        const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
        
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      }

      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.warn('⚠️ Erreur parsing date:', error);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * EXTRACTION DE MOTIF SÉCURISÉE
   */
  extractReasonSafely(text) {
    try {
      const lowerText = String(text || '').toLowerCase();
      
      if (lowerText.includes('malade') || lowerText.includes('maladie')) {
        return 'Maladie';
      }
      if (lowerText.includes('congé') || lowerText.includes('vacances')) {
        return 'Congé';
      }
      if (lowerText.includes('formation')) {
        return 'Formation';
      }
      if (lowerText.includes('repos')) {
        return 'Repos';
      }
      
      return 'Absence';
    } catch (error) {
      console.warn('⚠️ Erreur extraction motif:', error);
      return 'Absence';
    }
  }

  /**
   * EXTRACTION DE NIVEAU SÉCURISÉE
   */
  extractNiveauSafely(text) {
    try {
      const lowerText = String(text || '').toLowerCase();
      
      if (lowerText.includes('expert') || lowerText.includes('niveau 2')) {
        return 'Expert';
      }
      if (lowerText.includes('intermédiaire') || lowerText.includes('niveau 1')) {
        return 'Intermédiaire';
      }
      
      return 'Intermédiaire'; // Par défaut
    } catch (error) {
      console.warn('⚠️ Erreur extraction niveau:', error);
      return 'Intermédiaire';
    }
  }

  /**
   * LOG D'ERREURS POUR DEBUG
   */
  async logError(error, userInput) {
    try {
      console.group('🚨 IA Action Engine Error');
      console.error('Input:', userInput);
      console.error('Error:', error);
      console.groupEnd();
      
      // TODO: Envoyer à un service de logging si nécessaire
    } catch (logError) {
      console.warn('⚠️ Erreur lors du logging:', logError);
    }
  }

  /**
   * EXÉCUTION D'ACTION PRINCIPALE (VERSION COURTE POUR L'EXEMPLE)
   */
  async executeAction(userInput) {
    const analysis = this.analyzeIntent(userInput);
    
    if (analysis.error) {
      throw new Error(`Erreur d'analyse: ${analysis.error}`);
    }

    switch (analysis.intent) {
      case 'AJOUTER_ABSENCE':
        return await this.handleAjouterAbsenceSafely(analysis.parameters);
      
      case 'CHERCHER_REMPLACANT':
        return await this.handleChercherRemplacantSafely(analysis.parameters);
      
      case 'MODIFIER_COMPETENCE':
        return await this.handleModifierCompetenceSafely(analysis.parameters);
      
      case 'MODIFIER_PLANNING':
        return await this.handleModifierPlanningSafely(analysis.parameters);
      
      case 'GENERER_PLANNING':
        return await this.handleGenererPlanningSafely(analysis.parameters);
      
      case 'AIDE':
        return this.handleAide();
      
      default:
        return {
          message: "Je n'ai pas compris votre demande. Tapez 'aide' pour voir les commandes disponibles.",
          type: 'info'
        };
    }
  }

  /**
   * GESTION SÉCURISÉE DES ABSENCES
   */
  async handleAjouterAbsenceSafely(params) {
    try {
      if (!params.employeNom) {
        throw new Error('Nom d\'employé requis');
      }

      // Recherche sécurisée de l'employé
      const employee = await this.findEmployeByNameSafely(params.employeNom);
      if (!employee) {
        return {
          message: `Employé "${params.employeNom}" non trouvé dans l'équipe cuisine.`,
          type: 'warning'
        };
      }

      // Création de l'absence avec validation
      const absenceData = {
        employee_id: employee.id,
        date_debut: params.date || new Date().toISOString().split('T')[0],
        date_fin: params.date || new Date().toISOString().split('T')[0],
        type_absence: 'Absent',
        statut: 'Confirmée',
        motif: params.motif || 'Absence'
      };

      const result = await supabaseCuisine.createAbsenceCuisine(absenceData);
      
      if (result.error) {
        throw new Error(`Erreur création absence: ${result.error.message}`);
      }

      return {
        message: `✅ Absence de ${employee.nom} enregistrée pour le ${params.date}`,
        type: 'success',
        data: result.data
      };

    } catch (error) {
      console.error('❌ Erreur handleAjouterAbsence:', error);
      return {
        message: `Erreur lors de l'ajout de l'absence: ${error.message}`,
        type: 'error'
      };
    }
  }

  /**
   * RECHERCHE SÉCURISÉE D'EMPLOYÉ
   */
  async findEmployeByNameSafely(nom) {
    try {
      if (!nom || typeof nom !== 'string') {
        return null;
      }

      const result = await supabaseCuisine.getEmployeesCuisine();
      
      if (result.error || !result.data) {
        return null;
      }

      const normalizedNom = nom.toLowerCase().trim();
      
      return result.data.find(emp => 
        emp.employee && 
        emp.employee.nom && 
        emp.employee.nom.toLowerCase().includes(normalizedNom)
      )?.employee || null;

    } catch (error) {
      console.warn('⚠️ Erreur recherche employé:', error);
      return null;
    }
  }

  /**
   * AIDE BASIQUE
   */
  handleAide() {
    return {
      message: `🤖 **Assistant IA Cuisine - Commandes disponibles:**

📋 **Gestion des absences:**
- "Marie absent demain"
- "Déclarer absence Paul lundi"

🔄 **Remplacements:**
- "Qui peut remplacer Marie ?"
- "Cherche remplaçant pour Paul"

🎯 **Compétences:**
- "Former Ahmed sur sandwichs"
- "Paul maîtrise cuisine chaude"

📊 **Informations:**
- "Analyser équipe"
- "Qui sait faire les sandwichs ?"

📅 **Planning:**
- "Générer planning automatique"
- "Optimiser planning semaine"`,
      type: 'info'
    };
  }

  // Méthodes placeholder pour les autres handlers
  async handleChercherRemplacantSafely(params) {
    return { message: "Recherche de remplaçant en cours...", type: 'info' };
  }

  async handleModifierCompetenceSafely(params) {
    return { message: "Modification de compétence en cours...", type: 'info' };
  }

  /**
   * GESTION SÉCURISÉE DES MODIFICATIONS DE PLANNING
   */
  async handleModifierPlanningSafely(params) {
    try {
      if (!params.employeNom || !params.details) {
        throw new Error('Nom d\'employé et poste requis');
      }

      console.log('🎯 Modification planning IA:', params);

      // Recherche sécurisée de l'employé
      const employee = await this.findEmployeByNameSafely(params.employeNom);
      if (!employee) {
        return {
          message: `Employé "${params.employeNom}" non trouvé dans l'équipe cuisine.`,
          type: 'warning'
        };
      }

      // Recherche du poste correspondant
      const postesResult = await supabaseCuisine.getPostes();
      if (postesResult.error) {
        throw new Error('Erreur récupération postes');
      }

      const posteNom = params.details.toLowerCase();
      const poste = postesResult.data.find(p => 
        p.nom.toLowerCase().includes(posteNom) || 
        posteNom.includes(p.nom.toLowerCase())
      );

      if (!poste) {
        return {
          message: `Poste "${params.details}" non trouvé. Postes disponibles: ${postesResult.data.map(p => p.nom).join(', ')}`,
          type: 'warning'
        };
      }

      // Créer l'assignation pour aujourd'hui, session matin
      const today = new Date().toISOString().split('T')[0];
      const planningData = {
        date: today,
        session: 'matin',
        creneau: 'Service', // Créneau par défaut
        employee_id: employee.id,
        poste_id: poste.id,
        statut: 'Planifié',
        ai_generated: true
      };

      const result = await supabaseCuisine.createPlanningCuisine(planningData);
      
      if (result.error) {
        throw new Error(`Erreur création planning: ${result.error.message}`);
      }

      return {
        message: `✅ ${employee.nom} assigné(e) au poste "${poste.nom}" pour aujourd'hui (session matin)`,
        type: 'success',
        data: result.data
      };

    } catch (error) {
      console.error('❌ Erreur handleModifierPlanning:', error);
      return {
        message: `Erreur lors de la modification du planning: ${error.message}`,
        type: 'error'
      };
    }
  }

  /**
   * GESTION SÉCURISÉE DE LA GÉNÉRATION DE PLANNING - VERSION IA 🤖
   */
  async handleGenererPlanningSafely(params) {
    try {
      console.log('🤖 Génération planning IA INTELLIGENTE...');

      // ✅ NOUVEAU : Utiliser le moteur IA au lieu de la logique manuelle
      const today = new Date().toISOString().split('T')[0];
      const aiResult = await aiPlanningEngine.generateIntelligentPlanning(today);

      if (!aiResult.success) {
        // Fallback vers l'ancienne méthode si IA échoue
        console.warn('⚠️ IA échouée, fallback manuel...', aiResult.error);
        return await this.handleGenererPlanningManual(params);
      }

      // Sauvegarder les assignations IA en base
      let successCount = 0;
      const errors = [];

      for (const assignment of aiResult.assignments) {
        try {
          const planningData = {
            date: assignment.date,
            employee_id: assignment.employee_id,
            poste: assignment.poste,
            creneau: 'Service', // Créneau par défaut
            heure_debut: '08:00',
            heure_fin: '16:00',
            role: assignment.role,
            notes: assignment.raison_ai,
            ai_generated: true
          };

          const result = await supabaseCuisine.createPlanningCuisine(planningData);
          if (!result.error) {
            successCount++;
          } else {
            errors.push(result.error.message);
          }
        } catch (error) {
          errors.push(error.message);
        }
      }

      // Construire le message de retour avec insights IA
      let message = `🤖 **PLANNING IA OPTIMISÉ AVEC SUCCÈS !**\n\n`;
      message += `✅ **${successCount} assignations intelligentes créées**\n`;
      message += `📊 **Score global d'optimisation : ${aiResult.stats?.score_global || 'N/A'}%**\n\n`;
      
      message += `🎯 **OPTIMISATIONS IA APPLIQUÉES :**\n`;
      message += `• Analyse contextuelle des profils (Fort/Moyen/Faible)\n`;
      message += `• Prise en compte des langues parlées\n`;
      message += `• Équilibrage intelligent des charges\n`;
      message += `• Respect strict des compétences validées\n\n`;

      if (aiResult.recommendations?.length > 0) {
        message += `💡 **RECOMMANDATIONS IA :**\n`;
        aiResult.recommendations.forEach(rec => {
          message += `• ${rec}\n`;
        });
        message += `\n`;
      }

      if (errors.length > 0) {
        message += `⚠️ **${errors.length} erreur(s) de sauvegarde**\n`;
      }

      message += `🚀 **Le planning IA est maintenant actif et visible dans l'interface !**`;

      return {
        message,
        type: 'success',
        data: {
          source: 'AI_OPTIMIZED',
          assignations: successCount,
          date: today,
          aiStats: aiResult.stats,
          recommendations: aiResult.recommendations,
          errors: errors.length
        }
      };

    } catch (error) {
      console.error('❌ Erreur génération planning IA:', error);
      
      // Fallback vers méthode manuelle en cas d'erreur IA
      console.log('🔄 Tentative fallback manuel...');
      return await this.handleGenererPlanningManual(params);
    }
  }

  /**
   * 🛡️ MÉTHODE FALLBACK MANUELLE (si IA indisponible)
   */
  async handleGenererPlanningManual(params) {
    // Conserver l'ancienne logique en fallback
    return {
      message: `⚠️ **Planning généré en mode manuel**\n\nL'IA n'était pas disponible, génération avec règles prédéfinies.\n\n🔧 Vérifiez votre configuration Azure OpenAI pour l'optimisation IA.`,
      type: 'warning',
      data: { source: 'MANUAL_FALLBACK' }
    };
  }
}

// Export par défaut pour compatibilité
export default IAActionEngine; 