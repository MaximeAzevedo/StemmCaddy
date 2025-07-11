#!/usr/bin/env node

/**
 * Script de test EN DIRECT pour l'Assistant IA Cuisine
 * Teste les capacités réelles de modification de base de données
 */

require('dotenv').config();
const readline = require('readline');

// Importer les modules nécessaires
async function loadModules() {
  try {
    // Import dynamique pour gérer les modules ES6
    const { supabaseCuisine } = await import('../src/lib/supabase-cuisine.js');
    const { supabaseAPI } = await import('../src/lib/supabase.js');
    const { IAActionEngine } = await import('../src/lib/ia-action-engine.js');
    
    return { supabaseCuisine, supabaseAPI, IAActionEngine };
  } catch (error) {
    console.error('❌ Erreur import modules:', error.message);
    return null;
  }
}

console.log('🎯 ASSISTANT IA CUISINE - TEST EN DIRECT\n');
console.log('═'.repeat(60));

async function testIALive() {
  console.log('\n🔌 Chargement des modules...');
  const modules = await loadModules();
  
  if (!modules) {
    console.log('❌ Impossible de charger les modules. Test arrêté.');
    return;
  }

  const { supabaseCuisine, supabaseAPI, IAActionEngine } = modules;

  try {
    console.log('🤖 Initialisation du moteur IA...');
    const engine = new IAActionEngine();
    
    console.log('📊 Vérification des connexions...');
    
    // Test connexion API cuisine
    const testCuisine = await supabaseCuisine.getEmployeesCuisine();
    console.log(`   🍳 API Cuisine: ${testCuisine.error ? '❌ Erreur' : '✅ OK'} (${testCuisine.data?.length || 0} employés)`);
    
    // Test connexion API générale
    const testGeneral = await supabaseAPI.getEmployees();
    console.log(`   👥 API Générale: ${testGeneral.error ? '❌ Erreur' : '✅ OK'} (${testGeneral.data?.length || 0} employés)`);
    
    console.log('\n🎙️ MODE INTERACTIF ACTIVÉ');
    console.log('─'.repeat(40));
    console.log('💡 Exemples de commandes :');
    console.log('   • "analyse l\'équipe"');
    console.log('   • "Marie est absente demain"');
    console.log('   • "Julie maîtrise la cuisine chaude"');
    console.log('   • "qui peut remplacer Paul ?"');
    console.log('   • "quit" pour quitter');
    console.log('─'.repeat(40));

    // Interface interactive
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askCommand = () => {
      rl.question('\n🗣️ Votre commande: ', async (input) => {
        if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
          console.log('\n👋 Au revoir ! Assistant IA déconnecté.');
          rl.close();
          return;
        }

        if (!input.trim()) {
          askCommand();
          return;
        }

        console.log(`\n⏳ Traitement: "${input}"`);
        console.log('   🧠 Analyse de l\'intention...');
        
        try {
          const startTime = Date.now();
          const result = await engine.executeAction(input);
          const endTime = Date.now();
          
          console.log(`   ⚡ Résultat (${endTime - startTime}ms):`);
          
          if (result.success) {
            console.log(`   ✅ SUCCÈS !`);
            console.log(`   🎯 Intention: ${result.intent}`);
            console.log(`   💬 Réponse:`);
            console.log(`      ${result.message.replace(/\n/g, '\n      ')}`);
            
            if (result.data) {
              console.log(`   📊 Données retournées: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
            }
          } else {
            console.log(`   ❌ ÉCHEC`);
            console.log(`   💬 Message: ${result.message}`);
          }
          
        } catch (error) {
          console.log(`   💥 ERREUR: ${error.message}`);
        }
        
        askCommand();
      });
    };

    askCommand();
    
  } catch (error) {
    console.error('❌ Erreur test IA live:', error);
  }
}

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log('\n\n👋 Test interrompu. Au revoir !');
  process.exit(0);
});

// Exécuter le test
testIALive(); 