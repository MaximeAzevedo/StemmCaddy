#!/usr/bin/env node

const { setupDatabase } = require('./setup-database');

console.log('🎯 Configuration rapide de l\'application Caddy\n');

async function quickSetup() {
  try {
    console.log('1️⃣ Configuration de la base de données...');
    await setupDatabase();
    
    console.log('\n2️⃣ Instructions finales :');
    console.log('━'.repeat(50));
    console.log('🌐 Ouvrez : https://supabase.com/dashboard/project/cmmfaatcdtbmcmjnegyn');
    console.log('');
    console.log('📋 SI les tables n\'existent pas :');
    console.log('   → SQL Editor → Nouvelle query');
    console.log('   → Copiez/collez database/schema.sql');
    console.log('   → Cliquez "Run"');
    console.log('');
    console.log('👤 Créer votre compte utilisateur :');
    console.log('   → Authentication → Users → Add User');
    console.log('   → Email: maxime@caddy.lu');
    console.log('   → Password: Cristobello54');
    console.log('   → Email Confirm: ✓ (coché)');
    console.log('   → Cliquez "Create user"');
    console.log('');
    console.log('🚀 Puis lancez : npm start');
    console.log('━'.repeat(50));
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n🔧 Solution alternative :');
    console.log('1. Ouvrez le dashboard Supabase manuellement');
    console.log('2. Exécutez database/schema.sql dans SQL Editor');
    console.log('3. Créez votre compte dans Authentication');
    console.log('4. Relancez ce script');
  }
}

quickSetup(); 