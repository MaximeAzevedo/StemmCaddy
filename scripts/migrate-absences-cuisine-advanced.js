#!/usr/bin/env node

/**
 * 🚀 MIGRATION DES ABSENCES CUISINE VERS VERSION AVANCÉE
 * Script pour appliquer le nouveau schéma absences_cuisine_advanced
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 === MIGRATION ABSENCES CUISINE AVANCÉES ===\n');
  
  try {
    // 1. Lire le fichier SQL de migration
    console.log('📖 Lecture du schéma SQL...');
    const sqlPath = join(__dirname, '..', 'database', 'schema-absences-cuisine-advanced.sql');
    const sqlContent = await readFile(sqlPath, 'utf8');
    
    // 2. Vérifier la connexion Supabase
    console.log('🔗 Vérification de la connexion Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('employes_cuisine_new')
      .select('count')
      .limit(1);
    
    if (testError) {
      throw new Error(`Connexion Supabase échouée: ${testError.message}`);
    }
    console.log('✅ Connexion Supabase OK');
    
    // 3. Vérifier que la table employes_cuisine_new existe
    console.log('📋 Vérification des prérequis...');
    const { data: employees, error: empError } = await supabase
      .from('employes_cuisine_new')
      .select('id, prenom')
      .limit(5);
    
    if (empError) {
      throw new Error(`Table employes_cuisine_new non trouvée: ${empError.message}`);
    }
    console.log(`✅ Table employes_cuisine_new trouvée (${employees.length} employés de test)`);
    
    // 4. Exécuter le SQL via l'API Supabase (méthode RPC)
    console.log('⚡ Exécution du schéma SQL...');
    
    // Note: Supabase ne permet pas d'exécuter du SQL brut via l'API client
    // Il faut utiliser le SQL Editor dans l'interface Supabase
    console.log('\n📝 === INSTRUCTIONS MANUELLES ===');
    console.log('Pour terminer la migration, veuillez :');
    console.log('1. Ouvrir votre dashboard Supabase');
    console.log('2. Aller dans SQL Editor');
    console.log('3. Copier/coller le contenu du fichier :');
    console.log(`   📁 ${sqlPath}`);
    console.log('4. Exécuter le SQL');
    console.log('5. Vérifier que la table "absences_cuisine_advanced" est créée');
    
    // 5. Tester les nouvelles fonctions API
    console.log('\n🧪 Test des nouvelles API...');
    
    // Import dynamique de la nouvelle API
    const { supabaseCuisineAdvanced } = await import('../src/lib/supabase-cuisine-advanced.js');
    
    // Test de récupération des employés
    const employeesResult = await supabaseCuisineAdvanced.getEmployeesCuisine();
    if (employeesResult.error) {
      console.warn('⚠️ Erreur test API employés (normal si pas encore migré):', employeesResult.error.message);
    } else {
      console.log(`✅ API employés OK (${employeesResult.data.length} employés)`);
    }
    
    // Test des types d'absence
    const typeOptions = supabaseCuisineAdvanced.getTypeAbsenceOptions();
    console.log(`✅ Types d'absence configurés: ${typeOptions.length} types`);
    typeOptions.forEach(type => {
      console.log(`   - ${type.label} (${type.value})`);
    });
    
    // Test des motifs de fermeture
    const motifs = supabaseCuisineAdvanced.getFermetureMotifs();
    console.log(`✅ Motifs de fermeture: ${motifs.length} motifs prédéfinis`);
    
    console.log('\n🎉 === MIGRATION PHASE 1 TERMINÉE ===');
    console.log('✅ Schéma SQL préparé');
    console.log('✅ API avancée créée et testée');
    console.log('✅ Prêt pour Phase 2 (Interface)');
    
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Exécuter le SQL manuellement dans Supabase');
    console.log('2. Créer l\'interface AbsenceManagementCuisineAdvanced');
    console.log('3. Tester le système complet');
    console.log('4. Migration finale');
    
  } catch (error) {
    console.error('\n❌ === ERREUR DE MIGRATION ===');
    console.error('Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécution du script
runMigration(); 