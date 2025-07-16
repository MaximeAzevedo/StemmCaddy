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

async function addSessionColumn() {
  console.log('🔧 AJOUT COLONNE SESSION - Réparation de la table planning_cuisine\n');

  try {
    // 1. Vérifier l'état actuel de la table
    console.log('1️⃣ Vérification de la structure actuelle...');
    const { data: currentData, error: selectError } = await supabase
      .from('planning_cuisine')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('   Erreur lecture table:', selectError);
    } else {
      console.log('   ✅ Table planning_cuisine accessible');
      if (currentData?.[0]) {
        console.log('   📋 Colonnes actuelles:', Object.keys(currentData[0]));
      }
    }

    // 2. Ajouter la colonne session
    console.log('\n2️⃣ Ajout de la colonne session...');
    
    // Utiliser une requête SQL brute pour ajouter la colonne
    const { data: alterResult, error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          -- Ajouter la colonne session si elle n'existe pas
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'planning_cuisine' 
            AND column_name = 'session'
          ) THEN
            ALTER TABLE planning_cuisine 
            ADD COLUMN session VARCHAR(20) DEFAULT 'matin';
            
            -- Ajouter une contrainte pour valider les valeurs
            ALTER TABLE planning_cuisine 
            ADD CONSTRAINT check_session_values 
            CHECK (session IN ('matin', 'apres-midi'));
          END IF;
        END $$;
      `
    });

    if (alterError) {
      console.error('   ❌ Erreur ajout colonne:', alterError);
      
      // Essayer une approche plus simple
      console.log('   🔄 Tentative avec requête simple...');
      const { error: simpleError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE planning_cuisine ADD COLUMN IF NOT EXISTS session VARCHAR(20) DEFAULT \'matin\';'
      });
      
      if (simpleError) {
        console.error('   ❌ Erreur requête simple:', simpleError);
        return;
      } else {
        console.log('   ✅ Colonne ajoutée avec requête simple');
      }
    } else {
      console.log('   ✅ Colonne session ajoutée avec succès');
    }

    // 3. Vérifier que la colonne a été ajoutée
    console.log('\n3️⃣ Vérification de l\'ajout...');
    const { data: newData, error: verifyError } = await supabase
      .from('planning_cuisine')
      .select('id, session, date, creneau')
      .limit(3);
    
    if (verifyError) {
      console.error('   ❌ Erreur vérification:', verifyError);
    } else {
      console.log('   ✅ Colonne session maintenant accessible');
      console.log('   📋 Échantillon de données:', newData);
    }

    // 4. Mettre à jour les valeurs existantes
    console.log('\n4️⃣ Attribution des sessions aux données existantes...');
    
    const { data: allPlanning } = await supabase
      .from('planning_cuisine')
      .select('*');
    
    if (allPlanning?.length > 0) {
      let updatedCount = 0;
      
      for (const entry of allPlanning) {
        let session = 'matin'; // Par défaut
        
        // Logique d'attribution basée sur le créneau
        if (entry.creneau) {
          if (entry.creneau.includes('midi') || entry.creneau.includes('11h')) {
            session = 'matin';
          } else if (entry.creneau === '8h' || entry.creneau === '10h') {
            session = 'matin';
          } else if (entry.creneau === 'Service') {
            // Alterner entre matin et après-midi pour les services
            session = (entry.id % 2 === 0) ? 'matin' : 'apres-midi';
          }
        }
        
        const { error: updateError } = await supabase
          .from('planning_cuisine')
          .update({ session })
          .eq('id', entry.id);
        
        if (!updateError) {
          updatedCount++;
        }
      }
      
      console.log(`   ✅ ${updatedCount} entrées mises à jour avec des sessions`);
    }

    // 5. Vérification finale
    console.log('\n5️⃣ Test final du mode TV...');
    const today = new Date().toISOString().split('T')[0];
    
    const { data: matinPlanning } = await supabase
      .from('planning_cuisine')
      .select(`
        *,
        employee:employees(nom),
        poste:postes_cuisine(nom)
      `)
      .eq('date', today)
      .eq('session', 'matin')
      .limit(5);

    if (matinPlanning?.length > 0) {
      console.log('   🌅 Planning session MATIN trouvé:');
      matinPlanning.forEach((item, index) => {
        console.log(`      ${index + 1}. ${item.employee?.nom} -> ${item.poste?.nom} (${item.creneau})`);
      });
    }

    const { data: apremPlanning } = await supabase
      .from('planning_cuisine')
      .select(`
        *,
        employee:employees(nom),
        poste:postes_cuisine(nom)
      `)
      .eq('date', today)
      .eq('session', 'apres-midi')
      .limit(5);

    if (apremPlanning?.length > 0) {
      console.log('   🌆 Planning session APRÈS-MIDI trouvé:');
      apremPlanning.forEach((item, index) => {
        console.log(`      ${index + 1}. ${item.employee?.nom} -> ${item.poste?.nom} (${item.creneau})`);
      });
    }

    console.log('\n🎉 RÉPARATION TERMINÉE ! Le mode TV devrait maintenant fonctionner parfaitement.');
    console.log('   📺 Vous pouvez maintenant tester le mode TV avec les sessions matin/après-midi');
    
  } catch (error) {
    console.error('❌ Erreur lors de la réparation:', error);
  }
}

// Lancer la réparation
addSessionColumn().catch(console.error); 