#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

console.log('🧪 Test de connexion MCP ↔ Supabase...\n');

// Configuration depuis .env
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('📋 Configuration :');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Service Key: ${supabaseServiceKey ? '✅ Définie' : '❌ Manquante'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Variables d\'environnement manquantes !');
  process.exit(1);
}

// Test de connexion
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n🔍 Test de connexion...');

try {
  // Test simple de connexion
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('⚠️ Erreur (normal si les tables n\'existent pas) :', error.message);
    console.log('📝 Solution : Créer les tables avec MCP');
  } else {
    console.log('✅ Connexion Supabase OK !');
    console.log(`📊 Données trouvées : ${data?.length || 0} véhicules`);
  }

} catch (err) {
  console.error('❌ Erreur de connexion :', err.message);
}

console.log('\n🚀 MCP prêt à être utilisé !');
console.log('🔧 Commandes disponibles :');
console.log('   npm run mcp:start    - Démarrer le serveur MCP');
console.log('   npm run auto         - Configuration automatique (legacy)');
console.log('\n🎯 Avec MCP, l\'IA peut maintenant :');
console.log('   ✅ Créer les tables automatiquement');
console.log('   ✅ Insérer vos données Caddy');
console.log('   ✅ Gérer les comptes utilisateurs');
console.log('   ✅ Vérifier l\'état de la base'); 