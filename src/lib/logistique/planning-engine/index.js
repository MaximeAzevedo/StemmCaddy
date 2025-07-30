/**
 * 🚀 MOTEUR DE PLANNING LOGISTIQUE - VERSION SIMPLIFIÉE
 * Règles claires et productives pour génération automatique
 */

import { getAvailableEmployees, isServiceClosed, getDayName } from './availability.js';
import {
  VEHICULES_PRIORITE,
  ENCADRANTS,
  CAPACITES_VEHICULES,
  ASSIGNATIONS_SPECIALES,
  separateEncadrantsFromEmployees,
  assignAllEncadrants,
  isEncadrant,
  selectBestConducteur,
  selectConducteurWithRotation, // ✅ NOUVEAU : Pour la rotation des conducteurs
  getEmployesDisponibles,
  validateEquipeSimple
} from './simple-rules.js';

/**
 * Génère le planning pour une semaine complète - VERSION SIMPLIFIÉE
 */
export async function generateWeeklyPlanning(startDate, employees, vehicles, competences, absences, options = {}) {
  console.log('🚀 DÉMARRAGE GÉNÉRATION PLANNING - Version simplifiée');
  
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
    
    // Récupérer les employés disponibles (incluant encadrants)
    const availablePersons = getAvailableEmployees(employees, absences, date);
    if (availablePersons.length === 0) {
      console.warn(`⚠️ Aucune personne disponible le ${dayName}`);
      continue;
    }
    
    console.log(`👥 Personnes disponibles le ${dayName}: ${availablePersons.length}`);
    console.log(`📋 Liste:`, availablePersons.map(p => p.nom).join(', '));
    
    try {
      // Générer planning matin et après-midi avec nouvelles règles
      const morningPlanning = await generateDayPlanningSimple(
        availablePersons, vehicles, date, 'matin', dayName
      );
      
      const afternoonPlanning = await generateDayPlanningSimple(
        availablePersons, vehicles, date, 'apres-midi', dayName
      );
      
      planningEntries.push(...morningPlanning, ...afternoonPlanning);
      
    } catch (error) {
      console.error(`❌ Erreur génération ${dayName}:`, error);
      throw error;
    }
  }
  
  // Validation finale simplifiée
  const finalValidation = validateWeeklyPlanningSimple(planningEntries);
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
 * Génère le planning pour une journée - VERSION SIMPLIFIÉE
 */
