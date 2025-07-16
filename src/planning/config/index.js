/**
 * Point d'entrée centralisé pour toutes les configurations du planning
 */

// Importer les fonctions pour les utiliser dans les utilitaires
import { getSessionConfig } from './sessionsConfig';
import { validatePosteAssignment } from './postesRules';

// Configuration des sessions
export {
  sessionsConfig,
  getSessionConfig,
  getAvailableSessions,
  getCreneauxForPoste
} from './sessionsConfig';

// Règles métier des postes
export {
  POSTES_RULES,
  getPosteRules,
  getPostesByPriority,
  posteNeedsCompetence,
  getPosteCapacity,
  validatePosteAssignment
} from './postesRules';

// Utilitaires de validation globale
export const validatePlanningCompleteness = (board, session) => {
  const sessionConfig = getSessionConfig(session);
  const validation = {
    isComplete: true,
    warnings: [],
    errors: [],
    summary: {}
  };

  sessionConfig.postesActifs.forEach(posteName => {
    // Compter les employés assignés pour ce poste
    let totalAssigned = 0;
    Object.keys(board).forEach(cellId => {
      if (cellId.includes(posteName)) {
        totalAssigned += board[cellId].length;
      }
    });

    const result = validatePosteAssignment(posteName, totalAssigned);
    validation.summary[posteName] = result;

    if (result.level === 'error') {
      validation.errors.push(result.message);
      validation.isComplete = false;
    } else if (result.level === 'warning') {
      validation.warnings.push(result.message);
    }
  });

  return validation;
}; 