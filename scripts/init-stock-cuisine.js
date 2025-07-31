#!/usr/bin/env node

/**
 * Script d'initialisation de la base de données pour la gestion des stocks cuisine
 * Exécute le schéma et insère les données initiales
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Configuration
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - REACT_APP_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY (ou REACT_APP_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initStockCuisineDatabase() {
  console.log('🍽️ Initialisation base de données - Gestion Stocks Cuisine\n');
  
  try {
    // 1. Lire le fichier de schéma
    console.log('📖 Lecture du schéma SQL...');
    const schemaPath = join(__dirname, '..', 'database', 'schema-stock-cuisine.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');
    
    // 2. Exécuter le schéma complet
    console.log('⚡ Exécution du schéma SQL...');
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schemaSql });
    
    if (schemaError) {
      console.error('❌ Erreur exécution schéma:', schemaError);
      // Continuer quand même, certaines tables peuvent déjà exister
    } else {
      console.log('✅ Schéma créé avec succès');
    }
    
    // 3. Vérifier les tables créées
    console.log('\n🔍 Vérification des tables...');
    
    const tables = [
      'stock_cuisine',
      'sites_livraison', 
      'planning_envois',
      'mouvements_stock'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: OK`);
      }
    }
    
    // 4. Vérifier les données initiales
    console.log('\n📊 Vérification des données initiales...');
    
    // Sites de livraison
    const { data: sites, error: sitesError } = await supabase
      .from('sites_livraison')
      .select('*');
      
    if (sitesError) {
      console.log('❌ Sites de livraison:', sitesError.message);
    } else {
      console.log(`✅ Sites de livraison: ${sites.length} sites`);
      sites.forEach(site => {
        console.log(`   - ${site.nom}`);
      });
    }
    
    // Stock aliments
    const { data: aliments, error: alimentsError } = await supabase
      .from('stock_cuisine')
      .select('*');
      
    if (alimentsError) {
      console.log('❌ Stock aliments:', alimentsError.message);
    } else {
      console.log(`✅ Stock aliments: ${aliments.length} articles`);
      
      // Grouper par zone de stockage
      const parZone = aliments.reduce((acc, aliment) => {
        if (!acc[aliment.zone_stockage]) acc[aliment.zone_stockage] = [];
        acc[aliment.zone_stockage].push(aliment);
        return acc;
      }, {});
      
      Object.entries(parZone).forEach(([zone, items]) => {
        console.log(`   ${zone}: ${items.length} articles`);
      });
    }
    
    // 5. Test de fonctionnement
    console.log('\n🧪 Test de fonctionnement...');
    
    // Test création envoi (sera annulé)
    const { data: testEnvoi, error: testError } = await supabase
      .from('planning_envois')
      .insert([{
        aliment_id: 1, // Premier aliment
        site_id: 1,    // Premier site
        quantite: 1,
        date_envoi: new Date().toISOString().split('T')[0],
        zone_origine: 'congelateur'
      }])
      .select()
      .single();
    
    if (testError) {
      console.log('❌ Test envoi:', testError.message);
    } else {
      console.log('✅ Test envoi: OK');
      
      // Supprimer le test
      await supabase
        .from('planning_envois')
        .delete()
        .eq('id', testEnvoi.id);
        
      console.log('   Test nettoyé');
    }
    
    // 6. Test de la vue
    console.log('\n👁️ Test des vues...');
    
    const { data: planning, error: planningError } = await supabase
      .from('v_planning_complet')
      .select('*')
      .limit(5);
      
    if (planningError) {
      console.log('❌ Vue planning:', planningError.message);
    } else {
      console.log(`✅ Vue planning: ${planning.length} entrées`);
    }
    
    console.log('\n🎉 Initialisation terminée !');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Démarrer l\'application: npm start');
    console.log('   2. Aller sur: /cuisine/stocks');
    console.log('   3. Tester l\'envoi direct d\'aliments');
    console.log('   4. Vérifier le planning automatique');
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  }
}

// Fonction utilitaire pour créer la fonction exec_sql si elle n'existe pas
async function ensureExecSqlFunction() {
  const { error } = await supabase.rpc('exec_sql', { 
    sql: `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  });
  
  if (error && !error.message.includes('already exists')) {
    console.log('⚙️ Fonction exec_sql créée');
  }
}

// Exécution
console.log('🚀 Démarrage initialisation...\n');

// Créer la fonction helper puis initialiser
ensureExecSqlFunction()
  .then(() => initStockCuisineDatabase())
  .catch(error => {
    console.error('💥 Erreur:', error);
    process.exit(1);
  }); 