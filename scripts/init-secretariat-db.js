#!/usr/bin/env node

/**
 * Script d'initialisation de la base de données - Module Secrétariat
 * Crée les tables et insère les données réelles des denrées alimentaires
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initSecretariatDatabase() {
  console.log('🚀 Initialisation de la base de données - Module Secrétariat...\n');

  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, '../database/schema-secretariat.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ Fichier SQL non trouvé:', sqlFilePath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Diviser le SQL en commandes individuelles
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));

    console.log(`📜 Exécution de ${sqlCommands.length} commandes SQL...\n`);

    // Exécuter chaque commande SQL
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      if (command.trim() === '') continue;
      
      try {
        console.log(`⚡ Commande ${i + 1}/${sqlCommands.length}:`, 
          command.substring(0, 60).replace(/\n/g, ' ') + '...'
        );
        
        const { error } = await supabase.rpc('exec_sql', { sql_query: command });
        
        if (error) {
          console.warn(`⚠️  Avertissement commande ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Commande ${i + 1} exécutée avec succès`);
        }
        
      } catch (err) {
        console.warn(`⚠️  Erreur commande ${i + 1}:`, err.message);
      }
    }

    console.log('\n🔍 Vérification des données insérées...');
    
    // Vérifier que les données ont été insérées
    const { data: denrees, error: selectError } = await supabase
      .from('denrees_alimentaires')
      .select('*')
      .limit(5);
      
    if (selectError) {
      console.error('❌ Erreur lors de la vérification:', selectError);
    } else {
      console.log(`✅ ${denrees?.length || 0} entrées trouvées dans la table denrees_alimentaires`);
      
      if (denrees && denrees.length > 0) {
        console.log('\n📋 Exemple de données:');
        denrees.slice(0, 3).forEach((d, i) => {
          console.log(`  ${i + 1}. ${d.fournisseur} - ${d.mois}/${d.annee} - ${d.quantite} ${d.unite}`);
        });
      }
    }

    // Statistiques finales
    const { data: stats } = await supabase
      .from('denrees_alimentaires')
      .select('fournisseur, annee')
      .neq('fournisseur', 'Total général');
      
    if (stats) {
      const fournisseurs = new Set(stats.map(s => s.fournisseur));
      const annees = new Set(stats.map(s => s.annee));
      
      console.log('\n📊 Statistiques:');
      console.log(`   • Fournisseurs: ${fournisseurs.size} (${Array.from(fournisseurs).join(', ')})`);
      console.log(`   • Années: ${annees.size} (${Array.from(annees).sort().join(', ')})`);
      console.log(`   • Total entrées: ${stats.length}`);
    }

    console.log('\n🎉 Initialisation de la base de données terminée avec succès !');
    console.log('\n💡 Vous pouvez maintenant utiliser le module Secrétariat avec vos vraies données.');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

// Fonction utilitaire pour exécuter du SQL direct (si RPC n'est pas disponible)
async function executeRawSQL(sqlQuery) {
  try {
    // Note: Cette méthode nécessite des permissions administrateur
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql_query: sqlQuery })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Erreur exécution SQL: ${error.message}`);
  }
}

// Alternative simple pour insérer directement les données sans SQL complet
async function insertSampleData() {
  console.log('🔄 Insertion des données d\'exemple...');
  
  const sampleData = [
    // Données 2025 réelles du tableau
    { fournisseur: 'Kirchberg', mois: 1, annee: 2025, quantite: 3278.70, unite: 'kg' },
    { fournisseur: 'Kirchberg', mois: 2, annee: 2025, quantite: 3514.00, unite: 'kg' },
    { fournisseur: 'Kirchberg', mois: 3, annee: 2025, quantite: 4109.00, unite: 'kg' },
    { fournisseur: 'Kirchberg', mois: 4, annee: 2025, quantite: 3411.00, unite: 'kg' },
    { fournisseur: 'Kirchberg', mois: 5, annee: 2025, quantite: 4417.00, unite: 'kg' },
    
    { fournisseur: 'Cloche d\'Or', mois: 1, annee: 2025, quantite: 1847.50, unite: 'kg' },
    { fournisseur: 'Cloche d\'Or', mois: 2, annee: 2025, quantite: 2153.00, unite: 'kg' },
    { fournisseur: 'Cloche d\'Or', mois: 3, annee: 2025, quantite: 1803.50, unite: 'kg' },
    { fournisseur: 'Cloche d\'Or', mois: 4, annee: 2025, quantite: 1679.50, unite: 'kg' },
    { fournisseur: 'Cloche d\'Or', mois: 5, annee: 2025, quantite: 1359.00, unite: 'kg' },
    { fournisseur: 'Cloche d\'Or', mois: 6, annee: 2025, quantite: 1749.00, unite: 'kg' },
    
    { fournisseur: 'Dudelange', mois: 1, annee: 2025, quantite: 4103.00, unite: 'kg' },
    { fournisseur: 'Dudelange', mois: 2, annee: 2025, quantite: 1555.50, unite: 'kg' },
    { fournisseur: 'Dudelange', mois: 3, annee: 2025, quantite: 3091.00, unite: 'kg' },
    { fournisseur: 'Dudelange', mois: 4, annee: 2025, quantite: 3075.00, unite: 'kg' },
    { fournisseur: 'Dudelange', mois: 5, annee: 2025, quantite: 1854.00, unite: 'kg' },
    
    { fournisseur: 'Opkorn', mois: 1, annee: 2025, quantite: 1901.00, unite: 'kg' },
    { fournisseur: 'Opkorn', mois: 2, annee: 2025, quantite: 1677.50, unite: 'kg' },
    { fournisseur: 'Opkorn', mois: 3, annee: 2025, quantite: 3905.50, unite: 'kg' },
    { fournisseur: 'Opkorn', mois: 4, annee: 2025, quantite: 3550.00, unite: 'kg' },
    { fournisseur: 'Opkorn', mois: 5, annee: 2025, quantite: 1457.50, unite: 'kg' }
  ];

  try {
    const { data, error } = await supabase
      .from('denrees_alimentaires')
      .upsert(sampleData, { 
        onConflict: 'fournisseur,mois,annee',
        ignoreDuplicates: true 
      });

    if (error) {
      console.error('❌ Erreur insertion données:', error);
    } else {
      console.log(`✅ ${sampleData.length} entrées insérées/mises à jour`);
    }
  } catch (err) {
    console.error('❌ Erreur technique insertion:', err);
  }
}

// Vérifier les variables d'environnement
function checkEnvironment() {
  console.log('🔍 Vérification de l\'environnement...');
  
  if (!process.env.REACT_APP_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL.includes('your-project')) {
    console.warn('⚠️  REACT_APP_SUPABASE_URL non configurée ou utilise une valeur par défaut');
  }
  
  if (!process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY.includes('your-service')) {
    console.warn('⚠️  SUPABASE_SERVICE_KEY non configurée - certaines opérations peuvent échouer');
  }
  
  console.log(`   • URL Supabase: ${supabaseUrl}`);
  console.log(`   • Service Key: ${supabaseServiceKey ? '***' + supabaseServiceKey.slice(-4) : 'Non définie'}\n`);
}

// Exécution principale
async function main() {
  console.log('🏗️  INITIALISATION BASE DE DONNÉES - MODULE SECRÉTARIAT\n');
  
  checkEnvironment();
  
  // Option 1: Essayer l'initialisation complète avec SQL
  try {
    await initSecretariatDatabase();
  } catch (error) {
    console.log('\n🔄 Méthode SQL complète échouée, essai de l\'insertion simple...\n');
    
    // Option 2: Insertion simple des données uniquement
    await insertSampleData();
  }
}

// Lancer le script si exécuté directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { initSecretariatDatabase, insertSampleData }; 