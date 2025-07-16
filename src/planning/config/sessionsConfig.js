import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

/**
 * Configuration des sessions de planning cuisine
 * Source unique de vérité pour les créneaux et postes actifs
 * ✅ CRÉNEAUX CORRIGÉS selon spécifications réelles
 */

// Créneaux par poste selon les horaires réels
const CRENEAUX_PAR_POSTE = {
  // Postes standards 8h-16h
  'Cuisine chaude': ['8h-16h'],
  'Sandwichs': ['8h-16h'], 
  'Jus de fruits': ['8h-16h'],
  'Légumerie': ['8h-16h'],
  'Equipe Pina et Saskia': ['8h-16h'],
  
  // Postes spéciaux
  'Pain': ['8h-12h'],
  'Vaisselle': ['8h', '10h', 'midi'],
  'Self Midi': ['11h-11h45', '11h45-12h45']
};

export const sessionsConfig = {
  matin: {
    label: 'Matin',
    icon: SunIcon,
    color: 'from-yellow-400 to-orange-500',
    postesActifs: [
      'Cuisine chaude', 
      'Sandwichs', 
      'Pain', 
      'Jus de fruits', 
      'Vaisselle', 
      'Légumerie', 
      'Self Midi', 
      'Equipe Pina et Saskia'
    ],
    // Tous les créneaux possibles
    creneaux: ['8h-16h', '8h-12h', '8h', '10h', 'midi', '11h-11h45', '11h45-12h45']
  }
};

/**
 * Obtenir les créneaux spécifiques à un poste
 */
export const getCreneauxForPoste = (posteNom) => {
  return CRENEAUX_PAR_POSTE[posteNom] || ['8h-16h'];
};

export const getSessionConfig = (session = 'matin') => {
  return sessionsConfig[session] || sessionsConfig.matin;
};

/**
 * Obtenir tous les noms de sessions disponibles
 */
export const getAvailableSessions = () => {
  return Object.keys(sessionsConfig);
}; 