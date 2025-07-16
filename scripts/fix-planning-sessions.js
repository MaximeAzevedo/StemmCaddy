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

async function fixPlanningSession() {
  console.log('🔧 CORRECTION DES SESSIONS - Réparation du planning\n');

  try {
    // 1. Récupérer tous les planning sans session
    console.log('1️⃣ Recherche des entrées de planning sans session...');
    const { data: planningWithoutSession, error } = await supabase
      .from('planning_cuisine')
      .select('*')
      .is('session', null);
    
    console.log(`   📅 Entrées sans session trouvées: ${planningWithoutSession?.length || 0}`);
    
    if (!planningWithoutSession?.length) {
      console.log('   ✅ Toutes les entrées ont déjà une session définie');
      return;
    }

    // 2. Assigner les sessions intelligemment
    console.log('\n2️⃣ Attribution des sessions...');
    
    const updates = [];
    
    for (const entry of planningWithoutSession) {
      let session = 'matin'; // Par défaut
      
      // Logique d'attribution des sessions
      if (entry.creneau) {
        if (entry.creneau.includes('11h') || entry.creneau.includes('midi')) {
          session = 'matin'; // Créneaux du midi = session matin
        } else if (entry.creneau === '8h' || entry.creneau === '10h') {
          session = 'matin'; // Créneaux matinaux
        } else if (entry.creneau === 'Service') {
          // Pour les créneaux "Service", alterner ou baser sur l'ID
          session = (entry.id % 2 === 0) ? 'matin' : 'apres-midi';
        }
      }
      
      updates.push({
        id: entry.id,
        session: session
      });
    }

    // 3. Grouper les mises à jour par session
    const matinUpdates = updates.filter(u => u.session === 'matin');
    const apremUpdates = updates.filter(u => u.session === 'apres-midi');
    
    console.log(`   🌅 Attribution session "matin": ${matinUpdates.length} entrées`);
    console.log(`   🌆 Attribution session "apres-midi": ${apremUpdates.length} entrées`);

    // 4. Effectuer les mises à jour
    console.log('\n3️⃣ Application des corrections...');
    
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('planning_cuisine')
        .update({ session: update.session })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`   ❌ Erreur mise à jour ID ${update.id}:`, updateError);
      }
    }

    console.log('   ✅ Mises à jour terminées');

    // 5. Vérification finale
    console.log('\n4️⃣ Vérification finale...');
    const { data: finalCheck } = await supabase
      .from('planning_cuisine')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0]);
    
    const sessionCounts = {
      matin: finalCheck?.filter(p => p.session === 'matin').length || 0,
      'apres-midi': finalCheck?.filter(p => p.session === 'apres-midi').length || 0,
      null: finalCheck?.filter(p => !p.session).length || 0
    };

    console.log('   📊 Répartition finale des sessions:');
    console.log(`      🌅 Matin: ${sessionCounts.matin} entrées`);
    console.log(`      🌆 Après-midi: ${sessionCounts['apres-midi']} entrées`);
    console.log(`      ❓ Sans session: ${sessionCounts.null} entrées`);

    console.log('\n✅ Correction terminée ! Le mode TV devrait maintenant fonctionner.');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Lancer la correction
fixPlanningSession().catch(console.error); 