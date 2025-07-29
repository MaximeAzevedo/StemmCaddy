/**
 * 🚫 MODULE DE GESTION DES CONFLITS
 * Règles d'incompatibilité entre employés
 */

const CONFLICT_GROUP = ['Margot', 'Jack', 'Martial', 'Didier'];

/**
 * 🚫 RÈGLE CRITIQUE : Employés qui ne conduisent JAMAIS
 * Même s'ils ont le permis, ils ne peuvent pas être conducteurs
 */
export const NEVER_DRIVERS = ['Margot', 'Jack', 'Martial', 'Didier'];

/**
 * Vérifie si un employé peut être conducteur
 */
export function canBeDriver(employeeName) {
  return !NEVER_DRIVERS.includes(employeeName);
}

/**
 * Vérifie si deux employés peuvent travailler ensemble
 */
export function canWorkTogether(employee1Name, employee2Name) {
  // Si aucun des deux n'est dans le groupe conflictuel, pas de problème
  if (!CONFLICT_GROUP.includes(employee1Name) && !CONFLICT_GROUP.includes(employee2Name)) {
    return true;
  }
  
  // Si les deux sont dans le groupe conflictuel, ils ne peuvent pas être ensemble
  if (CONFLICT_GROUP.includes(employee1Name) && CONFLICT_GROUP.includes(employee2Name)) {
    return false;
  }
  
  // Si seulement un des deux est dans le groupe, c'est OK
  return true;
}

/**
 * Vérifie si un employé peut rejoindre une équipe existante
 */
export function canJoinTeam(teamMembers, newEmployeeName, allEmployees) {
  // Si le nouvel employé n'est pas dans le groupe conflictuel, pas de problème
  if (!CONFLICT_GROUP.includes(newEmployeeName)) {
    return { canJoin: true };
  }
  
  // Chercher s'il y a déjà un membre conflictuel dans l'équipe
  const conflictingMember = teamMembers.find(member => {
    const employee = allEmployees.find(emp => emp.id === member.employee_id);
    return employee && CONFLICT_GROUP.includes(employee.nom);
  });
  
  if (conflictingMember) {
    const conflictEmployee = allEmployees.find(emp => emp.id === conflictingMember.employee_id);
    return {
      canJoin: false,
      reason: `Conflit avec ${conflictEmployee.nom} déjà dans l'équipe`,
      conflictingEmployee: conflictEmployee.nom
    };
  }
  
  return { canJoin: true };
}

/**
 * Compte le nombre de membres conflictuels dans une équipe
 */
export function countConflictMembers(teamMembers, allEmployees) {
  return teamMembers.filter(member => {
    const employee = allEmployees.find(emp => emp.id === member.employee_id);
    return employee && CONFLICT_GROUP.includes(employee.nom);
  }).length;
}

/**
 * Trouve un véhicule libre pour un employé conflictuel
 */
export function findSafeVehicleFor(employeeName, vehicles, currentAssignments, allEmployees) {
  if (!CONFLICT_GROUP.includes(employeeName)) {
    return vehicles[0]; // N'importe quel véhicule si pas conflictuel
  }
  
  for (const vehicle of vehicles) {
    const currentTeam = currentAssignments[vehicle.nom] || [];
    
    // Vérifier si ce véhicule a déjà des membres conflictuels
    const hasConflict = currentTeam.some(member => {
      const employee = allEmployees.find(emp => emp.id === member.employee_id);
      return employee && CONFLICT_GROUP.includes(employee.nom);
    });
    
    // Si pas de conflit et il reste de la place
    if (!hasConflict && currentTeam.length < vehicle.capacite) {
      return vehicle;
    }
  }
  
  return null; // Aucun véhicule libre trouvé
}

/**
 * Valide qu'aucune équipe n'a de conflit
 */
export function validateNoConflicts(assignments, allEmployees) {
  const errors = [];
  
  for (const vehicleName in assignments) {
    const team = assignments[vehicleName];
    const conflictMembers = team.filter(member => {
      const employee = allEmployees.find(emp => emp.id === member.employee_id);
      return employee && CONFLICT_GROUP.includes(employee.nom);
    });
    
    if (conflictMembers.length > 1) {
      const names = conflictMembers.map(member => {
        const employee = allEmployees.find(emp => emp.id === member.employee_id);
        return employee.nom;
      });
      errors.push(`CONFLIT dans ${vehicleName}: ${names.join(' + ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export const CONFLICT_EMPLOYEES = CONFLICT_GROUP; 