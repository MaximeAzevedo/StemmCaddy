#!/usr/bin/env node

/**
 * 🔍 DIAGNOSTIC CONNEXION IA CADDY
 * Script pour identifier les problèmes de configuration et de connectivité
 */

import dotenv from 'dotenv';
// Utiliser fetch natif de Node.js 18+
const fetch = globalThis.fetch;

// Charger les variables d'environnement
dotenv.config();

const diagnostics = {
  openai: {
    name: 'OpenAI Standard',
    key: process.env.REACT_APP_OPENAI_API_KEY,
    configured: false,
    connected: false,
    error: null
  },
  azure: {
    name: 'Azure OpenAI',
    endpoint: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
    key: process.env.REACT_APP_AZURE_OPENAI_API_KEY,
    deployment: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME,
    configured: false,
    connected: false,
    error: null
  }
};

console.log('🔍 DIAGNOSTIC IA CADDY - DÉBUT\n');

// 1. Vérifier la configuration OpenAI
console.log('📋 1. VÉRIFICATION CONFIGURATION\n');

if (diagnostics.openai.key) {
  diagnostics.openai.configured = true;
  console.log('✅ OpenAI configuré');
  console.log(`   Clé: ${diagnostics.openai.key.substring(0, 8)}...`);
} else {
  console.log('❌ OpenAI non configuré - variable REACT_APP_OPENAI_API_KEY manquante');
}

if (diagnostics.azure.endpoint && diagnostics.azure.key && diagnostics.azure.deployment) {
  diagnostics.azure.configured = true;
  console.log('✅ Azure OpenAI configuré');
  console.log(`   Endpoint: ${diagnostics.azure.endpoint}`);
  console.log(`   Deployment: ${diagnostics.azure.deployment}`);
  console.log(`   Clé: ${diagnostics.azure.key.substring(0, 8)}...`);
} else {
  console.log('❌ Azure OpenAI non configuré');
  if (!diagnostics.azure.endpoint) console.log('   - REACT_APP_AZURE_OPENAI_ENDPOINT manquant');
  if (!diagnostics.azure.key) console.log('   - REACT_APP_AZURE_OPENAI_API_KEY manquant');
  if (!diagnostics.azure.deployment) console.log('   - REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME manquant');
}

// 2. Tester la connectivité
console.log('\n🌐 2. TEST DE CONNECTIVITÉ\n');

// Test OpenAI
if (diagnostics.openai.configured) {
  try {
    console.log('🚀 Test OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${diagnostics.openai.key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10
      })
    });
    
    if (response.ok) {
      diagnostics.openai.connected = true;
      console.log('✅ OpenAI connecté et fonctionnel');
    } else {
      const errorText = await response.text();
      diagnostics.openai.error = `HTTP ${response.status}: ${errorText}`;
      console.log(`❌ OpenAI erreur: ${diagnostics.openai.error}`);
    }
  } catch (error) {
    diagnostics.openai.error = error.message;
    console.log(`❌ OpenAI erreur réseau: ${error.message}`);
  }
}

// Test Azure OpenAI
if (diagnostics.azure.configured) {
  try {
    console.log('🚀 Test Azure OpenAI...');
    const url = `${diagnostics.azure.endpoint.replace(/\/+$/, '')}/openai/deployments/${diagnostics.azure.deployment}/chat/completions?api-version=2024-02-15-preview`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': diagnostics.azure.key
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10
      })
    });
    
    if (response.ok) {
      diagnostics.azure.connected = true;
      console.log('✅ Azure OpenAI connecté et fonctionnel');
    } else {
      const errorText = await response.text();
      diagnostics.azure.error = `HTTP ${response.status}: ${errorText}`;
      console.log(`❌ Azure OpenAI erreur: ${diagnostics.azure.error}`);
    }
  } catch (error) {
    diagnostics.azure.error = error.message;
    console.log(`❌ Azure OpenAI erreur réseau: ${error.message}`);
  }
}

// 3. Résumé et recommandations
console.log('\n📊 3. RÉSUMÉ ET RECOMMANDATIONS\n');

const hasWorkingIA = diagnostics.openai.connected || diagnostics.azure.connected;

if (hasWorkingIA) {
  console.log('🎉 Au moins une IA fonctionne correctement !');
  if (diagnostics.openai.connected) {
    console.log('✅ OpenAI opérationnel (recommandé pour simplicité)');
  }
  if (diagnostics.azure.connected) {
    console.log('✅ Azure OpenAI opérationnel');
  }
} else {
  console.log('⚠️  AUCUNE IA FONCTIONNELLE DÉTECTÉE');
  console.log('\n🔧 ACTIONS RECOMMANDÉES:');
  
  if (!diagnostics.openai.configured && !diagnostics.azure.configured) {
    console.log('1. Configurez au moins une IA dans votre fichier .env');
    console.log('2. Pour OpenAI (recommandé):');
    console.log('   REACT_APP_OPENAI_API_KEY=sk-votre_cle_ici');
    console.log('3. Ou pour Azure OpenAI:');
    console.log('   REACT_APP_AZURE_OPENAI_ENDPOINT=https://votre-service.openai.azure.com');
    console.log('   REACT_APP_AZURE_OPENAI_API_KEY=votre_cle');
    console.log('   REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini');
  } else {
    if (diagnostics.openai.configured && !diagnostics.openai.connected) {
      console.log('1. Vérifiez votre clé OpenAI');
      console.log('2. Vérifiez votre connexion internet');
      console.log(`   Erreur: ${diagnostics.openai.error}`);
    }
    if (diagnostics.azure.configured && !diagnostics.azure.connected) {
      console.log('1. Vérifiez votre configuration Azure OpenAI');
      console.log('2. Vérifiez que le deployment existe');
      console.log(`   Erreur: ${diagnostics.azure.error}`);
    }
  }
  
  console.log('\n💡 EN ATTENDANT:');
  console.log('• Le système utilisera le fallback manuel');
  console.log('• Les plannings seront générés par règles métier');
  console.log('• Fonctionnalité limitée mais opérationnelle');
}

console.log('\n🔍 DIAGNOSTIC IA CADDY - FIN'); 