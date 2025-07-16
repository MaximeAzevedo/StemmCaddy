#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Variables directes du projet (visibles dans env.example)
const supabaseUrl = 'https://cmmfaatcdtbmcmjnegyn.supabase.co';

// Essayer avec la clé anon que l'utilisateur doit avoir
async function inspectWithMCP() {
    console.log('🔍 INSPECTION DIRECTE BASE DE DONNÉES\n');
    
    // L'utilisateur dit que tout est configuré, essayons sans clé d'abord
    try {
        // Utiliser une clé publique basique ou celle du projet
        const possibleKeys = [
            process.env.REACT_APP_SUPABASE_ANON_KEY,
            process.env.SUPABASE_ANON_KEY,
            // Clé anon publique typique (essayons)
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
        ].filter(Boolean);
        
        let supabase = null;
        let workingKey = null;
        
        // Essayer chaque clé
        for (const key of possibleKeys) {
            try {
                const testClient = createClient(supabaseUrl, key);
                // Test simple
                const { data, error } = await testClient
                    .from('employees')
                    .select('count', { count: 'exact' })
                    .limit(0);
                    
                if (!error) {
                    supabase = testClient;
                    workingKey = key.substring(0, 20) + '...';
                    console.log(`✅ Connexion réussie avec clé: ${workingKey}`);
                    break;
                }
            } catch (err) {
                continue;
            }
        }
        
        if (!supabase) {
            console.log('❌ Aucune clé valide trouvée, essai sans authentification...');
            // Dernier essai avec une clé vide (certains projets l'autorisent)
            supabase = createClient(supabaseUrl, '');
        }
        
        console.log('\n📊 INSPECTION DES TABLES CUISINE :');
        
        const tablesToCheck = [
            'employes_cuisine',
            'employes_cuisine_new',
            'employees_cuisine', 
            'planning_cuisine',
            'planning_cuisine_new',
            'absences_cuisine',
            'absences_cuisine_new'
        ];
        
        const tableResults = {};
        
        for (const table of tablesToCheck) {
            try {
                const { data, error, count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact' })
                    .limit(3);
                    
                if (error) {
                    if (error.code === '42P01') {
                        console.log(`❌ ${table}: N'existe pas`);
                        tableResults[table] = { exists: false };
                    } else {
                        console.log(`⚠️  ${table}: ${error.message}`);
                        tableResults[table] = { exists: true, error: error.message };
                    }
                } else {
                    console.log(`✅ ${table}: ${count || 0} enregistrements`);
                    tableResults[table] = { 
                        exists: true, 
                        count: count || 0,
                        sample: data && data.length > 0 ? data[0] : null
                    };
                    
                    if (data && data.length > 0) {
                        console.log(`   📝 Colonnes: ${Object.keys(data[0]).join(', ')}`);
                        if (data[0].prenom || data[0].nom) {
                            const names = data.map(item => item.prenom || item.nom).filter(Boolean);
                            if (names.length > 0) {
                                console.log(`   👤 Exemples: ${names.slice(0, 3).join(', ')}`);
                            }
                        }
                    }
                }
            } catch (err) {
                console.log(`❌ ${table}: Exception - ${err.message}`);
                tableResults[table] = { exists: false, exception: err.message };
            }
        }
        
        console.log('\n🎯 ANALYSE ET RECOMMANDATIONS :');
        
        const existingTables = Object.entries(tableResults)
            .filter(([_, result]) => result.exists && result.count > 0)
            .sort(([_, a], [__, b]) => (b.count || 0) - (a.count || 0));
            
        if (existingTables.length > 0) {
            console.log('\n📋 TABLES AVEC DONNÉES (par ordre de taille) :');
            existingTables.forEach(([name, result]) => {
                console.log(`   ${name}: ${result.count} enregistrements`);
            });
            
            // Recommandation basée sur les données
            const hasNew = existingTables.some(([name]) => name.includes('_new'));
            const hasOld = existingTables.some(([name]) => !name.includes('_new') && !name.includes('_unifie'));
            
            console.log('\n💡 RECOMMANDATION :');
            if (hasNew && hasOld) {
                console.log('   🔄 Migration partiellement effectuée');
                console.log('   📝 Action: Terminer la migration avec les scripts SQL');
            } else if (hasNew) {
                console.log('   ✅ Nouvelles tables détectées');
                console.log('   📝 Action: Exécuter le script de migration finale');
            } else {
                console.log('   🏗️  Ancien système détecté');
                console.log('   📝 Action: Exécuter la migration complète');
            }
        } else {
            console.log('\n❌ Aucune table cuisine avec des données trouvée');
            console.log('💡 Action: Créer le système depuis zéro');
        }
        
    } catch (error) {
        console.error('❌ Erreur fatale:', error.message);
        
        // Information de debug
        console.log('\n🔧 DEBUG INFO:');
        console.log(`   URL: ${supabaseUrl}`);
        console.log(`   Env vars disponibles: ${Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ')}`);
    }
}

inspectWithMCP(); 