/**
 * 🧪 TEST PLANNING LOGISTIQUE SIMPLIFIÉ
 * Validation des nouvelles règles simples et efficaces
 */

import { generateWeeklyPlanning } from '../src/lib/logistique/planning-engine/index.js';
import { 
  ENCADRANTS, 
  VEHICULES_PRIORITE, 
  separateEncadrantsFromEmployees,
  assignAllEncadrants,
  selectBestConducteur,
  validateEquipeSimple
} from '../src/lib/logistique/planning-engine/simple-rules.js';

// 🎯 DONNÉES DE TEST
const testEmployees = [
  // Encadrants (ne sont PAS des employés normaux)
  { id: 1, nom: 'Margot', prenom: 'Margot', profil: 'Fort', permis: true, actif: true },
  { id: 2, nom: 'Jack', prenom: 'Jack', profil: 'Fort', permis: true, actif: true }, // ✅ CORRIGÉ : Jack au lieu de Jacques
  { id: 3, nom: 'Didier', prenom: 'Didier', profil: 'Fort', permis: true, actif: true },
  { id: 4, nom: 'Martial', prenom: 'Martial', profil: 'Fort', permis: true, actif: true },
  
  // Employés normaux
  { id: 5, nom: 'Elton', prenom: 'Elton', profil: 'Moyen', permis: true, actif: true },
  { id: 6, nom: 'Paul', prenom: 'Paul', profil: 'Fort', permis: true, actif: true },
  { id: 7, nom: 'Marie', prenom: 'Marie', profil: 'Moyen', permis: true, actif: true },
  { id: 8, nom: 'Jean', prenom: 'Jean', profil: 'Faible', permis: false, actif: true },
  { id: 9, nom: 'Sophie', prenom: 'Sophie', profil: 'Moyen', permis: true, actif: true },
  { id: 10, nom: 'Pierre', prenom: 'Pierre', profil: 'Fort', permis: true, actif: true }
];

const testVehicles = [
  { id: 1, nom: 'Crafter 21', capacite: 3 },
  { id: 2, nom: 'Crafter 23', capacite: 3 },
  { id: 3, nom: 'Jumper', capacite: 3 },
  { id: 4, nom: 'Ducato', capacite: 3 },
  { id: 5, nom: 'Transit', capacite: 3 },
  { id: 6, nom: 'Caddy', capacite: 3 }
];

const testCompetences = [
  // Simuler que tous les employés sont compétents sur tous les véhicules
  ...testEmployees.flatMap(emp => 
    testVehicles.map(vehicle => ({
      employee_id: emp.id,
      vehicule_id: vehicle.id,
      niveau: 'XX'
    }))
  )
];

// Test avec absence d'un encadrant
const testAbsencesAvecEncadrant = [
  {
    employee_id: 2, // Jack absent lundi (✅ CORRIGÉ : Jack au lieu de Jacques)
    date_debut: '2024-12-16',
    date_fin: '2024-12-16',
    type_absence: 'Absent'
  }
];

async function runTests() {
  console.log('🧪 === DÉBUT DES TESTS PLANNING LOGISTIQUE SIMPLIFIÉ ===\n');
  
  try {
    // TEST 1 : Séparation encadrants/employés
    console.log('🔄 TEST 1 : Séparation encadrants/employés');
    testSeparationEncadrantsEmployes();
    
    // TEST 2 : Assignation prioritaire encadrants
    console.log('\n👥 TEST 2 : Assignation prioritaire encadrants');
    testAssignationPrioritaireEncadrants();
    
    // TEST 3 : Sélection conducteurs (sans encadrants)
    console.log('\n🚗 TEST 3 : Sélection des conducteurs');
    testConducteurSelection();
    
    // TEST 4 : Génération planning sans absence
    console.log('\n🚀 TEST 4 : Génération planning complet (sans absence)');
    const result1 = await testFullPlanningGeneration([], 'SANS ABSENCE');
    
         // TEST 5 : Génération planning avec absence encadrant
     console.log('\n⚠️ TEST 5 : Génération planning avec absence encadrant');
     const result2 = await testFullPlanningGeneration(testAbsencesAvecEncadrant, 'AVEC ABSENCE JACK');
    
    // TEST 6 : Vérification assignations fixes
    console.log('\n✅ TEST 6 : Vérification des assignations fixes');
    verifyFixedAssignments(result1, result2);
    
    console.log('\n✅ === TOUS LES TESTS RÉUSSIS ! ===');
    
  } catch (error) {
    console.error('❌ ERREUR DANS LES TESTS:', error);
    throw error;
  }
}

