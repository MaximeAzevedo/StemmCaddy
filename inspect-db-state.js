#!/usr/bin/env node

/**
 * Script d'inspection de l'état actuel de la base de données
 * Vérifie quelles tables cuisine existent et leur contenu
 */

const { createClient } = require('@supabase/supabase-js');

// URL visible dans env.example
const supabaseUrl = 'https://cmmfaatcdtbmcmjnegyn.supabase.co';
// Utiliser une clé temporaire pour inspection (readonly)
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'fallback_key';

console.log('🔍 INSPECTION DE L\'ÉTAT DE LA BASE DE DONNÉES\n');

async function inspectTables() {
    try {
        // Tables à vérifier
        const tablesToCheck = [
            'employes_cuisine',
            'employes_cuisine_new', 
            'employes_cuisine_unifie',
            'employees_cuisine',
            'planning_cuisine',
            'planning_cuisine_new',
            'planning_cuisine_unifie',
            'absences_cuisine',
            'absences_cuisine_new',
            'absences_cuisine_unifie',
            'competences_cuisine',
            'postes_cuisine',
            'creneaux_cuisine',
            'disponibilites'
        ];

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log('📊 ÉTAT DES TABLES CUISINE :\n');
        
        for (const tableName of tablesToCheck) {
            try {
                const { data, error, count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact' })
                    .limit(0);
                
                if (error) {
                    if (error.code === '42P01') {
                        console.log(`❌ ${tableName} : N'EXISTE PAS`);
                    } else {
                        console.log(`⚠️  ${tableName} : ERREUR (${error.message})`);
                    }
                } else {
                    console.log(`✅ ${tableName} : ${count || 0} enregistrements`);
                    
                    // Pour les tables avec des données, montrer un échantillon
                    if (count > 0) {
                        const { data: sample } = await supabase
                            .from(tableName)
                            .select('*')
                            .limit(3);
                        
                        if (sample && sample.length > 0) {
                            console.log(`   📝 Colonnes: ${Object.keys(sample[0]).join(', ')}`);
                            if (sample[0].prenom) {
                                console.log(`   👤 Exemples: ${sample.map(s => s.prenom || s.nom || s.id).slice(0, 3).join(', ')}`);
                            }
                        }
                    }
                }
            } catch (err) {
                console.log(`❌ ${tableName} : ERREUR CONNEXION`);
            }
        }
        
        console.log('\n🎯 RECOMMANDATIONS :');
        
        // Vérifier quelles tables ont des données importantes
        const tablesWithData = [];
        for (const tableName of tablesToCheck) {
            try {
                const { count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact' })
                    .limit(0);
                
                if (count > 0) {
                    tablesWithData.push({ name: tableName, count });
                }
            } catch (err) {
                // Ignorer les erreurs
            }
        }
        
        if (tablesWithData.length > 0) {
            console.log('\n📋 TABLES AVEC DONNÉES :');
            tablesWithData.forEach(table => {
                console.log(`   ${table.name}: ${table.count} enregistrements`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur d\'inspection:', error.message);
        
        // Fallback : vérifier avec require du projet
        console.log('\n🔄 Tentative avec client du projet...');
        
        try {
            const { supabase } = require('./src/lib/supabase.js');
            
            const { data, error } = await supabase
                .from('employes_cuisine')
                .select('count', { count: 'exact' })
                .limit(0);
                
            if (!error) {
                console.log('✅ Connexion via client projet réussie');
                console.log(`   employes_cuisine: ${data?.length || 0} enregistrements`);
            }
        } catch (fallbackError) {
            console.log('❌ Impossible de se connecter via le projet aussi');
        }
    }
}

// Exécuter l'inspection
inspectTables().then(() => {
    console.log('\n✅ Inspection terminée');
    process.exit(0);
}).catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
}); 