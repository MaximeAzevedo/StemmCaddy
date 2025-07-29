/**
 * 🚀 MOTEUR DE PLANNING LOGISTIQUE - REFACTORISÉ
 * Point d'entrée principal orchestrant toutes les règles métier
 */

import { getAvailableEmployees, isServiceClosed, getDayName } from './availability.js';
import { assignTransitTeam, validateTransitTeam } from './transit-rules.js';
import { validateNoConflicts, canJoinTeam, findSafeVehicleFor, CONFLICT_EMPLOYEES, canBeDriver } from './conflicts.js';

/**
 * Génère le planning pour une semaine complète
 */
export async function generateWeeklyPlanning(startDate, employees, vehicles, competences, absences, options = {}) {
  console.log('🚀 DÉMARRAGE GÉNÉRATION PLANNING - Version refactorisée');
  
  const weekDates = generateWeekDates(startDate);
  const planningEntries = [];
  
  console.log('📅 Semaine à traiter:', weekDates);
  
  // Générer le planning pour chaque jour
  for (const date of weekDates) {
    const dayName = getDayName(date);
    console.log(`\n📅 === GÉNÉRATION ${dayName.toUpperCase()} ${date} ===`);
    
    // Vérifier si le service est fermé
    const serviceStatus = isServiceClosed(absences, date);
    if (serviceStatus.isClosed) {
      console.log(`🚫 Service fermé - Génération ignorée: ${serviceStatus.reason}`);
      continue;
    }
    
    // Récupérer les employés disponibles
    const availableEmployees = getAvailableEmployees(employees, absences, date);
    if (availableEmployees.length === 0) {
      console.warn(`⚠️ Aucun employé disponible le ${dayName}`);
      continue;
    }
    
    try {
      // Générer planning matin et après-midi
      const morningPlanning = await generateDayPlanning(
        availableEmployees, vehicles, competences, date, 'matin', dayName
      );
      
      const afternoonPlanning = await generateDayPlanning(
        availableEmployees, vehicles, competences, date, 'apres-midi', dayName, morningPlanning
      );
      
      // Valider le planning généré
      const validation = validateDayPlanning([...morningPlanning, ...afternoonPlanning], availableEmployees);
      if (!validation.isValid) {
        console.error(`❌ Planning invalide pour ${dayName}:`, validation.errors);
        // On continue quand même avec le planning généré
      }
      
      planningEntries.push(...morningPlanning, ...afternoonPlanning);
      
    } catch (error) {
      console.error(`❌ Erreur génération ${dayName}:`, error);
      throw error;
    }
  }
  
  // Validation finale
  const finalValidation = validateWeeklyPlanning(planningEntries, employees);
  console.log('🎯 VALIDATION FINALE:', finalValidation);
  
  return {
    success: true,
    planningEntries,
    validation: finalValidation,
    summary: {
      totalDays: weekDates.length,
      totalEntries: planningEntries.length,
      employeesUsed: [...new Set(planningEntries.map(e => e.employee_id))].length
    }
  };
}

/**
 * Génère le planning pour une journée (matin ou après-midi)
 */
async function generateDayPlanning(availableEmployees, vehicles, competences, date, creneau, dayName, morningPlanning = null) {
  console.log(`\n🔧 Génération ${creneau} - ${dayName}`);
  
  const planning = [];
  const employeesUsed = new Set();
  
  // Si après-midi, reprendre les équipes du matin
  if (creneau === 'apres-midi' && morningPlanning) {
    return adaptMorningToAfternoon(morningPlanning, date, creneau);
  }
  
  // Trier les véhicules par priorité
  const sortedVehicles = sortVehiclesByPriority(vehicles, dayName);
  console.log('🚗 Ordre des véhicules:', sortedVehicles.map(v => v.nom));
  
  // Assignation véhicule par véhicule
  for (const vehicle of sortedVehicles) {
    console.log(`\n🚐 === ASSIGNATION ${vehicle.nom.toUpperCase()} ===`);
    
    let teamMembers = [];
    
    // Règles spéciales par véhicule
    if (vehicle.nom === 'Transit') {
      teamMembers = assignTransitTeam(availableEmployees, employeesUsed, dayName);
      
      // Valider l'équipe Transit
      const transitValidation = validateTransitTeam(teamMembers, availableEmployees);
      if (!transitValidation.isValid) {
        console.warn('⚠️ Équipe Transit invalide:', transitValidation.errors);
      }
      
    } else if (vehicle.nom === 'Caddy') {
      teamMembers = assignCaddyTeam(availableEmployees, employeesUsed);
      
    } else {
      // Véhicules standards avec règles spéciales
      teamMembers = assignStandardVehicle(vehicle, availableEmployees, competences, employeesUsed, dayName);
    }
    
    // Ajouter les membres au planning
    teamMembers.forEach(member => {
      planning.push({
        employee_id: member.employee_id,
        vehicule_id: vehicle.id,
        date: date,
        creneau: creneau,
        role: member.role,
        notes: member.notes || null
      });
      employeesUsed.add(member.employee_id);
    });
    
    console.log(`✅ ${vehicle.nom}: ${teamMembers.length} membres assignés`);
  }
  
        // ÉTAPE FINALE : Affecter les employés restants (règle d'affectation complète)
  assignRemainingEmployees(availableEmployees, vehicles, competences, employeesUsed, planning, date, creneau);
  
  // ÉTAPE FINALE 2 : S'assurer que tous les véhicules ont un assistant
  ensureAssistantsForAllVehicles(vehicles, planning);
  
  console.log(`\n🎯 ${creneau} terminé: ${planning.length} assignations`);
  console.log(`👥 Employés affectés: ${employeesUsed.size}/${availableEmployees.length}`);
  
  return planning;
}

