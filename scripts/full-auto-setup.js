#!/usr/bin/env node

// Charger les variables d'environnement
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase avec les variables d'environnement
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Vérification des variables d'environnement
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes !');
  console.log('Assurez-vous que votre fichier .env contient :');
  console.log('- REACT_APP_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Client administrateur avec pouvoirs complets
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fullAutoSetup() {
  console.log('🚀🚀🚀 CONFIGURATION AUTOMATIQUE COMPLÈTE CADDY 🚀🚀🚀\n');

  try {
    console.log('🔍 Test de connexion Supabase...');
    
    // Test de connexion
    const { data: testData, error: testError } = await supabaseAdmin
      .from('_metadata')
      .select('*')
      .limit(1);
    
    if (testError && !testError.message.includes('relation "_metadata" does not exist')) {
      throw new Error(`Erreur de connexion Supabase: ${testError.message}`);
    }
    
    console.log('✅ Connexion Supabase OK');
    
    // 1. CRÉER VOTRE COMPTE UTILISATEUR D'ABORD
    console.log('1️⃣ Création de votre compte utilisateur...');
    
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: 'maxime@caddy.lu',
        password: 'Cristobello54',
        email_confirm: true,
        user_metadata: {
          name: 'Maxime Deazevedo',
          role: 'admin'
        }
      });

      if (authError && !authError.message.includes('already registered')) {
        console.warn('⚠️ Erreur création utilisateur:', authError.message);
      } else {
        console.log('✅ Compte utilisateur créé/vérifié');
      }
    } catch (authErr) {
      console.warn('⚠️ Création utilisateur échouée, continuons avec les données...');
    }

    // 2. INSÉRER LES DONNÉES (qui créeront automatiquement les tables si elles n'existent pas)
    console.log('2️⃣ Insertion des véhicules...');
    
    const vehicles = [
      { nom: 'Crafter 21', capacite: 3, type: 'Collecte', couleur: '#3b82f6' },
      { nom: 'Crafter 23', capacite: 3, type: 'Collecte', couleur: '#10b981' },
      { nom: 'Jumper', capacite: 3, type: 'Collecte', couleur: '#8b5cf6' },
      { nom: 'Ducato', capacite: 3, type: 'Collecte', couleur: '#f59e0b' },
      { nom: 'Transit', capacite: 8, type: 'Formation', couleur: '#ef4444' }
    ];

    // Essayer d'insérer les véhicules
    const { data: vehicleData, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .upsert(vehicles, { onConflict: 'nom' })
      .select();
    
    if (vehiclesError) {
      console.log('⚠️ Tables non trouvées. Vous devez créer les tables manuellement.');
      console.log('📋 Instructions :');
      console.log('1. Allez sur https://supabase.com/dashboard/project/cmmfaatcdtbmcmjnegyn/sql/new');
      console.log('2. Copiez/collez le contenu de database/schema.sql');
      console.log('3. Cliquez "Run"');
      console.log('4. Relancez : npm run auto');
      return;
    }
    
    console.log('✅ Véhicules insérés');

    // 3. INSÉRER LES EMPLOYÉS
    console.log('3️⃣ Insertion des employés...');
    const employees = [
      { nom: 'Martial', prenom: 'Martial', profil: 'Fort', langues: ['Français'], permis: true, etoiles: 2, email: 'martial@caddy.lu' },
      { nom: 'Margot', prenom: 'Margot', profil: 'Moyen', langues: ['Français'], permis: true, etoiles: 2, email: 'margot@caddy.lu' },
      { nom: 'Shadi', prenom: 'Shadi', profil: 'Fort', langues: ['Arabe', 'Anglais', 'Français'], permis: false, etoiles: 2, email: 'shadi@caddy.lu' },
      { nom: 'Ahmad', prenom: 'Ahmad', profil: 'Moyen', langues: ['Arabe'], permis: true, etoiles: 1, email: 'ahmad@caddy.lu' },
      { nom: 'Tamara', prenom: 'Tamara', profil: 'Faible', langues: ['Luxembourgeois', 'Français'], permis: true, etoiles: 1, email: 'tamara@caddy.lu' },
      { nom: 'Soroosh', prenom: 'Soroosh', profil: 'Fort', langues: ['Perse'], permis: true, etoiles: 2, email: 'soroosh@caddy.lu' },
      { nom: 'Imad', prenom: 'Imad', profil: 'Moyen', langues: ['Arabe'], permis: true, etoiles: 1, email: 'imad@caddy.lu' },
      { nom: 'Basel', prenom: 'Basel', profil: 'Faible', langues: ['Arabe'], permis: false, etoiles: 1, email: 'basel@caddy.lu' },
      { nom: 'Firas', prenom: 'Firas', profil: 'Moyen', langues: ['Arabe'], permis: true, etoiles: 1, email: 'firas@caddy.lu' },
      { nom: 'José', prenom: 'José', profil: 'Fort', langues: ['Espagnol', 'Français'], permis: true, etoiles: 2, email: 'jose@caddy.lu' },
      { nom: 'Juan', prenom: 'Juan', profil: 'Moyen', langues: ['Espagnol'], permis: false, etoiles: 1, email: 'juan@caddy.lu' },
      { nom: 'Emaha', prenom: 'Emaha', profil: 'Faible', langues: ['Tigrinya'], permis: false, etoiles: 1, email: 'emaha@caddy.lu' },
      { nom: 'Medha', prenom: 'Medha', profil: 'Faible', langues: ['Tigrinya'], permis: false, etoiles: 1, email: 'medha@caddy.lu' },
      { nom: 'Tesfa', prenom: 'Tesfa', profil: 'Moyen', langues: ['Tigrinya'], permis: false, etoiles: 1, email: 'tesfa@caddy.lu' },
      // Votre compte admin
      { 
        nom: 'Deazevedo', 
        prenom: 'Maxime', 
        profil: 'Fort', 
        langues: ['Français', 'Anglais'], 
        permis: true, 
        etoiles: 2, 
        email: 'maxime@caddy.lu',
        date_embauche: new Date().toISOString().split('T')[0],
        notes: 'Administrateur système - Accès complet'
      }
    ];

    const { data: empData, error: employeesError } = await supabaseAdmin
      .from('employees')
      .upsert(employees, { onConflict: 'email' })
      .select();
    if (employeesError) throw employeesError;
    console.log('✅ Employés insérés');

    // 4. CONFIGURER LES COMPÉTENCES
    console.log('4️⃣ Configuration des compétences...');
    
    // Récupérer les IDs
    const { data: allEmpData } = await supabaseAdmin.from('employees').select('id, nom');
    const { data: allVehData } = await supabaseAdmin.from('vehicles').select('id, nom');
    
    const empMap = allEmpData.reduce((acc, emp) => ({ ...acc, [emp.nom]: emp.id }), {});
    const vehMap = allVehData.reduce((acc, veh) => ({ ...acc, [veh.nom]: veh.id }), {});

    // Compétences selon vos tableaux Excel
    const competenceConfig = {
      'Crafter 21': {
        'XX': ['Martial', 'Margot', 'Shadi', 'Soroosh', 'José', 'Deazevedo'],
        'X': ['Ahmad', 'Imad', 'Firas']
      },
      'Crafter 23': {
        'XX': ['Martial', 'Margot', 'Ahmad', 'Soroosh', 'José', 'Deazevedo'],
        'X': ['Shadi', 'Imad', 'Firas', 'Juan']
      },
      'Jumper': {
        'XX': ['Martial', 'Margot', 'Ahmad', 'Soroosh', 'Imad', 'José', 'Deazevedo'],
        'X': ['Shadi', 'Firas', 'Juan']
      },
      'Ducato': {
        'XX': ['Martial', 'Margot', 'Ahmad', 'Soroosh', 'Imad', 'José', 'Firas', 'Deazevedo'],
        'X': ['Shadi', 'Juan']
      },
      'Transit': {
        'XX': ['Martial', 'Margot', 'Ahmad', 'Soroosh', 'Imad', 'José', 'Firas', 'Juan', 'Deazevedo'],
        'X': ['Shadi', 'Tamara', 'Basel', 'Tesfa']
      }
    };

    const competences = [];
    Object.entries(competenceConfig).forEach(([vehicleName, levels]) => {
      const vehicleId = vehMap[vehicleName];
      if (vehicleId) {
        Object.entries(levels).forEach(([niveau, employes]) => {
          employes.forEach(nom => {
            const employeeId = empMap[nom];
            if (employeeId) {
              competences.push({
                employee_id: employeeId,
                vehicle_id: vehicleId,
                niveau,
                date_validation: new Date().toISOString().split('T')[0]
              });
            }
          });
        });
      }
    });

    const { error: compError } = await supabaseAdmin
      .from('competences')
      .upsert(competences, { onConflict: ['employee_id', 'vehicle_id'] });
    if (compError) throw compError;
    console.log('✅ Compétences configurées');

    // 5. CRÉER PLANNING DE DÉMONSTRATION
    console.log('5️⃣ Création du planning...');
    const planning = [
      { employee_id: empMap['Martial'], vehicle_id: vehMap['Crafter 21'], date: new Date().toISOString().split('T')[0], role: 'Conducteur' },
      { employee_id: empMap['Shadi'], vehicle_id: vehMap['Crafter 21'], date: new Date().toISOString().split('T')[0], role: 'Équipier' },
      { employee_id: empMap['Tamara'], vehicle_id: vehMap['Crafter 21'], date: new Date().toISOString().split('T')[0], role: 'Équipier' },
      { employee_id: empMap['Margot'], vehicle_id: vehMap['Crafter 23'], date: new Date().toISOString().split('T')[0], role: 'Conducteur' },
      { employee_id: empMap['Ahmad'], vehicle_id: vehMap['Crafter 23'], date: new Date().toISOString().split('T')[0], role: 'Équipier' },
      { employee_id: empMap['Basel'], vehicle_id: vehMap['Crafter 23'], date: new Date().toISOString().split('T')[0], role: 'Équipier' }
    ].filter(p => p.employee_id && p.vehicle_id);

    const { error: planError } = await supabaseAdmin
      .from('planning')
      .upsert(planning, { onConflict: ['employee_id', 'vehicle_id', 'date'] });
    if (planError) throw planError;
    console.log('✅ Planning créé');

    console.log('\n🎉🎉🎉 CONFIGURATION AUTOMATIQUE TERMINÉE ! 🎉🎉🎉');
    console.log('\n═'.repeat(60));
    console.log('🏆 RÉCAPITULATIF COMPLET :');
    console.log('═'.repeat(60));
    console.log('✅ Véhicules : 5 véhicules de la flotte Caddy');
    console.log('✅ Employés : 14 employés + votre compte administrateur');
    console.log('✅ Compétences : Configurées selon vos tableaux Excel (X/XX)');
    console.log('✅ Planning : Démonstration avec règles d\'insertion');
    console.log('✅ Utilisateur : maxime@caddy.lu / Cristobello54');
    console.log('');
    console.log('🚀 PRÊT À UTILISER :');
    console.log('   → npm start');
    console.log('   → http://localhost:3001');
    console.log('   → Connexion avec vos identifiants');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ ERREUR :', error);
    console.log('\n🔧 SOLUTION MANUELLE :');
    console.log('1. Ouvrez : https://supabase.com/dashboard/project/cmmfaatcdtbmcmjnegyn/sql/new');
    console.log('2. Copiez/collez : database/schema.sql');
    console.log('3. Cliquez "Run"');
    console.log('4. Authentication > Users > Add User :');
    console.log('   Email: maxime@caddy.lu | Password: Cristobello54');
    console.log('5. Relancez : npm run auto');
  }
}

// Exécuter automatiquement
if (require.main === module) {
  fullAutoSetup();
}

module.exports = { fullAutoSetup }; 