#!/usr/bin/env node

/**
 * Script de test complet pour la configuration Azure et Caddy
 * Teste Azure OpenAI, Azure Speech, Supabase et MCP
 */

require('dotenv').config();

console.log('🧪 TEST COMPLET CONFIGURATION CADDY + AZURE\n');
console.log('═'.repeat(60));

// ====== VARIABLES D'ENVIRONNEMENT ======
console.log('\n1️⃣ VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT');
console.log('─'.repeat(50));

const config = {
  // Supabase
  supabase: {
    url: process.env.REACT_APP_SUPABASE_URL,
    anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  
  // Azure OpenAI
  azureOpenAI: {
    endpoint: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.REACT_APP_AZURE_OPENAI_API_KEY,
    deployment: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME,
    apiVersion: process.env.REACT_APP_AZURE_OPENAI_API_VERSION
  },
  
  // Azure Speech
  azureSpeech: {
    key: process.env.REACT_APP_AZURE_SPEECH_KEY,
    region: process.env.REACT_APP_AZURE_SPEECH_REGION,
    voice: process.env.REACT_APP_AZURE_SPEECH_VOICE_NAME
  },
  
  // OpenAI Fallback
  openAI: {
    apiKey: process.env.REACT_APP_OPENAI_API_KEY
  }
};

// Vérifier Supabase
console.log('🗄️ SUPABASE :');
console.log('   URL:', config.supabase.url ? '✅ Définie' : '❌ Manquante');
console.log('   Anon Key:', config.supabase.anonKey ? '✅ Définie' : '❌ Manquante');
console.log('   Service Key:', config.supabase.serviceKey ? '✅ Définie' : '❌ Manquante');

// Vérifier Azure OpenAI
console.log('\n🤖 AZURE OPENAI :');
console.log('   Endpoint:', config.azureOpenAI.endpoint ? '✅ Définie' : '❌ Manquante');
console.log('   API Key:', config.azureOpenAI.apiKey ? '✅ Définie' : '❌ Manquante');
console.log('   Deployment:', config.azureOpenAI.deployment ? '✅ Définie' : '❌ Manquante');
console.log('   API Version:', config.azureOpenAI.apiVersion ? '✅ Définie' : '❌ Manquante');

// Vérifier Azure Speech
console.log('\n🗣️ AZURE SPEECH :');
console.log('   Key:', config.azureSpeech.key ? '✅ Définie' : '❌ Manquante');
console.log('   Region:', config.azureSpeech.region ? '✅ Définie' : '❌ Manquante');
console.log('   Voice:', config.azureSpeech.voice || 'fr-FR-DeniseNeural (défaut)');

// Vérifier OpenAI Fallback
console.log('\n🔄 OPENAI FALLBACK :');
console.log('   API Key:', config.openAI.apiKey && config.openAI.apiKey !== 'your_openai_api_key_here' ? '✅ Définie' : '❌ Manquante');

// ====== TEST DE CONNEXION AZURE OPENAI ======
console.log('\n\n2️⃣ TEST DE CONNEXION AZURE OPENAI');
console.log('─'.repeat(50));

async function testAzureOpenAI() {
  if (!config.azureOpenAI.endpoint || !config.azureOpenAI.apiKey || !config.azureOpenAI.deployment) {
    console.log('❌ Configuration Azure OpenAI incomplète');
    return false;
  }

  try {
    // Nettoyer l'endpoint
    const cleanEndpoint = config.azureOpenAI.endpoint.replace(/\/+$/, '');
    
    // Construire l'URL
    const url = `${cleanEndpoint}/openai/deployments/${config.azureOpenAI.deployment}/chat/completions?api-version=${config.azureOpenAI.apiVersion}`;
    
    console.log('🔍 URL testée:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.azureOpenAI.apiKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Tu es l\'assistant IA de Caddy. Réponds en français.'
          },
          {
            role: 'user',
            content: 'Test de connexion. Réponds juste "Connexion Azure OpenAI réussie"'
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    });

    if (response.ok) {
      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'Pas de réponse';
      console.log('✅ Azure OpenAI opérationnel !');
      console.log('💬 Réponse IA:', aiResponse);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur Azure OpenAI:', response.status, response.statusText);
      console.log('📝 Détails:', errorText.substring(0, 200));
      return false;
    }

  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
    return false;
  }
}

