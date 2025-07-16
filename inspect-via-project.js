#!/usr/bin/env node

/**
 * Script d'inspection via l'API du projet
 */

// Simuler l'environnement React
process.env.NODE_ENV = 'development';

async function inspectDatabase() {
    console.log('🔍 INSPECTION VIA L\'API DU PROJET\n');
    
    try {
        // Importer le client Supabase du projet
        const { supabaseCuisine } = require('./src/lib/supabase-cuisine.js');
        
        console.log('📊 TEST DES FONCTIONS API CUISINE :\n');
        
        // Test 1: Employés cuisine
        console.log('1️⃣ Test getEmployeesCuisine()...');
        try {
            const result1 = await supabaseCuisine.getEmployeesCuisine();
            if (result1.error) {
                console.log(`   ❌ Erreur: ${result1.error.message}`);
                console.log(`   📋 Code: ${result1.error.code || 'N/A'}`);
            } else {
                console.log(`   ✅ Réussi: ${result1.data?.length || 0} employés trouvés`);
                if (result1.data && result1.data.length > 0) {
                    const sample = result1.data[0];
                    console.log(`   📝 Structure: ${Object.keys(sample).join(', ')}`);
                }
            }
        } catch (err) {
            console.log(`   ❌ Exception: ${err.message}`);
        }
        
        // Test 2: Planning cuisine
        console.log('\n2️⃣ Test getPlanningCuisine()...');
        try {
            const result2 = await supabaseCuisine.getPlanningCuisine();
            if (result2.error) {
                console.log(`   ❌ Erreur: ${result2.error.message}`);
                console.log(`   📋 Code: ${result2.error.code || 'N/A'}`);
            } else {
                console.log(`   ✅ Réussi: ${result2.data?.length || 0} plannings trouvés`);
            }
        } catch (err) {
            console.log(`   ❌ Exception: ${err.message}`);
        }
        
        // Test 3: Absences cuisine
        console.log('\n3️⃣ Test getAbsencesCuisine()...');
        try {
            const result3 = await supabaseCuisine.getAbsencesCuisine();
            if (result3.error) {
                console.log(`   ❌ Erreur: ${result3.error.message}`);
                console.log(`   📋 Code: ${result3.error.code || 'N/A'}`);
            } else {
                console.log(`   ✅ Réussi: ${result3.data?.length || 0} absences trouvées`);
            }
        } catch (err) {
            console.log(`   ❌ Exception: ${err.message}`);
        }
        
        // Test 4: Accès direct Supabase
        console.log('\n4️⃣ Test accès direct supabase...');
        try {
            const directResult = await supabaseCuisine.supabase
                .from('employes_cuisine')
                .select('*', { count: 'exact' })
                .limit(1);
                
            if (directResult.error) {
                console.log(`   ❌ Table employes_cuisine: ${directResult.error.message}`);
                
                // Tester employes_cuisine_new
                const newResult = await supabaseCuisine.supabase
                    .from('employes_cuisine_new')
                    .select('*', { count: 'exact' })
                    .limit(1);
                    
                if (newResult.error) {
                    console.log(`   ❌ Table employes_cuisine_new: ${newResult.error.message}`);
                } else {
                    console.log(`   ✅ Table employes_cuisine_new: ${newResult.count} enregistrements`);
                    if (newResult.data && newResult.data.length > 0) {
                        console.log(`   📝 Colonnes: ${Object.keys(newResult.data[0]).join(', ')}`);
                    }
                }
            } else {
                console.log(`   ✅ Table employes_cuisine: ${directResult.count} enregistrements`);
                if (directResult.data && directResult.data.length > 0) {
                    console.log(`   📝 Colonnes: ${Object.keys(directResult.data[0]).join(', ')}`);
                }
            }
        } catch (err) {
            console.log(`   ❌ Exception accès direct: ${err.message}`);
        }
        
        // Test 5: Lister toutes les tables
        console.log('\n5️⃣ Test listage tables...');
        try {
            // Requête pour lister les tables publiques
            const tablesResult = await supabaseCuisine.supabase
                .rpc('get_table_list') // Fonction personnalisée si elle existe
                .select();
                
            if (tablesResult.error && tablesResult.error.code === '42883') {
                console.log('   📋 Fonction get_table_list non disponible, test manuel...');
                
                // Tester manuellement quelques tables connues
                const tableNames = [
                    'employes_cuisine',
                    'employes_cuisine_new',
                    'employees_cuisine',
                    'planning_cuisine',
                    'planning_cuisine_new',
                    'absences_cuisine',
                    'absences_cuisine_new'
                ];
                
                console.log('   📊 État des tables :');
                for (const tableName of tableNames) {
                    try {
                        const tableTest = await supabaseCuisine.supabase
                            .from(tableName)
                            .select('*', { count: 'exact' })
                            .limit(0);
                            
                        if (tableTest.error) {
                            if (tableTest.error.code === '42P01') {
                                console.log(`   ❌ ${tableName}: N'existe pas`);
                            } else {
                                console.log(`   ⚠️  ${tableName}: ${tableTest.error.message}`);
                            }
                        } else {
                            console.log(`   ✅ ${tableName}: ${tableTest.count || 0} enregistrements`);
                        }
                    } catch (tableErr) {
                        console.log(`   ❌ ${tableName}: Exception`);
                    }
                }
            } else {
                console.log(`   ✅ Tables trouvées: ${tablesResult.data?.length || 0}`);
            }
        } catch (err) {
            console.log(`   ❌ Exception listage: ${err.message}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur d\'importation:', error.message);
        console.log('\n💡 Vérifiez que :');
        console.log('   1. Les variables d\'environnement sont configurées');
        console.log('   2. Le projet peut se connecter à Supabase');
        console.log('   3. npm install a été exécuté');
    }
}

// Exécuter l'inspection
inspectDatabase().then(() => {
    console.log('\n✅ Inspection terminée');
}).catch(err => {
    console.error('❌ Erreur fatale:', err);
}); 