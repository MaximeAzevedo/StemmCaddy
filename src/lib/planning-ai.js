// Intelligence Artificielle pour la gestion automatique des plannings
import { supabaseCuisine } from './supabase-cuisine';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Configuration des règles métier pour l'IA
 */
const PLANNING_RULES = {
  // Postes prioritaires qui doivent toujours être couverts
  CRITICAL_POSTES: ['Sandwichs', 'Self Midi', 'Cuisine chaude'],
  
  // Nombre minimum/maximum d'employés par poste - NOUVELLES RÈGLES STRICTES
  MIN_EMPLOYEES_PER_POSTE: {
    'Sandwichs': 4, // + 1 chef = 5 au total (priorité absolue)
    'Pain': 2,
    'Vaisselle': 3, // Exception : 8h = 1 seule personne
    'Cuisine chaude': 4,
    'Jus de fruits': 2, // Peut descendre à 1 en pénurie
    'Self Midi': 2, // TOUJOURS 2 minimum - primordial
    'Equipe Pina et Saskia': 1,
    'Légumerie': 2 // Dernière priorité, flexible
  },
  
  MAX_EMPLOYEES_PER_POSTE: {
    'Sandwichs': 4, // + 1 chef = 5 au total
    'Pain': 3,
    'Vaisselle': 3,
    'Cuisine chaude': 7,
    'Jus de fruits': 3,
    'Self Midi': 3,
    'Equipe Pina et Saskia': 4,
    'Légumerie': 10
  },

  // Charge de travail maximum par employé (heures par semaine)
  MAX_HOURS_PER_WEEK: 35,
  
  // Repos minimum entre deux services
  MIN_REST_HOURS: 10,

  // Préférences par profil - MISES À JOUR
  PROFILE_PREFERENCES: {
    'Fort': ['Cuisine chaude', 'Sandwichs', 'Légumerie'],
    'Moyen': ['Sandwichs', 'Vaisselle', 'Pain', 'Self Midi'],
    'Faible': ['Jus de fruits', 'Pain', 'Vaisselle']
  },

  // NOUVELLES PRIORITÉS STRICTES (1 = plus important)
  POSTE_PRIORITIES: {
    'Sandwichs': 1, // PRIORITÉ ABSOLUE + chef
    'Pain': 2,
    'Vaisselle': 3,
    'Cuisine chaude': 4,
    'Jus de fruits': 5,
    'Self Midi': 6, // Primordial (toujours 2 min)
    'Equipe Pina et Saskia': 7,
    'Légumerie': 8 // Dernière priorité
  },

  // Postes nécessitant des compétences spécifiques
  COMPETENCE_REQUIRED: ['Cuisine chaude', 'Sandwichs'],

  // Chef requis pour certains postes
  CHEF_REQUIRED: {
    'Sandwichs': 'Chef sandwichs'
  },

  // Règles spéciales par créneau
  SPECIAL_RULES: {
    'Vaisselle': {
      '8h': { min: 1, max: 1 } // Exception pour 8h
    }
  }
};

/**
 * Sessions et leurs configurations
 */
const SESSIONS_CONFIG = {
  matin: {
    postes: ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits', 'Vaisselle', 'Légumerie'],
    creneaux: ['8h', '10h'],
    duration: 2 // heures par créneau
  },
  'apres-midi': {
    postes: ['Cuisine chaude', 'Sandwichs', 'Vaisselle', 'Légumerie'],
    creneaux: ['12h'],
    duration: 3
  }
};

/**
 * Classe principale de l'IA de planification
 */
class PlanningAI {
  constructor() {
    this.employees = [];
    this.postes = [];
    this.competences = {};
    this.absences = [];
    this.currentPlanning = [];
  }

