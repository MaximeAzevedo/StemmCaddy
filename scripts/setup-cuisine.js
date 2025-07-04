#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://cmmfaatcdtbmcmjnegyn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY non définie dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupCuisineModule() {
  console.log('🍽️ Configuration du Module Cuisine...\n');

  try {
    // Test de connexion
    console.log('🔍 Test de connexion Supabase...');
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Connexion Supabase OK\n');

    // 1. Insérer les employés cuisine s'ils n'existent pas déjà
    console.log('👥 Insertion des employés cuisine...');
    const employeesCuisine = [
      { nom: 'Salah', prenom: 'Salah', profil: 'Faible', langues: ['Arabe'], email: 'salah@stemm.lu' },
      { nom: 'Maida', prenom: 'Maida', profil: 'Fort', langues: ['Yougoslave'], email: 'maida@stemm.lu' },
      { nom: 'Mahmoud', prenom: 'Mahmoud', profil: 'Moyen', langues: ['Arabe'], email: 'mahmoud@stemm.lu' },
      { nom: 'Mohammad', prenom: 'Mohammad', profil: 'Faible', langues: ['Arabe'], email: 'mohammad@stemm.lu' },
      { nom: 'Amar', prenom: 'Amar', profil: 'Moyen', langues: ['Arabe'], email: 'amar@stemm.lu' },
      { nom: 'Haile', prenom: 'Haile', profil: 'Moyen', langues: ['Tigrinya'], email: 'haile@stemm.lu' },
      { nom: 'Aïssatou', prenom: 'Aïssatou', profil: 'Fort', langues: ['Guinéen'], email: 'aissatou@stemm.lu' },
      { nom: 'Halimatou', prenom: 'Halimatou', profil: 'Faible', langues: ['Guinéen'], email: 'halimatou@stemm.lu' },
      { nom: 'Idiatou', prenom: 'Idiatou', profil: 'Faible', langues: ['Guinéen'], email: 'idiatou@stemm.lu' },
      { nom: 'Abdul', prenom: 'Abdul', profil: 'Faible', langues: ['Bengali'], email: 'abdul@stemm.lu' },
      { nom: 'Fatumata', prenom: 'Fatumata', profil: 'Fort', langues: ['Guinéen'], email: 'fatumata@stemm.lu' },
      { nom: 'Giovanna', prenom: 'Giovanna', profil: 'Faible', langues: ['Français'], email: 'giovanna@stemm.lu' },
      { nom: 'Carla', prenom: 'Carla', profil: 'Moyen', langues: ['Portugais'], email: 'carla@stemm.lu' },
      { nom: 'Liliana', prenom: 'Liliana', profil: 'Moyen', langues: ['Français'], email: 'liliana@stemm.lu' },
      { nom: 'Djenabou', prenom: 'Djenabou', profil: 'Fort', langues: ['Guinéen'], email: 'djenabou@stemm.lu' },
      { nom: 'Harissatou', prenom: 'Harissatou', profil: 'Moyen', langues: ['Guinéen'], email: 'harissatou@stemm.lu' },
      { nom: 'Oumou', prenom: 'Oumou', profil: 'Faible', langues: ['Guinéen'], email: 'oumou@stemm.lu' },
      { nom: 'Jurom', prenom: 'Jurom', profil: 'Moyen', langues: ['Tigrinya'], email: 'jurom@stemm.lu' },
      { nom: 'Maria', prenom: 'Maria', profil: 'Moyen', langues: ['Portugais'], email: 'maria@stemm.lu' },
      { nom: 'Kifle', prenom: 'Kifle', profil: 'Moyen', langues: ['Tigrinya'], email: 'kifle@stemm.lu' },
      { nom: 'Hayle Almedom', prenom: 'Hayle', profil: 'Fort', langues: ['Tigrinya'], email: 'hayle@stemm.lu' },
      { nom: 'Yeman', prenom: 'Yeman', profil: 'Moyen', langues: ['Tigrinya'], email: 'yeman@stemm.lu' },
      { nom: 'Nesrin', prenom: 'Nesrin', profil: 'Moyen', langues: ['Syrien'], email: 'nesrin@stemm.lu' },
      { nom: 'Charif', prenom: 'Charif', profil: 'Fort', langues: ['Syrien'], email: 'charif@stemm.lu' },
      { nom: 'Elsa', prenom: 'Elsa', profil: 'Faible', langues: ['Portugais'], email: 'elsa@stemm.lu' },
      { nom: 'Magali', prenom: 'Magali', profil: 'Moyen', langues: ['Français'], email: 'magali@stemm.lu' },
      { nom: 'Niyat', prenom: 'Niyat', profil: 'Moyen', langues: ['Tigrinya'], email: 'niyat@stemm.lu' },
      { nom: 'Yvette', prenom: 'Yvette', profil: 'Moyen', langues: ['Français'], email: 'yvette@stemm.lu' },
      { nom: 'Azmera', prenom: 'Azmera', profil: 'Moyen', langues: ['Tigrinya'], email: 'azmera@stemm.lu' }
    ];

    // Insérer les employés un par un pour éviter les conflits
    let employeesInserted = 0;
    for (const employee of employeesCuisine) {
      const { error } = await supabase
        .from('employees')
        .upsert([employee], { onConflict: 'email' });
      
      if (!error) employeesInserted++;
    }
    
    console.log(`✅ ${employeesInserted} employés cuisine traités\n`);

    // 2. Vérifier que les tables cuisine existent
    console.log('🔍 Vérification des tables cuisine...');
    try {
      const tableChecks = await Promise.all([
        supabase.from('postes_cuisine').select('count').limit(1),
        supabase.from('employees_cuisine').select('count').limit(1),
        supabase.from('competences_cuisine').select('count').limit(1),
        supabase.from('planning_cuisine').select('count').limit(1),
        supabase.from('creneaux_cuisine').select('count').limit(1)
      ]);

      const tablesExist = tableChecks.every(result => !result.error);
      
      if (!tablesExist) {
        console.log('⚠️ Les tables cuisine n\'existent pas encore.');
        console.log('📋 Veuillez exécuter le contenu de database/schema-cuisine.sql dans Supabase SQL Editor\n');
        
        console.log('🔗 Instructions:');
        console.log('1. Ouvrez https://supabase.com/dashboard/project/cmmfaatcdtbmcmjnegyn');
        console.log('2. Allez dans SQL Editor');
        console.log('3. Créez une nouvelle requête');
        console.log('4. Copiez le contenu de database/schema-cuisine.sql');
        console.log('5. Exécutez la requête');
        console.log('6. Relancez ce script: npm run setup-cuisine\n');
        
        return;
      }
      
      console.log('✅ Toutes les tables cuisine existent\n');

      // 3. Configurer les relations cuisine pour les employés
      console.log('🔗 Configuration des relations cuisine...');
      const { data: employees } = await supabase
        .from('employees')
        .select('id, email')
        .like('email', '%@stemm.lu');

      let relationsCreated = 0;
      for (const employee of employees) {
        const { error } = await supabase
          .from('employees_cuisine')
          .upsert([{
            employee_id: employee.id,
            service: 'Cuisine',
            niveau_hygiene: 'Base'
          }], { onConflict: 'employee_id' });
        
        if (!error) relationsCreated++;
      }
      
      console.log(`✅ ${relationsCreated} relations cuisine créées\n`);

      // 4. Insérer des compétences exemple basées sur vos données
      console.log('🎯 Configuration des compétences exemple...');
      
      // Mapping des compétences selon votre tableau
      const competencesMapping = {
        'salah@stemm.lu': ['Sandwichs', 'Légumerie'],
        'maida@stemm.lu': ['Cuisine chaude', 'Sandwichs', 'Légumerie'],
        'mahmoud@stemm.lu': ['Cuisine chaude', 'Sandwichs', 'Légumerie'],
        'aissatou@stemm.lu': ['Cuisine chaude', 'Sandwichs', 'Vaisselle', 'Légumerie'],
        'fatumata@stemm.lu': ['Cuisine chaude', 'Vaisselle', 'Légumerie'],
        'djenabou@stemm.lu': ['Cuisine chaude', 'Sandwichs', 'Vaisselle', 'Légumerie'],
        'charif@stemm.lu': ['Cuisine chaude', 'Sandwichs', 'Vaisselle', 'Légumerie']
      };

      // Récupérer les postes
      const { data: postes } = await supabase.from('postes_cuisine').select('*');
      
      let competencesCreated = 0;
      for (const [email, posteNames] of Object.entries(competencesMapping)) {
        const employee = employees.find(e => e.email === email);
        if (!employee) continue;

        for (const posteName of posteNames) {
          const poste = postes.find(p => p.nom === posteName);
          if (!poste) continue;

          const niveau = ['Maida', 'Aïssatou', 'Fatumata', 'Djenabou', 'Charif'].some(name => 
            email.toLowerCase().includes(name.toLowerCase())
          ) ? 'Expert' : 'Confirmé';

          const { error } = await supabase
            .from('competences_cuisine')
            .upsert([{
              employee_id: employee.id,
              poste_id: poste.id,
              niveau: niveau,
              date_validation: new Date().toISOString().split('T')[0]
            }], { onConflict: 'employee_id,poste_id' });
          
          if (!error) competencesCreated++;
        }
      }
      
      console.log(`✅ ${competencesCreated} compétences créées\n`);

      // 5. Créer un planning exemple pour aujourd'hui
      console.log('📅 Création d\'un planning exemple...');
      const today = new Date().toISOString().split('T')[0];
      
      const planningExemple = [
        { email: 'maida@stemm.lu', poste: 'Cuisine chaude', creneau: 'Self midi' },
        { email: 'mahmoud@stemm.lu', poste: 'Cuisine chaude', creneau: 'Self midi' },
        { email: 'salah@stemm.lu', poste: 'Sandwichs', creneau: 'Self midi' },
        { email: 'aissatou@stemm.lu', poste: 'Sandwichs', creneau: 'Service continu' },
        { email: 'fatumata@stemm.lu', poste: 'Vaisselle', creneau: 'Service 8h' },
        { email: 'djenabou@stemm.lu', poste: 'Légumerie', creneau: 'Service 8h' }
      ];

      let planningCreated = 0;
      for (const planning of planningExemple) {
        const employee = employees.find(e => e.email === planning.email);
        const poste = postes.find(p => p.nom === planning.poste);
        
        if (employee && poste) {
          const { error } = await supabase
            .from('planning_cuisine')
            .upsert([{
              employee_id: employee.id,
              poste_id: poste.id,
              date: today,
              creneau: planning.creneau,
              role: 'Équipier',
              priorite: 1
            }], { onConflict: 'employee_id,date,creneau' });
          
          if (!error) planningCreated++;
        }
      }
      
      console.log(`✅ ${planningCreated} affectations planning créées\n`);

      console.log('🎉 Module Cuisine configuré avec succès !');
      console.log('🔗 Accédez au module: http://localhost:3006/cuisine\n');
      
    } catch (tableError) {
      console.log('⚠️ Les tables cuisine n\'existent pas encore.');
      console.log('📋 Veuillez d\'abord exécuter database/schema-cuisine.sql dans Supabase\n');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
    process.exit(1);
  }
}

setupCuisineModule(); 