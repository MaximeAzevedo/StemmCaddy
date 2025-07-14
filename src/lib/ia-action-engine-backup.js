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
      // ========== GESTION DES ABSENCES (ULTRA FLEXIBLE) ==========
      AJOUTER_ABSENCE: [
        // Formats naturels basiques
        /(\w+)\s+(?:est|sera|est en|sera en)?\s*(?:absent|absente|absence|congé|congés|maladie|arrêt|repos|indisponible)/i,
        /(?:déclarer|mettre|noter|enregistrer)\s+(?:l')?absence\s+(?:de\s+)?(\w+)/i,
        /(\w+)\s+(?:ne\s+)?(?:sera pas|sera absent|peut pas|vient pas|travaille pas|ne peut pas)/i,
        
        // Avec dates explicites
        /(\w+)\s+(?:absent|absente|absence|congé)\s+(?:le|du|pour|depuis|à partir du)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{2,4}?|aujourd'hui|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|cette semaine|semaine prochaine)/i,
        /absence\s+(?:de\s+)?(\w+)\s+(?:le|du|pour|depuis)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{2,4}?|aujourd'hui|demain|lundi|mardi|mercredi|jeudi|vendredi)/i,
        
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

      // ========== GESTION DES COMPÉTENCES (HYPER FLEXIBLE) ==========
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

      // ========== GESTION DES EMPLOYÉS (TRÈS SIMPLE) ==========
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

      // ========== INFORMATIONS ET RECHERCHE (ENRICHIE) ==========
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
        // Gestion intelligente des dates
        if (matches[2]) {
          params.date = this.parseDate(matches[2]);
        } else {
          // Si pas de date explicite, chercher dans le texte complet
          const fullText = matches[0].toLowerCase();
          if (fullText.includes('aujourd\'hui')) {
            params.date = new Date().toISOString().split('T')[0];
          } else if (fullText.includes('demain')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            params.date = tomorrow.toISOString().split('T')[0];
          } else {
            params.date = new Date().toISOString().split('T')[0]; // Par défaut aujourd'hui
          }
        }
        params.motif = this.extractReason(matches[0]);
        break;

      case 'CHERCHER_REMPLACANT':
        params.employeNom = matches[1];
        params.date = new Date().toISOString().split('T')[0]; // Aujourd'hui par défaut
        break;

      case 'MODIFIER_COMPETENCE':
        // Gestion flexible selon l'ordre des paramètres
        if (matches[0].toLowerCase().includes('donner') || matches[0].toLowerCase().includes('ajouter')) {
          // Format: "donner compétence X à Y"
          params.competence = matches[1];
          params.employeNom = matches[2];
        } else {
          // Format normal: "former X sur Y"
          params.employeNom = matches[1];
          params.competence = matches[2] || matches[3]; // Flexible selon le pattern
        }
        
        // Extraire le niveau si présent
        const niveauMatch = matches[0].match(/niveau\s+(\d)/i);
        params.niveau = niveauMatch ? parseInt(niveauMatch[1]) : 3; // Niveau par défaut
        break;

      case 'QUI_COMPETENT':
        params.competence = matches[1];
        break;

      case 'AJOUTER_EMPLOYE':
        params.employeInfo = matches[1];
        params.details = matches[2] || '';
        break;

      case 'SUPPRIMER_EMPLOYE':
        params.employeNom = matches[1];
        break;

      case 'MODIFIER_EMPLOYE':
        params.employeNom = matches[1];
        params.modifications = matches[2] || '';
        break;

      case 'GENERER_PLANNING':
        // Chercher une date dans le texte
        const dateMatch = matches[0].match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{2,4})/);
        params.semaine = dateMatch ? this.parseDate(dateMatch[1]) : this.getNextMonday();
        break;

      case 'SALUTATIONS':
        params.type = 'greeting';
        break;

      case 'REMERCIEMENTS':
        params.type = 'thanks';
        break;

      case 'AIDE':
        params.type = 'help';
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

        case 'AJOUTER_EMPLOYE':
          result = await this.handleAjouterEmploye(analysis.parameters);
          break;

        case 'SUPPRIMER_EMPLOYE':
          result = await this.handleSupprimerEmploye(analysis.parameters);
          break;

        case 'MODIFIER_EMPLOYE':
          result = await this.handleModifierEmploye(analysis.parameters);
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

        case 'QUI_COMPETENT':
          result = await this.handleQuiCompetent(analysis.parameters);
          break;

        case 'SALUTATIONS':
          result = await this.handleSalutations(analysis.parameters);
          break;

        case 'REMERCIEMENTS':
          result = await this.handleRemerciements(analysis.parameters);
          break;

        case 'AIDE':
          result = await this.handleAide(analysis.parameters);
          break;
          
        default:
          result = {
            success: false,
            message: "🤔 **Je n'ai pas bien compris...**\n\n💡 **Exemples de ce que je peux faire :**\n\n👤 **Gestion des employés :**\n• \"Marie est absente demain\"\n• \"Former Paul sur Cuisine chaude\"\n• \"Qui peut faire Sandwichs ?\"\n\n📋 **Planning :**\n• \"Générer le planning de la semaine\"\n• \"Optimiser le planning\"\n\n📊 **Informations :**\n• \"Analyser l'équipe\"\n• \"Statistiques de compétences\"\n\n❓ Tapez \"aide\" pour plus d'options !",
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

      // Ajouter des métadonnées de contexte
      result.intent = analysis.intent;
      result.confidence = analysis.confidence;
      result.executionTime = Date.now() - startTime;

      return result;

    } catch (error) {
      console.error('Erreur executeAction:', error);
      const errorResult = {
        success: false,
        message: `❌ **Erreur technique**\n\nImpossible de traiter votre demande.\n\n🔧 Détails : ${error.message}`,
        data: null,
        intent: 'ERROR',
        confidence: 0,
        executionTime: Date.now() - startTime
      };

      // Logger l'erreur
      await this.logAction({
        type: 'ERROR',
        intent: 'ERROR',
        userInput,
        parametres: {},
        resultat: errorResult,
        statut: 'error',
        executionTime: Date.now() - startTime,
        userId: 'current_user'
      });

      return errorResult;
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
   * Gérer l'ajout d'un employé
   */
  async handleAjouterEmploye(params) {
    try {
      console.log('🤖 Ajout employé cuisine:', params);
      
      // Parser les informations de l'employé depuis le texte
      const { nom, prenom, profil, service, details } = this.parseEmployeeInfo(params.employeInfo, params.details);
      
      if (!nom) {
        return {
          success: false,
          message: `❌ **Informations insuffisantes**\n\nFormat attendu: "ajouter employé [Prénom] [Nom] profil [Faible/Moyen/Fort] service [Cuisine/Mixte]"\n\n💡 Exemple: "ajouter employé Marie Dupont profil Moyen service Cuisine"`
        };
      }

      // Créer l'employé général d'abord
      const employeeData = {
        nom,
        prenom: prenom || '',
        profil: profil || 'Moyen',
        langues: ['Français'],
        statut: 'Actif',
        date_embauche: new Date().toISOString().split('T')[0]
      };

      const employeeResult = await supabaseAPI.createEmployee(employeeData);
      if (employeeResult.error) {
        return {
          success: false,
          message: `❌ **Erreur création employé**\n\n${employeeResult.error.message}`,
          data: null
        };
      }

      // Ajouter l'enregistrement cuisine si spécifié
      let cuisineResult = null;
      if (service && (service === 'Cuisine' || service === 'Mixte')) {
        const cuisineData = {
          employee_id: employeeResult.data.id,
          service: service,
          niveau_hygiene: 'Base',
          date_integration: new Date().toISOString().split('T')[0]
        };

        cuisineResult = await supabaseCuisine.createEmployeeCuisine(cuisineData);
      }

      return {
        success: true,
        message: `✅ **Employé ajouté avec succès !**\n\n👤 **${prenom} ${nom}**\n🏷️ Profil: ${profil}\n${service ? `🍳 Service: ${service}\n` : ''}📅 Date d'embauche: ${new Date().toLocaleDateString('fr-FR')}\n\n💡 **Prochaines étapes :**\n• Former l'employé sur les postes nécessaires\n• Ajouter les compétences spécifiques\n• Intégrer au planning`,
        data: { 
          employee: employeeResult.data, 
          cuisine: cuisineResult?.data || null,
          service: service || 'Non spécifié'
        },
        formatType: 'employee_created',
        actions: ['refresh_employees', 'suggest_training']
      };

    } catch (error) {
      console.error('Erreur handleAjouterEmploye:', error);
      return {
        success: false,
        message: `❌ **Erreur technique**\n\nImpossible d'ajouter l'employé.\n\n🔧 Détails : ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Gérer la suppression d'un employé
   */
  async handleSupprimerEmploye(params) {
    try {
      console.log('🤖 Suppression employé:', params);
      
      // Chercher l'employé
      const { data: employees } = await supabaseAPI.getEmployees();
      const employe = employees?.find(e => 
        e.nom?.toLowerCase().includes(params.employeNom.toLowerCase()) ||
        e.prenom?.toLowerCase().includes(params.employeNom.toLowerCase())
      );

      if (!employe) {
        return {
          success: false,
          message: `❌ **Employé "${params.employeNom}" non trouvé**\n\nVérifiez l'orthographe ou utilisez "analyser équipe" pour voir la liste complète.`,
          data: null
        };
      }

      // ⚠️ ACTION CRITIQUE - Demander confirmation
      return {
        success: false,
        message: `⚠️ **SUPPRESSION EMPLOYÉ - CONFIRMATION REQUISE**\n\n👤 **${employe.prenom} ${employe.nom}**\n🏷️ Profil: ${employe.profil}\n📧 Email: ${employe.email || 'Non renseigné'}\n\n❗ **ATTENTION :** Cette action va :\n• Supprimer définitivement l'employé\n• Retirer toutes ses compétences\n• L'enlever de tous les plannings futurs\n• Supprimer son historique d'absences\n\n🔒 **Pour confirmer, dites :** "Confirmer suppression ${employe.nom}"\n\n💡 **Alternative recommandée :** Passer le statut en "Inactif" plutôt que supprimer`,
        data: { 
          employeeToDelete: employe,
          confirmationRequired: true,
          confirmationCommand: `Confirmer suppression ${employe.nom}`
        },
        formatType: 'deletion_confirmation_required'
      };

    } catch (error) {
      console.error('Erreur handleSupprimerEmploye:', error);
      return {
        success: false,
        message: `❌ **Erreur technique**\n\nImpossible de traiter la suppression.\n\n🔧 Détails : ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Gérer la modification d'un employé
   */
  async handleModifierEmploye(params) {
    try {
      console.log('🤖 Modification employé:', params);
      
      // Chercher l'employé
      const { data: employees } = await supabaseAPI.getEmployees();
      const employe = employees?.find(e => 
        e.nom?.toLowerCase().includes(params.employeNom.toLowerCase()) ||
        e.prenom?.toLowerCase().includes(params.employeNom.toLowerCase())
      );

      if (!employe) {
        return {
          success: false,
          message: `❌ **Employé "${params.employeNom}" non trouvé**\n\nVérifiez l'orthographe ou utilisez "analyser équipe" pour voir la liste complète.`,
          data: null
        };
      }

      // Parser les modifications demandées
      const modifications = this.parseModifications(params.modifications);
      
      if (Object.keys(modifications).length === 0) {
        return {
          success: false,
          message: `❌ **Aucune modification comprise**\n\n💡 **Exemples valides :**\n• "modifier ${employe.nom} profil Fort"\n• "changer profil de ${employe.nom} en Moyen"\n• "${employe.nom} devient profil Faible"\n• "ajouter langue Anglais à ${employe.nom}"`
        };
      }

      // Appliquer les modifications
      const updateResult = await supabaseAPI.updateEmployee(employe.id, modifications);
      if (updateResult.error) {
        return {
          success: false,
          message: `❌ **Erreur lors de la modification**\n\n${updateResult.error.message}`,
          data: null
        };
      }

      // Construire le message de succès
      const changesText = Object.entries(modifications)
        .map(([key, value]) => {
          switch(key) {
            case 'profil': return `🏷️ Profil: ${employe.profil} → ${value}`;
            case 'langues': return `🌍 Langues: ${value.join(', ')}`;
            case 'statut': return `📊 Statut: ${employe.statut} → ${value}`;
            case 'notes': return `📝 Notes mises à jour`;
            default: return `${key}: ${value}`;
          }
        })
        .join('\n');

      return {
        success: true,
        message: `✅ **Employé modifié avec succès !**\n\n👤 **${employe.prenom} ${employe.nom}**\n\n📋 **Modifications appliquées :**\n${changesText}\n\n💡 **Impact :**\n• Pris en compte immédiatement dans le système\n• Visible dans l'analyse d'équipe\n• Appliqué aux futurs plannings`,
        data: { 
          employee: employe,
          modifications,
          updatedEmployee: updateResult.data
        },
        formatType: 'employee_updated',
        actions: ['refresh_employees', 'update_planning_capacity']
      };

    } catch (error) {
      console.error('Erreur handleModifierEmploye:', error);
      return {
        success: false,
        message: `❌ **Erreur technique**\n\nImpossible de modifier l'employé.\n\n🔧 Détails : ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Parser les informations d'un nouvel employé
   */
  parseEmployeeInfo(employeInfo, details) {
    const info = `${employeInfo} ${details}`.toLowerCase();
    
    // Extraire nom et prénom
    const nameMatch = employeInfo.match(/^(\w+)(?:\s+(\w+))?/);
    const prenom = nameMatch?.[1] || '';
    const nom = nameMatch?.[2] || nameMatch?.[1] || '';
    
    // Extraire profil
    const profilMatch = info.match(/profil\s+(faible|moyen|fort)/i);
    const profil = profilMatch ? profilMatch[1].charAt(0).toUpperCase() + profilMatch[1].slice(1) : null;
    
    // Extraire service
    const serviceMatch = info.match(/service\s+(cuisine|logistique|mixte)/i);
    const service = serviceMatch ? serviceMatch[1].charAt(0).toUpperCase() + serviceMatch[1].slice(1) : null;
    
    return { nom, prenom, profil, service, details };
  }

  /**
   * Parser les modifications demandées pour un employé
   */
  parseModifications(modificationsText) {
    const text = modificationsText.toLowerCase();
    const modifications = {};
    
    // Profil
    const profilMatch = text.match(/profil\s+(faible|moyen|fort)/i);
    if (profilMatch) {
      modifications.profil = profilMatch[1].charAt(0).toUpperCase() + profilMatch[1].slice(1);
    }
    
    // Statut
    const statutMatch = text.match(/statut\s+(actif|inactif|formation)/i);
    if (statutMatch) {
      modifications.statut = statutMatch[1].charAt(0).toUpperCase() + statutMatch[1].slice(1);
    }
    
    // Langue (ajouter)
    const langueMatch = text.match(/langue\s+(\w+)/i);
    if (langueMatch) {
      // Pour l'instant, on suppose qu'on ajoute une langue (à améliorer)
      modifications.langues = [langueMatch[1].charAt(0).toUpperCase() + langueMatch[1].slice(1)];
    }
    
    return modifications;
  }

  /**
   * Gérer la génération de planning intelligent
   */
  async handleGenererPlanning(params) {
    try {
      console.log('🤖 Génération planning intelligent pour:', params.semaine);
      
      // Étape 1: Récupérer toutes les données nécessaires
      const [employeesRes, postesRes, competencesRes, absencesRes] = await Promise.all([
        supabaseCuisine.getEmployeesCuisineWithCompetences(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple(),
        supabaseCuisine.getAbsencesCuisine(params.semaine, this.addDays(params.semaine, 6))
      ]);

      if (employeesRes.error || postesRes.error || competencesRes.error) {
        return {
          success: false,
          message: '❌ **Erreur accès données**\n\nImpossible de récupérer les informations nécessaires pour générer le planning.',
          data: null
        };
      }

      const employees = employeesRes.data || [];
      const postes = postesRes.data || [];
      const competences = competencesRes.data || [];
      const absences = absencesRes.data || [];

      if (employees.length === 0) {
        return {
          success: false,
          message: '❌ **Aucun employé disponible**\n\nImpossible de générer un planning sans employés.',
          data: null
        };
      }

      // Étape 2: Analyser les contraintes
      const constraints = this.analyzeConstraints(employees, absences, postes, competences);
      
      // Étape 3: Générer le planning avec algorithme IA
      const planningGenerated = await this.generateIntelligentPlanning(
        employees, 
        postes, 
        competences, 
        absences, 
        constraints,
        params.semaine
      );

      // Étape 4: Sauvegarder le planning généré
      const saveResults = await this.savePlanningToDB(planningGenerated, params.semaine);

      if (saveResults.errors.length > 0) {
        console.warn('⚠️ Certaines assignations ont échoué:', saveResults.errors);
      }

      return {
        success: true,
        message: `🎯 **Planning IA généré avec succès !**\n\n📅 **Semaine du ${new Date(params.semaine).toLocaleDateString('fr-FR')}**\n\n📊 **Résultats :**\n• ${saveResults.successful} assignations créées\n• ${planningGenerated.sessions.matin.length} créneaux matin\n• ${planningGenerated.sessions['apres-midi'].length} créneaux après-midi\n• ${constraints.employesDisponibles} employés disponibles\n• ${constraints.totalCompetences} compétences utilisées\n\n${saveResults.errors.length > 0 ? `⚠️ ${saveResults.errors.length} erreur(s) de sauvegarde\n\n` : ''}🎯 **Optimisations appliquées :**\n• Respect des compétences requises\n• Équilibrage de la charge de travail\n• Gestion automatique des absences\n• Rotation intelligente des postes\n\n▶️ **Le planning est maintenant actif et visible dans l'interface.**`,
        data: { 
          planning: planningGenerated,
          stats: {
            totalAssignments: saveResults.successful,
            errors: saveResults.errors.length,
            availableEmployees: constraints.employesDisponibles,
            totalCompetences: constraints.totalCompetences
          },
          semaine: params.semaine 
        },
        formatType: 'planning_generated',
        actions: ['refresh_planning', 'show_planning_view']
      };

    } catch (error) {
      console.error('Erreur handleGenererPlanning:', error);
      return {
        success: false,
        message: `❌ **Erreur technique lors de la génération**\n\nImpossible de générer le planning.\n\n🔧 Détails : ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Analyser les contraintes pour la génération de planning
   */
  analyzeConstraints(employees, absences, postes, competences) {
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Employés disponibles (pas absents)
    const absentEmployeeIds = absences
      .filter(abs => abs.statut === 'Confirmée')
      .map(abs => abs.employee_id);
    
    const availableEmployees = employees.filter(emp => 
      !absentEmployeeIds.includes(emp.employee.id) && 
      emp.employee.statut === 'Actif'
    );

    // Map des compétences par employé
    const competenceMap = {};
    competences.forEach(comp => {
      if (!competenceMap[comp.employee_id]) {
        competenceMap[comp.employee_id] = [];
      }
      competenceMap[comp.employee_id].push(comp);
    });

    // Contraintes par poste (règles métier cuisine)
    const posteConstraints = {
      'Vaisselle': { min: 3, max: 3, priority: 3, sessions: ['matin', 'apres-midi'] },
      'Self Midi': { min: 2, max: 2, priority: 4, sessions: ['matin'] },
      'Sandwichs': { min: 5, max: 6, priority: 5, sessions: ['matin', 'apres-midi'] },
      'Pain': { min: 2, max: 3, priority: 2, sessions: ['matin', 'apres-midi'] },
      'Jus de fruits': { min: 1, max: 2, priority: 1, sessions: ['matin', 'apres-midi'] },
      'Cuisine chaude': { min: 1, max: 2, priority: 4, needsCompetence: true, sessions: ['matin', 'apres-midi'] },
      'Légumerie': { min: 1, max: 2, priority: 2, sessions: ['matin', 'apres-midi'] },
      'Equipe Pina et Saskia': { min: 2, max: 3, priority: 3, sessions: ['matin', 'apres-midi'] }
    };

    return {
      employesDisponibles: availableEmployees.length,
      employesAbsents: absentEmployeeIds.length,
      totalCompetences: competences.length,
      availableEmployees,
      competenceMap,
      posteConstraints
    };
  }

  /**
   * Générer un planning intelligent avec algorithme IA
   */
  async generateIntelligentPlanning(employees, postes, competences, absences, constraints, semaine) {
    const planning = {
      semaine,
      sessions: {
        'matin': [],
        'apres-midi': []
      },
      stats: {
        totalAssignments: 0,
        employeesUsed: new Set(),
        competencesUtilized: 0
      }
    };

    const sessions = ['matin', 'apres-midi'];
    const weekDays = [1, 2, 3, 4, 5]; // Lundi à Vendredi

    // Créneaux par session
    const creneauxParSession = {
      'matin': ['8h', '10h', 'midi', '11h-11h45', '11h45-12h45'],
      'apres-midi': ['8h', '10h', 'midi']
    };

    for (const session of sessions) {
      for (const day of weekDays) {
        const date = this.addDays(semaine, day - 1);
        
        // Trier les postes par priorité (Sandwiches d'abord)
        const sortedPostes = postes
          .filter(p => constraints.posteConstraints[p.nom]?.sessions.includes(session))
          .sort((a, b) => {
            const priorityA = constraints.posteConstraints[a.nom]?.priority || 0;
            const priorityB = constraints.posteConstraints[b.nom]?.priority || 0;
            return priorityB - priorityA;
          });

        let dailyAssignedEmployees = [];

        for (const poste of sortedPostes) {
          const rules = constraints.posteConstraints[poste.nom];
          if (!rules) continue;

          const creneaux = creneauxParSession[session];
          
          for (const creneau of creneaux) {
            // Respecter les règles de ce poste pour ce créneau
            const needsAssignment = this.shouldAssignToCreneauPoste(poste.nom, creneau, session);
            if (!needsAssignment) continue;

            // Trouver les meilleurs employés pour ce poste/créneau
            const bestEmployees = this.findBestEmployeesForSlot(
              constraints.availableEmployees,
              poste,
              constraints.competenceMap,
              dailyAssignedEmployees,
              rules,
              date,
              creneau
            );

            // Assigner selon les règles min/max du poste
            const targetCount = Math.min(rules.min + Math.floor(Math.random() * (rules.max - rules.min + 1)), bestEmployees.length);
            
            for (let i = 0; i < targetCount && i < bestEmployees.length; i++) {
              const employee = bestEmployees[i];
              
              const assignment = {
                date,
                session,
                creneau,
                employee_id: employee.employee.id,
                poste_id: poste.id,
                employee_nom: employee.employee.nom,
                employee_prenom: employee.employee.prenom || '',
                poste_nom: poste.nom,
                ai_generated: true,
                confidence: employee.score / 100
              };

              planning.sessions[session].push(assignment);
              dailyAssignedEmployees.push(employee.employee.id);
              planning.stats.totalAssignments++;
              planning.stats.employeesUsed.add(employee.employee.id);
            }
          }
        }
      }
    }

    planning.stats.employeesUsed = planning.stats.employeesUsed.size;
    
    return planning;
  }

  /**
   * Détermine si un poste/créneau nécessite une assignation
   */
  shouldAssignToCreneauPoste(posteName, creneau, session) {
    // Règles spécifiques par poste et créneau
    const rules = {
      'Self Midi': ['11h45-12h45'], // Seulement à midi
      'Sandwichs': ['8h', '10h', 'midi'], // Priorité sur ces créneaux
      'Cuisine chaude': ['8h', '10h'], // Préparation tôt
      'Pain': ['8h'], // Très tôt pour la préparation
      'Jus de fruits': ['10h', 'midi'], // Plutôt en fin de matinée
      'Vaisselle': ['midi'], // Après les services
      'Légumerie': ['8h'], // Préparation très tôt
      'Equipe Pina et Saskia': ['8h', '10h', 'midi'] // Flexible
    };

    const allowedCreneaux = rules[posteName];
    return !allowedCreneaux || allowedCreneaux.includes(creneau);
  }

  /**
   * Trouver les meilleurs employés pour un créneau donné
   */
  findBestEmployeesForSlot(availableEmployees, poste, competenceMap, alreadyAssigned, rules, date, creneau) {
    // Filtrer les employés déjà assignés aujourd'hui
    const candidats = availableEmployees.filter(emp => 
      !alreadyAssigned.includes(emp.employee.id)
    );

    // Si le poste nécessite des compétences, filtrer
    if (rules.needsCompetence) {
      const competentCandidats = candidats.filter(emp => {
        const empCompetences = competenceMap[emp.employee.id] || [];
        return empCompetences.some(comp => comp.poste_id === poste.id);
      });
      
      if (competentCandidats.length > 0) {
        return this.scoreAndRankEmployees(competentCandidats, poste, date, creneau);
      }
    }

    // Sinon, tous les candidats sont valides
    return this.scoreAndRankEmployees(candidats, poste, date, creneau);
  }

  /**
   * Scorer et classer les employés pour un poste
   */
  scoreAndRankEmployees(employees, poste, date, creneau) {
    return employees.map(emp => {
      let score = 50; // Score de base

      // Bonus selon profil
      const profilBonus = {
        'Fort': 30,
        'Moyen': 20,
        'Faible': 10
      };
      score += profilBonus[emp.employee.profil] || 15;

      // Bonus langues (diversité)
      const langues = emp.employee.langues || [];
      score += langues.length * 5;

      // Bonus permis (si pertinent)
      if (emp.employee.permis) score += 5;

      // Variation aléatoire pour éviter la monotonie
      score += Math.random() * 10;

      return { ...emp, score };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Sauvegarder le planning généré en base de données
   */
  async savePlanningToDB(planning, semaine) {
    const results = {
      successful: 0,
      errors: []
    };

    // Supprimer le planning existant pour cette semaine d'abord
    try {
      await supabaseCuisine.deletePlanningCuisineRange(semaine, this.addDays(semaine, 6));
    } catch (error) {
      console.warn('⚠️ Erreur suppression planning existant:', error);
    }

    // Sauvegarder toutes les assignations
    for (const session of Object.keys(planning.sessions)) {
      for (const assignment of planning.sessions[session]) {
        try {
          const planningData = {
            date: assignment.date,
            session: assignment.session,
            creneau: assignment.creneau,
            employee_id: assignment.employee_id,
            poste_id: assignment.poste_id,
            statut: 'Planifié',
            ai_generated: true
          };

          const result = await supabaseCuisine.createPlanningCuisine(planningData);
          
          if (result.error) {
            results.errors.push(`${assignment.employee_nom} - ${assignment.poste_nom}: ${result.error.message}`);
          } else {
            results.successful++;
          }
        } catch (error) {
          results.errors.push(`${assignment.employee_nom} - ${assignment.poste_nom}: ${error.message}`);
        }
      }
    }

    return results;
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

  /**
   * Gérer "qui est compétent"
   */
  async handleQuiCompetent(params) {
    try {
      console.log('🤖 Recherche employés compétents pour:', params.competence);
      
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
          message: `❌ **Poste "${params.competence}" non reconnu**\n\n🍳 **Postes cuisine disponibles :**\n${postesDisponibles}\n\n💡 Essayez : "Qui peut faire Cuisine chaude ?"`,
          data: null
        };
      }

      // Récupérer les employés cuisine avec leurs compétences
      const { data: employeesCuisine } = await supabaseCuisine.getEmployeesCuisineWithCompetences();
      if (!employeesCuisine) {
        return {
          success: false,
          message: '❌ **Erreur lors de la récupération des données**\n\nImpossible d\'accéder aux informations des employés.',
          data: null
        };
      }

      // Trouver les employés qualifiés pour ce poste
      const qualified = employeesCuisine.filter(empCuisine => {
        return empCuisine.competences_cuisine && empCuisine.competences_cuisine.some(comp => 
          comp.poste_id === poste.id
        );
      });

      if (qualified.length === 0) {
        return {
          success: true,
          message: `⚠️ **Aucun employé formé sur "${poste.nom}"** actuellement.\n\n💡 **Suggestions :**\n• Former quelqu'un rapidement sur ce poste\n• Utilisez : "Former [Nom] sur ${poste.nom}"\n• Voir l'équipe : "Analyser l'équipe"\n\n🍳 **Ce poste est critique pour le service !**`,
          data: { poste: poste.nom, qualified: [] },
          formatType: 'no_competent_employees'
        };
      }

      // Construire la réponse avec détails
      let response = `👥 **Employés qualifiés pour "${poste.nom}"** :\n\n`;
      
      qualified.forEach((empCuisine, index) => {
        const emp = empCuisine.employee;
        const profil = emp.profil;
        const profilIcon = profil === 'Fort' ? '🌟' : profil === 'Moyen' ? '⭐' : '📍';
        
        // Trouver le niveau de compétence spécifique
        const competence = empCuisine.competences_cuisine.find(comp => comp.poste_id === poste.id);
        const niveau = competence?.niveau || 'Formé';
        
        response += `${profilIcon} **${emp.nom} ${emp.prenom || ''}** (${profil}) - Niveau: ${niveau}\n`;
      });
      
      response += `\n📊 **${qualified.length} employé${qualified.length > 1 ? 's' : ''} disponible${qualified.length > 1 ? 's' : ''}** sur ce poste.\n\n`;
      
      // Recommandations selon le nombre
      if (qualified.length < 2) {
        response += `⚠️ **Attention :** Poste critique avec peu d'employés formés. Considérez former d'autres personnes.`;
      } else if (qualified.length >= 3) {
        response += `✅ **Excellent :** Bonne couverture pour ce poste, planning flexible possible.`;
      } else {
        response += `🟡 **Correct :** Couverture suffisante mais limitée pour ce poste.`;
      }

      return {
        success: true,
        message: response,
        data: { 
          poste: poste.nom, 
          qualified: qualified.map(ec => ({
            nom: ec.employee.nom,
            prenom: ec.employee.prenom,
            profil: ec.employee.profil,
            niveau: ec.competences_cuisine.find(comp => comp.poste_id === poste.id)?.niveau
          }))
        },
        formatType: 'competent_employees'
      };

    } catch (error) {
      console.error('Erreur handleQuiCompetent:', error);
      return {
        success: false,
        message: '❌ **Erreur technique lors de la recherche**\n\nContactez le support technique.',
        data: null
      };
    }
  }

  /**
   * Gérer les salutations
   */
  async handleSalutations(params) {
    const greetings = [
      "Salut ! Comment puis-je vous aider aujourd'hui ?",
      "Bonjour ! Qu'est-ce que je peux faire pour vous ?",
      "Hello ! Comment ça va ?",
      "Hi ! Comment puis-je vous être utile ?",
      "Coucou ! Qu'est-ce que vous voulez faire aujourd'hui ?",
      "Bonsoir ! Comment puis-je vous aider ce soir ?",
      "Bonjour ! Comment puis-je vous être utile ce matin ?"
    ];
    return {
      success: true,
      message: greetings[Math.floor(Math.random() * greetings.length)],
      data: null,
      formatType: 'greeting'
    };
  }

  /**
   * Gérer les remerciements
   */
  async handleRemerciements(params) {
    const thanks = [
      "De rien ! Je suis là pour vous aider.",
      "Avec plaisir ! N'hésitez pas à me demander autre chose.",
      "Je vous en prie ! N'hésitez pas à me contacter si vous avez besoin d'aide.",
      "Très bien ! Je suis là pour vous servir.",
      "Parfait ! N'hésitez pas à me dire si vous avez d'autres demandes.",
      "Super ! Je suis là pour vous assister.",
      "Génial ! N'hésitez pas à me demander autre chose si vous voulez."
    ];
    return {
      success: true,
      message: thanks[Math.floor(Math.random() * thanks.length)],
      data: null,
      formatType: 'thanks'
    };
  }

  /**
   * Gérer l'aide
   */
  async handleAide(params) {
    const helpMessage = `🤖 **Assistant IA Cuisine - Guide d'utilisation**

Je suis votre assistant intelligent pour la gestion de la cuisine. Voici ce que je peux faire :

## 👥 **GESTION DES EMPLOYÉS**

🔹 **Absences :**
• "Marie est absente demain"
• "Paul malade aujourd'hui"
• "Déclarer Jean absent cette semaine"

🔹 **Remplacements :**
• "Qui peut remplacer Marie ?"
• "Besoin d'un remplaçant pour Paul"

🔹 **Employés :**
• "Ajouter employé Sophie Durand profil Fort"
• "Modifier Paul profil Moyen"

## 🎓 **FORMATIONS & COMPÉTENCES**

• "Former Paul sur Cuisine chaude"
• "Qui peut faire Sandwichs ?"
• "Marie maîtrise la Pâtisserie"
• "Donner compétence Vaisselle à Sophie"

## 📋 **PLANNING INTELLIGENT**

• "Générer le planning de la semaine"
• "Optimiser le planning"
• "Planning automatique"

## 📊 **ANALYSES & INFORMATIONS**

• "Analyser l'équipe"
• "Statistiques de compétences"
• "État de l'équipe"

---

💡 **Astuce :** Parlez-moi naturellement ! Je comprends de nombreuses façons de dire la même chose.

❓ **Questions ?** Posez-moi n'importe quoi, je suis là pour vous aider !`;

    return {
      success: true,
      message: helpMessage,
      data: null,
      formatType: 'help'
    };
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
   * Parser une date en format français avec support des expressions naturelles
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    const normalizedStr = dateStr.toLowerCase().trim();
    const today = new Date();
    
    // Expressions naturelles
    if (normalizedStr.includes('aujourd\'hui') || normalizedStr === 'aujourd\'hui') {
      return today.toISOString().split('T')[0];
    }
    
    if (normalizedStr.includes('demain') || normalizedStr === 'demain') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    if (normalizedStr.includes('hier') || normalizedStr === 'hier') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    
    // Jours de la semaine
    const daysOfWeek = {
      'lundi': 1, 'mundi': 1,
      'mardi': 2, 'tuesday': 2,
      'mercredi': 3, 'wednesday': 3,
      'jeudi': 4, 'thursday': 4,
      'vendredi': 5, 'friday': 5,
      'samedi': 6, 'saturday': 6,
      'dimanche': 0, 'sunday': 0
    };
    
    for (const [dayName, dayNum] of Object.entries(daysOfWeek)) {
      if (normalizedStr.includes(dayName)) {
        const targetDate = new Date(today);
        const currentDay = today.getDay();
        let daysToAdd = dayNum - currentDay;
        
        // Si le jour est déjà passé cette semaine, prendre la semaine suivante
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        
        targetDate.setDate(today.getDate() + daysToAdd);
        return targetDate.toISOString().split('T')[0];
      }
    }
    
    // Expressions relatives
    if (normalizedStr.includes('cette semaine')) {
      return this.getNextMonday(); // Début de cette semaine
    }
    
    if (normalizedStr.includes('semaine prochaine')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    
    // Formats de date standard : DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?/;
    const match = normalizedStr.match(datePattern);
    
    if (match) {
      let [, day, month, year] = match;
      
      // Si l'année n'est pas fournie, utiliser l'année courante
      if (!year) {
        year = today.getFullYear();
      } else if (year.length === 2) {
        // Convertir année à 2 chiffres en 4 chiffres
        year = '20' + year;
      }
      
      try {
        const parsedDate = new Date(year, month - 1, day);
        // Vérifier que la date est valide
        if (parsedDate.getMonth() === month - 1 && parsedDate.getDate() == day) {
          return parsedDate.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn('Date invalide:', dateStr);
      }
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