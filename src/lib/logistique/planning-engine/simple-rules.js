/**
 * 🎯 RÈGLES LOGISTIQUE SIMPLIFIÉES - VERSION PRODUCTIVE
 * Remplacement du système complexe par des règles claires et efficaces
 */

/**
 * 👥 ENCADRANTS - Assignations fixes (ne conduisent jamais)
 * CES PERSONNES NE SONT PAS DES EMPLOYÉS NORMAUX !
 */
export const ENCADRANTS = {
  'Margot': {
    vehicule: 'Crafter 21',
    jours: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
    role: 'Encadrant'
  },
  'Jack': { // ✅ CORRIGÉ : Jack au lieu de Jacques
    vehicule: 'Transit',
    jours: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
    role: 'Encadrant'
  },
  'Didier': {
    vehicule: 'Transit',
    jours: ['lundi'], // Uniquement le lundi
    role: 'Encadrant'
  },
  'Martial': {
    vehicule: 'Ducato',
    jours: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
    role: 'Encadrant'
  }
};

/**
 * 🚗 ORDRE DE PRIORITÉ DES VÉHICULES
 * Remplissage dans cet ordre exact
 */
export const VEHICULES_PRIORITE = [
  'Crafter 21',
  'Crafter 23', 
  'Jumper',
  'Ducato',
  'Transit',
  'Caddy' // ✅ AJOUTÉ : Pour les employés restants uniquement
];

/**
 * 🎯 CAPACITÉS VÉHICULES 
 */
export const CAPACITES_VEHICULES = {
  'Crafter 21': 3,
  'Crafter 23': 3,
  'Jumper': 3,
  'Ducato': 3,
  'Transit': 8, // ✅ CORRECTION: 3 → 8 places (capacité réelle)
  'Caddy': 6 // ✅ CORRECTION: 3 → 6 places (capacité réelle)
};

/**
 * 👤 ASSIGNATIONS SPÉCIALES
 */
export const ASSIGNATIONS_SPECIALES = {
  'Elton': {
    vehicule: 'Caddy',
    condition: 'si_present_et_place_disponible',
    role: 'Équipier'
  }
};

/**
 * 🎯 RÈGLES DE RÔLES
 */
export const REGLES_ROLES = {
  CONDUCTEUR: {
    criteres: ['employé', 'avec_permis'],
    priorite: ['profil_Fort', 'profil_Moyen', 'profil_Faible'],
    obligatoire: true
  },
  ASSISTANT: {
    criteres: ['employé'],
    priorite: ['disponible'],
    obligatoire: false
  },
  ENCADRANT: {
    ne_conduit_jamais: true,
    assignation_fixe: true
  }
};

/**
 * 🔧 SÉPARATION ENCADRANTS/EMPLOYÉS
 * Sépare complètement les encadrants des employés normaux
 */
export function separateEncadrantsFromEmployees(allPersons) {
  const encadrants = [];
  const employees = [];
  
  allPersons.forEach(person => {
    if (isEncadrant(person.nom) || isEncadrant(person.prenom)) {
      encadrants.push({
        ...person,
        type: 'encadrant'
      });
    } else {
      employees.push({
        ...person,
        type: 'employe'
      });
    }
  });
  
  console.log(`🎯 Séparation: ${encadrants.length} encadrants, ${employees.length} employés`);
  console.log(`👥 Encadrants identifiés:`, encadrants.map(e => e.nom));
  
  return { encadrants, employees };
}

/**
 * Assigne TOUS les encadrants disponibles dans leurs véhicules fixes
 * CETTE FONCTION DOIT ÊTRE APPELÉE EN PREMIER !
 */
