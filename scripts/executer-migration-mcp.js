#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Script pour exécuter la migration via l'interface Supabase
// Plus fiable que l'API JavaScript

async function executer() {
  console.log('🚀 MIGRATION SCHÉMA CUISINE UNIFIÉ\n');
  
  // Lire le fichier SQL
  const sqlFile = path.join(__dirname, '../database/schema-cuisine-unifie.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error('❌ Fichier SQL non trouvé:', sqlFile);
    process.exit(1);
  }
  
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  console.log('📄 Fichier SQL chargé:', sqlFile);
  console.log('📊 Taille:', Math.round(sqlContent.length / 1024), 'KB\n');
  
  // Afficher les instructions
  console.log('📋 INSTRUCTIONS D\'EXÉCUTION:');
  console.log('');
  console.log('1. Ouvrez votre dashboard Supabase:');
  console.log('   👉 https://supabase.com/dashboard');
  console.log('');
  console.log('2. Sélectionnez votre projet Caddy');
  console.log('');
  console.log('3. Cliquez sur "SQL Editor" dans le menu de gauche');
  console.log('');
  console.log('4. Copiez le contenu du fichier:');
  console.log('   👉', sqlFile);
  console.log('');
  console.log('5. Collez dans l\'éditeur SQL et cliquez sur "RUN"');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  // Créer un fichier temporaire pour faciliter la copie
  const tempFile = path.join(__dirname, '../migration-temp.sql');
  fs.writeFileSync(tempFile, sqlContent);
  
  console.log('💾 Fichier temporaire créé pour faciliter la copie:');
  console.log('   👉', tempFile);
  console.log('');
  console.log('🔄 VOUS POUVEZ AUSSI:');
  console.log('   - Ouvrir ce fichier avec votre éditeur de texte');
  console.log('   - Copier tout le contenu (Ctrl+A puis Ctrl+C)');
  console.log('   - Coller dans l\'éditeur SQL de Supabase');
  console.log('');
  
  // Afficher un résumé de ce qui va être créé
  console.log('📊 RÉSUMÉ DE LA MIGRATION:');
  console.log('');
  console.log('🗂️  NOUVELLES TABLES:');
  console.log('   ✅ employes_cuisine_unifie (profils complets)');
  console.log('   ✅ planning_cuisine_unifie (planning simplifié)');  
  console.log('   ✅ absences_cuisine_unifie (absences simplifiées)');
  console.log('');
  console.log('👁️  VUES CRÉÉES:');
  console.log('   ✅ absences_aujourd_hui');
  console.log('   ✅ planning_aujourd_hui');
  console.log('   ✅ competences_employes');
  console.log('');
  console.log('🔧 FONCTIONS CRÉÉES:');
  console.log('   ✅ peut_affecter_poste(employee_id, poste)');
  console.log('   ✅ get_employes_disponibles_poste(poste, date)');
  console.log('');
  console.log('📦 MIGRATION AUTOMATIQUE:');
  console.log('   ✅ Employés existants');
  console.log('   ✅ Horaires (disponibilités)');
  console.log('   ✅ Compétences');
  console.log('   ✅ Absences');
  console.log('');
  console.log('🛡️  SÉCURITÉ:');
  console.log('   ✅ Sauvegarde automatique des données');
  console.log('   ✅ RLS activé sur les nouvelles tables');
  console.log('   ✅ Anciennes tables préservées');
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('⏰ ÉTAPES APRÈS EXÉCUTION:');
  console.log('');
  console.log('1. Vérifiez que la migration s\'est bien passée:');
  console.log('   SELECT COUNT(*) FROM employes_cuisine_unifie;');
  console.log('');
  console.log('2. Testez les nouvelles vues:');
  console.log('   SELECT * FROM absences_aujourd_hui;');
  console.log('   SELECT * FROM planning_aujourd_hui;');
  console.log('');
  console.log('3. Consultez le guide complet:');
  console.log('   👉 GUIDE_MIGRATION_CUISINE.md');
  console.log('');
  console.log('🎉 Bonne migration !');
  
  // Nettoyer le fichier temporaire après 5 minutes
  setTimeout(() => {
    try {
      fs.unlinkSync(tempFile);
      console.log('\n🧹 Fichier temporaire supprimé automatiquement');
    } catch (err) {
      // Ignorer l'erreur si le fichier n'existe plus
    }
  }, 5 * 60 * 1000);
}

// Point d'entrée
if (require.main === module) {
  executer().catch(console.error);
}

module.exports = { executer }; 