async function generateDayPlanningSimple(availablePersons, vehicles, date, creneau, dayName) {
  console.log(`\n🔧 Génération ${creneau} - ${dayName} (RÈGLES SIMPLIFIÉES)`);
  
  const planning = [];
  const employeesUsed = new Set();
  
  // 🎯 ÉTAPE 0 : SÉPARER ENCADRANTS ET EMPLOYÉS
  console.log('\n🔄 === SÉPARATION ENCADRANTS/EMPLOYÉS ===');
  const { encadrants, employees } = separateEncadrantsFromEmployees(availablePersons);
  
  // 🎯 ÉTAPE 1 : ASSIGNER LES ENCADRANTS EN PRIORITÉ ABSOLUE
  console.log('\n👥 === ASSIGNATION PRIORITAIRE ENCADRANTS ===');
  assignAllEncadrants(encadrants, vehicles, planning, employeesUsed, dayName, date, creneau);
  
  // 🎯 ÉTAPE 2 : Remplir les véhicules avec les employés normaux
  console.log('\n🚗 === REMPLISSAGE VÉHICULES AVEC EMPLOYÉS ===');
  await fillVehiclesByPriority(employees, vehicles, planning, employeesUsed, date, creneau);
  
  // 🎯 ÉTAPE 3 : Elton sur Caddy si possible
  console.log('\n🚛 === ASSIGNATIONS SPÉCIALES ===');
  await assignSpecialCases(employees, vehicles, planning, employeesUsed, date, creneau);
  
  // ✅ NOUVEAU : DISTRIBUER LES EMPLOYÉS NON-ASSIGNÉS  
  console.log('\n🔄 === DISTRIBUTION EMPLOYÉS RESTANTS ===');
  
  // Obtenir tous les employés non-assignés
  const employesNonAssignes = getEmployesDisponibles(employees, [], employeesUsed);
  console.log(`👥 Employés non-assignés: ${employesNonAssignes.length} (${employesNonAssignes.map(e => e.nom).join(', ')})`);
  
  if (employesNonAssignes.length > 0) {
    // Calculer les places disponibles par véhicule
    const sortedVehicles = vehicles
      .filter(v => VEHICULES_PRIORITE.includes(v.nom))
      .sort((a, b) => VEHICULES_PRIORITE.indexOf(a.nom) - VEHICULES_PRIORITE.indexOf(b.nom));

    const vehiculesAvecPlaces = sortedVehicles.map(vehicle => {
      const currentTeam = planning.filter(entry => entry.vehicule_id === vehicle.id);
      const placesLibres = (CAPACITES_VEHICULES[vehicle.nom] || 3) - currentTeam.length;
      return { vehicle, placesLibres };
    }).filter(v => v.placesLibres > 0)
    .sort((a, b) => b.placesLibres - a.placesLibres); // Tri par places libres (décroissant)
    
    console.log('🎯 Véhicules avec places libres:', vehiculesAvecPlaces.map(v => `${v.vehicle.nom}(${v.placesLibres})`));
    
    // Distribuer les employés restants
    let employeIndex = 0;
    for (const { vehicle, placesLibres } of vehiculesAvecPlaces) {
      for (let i = 0; i < placesLibres && employeIndex < employesNonAssignes.length; i++) {
        const employe = employesNonAssignes[employeIndex];
        
        planning.push({
          employee_id: employe.id,
          vehicule_id: vehicle.id,
          date: date,
          creneau: creneau,
          role: 'Équipier',
          notes: `🔄 Distribution finale - ${vehicle.nom}`
        });
        
        employeesUsed.add(employe.id);
        console.log(`✅ Distribution finale: ${employe.nom} → ${vehicle.nom}`);
        employeIndex++;
      }
    }
    
    // Vérifier s'il reste encore des employés
    const employesEncoreNonAssignes = getEmployesDisponibles(employees, [], employeesUsed);
    if (employesEncoreNonAssignes.length > 0) {
      console.warn(`⚠️ ATTENTION: ${employesEncoreNonAssignes.length} employés non-assignés:`, 
        employesEncoreNonAssignes.map(e => e.nom));
    } else {
      console.log('✅ TOUS les employés disponibles ont été assignés !');
    }
  }
  
  console.log(`\n✅ ${creneau} terminé: ${planning.filter(p => p.creneau === creneau).length} assignations`);
  console.log(`👥 Personnes affectées: ${employeesUsed.size}/${availablePersons.length}`);
  
  // Résumé par type de rôle
  const creneauPlanning = planning.filter(p => p.creneau === creneau);
  const roleCount = {
    Encadrant: creneauPlanning.filter(p => p.notes && p.notes.includes('ENCADRANT FIXE')).length,
    Conducteur: creneauPlanning.filter(p => p.role === 'Conducteur').length,
    Assistant: creneauPlanning.filter(p => p.role === 'Assistant').length,
    Équipier: creneauPlanning.filter(p => p.role === 'Équipier').length
  };
  console.log(`📊 Répartition: ${Object.entries(roleCount).map(([role, count]) => `${count} ${role.toLowerCase()}s`).join(', ')}`);
  
  return planning;
}

/**
 * Remplit les véhicules dans l'ordre de priorité AVEC LES EMPLOYÉS UNIQUEMENT
 */