export function assignAllEncadrants(encadrants, vehicles, planning, employeesUsed, dayName, date, creneau) {
  console.log(`\n👥 === ASSIGNATION PRIORITAIRE ENCADRANTS (${dayName}) ===`);
  
  // Pour chaque encadrant disponible
  encadrants.forEach(encadrant => {
    const encadrantConfig = ENCADRANTS[encadrant.nom] || ENCADRANTS[encadrant.prenom];
    
    if (!encadrantConfig) {
      console.warn(`⚠️ Encadrant ${encadrant.nom} non configuré`);
      return;
    }
    
    // Vérifier si l'encadrant travaille ce jour
    if (!encadrantConfig.jours.includes(dayName)) {
      console.log(`➖ ${encadrant.nom} ne travaille pas le ${dayName}`);
      return;
    }
    
    // Trouver le véhicule correspondant
    const vehicule = vehicles.find(v => v.nom === encadrantConfig.vehicule);
    if (!vehicule) {
      console.warn(`⚠️ Véhicule ${encadrantConfig.vehicule} introuvable pour ${encadrant.nom}`);
      return;
    }
    
    // Assigner l'encadrant (PRIORITÉ ABSOLUE)
    planning.push({
      employee_id: encadrant.id,
      vehicule_id: vehicule.id,
      date: date,
      creneau: creneau,
      role: 'Équipier', // ✅ CORRECTION: 'Encadrant' → 'Équipier' (contrainte DB)
      notes: `🎯 ENCADRANT FIXE ${vehicule.nom}`
    });
    
    employeesUsed.add(encadrant.id);
    console.log(`✅ ${encadrant.nom} → ${vehicule.nom} (ENCADRANT FIXE)`);
  });
  
  console.log(`✅ Encadrants assignés: ${planning.filter(p => p.notes && p.notes.includes('ENCADRANT FIXE')).length}`);
}

/**
 * Obtient l'encadrant assigné à un véhicule pour un jour donné
 */
export function getEncadrantForVehicule(vehiculeNom, jourSemaine, employees) {
  const encadrantEntry = Object.entries(ENCADRANTS).find(([nom, config]) => 
    config.vehicule === vehiculeNom && config.jours.includes(jourSemaine)
  );
  
  if (!encadrantEntry) return null;
  
  const [encadrantNom] = encadrantEntry;
  const employee = employees.find(emp => emp.nom === encadrantNom || emp.prenom === encadrantNom);
  
  return employee ? {
    employee,
    role: 'Encadrant'
  } : null;
}

/**
 * Vérifie si un employé est un encadrant
 */
export function isEncadrant(employeeNom) {
  return Object.keys(ENCADRANTS).includes(employeeNom);
}

/**
 * Sélectionne le meilleur conducteur parmi les employés disponibles
 * EXCLUT AUTOMATIQUEMENT LES ENCADRANTS
 */
export function selectBestConducteur(availableEmployees) {
  // Filtrer : employés avec permis, PAS ENCADRANTS
  const candidates = availableEmployees.filter(emp => 
    emp.permis && 
    !isEncadrant(emp.nom) && 
    !isEncadrant(emp.prenom) &&
    emp.type !== 'encadrant' // Double sécurité
  );
  
  if (candidates.length === 0) return null;
  
  // Trier par profil : Fort > Moyen > Faible
  candidates.sort((a, b) => {
    const priorite = { 'Fort': 3, 'Moyen': 2, 'Faible': 1 };
    return (priorite[b.profil] || 0) - (priorite[a.profil] || 0);
  });
  
  return candidates[0];
}

/**
 * Obtient les employés disponibles (exclut encadrants et déjà assignés)
 * VERSION SÉCURISÉE - JAMAIS D'ENCADRANTS
 */
export function getEmployesDisponibles(allEmployees, encadrants, employeesUsed) {
  return allEmployees.filter(emp => {
    // Exclure encadrants (multiple vérifications)
    if (isEncadrant(emp.nom) || isEncadrant(emp.prenom)) return false;
    if (emp.type === 'encadrant') return false;
    
    // Exclure déjà utilisés
    if (employeesUsed.has(emp.id)) return false;
    
    return true;
  });
}