  /**
   * Charge toutes les données nécessaires
   */
  async loadData(dateStart, dateEnd) {
    try {
      const [employeesRes, postesRes, competencesRes, absencesRes, planningRes] = await Promise.all([
        supabaseCuisine.getEmployeesCuisineWithCompetences(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple(),
        supabaseCuisine.getAbsencesCuisine(dateStart, dateEnd),
        supabaseCuisine.getPlanningCuisineRange(dateStart, dateEnd)
      ]);

      this.employees = employeesRes.data || [];
      this.postes = postesRes.data || [];
      this.absences = absencesRes.data || [];
      this.currentPlanning = planningRes.data || [];

      // Construire la map des compétences
      this.competences = {};
      (competencesRes.data || []).forEach(comp => {
        if (!this.competences[comp.employee_id]) {
          this.competences[comp.employee_id] = [];
        }
        this.competences[comp.employee_id].push(comp);
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur chargement données IA:', error);
      return { success: false, error };
    }
  }

  /**
   * Vérifie si un employé est absent à une date donnée
   */
  isEmployeeAbsent(employeeId, date) {
    return this.absences.some(absence => {
      const absenceDate = new Date(absence.date);
      const checkDate = new Date(date);
      return absence.employee_id === employeeId && 
             absenceDate.toDateString() === checkDate.toDateString();
    });
  }

  /**
   * Obtient les compétences d'un employé pour un poste
   */
  getEmployeeCompetence(employeeId, posteName) {
    const poste = this.postes.find(p => p.nom === posteName);
    if (!poste) return null;

    const empCompetences = this.competences[employeeId] || [];
    return empCompetences.find(c => c.poste_id === poste.id);
  }

  /**
   * Calcule un score d'adéquation employé-poste
   */
  calculateEmployeePosteFitScore(employee, posteName, date, creneau) {
    let score = 0;

    // Vérifier les absences (-1000 = impossible)
    if (this.isEmployeeAbsent(employee.employee.id, date)) {
      return -1000;
    }

    // Vérifier les compétences (+50 si compétent)
    const competence = this.getEmployeeCompetence(employee.employee.id, posteName);
    if (competence) {
      score += 50;
    }

    // Préférence selon le profil (+30)
    const profilePrefs = PLANNING_RULES.PROFILE_PREFERENCES[employee.employee.profil] || [];
    if (profilePrefs.includes(posteName)) {
      score += 30;
    }

    // Bonus pour les langues (+10 par langue)
    const languages = employee.employee.langues || [];
    score += languages.length * 10;

    // Malus si déjà beaucoup assigné cette semaine (-5 par assignation existante)
    const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(date), { weekStartsOn: 1 });
    
    const weekAssignments = this.currentPlanning.filter(p => {
      const planDate = new Date(p.date);
      return p.employee_id === employee.employee.id &&
             planDate >= weekStart && planDate <= weekEnd;
    });
    score -= weekAssignments.length * 5;

    // Bonus pour variété (+20 si nouveau poste pour cette semaine)
    const hasWorkedThisPoste = weekAssignments.some(p => {
      const poste = this.postes.find(pos => pos.id === p.poste_id);
      return poste?.nom === posteName;
    });
    if (!hasWorkedThisPoste) {
      score += 20;
    }

    return score;
  }

  /**
   * Génère automatiquement le planning pour une semaine
   */
  async generateWeeklyPlanning(startDate) {
    const weekStart = startOfWeek(new Date(startDate), { weekStartsOn: 1 });
    const planning = [];
    const assignments = {}; // Track des assignations par employé

    // Initialiser le tracking
    this.employees.forEach(emp => {
      assignments[emp.employee.id] = { total_hours: 0, daily_assignments: {} };
    });

    // Pour chaque jour de la semaine (lundi à vendredi)
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const currentDate = addDays(weekStart, dayOffset);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Pour chaque session (matin, après-midi)
      for (const [sessionName, sessionConfig] of Object.entries(SESSIONS_CONFIG)) {
        // Pour chaque poste de cette session
        for (const posteName of sessionConfig.postes) {
          const poste = this.postes.find(p => p.nom === posteName);
          if (!poste) continue;

          const minEmployees = PLANNING_RULES.MIN_EMPLOYEES_PER_POSTE[posteName] || 1;
          const maxEmployees = PLANNING_RULES.MAX_EMPLOYEES_PER_POSTE[posteName] || 2;

          // Pour chaque créneau de cette session
          for (const creneau of sessionConfig.creneaux) {
            // Trouver les meilleurs employés pour ce poste
            const candidats = this.employees
              .map(emp => ({
                ...emp,
                score: this.calculateEmployeePosteFitScore(emp, posteName, dateStr, creneau)
              }))
              .filter(emp => emp.score > -1000) // Exclure les absents
              .sort((a, b) => b.score - a.score); // Meilleur score en premier

            // Assigner le nombre optimal d'employés
            let assigned = 0;
            const targetEmployees = Math.min(maxEmployees, Math.max(minEmployees, candidats.length));

            for (const candidat of candidats) {
              if (assigned >= targetEmployees) break;

              const empId = candidat.employee.id;
              const dayKey = `${dateStr}-${sessionName}`;

              // Vérifier les contraintes
              if (assignments[empId].total_hours + sessionConfig.duration > PLANNING_RULES.MAX_HOURS_PER_WEEK) {
                continue; // Trop d'heures cette semaine
              }

              if (assignments[empId].daily_assignments[dayKey]) {
                continue; // Déjà assigné dans cette session
              }

              // Assigner !
              planning.push({
                date: dateStr,
                poste_id: poste.id,
                creneau: creneau,
                employee_id: empId
              });

              // Mettre à jour le tracking
              assignments[empId].total_hours += sessionConfig.duration;
              assignments[empId].daily_assignments[dayKey] = true;
              assigned++;
            }
          }
        }
      }
    }

    return planning;
  }

  /**
   * Sauvegarde le planning généré automatiquement
   */
  async savePlanningToDB(planning) {
    try {
      const results = [];
      
      for (const assignment of planning) {
        const result = await supabaseCuisine.createPlanningCuisine(assignment);
        results.push(result);
        
        if (result.error) {
          console.warn('Erreur sauvegarde assignment:', result.error);
        }
      }

      const successful = results.filter(r => !r.error).length;
      const failed = results.filter(r => r.error).length;

      return {
        success: failed === 0,
        total: results.length,
        successful,
        failed,
        details: results
      };
    } catch (error) {
      console.error('Erreur sauvegarde planning:', error);
      return { success: false, error };
    }
  }

  /**
   * Gestion automatique des absences
   */
  async handleAbsence(employeeId, date, reason = 'Absence') {
    try {
      // 1. Enregistrer l'absence
      const absenceResult = await supabaseCuisine.createAbsenceCuisine({
        employee_id: employeeId,
        date: format(new Date(date), 'yyyy-MM-dd'),
        raison: reason,
        statut: 'confirmee'
      });

      if (absenceResult.error) {
        return { success: false, error: absenceResult.error };
      }

      // 2. Trouver les assignations existantes pour cette date
      const dateStr = format(new Date(date), 'yyyy-MM-dd');
      const existingAssignments = this.currentPlanning.filter(p => 
        p.employee_id === employeeId && p.date === dateStr
      );

      // 3. Supprimer les assignations existantes
      const deletionResults = [];
      for (const assignment of existingAssignments) {
        const deleteResult = await supabaseCuisine.deletePlanningCuisine(assignment.id);
        deletionResults.push(deleteResult);
      }

      // 4. Tenter de trouver des remplaçants
      const replacements = await this.findReplacements(existingAssignments, dateStr);
      
      // 5. Sauvegarder les remplacements
      const replacementResults = [];
      for (const replacement of replacements) {
        const saveResult = await supabaseCuisine.createPlanningCuisine(replacement);
        replacementResults.push(saveResult);
      }

      return {
        success: true,
        absence: absenceResult.data,
        deletedAssignments: existingAssignments.length,
        replacements: replacementResults.filter(r => !r.error).length,
        details: {
          deletions: deletionResults,
          replacements: replacementResults
        }
      };
    } catch (error) {
      console.error('Erreur gestion absence:', error);
      return { success: false, error };
    }
  }

  /**
   * Trouve des remplaçants pour des assignations supprimées
   */
  async findReplacements(deletedAssignments, date) {
    const replacements = [];

    for (const assignment of deletedAssignments) {
      const poste = this.postes.find(p => p.id === assignment.poste_id);
      if (!poste) continue;

      // Trouver le meilleur remplaçant disponible
      const candidates = this.employees
        .map(emp => ({
          ...emp,
          score: this.calculateEmployeePosteFitScore(emp, poste.nom, date, assignment.creneau)
        }))
        .filter(emp => emp.score > -1000) // Pas absent
        .filter(emp => emp.employee.id !== assignment.employee_id) // Pas l'employé absent
        .sort((a, b) => b.score - a.score);

      if (candidates.length > 0) {
        const replacement = candidates[0];
        replacements.push({
          date: assignment.date,
          poste_id: assignment.poste_id,
          creneau: assignment.creneau,
          employee_id: replacement.employee.id
        });
      }
    }

    return replacements;
  }

  /**
   * Optimise un planning existant
   */
  async optimizePlanning(startDate, endDate) {
    // Supprimer l'ancien planning
    await this.clearPlanningRange(startDate, endDate);
    
    // Regénérer avec l'IA
    const newPlanning = await this.generateWeeklyPlanning(startDate);
    
    // Sauvegarder
    return await this.savePlanningToDB(newPlanning);
  }

  /**
   * Supprime le planning dans une plage de dates
   */
  async clearPlanningRange(startDate, endDate) {
    try {
      const planningRange = await supabaseCuisine.getPlanningCuisineRange(
        format(new Date(startDate), 'yyyy-MM-dd'),
        format(new Date(endDate), 'yyyy-MM-dd')
      );

      if (planningRange.data) {
        const deletionPromises = planningRange.data.map(p => 
          supabaseCuisine.deletePlanningCuisine(p.id)
        );
        await Promise.all(deletionPromises);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur suppression planning:', error);
      return { success: false, error };
    }
  }
}

/**
 * Instance singleton de l'IA
 */
export const planningAI = new PlanningAI();

/**
 * Fonctions d'aide pour l'utilisation
 */
export const PlanningAIHelpers = {
  /**
   * Génère automatiquement le planning pour une semaine
   */
  async generateWeeklyPlanning(startDate) {
    const weekStart = startOfWeek(new Date(startDate), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(startDate), { weekStartsOn: 1 });
    
    await planningAI.loadData(
      format(weekStart, 'yyyy-MM-dd'),
      format(weekEnd, 'yyyy-MM-dd')
    );
    
    const planning = await planningAI.generateWeeklyPlanning(weekStart);
    return await planningAI.savePlanningToDB(planning);
  },

  /**
   * Gère une absence et trouve des remplaçants
   */
  async handleEmployeeAbsence(employeeId, date, reason) {
    await planningAI.loadData(
      format(new Date(date), 'yyyy-MM-dd'),
      format(new Date(date), 'yyyy-MM-dd')
    );
    
    return await planningAI.handleAbsence(employeeId, date, reason);
  },

  /**
   * Optimise le planning existant
   */
  async optimizeExistingPlanning(startDate) {
    const weekStart = startOfWeek(new Date(startDate), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(startDate), { weekStartsOn: 1 });
    
    await planningAI.loadData(
      format(weekStart, 'yyyy-MM-dd'),
      format(weekEnd, 'yyyy-MM-dd')
    );
    
    return await planningAI.optimizePlanning(weekStart, weekEnd);
  },

  /**
   * Obtient des suggestions d'amélioration
   */
  async getPlanningInsights(startDate) {
    const weekStart = startOfWeek(new Date(startDate), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(startDate), { weekStartsOn: 1 });
    
    await planningAI.loadData(
      format(weekStart, 'yyyy-MM-dd'),
      format(weekEnd, 'yyyy-MM-dd')
    );

    const insights = {
      understaffedPostes: [],
      overstaffedPostes: [],
      employeeWorkload: {},
      missingCompetences: []
    };

    // Analyser et fournir des insights...
    // (À implémenter selon les besoins spécifiques)

    return insights;
  }
};

export default planningAI; 