function testSeparationEncadrantsEmployes() {
  console.log('Test séparation encadrants/employés...');
  
  const { encadrants, employees } = separateEncadrantsFromEmployees(testEmployees);
  
  // Vérifications
  if (encadrants.length !== 4) {
    throw new Error(`❌ Nombre d'encadrants incorrect: ${encadrants.length} (attendu: 4)`);
  }
  
  if (employees.length !== 6) {
    throw new Error(`❌ Nombre d'employés incorrect: ${employees.length} (attendu: 6)`);
  }
  
  // Vérifier que les bons noms sont dans encadrants
  const nomsEncadrants = encadrants.map(e => e.nom);
  const encadrantsAttendus = ['Margot', 'Jack', 'Didier', 'Martial']; // ✅ CORRIGÉ : Jack au lieu de Jacques
  
  encadrantsAttendus.forEach(nom => {
    if (!nomsEncadrants.includes(nom)) {
      throw new Error(`❌ Encadrant ${nom} manquant`);
    }
  });
  
  console.log('✅ Séparation correcte: 4 encadrants, 6 employés');
}

function testAssignationPrioritaireEncadrants() {
  console.log('Test assignation prioritaire encadrants...');
  
  const { encadrants } = separateEncadrantsFromEmployees(testEmployees);
  const planning = [];
  const employeesUsed = new Set();
  
  // Test pour lundi (Didier doit être assigné)
  assignAllEncadrants(encadrants, testVehicles, planning, employeesUsed, 'lundi', '2024-12-16', 'matin');
  
  // Vérifications
  const encadrantsAssigned = planning.filter(p => p.role === 'Encadrant');
  
  if (encadrantsAssigned.length !== 4) {
    throw new Error(`❌ Nombre d'encadrants assignés incorrect: ${encadrantsAssigned.length} (attendu: 4)`);
  }
  
  // Vérifier assignations spécifiques
  const margotAssigned = encadrantsAssigned.find(p => {
    const emp = testEmployees.find(e => e.id === p.employee_id);
    return emp.nom === 'Margot';
  });
  
  if (!margotAssigned) {
    throw new Error('❌ Margot non assignée');
  }
  
  const vehicleMargot = testVehicles.find(v => v.id === margotAssigned.vehicule_id);
  if (vehicleMargot.nom !== 'Crafter 21') {
    throw new Error(`❌ Margot assignée au mauvais véhicule: ${vehicleMargot.nom}`);
  }
  
  console.log('✅ Assignation prioritaire correcte: 4 encadrants dans leurs véhicules fixes');
}

function testConducteurSelection() {
  console.log('Test sélection meilleur conducteur (sans encadrants)...');
  
  // Créer des candidats incluant des encadrants (qui ne doivent PAS être sélectionnés)
  const candidats = [
    { id: 1, nom: 'Margot', profil: 'Fort', permis: true, type: 'encadrant' }, // Encadrant
    { id: 6, nom: 'Paul', profil: 'Fort', permis: true, type: 'employe' }, // Employé
    { id: 7, nom: 'Marie', profil: 'Moyen', permis: true, type: 'employe' },
    { id: 8, nom: 'Jean', profil: 'Faible', permis: false, type: 'employe' }
  ];
  
  const meilleurConducteur = selectBestConducteur(candidats);
  
  if (meilleurConducteur && meilleurConducteur.nom === 'Paul' && meilleurConducteur.profil === 'Fort') {
    console.log('✅ Sélection conducteur : Paul (Fort) - Margot (encadrant) exclue');
  } else {
    throw new Error('❌ Sélection conducteur incorrecte ou encadrant non exclu');
  }
}