// ====== DIAGNOSTIC DE CONFIGURATION ======
async function diagnoseConfiguration() {
  console.log('\n\n3️⃣ DIAGNOSTIC DE CONFIGURATION');
  console.log('─'.repeat(50));

  // Problèmes détectés
  const issues = [];
  
  if (!config.supabase.url) issues.push('❌ REACT_APP_SUPABASE_URL manquante');
  if (!config.supabase.anonKey) issues.push('❌ REACT_APP_SUPABASE_ANON_KEY manquante');
  if (!config.supabase.serviceKey) issues.push('❌ SUPABASE_SERVICE_KEY manquante');
  
  if (!config.azureOpenAI.endpoint) issues.push('❌ REACT_APP_AZURE_OPENAI_ENDPOINT manquante');
  if (!config.azureOpenAI.apiKey) issues.push('❌ REACT_APP_AZURE_OPENAI_API_KEY manquante');
  if (!config.azureOpenAI.deployment) issues.push('❌ REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME manquante');
  
  // Vérifications spéciales
  if (config.azureOpenAI.deployment && config.azureOpenAI.deployment.includes('https://')) {
    issues.push('⚠️ DEPLOYMENT_NAME semble contenir une URL au lieu du nom de déploiement');
  }
  
  if (config.azureSpeech.region && config.azureSpeech.region.includes('%')) {
    issues.push('⚠️ AZURE_SPEECH_REGION contient des caractères spéciaux (%)');
  }

  if (issues.length === 0) {
    console.log('✅ Aucun problème de configuration détecté !');
  } else {
    console.log('🔧 PROBLÈMES DÉTECTÉS :');
    issues.forEach(issue => console.log('   ' + issue));
  }

  return issues;
}

// ====== SUGGESTIONS D'AMÉLIORATION ======
function provideSuggestions(issues) {
  console.log('\n\n4️⃣ SUGGESTIONS D\'AMÉLIORATION');
  console.log('─'.repeat(50));

  if (issues.length === 0) {
    console.log('🎉 Configuration parfaite ! Voici les prochaines étapes :');
    console.log('   1. npm start - Démarrer l\'application');
    console.log('   2. Tester l\'assistant IA (bouton bleu en bas à droite)');
    console.log('   3. Essayer une commande vocale');
    console.log('   4. npm run mcp:start - Démarrer le serveur MCP');
  } else {
    console.log('🔧 ACTIONS RECOMMANDÉES :');
    
    if (issues.some(i => i.includes('DEPLOYMENT_NAME'))) {
      console.log('   • Corrigez REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME');
      console.log('     Format attendu : nom-de-votre-deployment (ex: gpt-4o-mini)');
      console.log('     PAS l\'URL complète !');
    }
    
    if (issues.some(i => i.includes('SPEECH_REGION'))) {
      console.log('   • Corrigez REACT_APP_AZURE_SPEECH_REGION');
      console.log('     Format attendu : westeurope, francecentral, etc.');
      console.log('     Sans caractères spéciaux');
    }
    
    if (issues.some(i => i.includes('manquante'))) {
      console.log('   • Ajoutez les variables manquantes dans votre fichier .env');
      console.log('   • Redémarrez l\'application après modification');
    }
  }
}

// ====== EXECUTION PRINCIPALE ======
async function runTests() {
  try {
    // Diagnostic
    const issues = await diagnoseConfiguration();
    
    // Test Azure OpenAI
    const azureWorking = await testAzureOpenAI();
    
    // Suggestions
    provideSuggestions(issues);
    
    // Résumé final
    console.log('\n\n📊 RÉSUMÉ FINAL');
    console.log('═'.repeat(30));
    console.log('Supabase       :', config.supabase.url && config.supabase.anonKey ? '✅' : '❌');
    console.log('Azure OpenAI   :', azureWorking ? '✅' : '❌');
    console.log('Azure Speech   :', config.azureSpeech.key && config.azureSpeech.region ? '✅' : '❌');
    console.log('MCP Ready      :', config.supabase.serviceKey ? '✅' : '❌');
    
    const allGood = config.supabase.url && config.supabase.anonKey && azureWorking;
    console.log('\nStatut Global  :', allGood ? '🎉 PRÊT !' : '🔧 CONFIGURATION NÉCESSAIRE');
    
    if (allGood) {
      console.log('\n🚀 Votre assistant IA Caddy avec Azure est opérationnel !');
    }

  } catch (error) {
    console.error('\n❌ Erreur pendant les tests:', error.message);
  }
}

// Lancer les tests
runTests(); 