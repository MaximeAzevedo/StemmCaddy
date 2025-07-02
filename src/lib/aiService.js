import { supabaseAPI } from './supabase';
import { openaiAPI } from './openai';

export const aiService = {
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

      return response;

    } catch (error) {
      console.error('Erreur création absence IA:', error);
      return `❌ Erreur lors de la création de l'absence: ${error.message}`;
    }
  },

  // Supprimer une absence via commande
  async removeAbsenceFromCommand(employeeName, dateInfo = '') {
    try {
      // Récupérer employés et absences
      const [employeesResult, absencesResult] = await Promise.all([
        supabaseAPI.getEmployees(),
        supabaseAPI.getAbsences()
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (absencesResult.error) throw absencesResult.error;

      const employees = employeesResult.data;
      const absences = absencesResult.data;

      // Trouver l'employé
      const employee = employees.find(emp => 
        emp.nom.toLowerCase().includes(employeeName.toLowerCase()) ||
        emp.prenom?.toLowerCase().includes(employeeName.toLowerCase())
      );

      if (!employee) {
        return `❌ Je ne trouve pas d'employé nommé "${employeeName}"`;
      }

      // Trouver ses absences
      let employeeAbsences = absences.filter(a => a.employee_id === employee.id);

      // Si une date est spécifiée, filtrer
      if (dateInfo) {
        const targetDate = this.parseDateFromText(dateInfo).debut;
        employeeAbsences = employeeAbsences.filter(a => 
          targetDate >= a.date_debut && targetDate <= a.date_fin
        );
      } else {
        // Sinon, prendre les absences futures ou en cours
        const today = new Date().toISOString().split('T')[0];
        employeeAbsences = employeeAbsences.filter(a => a.date_fin >= today);
      }

      if (employeeAbsences.length === 0) {
        return `ℹ️ Aucune absence trouvée pour ${employee.nom}`;
      }

      // Supprimer les absences trouvées
      let deletedCount = 0;
      for (const absence of employeeAbsences) {
        const result = await supabaseAPI.deleteAbsence(absence.id);
        if (!result.error) deletedCount++;
      }

      return `✅ ${deletedCount} absence(s) supprimée(s) pour ${employee.nom}`;

    } catch (error) {
      console.error('Erreur suppression absence IA:', error);
      return `❌ Erreur lors de la suppression: ${error.message}`;
    }
  },

  // Lister les absences via commande
  async listAbsences(period = 'semaine') {
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
        
        switch (period.toLowerCase()) {
          case 'aujourd\'hui':
          case 'aujourdhui':
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
        return `ℹ️ Aucune absence trouvée pour ${period}`;
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
      let response = `📅 **Absences pour ${period}:**\n\n`;
      Object.entries(absencesByEmployee).forEach(([name, employeeAbsences]) => {
        response += `👤 **${name}:**\n`;
        employeeAbsences.forEach(absence => {
          const duration = this.calculateDuration(absence.date_debut, absence.date_fin);
          response += `   • ${absence.date_debut} → ${absence.date_fin} (${duration} jour${duration > 1 ? 's' : ''})`;
          if (absence.motif) response += ` - ${absence.motif}`;
          response += '\n';
        });
        response += '\n';
      });

      return response;

    } catch (error) {
      console.error('Erreur liste absences IA:', error);
      return `❌ Erreur lors de la récupération des absences: ${error.message}`;
    }
  },

  // Parser les dates depuis du texte naturel
  parseDateFromText(dateText) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const text = dateText.toLowerCase();
    
    if (text.includes('aujourd\'hui') || text.includes('aujourdhui')) {
      return { debut: todayStr, fin: todayStr };
    }
    
    if (text.includes('demain')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      return { debut: tomorrowStr, fin: tomorrowStr };
    }
    
    if (text.includes('cette semaine')) {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
      return { debut: todayStr, fin: endOfWeek.toISOString().split('T')[0] };
    }
    
    if (text.includes('semaine prochaine')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const endNextWeek = new Date(nextWeek);
      endNextWeek.setDate(endNextWeek.getDate() + 6);
      return { 
        debut: nextWeek.toISOString().split('T')[0], 
        fin: endNextWeek.toISOString().split('T')[0] 
      };
    }

    // Recherche de dates spécifiques (format DD/MM ou DD-MM)
    const dateRegex = /(\d{1,2})[/-](\d{1,2})/;
    const match = text.match(dateRegex);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // JavaScript months are 0-indexed
      const year = today.getFullYear();
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      return { debut: dateStr, fin: dateStr };
    }
    
    // Par défaut: aujourd'hui
    return { debut: todayStr, fin: todayStr };
  },

  // Calculer la durée en jours
  calculateDuration(dateDebut, dateFin) {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const diffTime = Math.abs(fin - debut);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  },

  // Vérifier les conflits de planning
  async checkPlanningConflicts(employeeId, dateDebut, dateFin) {
    try {
      // Récupérer le planning pour la période
      const { data: planning, error } = await supabaseAPI.getPlanning(dateDebut, dateFin);
      if (error) return [];

      // Filtrer les affectations de cet employé
      const conflicts = planning.filter(p => p.employee_id === employeeId);
      
      if (conflicts.length === 0) return [];

      // Suggérer des remplacements
      const suggestions = [];

      for (const conflict of conflicts) {
        const vehicle = conflict.vehicle?.nom || 'Véhicule inconnu';
        const availableEmployees = await supabaseAPI.getAvailableEmployees(conflict.date);
        
        if (availableEmployees.data && availableEmployees.data.length > 0) {
          const replacement = availableEmployees.data[0]; // Premier disponible
          suggestions.push(`   - ${vehicle} (${conflict.date}): Remplacer par ${replacement.nom}`);
        } else {
          suggestions.push(`   - ${vehicle} (${conflict.date}): Aucun remplaçant disponible`);
        }
      }

      return suggestions;

    } catch (error) {
      console.error('Erreur vérification conflits:', error);
      return [];
    }
  },

  // Analyser les absences et suggérer des remplacements
  async handleAbsence(employeeName, duration, date = new Date()) {
    try {
      // Récupérer les employés disponibles
      const { data: employees, error: empError } = await supabaseAPI.getEmployees();
      if (empError) throw empError;

      // Trouver l'employé absent
      const absentEmployee = employees.find(emp => 
        emp.nom.toLowerCase().includes(employeeName.toLowerCase()) ||
        emp.prenom?.toLowerCase().includes(employeeName.toLowerCase())
      );

      if (!absentEmployee) {
        return `Je ne trouve pas d'employé nommé "${employeeName}". Pouvez-vous vérifier l'orthographe ?`;
      }

      // Récupérer les compétences de l'employé absent
      const { data: competences, error: compError } = await supabaseAPI.getCompetences(absentEmployee.id);
      if (compError) throw compError;

      // Récupérer le planning actuel
      const dateStr = date.toISOString().split('T')[0];
      const { data: planning, error: planError } = await supabaseAPI.getPlanning(dateStr, dateStr);
      if (planError) throw planError;

      // Trouver les affectations de l'employé absent
      const affectations = planning.filter(p => p.employee_id === absentEmployee.id);

      if (affectations.length === 0) {
        return `${absentEmployee.nom} n'est pas planifié aujourd'hui, donc pas de remplacement nécessaire.`;
      }

      // Générer des suggestions de remplacement intelligentes
      const suggestions = await this.generateReplacementSuggestions(
        absentEmployee, 
        affectations, 
        employees, 
        competences
      );

      return `${absentEmployee.nom} est absent ${duration}. Voici mes suggestions de remplacement :\n\n${suggestions}`;

    } catch (error) {
      console.error('Erreur gestion absence:', error);
      return "Désolé, j'ai rencontré un problème lors de l'analyse de l'absence.";
    }
  },

  // Générer des suggestions de remplacement intelligentes
  async generateReplacementSuggestions(absentEmployee, affectations, allEmployees, competences) {
    const suggestions = [];

    for (const affectation of affectations) {
      // Trouver les employés compétents pour ce véhicule
      const vehicleCompetences = competences.filter(c => c.vehicle_id === affectation.vehicle_id);
      const competentEmployees = allEmployees.filter(emp => 
        vehicleCompetences.some(c => c.employee_id === emp.id) &&
        emp.statut === 'Actif' &&
        emp.id !== absentEmployee.id
      );

      // Appliquer les règles d'insertion sociale
      const bestReplacement = this.findBestReplacement(
        absentEmployee, 
        competentEmployees, 
        affectation
      );

      if (bestReplacement) {
        suggestions.push(
          `• ${affectation.vehicle?.nom || 'Véhicule'}: ${bestReplacement.nom} (${bestReplacement.profil}, ${bestReplacement.langues?.join('/')})` 
        );
      } else {
        suggestions.push(`• ${affectation.vehicle?.nom || 'Véhicule'}: Aucun remplaçant disponible`);
      }
    }

    return suggestions.join('\n');
  },

  // Trouver le meilleur remplaçant selon les règles d'insertion
  findBestReplacement(absentEmployee, candidates, affectation) {
    if (candidates.length === 0) return null;

    // Prioriser selon les règles d'insertion sociale
    return candidates.sort((a, b) => {
      // 1. Privilégier les profils forts si l'absent était faible
      if (absentEmployee.profil === 'Faible') {
        if (a.profil === 'Fort' && b.profil !== 'Fort') return -1;
        if (b.profil === 'Fort' && a.profil !== 'Fort') return 1;
      }

      // 2. Privilégier les langues différentes pour mixité
      const absentLanguages = absentEmployee.langues || [];
      const aHasDifferentLang = a.langues?.some(lang => !absentLanguages.includes(lang));
      const bHasDifferentLang = b.langues?.some(lang => !absentLanguages.includes(lang));
      
      if (aHasDifferentLang && !bHasDifferentLang) return -1;
      if (bHasDifferentLang && !aHasDifferentLang) return 1;

      // 3. Privilégier les permis pour les conducteurs
      if (affectation.role === 'Conducteur') {
        if (a.permis && !b.permis) return -1;
        if (b.permis && !a.permis) return 1;
      }

      return 0;
    })[0];
  },

  // Analyser les données et générer des insights
  async generateDashboardInsights() {
    try {
      const { data: employees, error: empError } = await supabaseAPI.getEmployees();
      if (empError) throw empError;

      const { data: vehicles, error: vehError } = await supabaseAPI.getVehicles();
      if (vehError) throw vehError;

      const today = new Date().toISOString().split('T')[0];
      const { data: planning, error: planError } = await supabaseAPI.getPlanning(today, today);
      if (planError) throw planError;

      // Calculer des statistiques intelligentes
      const stats = {
        employesActifs: employees.filter(e => e.statut === 'Actif').length,
        employesAbsents: employees.filter(e => e.statut === 'Absent').length,
        vehiculesEnTournee: planning.length,
        tauxOccupation: Math.round((planning.length / vehicles.length) * 100),
        equilibreLangues: this.analyzeLanguageBalance(employees, planning),
        equilibreProfils: this.analyzeProfileBalance(employees, planning)
      };

      return `📊 **Aperçu du jour**
• ${stats.employesActifs} employés actifs (${stats.employesAbsents} absents)
• ${stats.vehiculesEnTournee}/${vehicles.length} véhicules en tournée (${stats.tauxOccupation}%)
• Équilibre langues: ${stats.equilibreLangues}
• Répartition profils: ${stats.equilibreProfils}`;

    } catch (error) {
      console.error('Erreur génération insights:', error);
      return "Statistiques non disponibles actuellement.";
    }
  },

  // Analyser l'équilibre des langues
  analyzeLanguageBalance(employees, planning) {
    const activesLangues = {};
    planning.forEach(p => {
      const employee = employees.find(e => e.id === p.employee_id);
      if (employee && employee.langues) {
        employee.langues.forEach(lang => {
          activesLangues[lang] = (activesLangues[lang] || 0) + 1;
        });
      }
    });

    const total = Object.values(activesLangues).reduce((sum, count) => sum + count, 0);
    if (total === 0) return "Non analysé";

    const percentages = Object.entries(activesLangues)
      .map(([lang, count]) => `${lang} ${Math.round((count / total) * 100)}%`)
      .join(', ');

    return percentages;
  },

  // Analyser l'équilibre des profils
  analyzeProfileBalance(employees, planning) {
    const activesProfils = {};
    planning.forEach(p => {
      const employee = employees.find(e => e.id === p.employee_id);
      if (employee) {
        activesProfils[employee.profil] = (activesProfils[employee.profil] || 0) + 1;
      }
    });

    return Object.entries(activesProfils)
      .map(([profil, count]) => `${profil}: ${count}`)
      .join(', ') || "Non analysé";
  },

  // Générer un planning optimisé avec IA
  async generateOptimizedPlanning(date, vehicles, employees) {
    try {
      // Utiliser OpenAI pour optimiser le planning
      const prompt = `En tant qu'expert en gestion d'équipes Caddy, génère un planning optimisé pour le ${date}.

VÉHICULES DISPONIBLES:
${vehicles.map(v => `- ${v.nom} (capacité: ${v.capacite})`).join('\n')}

EMPLOYÉS DISPONIBLES:
${employees.filter(e => e.statut === 'Actif').map(e => 
  `- ${e.nom} (${e.profil}, ${e.langues?.join('/')}, permis: ${e.permis})`
).join('\n')}

RÈGLES OBLIGATOIRES:
1. Jamais de profils faibles seuls
2. Mélanger les langues pour apprentissage
3. Respecter les compétences véhicules
4. 2-3 personnes par véhicule selon capacité

Réponds uniquement avec les affectations sous ce format:
VÉHICULE: Conducteur + Équipier(s)`;

      const aiResponse = await openaiAPI.generateResponse(prompt);
      return aiResponse;

    } catch (error) {
      console.error('Erreur génération planning:', error);
      return "Impossible de générer le planning automatiquement. Utilisez le planning manuel.";
    }
  },

  // Traiter une commande vocale complexe
  async processVoiceCommand(transcript) {
    const command = transcript.toLowerCase();

    // Commandes pour créer des absences
    if (command.includes('déclarer absent') || command.includes('declarer absent') || 
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
        return await this.createAbsenceFromCommand(employeeName, dateInfo, reason);
      }
      return "❌ Je n'ai pas compris le nom de l'employé. Veuillez dire : 'Déclarer [nom] absent [quand] [motif]'";
    }

    // Commandes pour supprimer des absences
    if (command.includes('supprimer absence') || command.includes('annuler absence') ||
        command.includes('enlever absence') || command.includes('retirer absence')) {
      
      const nameMatch = command.match(/(?:supprimer|annuler|enlever|retirer)\s+absence\s+(?:de\s+)?(.+?)(?:\s+(?:aujourd|demain|pour)|\s*$)/i);
      const employeeName = nameMatch ? nameMatch[1].trim() : null;
      
      let dateInfo = '';
      if (command.includes('aujourd\'hui') || command.includes('aujourdhui')) dateInfo = 'aujourd\'hui';
      else if (command.includes('demain')) dateInfo = 'demain';
      
      if (employeeName) {
        return await this.removeAbsenceFromCommand(employeeName, dateInfo);
      }
      return "❌ Je n'ai pas compris le nom de l'employé. Veuillez dire : 'Supprimer absence de [nom]'";
    }

    // Commandes pour lister les absences
    if (command.includes('qui est absent') || command.includes('quels sont les absents') ||
        command.includes('liste des absences') || command.includes('absences') ||
        command.includes('qui manque')) {
      
      let period = 'aujourd\'hui';
      if (command.includes('aujourd\'hui') || command.includes('aujourdhui')) period = 'aujourd\'hui';
      else if (command.includes('demain')) period = 'demain';
      else if (command.includes('cette semaine') || command.includes('semaine')) period = 'semaine';
      
      return await this.listAbsences(period);
    }

    // Commandes pour vérifier la disponibilité
    if (command.includes('disponible') || command.includes('peut travailler') ||
        command.includes('est là') || command.includes('présent')) {
      
      const nameMatch = command.match(/(.+?)\s+(?:est|sera)\s+(?:disponible|présent|là)/i) ||
                       command.match(/(?:est-ce que|est ce que)\s+(.+?)\s+(?:est|sera)/i);
      
      const employeeName = nameMatch ? nameMatch[1].trim() : null;
      
      if (employeeName) {
        try {
          const { data: employees } = await supabaseAPI.getEmployees();
          const employee = employees.find(emp => 
            emp.nom.toLowerCase().includes(employeeName.toLowerCase())
          );
          
          if (!employee) {
            return `❌ Je ne trouve pas d'employé nommé "${employeeName}"`;
          }
          
          const today = new Date().toISOString().split('T')[0];
          const { available } = await supabaseAPI.isEmployeeAvailable(employee.id, today);
          
          return available 
            ? `✅ ${employee.nom} est disponible aujourd'hui`
            : `❌ ${employee.nom} n'est pas disponible aujourd'hui (absent)`;
            
        } catch (error) {
          return `❌ Erreur lors de la vérification: ${error.message}`;
        }
      }
      return "❌ Je n'ai pas compris le nom de l'employé";
    }

    // Commandes pour les employés disponibles
    if (command.includes('employés disponibles') || command.includes('employes disponibles') ||
        command.includes('qui peut travailler') || command.includes('qui est là')) {
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: availableEmployees } = await supabaseAPI.getAvailableEmployees(today);
        
        if (!availableEmployees || availableEmployees.length === 0) {
          return "ℹ️ Aucun employé disponible trouvé";
        }
        
        const names = availableEmployees.map(emp => emp.nom).join(', ');
        return `👥 **Employés disponibles aujourd'hui:** ${names} (${availableEmployees.length} total)`;
        
      } catch (error) {
        return `❌ Erreur lors de la récupération: ${error.message}`;
      }
    }

    // Gestion d'absence avec détection automatique
    if (command.includes('absent') || command.includes('maladie') || command.includes('congé')) {
      const nameMatch = command.match(/(\w+)\s+(?:est|sera|absent|malade)/i);
      const name = nameMatch ? nameMatch[1] : null;
      const duration = command.includes('demain') ? 'demain' : 
                      command.includes('semaine') ? 'cette semaine' : 'aujourd\'hui';
      
      if (name) {
        return await this.handleAbsence(name, duration);
      }
      return "Qui est absent ? Dites-moi le nom de l'employé.";
    }

    // Statistiques et rapports
    if (command.includes('statistique') || command.includes('rapport') || 
        command.includes('situation') || command.includes('résumé') ||
        command.includes('combien d\'employés') || command.includes('combien d\'absents')) {
      return await this.generateDashboardInsights();
    }

    // Planning automatique
    if (command.includes('générer planning') || command.includes('planning automatique') ||
        command.includes('créer planning') || command.includes('faire planning')) {
      try {
        const { data: vehicles } = await supabaseAPI.getVehicles();
        const { data: employees } = await supabaseAPI.getEmployees();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return await this.generateOptimizedPlanning(
          tomorrow.toLocaleDateString('fr-FR'), 
          vehicles, 
          employees
        );
      } catch (error) {
        return "Erreur lors de la génération du planning.";
      }
    }

    // Aide et commandes disponibles
    if (command.includes('aide') || command.includes('help') || 
        command.includes('que peux-tu faire') || command.includes('commandes')) {
      return `🤖 **Commandes disponibles:**

**Gestion des absences:**
• "Déclarer [nom] absent [quand] [motif]"
• "Supprimer absence de [nom]"
• "Qui est absent [aujourd'hui/demain/cette semaine]?"
• "[Nom] est disponible?"
• "Employés disponibles"

**Informations:**
• "Statistiques du jour"
• "Situation actuelle"
• "Générer planning"

**Exemples:**
• "Déclarer Shadi absent aujourd'hui pour maladie"
• "Qui est absent cette semaine?"
• "Martial est disponible?"
• "Supprimer absence de Ahmad"`;
    }

    // Utiliser OpenAI pour les autres requêtes
    return await openaiAPI.generateResponse(transcript);
  }
};

export default aiService; 