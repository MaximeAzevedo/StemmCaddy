const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Charger les variables d'environnement
dotenv.config();

console.log('🍽️ Test de connexion Module Cuisine...\n');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.log('REACT_APP_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('REACT_APP_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCuisineConnection() {
  console.log('🔍 Test des tables cuisine...\n');

  // Test 1: Postes cuisine
  try {
    const { data: postes, error: postesError } = await supabase
      .from('postes_cuisine')
      .select('*')
      .eq('actif', true)
      .order('ordre_affichage');
    
    if (postesError) {
      console.log('❌ Postes cuisine:', postesError.message);
    } else {
      console.log('✅ Postes cuisine:', postes?.length || 0, 'trouvés');
      postes?.forEach(p => console.log(`   - ${p.nom} (${p.couleur}) ${p.icone}`));
    }
  } catch (err) {
    console.log('❌ Erreur postes cuisine:', err.message);
  }

  console.log('');

  // Test 2: Employés cuisine
  try {
    const { data: employees, error: empError } = await supabase
      .from('employees_cuisine')
      .select('*, employee:employees(*)')
      .limit(5);
    
    if (empError) {
      console.log('❌ Employés cuisine:', empError.message);
    } else {
      console.log('✅ Employés cuisine:', employees?.length || 0, 'trouvés');
      employees?.forEach(e => console.log(`   - ${e.employee?.nom} ${e.employee?.prenom} (${e.service})`));
    }
  } catch (err) {
    console.log('❌ Erreur employés cuisine:', err.message);
  }

  console.log('');

  // Test 3: Créneaux
  try {
    const { data: creneaux, error: crenError } = await supabase
      .from('creneaux_cuisine')
      .select('*');
    
    if (crenError) {
      console.log('❌ Créneaux cuisine:', crenError.message);
    } else {
      console.log('✅ Créneaux cuisine:', creneaux?.length || 0, 'trouvés');
      creneaux?.forEach(c => console.log(`   - ${c.nom} (${c.heure_debut}-${c.heure_fin})`));
    }
  } catch (err) {
    console.log('❌ Erreur créneaux cuisine:', err.message);
  }

  console.log('');

  // Test 4: Planning cuisine
  try {
    const { data: planning, error: planError } = await supabase
      .from('planning_cuisine')
      .select('*')
      .limit(5);
    
    if (planError) {
      console.log('❌ Planning cuisine:', planError.message);
    } else {
      console.log('✅ Planning cuisine:', planning?.length || 0, 'entrées trouvées');
    }
  } catch (err) {
    console.log('❌ Erreur planning cuisine:', err.message);
  }

  console.log('\n🎯 Test terminé !');
}

testCuisineConnection(); 