/**
 * Assigne l'équipe Caddy (règles simples)
 */
function assignCaddyTeam(availableEmployees, employeesUsed) {
  const team = [];
  
  // Elton toujours présent
  const elton = availableEmployees.find(emp => emp.nom === 'Elton' && !employeesUsed.has(emp.id));
  if (elton) {
    team.push({
      employee_id: elton.id,
      role: 'Équipier',
      notes: 'Membre fixe Caddy'
    });
    employeesUsed.add(elton.id);
  }
  
  // Compléter avec 2-3 autres (pas de rôle conducteur sur Caddy)
  const others = availableEmployees.filter(emp => !employeesUsed.has(emp.id));
  for (let i = 0; i < 2 && others.length > 0; i++) {
    const member = others.shift();
    if (canJoinTeam(team, member.nom, availableEmployees).canJoin) {
      team.push({
        employee_id: member.id,
        role: 'Équipier',
        notes: `Équipier Caddy (${member.profil})`
      });
      employeesUsed.add(member.id);
    }
  }
  
  // Promouvoir le premier équipier (après Elton) en Assistant
  if (team.length > 1) {
    const firstEquipier = team.find((member, index) => index > 0 && member.role === 'Équipier');
    if (firstEquipier) {
      firstEquipier.role = 'Assistant';
      firstEquipier.notes = firstEquipier.notes.replace('Équipier', 'Assistant');
    }
  }
  
  return team;
}

/**
 * Assigne un véhicule standard (Crafter, Ducato, Jumper)
 */
function assignStandardVehicle(vehicle, availableEmployees, competences, employeesUsed, dayName) {
  const team = [];
  
  // Règles spéciales pour Margot (Crafter 21) et Martial (Ducato)
  const specialAssignment = trySpecialAssignment(vehicle, availableEmployees, employeesUsed);
  if (specialAssignment) {
    team.push(specialAssignment);
    employeesUsed.add(specialAssignment.employee_id);
  }
  
  // Récupérer les employés compétents restants
  const competentEmployees = getCompetentEmployees(vehicle.id, availableEmployees, competences, employeesUsed);
  
  if (competentEmployees.length === 0) {
    console.warn(`⚠️ Aucun employé compétent pour ${vehicle.nom}`);
    return team;
  }
  
  // Assigner un conducteur si pas déjà fait
  if (team.filter(m => m.role === 'Conducteur').length === 0) {
    const driver = selectDriver(competentEmployees);
    if (driver) {
      team.push({
        employee_id: driver.id,
        role: 'Conducteur',
        notes: `Conducteur ${vehicle.nom} (${driver.profil})`
      });
      employeesUsed.add(driver.id);
    }
  }
  
  // Compléter l'équipe
  const remaining = competentEmployees.filter(emp => !employeesUsed.has(emp.id));
  const slotsNeeded = Math.min(vehicle.capacite - team.length, 3);
  
  for (let i = 0; i < slotsNeeded && remaining.length > 0; i++) {
    const member = remaining.shift();
    if (canJoinTeam(team, member.nom, availableEmployees).canJoin) {
      team.push({
        employee_id: member.id,
        role: 'Équipier',
        notes: `Équipier ${vehicle.nom} (${member.profil})`
      });
      employeesUsed.add(member.id);
    }
  }
  
  // Promouvoir le premier équipier en Assistant
  if (team.length > 1) {
    const firstEquipier = team.find(member => member.role === 'Équipier');
    if (firstEquipier) {
      firstEquipier.role = 'Assistant';
      firstEquipier.notes = firstEquipier.notes.replace('Équipier', 'Assistant');
    }
  }
  
  return team;
}

