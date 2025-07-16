const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

// Configuration Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSessions() {
  console.log('🔍 DEBUG SESSIONS - Diagnostic approfondi\n');

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Requête directe pour voir les valeurs exactes
    console.log('1️⃣ Analyse des sessions dans la base...');
    const { data: allPlanning, error } = await supabase
      .from('planning_cuisine')
      .select('id, session, date, creneau')
      .eq('date', today)
      .limit(20);
    
    if (error) {
      console.error('Erreur:', error);
      return;
    }

    console.log(`   📅 Échantillon de ${allPlanning.length} entrées pour ${today}:`);
    allPlanning.forEach((entry, index) => {
      console.log(`   ${index + 1}. ID: ${entry.id}, Session: "${entry.session}" (type: ${typeof entry.session}), Créneau: ${entry.creneau}`);
    });

    // 2. Compter les différents types de valeurs
    console.log('\n2️⃣ Comptage des valeurs de session...');
    const sessionCounts = {};
    
    allPlanning.forEach(entry => {
      const sessionValue = entry.session;
      const key = sessionValue === null ? 'NULL' : 
                 sessionValue === undefined ? 'UNDEFINED' : 
                 sessionValue === '' ? 'EMPTY_STRING' : 
                 sessionValue;
      
      sessionCounts[key] = (sessionCounts[key] || 0) + 1;
    });

    console.log('   📊 Répartition:');
    Object.entries(sessionCounts).forEach(([key, count]) => {
      console.log(`      ${key}: ${count} entrées`);
    });

    // 3. Test avec différentes requêtes pour filtrer les sessions vides
    console.log('\n3️⃣ Test de différents filtres...');
    
    const tests = [
      { name: 'session IS NULL', filter: q => q.is('session', null) },
      { name: 'session = ""', filter: q => q.eq('session', '') },
      { name: 'session = "matin"', filter: q => q.eq('session', 'matin') },
      { name: 'session = "apres-midi"', filter: q => q.eq('session', 'apres-midi') }
    ];

    for (const test of tests) {
      const { data: testData } = await supabase
        .from('planning_cuisine')
        .select('id, session')
        .eq('date', today)
        .modify(test.filter);
      
      console.log(`      ${test.name}: ${testData?.length || 0} entrées`);
    }

    // 4. Forcer la mise à jour des sessions vides/nulles
    console.log('\n4️⃣ Correction forcée des sessions...');
    
    // Récupérer toutes les entrées pour aujourd'hui
    const { data: todayPlanning } = await supabase
      .from('planning_cuisine')
      .select('*')
      .eq('date', today);

    if (todayPlanning) {
      let updatedCount = 0;
      
      for (const entry of todayPlanning) {
        // Si session est null, undefined, ou string vide
        if (!entry.session || entry.session === '') {
          let newSession = 'matin'; // Par défaut
          
          // Logique intelligente selon le créneau
          if (entry.creneau && entry.creneau.includes('11h45')) {
            newSession = 'matin';
          } else if (entry.creneau === 'Service') {
            newSession = (entry.id % 2 === 0) ? 'matin' : 'apres-midi';
          }
          
          const { error: updateError } = await supabase
            .from('planning_cuisine')
            .update({ session: newSession })
            .eq('id', entry.id);
          
          if (!updateError) {
            updatedCount++;
            console.log(`      ✅ ID ${entry.id}: session -> "${newSession}"`);
          } else {
            console.log(`      ❌ ID ${entry.id}: erreur mise à jour`);
          }
        }
      }
      
      console.log(`   📝 Total mis à jour: ${updatedCount} entrées`);
    }

    // 5. Vérification finale
    console.log('\n5️⃣ Vérification finale après correction...');
    const { data: finalData } = await supabase
      .from('planning_cuisine')
      .select('id, session, employee:employees(nom), poste:postes_cuisine(nom)')
      .eq('date', today)
      .eq('session', 'matin')
      .limit(5);

    if (finalData?.length > 0) {
      console.log('   🌅 Exemples session "matin":');
      finalData.forEach((item, index) => {
        console.log(`      ${index + 1}. ${item.employee?.nom} -> ${item.poste?.nom}`);
      });
    }

    console.log('\n✅ Debug terminé ! Testez maintenant le mode TV.');
    
  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
  }
}

// Lancer le debug
debugSessions().catch(console.error); 