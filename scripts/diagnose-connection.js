const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 DIAGNOSTIC COMPLET - Connexion Supabase\n');

// 1. VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
console.log('1️⃣ Variables d\'environnement');
console.log('═'.repeat(50));

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('URL:', supabaseUrl);
console.log('Anon Key (premiers 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');
console.log('Service Key (premiers 20 chars):', supabaseServiceKey?.substring(0, 20) + '...');

// 2. VÉRIFICATION DE L'URL
console.log('\n2️⃣ Validation URL');
console.log('═'.repeat(50));

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    console.log('✅ URL valide');
    console.log('   Protocole:', url.protocol);
    console.log('   Host:', url.hostname);
    console.log('   Port:', url.port || 'default');
  } catch (err) {
    console.log('❌ URL invalide:', err.message);
  }
} else {
  console.log('❌ URL manquante');
}

// 3. TEST PING BASIQUE
console.log('\n3️⃣ Test de connectivité réseau');
console.log('═'.repeat(50));

async function testNetworkConnectivity() {
  if (!supabaseUrl) return;
  
  try {
    const url = new URL(supabaseUrl);
    const testUrl = `${url.protocol}//${url.hostname}/health`;
    
    console.log('Test ping vers:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'CaddyApp/1.0'
      },
      timeout: 10000
    });
    
    console.log('✅ Serveur accessible');
    console.log('   Status:', response.status);
    console.log('   Status Text:', response.statusText);
    
  } catch (err) {
    console.log('❌ Erreur réseau:', err.message);
    console.log('   Code:', err.code);
    
    if (err.code === 'ENOTFOUND') {
      console.log('   → DNS ne résout pas le domaine');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('   → Connexion refusée par le serveur');
    } else if (err.code === 'ETIMEDOUT') {
      console.log('   → Timeout - possible problème proxy/firewall');
    }
  }
}

// 4. TEST API SUPABASE
async function testSupabaseAPI() {
  console.log('\n4️⃣ Test API Supabase');
  console.log('═'.repeat(50));
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Configuration incomplète');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test simple sans table spécifique
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('⚠️ Erreur auth:', error.message);
    } else {
      console.log('✅ API Supabase accessible');
      console.log('   Session:', data.session ? 'Active' : 'Anonyme');
    }
    
    // Test d'accès aux tables
    const { data: tableData, error: tableError } = await supabase
      .from('vehicles')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      console.log('⚠️ Erreur table vehicles:', tableError.message);
      console.log('   Code:', tableError.code);
      
      if (tableError.code === 'PGRST116') {
        console.log('   → Table existe mais RLS bloque l\'accès');
        console.log('   → SOLUTION: Ajuster les politiques RLS');
      } else if (tableError.message.includes('does not exist')) {
        console.log('   → Table n\'existe pas');
        console.log('   → SOLUTION: Exécuter database/real-caddy-schema.sql');
      }
    } else {
      console.log('✅ Table vehicles accessible');
      console.log('   Nombre d\'enregistrements:', tableData);
    }
    
  } catch (err) {
    console.log('❌ Erreur API:', err.message);
  }
}

// 5. RECOMMANDATIONS
function showRecommendations() {
  console.log('\n5️⃣ Recommandations');
  console.log('═'.repeat(50));
  
  console.log('🔧 Solutions possibles :');
  console.log('');
  console.log('A. Si erreur réseau (fetch failed):');
  console.log('   → Vérifiez votre connexion internet');
  console.log('   → Désactivez proxy/VPN temporairement');
  console.log('   → Vérifiez les paramètres firewall');
  console.log('');
  console.log('B. Si tables n\'existent pas:');
  console.log('   → Exécutez database/real-caddy-schema.sql dans Supabase');
  console.log('   → https://supabase.com/dashboard/project/cmmfaatcdtbmcmjnegyn/sql/new');
  console.log('');
  console.log('C. Si problème RLS:');
  console.log('   → Vérifiez les politiques de sécurité');
  console.log('   → Activez l\'accès anonyme temporairement');
  console.log('');
  console.log('D. Application fonctionne avec données de fallback:');
  console.log('   → Normal si Supabase inaccessible');
  console.log('   → L\'app utilise des données statiques en attendant');
}

// EXÉCUTION
async function runDiagnostic() {
  await testNetworkConnectivity();
  await testSupabaseAPI();
  showRecommendations();
  
  console.log('\n' + '═'.repeat(50));
  console.log('🏁 DIAGNOSTIC TERMINÉ');
  console.log('═'.repeat(50));
}

runDiagnostic(); 