/**
 * Tentative d'assignation spéciale (Margot → Crafter 21, Martial → Ducato)
 */
function trySpecialAssignment(vehicle, availableEmployees, employeesUsed) {
  if (vehicle.nom === 'Crafter 21') {
    const margot = availableEmployees.find(emp => emp.nom === 'Margot' && !employeesUsed.has(emp.id));
    if (margot) {
      console.log('✅ Assignation spéciale: Margot → Crafter 21');
      return {
        employee_id: margot.id,
        role: (margot.permis && canBeDriver(margot.nom)) ? 'Conducteur' : 'Équipier',
        notes: `Assignation prioritaire Crafter 21 - Margot (${margot.profil})`
      };
    }
  }
  
  if (vehicle.nom === 'Ducato') {
    const martial = availableEmployees.find(emp => emp.nom === 'Martial' && !employeesUsed.has(emp.id));
    if (martial) {
      console.log('✅ Assignation spéciale: Martial → Ducato');
      return {
        employee_id: martial.id,
        role: (martial.permis && canBeDriver(martial.nom)) ? 'Conducteur' : 'Équipier',
        notes: `Assignation prioritaire Ducato - Martial (${martial.profil})`
      };
    }
  }
  
  return null;
}

/**
 * Adapte le planning du matin pour l'après-midi
 */
function adaptMorningToAfternoon(morningPlanning, date, creneau) {
  return morningPlanning.map(entry => ({
    ...entry,
    creneau: creneau
  }));
}

/**
 * Sélectionne le meilleur conducteur
 */
function selectDriver(competentEmployees) {
  const candidates = competentEmployees.filter(emp => emp.permis);
  if (candidates.length === 0) return null;
  
  // Priorité : Fort > Moyen > Faible
  candidates.sort((a, b) => {
    const priority = { 'Fort': 3, 'Moyen': 2, 'Faible': 1 };
    return (priority[b.profil] || 0) - (priority[a.profil] || 0);
  });
  
  return candidates[0];
}

/**
 * Récupère les employés compétents pour un véhicule
 */
function getCompetentEmployees(vehicleId, employees, competences, employeesUsed) {
  return employees.filter(emp => {
    if (employeesUsed.has(emp.id)) return false;
    
    const competence = competences.find(c => 
      c.employee_id === emp.id && c.vehicule_id === vehicleId
    );
    
    return competence && ['en formation', 'XX'].includes(competence.niveau);
  });
}

/**
 * Trie les véhicules par priorité
 */
function sortVehiclesByPriority(vehicles, dayName) {
  return [...vehicles].sort((a, b) => {
    // Ducato prioritaire jeudi/vendredi
    const ducatoPriority = ['jeudi', 'vendredi'].includes(dayName);
    if (a.nom === 'Ducato' && ducatoPriority) return -1;
    if (b.nom === 'Ducato' && ducatoPriority) return 1;
    
    // Caddy en dernier
    if (a.nom === 'Caddy') return 1;
    if (b.nom === 'Caddy') return -1;
    
    // Transit avant Caddy mais après autres
    if (a.nom === 'Transit' && b.nom === 'Caddy') return -1;
    if (b.nom === 'Transit' && a.nom === 'Caddy') return 1;
    if (a.nom === 'Transit') return 1;
    if (b.nom === 'Transit') return -1;
    
    // Ducato moins prioritaire si pas jeudi/vendredi
    if (a.nom === 'Ducato' && !ducatoPriority) return 1;
    if (b.nom === 'Ducato' && !ducatoPriority) return -1;
    
    return 0;
  });
}

/**
 * Valide le planning d'une journée
 */
