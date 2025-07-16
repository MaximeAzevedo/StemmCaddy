/**
 * Point d'entrée centralisé pour tous les hooks du planning
 * Version hybride : données métier DB + planning localStorage
 */

// Hook de chargement des données métier
export { usePlanningDataLoader } from './usePlanningData';

// Hook de gestion du board (drag & drop)
export { usePlanningBoard } from './usePlanningBoard';

// Hook de sauvegarde locale (remplace usePlanningSync)
export { useLocalPlanningSync } from './useLocalPlanningSync';

// Hook de génération IA
export { usePlanningAI } from './usePlanningAI'; 