#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Ouverture de Supabase Dashboard...\n');

// URLs importantes
const urls = {
  dashboard: 'https://supabase.com/dashboard/project/cmmfaatcdtbmjnegyn',
  sql: 'https://supabase.com/dashboard/project/cmmfaatcdtbmcmjnegyn/sql/new',
  auth: 'https://supabase.com/dashboard/project/cmmfaatcdtbmcmjnegyn/auth/users'
};

function openURL(url) {
  const platform = process.platform;
  let command;

  switch (platform) {
    case 'darwin': // macOS
      command = `open "${url}"`;
      break;
    case 'win32': // Windows
      command = `start "${url}"`;
      break;
    default: // Linux
      command = `xdg-open "${url}"`;
      break;
  }

  exec(command, (error) => {
    if (error) {
      console.error(`Erreur ouverture: ${error}`);
    }
  });
}

function showInstructions() {
  console.log('📋 ÉTAPES À SUIVRE :');
  console.log('═'.repeat(60));
  console.log('');
  console.log('1️⃣ CRÉER LES TABLES (si pas encore fait)');
  console.log('   → Cliquez sur "SQL Editor" dans le menu de gauche');
  console.log('   → Cliquez "New query"');
  console.log('   → Copiez tout le contenu de database/schema.sql');
  console.log('   → Collez dans l\'éditeur et cliquez "Run"');
  console.log('');
  console.log('2️⃣ CRÉER VOTRE COMPTE UTILISATEUR');
  console.log('   → Cliquez sur "Authentication" dans le menu de gauche');
  console.log('   → Cliquez sur "Users"');
  console.log('   → Cliquez "Add user"');
  console.log('   → Email: maxime@caddy.lu');
  console.log('   → Password: Cristobello54');
  console.log('   → Email Confirm: ✓ (coché)');
  console.log('   → Cliquez "Create user"');
  console.log('');
  console.log('3️⃣ FINALISER LES DONNÉES');
  console.log('   → Retournez dans votre terminal');
  console.log('   → Lancez: npm run setup-db');
  console.log('');
  console.log('4️⃣ TESTER L\'APPLICATION');
  console.log('   → Lancez: npm start');
  console.log('   → Ouvrez: http://localhost:3001');
  console.log('   → Connectez-vous avec maxime@caddy.lu / Cristobello54');
  console.log('');
  console.log('═'.repeat(60));
  console.log('');
  
  console.log('💡 RACCOURCIS :');
  console.log(`🌐 Dashboard: ${urls.dashboard}`);
  console.log(`📊 SQL Editor: ${urls.sql}`);
  console.log(`👥 Authentication: ${urls.auth}`);
  console.log('');
}

// Ouvrir Supabase Dashboard
console.log('🌐 Ouverture du dashboard Supabase...');
openURL(urls.dashboard);

// Attendre un peu puis afficher les instructions
setTimeout(() => {
  showInstructions();
}, 1000); 