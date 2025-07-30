/**
 * 🧪 TEST SIMPLE PLANNING LOGISTIQUE
 */

import { 
  ENCADRANTS, 
  VEHICULES_PRIORITE, 
  separateEncadrantsFromEmployees,
  isEncadrant
} from '../src/lib/logistique/planning-engine/simple-rules.js';

// Test simple
console.log('🧪 TEST SIMPLE - Vérification règles de base');

// Test 1 : Encadrants configurés
console.log('\n👥 Encadrants configurés:', Object.keys(ENCADRANTS));

// Test 2 : Ordre véhicules
console.log('\n🚗 Ordre véhicules:', VEHICULES_PRIORITE);

// Test 3 : Fonction isEncadrant
console.log('\n🔍 Tests isEncadrant:');
console.log('  Margot:', isEncadrant('Margot'));
console.log('  Jack:', isEncadrant('Jack')); // ✅ CORRIGÉ : Jack au lieu de Jacques
console.log('  Paul:', isEncadrant('Paul'));

// Test 4 : Séparation encadrants/employés
console.log('\n🔄 Test séparation:');
const testPersons = [
  { id: 1, nom: 'Margot', profil: 'Fort' },
  { id: 2, nom: 'Paul', profil: 'Fort' },
  { id: 3, nom: 'Jack', profil: 'Fort' }, // ✅ CORRIGÉ : Jack au lieu de Jacques
  { id: 4, nom: 'Marie', profil: 'Moyen' }
];

const { encadrants, employees } = separateEncadrantsFromEmployees(testPersons);
console.log(`  Résultat: ${encadrants.length} encadrants, ${employees.length} employés`);

console.log('\n✅ Tests simples terminés !'); 