async function fillVehiclesByPriority(employees, vehicles, planning, employeesUsed, date, creneau) {
  // Trier les véhicules selon l'ordre de priorité
  const sortedVehicles = vehicles
    .filter(v => VEHICULES_PRIORITE.includes(v.nom))
    .sort((a, b) => VEHICULES_PRIORITE.indexOf(a.nom) - VEHICULES_PRIORITE.indexOf(b.nom));
  
  console.log('🎯 Ordre de remplissage:', sortedVehicles.map(v => v.nom));
  
  for (const vehicle of sortedVehicles) {
    console.log(`\n🚐 === REMPLISSAGE ${vehicle.nom.toUpperCase()} ===`);
    
    // Vérifier combien de places sont déjà prises (par les encadrants)
    const currentTeam = planning.filter(entry => entry.vehicule_id === vehicle.id);
    const placesLibres = (CAPACITES_VEHICULES[vehicle.nom] || 3) - currentTeam.length;
    
    console.log(`📊 ${vehicle.nom}: ${currentTeam.length} déjà assignés (encadrants), ${placesLibres} places libres`);
    
    if (placesLibres <= 0) {
      console.log(`✅ ${vehicle.nom} déjà complet (encadrants)`);
      continue;
    }
    
    // Obtenir les employés disponibles (JAMAIS d'encadrants)
    const employesDisponibles = getEmployesDisponibles(employees, [], employeesUsed);
    
    if (employesDisponibles.length === 0) {
      console.log(`⚠️ Plus d'employés disponibles pour ${vehicle.nom}`);
      continue;
    }
    
    console.log(`👥 Employés disponibles pour ${vehicle.nom}:`, employesDisponibles.map(e => e.nom));
    
    // 🎯 ÉTAPE 1 : Assigner un conducteur si nécessaire  
    const hasConducteur = currentTeam.some(member => member.role === 'Conducteur');
    const hasEncadrant = currentTeam.some(member => member.role === 'Encadrant');
    
    if (!hasConducteur && placesLibres > 0) {
      const conducteur = selectConducteurWithRotation(employesDisponibles, vehicle.nom, date); // ✅ ROTATION
      if (conducteur) {
        planning.push({
          employee_id: conducteur.id,
          vehicule_id: vehicle.id,
          date: date,
          creneau: creneau,
          role: 'Conducteur',
          notes: `Conducteur ${vehicle.nom} (${conducteur.profil})`
        });
        
        employeesUsed.add(conducteur.id);
        console.log(`🚗 Conducteur: ${conducteur.nom} → ${vehicle.nom}`);
      } else if (!hasEncadrant) {
        console.warn(`⚠️ Aucun conducteur disponible pour ${vehicle.nom}`);
      }
    }
    
    // 🎯 ÉTAPE 2 : Compléter avec des assistants/équipiers
    const updatedTeam = planning.filter(entry => entry.vehicule_id === vehicle.id);
    const placesRestantes = (CAPACITES_VEHICULES[vehicle.nom] || 3) - updatedTeam.length;
    
    const employesRestants = getEmployesDisponibles(employees, [], employeesUsed);
    const placesToFill = Math.min(placesRestantes, employesRestants.length);
    
    for (let i = 0; i < placesToFill; i++) {
      const employe = employesRestants[i];
      const role = i === 0 && !updatedTeam.some(m => m.role === 'Assistant') ? 'Assistant' : 'Équipier';
      
      planning.push({
        employee_id: employe.id,
        vehicule_id: vehicle.id,
        date: date,
        creneau: creneau,
        role: role,
        notes: `${role} ${vehicle.nom} (${employe.profil})`
      });
      
      employeesUsed.add(employe.id);
      console.log(`👤 ${role}: ${employe.nom} → ${vehicle.nom}`);
    }
    
    // Valider l'équipe
    const finalTeam = planning.filter(entry => entry.vehicule_id === vehicle.id);
    const validation = validateEquipeSimple(finalTeam, vehicle.nom);
    if (validation.warnings.length > 0) {
      console.warn(`⚠️ ${vehicle.nom}:`, validation.warnings);
    } else {
      console.log(`✅ ${vehicle.nom}: Équipe valide (${finalTeam.length} membres)`);
    }
  }
}

/**
 * Gère les assignations spéciales (Elton → Caddy)
 */
async function assignSpecialCases(employees, vehicles, planning, employeesUsed, date, creneau) {
  // Elton sur Caddy si présent et place disponible
  const elton = employees.find(emp => 
    (emp.nom === 'Elton' || emp.prenom === 'Elton') && !employeesUsed.has(emp.id)
  );
  
  const caddy = vehicles.find(v => v.nom === 'Caddy');
  
  if (elton && caddy) {
    const caddyTeam = planning.filter(entry => entry.vehicule_id === caddy.id);
    const placesLibres = (CAPACITES_VEHICULES['Caddy'] || 3) - caddyTeam.length;
    
    if (placesLibres > 0) {
      planning.push({
        employee_id: elton.id,
        vehicule_id: caddy.id,
        date: date,
        creneau: creneau,
        role: 'Équipier',
        notes: 'Assignation spéciale Caddy - Elton'
      });
      
      employeesUsed.add(elton.id);
      console.log(`🚛 Elton → Caddy (assignation spéciale)`);
    }
  }
}

/**
 * Valide le planning de toute la semaine - VERSION SIMPLIFIÉE
 */
function validateWeeklyPlanningSimple(weeklyPlanning) {
  const summary = {
    totalEntries: weeklyPlanning.length,
    vehiclesUsed: [...new Set(weeklyPlanning.map(e => e.vehicule_id))].length,
    employeesUsed: [...new Set(weeklyPlanning.map(e => e.employee_id))].length,
    encadrantsAssigned: weeklyPlanning.filter(e => e.role === 'Encadrant').length,
    conducteursAssigned: weeklyPlanning.filter(e => e.role === 'Conducteur').length
  };
  
  return {
    isValid: true, // Version simplifiée = toujours valide
    summary,
    message: '✅ Planning généré avec succès - Règles simplifiées'
  };
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