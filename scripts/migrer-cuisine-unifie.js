#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('Vérifiez REACT_APP_SUPABASE_URL et SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Client Supabase avec pouvoirs admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executerMigration() {
  console.log('🚀 Début de la migration vers le schéma cuisine unifié...\n');
  
  try {
    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, '../database/schema-cuisine-unifie.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Fichier SQL chargé:', sqlFile);
    
    // Diviser le contenu en statements séparés
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 ${statements.length} statements SQL à exécuter\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Exécuter chaque statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Afficher le type de statement
      const statementType = getStatementType(statement);
      process.stdout.write(`[${i + 1}/${statements.length}] ${statementType}... `);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Essayer avec la méthode directe si rpc ne fonctionne pas
          const result = await supabase
            .from('_placeholder')
            .select('*')
            .limit(0);
            
          // Fallback: essayer d'exécuter via query brute
          const { error: directError } = await supabase.query(statement);
          
          if (directError) {
            console.log(`❌ ERREUR`);
            console.log(`   ${directError.message}`);
            errorCount++;
          } else {
            console.log(`✅ OK`);
            successCount++;
          }
        } else {
          console.log(`✅ OK`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ ERREUR`);
        console.log(`   ${err.message}`);
        errorCount++;
      }
      
      // Petite pause pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📈 RÉSULTATS DE LA MIGRATION:');
    console.log(`✅ Statements réussis: ${successCount}`);
    console.log(`❌ Statements échoués: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 MIGRATION TERMINÉE AVEC SUCCÈS !');
      console.log('\n📋 NOUVELLES TABLES DISPONIBLES:');
      console.log('   - employes_cuisine_unifie');
      console.log('   - planning_cuisine_unifie');
      console.log('   - absences_cuisine_unifie');
      console.log('\n👁️ VUES CRÉÉES:');
      console.log('   - absences_aujourd_hui');
      console.log('   - planning_aujourd_hui');
      console.log('   - competences_employes');
      
      // Vérifier que les tables existent
      await verifierTables();
    } else {
      console.log('\n⚠️ Migration terminée avec des erreurs');
      console.log('Consultez les messages d\'erreur ci-dessus');
    }
    
  } catch (error) {
    console.error('💥 Erreur lors de la migration:', error.message);
    process.exit(1);
  }
}

function getStatementType(statement) {
  const stmt = statement.trim().toUpperCase();
  if (stmt.startsWith('CREATE TABLE')) return 'Création table';
  if (stmt.startsWith('CREATE VIEW')) return 'Création vue';
  if (stmt.startsWith('CREATE FUNCTION')) return 'Création fonction';
  if (stmt.startsWith('CREATE TRIGGER')) return 'Création trigger';
  if (stmt.startsWith('CREATE INDEX')) return 'Création index';
  if (stmt.startsWith('INSERT INTO')) return 'Insertion données';
  if (stmt.startsWith('UPDATE')) return 'Mise à jour';
  if (stmt.startsWith('ALTER TABLE')) return 'Modification table';
  if (stmt.startsWith('CREATE POLICY')) return 'Politique sécurité';
  if (stmt.startsWith('DO $$')) return 'Script PL/pgSQL';
  return 'Autre';
}

async function verifierTables() {
  console.log('\n🔍 Vérification des tables créées...');
  
  const tables = [
    'employes_cuisine_unifie',
    'planning_cuisine_unifie', 
    'absences_cuisine_unifie'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`❌ ${table}: Non trouvée`);
      } else {
        console.log(`✅ ${table}: ${count || 0} enregistrements`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Erreur de vérification`);
    }
  }
}

// Point d'entrée
if (require.main === module) {
  executerMigration().catch(console.error);
}

module.exports = { executerMigration }; 