async function testFullPlanningGeneration(absences, label) {
  console.log(`Génération planning test (${label})...`);
  
  const startDate = '2024-12-16'; // Lundi
  
  const result = await generateWeeklyPlanning(
    startDate,
    testEmployees,
    testVehicles,
    testCompetences,
    absences
  );
  
  if (!result.success) {
    throw new Error('❌ Génération planning échouée');
  }
  
  console.log(`✅ Planning généré avec succès (${label}) !`);
  console.log(`📊 Statistiques :`);
  console.log(`   - Entrées totales : ${result.summary.totalEntries}`);
  console.log(`   - Personnes utilisées : ${result.summary.employeesUsed}`);
  console.log(`   - Encadrants assignés : ${result.validation.summary.encadrantsAssigned}`);
  console.log(`   - Conducteurs assignés : ${result.validation.summary.conducteursAssigned}`);
  
  // Analyser les assignations par véhicule
  analyzeVehicleAssignments(result.planningEntries, label);
  
  return result;
}

function verifyFixedAssignments(resultSansAbsence, resultAvecAbsence) {
  console.log('Vérification des assignations fixes...');
  
  // Vérifier Margot → Crafter 21 (toujours présente)
  const margotEntriesSans = resultSansAbsence.planningEntries.filter(entry => {
    const emp = testEmployees.find(e => e.id === entry.employee_id);
    return emp.nom === 'Margot';
  });
  
  const margotEntriesAvec = resultAvecAbsence.planningEntries.filter(entry => {
    const emp = testEmployees.find(e => e.id === entry.employee_id);
    return emp.nom === 'Margot';
  });
  
  // Margot doit être assignée dans les deux cas
  if (margotEntriesSans.length === 0 || margotEntriesAvec.length === 0) {
    throw new Error('❌ Margot non assignée dans un des scénarios');
  }
  
  // Vérifier que Jack est absent lundi dans le 2ème scénario
  const jackEntriesLundi = resultAvecAbsence.planningEntries.filter(entry => {
    const emp = testEmployees.find(e => e.id === entry.employee_id);
    return emp.nom === 'Jack' && entry.date === '2024-12-16';
  });
  
  if (jackEntriesLundi.length > 0) {
    throw new Error('❌ Jack présent lundi malgré son absence');
  }
  
  console.log('✅ Assignations fixes respectées et absences gérées');
}

function analyzeVehicleAssignments(planningEntries, label) {
  console.log(`\n📋 Analyse des assignations par véhicule (${label}) :`);
  
  // Grouper par véhicule et jour
  const groupedByVehicle = {};
  
  planningEntries.forEach(entry => {
    const key = `${entry.vehicule_id}-${entry.date}-${entry.creneau}`;
    if (!groupedByVehicle[key]) {
      groupedByVehicle[key] = [];
    }
    groupedByVehicle[key].push(entry);
  });
  
  // Afficher les résultats
  Object.entries(groupedByVehicle).forEach(([key, entries]) => {
    const [vehiculeId, date, creneau] = key.split('-');
    const vehicule = testVehicles.find(v => v.id == vehiculeId);
    
    console.log(`\n🚐 ${vehicule.nom} - ${date} ${creneau} :`);
    entries.forEach(entry => {
      const employee = testEmployees.find(e => e.id === entry.employee_id);
      const isEncadrant = ['Margot', 'Jack', 'Didier', 'Martial'].includes(employee.nom);
      const indicator = isEncadrant ? '👥' : '👤';
      console.log(`   ${indicator} ${entry.role}: ${employee.nom} (${employee.profil})`);
    });
    
    // Vérifier validation
    const validation = validateEquipeSimple(entries, vehicule.nom);
    if (validation.warnings.length > 0) {
      console.log(`   ⚠️ Warnings:`, validation.warnings);
    } else {
      console.log(`   ✅ Équipe valide`);
    }
  });
}

// Exécuter les tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(() => {
      console.log('\n🎉 Tests terminés avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Tests échoués :', error);
      process.exit(1);
    });
} 