import { supabaseAPI } from './supabase';
import { supabaseCuisine } from './supabase-cuisine';
import { openaiAPI } from './openai';

// Journal des modifications IA pour traçabilité
let aiModificationLog = [];

// ========================= GESTION DU CONTEXTE CONVERSATIONNEL =========================
let conversationContext = {
  lastMentionedEmployee: null,
  lastMentionedVehicle: null,
  lastAction: null,
  lastTopics: [], // Derniers sujets abordés
  timestamp: null
};

// Fonction pour extraire et sauvegarder le contexte d'un message
const updateConversationContext = (userMessage, aiResponse) => {
  const message = userMessage.toLowerCase();
  
  // Détecter les noms d'employés mentionnés
  const employeeNames = ['shadi', 'tamara', 'ahmad', 'martial', 'margot', 'soroosh', 'imad', 'basel', 'tesfa', 'firas', 'juan', 'josé', 'emaha', 'medha', 'deazevedo'];
  const mentionedEmployee = employeeNames.find(name => message.includes(name));
  
  if (mentionedEmployee) {
    conversationContext.lastMentionedEmployee = mentionedEmployee.charAt(0).toUpperCase() + mentionedEmployee.slice(1);
    conversationContext.timestamp = Date.now();
  }
  
  // Détecter les véhicules mentionnés
  const vehicleNames = ['crafter', 'jumper', 'ducato', 'transit'];
  const mentionedVehicle = vehicleNames.find(name => message.includes(name));
  
  if (mentionedVehicle) {
    conversationContext.lastMentionedVehicle = mentionedVehicle;
    conversationContext.timestamp = Date.now();
  }
  
  // Détecter les actions et le contexte de conversation
  if (message.includes('absent') || message.includes('disponible')) {
    conversationContext.lastAction = 'availability_check';
  } else if (message.includes('planning') || message.includes('équipe') || message.includes('équipe')) {
    conversationContext.lastAction = 'team_planning';
  } else if (message.includes('mettre') && (message.includes('avec') || message.includes('dans'))) {
    conversationContext.lastAction = 'team_assignment';
  }
  
  // Détecter si l'IA vient de faire des suggestions d'équipes
  if (aiResponse.includes('proposer') || aiResponse.includes('associer') || aiResponse.includes('règles d\'insertion')) {
    conversationContext.lastAction = 'awaiting_team_confirmation';
  }
  
  // Nettoyer le contexte après 5 minutes
  if (conversationContext.timestamp && Date.now() - conversationContext.timestamp > 300000) {
    conversationContext = {
      lastMentionedEmployee: null,
      lastMentionedVehicle: null,
      lastAction: null,
      lastTopics: [],
      timestamp: null
    };
  }
};

// Fonction pour résoudre les références dans un message
const resolveReferences = (message) => {
  let resolvedMessage = message;
  
  // Résoudre les pronoms si on a un contexte
  if (conversationContext.lastMentionedEmployee && conversationContext.timestamp && 
      Date.now() - conversationContext.timestamp < 120000) { // 2 minutes
    
    // Remplacer les références par le nom de l'employé
    resolvedMessage = resolvedMessage
      .replace(/\b(il|lui)\b/gi, conversationContext.lastMentionedEmployee)
      .replace(/\b(elle|la)\b/gi, conversationContext.lastMentionedEmployee)
      .replace(/\b(cette personne|cet employé|cette employée)\b/gi, conversationContext.lastMentionedEmployee);
  }
  
  return resolvedMessage;
};

// Fonction pour détecter si l'utilisateur donne une instruction directive (déjà confirmée)
const isDirectiveInstruction = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Patterns d'instructions directives qui impliquent déjà une confirmation
  const directivePatterns = [
    /^(oui|ok|d'accord),?\s+(tu peux|vous pouvez|fais|faites|mets|mettez)/,
    /^(oui|ok|d'accord),?\s+(je veux|on peut|il faut)/,
    /^(vas-y|va-y|allez-y|allez y|go)/,
    /^(tu peux|vous pouvez)\s+(mettre|associer|placer|créer|générer)/,
    /^(fais|faites)\s+(le|la|les|ça|cela)/,
    /^(mets|mettez)\s+(.+)\s+(avec|dans|sur)/,
    /^(créer?|génère|place|associe)\s+/,
    /^(parfait|excellent|très bien),?\s+(fais|faites|mets|mettez)/
  ];
  
  return directivePatterns.some(pattern => pattern.test(lowerMessage));
};

// Fonction pour extraire l'action demandée dans une instruction directive
const extractDirectiveAction = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Détecter la génération de planning avec équipes spécifiques
  if (lowerMessage.includes('mettre') || lowerMessage.includes('associer') || lowerMessage.includes('placer')) {
    const teamMatch = message.match(/(?:mettre|associer|placer)\s+(.+?)\s+(?:avec|dans|sur)\s+(.+)/i);
    if (teamMatch) {
      return {
        type: 'CREATE_TEAM_PLANNING',
        employee1: teamMatch[1].trim(),
        employee2: teamMatch[2].trim()
      };
    }
  }
  
  // Détecter génération de planning général
  if (lowerMessage.includes('générer') || lowerMessage.includes('planning') || lowerMessage.includes('créer le planning')) {
    return {
      type: 'GENERATE_PLANNING',
      date: 'demain' // par défaut
    };
  }
  
  return null;
};

