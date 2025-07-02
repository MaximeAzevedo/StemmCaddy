const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 Test de connexion Supabase simple...\n');

// Configuration depuis .env
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('📋 Configuration :');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Anon Key: ${supabaseAnonKey ? '✅ Définie' : '❌ Manquante'}`);
console.log(`   Service Key: ${supabaseServiceKey ? '✅ Définie' : '❌ Manquante'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ Variables d\'environnement manquantes !');
  process.exit(1);
}

async function testConnection() {
  console.log('\n🔍 Test avec clé anonyme...');
  
  try {
    // Test avec la clé anonyme (comme l'app React)
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabaseAnon
      .from('vehicles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('⚠️ Erreur avec clé anonyme :', error.message);
      console.log('🔍 Code d\'erreur :', error.code);
      
      if (error.code === 'PGRST116') {
        console.log('📝 Les tables existent mais RLS bloque l\'accès anonyme');
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('📝 Les tables n\'existent pas encore');
      }
    } else {
      console.log('✅ Connexion réussie avec clé anonyme !');
      console.log(`📊 Véhicules trouvés : ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log('🚛 Premier véhicule :', data[0].nom);
      }
    }

    // Test avec la clé service si disponible
    if (supabaseServiceKey) {
      console.log('\n🔍 Test avec clé service...');
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .limit(1);
      
      if (adminError) {
        console.log('⚠️ Erreur avec clé service :', adminError.message);
      } else {
        console.log('✅ Connexion admin réussie !');
        console.log(`📊 Véhicules (admin) : ${adminData?.length || 0}`);
      }
    }

  } catch (err) {
    console.error('❌ Erreur réseau :', err.message);
    console.log('🔧 Possible problème :');
    console.log('  - Connexion internet');
    console.log('  - URL Supabase incorrecte');
    console.log('  - Proxy/Firewall');
  }
}

testConnection(); 