/**
 * 🚗 MODULE RÈGLES TRANSIT
 * Logique spéciale pour l'assignation du véhicule Transit
 */

import { canJoinTeam, CONFLICT_EMPLOYEES, canBeDriver } from './conflicts.js';

/**
 * Assigne l'équipe Transit selon les règles prioritaires
 */
export function assignTransitTeam(availableEmployees, employeesUsed, dayName) {
  const team = [];
  const isLundi = dayName === 'lundi';
  
  console.log('🚗 TRANSIT - Début assignation:', { day: dayName, available: availableEmployees.length });
  
  // ÉTAPE 1 : Priorité absolue à Jack
  const jackAssignment = tryAssignJack(availableEmployees, employeesUsed, team);
  let hasConflictMember = jackAssignment.assigned;
  
  // ÉTAPE 2 : Si Jack absent, système de cascade
  if (!hasConflictMember) {
    const cascadeResult = tryAssignCascade(availableEmployees, employeesUsed, team, isLundi);
    hasConflictMember = cascadeResult.assigned;
  }
  
  // ÉTAPE 3 : Compléter avec anciens membres Transit (non-conflictuels)
  fillWithFormerMembers(availableEmployees, employeesUsed, team);
  
  // ÉTAPE 4 : Compléter avec autres employés si besoin
  fillWithOtherEmployees(availableEmployees, employeesUsed, team);
  
  // ÉTAPE 5 : S'assurer qu'il y a un conducteur
  ensureDriver(availableEmployees, employeesUsed, team);
  
  // ÉTAPE 6 : Promouvoir le premier équipier en Assistant
  if (team.length > 1) {
    const firstEquipier = team.find(member => member.role === 'Équipier');
    if (firstEquipier) {
      firstEquipier.role = 'Assistant';
      firstEquipier.notes = firstEquipier.notes.replace('Équipier', 'Assistant');
      console.log('✅ TRANSIT: Premier équipier promu Assistant');
    }
  }
  
  console.log('🚗 TRANSIT - Équipe finale:', { members: team.length, hasConflictMember });
  return team;
}

/**
 * Essaie d'assigner Jack au Transit (priorité absolue)
 */
function tryAssignJack(availableEmployees, employeesUsed, team) {
  const jack = availableEmployees.find(emp => emp.nom === 'Jack' && !employeesUsed.has(emp.id));
  
  if (jack) {
    // Jack a la priorité absolue - on le libère d'autres véhicules si nécessaire
    if (employeesUsed.has(jack.id)) {
      console.log('⚠️ TRANSIT: Récupération de Jack depuis un autre véhicule');
      employeesUsed.delete(jack.id);
    }
    
    team.push({
      employee_id: jack.id,
      role: (jack.permis && canBeDriver(jack.nom)) ? 'Conducteur' : 'Équipier',
      notes: `Priorité absolue Transit - Jack (${jack.profil})`
    });
    employeesUsed.add(jack.id);
    
    console.log('✅ TRANSIT: Jack assigné (priorité absolue)');
    return { assigned: true, employee: 'Jack' };
  }
  
  console.log('⚠️ TRANSIT: Jack non disponible - cascade activée');
  return { assigned: false };
}

/**
 * Système de cascade si Jack absent
 */
function tryAssignCascade(availableEmployees, employeesUsed, team, isLundi) {
  // Ordre de priorité : Didier (lundi) → Margot → Martial
  const candidates = isLundi 
    ? ['Didier', 'Margot', 'Martial'] 
    : ['Margot', 'Martial']; // Didier ne travaille que le lundi
  
  for (const candidateName of candidates) {
    const candidate = availableEmployees.find(emp => 
      emp.nom === candidateName && !employeesUsed.has(emp.id)
    );
    
    if (candidate) {
      team.push({
        employee_id: candidate.id,
        role: (candidate.permis && canBeDriver(candidate.nom)) ? 'Conducteur' : 'Équipier',
        notes: `Remplacement Jack - ${candidateName} (${candidate.profil})`
      });
      employeesUsed.add(candidate.id);
      
      console.log(`✅ TRANSIT: ${candidateName} remplace Jack (cascade)`);
      return { assigned: true, employee: candidateName };
    }
  }
  
  console.error('❌ TRANSIT: Aucun remplaçant trouvé dans la cascade !');
  return { assigned: false };
}

