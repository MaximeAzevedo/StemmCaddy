#!/usr/bin/env node

// Charger dotenv pour lire le fichier .env
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function checkDatabaseStatus() {
    console.log('🔍 VÉRIFICATION ÉTAT DE LA BASE DE DONNÉES\n');
    
    // Utiliser les variables d'environnement du projet
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    console.log('Configuration Supabase :');
    console.log(`  URL: ${supabaseUrl || 'NON DÉFINIE'}`);
    console.log(`  Clé: ${supabaseKey ? 'DÉFINIE' : 'NON DÉFINIE'}\n`);
    
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Variables d\'environnement manquantes');
        return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Tables à vérifier
    const tablesToCheck = [
        'employees_cuisine',       // Table finale attendue
        'employees_cuisine_new',   // Table nouvelle créée
        'planning_cuisine',        // Table finale attendue  
        'planning_cuisine_new',    // Table nouvelle créée
        'absences_cuisine',        // Table finale attendue
        'absences_cuisine_new',    // Table nouvelle créée
        'employees',               // Table principale
        'employes_cuisine',        // Autre variante
        'employes_cuisine_new'     // Autre variante nouvelle
    ];
    
    console.log('📊 ÉTAT DES TABLES :\n');
    
    const results = {};
    
    for (const table of tablesToCheck) {
        try {
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact' })
                .limit(3);
                
            if (error) {
                if (error.code === '42P01') {
                    console.log(`❌ ${table}: N'existe pas`);
                    results[table] = { exists: false };
                } else {
                    console.log(`⚠️  ${table}: ERREUR - ${error.message}`);
                    results[table] = { exists: true, error: error.message };
                }
            } else {
                console.log(`✅ ${table}: ${count || 0} enregistrements`);
                results[table] = { exists: true, count: count || 0 };
                
                if (data && data.length > 0) {
                    const sample = data[0];
                    console.log(`   📝 Colonnes: ${Object.keys(sample).join(', ')}`);
                    
                    // Afficher quelques exemples de noms si disponibles
                    if (sample.prenom || sample.nom) {
                        const names = data.map(item => item.prenom || item.nom).filter(Boolean);
                        if (names.length > 0) {
                            console.log(`   👤 Exemples: ${names.slice(0, 3).join(', ')}`);
                        }
                    }
                }
            }
        } catch (err) {
            console.log(`❌ ${table}: Exception - ${err.message}`);
            results[table] = { exists: false, exception: err.message };
        }
    }
    
    console.log('\n🎯 DIAGNOSTIC ET SOLUTION :\n');
    
    // Analyser les résultats
    const hasEmployeesCuisine = results['employees_cuisine']?.exists;
    const hasEmployeesCuisineNew = results['employees_cuisine_new']?.exists; 
    const hasEmployesCuisineNew = results['employes_cuisine_new']?.exists;
    
    const hasPlanningCuisine = results['planning_cuisine']?.exists;
    const hasPlanningCuisineNew = results['planning_cuisine_new']?.exists;
    
    const hasAbsencesCuisine = results['absences_cuisine']?.exists;
    const hasAbsencesCuisineNew = results['absences_cuisine_new']?.exists;
    
    console.log('État actuel :');
    console.log(`  Tables finales: ${hasEmployeesCuisine ? '✅' : '❌'} employees_cuisine, ${hasPlanningCuisine ? '✅' : '❌'} planning_cuisine, ${hasAbsencesCuisine ? '✅' : '❌'} absences_cuisine`);
    console.log(`  Tables _new: ${hasEmployeesCuisineNew ? '✅' : '❌'} employees_cuisine_new, ${hasPlanningCuisineNew ? '✅' : '❌'} planning_cuisine_new, ${hasAbsencesCuisineNew ? '✅' : '❌'} absences_cuisine_new`);
    console.log(`  Tables employes_*_new: ${hasEmployesCuisineNew ? '✅' : '❌'} employes_cuisine_new`);
    
    console.log('\n💡 SOLUTION RECOMMANDÉE :');
    
    if (hasEmployesCuisineNew || hasEmployeesCuisineNew || hasPlanningCuisineNew) {
        if (hasEmployeesCuisine || hasPlanningCuisine || hasAbsencesCuisine) {
            console.log('🔄 Migration partielle détectée');
            console.log('   Action: Finaliser la migration avec le script SQL');
            console.log('   📝 Exécuter: \\i database/migration-vers-nouveau-systeme.sql');
        } else {
            console.log('✅ Tables nouvelles créées mais pas encore migrées');
            console.log('   Action: Exécuter la migration finale');
            console.log('   📝 Exécuter: \\i database/migration-vers-nouveau-systeme.sql');
        }
    } else {
        console.log('🏗️  Aucune table nouvelle détectée');
        console.log('   Action: Créer le nouveau système d\'abord');
        console.log('   📝 Exécuter: \\i database/nouveau-systeme-cuisine-donnees-reelles.sql');
        console.log('   📝 Puis: \\i database/migration-vers-nouveau-systeme.sql');
    }
    
    // Vérifier aussi quelle table l'app essaie d'utiliser
    console.log('\n🚨 ERREUR APPLICATION :');
    console.log('   L\'app cherche: employees_cuisine, planning_cuisine, absences_cuisine');
    console.log('   Mais utilise: (voir erreurs dans la console)');
    console.log('   Solution immédiate: Créer/migrer vers les bonnes tables');
}

// Installer dotenv si nécessaire puis exécuter
checkDatabaseStatus().catch(console.error); 