function validateDayPlanning(dayPlanning, availableEmployees) {
  const errors = [];
  
  // Vérifier les conflits
  const conflictValidation = validateNoConflicts(
    groupPlanningByVehicle(dayPlanning), 
    availableEmployees
  );
  
  if (!conflictValidation.isValid) {
    errors.push(...conflictValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valide le planning de toute la semaine
 */
function validateWeeklyPlanning(weeklyPlanning, allEmployees) {
  const summary = {
    totalEntries: weeklyPlanning.length,
    conflictErrors: 0,
    otherErrors: 0
  };
  
  // Grouper par jour pour validation
  const byDay = {};
  weeklyPlanning.forEach(entry => {
    const key = `${entry.date}-${entry.creneau}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(entry);
  });
  
  for (const [dayKey, dayPlanning] of Object.entries(byDay)) {
    const validation = validateDayPlanning(dayPlanning, allEmployees);
    if (!validation.isValid) {
      summary.conflictErrors += validation.errors.length;
    }
  }
  
  return {
    isValid: summary.conflictErrors === 0,
    summary
  };
}

/**
 * Groupe le planning par véhicule
 */
function groupPlanningByVehicle(planning) {
  const grouped = {};
  planning.forEach(entry => {
    const vehicleName = `Vehicle_${entry.vehicule_id}`;
    if (!grouped[vehicleName]) grouped[vehicleName] = [];
    grouped[vehicleName].push(entry);
  });
  return grouped;
}

/**
 * Affecte les employés restants dans les véhicules ayant encore de la place
 * RÈGLE : Tous les employés disponibles doivent être affectés
 */
function assignRemainingEmployees(availableEmployees, vehicles, competences, employeesUsed, planning, date, creneau) {
  const remainingEmployees = availableEmployees.filter(emp => !employeesUsed.has(emp.id));
  
  if (remainingEmployees.length === 0) {
    console.log('✅ Tous les employés sont déjà affectés');
    return;
  }
  
  console.log(`\n🎯 AFFECTATION COMPLÈTE: ${remainingEmployees.length} employés restants`);
  
  // Grouper le planning par véhicule pour voir les places disponibles
  const vehicleAssignments = {};
  vehicles.forEach(vehicle => {
    vehicleAssignments[vehicle.id] = planning.filter(entry => entry.vehicule_id === vehicle.id);
  });
  
  // Essayer d'affecter chaque employé restant
  for (const employee of remainingEmployees) {
    let assigned = false;
    
    // Chercher un véhicule avec de la place
    for (const vehicle of vehicles) {
      const currentTeam = vehicleAssignments[vehicle.id] || [];
      
      // Vérifier s'il reste de la place
      if (currentTeam.length >= vehicle.capacite) continue;
      
      // Vérifier les compétences
      const hasCompetence = competences.some(c => 
        c.employee_id === employee.id && 
        c.vehicule_id === vehicle.id && 
        ['en formation', 'XX'].includes(c.niveau)
      );
      
      if (!hasCompetence) continue;
      
      // Vérifier les conflits
      const teamMembers = currentTeam.map(entry => ({ employee_id: entry.employee_id }));
      const joinResult = canJoinTeam(teamMembers, employee.nom, availableEmployees);
      
      if (joinResult.canJoin) {
        // Affecter l'employé
        const newEntry = {
          employee_id: employee.id,
          vehicule_id: vehicle.id,
          date: date,
          creneau: creneau,
          role: 'Équipier',
          notes: `Affectation complète - ${employee.profil}`
        };
        
        planning.push(newEntry);
        vehicleAssignments[vehicle.id].push(newEntry);
        employeesUsed.add(employee.id);
        assigned = true;
        
        console.log(`✅ ${employee.nom} → ${vehicle.nom} (affectation complète)`);
        break;
      }
    }
    
    if (!assigned) {
      console.warn(`⚠️ Impossible d'affecter ${employee.nom} (conflits ou compétences)`);
    }
  }
}

/**
 * S'assure que tous les véhicules avec des employés ont au moins un assistant
 */
function ensureAssistantsForAllVehicles(vehicles, planning) {
  console.log('\n🎯 VÉRIFICATION ASSISTANTS pour tous les véhicules...');
  
  vehicles.forEach(vehicle => {
    const vehicleTeam = planning.filter(entry => entry.vehicule_id === vehicle.id);
    
    if (vehicleTeam.length === 0) return; // Véhicule vide
    
    const hasAssistant = vehicleTeam.some(member => member.role === 'Assistant');
    
    if (!hasAssistant && vehicleTeam.length > 1) {
      // Promouvoir le premier équipier en Assistant
      const firstEquipier = vehicleTeam.find(member => member.role === 'Équipier');
      if (firstEquipier) {
        firstEquipier.role = 'Assistant';
        firstEquipier.notes = firstEquipier.notes ? 
          firstEquipier.notes.replace('Équipier', 'Assistant') : 
          'Promu Assistant';
        console.log(`✅ ${vehicle.nom}: Premier équipier promu Assistant`);
      }
    }
  });
}

/**
 * Génère les dates d'une semaine
 */
function generateWeekDates(startDate) {
  const dates = [];
  const current = new Date(startDate);
  
  // Générer du lundi au vendredi
  for (let i = 0; i < 5; i++) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
} 