/**
 * Complète avec les anciens membres Transit (Hassene, Mejrema, Tamara)
 */
function fillWithFormerMembers(availableEmployees, employeesUsed, team) {
  const formerMembers = ['Hassene', 'Mejrema', 'Tamara'];
  
  for (const memberName of formerMembers) {
    if (team.length >= 4) break; // Limite raisonnable
    
    const member = availableEmployees.find(emp => 
      emp.nom === memberName && !employeesUsed.has(emp.id)
    );
    
    if (member) {
      const needsDriver = team.filter(t => t.role === 'Conducteur').length === 0;
      
      team.push({
        employee_id: member.id,
        role: (member.permis && needsDriver && canBeDriver(member.nom)) ? 'Conducteur' : 'Équipier',
        notes: `Ancien membre Transit - ${memberName} (${member.profil})`
      });
      employeesUsed.add(member.id);
      
      console.log(`✅ TRANSIT: ${memberName} ajouté (ancien membre)`);
    }
  }
}

/**
 * Complète avec d'autres employés non-conflictuels
 */
function fillWithOtherEmployees(availableEmployees, employeesUsed, team) {
  const otherEmployees = availableEmployees.filter(emp => 
    !employeesUsed.has(emp.id) && 
    !CONFLICT_EMPLOYEES.includes(emp.nom) &&
    !['Hassene', 'Mejrema', 'Tamara'].includes(emp.nom)
  );
  
  for (const employee of otherEmployees) {
    if (team.length >= 4) break; // Limite raisonnable
    
    const joinResult = canJoinTeam(team, employee.nom, availableEmployees);
    if (joinResult.canJoin) {
      const needsDriver = team.filter(t => t.role === 'Conducteur').length === 0;
      
      team.push({
        employee_id: employee.id,
        role: (employee.permis && needsDriver && canBeDriver(employee.nom)) ? 'Conducteur' : 'Équipier',
        notes: `Équipier Transit - ${employee.nom} (${employee.profil})`
      });
      employeesUsed.add(employee.id);
      
      console.log(`✅ TRANSIT: ${employee.nom} ajouté (complément)`);
    }
  }
}

/**
 * S'assure qu'il y a au moins un conducteur dans l'équipe
 */
function ensureDriver(availableEmployees, employeesUsed, team) {
  const hasDriver = team.some(member => member.role === 'Conducteur');
  
  if (!hasDriver && team.length > 0) {
    // Essayer de promouvoir un membre existant
    const promotable = team.find(member => {
      const employee = availableEmployees.find(emp => emp.id === member.employee_id);
      return employee && employee.permis;
    });
    
    if (promotable) {
      promotable.role = 'Conducteur';
      console.log('✅ TRANSIT: Promotion conducteur pour membre existant');
    } else {
      // Ajouter un conducteur externe
      const externalDriver = availableEmployees.find(emp => 
        emp.permis && !employeesUsed.has(emp.id)
      );
      
      if (externalDriver) {
        team.push({
          employee_id: externalDriver.id,
          role: 'Conducteur',
          notes: `Conducteur externe Transit (${externalDriver.profil})`
        });
        employeesUsed.add(externalDriver.id);
        console.log(`✅ TRANSIT: Conducteur externe ajouté - ${externalDriver.nom}`);
      }
    }
  }
}

/**
 * Valide que l'équipe Transit respecte les règles
 */
export function validateTransitTeam(team, allEmployees) {
  const errors = [];
  
  // Vérifier qu'il y a au moins un conducteur
  const drivers = team.filter(member => member.role === 'Conducteur');
  if (drivers.length === 0) {
    errors.push('Aucun conducteur dans l\'équipe Transit');
  }
  
  // Vérifier qu'il n'y a qu'un seul membre conflictuel
  const conflictMembers = team.filter(member => {
    const employee = allEmployees.find(emp => emp.id === member.employee_id);
    return employee && CONFLICT_EMPLOYEES.includes(employee.nom);
  });
  
  if (conflictMembers.length > 1) {
    const names = conflictMembers.map(member => {
      const employee = allEmployees.find(emp => emp.id === member.employee_id);
      return employee.nom;
    });
    errors.push(`Plusieurs membres conflictuels dans Transit: ${names.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    hasDriver: drivers.length > 0,
    conflictMembersCount: conflictMembers.length
  };
} 