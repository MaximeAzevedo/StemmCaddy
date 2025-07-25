/**
 * Règles métier unifiées pour les postes de cuisine
 * ✅ UNIFICATION COMPLÈTE : Toutes les compétences sont obligatoires
 */

export const POSTES_RULES = {
  // 🥪 PRIORITÉ ABSOLUE - Service sandwich (zone la plus critique)
  'Sandwichs': {
    min: 5,
    max: 6,
    priority: 1, // PLUS HAUTE PRIORITÉ (1 = plus important)
    needsCompetence: true,
    strictValidation: true,
    needsChef: true,
    chefCompetence: 'Chef sandwichs',
    description: 'PRIORITÉ ABSOLUE : 5-6 personnes + chef obligatoire'
  },

  // 🍽️ CRITIQUE - Service clientèle
  'Self Midi': {
    min: 2,
    max: 3,
    priority: 2,
    critical: true,
    needsCompetence: true,
    allowNonValidated: false, // Compétence obligatoire
    description: 'Service clientèle - TOUJOURS 2 minimum (compétence obligatoire)'
  },

  // 🍳 HAUTE PRIORITÉ - Cuisine principale
  'Cuisine chaude': {
    min: 4,
    max: 7,
    priority: 3,
    needsCompetence: true,
    strictValidation: true,
    description: 'Cuisine principale - 4 à 7 personnes compétentes'
  },

  // 🧽 ÉQUIPE FIXE - Nettoyage
  'Vaisselle': {
    min: 3,
    max: 3,
    priority: 4,
    specialRules: {
      '8h': { min: 1, max: 1 }
    },
    needsCompetence: true, // ✅ CHANGÉ : Compétence obligatoire
    strictValidation: false,
    description: 'Vaisselle - équipe fixe de 3 (compétence requise, exception 8h: 1 personne)'
  },

  // 🥖 MOYENNE PRIORITÉ - Boulangerie
  'Pain': {
    min: 2,
    max: 3,
    priority: 5,
    canRelocateAfter10h: true,
    needsCompetence: true,
    allowNonValidated: false, // ✅ CHANGÉ : Validation stricte
    description: 'Boulangerie - flexible 2-3 personnes, compétence obligatoire'
  },

  // 🧅 PRÉPARATION
  'Légumerie': {
    min: 1,
    max: 10,
    priority: 6,
    needsCompetence: true, // ✅ CHANGÉ : Compétence obligatoire
    strictValidation: false,
    description: 'Préparation légumes - 1-10 personnes (compétence requise)'
  },

  // 🧃 FLEXIBLE - Boissons
  'Jus de fruits': {
    min: 1,
    max: 2,
    priority: 7,
    emergencyMin: 1,
    needsCompetence: true, // ✅ CHANGÉ : Compétence obligatoire
    strictValidation: false,
    description: 'Jus de fruits - 1-2 personnes (compétence requise)'
  },

  // 👥 ÉQUIPE SPÉCIALISÉE - ✅ AJOUTÉ
  'Equipe Pina et Saskia': {
    min: 2,
    max: 3,
    priority: 8,
    specialTeam: true,
    needsCompetence: true, // ✅ NOUVEAU : Compétence obligatoire
    strictValidation: true,
    description: 'Équipe spécialisée - 2-3 personnes (compétence obligatoire)'
  }
};

/**
 * Obtenir les règles d'un poste
 */
export const getPosteRules = (posteName) => {
  return POSTES_RULES[posteName] || {
    min: 1,
    max: 2,
    priority: 10,
    needsCompetence: false,
    description: 'Poste non configuré'
  };
};

/**
 * Obtenir tous les postes triés par priorité
 */
export const getPostesByPriority = () => {
  return Object.entries(POSTES_RULES)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([name, rules]) => ({ name, ...rules }));
};

/**
 * Vérifier si un poste nécessite des compétences
 */
export const posteNeedsCompetence = (posteName) => {
  return getPosteRules(posteName).needsCompetence || false;
};

/**
 * Obtenir le nombre min/max pour un poste
 */
export const getPosteCapacity = (posteName, creneau = null) => {
  const rules = getPosteRules(posteName);
  
  // Règles spéciales par créneau
  if (creneau && rules.specialRules && rules.specialRules[creneau]) {
    return rules.specialRules[creneau];
  }
  
  return {
    min: rules.min,
    max: rules.max
  };
};

/**
 * Validation des assignations par poste
 */
export const validatePosteAssignment = (posteName, nbEmployees, creneau = null) => {
  const capacity = getPosteCapacity(posteName, creneau);
  const rules = getPosteRules(posteName);
  
  const result = {
    isValid: nbEmployees >= capacity.min && nbEmployees <= capacity.max,
    message: '',
    level: 'info'
  };
  
  if (nbEmployees < capacity.min) {
    result.message = `⚠️ ${posteName}: ${nbEmployees}/${capacity.min} minimum requis`;
    result.level = rules.critical ? 'error' : 'warning';
  } else if (nbEmployees > capacity.max) {
    result.message = `⚠️ ${posteName}: ${nbEmployees}/${capacity.max} maximum dépassé`;
    result.level = 'warning';
  } else {
    result.message = `✅ ${posteName}: ${nbEmployees} personnes (OK)`;
    result.level = 'success';
  }
  
  return result;
}; 