/**
 * 🔄 ROTATION DES CONDUCTEURS PAR JOUR
 * Pour éviter la monotonie et faire tourner les équipes
 */
export const ROTATION_CONDUCTEURS = {
  // Configuration A : Lundi-Mardi (Jours 1-2)
  'lundi': {
    'Crafter 21': 'Emahatsion',
    'Crafter 23': 'José', 
    'Jumper': 'Juan',
    'Ducato': 'Medhanie'
  },
  'mardi': {
    'Crafter 21': 'Emahatsion',
    'Crafter 23': 'José',
    'Jumper': 'Juan', 
    'Ducato': 'Medhanie'
  },
  
  // Configuration B : Mercredi-Jeudi (Jours 3-4)  
  'mercredi': {
    'Crafter 21': 'José',
    'Crafter 23': 'Juan',
    'Jumper': 'Medhanie',
    'Ducato': 'Emahatsion'
  },
  'jeudi': {
    'Crafter 21': 'José',
    'Crafter 23': 'Juan',
    'Jumper': 'Medhanie',
    'Ducato': 'Emahatsion'
  },
  
  // Configuration C : Vendredi (Jour 5)
  'vendredi': {
    'Crafter 21': 'Juan',
    'Crafter 23': 'Medhanie', 
    'Jumper': 'Emahatsion',
    'Ducato': 'José'
  }
};

/**
 * 🔄 Sélectionne le conducteur selon la rotation du jour
 * @param {Array} availableEmployees - Employés disponibles
 * @param {string} vehicleName - Nom du véhicule  
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Object|null} Conducteur sélectionné selon la rotation
 */
export function selectConducteurWithRotation(availableEmployees, vehicleName, date) {
  // Convertir la date en jour de la semaine
  const dayOfWeek = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
  
  // Vérifier si c'est un véhicule avec rotation
  const rotation = ROTATION_CONDUCTEURS[dayOfWeek];
  
  if (!rotation || !rotation[vehicleName]) {
    // Pas de rotation définie, utiliser l'ancienne méthode
    return selectBestConducteur(availableEmployees);
  }
  
  // Nom du conducteur attendu selon la rotation
  const expectedDriver = rotation[vehicleName];
  
  // Chercher ce conducteur parmi les disponibles
  const preferredDriver = availableEmployees.find(emp => 
    emp.nom === expectedDriver && 
    emp.permis &&
    !isEncadrant(emp.nom) &&
    !isEncadrant(emp.prenom) &&
    emp.type !== 'encadrant'
  );
  
  if (preferredDriver) {
    console.log(`🔄 Rotation ${dayOfWeek}: ${preferredDriver.nom} → ${vehicleName}`);
    return preferredDriver;
  }
  
  // Si le conducteur de rotation n'est pas disponible, fallback vers l'ancienne méthode
  console.warn(`⚠️ Conducteur de rotation ${expectedDriver} indisponible pour ${vehicleName}, fallback...`);
  return selectBestConducteur(availableEmployees);
}

/**
 * Règles de validation simplifiées
 */
export function validateEquipeSimple(equipe, vehiculeNom) {
  const hasConducteur = equipe.some(member => member.role === 'Conducteur');
  const hasEncadrant = equipe.some(member => member.role === 'Encadrant');
  const size = equipe.length;
  const maxCapacity = CAPACITES_VEHICULES[vehiculeNom] || 3;
  
  return {
    isValid: (hasConducteur || hasEncadrant) && size <= maxCapacity,
    warnings: [
      !hasConducteur && !hasEncadrant ? `⚠️ ${vehiculeNom}: Pas de conducteur ni encadrant` : null,
      size > maxCapacity ? `⚠️ ${vehiculeNom}: Capacité dépassée (${size}/${maxCapacity})` : null
    ].filter(Boolean),
    size,
    hasConducteur,
    hasEncadrant
  };
} 