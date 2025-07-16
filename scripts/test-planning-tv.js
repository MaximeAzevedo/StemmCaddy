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

async function testPlanningTV() {
  console.log('🔍 TEST MODE TV - Diagnostic complet\n');

  try {
    // 1. Vérifier les postes de cuisine
    console.log('1️⃣ Vérification des postes de cuisine...');
    const { data: postes, error: postesError } = await supabase
      .from('postes_cuisine')
      .select('*');
    
    console.log(`   📍 Postes trouvés: ${postes?.length || 0}`);
    if (postesError) console.error(`   ❌ Erreur postes:`, postesError);
    if (postes?.length === 0) {
      console.log('   ➕ Création des postes par défaut...');
      await createDefaultPostes();
    }

    // 2. Vérifier les employés de cuisine
    console.log('\n2️⃣ Vérification des employés de cuisine...');
    const { data: employees, error: empError } = await supabase
      .from('employees_cuisine')
      .select(`
        *,
        employee:employees(*)
      `);
    
    console.log(`   👥 Employés de cuisine trouvés: ${employees?.length || 0}`);
    if (empError) console.error(`   ❌ Erreur employés:`, empError);
    if (employees?.length === 0) {
      console.log('   ➕ Création des employés par défaut...');
      await createDefaultEmployees();
    }

    // 3. Vérifier le planning d'aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n3️⃣ Vérification du planning pour ${today}...`);
    
    const { data: planning, error: planningError } = await supabase
      .from('planning_cuisine')
      .select('*')
      .eq('date', today);
    
    console.log(`   📅 Entrées de planning trouvées: ${planning?.length || 0}`);
    if (planningError) console.error(`   ❌ Erreur planning:`, planningError);
    
    if (planning?.length === 0) {
      console.log('   ➕ Création du planning de démonstration...');
      await createDemoPlanning(today);
    }

    // 4. Test des jointures
    console.log(`\n4️⃣ Test des jointures (planning avec postes et employés)...`);
    const { data: planningWithJoins, error: joinError } = await supabase
      .from('planning_cuisine')
      .select(`
        *,
        employee:employees(*),
        poste:postes_cuisine(*)
      `)
      .eq('date', today);
    
    console.log(`   🔗 Planning avec jointures: ${planningWithJoins?.length || 0}`);
    if (joinError) console.error(`   ❌ Erreur jointures:`, joinError);

    // 5. Afficher les données pour debug
    if (planningWithJoins?.length > 0) {
      console.log('\n5️⃣ Données de planning trouvées:');
      planningWithJoins.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.employee?.nom || 'Employé inconnu'} -> ${item.poste?.nom || 'Poste inconnu'} (${item.session}, ${item.creneau})`);
      });
    }

    console.log('\n✅ Diagnostic terminé ! Le mode TV devrait maintenant afficher des données.');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  }
}

async function createDefaultPostes() {
  const defaultPostes = [
    { nom: 'Cuisine chaude', couleur: '#FF6B35', icone: '🔥', description: 'Préparation plats chauds', actif: true, ordre_affichage: 1 },
    { nom: 'Sandwichs', couleur: '#4ECDC4', icone: '🥪', description: 'Préparation sandwichs', actif: true, ordre_affichage: 2 },
    { nom: 'Pain', couleur: '#45B7D1', icone: '🍞', description: 'Boulangerie', actif: true, ordre_affichage: 3 },
    { nom: 'Jus de fruits', couleur: '#96CEB4', icone: '🧃', description: 'Préparation jus et boissons', actif: true, ordre_affichage: 4 },
    { nom: 'Vaisselle', couleur: '#FFEAA7', icone: '🍽️', description: 'Nettoyage vaisselle', actif: true, ordre_affichage: 5 },
    { nom: 'Légumerie', couleur: '#DDA0DD', icone: '🥬', description: 'Préparation légumes', actif: true, ordre_affichage: 6 },
    { nom: 'Self Midi', couleur: '#FF6B35', icone: '🍽️', description: 'Service self du midi', actif: true, ordre_affichage: 7 },
    { nom: 'Equipe Pina et Saskia', couleur: '#8B5CF6', icone: '👥', description: 'Équipe spécialisée', actif: true, ordre_affichage: 8 }
  ];

  const { error } = await supabase
    .from('postes_cuisine')
    .insert(defaultPostes);
  
  if (error) {
    console.error('   ❌ Erreur création postes:', error);
  } else {
    console.log('   ✅ Postes créés avec succès');
  }
}

async function createDefaultEmployees() {
  // D'abord créer quelques employés de base s'ils n'existent pas
  const defaultEmployees = [
    { nom: 'Martin', prenom: 'Alice', email: 'alice.martin@caddy.fr', profil: 'Fort', statut: 'Actif' },
    { nom: 'Dupont', prenom: 'Bob', email: 'bob.dupont@caddy.fr', profil: 'Moyen', statut: 'Actif' },
    { nom: 'Durand', prenom: 'Charlie', email: 'charlie.durand@caddy.fr', profil: 'Fort', statut: 'Actif' },
    { nom: 'Pina', prenom: 'Sofia', email: 'sofia.pina@caddy.fr', profil: 'Fort', statut: 'Actif' },
    { nom: 'Saskia', prenom: 'Elena', email: 'elena.saskia@caddy.fr', profil: 'Moyen', statut: 'Actif' }
  ];

  // Insérer dans employees
  const { data: employeesData, error: empError } = await supabase
    .from('employees')
    .upsert(defaultEmployees, { onConflict: 'email' })
    .select();

  if (empError) {
    console.error('   ❌ Erreur création employés:', empError);
    return;
  }

  // Insérer dans employees_cuisine
  const employeesCuisine = employeesData.map(emp => ({
    employee_id: emp.id,
    photo_url: null,
    service: 'Cuisine'
  }));

  const { error: cuisineError } = await supabase
    .from('employees_cuisine')
    .upsert(employeesCuisine, { onConflict: 'employee_id' });

  if (cuisineError) {
    console.error('   ❌ Erreur création employés cuisine:', cuisineError);
  } else {
    console.log('   ✅ Employés de cuisine créés avec succès');
  }
}

async function createDemoPlanning(date) {
  // Récupérer les IDs des postes et employés
  const { data: postes } = await supabase.from('postes_cuisine').select('*');
  const { data: employeesCuisine } = await supabase
    .from('employees_cuisine')
    .select('*, employee:employees(*)');

  if (!postes?.length || !employeesCuisine?.length) {
    console.log('   ⚠️ Pas assez de données pour créer le planning');
    return;
  }

  // Créer un planning de démonstration
  const demoPlanning = [];
  
  // Session matin
  if (postes.find(p => p.nom === 'Cuisine chaude') && employeesCuisine[0]) {
    demoPlanning.push({
      employee_id: employeesCuisine[0].employee.id,
      poste_id: postes.find(p => p.nom === 'Cuisine chaude').id,
      date,
      session: 'matin',
      creneau: 'Service'
    });
  }

  if (postes.find(p => p.nom === 'Sandwichs') && employeesCuisine[1]) {
    demoPlanning.push({
      employee_id: employeesCuisine[1].employee.id,
      poste_id: postes.find(p => p.nom === 'Sandwichs').id,
      date,
      session: 'matin',
      creneau: 'Service'
    });
  }

  if (postes.find(p => p.nom === 'Vaisselle') && employeesCuisine[2]) {
    demoPlanning.push({
      employee_id: employeesCuisine[2].employee.id,
      poste_id: postes.find(p => p.nom === 'Vaisselle').id,
      date,
      session: 'matin',
      creneau: '8h'
    });
  }

  if (postes.find(p => p.nom === 'Self Midi') && employeesCuisine[3]) {
    demoPlanning.push({
      employee_id: employeesCuisine[3].employee.id,
      poste_id: postes.find(p => p.nom === 'Self Midi').id,
      date,
      session: 'matin',
      creneau: '11h-11h45'
    });
  }

  // Session après-midi
  if (postes.find(p => p.nom === 'Cuisine chaude') && employeesCuisine[4]) {
    demoPlanning.push({
      employee_id: employeesCuisine[4].employee.id,
      poste_id: postes.find(p => p.nom === 'Cuisine chaude').id,
      date,
      session: 'apres-midi',
      creneau: 'Service'
    });
  }

  const { error } = await supabase
    .from('planning_cuisine')
    .insert(demoPlanning);

  if (error) {
    console.error('   ❌ Erreur création planning:', error);
  } else {
    console.log(`   ✅ Planning de démonstration créé: ${demoPlanning.length} assignations`);
  }
}

// Lancer le test
testPlanningTV().catch(console.error); 