// Assistant IA Chatbot pour la gestion du planning cuisine
import { supabaseCuisine } from './supabase-cuisine';
import { supabaseAPI } from './supabase';
import { PlanningAIHelpers } from './planning-ai';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';

/**
 * Configuration des patterns de commandes intelligents
 */
const COMMAND_PATTERNS = {
  // Questions sur les absences
  absence_query: {
    patterns: [
      /qui\s+est\s+absent/i,
      /qui\s+n'est\s+pas\s+là/i,
      /absences?\s+(d'aujourd'hui|aujourd'hui|du\s+jour)/i,
      /qui\s+manque/i,
      /employés?\s+absent/i
    ],
    action: 'handleAbsenceQuery'
  },
  
  // Déclaration d'absences
  absence_declare: {
    patterns: [
      /(\w+(?:\s+\w+)*)\s+est\s+absent[e]?/i,
      /déclarer?\s+(\w+(?:\s+\w+)*)\s+absent[e]?/i,
      /(\w+(?:\s+\w+)*)\s+absent[e]?\s+(demain|aujourd'hui|le)/i,
      /mettre\s+(\w+(?:\s+\w+)*)\s+en\s+absence/i
    ],
    action: 'handleAbsenceDeclaration'
  },
  
  // Questions sur les compétences  
  competence_query: {
    patterns: [
      /qui\s+peut\s+(travailler\s+sur|faire)\s+(.+)/i,
      /qui\s+est\s+formé[e]?\s+sur\s+(.+)/i,
      /employés?\s+(formés?|qualifiés?)\s+(.+)/i,
      /remplaçants?\s+pour\s+(.+)/i
    ],
    action: 'handleCompetenceQuery'
  },
  
  // Formation d'employés
  competence_train: {
    patterns: [
      /former?\s+(\w+(?:\s+\w+)*)\s+sur\s+(.+)/i,
      /donner?\s+la\s+compétence\s+(.+)\s+à\s+(\w+(?:\s+\w+)*)/i,
      /(\w+(?:\s+\w+)*)\s+apprend\s+(.+)/i,
      /certifier\s+(\w+(?:\s+\w+)*)\s+(en|sur)\s+(.+)/i
    ],
    action: 'handleCompetenceTrain'
  },
  
  // Gestion des profils
  profil_change: {
    patterns: [
      /(\w+(?:\s+\w+)*)\s+devient\s+(faible|moyen|fort)/i,
      /changer?\s+(\w+(?:\s+\w+)*)\s+(en|vers)\s+(faible|moyen|fort)/i,
      /modifier?\s+profil\s+(\w+(?:\s+\w+)*)/i,
      /passer\s+(\w+(?:\s+\w+)*)\s+(en|à)\s+(faible|moyen|fort)/i
    ],
    action: 'handleProfilChange'
  },
  
  // Planning
  planning_auto: {
    patterns: [
      /(générer|créer|faire)\s+(le\s+)?planning/i,
      /planning\s+automatique/i,
      /optimiser?\s+(le\s+)?planning/i,
      /réorganiser\s+(le\s+)?planning/i
    ],
    action: 'handlePlanningGeneration'
  },
  
  // Analyses et statistiques
  analysis: {
    patterns: [
      /analys[er]?\s+(.+)/i,
      /statistiques?\s+(.+)/i,
      /rapport\s+(.+)/i,
      /état\s+(.+)/i,
      /bilan\s+(.+)/i,
      /comment\s+va\s+(.+)/i
    ],
    action: 'handleAnalysisRequest'
  },
  
  // Questions d'information
  info_question: {
    patterns: [
      /qui\s+est\s+(\w+(?:\s+\w+)*)\s*\?/i,
      /infos?\s+sur\s+(\w+(?:\s+\w+)*)/i,
      /dis-moi\s+(.+)/i,
      /qu'est-ce\s+que\s+(.+)/i,
      /combien\s+(.+)/i
    ],
    action: 'handleInfoQuestion'
  },
  
  // Suggestions et aide
  help_request: {
    patterns: [
      /(aide|help|suggestions?|conseils?)/i,
      /que\s+peux-tu\s+faire/i,
      /comment\s+(ça\s+marche|utiliser)/i,
      /(améliorer|optimiser)\s+(.+)/i
    ],
    action: 'handleHelpRequest'
  }
};

/**
 * Classe principale du chatbot IA
 */
class AIChatbot {
  constructor() {
    this.employees = [];
    this.postes = [];
    this.competences = {};
    this.isInitialized = false;
  }

  /**
   * Initialise le chatbot avec les données
   */
  async initialize() {
    try {
      const [employeesRes, postesRes, competencesRes] = await Promise.all([
        supabaseCuisine.getEmployeesCuisineWithCompetences(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple()
      ]);

      this.employees = employeesRes.data || [];
      this.postes = postesRes.data || [];
      
      // Map des compétences
      this.competences = {};
      (competencesRes.data || []).forEach(comp => {
        if (!this.competences[comp.employee_id]) {
          this.competences[comp.employee_id] = [];
        }
        this.competences[comp.employee_id].push(comp);
      });

      this.isInitialized = true;
      return { success: true };
    } catch (error) {
      console.error('Erreur initialisation chatbot:', error);
      return { success: false, error };
    }
  }

  /**
   * Parse une commande utilisateur et retourne l'action à exécuter
   */
  parseCommand(message) {
    const text = message.trim();
    
    for (const [commandType, config] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of config.patterns) {
        const match = text.match(pattern);
        if (match) {
          return {
            type: commandType,
            action: config.action,
            matches: match,
            originalMessage: text
          };
        }
      }
    }
    
    return { type: 'unknown', action: 'handleUnknown', originalMessage: text };
  }

  /**
   * Trouve un employé par nom/prénom
   */
  findEmployee(name) {
    const searchName = name.toLowerCase().trim();
    return this.employees.find(emp => {
      const fullName = `${emp.employee.prenom} ${emp.employee.nom}`.toLowerCase();
      const reverseName = `${emp.employee.nom} ${emp.employee.prenom}`.toLowerCase();
      return fullName.includes(searchName) || 
             reverseName.includes(searchName) ||
             emp.employee.nom.toLowerCase().includes(searchName) ||
             emp.employee.prenom.toLowerCase().includes(searchName);
    });
  }

  /**
   * Trouve un poste par nom
   */
  findPoste(name) {
    const searchName = name.toLowerCase().trim();
    return this.postes.find(poste => 
      poste.nom.toLowerCase().includes(searchName)
    );
  }

  /**
   * Parse une date depuis le texte
   */
  parseDate(dateText) {
    if (!dateText) return new Date();
    
    const text = dateText.toLowerCase().trim();
    const today = new Date();
    
    // Mots-clés temporels
    if (text.includes('aujourd\'hui') || text.includes('auj')) {
      return today;
    }
    if (text.includes('demain')) {
      return addDays(today, 1);
    }
    if (text.includes('lundi')) {
      const monday = startOfWeek(today, { weekStartsOn: 1 });
      return monday;
    }
    if (text.includes('cette semaine')) {
      return startOfWeek(today, { weekStartsOn: 1 });
    }
    
    // Format date (DD/MM/YYYY ou YYYY-MM-DD)
    const dateMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      return new Date(year, month - 1, day);
    }
    
    const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return parseISO(isoMatch[0]);
    }
    
    return today;
  }

  /**
   * Gère les questions sur les absences ("qui est absent ?")
   */
  async handleAbsenceQuery(matches) {
    try {
      // Charger les absences actuelles
      const today = new Date();
      
      const absencesResult = await supabaseCuisine.getAbsencesCuisine();
      const absences = absencesResult.data || [];
      
      // Filtrer les absences d'aujourd'hui
      const todayAbsences = absences.filter(absence => {
        const debut = parseISO(absence.date_debut);
        const fin = parseISO(absence.date_fin);
        return today >= debut && today <= fin;
      });
      
      if (todayAbsences.length === 0) {
        return {
          success: true,
          message: '✅ **Excellente nouvelle !** Aucun employé absent aujourd\'hui.\n\n👥 Toute l\'équipe cuisine est disponible.'
        };
      }
      
      // Construire la réponse
      let response = `👥 **Absences du jour** (${format(today, 'dd/MM/yyyy')}) :\n\n`;
      
      for (const absence of todayAbsences) {
        const employee = this.employees.find(emp => emp.employee.id === absence.employee_id);
        const name = employee ? `${employee.employee.prenom} ${employee.employee.nom}` : 'Employé inconnu';
        
        response += `🔴 **${name}**\n`;
        response += `   📅 Du ${format(parseISO(absence.date_debut), 'dd/MM')} au ${format(parseISO(absence.date_fin), 'dd/MM')}\n`;
        if (absence.motif) {
          response += `   💬 Motif: ${absence.motif}\n`;
        }
        response += '\n';
      }
      
      // Suggestions de remplacements
      response += `💡 **Actions suggérées :**\n`;
      response += `• Vérifier la couverture des postes critiques\n`;
      response += `• Réorganiser le planning si nécessaire\n`;
      response += `• Dites "Optimiser le planning" pour ajustement automatique`;
      
      return {
        success: true,
        message: response
      };
    } catch (error) {
      console.error('Erreur handleAbsenceQuery:', error);
      return {
        success: false,
        message: `❌ Erreur lors de la vérification des absences.`
      };
    }
  }

  /**
   * Gère les déclarations d'absences
   */
  async handleAbsenceDeclaration(matches) {
    try {
      const employeeName = matches[1];
      const dateContext = matches[2] || matches[3] || 'aujourd\'hui';
      
      const employee = this.findEmployee(employeeName);
      if (!employee) {
        // Suggestion intelligente si nom pas trouvé
        const suggestions = this.employees
          .filter(emp => {
            const fullName = `${emp.employee.prenom} ${emp.employee.nom}`.toLowerCase();
            return fullName.includes(employeeName.toLowerCase().substring(0, 3));
          })
          .slice(0, 3)
          .map(emp => `${emp.employee.prenom} ${emp.employee.nom}`)
          .join(', ');
        
        let message = `❌ Employé "${employeeName}" non trouvé.`;
        if (suggestions) {
          message += `\n\n💡 **Vouliez-vous dire :** ${suggestions} ?`;
        }
        
        return {
          success: false,
          message
        };
      }
      
      const date = this.parseDate(dateContext);
      
      // Créer l'absence
      const absenceData = {
        employee_id: employee.employee.id,
        date_debut: format(date, 'yyyy-MM-dd'),
        date_fin: format(date, 'yyyy-MM-dd'),
        type_absence: 'Absent',
        statut: 'Confirmée',
        motif: 'Déclaré par IA'
      };
      
      const result = await supabaseCuisine.createAbsenceCuisine(absenceData);
      
      if (result.error) {
        return {
          success: false,
          message: `❌ Erreur lors de la déclaration : ${result.error.message}`
        };
      }
      
      return {
        success: true,
        message: `✅ **${employee.employee.prenom} ${employee.employee.nom}** déclaré(e) absent(e) le ${format(date, 'dd/MM/yyyy')}.\n\n📋 Absence enregistrée avec succès.`
      };
    } catch (error) {
      console.error('Erreur handleAbsenceDeclaration:', error);
      return {
        success: false,
        message: `❌ Erreur technique lors de la déclaration d'absence.`
      };
    }
  }

  /**
   * Gère les questions sur les compétences ("qui peut faire X ?")
   */
  async handleCompetenceQuery(matches) {
    try {
      const posteQuery = matches[2] || matches[1];
      const poste = this.findPoste(posteQuery);
      
      if (!poste) {
        const suggestions = this.postes
          .filter(p => p.nom.toLowerCase().includes(posteQuery.toLowerCase().substring(0, 3)))
          .slice(0, 3)
          .map(p => p.nom)
          .join(', ');
        
        let message = `❌ Poste "${posteQuery}" non reconnu.`;
        if (suggestions) {
          message += `\n\n💡 **Postes disponibles :** ${suggestions}`;
        } else {
          message += `\n\n📋 **Tous les postes :** ${this.postes.map(p => p.nom).join(', ')}`;
        }
        
        return {
          success: false,
          message
        };
      }
      
      // Trouver les employés qualifiés
      const qualified = this.employees.filter(emp => {
        const competences = this.competences[emp.employee.id] || [];
        return competences.some(c => c.poste_id === poste.id);
      });
      
      if (qualified.length === 0) {
        return {
          success: true,
          message: `⚠️ **Aucun employé formé sur ${poste.nom}** actuellement.\n\n💡 **Suggestion :** Former quelqu'un rapidement sur ce poste critique.`
        };
      }
      
      // Construire la réponse avec détails
      let response = `👥 **Employés qualifiés pour ${poste.nom}** :\n\n`;
      
      qualified.forEach(emp => {
        const profil = emp.employee.profil;
        const profilIcon = profil === 'Fort' ? '🌟' : profil === 'Moyen' ? '⭐' : '📍';
        response += `${profilIcon} **${emp.employee.prenom} ${emp.employee.nom}** (${profil})\n`;
      });
      
      response += `\n📊 **${qualified.length} employé${qualified.length > 1 ? 's' : ''} disponible${qualified.length > 1 ? 's' : ''}** sur ce poste.`;
      
      return {
        success: true,
        message: response
      };
    } catch (error) {
      console.error('Erreur handleCompetenceQuery:', error);
      return {
        success: false,
        message: `❌ Erreur lors de la recherche de compétences.`
      };
    }
  }

  /**
   * Gère la formation d'employés sur des postes
   */
  async handleCompetenceTrain(matches) {
    try {
      let employeeName, posteName;
      
      // Déterminer l'ordre selon le pattern matched
      if (matches[0].toLowerCase().includes('donner')) {
        // "donner la compétence X à Y"
        posteName = matches[1];
        employeeName = matches[2];
      } else {
        // "former X sur Y"
        employeeName = matches[1];
        posteName = matches[2] || matches[3];
      }
      
      const employee = this.findEmployee(employeeName);
      const poste = this.findPoste(posteName);
      
      if (!employee) {
        const suggestions = this.employees
          .filter(emp => {
            const fullName = `${emp.employee.prenom} ${emp.employee.nom}`.toLowerCase();
            return fullName.includes(employeeName.toLowerCase().substring(0, 3));
          })
          .slice(0, 3)
          .map(emp => `${emp.employee.prenom} ${emp.employee.nom}`)
          .join(', ');
        
        let message = `❌ Employé "${employeeName}" non trouvé.`;
        if (suggestions) {
          message += `\n\n💡 **Vouliez-vous dire :** ${suggestions} ?`;
        }
        
        return {
          success: false,
          message
        };
      }
      
      if (!poste) {
        const suggestions = this.postes
          .filter(p => p.nom.toLowerCase().includes(posteName.toLowerCase().substring(0, 3)))
          .slice(0, 3)
          .map(p => p.nom)
          .join(', ');
        
        let message = `❌ Poste "${posteName}" non reconnu.`;
        if (suggestions) {
          message += `\n\n💡 **Postes disponibles :** ${suggestions}`;
        }
        
        return {
          success: false,
          message
        };
      }
      
      // Vérifier si la compétence existe déjà
      const existingCompetence = this.competences[employee.employee.id]?.find(c => c.poste_id === poste.id);
      if (existingCompetence) {
        return {
          success: false,
          message: `ℹ️ **${employee.employee.prenom} ${employee.employee.nom}** est déjà formé(e) sur **${poste.nom}**.\n\n✅ Aucune action nécessaire.`
        };
      }
      
      // Ajouter la compétence
      const competenceData = {
        employee_id: employee.employee.id,
        poste_id: poste.id,
        niveau: 'Formé',
        date_validation: format(new Date(), 'yyyy-MM-dd'),
        formateur_id: 1 // ID de l'IA ou utilisateur actuel
      };
      
      const result = await supabaseCuisine.createCompetenceCuisine(competenceData);
      
      if (result.error) {
        return {
          success: false,
          message: `❌ Erreur lors de l'ajout de la compétence : ${result.error.message}`
        };
      }
      
      // Mettre à jour le cache local
      if (!this.competences[employee.employee.id]) {
        this.competences[employee.employee.id] = [];
      }
      this.competences[employee.employee.id].push(result.data);
      
      return {
        success: true,
        message: `✅ **${employee.employee.prenom} ${employee.employee.nom}** est maintenant formé(e) sur **${poste.nom}** !\n\n🎯 Formation validée et enregistrée.`
      };
    } catch (error) {
      console.error('Erreur handleCompetenceTrain:', error);
      return {
        success: false,
        message: `❌ Erreur technique lors de la formation.`
      };
    }
  }

  /**
   * Gère le changement de profil
   */
  async handleProfilChange(matches) {
    try {
      const employeeName = matches[1];
      const newProfil = matches[2];
      
      const employee = this.findEmployee(employeeName);
      if (!employee) {
        return {
          success: false,
          message: `❌ Employé "${employeeName}" non trouvé.`
        };
      }
      
      // Valider le profil
      const validProfils = ['Faible', 'Moyen', 'Fort'];
      const normalizedProfil = newProfil.charAt(0).toUpperCase() + newProfil.slice(1).toLowerCase();
      
      if (!validProfils.includes(normalizedProfil)) {
        return {
          success: false,
          message: `❌ Profil "${newProfil}" invalide. Profils disponibles: ${validProfils.join(', ')}`
        };
      }
      
      // Mettre à jour le profil
      const result = await supabaseAPI.updateEmployee(employee.employee.id, {
        profil: normalizedProfil
      });
      
      if (result.error) {
        return {
          success: false,
          message: `❌ Erreur lors de la modification du profil : ${result.error.message}`
        };
      }
      
      return {
        success: true,
        message: `✅ Profil de ${employee.employee.prenom} ${employee.employee.nom} modifié de "${employee.employee.profil}" vers "${normalizedProfil}".`
      };
    } catch (error) {
      console.error('Erreur handleProfilChange:', error);
      return {
        success: false,
        message: `❌ Erreur technique lors de la modification du profil.`
      };
    }
  }

  /**
   * Gère la génération/optimisation de planning
   */
  async handlePlanningGeneration(matches) {
    try {
      const isOptimize = matches[0].toLowerCase().includes('optimiser');
      const date = new Date();
      
      let result;
      if (isOptimize) {
        result = await PlanningAIHelpers.optimizeExistingPlanning(date);
      } else {
        result = await PlanningAIHelpers.generateWeeklyPlanning(date);
      }
      
      if (result.success) {
        const action = isOptimize ? 'optimisé' : 'généré';
        return {
          success: true,
          message: `✅ **Planning ${action} avec succès !**\n\n📊 ${result.successful} assignations créées\n📅 Semaine du ${format(startOfWeek(date, { weekStartsOn: 1 }), 'dd/MM/yyyy')}`
        };
      } else {
        return {
          success: false,
          message: `❌ Erreur lors de la génération : ${result.error?.message || 'Erreur inconnue'}`
        };
      }
    } catch (error) {
      console.error('Erreur handlePlanningGeneration:', error);
      return {
        success: false,
        message: `❌ Erreur technique lors de la génération du planning.`
      };
    }
  }

  /**
   * Gère les questions d'information
   */
  async handleInfoQuestion(matches) {
    const searchTerm = matches[1];
    const employee = this.findEmployee(searchTerm);
    
    if (employee) {
      const competences = this.competences[employee.employee.id] || [];
      const competenceNames = competences.map(c => {
        const poste = this.postes.find(p => p.id === c.poste_id);
        return poste ? poste.nom : 'Poste inconnu';
      });
      
      let info = `👤 **${employee.employee.prenom} ${employee.employee.nom}**\n\n`;
      info += `📊 **Profil :** ${employee.employee.profil}\n`;
      info += `🗣️ **Langues :** ${employee.employee.langues?.join(', ') || 'Aucune'}\n`;
      info += `🎯 **Service :** ${employee.service}\n`;
      info += `⚡ **Compétences :** ${competenceNames.length > 0 ? competenceNames.join(', ') : 'Aucune'}\n`;
      info += `🏆 **Polyvalence :** ${competenceNames.length}/${this.postes.length} postes maîtrisés`;
      
      return {
        success: true,
        message: info
      };
    }
    
    return {
      success: false,
      message: `❌ Aucune information trouvée pour "${searchTerm}".`
    };
  }

  /**
   * Analyse du planning actuel
   */
  async analyzePlanning() {
    try {
      // Charger les données de planning récentes
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      
      const planningData = await supabaseCuisine.getPlanningCuisineRange(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      
      const planning = planningData.data || [];
      
      // Statistiques
      const stats = {
        totalAssignments: planning.length,
        uniqueEmployees: new Set(planning.map(p => p.employee_id)).size,
        postseCovered: new Set(planning.map(p => p.poste_id)).size,
        creneauxCovered: new Set(planning.map(p => p.creneau)).size
      };
      
      // Répartition par poste
      const posteStats = {};
      planning.forEach(p => {
        const poste = this.postes.find(pos => pos.id === p.poste_id);
        if (poste) {
          posteStats[poste.nom] = (posteStats[poste.nom] || 0) + 1;
        }
      });
      
      // Répartition par employé
      const employeeStats = {};
      planning.forEach(p => {
        const emp = this.employees.find(e => e.employee.id === p.employee_id);
        if (emp) {
          const name = `${emp.employee.prenom} ${emp.employee.nom}`;
          employeeStats[name] = (employeeStats[name] || 0) + 1;
        }
      });
      
      let report = `📊 **Analyse du Planning** (Semaine du ${format(weekStart, 'dd/MM/yyyy')})\n\n`;
      report += `🎯 **Vue d'ensemble :**\n`;
      report += `• ${stats.totalAssignments} assignations totales\n`;
      report += `• ${stats.uniqueEmployees} employés mobilisés\n`;
      report += `• ${stats.postseCovered} postes couverts\n`;
      report += `• ${stats.creneauxCovered} créneaux différents\n\n`;
      
      report += `📍 **Répartition par poste :**\n`;
      Object.entries(posteStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([poste, count]) => {
          report += `• ${poste}: ${count} assignations\n`;
        });
      
      report += `\n👥 **Top employés les plus sollicités :**\n`;
      Object.entries(employeeStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([name, count]) => {
          report += `• ${name}: ${count} services\n`;
        });
      
      return {
        success: true,
        message: report
      };
    } catch (error) {
      console.error('Erreur analyzePlanning:', error);
      return {
        success: false,
        message: `❌ Erreur lors de l'analyse du planning.`
      };
    }
  }

  /**
   * Analyse des compétences de l'équipe
   */
  async analyzeTeamCompetences() {
    try {
      let report = `🎯 **Analyse des Compétences Équipe**\n\n`;
      
      // Répartition par profil
      const profileStats = {};
      this.employees.forEach(emp => {
        const profil = emp.employee.profil;
        profileStats[profil] = (profileStats[profil] || 0) + 1;
      });
      
      report += `👤 **Répartition par profil :**\n`;
      Object.entries(profileStats).forEach(([profil, count]) => {
        const percentage = ((count / this.employees.length) * 100).toFixed(1);
        report += `• ${profil}: ${count} employés (${percentage}%)\n`;
      });
      
      // Compétences par poste
      report += `\n⚡ **Couverture par poste :**\n`;
      for (const poste of this.postes) {
        const qualified = this.employees.filter(emp => {
          const competences = this.competences[emp.employee.id] || [];
          return competences.some(c => c.poste_id === poste.id);
        });
        
        const coverage = qualified.length;
        const status = coverage >= 3 ? '🟢' : coverage >= 2 ? '🟡' : '🔴';
        
        report += `${status} ${poste.nom}: ${coverage} employés formés\n`;
      }
      
      // Polyvalence
      const polyvalence = this.employees.map(emp => {
        const competences = this.competences[emp.employee.id] || [];
        return {
          name: `${emp.employee.prenom} ${emp.employee.nom}`,
          count: competences.length
        };
      }).sort((a, b) => b.count - a.count);
      
      report += `\n🌟 **Top polyvalence :**\n`;
      polyvalence.slice(0, 5).forEach(emp => {
        report += `• ${emp.name}: ${emp.count} compétences\n`;
      });
      
      // Recommandations
      report += `\n💡 **Recommandations :**\n`;
      const lowCoverage = this.postes.filter(poste => {
        const qualified = this.employees.filter(emp => {
          const competences = this.competences[emp.employee.id] || [];
          return competences.some(c => c.poste_id === poste.id);
        });
        return qualified.length < 2;
      });
      
      if (lowCoverage.length > 0) {
        report += `• Former plus d'employés sur: ${lowCoverage.map(p => p.nom).join(', ')}\n`;
      }
      
      const lowPolyvalence = polyvalence.filter(emp => emp.count < 2);
      if (lowPolyvalence.length > 0) {
        report += `• Développer la polyvalence de: ${lowPolyvalence.slice(0, 3).map(emp => emp.name.split(' ')[0]).join(', ')}\n`;
      }
      
      return {
        success: true,
        message: report
      };
    } catch (error) {
      console.error('Erreur analyzeTeamCompetences:', error);
      return {
        success: false,
        message: `❌ Erreur lors de l'analyse des compétences.`
      };
    }
  }

  /**
   * Analyse de la charge de travail
   */
  async analyzeWorkload() {
    try {
      // Charger le planning de la semaine
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      
      const planningData = await supabaseCuisine.getPlanningCuisineRange(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      
      const planning = planningData.data || [];
      
      // Calcul charge par employé
      const workload = {};
      this.employees.forEach(emp => {
        const empAssignments = planning.filter(p => p.employee_id === emp.employee.id);
        const hours = empAssignments.length * 2.5; // Moyenne heures par service
        
        workload[emp.employee.id] = {
          name: `${emp.employee.prenom} ${emp.employee.nom}`,
          assignments: empAssignments.length,
          hours: hours,
          profil: emp.employee.profil
        };
      });
      
      // Tri par charge
      const sortedWorkload = Object.values(workload).sort((a, b) => b.hours - a.hours);
      
      let report = `⚖️ **Analyse Charge de Travail** (Semaine courante)\n\n`;
      
      // Vue d'ensemble
      const totalHours = sortedWorkload.reduce((sum, emp) => sum + emp.hours, 0);
      const avgHours = totalHours / sortedWorkload.length;
      
      report += `📊 **Vue d'ensemble :**\n`;
      report += `• Total heures équipe: ${totalHours.toFixed(1)}h\n`;
      report += `• Moyenne par employé: ${avgHours.toFixed(1)}h\n\n`;
      
      // Top charges
      report += `🔥 **Plus chargés :**\n`;
      sortedWorkload.slice(0, 5).forEach(emp => {
        const status = emp.hours > 30 ? '🔴' : emp.hours > 20 ? '🟡' : '🟢';
        report += `${status} ${emp.name}: ${emp.hours}h (${emp.assignments} services)\n`;
      });
      
      // Sous-utilisés
      const underused = sortedWorkload.filter(emp => emp.hours < 15);
      if (underused.length > 0) {
        report += `\n💡 **Disponibilités :**\n`;
        underused.forEach(emp => {
          report += `• ${emp.name}: ${emp.hours}h (peut prendre +${(25 - emp.hours).toFixed(1)}h)\n`;
        });
      }
      
      // Équilibrage
      const overworked = sortedWorkload.filter(emp => emp.hours > 30);
      if (overworked.length > 0 && underused.length > 0) {
        report += `\n🔄 **Suggestions d'équilibrage :**\n`;
        report += `• Transférer ${((overworked[0]?.hours || 0) - 25).toFixed(1)}h de ${overworked[0]?.name} vers ${underused[0]?.name}\n`;
      }
      
      return {
        success: true,
        message: report
      };
    } catch (error) {
      console.error('Erreur analyzeWorkload:', error);
      return {
        success: false,
        message: `❌ Erreur lors de l'analyse de la charge.`
      };
    }
  }

  /**
   * Génère un rapport général
   */
  async generateGeneralReport() {
    try {
      const today = new Date();
      let report = `📈 **Rapport Général Cuisine** (${format(today, 'dd/MM/yyyy')})\n\n`;
      
      // Effectifs
      report += `👥 **Effectifs :**\n`;
      report += `• ${this.employees.length} employés actifs\n`;
      report += `• ${this.postes.length} postes à couvrir\n\n`;
      
      // Compétences totales
      const totalCompetences = Object.values(this.competences).reduce((sum, comps) => sum + comps.length, 0);
      const avgCompetences = totalCompetences / this.employees.length;
      
      report += `⚡ **Compétences :**\n`;
      report += `• ${totalCompetences} certifications totales\n`;
      report += `• ${avgCompetences.toFixed(1)} compétences/employé en moyenne\n\n`;
      
      // État des postes critiques
      const criticalPosts = ['Cuisine chaude', 'Vaisselle'];
      report += `🎯 **Postes critiques :**\n`;
      for (const posteName of criticalPosts) {
        const poste = this.postes.find(p => p.nom === posteName);
        if (poste) {
          const qualified = this.employees.filter(emp => {
            const competences = this.competences[emp.employee.id] || [];
            return competences.some(c => c.poste_id === poste.id);
          });
          const status = qualified.length >= 3 ? '🟢' : qualified.length >= 2 ? '🟡' : '🔴';
          report += `${status} ${posteName}: ${qualified.length} employés qualifiés\n`;
        }
      }
      
      return {
        success: true,
        message: report
      };
    } catch (error) {
      console.error('Erreur generateGeneralReport:', error);
      return {
        success: false,
        message: `❌ Erreur lors de la génération du rapport.`
      };
    }
  }

  /**
   * Gère les commandes non reconnues
   */
  async handleUnknown(originalMessage) {
    const suggestions = [
      "💡 **Exemples de commandes que je comprends :**",
      "",
      "**Absences :**",
      "• \"Déclarer Jean absent demain\"",
      "• \"Marie est absente le 15/12/2024\"",
      "",
      "**Compétences :**",
      "• \"Former Paul sur Cuisine chaude\"",
      "• \"Donner la compétence Vaisselle à Sophie\"",
      "",
      "**Profils :**",
      "• \"Changer le profil de Marc en Fort\"",
      "• \"Julie devient Moyenne\"",
      "",
      "**Planning :**",
      "• \"Générer le planning cette semaine\"",
      "• \"Optimiser le planning\"",
      "",
      "**Assignations :**",
      "• \"Mettre Thomas sur Pain demain\"",
      "• \"Assigner Emma à Légumerie\"",
      "",
      "**Informations :**",
      "• \"Qui est Pierre ?\"",
      "• \"Qui peut travailler sur Sandwichs ?\""
    ];
    
    return {
      success: false,
      message: `❓ Je n'ai pas compris "${originalMessage}".\n\n${suggestions.join('\n')}`
    };
  }

  /**
   * Gère les demandes d'aide
   */
  async handleHelpRequest(matches) {
    const helpType = matches[1] || matches[2] || '';
    
    let response = `🤖 **Assistant IA Cuisine - Guide d'utilisation**\n\n`;
    
    if (helpType.includes('améliorer') || helpType.includes('optimiser')) {
      response += `🎯 **Suggestions d'optimisation :**\n`;
      response += `• "Analyser le planning cette semaine"\n`;
      response += `• "Statistiques de compétences équipe"\n`;
      response += `• "Optimiser le planning"\n`;
      response += `• "Équilibrer la charge de travail"\n\n`;
    }
    
    response += `💬 **Commandes principales :**\n\n`;
    response += `**📅 Absences :**\n`;
    response += `• "Qui est absent aujourd'hui ?"\n`;
    response += `• "Jean est absent demain"\n`;
    response += `• "Déclarer Marie absente"\n\n`;
    
    response += `**👥 Compétences :**\n`;
    response += `• "Qui peut faire la Cuisine chaude ?"\n`;
    response += `• "Former Paul sur Vaisselle"\n`;
    response += `• "Donner la compétence Pain à Sophie"\n\n`;
    
    response += `**📊 Analyses :**\n`;
    response += `• "Analyser le planning"\n`;
    response += `• "Statistiques équipe"\n`;
    response += `• "État des compétences"\n\n`;
    
    response += `**⚙️ Planning :**\n`;
    response += `• "Générer le planning"\n`;
    response += `• "Optimiser le planning"\n\n`;
    
    response += `🗣️ **Astuce :** Parlez-moi naturellement !`;
    
    return {
      success: true,
      message: response
    };
  }

  /**
   * Gère les demandes d'analyse
   */
  async handleAnalysisRequest(matches) {
    try {
      const analysisType = matches[1] || '';
      
      if (analysisType.includes('planning')) {
        return await this.analyzePlanning();
      } else if (analysisType.includes('équipe') || analysisType.includes('compétences')) {
        return await this.analyzeTeamCompetences();
      } else if (analysisType.includes('charge')) {
        return await this.analyzeWorkload();
      } else {
        return await this.generateGeneralReport();
      }
    } catch (error) {
      console.error('Erreur handleAnalysisRequest:', error);
      return {
        success: false,
        message: `❌ Erreur lors de l'analyse.`
      };
    }
  }

  /**
   * Traite un message utilisateur
   */
  async processMessage(message) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const command = this.parseCommand(message);
    
    try {
      switch (command.action) {
        case 'handleAbsenceQuery':
          return await this.handleAbsenceQuery(command.matches);
        case 'handleAbsenceDeclaration':
          return await this.handleAbsenceDeclaration(command.matches);
        case 'handleCompetenceQuery':
          return await this.handleCompetenceQuery(command.matches);
        case 'handleCompetenceTrain':
          return await this.handleCompetenceTrain(command.matches);
        case 'handleProfilChange':
          return await this.handleProfilChange(command.matches);
        case 'handlePlanningGeneration':
          return await this.handlePlanningGeneration(command.matches);
        case 'handleAnalysisRequest':
          return await this.handleAnalysisRequest(command.matches);
        case 'handleInfoQuestion':
          return await this.handleInfoQuestion(command.matches);
        case 'handleHelpRequest':
          return await this.handleHelpRequest(command.matches);
        default:
          return await this.handleUnknown(command.originalMessage);
      }
    } catch (error) {
      console.error('Erreur processMessage:', error);
      return {
        success: false,
        message: `❌ Erreur technique lors du traitement de votre demande.`
      };
    }
  }
}

/**
 * Instance singleton du chatbot
 */
export const aiChatbot = new AIChatbot();

export default aiChatbot; 