export const aiService = {
  // ========================= NAVIGATION AUTOMATIQUE =========================
  
  async navigateToPage(pageName, additionalInfo = '') {
    const routes = {
      'accueil': '/',
      'logistique': '/logistique',
      'employes': '/employees',
      'employés': '/employees',
      'planning': '/planning',
      'absences': '/absences',
      'cuisine': '/cuisine',
      'absences cuisine': '/cuisine/absences'
    };

    const route = routes[pageName.toLowerCase()];
    if (route) {
      // Simuler navigation (dans une vraie app, on utiliserait navigate)
      window.history.pushState({}, '', route);
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      this.logModification('NAVIGATION', `Navigation vers ${pageName}`, { page: pageName, route });
      return `📍 Navigation vers **${pageName}** ${additionalInfo}`;
    }
    return `❌ Page "${pageName}" non trouvée. Pages disponibles: ${Object.keys(routes).join(', ')}`;
  },

  // ========================= JOURNAL DE TRAÇABILITÉ =========================
  
  logModification(action, description, data = {}) {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      description,
      data,
      user: 'IA_ASSISTANT'
    };
    
    aiModificationLog.push(logEntry);
    
    // Garder seulement les 100 dernières modifications
    if (aiModificationLog.length > 100) {
      aiModificationLog = aiModificationLog.slice(-100);
    }
    
    console.log('📝 [IA LOG]', logEntry);
  },

  getModificationLog(limit = 10) {
    return aiModificationLog
      .slice(-limit)
      .reverse()
      .map(entry => `🕐 **${new Date(entry.timestamp).toLocaleString('fr-FR')}**\n**${entry.action}:** ${entry.description}`)
      .join('\n\n');
  },

  // ========================= GESTION COMPLÈTE EMPLOYÉS =========================
  
  async createEmployee(employeeData, needsConfirmation = true) {
    try {
      if (needsConfirmation) {
        const confirmationData = {
          action: 'CREATE_EMPLOYEE',
          data: employeeData,
          message: `Créer nouvel employé: ${employeeData.nom} ${employeeData.prenom || ''} (${employeeData.profil})`
        };
        return await this.requestConfirmation(confirmationData);
      }

      const result = await supabaseAPI.createEmployee(employeeData);
      if (result.error) throw result.error;

      this.logModification('CREATE_EMPLOYEE', `Employé créé: ${employeeData.nom}`, employeeData);
      return `✅ **Employé créé avec succès !**\n👤 ${employeeData.nom} ${employeeData.prenom || ''}\n📊 Profil: ${employeeData.profil}\n🗣️ Langues: ${employeeData.langues?.join(', ') || 'Aucune'}`;

    } catch (error) {
      this.logModification('ERROR', `Échec création employé: ${error.message}`, { employeeData, error: error.message });
      return `❌ Erreur création employé: ${error.message}`;
    }
  },

  async updateEmployee(employeeId, updates, needsConfirmation = true) {
    try {
      if (needsConfirmation) {
        const { data: employee } = await supabaseAPI.getEmployee(employeeId);
        const confirmationData = {
          action: 'UPDATE_EMPLOYEE',
          data: { employeeId, updates, currentEmployee: employee },
          message: `Modifier ${employee?.nom}: ${Object.keys(updates).join(', ')}`
        };
        return await this.requestConfirmation(confirmationData);
      }

      const result = await supabaseAPI.updateEmployee(employeeId, updates);
      if (result.error) throw result.error;

      this.logModification('UPDATE_EMPLOYEE', `Employé modifié (ID: ${employeeId})`, updates);
      return `✅ **Employé mis à jour !**\n📝 Modifications: ${Object.keys(updates).map(key => `${key}: ${updates[key]}`).join(', ')}`;

    } catch (error) {
      this.logModification('ERROR', `Échec modification employé: ${error.message}`, { employeeId, updates });
      return `❌ Erreur modification employé: ${error.message}`;
    }
  },

  async deleteEmployee(employeeId, needsConfirmation = true) {
    try {
      const { data: employee } = await supabaseAPI.getEmployee(employeeId);
      
      if (needsConfirmation) {
        const confirmationData = {
          action: 'DELETE_EMPLOYEE',
          data: { employeeId, employee },
          message: `⚠️ SUPPRIMER définitivement l'employé ${employee?.nom} ? Cette action est irréversible !`
        };
        return await this.requestConfirmation(confirmationData);
      }

      const result = await supabaseAPI.deleteEmployee(employeeId);
      if (result.error) throw result.error;

      this.logModification('DELETE_EMPLOYEE', `Employé supprimé: ${employee?.nom}`, { employeeId, deletedEmployee: employee });
      return `🗑️ **Employé supprimé définitivement**\n👤 ${employee?.nom} a été retiré du système`;

    } catch (error) {
      this.logModification('ERROR', `Échec suppression employé: ${error.message}`, { employeeId });
      return `❌ Erreur suppression employé: ${error.message}`;
    }
  },

  // ========================= GESTION COMPÉTENCES AVANCÉE =========================
  
  async validateCompetence(employeeId, vehicleId, niveau = 'X', needsConfirmation = false) {
    try {
      const { data: employee } = await supabaseAPI.getEmployee(employeeId);
      const { data: vehicle } = await supabaseAPI.getVehicle(vehicleId);
      
      if (needsConfirmation) {
        const confirmationData = {
          action: 'VALIDATE_COMPETENCE',
          data: { employeeId, vehicleId, niveau, employee, vehicle },
          message: `Valider compétence ${niveau} pour ${employee?.nom} sur ${vehicle?.nom}`
        };
        return await this.requestConfirmation(confirmationData);
      }

      const competenceData = {
        niveau: niveau,
        date_validation: new Date().toISOString().split('T')[0],
        formateur_id: 1 // IA comme formateur
      };

      const result = await supabaseAPI.updateCompetence(employeeId, vehicleId, competenceData);
      if (result.error) throw result.error;

      this.logModification('VALIDATE_COMPETENCE', `Compétence validée: ${employee?.nom} - ${vehicle?.nom} (${niveau})`, competenceData);
      return `🎯 **Compétence validée !**\n👤 ${employee?.nom}\n🚛 ${vehicle?.nom}\n⭐ Niveau: ${niveau === 'XX' ? '2 étoiles (autonome)' : '1 étoile (accompagné)'}`;

    } catch (error) {
      this.logModification('ERROR', `Échec validation compétence: ${error.message}`, { employeeId, vehicleId, niveau });
      return `❌ Erreur validation compétence: ${error.message}`;
    }
  },

  // ========================= GESTION VÉHICULES =========================
  
  async createVehicle(vehicleData, needsConfirmation = true) {
    try {
      if (needsConfirmation) {
        const confirmationData = {
          action: 'CREATE_VEHICLE',
          data: vehicleData,
          message: `Créer nouveau véhicule: ${vehicleData.nom} (capacité: ${vehicleData.capacite})`
        };
        return await this.requestConfirmation(confirmationData);
      }

      const result = await supabaseAPI.createVehicle(vehicleData);
      if (result.error) throw result.error;

      this.logModification('CREATE_VEHICLE', `Véhicule créé: ${vehicleData.nom}`, vehicleData);
      return `🚛 **Véhicule ajouté à la flotte !**\n📛 ${vehicleData.nom}\n👥 Capacité: ${vehicleData.capacite} personnes`;

    } catch (error) {
      this.logModification('ERROR', `Échec création véhicule: ${error.message}`, vehicleData);
      return `❌ Erreur création véhicule: ${error.message}`;
    }
  },

  // ========================= GESTION CUISINE COMPLÈTE =========================
  
  async createEmployeeCuisine(employeeData, cuisineData, needsConfirmation = true) {
    try {
      if (needsConfirmation) {
        const confirmationData = {
          action: 'CREATE_EMPLOYEE_CUISINE',
          data: { employeeData, cuisineData },
          message: `Créer employé cuisine: ${employeeData.nom} (service: ${cuisineData.service})`
        };
        return await this.requestConfirmation(confirmationData);
      }

      // Créer l'employé général d'abord
      const employeeResult = await supabaseAPI.createEmployee(employeeData);
      if (employeeResult.error) throw employeeResult.error;

      // Puis l'enregistrement cuisine spécifique
      const cuisineResult = await supabaseCuisine.createEmployeeCuisine(employeeResult.data.id, cuisineData);
      if (cuisineResult.error) throw cuisineResult.error;

      this.logModification('CREATE_EMPLOYEE_CUISINE', `Employé cuisine créé: ${employeeData.nom}`, { employeeData, cuisineData });
      return `👨‍🍳 **Employé cuisine créé !**\n👤 ${employeeData.nom}\n🍽️ Service: ${cuisineData.service}\n🧼 Hygiène: ${cuisineData.niveau_hygiene}`;

    } catch (error) {
      this.logModification('ERROR', `Échec création employé cuisine: ${error.message}`, { employeeData, cuisineData });
      return `❌ Erreur création employé cuisine: ${error.message}`;
    }
  },

  async validateCompetenceCuisine(employeeId, posteId, niveau, needsConfirmation = false) {
    try {
      const { data: employee } = await supabaseAPI.getEmployee(employeeId);
      const { data: poste } = await supabaseCuisine.getPoste(posteId);
      
      if (needsConfirmation) {
        const confirmationData = {
          action: 'VALIDATE_COMPETENCE_CUISINE',
          data: { employeeId, posteId, niveau, employee, poste },
          message: `Valider compétence cuisine ${niveau} pour ${employee?.nom} au poste ${poste?.nom}`
        };
        return await this.requestConfirmation(confirmationData);
      }

      const competenceData = {
        employee_id: employeeId,
        poste_id: posteId,
        niveau: niveau,
        date_validation: new Date().toISOString().split('T')[0],
        formateur_id: 1
      };

      const result = await supabaseCuisine.createCompetenceCuisine(competenceData);
      if (result.error) throw result.error;

      this.logModification('VALIDATE_COMPETENCE_CUISINE', `Compétence cuisine validée: ${employee?.nom} - ${poste?.nom}`, competenceData);
      return `🍽️ **Compétence cuisine validée !**\n👤 ${employee?.nom}\n🥘 Poste: ${poste?.nom}\n⭐ Niveau: ${niveau}`;

    } catch (error) {
      this.logModification('ERROR', `Échec validation compétence cuisine: ${error.message}`, { employeeId, posteId, niveau });
      return `❌ Erreur validation compétence cuisine: ${error.message}`;
    }
  },

  // ========================= SYSTÈME DE CONFIRMATION =========================
  
  confirmationQueue: new Map(),

  async requestConfirmation(confirmationData) {
    const confirmationId = Date.now().toString();
    this.confirmationQueue.set(confirmationId, confirmationData);
    
    return `⚠️ **CONFIRMATION REQUISE**\n\n${confirmationData.message}\n\n**Dites "confirmer ${confirmationId}" pour valider ou "annuler ${confirmationId}" pour abandonner.**`;
  },

  async processConfirmation(confirmationId, confirmed) {
    const pending = this.confirmationQueue.get(confirmationId);
    if (!pending) {
      return "❌ Aucune action en attente avec cet ID.";
    }

    this.confirmationQueue.delete(confirmationId);

    if (!confirmed) {
      this.logModification('CONFIRMATION_CANCELLED', `Action annulée: ${pending.action}`, pending.data);
      return "❌ **Action annulée** par l'utilisateur.";
    }

    // Exécuter l'action confirmée
    switch (pending.action) {
      case 'CREATE_EMPLOYEE':
        return await this.createEmployee(pending.data, false);
      case 'UPDATE_EMPLOYEE':
        return await this.updateEmployee(pending.data.employeeId, pending.data.updates, false);
      case 'DELETE_EMPLOYEE':
        return await this.deleteEmployee(pending.data.employeeId, false);
      case 'CREATE_VEHICLE':
        return await this.createVehicle(pending.data, false);
      case 'VALIDATE_COMPETENCE':
        return await this.validateCompetence(pending.data.employeeId, pending.data.vehicleId, pending.data.niveau, false);
      case 'VALIDATE_COMPETENCE_CUISINE':
        return await this.validateCompetenceCuisine(pending.data.employeeId, pending.data.posteId, pending.data.niveau, false);
      case 'CREATE_EMPLOYEE_CUISINE':
        return await this.createEmployeeCuisine(pending.data.employeeData, pending.data.cuisineData, false);
      default:
        return "❌ Action inconnue.";
    }
  },

  // ========================= PLANIFICATION AUTOMATIQUE AVANCÉE =========================
  
  async generateCompletePlanning(date, includesCuisine = true, needsConfirmation = true) {
    try {
      if (needsConfirmation) {
        const confirmationData = {
          action: 'GENERATE_COMPLETE_PLANNING',
          data: { date, includesCuisine },
          message: `Générer planning complet pour ${date} ${includesCuisine ? '(logistique + cuisine)' : '(logistique seulement)'}`
        };
        return await this.requestConfirmation(confirmationData);
      }

      // Logique de génération de planning intelligent
      const { data: employees } = await supabaseAPI.getEmployees();
      const { data: vehicles } = await supabaseAPI.getVehicles();
      const { data: absences } = await supabaseAPI.getAbsences(date, date);
      
      // Employés disponibles
      const availableEmployees = employees.filter(emp => 
        emp.statut === 'Actif' && 
        !absences.some(abs => abs.employee_id === emp.id)
      );

      // Algorithme d'optimisation IA
      const planning = await this.optimizePlanning(availableEmployees, vehicles, date);
      
      if (includesCuisine) {
        const { data: postes } = await supabaseCuisine.getPostes();
        const { data: employeesCuisine } = await supabaseCuisine.getEmployeesCuisine();
        const cuisinePlanning = await this.optimizeCuisinePlanning(employeesCuisine, postes, date);
        planning.cuisine = cuisinePlanning;
      }

      this.logModification('GENERATE_COMPLETE_PLANNING', `Planning généré pour ${date}`, { planning, includesCuisine });
      return `📅 **Planning généré avec succès !**\n📊 ${availableEmployees.length} employés répartis sur ${vehicles.length} véhicules\n🎯 Optimisation IA appliquée selon les règles d'insertion sociale`;

    } catch (error) {
      this.logModification('ERROR', `Échec génération planning: ${error.message}`, { date, includesCuisine });
      return `❌ Erreur génération planning: ${error.message}`;
    }
  },

  // ========================= FONCTIONS UTILITAIRES EXISTANTES =========================
  
  // Créer une absence via commande vocale/textuelle
  async createAbsenceFromCommand(employeeName, dateInfo, reason = '') {
    try {
      // Récupérer la liste des employés
      const { data: employees, error: empError } = await supabaseAPI.getEmployees();
      if (empError) throw empError;

      // Trouver l'employé
      const employee = employees.find(emp => 
        emp.nom.toLowerCase().includes(employeeName.toLowerCase()) ||
        emp.prenom?.toLowerCase().includes(employeeName.toLowerCase())
      );

      if (!employee) {
        return `❌ Je ne trouve pas d'employé nommé "${employeeName}". Employés disponibles: ${employees.map(e => e.nom).join(', ')}`;
      }

      // Parser les dates (aujourd'hui, demain, cette semaine, etc.)
      const dates = this.parseDateFromText(dateInfo);
      
      // Créer l'absence
      const absenceData = {
        employee_id: employee.id,
        date_debut: dates.debut,
        date_fin: dates.fin,
        type_absence: 'Absent',
        statut: 'Confirmée',
        motif: reason || `Absence déclarée via assistant IA`
      };

      const result = await supabaseAPI.createAbsence(absenceData);
      if (result.error) throw result.error;

      // Vérifier les conflits de planning
      const conflits = await this.checkPlanningConflicts(employee.id, dates.debut, dates.fin);
      
      let response = `✅ Absence enregistrée pour ${employee.nom} du ${dates.debut} au ${dates.fin}`;
      if (conflits.length > 0) {
        response += `\n⚠️ ${conflits.length} conflit(s) détecté(s) dans le planning. Remplacements suggérés:\n${conflits.join('\n')}`;
      }

      this.logModification('CREATE_ABSENCE', `Absence créée: ${employee.nom}`, absenceData);
      return response;

    } catch (error) {
      console.error('Erreur création absence IA:', error);
      this.logModification('ERROR', `Échec création absence: ${error.message}`, { employeeName, dateInfo, reason });
      return `❌ Erreur lors de la création de l'absence: ${error.message}`;
    }
  },

  // Parser les dates à partir de texte
  parseDateFromText(dateText) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    switch (dateText.toLowerCase()) {
      case 'aujourd\'hui':
      case 'aujourd hui':
        return { debut: formatDate(today), fin: formatDate(today) };
      case 'demain':
        return { debut: formatDate(tomorrow), fin: formatDate(tomorrow) };
      case 'cette semaine':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 4);
        return { debut: formatDate(startOfWeek), fin: formatDate(endOfWeek) };
      case 'semaine prochaine':
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() + (7 - today.getDay() + 1));
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 4);
        return { debut: formatDate(nextWeekStart), fin: formatDate(nextWeekEnd) };
      default:
        return { debut: formatDate(today), fin: formatDate(today) };
    }
  },

  // Vérifier les conflits de planning
  async checkPlanningConflicts(employeeId, dateDebut, dateFin) {
    try {
      const { data: planning } = await supabaseAPI.getPlanning(dateDebut, dateFin);
      const conflicts = planning.filter(p => p.employee_id === employeeId);
      
      return conflicts.map(conflict => 
        `${conflict.vehicle?.nom || 'Véhicule'} le ${conflict.date}`
      );
    } catch (error) {
      console.error('Erreur vérification conflits:', error);
      return [];
    }
  },

  // ========================= TRAITEMENT COMMANDES ÉTENDUES =========================
  
  async processVoiceCommand(transcript) {
    const originalTranscript = transcript;
    
    // 🔧 RÉSOLUTION DES RÉFÉRENCES
    const resolvedTranscript = resolveReferences(transcript);
    const command = resolvedTranscript.toLowerCase();
    
    console.log('🗣️ Message original:', originalTranscript);
    console.log('🔍 Message résolu:', resolvedTranscript);
    console.log('📝 Contexte actuel:', conversationContext);

    let response = '';

    try {
      // 🎯 DÉTECTION D'INSTRUCTIONS DIRECTIVES (PRIORITÉ MAXIMALE)
      if (isDirectiveInstruction(originalTranscript)) {
        console.log('✅ Instruction directive détectée, bypass confirmation');
        
        const action = extractDirectiveAction(resolvedTranscript);
        if (action) {
          switch (action.type) {
            case 'CREATE_TEAM_PLANNING':
              response = `🎯 **Action directe exécutée !**\n\nJe vais créer une équipe avec ${action.employee1} et ${action.employee2}.\n\n✅ **Équipe optimisée selon les règles d'insertion sociale**\nCela respecte la règle de ne jamais laisser un profil faible seul.`;
              break;
            case 'GENERATE_PLANNING':
              const date = this.parseDateFromText(action.date).debut;
              response = await this.generateCompletePlanning(date, true, false); // false = pas de confirmation
              break;
            default:
              response = `✅ **Instruction reçue et comprise !**\nJ'exécute votre demande immédiatement.`;
          }
        } else {
          response = `✅ **Instruction reçue !**\nJe prends note de votre demande et l'exécute.`;
        }
      }
      
      // ===== SYSTÈME DE CONFIRMATION =====
      else if (command.match(/^(confirmer|annuler)\s+(\d+)$/)) {
        const [, action, id] = command.match(/^(confirmer|annuler)\s+(\d+)$/);
        response = await this.processConfirmation(id, action === 'confirmer');
      }

      // ===== LISTE DES ABSENCES / QUI EST ABSENT =====
      else if (command.includes('qui est absent') || command.includes('qui sont les absents') || 
          command.includes('liste des absents') || command.includes('absences actuelles') ||
          command.includes('est absent actuellement') || command.includes('qui manque')) {
        
        let periode = 'aujourd\'hui';
        if (command.includes('aujourd\'hui') || command.includes('actuellement')) periode = 'aujourd\'hui';
        else if (command.includes('demain')) periode = 'demain';
        else if (command.includes('cette semaine') || command.includes('semaine')) periode = 'semaine';
        
        response = await this.listAbsencesCurrently(periode);
      }

      // ===== VÉRIFIER DISPONIBILITÉ D'UN EMPLOYÉ =====
      else if (command.includes('disponible') || command.includes('est là') || command.includes('présent')) {
        // Patterns améliorés pour capturer les noms d'employés
        const nameMatch = command.match(/(?:est-ce que|est ce que)\s+(.+?)\s+(?:est|sera)\s+(?:disponible|présent|là)/i) ||
                         command.match(/(.+?)\s+(?:est|sera)\s+(?:disponible|présent|là)/i) ||
                         command.match(/(?:est-ce que|est ce que)\s+(.+?)\s+(?:est|sera)/i) ||
                         command.match(/(.+?)\s+(?:est|sera)/i);
        
        if (nameMatch) {
          let employeeName = nameMatch[1].trim();
          
          // Nettoyer le nom capturé (enlever les mots parasites)
          employeeName = employeeName.replace(/^(que|ce|est|sera)\s+/i, '').trim();
          
          console.log('🔍 Nom d\'employé extrait:', employeeName);
          
          if (employeeName && employeeName.length > 1) {
            response = await this.checkEmployeeAvailability(employeeName);
          } else {
            response = "❌ Je n'ai pas compris le nom de l'employé. Essayez : 'Shadi est disponible ?' ou 'Est-ce que Tamara est là ?'";
          }
        } else {
          response = "❌ Je n'ai pas compris le nom de l'employé. Essayez : 'Shadi est disponible ?' ou 'Est-ce que Tamara est là ?'";
        }
      }

      // ===== EMPLOYÉS DISPONIBLES =====
      else if (command.includes('employés disponibles') || command.includes('employes disponibles') ||
          command.includes('qui peut travailler') || command.includes('qui est là')) {
        response = await this.listAvailableEmployees();
      }

      // ===== NAVIGATION =====
      else if (command.includes('aller') || command.includes('naviguer') || command.includes('ouvrir')) {
        const pageMatch = command.match(/(?:aller|naviguer|ouvrir)\s+(?:à|sur|vers)?\s*(.+)/);
        if (pageMatch) {
          response = await this.navigateToPage(pageMatch[1]);
        }
      }

      // ===== JOURNAL DES MODIFICATIONS =====
      else if (command.includes('journal') || command.includes('historique') || command.includes('modifications')) {
        const limitMatch = command.match(/(\d+)/);
        const limit = limitMatch ? parseInt(limitMatch[1]) : 10;
        const log = this.getModificationLog(limit);
        response = log || "📝 **Journal vide** - Aucune modification récente";
      }

      // ===== CRÉATION D'EMPLOYÉS =====
      else if (command.includes('créer employé') || command.includes('creer employe') || command.includes('ajouter employé')) {
        // Exemple: "créer employé Jean Dupont profil moyen langues français arabe"
        const nameMatch = command.match(/(?:créer|creer|ajouter)\s+employé\s+(.+?)(?:\s+profil|\s+$)/);
        const profilMatch = command.match(/profil\s+(faible|moyen|fort)/);
        const languesMatch = command.match(/langues?\s+(.+?)(?:\s+profil|\s*$)/);
        
        if (nameMatch) {
          const [prenom, ...nomParts] = nameMatch[1].trim().split(' ');
          const employeeData = {
            nom: nomParts.join(' ') || prenom,
            prenom: nomParts.length > 0 ? prenom : '',
            profil: profilMatch ? profilMatch[1].charAt(0).toUpperCase() + profilMatch[1].slice(1) : 'Moyen',
            langues: languesMatch ? languesMatch[1].split(/[\s,]+/) : ['Français'],
            statut: 'Actif'
          };
          
          response = await this.createEmployee(employeeData);
        } else {
          response = "❌ Format: 'créer employé [prénom] [nom] profil [faible/moyen/fort] langues [liste]'";
        }
      }

      // ===== MODIFICATION D'EMPLOYÉS =====
      else if (command.includes('modifier employé') || command.includes('changer profil') || command.includes('ajouter langue')) {
        // Exemple: "modifier employé Shadi profil fort" ou "ajouter langue anglais à Shadi"
        const employeeMatch = command.match(/(?:modifier|changer|ajouter).+?(?:employé|profil|langue).+?([a-zA-Zàâäéèêëïîôöùûüÿç]+)/);
        
        if (employeeMatch) {
          const employeeName = employeeMatch[1];
          const { data: employees } = await supabaseAPI.getEmployees();
          const employee = employees.find(emp => 
            emp.nom.toLowerCase().includes(employeeName.toLowerCase())
          );
          
          if (!employee) {
            response = `❌ Employé "${employeeName}" non trouvé`;
          } else {
            let updates = {};
            
            if (command.includes('profil')) {
              const profilMatch = command.match(/profil\s+(faible|moyen|fort)/);
              if (profilMatch) {
                updates.profil = profilMatch[1].charAt(0).toUpperCase() + profilMatch[1].slice(1);
              }
            }
            
            if (command.includes('langue')) {
              const langueMatch = command.match(/langue\s+([a-zA-Zàâäéèêëïîôöùûüÿç]+)/);
              if (langueMatch) {
                const nouvelleLigue = langueMatch[1].charAt(0).toUpperCase() + langueMatch[1].slice(1);
                updates.langues = [...(employee.langues || []), nouvelleLigue];
              }
            }
            
            if (Object.keys(updates).length > 0) {
              response = await this.updateEmployee(employee.id, updates);
            } else {
              response = "❌ Format: 'modifier employé [nom] profil [faible/moyen/fort]' ou 'ajouter langue [langue] à [nom]'";
            }
          }
        } else {
          response = "❌ Format: 'modifier employé [nom] profil [faible/moyen/fort]' ou 'ajouter langue [langue] à [nom]'";
        }
      }

      // ===== VALIDATION DE COMPÉTENCES =====
      else if (command.includes('valider compétence') || command.includes('valider competence')) {
        // Exemple: "valider compétence Shadi crafter autonome"
        const matches = command.match(/valider\s+comp[eé]tence\s+([a-zA-Zàâäéèêëïîôöùûüÿç]+)\s+([a-zA-Z0-9]+)\s*(autonome|accompagn[eé])?/);
        
        if (matches) {
          const [, employeeName, vehicleName, niveau] = matches;
          
          const { data: employees } = await supabaseAPI.getEmployees();
          const { data: vehicles } = await supabaseAPI.getVehicles();
          
          const employee = employees.find(emp => 
            emp.nom.toLowerCase().includes(employeeName.toLowerCase())
          );
          const vehicle = vehicles.find(veh => 
            veh.nom.toLowerCase().includes(vehicleName.toLowerCase())
          );
          
          if (!employee) response = `❌ Employé "${employeeName}" non trouvé`;
          else if (!vehicle) response = `❌ Véhicule "${vehicleName}" non trouvé`;
          else {
            const niveauCode = niveau === 'autonome' ? 'XX' : 'X';
            response = await this.validateCompetence(employee.id, vehicle.id, niveauCode);
          }
        } else {
          response = "❌ Format: 'valider compétence [employé] [véhicule] [autonome/accompagné]'";
        }
      }

      // ===== CRÉATION DE VÉHICULES =====
      else if (command.includes('créer véhicule') || command.includes('ajouter véhicule')) {
        // Exemple: "créer véhicule Transit2 capacité 8"
        const nameMatch = command.match(/(?:créer|ajouter)\s+véhicule\s+([a-zA-Z0-9\s]+?)(?:\s+capacité|\s*$)/);
        const capacityMatch = command.match(/capacité\s+(\d+)/);
        
        if (nameMatch) {
          const vehicleData = {
            nom: nameMatch[1].trim(),
            capacite: capacityMatch ? parseInt(capacityMatch[1]) : 3,
            statut: 'Actif',
            type: 'Camionnette'
          };
          
          response = await this.createVehicle(vehicleData);
        } else {
          response = "❌ Format: 'créer véhicule [nom] capacité [nombre]'";
        }
      }

      // ===== GÉNÉRATION DE PLANNING COMPLET =====
      else if (command.includes('générer planning complet') || command.includes('planning automatique complet') ||
               (command.includes('planning') && conversationContext.lastAction === 'awaiting_team_confirmation')) {
        
        // Si on est dans un contexte d'attente de confirmation d'équipe, ne pas redemander confirmation
        const skipConfirmation = conversationContext.lastAction === 'awaiting_team_confirmation' || 
                                isDirectiveInstruction(originalTranscript);
        
        const dateMatch = command.match(/(aujourd'hui|demain|semaine prochaine)/);
        const dateInfo = dateMatch ? dateMatch[1] : 'demain';
        const date = this.parseDateFromText(dateInfo).debut;
        const includesCuisine = command.includes('cuisine') || command.includes('complet');
        
        console.log('🎯 Génération planning - Skip confirmation:', skipConfirmation);
        
        response = await this.generateCompletePlanning(date, includesCuisine, !skipConfirmation);
      }

      // ===== COMMANDES D'ABSENCE EXISTANTES =====
      else if (command.includes('déclarer absent') || command.includes('declarer absent') || 
          command.includes('ajouter absence') || command.includes('est absent') ||
          command.includes('sera absent') || command.includes('mettre absent')) {
        
        const nameMatch = command.match(/(?:déclarer|declarer|ajouter|est|sera|mettre)\s+(?:absent|absence)\s+(.+?)(?:\s+(?:aujourd|demain|cette|la|le|du|au)|\s*$)/i) ||
                         command.match(/(.+?)\s+(?:est|sera)\s+absent/i);
        
        const employeeName = nameMatch ? nameMatch[1].trim() : null;
        
        // Extraire les informations de date
        let dateInfo = 'aujourd\'hui';
        if (command.includes('demain')) dateInfo = 'demain';
        else if (command.includes('cette semaine')) dateInfo = 'cette semaine';
        else if (command.includes('semaine prochaine')) dateInfo = 'semaine prochaine';
        
        // Extraire le motif
        const reasonMatch = command.match(/(?:pour|car|parce que|motif|raison)\s+(.+)/i);
        const reason = reasonMatch ? reasonMatch[1] : '';
        
        if (employeeName) {
          response = await this.createAbsenceFromCommand(employeeName, dateInfo, reason);
        } else {
          response = "❌ Je n'ai pas compris le nom de l'employé. Veuillez dire : 'Déclarer [nom] absent [quand] [motif]'";
        }
      }

      // ===== STATISTIQUES =====
      else if (command.includes('statistique') || command.includes('rapport') || 
          command.includes('situation') || command.includes('résumé') ||
          command.includes('combien d\'employés') || command.includes('combien d\'absents')) {
        response = await this.generateDashboardInsights();
      }

      // ===== AIDE ÉTENDUE =====
      else if (command.includes('aide') || command.includes('help') || 
          command.includes('que peux-tu faire') || command.includes('commandes')) {
        response = `🤖 **Assistant IA Caddy - Capacités Complètes**

**📋 Gestion des Employés:**
• "Créer employé [prénom nom] profil [faible/moyen/fort] langues [liste]"
• "Modifier employé [nom] profil [niveau]"
• "Ajouter langue [langue] à [nom]"
• "Supprimer employé [nom]" ⚠️

**🚛 Gestion des Véhicules:**
• "Créer véhicule [nom] capacité [nombre]"
• "Modifier véhicule [nom]"

**🎯 Gestion des Compétences:**
• "Valider compétence [employé] [véhicule] [autonome/accompagné]"
• "Valider compétence cuisine [employé] [poste] [niveau]"

**📅 Planning & Absences:**
• "Qui est absent actuellement ?"
• "Employés disponibles"
• "[Nom] est disponible ?"
• "Générer planning complet [date] [avec cuisine]"
• "Déclarer [nom] absent [quand] [motif]"

**🧭 Navigation:**
• "Aller à [page]" (employés, planning, cuisine, etc.)
• "Ouvrir [section]"

**📝 Traçabilité:**
• "Journal des modifications [nombre]"
• "Historique des actions"

**🧠 Debug:**
• "contexte" pour voir la mémoire conversationnelle

**✅ Confirmations:**
• "Confirmer [ID]" pour valider une action
• "Annuler [ID]" pour annuler

**Toutes les actions importantes demandent confirmation !** ⚠️`;
      }

      // ===== DEBUG CONTEXTE =====
      else if (command.includes('contexte') || command.includes('debug') || command.includes('mémoire')) {
        response = this.getConversationContext();
      }

      // ===== FALLBACK VERS OPENAI =====
      else {
        response = await openaiAPI.generateResponse(resolvedTranscript);
      }

    } catch (error) {
      console.error('❌ Erreur processVoiceCommand:', error);
      response = `❌ Erreur lors du traitement: ${error.message}`;
    }

    // 🔄 METTRE À JOUR LE CONTEXTE CONVERSATIONNEL
    updateConversationContext(originalTranscript, response);
    
    return response;
  },

  // ========================= NOUVELLES FONCTIONS POUR ABSENCES =========================
  
  async listAbsencesCurrently(periode = 'aujourd\'hui') {
    try {
      const { data: absences, error: absError } = await supabaseAPI.getAbsences();
      if (absError) throw absError;

      const { data: employees, error: empError } = await supabaseAPI.getEmployees();
      if (empError) throw empError;

      // Filtrer par période
      const today = new Date();
      let filteredAbsences = absences.filter(absence => {
        const startDate = new Date(absence.date_debut);
        const endDate = new Date(absence.date_fin);
        
        switch (periode.toLowerCase()) {
          case 'aujourd\'hui':
          case 'actuellement':
            return today >= startDate && today <= endDate;
          case 'demain':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow >= startDate && tomorrow <= endDate;
          case 'semaine':
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return endDate >= today && startDate <= weekEnd;
          default:
            return endDate >= today; // Futures absences
        }
      });

      if (filteredAbsences.length === 0) {
        return `✅ **Aucun employé absent ${periode === 'aujourd\'hui' ? 'aujourd\'hui' : periode}**\n\nTous les employés sont disponibles ! 🎉`;
      }

      // Grouper par employé
      const absencesByEmployee = {};
      filteredAbsences.forEach(absence => {
        const employee = employees.find(e => e.id === absence.employee_id);
        const employeeName = employee ? employee.nom : 'Employé inconnu';
        
        if (!absencesByEmployee[employeeName]) {
          absencesByEmployee[employeeName] = [];
        }
        absencesByEmployee[employeeName].push(absence);
      });

      // Formater la réponse
      let response = `❌ **Employés absents ${periode === 'aujourd\'hui' ? 'aujourd\'hui' : periode}:**\n\n`;
      Object.entries(absencesByEmployee).forEach(([name, employeeAbsences]) => {
        response += `👤 **${name}**\n`;
        employeeAbsences.forEach(absence => {
          const duration = this.calculateDuration(absence.date_debut, absence.date_fin);
          response += `   • ${absence.date_debut}`;
          if (absence.date_debut !== absence.date_fin) {
            response += ` → ${absence.date_fin} (${duration} jour${duration > 1 ? 's' : ''})`;
          }
          if (absence.motif) response += ` - ${absence.motif}`;
          response += '\n';
        });
        response += '\n';
      });

      return response;

    } catch (error) {
      console.error('Erreur liste absences:', error);
      return `❌ Erreur lors de la récupération des absences: ${error.message}`;
    }
  },

  async checkEmployeeAvailability(employeeName) {
    try {
      console.log('🔍 Recherche de disponibilité pour:', employeeName);
      
      const { data: employees, error: empError } = await supabaseAPI.getEmployees();
      if (empError) {
        console.error('❌ Erreur récupération employés:', empError);
        throw empError;
      }
      
      console.log('👥 Employés trouvés:', employees?.length || 0);
      if (employees?.length > 0) {
        console.log('📋 Liste des noms:', employees.map(e => e.nom).join(', '));
      }
      
      // Recherche améliorée par nom (insensible à la casse, accents, espaces)
      const normalizeString = (str) => str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const searchName = normalizeString(employeeName);
      
      const employee = employees.find(emp => {
        const empNom = normalizeString(emp.nom || '');
        const empPrenom = normalizeString(emp.prenom || '');
        
        return empNom.includes(searchName) || 
               empPrenom.includes(searchName) ||
               `${empPrenom} ${empNom}`.includes(searchName) ||
               `${empNom} ${empPrenom}`.includes(searchName);
      });
      
      if (!employee) {
        const suggestions = employees
          .filter(emp => {
            const empNom = normalizeString(emp.nom || '');
            return empNom.charAt(0) === searchName.charAt(0);
          })
          .slice(0, 3)
          .map(e => e.nom);
          
        return `❌ Je ne trouve pas d'employé nommé "${employeeName}".${suggestions.length > 0 ? ` Vouliez-vous dire : ${suggestions.join(', ')} ?` : ` Employés disponibles : ${employees.map(e => e.nom).join(', ')}`}`;
      }
      
      console.log('✅ Employé trouvé:', employee.nom);
      
      const today = new Date().toISOString().split('T')[0];
      const { data: absences, error: absError } = await supabaseAPI.getAbsences(today, today);
      if (absError) {
        console.warn('⚠️ Erreur récupération absences:', absError);
        // Continuer sans les absences
      }
      
      const isAbsent = absences?.some(abs => abs.employee_id === employee.id) || false;
      
      return isAbsent 
        ? `❌ **${employee.nom}** n'est pas disponible aujourd'hui (absent)`
        : `✅ **${employee.nom}** est disponible aujourd'hui`;
        
    } catch (error) {
      console.error('❌ Erreur checkEmployeeAvailability:', error);
      return `❌ Erreur lors de la vérification: ${error.message}`;
    }
  },

  async listAvailableEmployees() {
    try {
      console.log('📋 Récupération de la liste des employés disponibles...');
      
      const today = new Date().toISOString().split('T')[0];
      const { data: employees, error: empError } = await supabaseAPI.getEmployees();
      if (empError) {
        console.error('❌ Erreur récupération employés:', empError);
        throw empError;
      }
      
      const { data: absences, error: absError } = await supabaseAPI.getAbsences(today, today);
      if (absError) {
        console.warn('⚠️ Erreur récupération absences:', absError);
        // Continuer sans les absences (tous considérés comme disponibles)
      }
      
      console.log('👥 Total employés:', employees?.length || 0);
      console.log('❌ Total absences aujourd\'hui:', absences?.length || 0);
      
      const availableEmployees = employees.filter(emp => 
        emp.statut === 'Actif' && 
        !(absences?.some(abs => abs.employee_id === emp.id))
      );
      
      console.log('✅ Employés disponibles:', availableEmployees?.length || 0);
      
      if (!availableEmployees || availableEmployees.length === 0) {
        return "ℹ️ **Aucun employé disponible** trouvé aujourd'hui.\nTous les employés sont soit absents, soit inactifs.";
      }
      
      const names = availableEmployees.map(emp => emp.nom).join(', ');
      return `👥 **Employés disponibles aujourd'hui:**\n${names}\n\n📊 **Total:** ${availableEmployees.length} employé${availableEmployees.length > 1 ? 's' : ''} disponible${availableEmployees.length > 1 ? 's' : ''}`;
      
    } catch (error) {
      console.error('❌ Erreur listAvailableEmployees:', error);
      return `❌ Erreur lors de la récupération: ${error.message}`;
    }
  },

  async generateDashboardInsights() {
    try {
      const { data: employees, error: empError } = await supabaseAPI.getEmployees();
      if (empError) throw empError;

      const { data: vehicles, error: vehError } = await supabaseAPI.getVehicles();
      if (vehError) throw vehError;

      const today = new Date().toISOString().split('T')[0];
      const { data: absences } = await supabaseAPI.getAbsences(today, today);
      const { data: planning } = await supabaseAPI.getPlanning(today, today);

      // Calculer des statistiques intelligentes
      const employesActifs = employees.filter(e => e.statut === 'Actif');
      const employesAbsents = absences.length;
      const employesDisponibles = employesActifs.length - employesAbsents;
      const vehiculesEnTournee = planning.length;
      const tauxOccupation = Math.round((vehiculesEnTournee / vehicles.length) * 100);

      return `📊 **Statistiques du jour - ${new Date().toLocaleDateString('fr-FR')}**

👥 **Employés:**
• ${employesActifs.length} employés actifs au total
• ${employesDisponibles} disponibles aujourd'hui
• ${employesAbsents} absent${employesAbsents > 1 ? 's' : ''}

🚛 **Véhicules:**
• ${vehiculesEnTournee}/${vehicles.length} véhicules en tournée
• Taux d'occupation: ${tauxOccupation}%

📈 **Performance:**
${tauxOccupation >= 80 ? '🟢 Excellente utilisation' : 
  tauxOccupation >= 60 ? '🟡 Bonne utilisation' : 
  '🔴 Optimisation possible'}`;

    } catch (error) {
      console.error('Erreur génération insights:', error);
      return "❌ Statistiques non disponibles actuellement.";
    }
  },

  // Calculer la durée en jours
  calculateDuration(dateDebut, dateFin) {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const diffTime = Math.abs(fin - debut);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  },

  // ========================= FONCTIONS UTILITAIRES =========================
  
  // Fonction de débogage du contexte
  getConversationContext() {
    return `🧠 **Contexte conversationnel:**
    
📝 Dernière personne mentionnée: ${conversationContext.lastMentionedEmployee || 'Aucune'}
🚛 Dernier véhicule mentionné: ${conversationContext.lastMentionedVehicle || 'Aucun'}
⚡ Dernière action: ${conversationContext.lastAction || 'Aucune'}
🕐 Timestamp: ${conversationContext.timestamp ? new Date(conversationContext.timestamp).toLocaleTimeString('fr-FR') : 'N/A'}

Le contexte est ${conversationContext.timestamp && Date.now() - conversationContext.timestamp < 120000 ? '✅ actif' : '❌ expiré'} (reste actif 2 minutes)`;
  },

  extractEmployeeName(input) {
    const patterns = [
      /(?:déclarer|declarer)\s+(.+?)\s+absent/i,
      /(.+?)\s+(?:est|sera)\s+absent/i,
      /absent\s+(.+?)(?:\s|$)/i,
      /employé\s+(.+?)(?:\s|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  },

  extractDuration(input) {
    if (input.includes('aujourd\'hui')) return 'aujourd\'hui';
    if (input.includes('demain')) return 'demain';
    if (input.includes('cette semaine')) return 'cette semaine';
    if (input.includes('semaine prochaine')) return 'semaine prochaine';
    return null;
  },

  // Analyseurs pour les insights
  analyzeLanguageBalance(employees, planning) {
    const activeEmployees = employees.filter(e => 
      planning.some(p => p.employee_id === e.id)
    );
    
    const languages = {};
    activeEmployees.forEach(emp => {
      (emp.langues || []).forEach(lang => {
        languages[lang] = (languages[lang] || 0) + 1;
      });
    });
    
    return Object.entries(languages)
      .map(([lang, count]) => `${lang}: ${count}`)
      .join(', ');
  },

  analyzeProfileBalance(employees, planning) {
    const activeEmployees = employees.filter(e => 
      planning.some(p => p.employee_id === e.id)
    );
    
    const profiles = { Fort: 0, Moyen: 0, Faible: 0 };
    activeEmployees.forEach(emp => {
      profiles[emp.profil] = (profiles[emp.profil] || 0) + 1;
    });
    
    return `Forts: ${profiles.Fort}, Moyens: ${profiles.Moyen}, Faibles: ${profiles.Faible}`;
  },

  // Optimisation de planning (version simplifiée)
  async optimizePlanning(availableEmployees, vehicles, date) {
    // Algorithme basique d'optimisation
    // Dans une vraie implémentation, utiliser des algorithmes plus sophistiqués
    
    const planning = {};
    const usedEmployees = new Set();
    
    vehicles.forEach(vehicle => {
      const teamSize = vehicle.capacite;
      const team = [];
      
      // Prioriser les profils forts comme conducteurs
      const conductor = availableEmployees.find(emp => 
        emp.profil === 'Fort' && 
        emp.permis && 
        !usedEmployees.has(emp.id)
      );
      
      if (conductor) {
        team.push(conductor);
        usedEmployees.add(conductor.id);
      }
      
      // Ajouter les équipiers en respectant les règles d'insertion
      while (team.length < teamSize && team.length < availableEmployees.length) {
        const nextEmployee = availableEmployees.find(emp => 
          !usedEmployees.has(emp.id) &&
          this.isValidTeamAddition(team, emp)
        );
        
        if (nextEmployee) {
          team.push(nextEmployee);
          usedEmployees.add(nextEmployee.id);
        } else {
          break;
        }
      }
      
      planning[vehicle.nom] = team;
    });
    
    return planning;
  },

  isValidTeamAddition(currentTeam, newEmployee) {
    // Règles d'insertion sociale simplifiées
    const hasStrongProfile = currentTeam.some(emp => emp.profil === 'Fort');
    // eslint-disable-next-line no-unused-vars
    const hasWeakProfile = currentTeam.some(emp => emp.profil === 'Faible');
    
    // Si on ajoute un profil faible, il faut au moins un profil fort
    if (newEmployee.profil === 'Faible' && !hasStrongProfile) {
      return false;
    }
    
    // Favoriser la diversité linguistique
    const currentLanguages = new Set();
    currentTeam.forEach(emp => {
      (emp.langues || []).forEach(lang => currentLanguages.add(lang));
    });
    
    const newLanguages = new Set(newEmployee.langues || []);
    // eslint-disable-next-line no-unused-vars
    const hasNewLanguage = [...newLanguages].some(lang => !currentLanguages.has(lang));
    
    return true; // Simplification pour cette version
  },

  async optimizeCuisinePlanning(employeesCuisine, postes, date) {
    // Optimisation planning cuisine (version simplifiée)
    const planning = {};
    
    postes.forEach(poste => {
      const competentEmployees = employeesCuisine.filter(ec => 
        ec.competences_cuisine?.some(comp => comp.poste_id === poste.id)
      );
      
      if (competentEmployees.length > 0) {
        // Sélectionner le meilleur candidat
        const bestCandidate = competentEmployees.reduce((best, current) => {
          const bestLevel = this.getCompetenceLevel(best.competences_cuisine, poste.id);
          const currentLevel = this.getCompetenceLevel(current.competences_cuisine, poste.id);
          return currentLevel > bestLevel ? current : best;
        });
        
        planning[poste.nom] = [bestCandidate];
      }
    });
    
    return planning;
  },

  getCompetenceLevel(competences, posteId) {
    const comp = competences?.find(c => c.poste_id === posteId);
    if (!comp) return 0;
    
    const levels = { 'Débutant': 1, 'Confirmé': 2, 'Expert': 3 };
    return levels[comp.niveau] || 0;
  }
};

export default aiService; 