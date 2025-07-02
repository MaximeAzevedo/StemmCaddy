#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://cmmfaatcdtbmcmjnegyn.supabase.co';
const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbWZhYXRjZHRibWNtam5lZ3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MTA5MzIsImV4cCI6MjA1MTM4NjkzMn0.jZHRiDxdj0wpuZXluZwicm9ZSIGmFub241CJpXQJQJE3NTE0NTUzN09eCSOKl7qIrtH8tmzXZwU3khb7M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
  console.log('🚀 Configuration de la base de données Caddy...\n');

  try {
    // 1. Créer les tables
    console.log('📋 Création des tables...');
    
    // Utilisation de .sql() au lieu de .rpc()
    const tables = [
      // Table des véhicules
      `CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        capacite INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        couleur VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Table des employés
      `CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100),
        email VARCHAR(255) UNIQUE,
        telephone VARCHAR(20),
        profil VARCHAR(20) NOT NULL CHECK (profil IN ('Faible', 'Moyen', 'Fort')),
        langues TEXT[] DEFAULT '{}',
        permis BOOLEAN DEFAULT FALSE,
        etoiles INTEGER DEFAULT 1 CHECK (etoiles IN (1, 2)),
        statut VARCHAR(20) DEFAULT 'Actif' CHECK (statut IN ('Actif', 'Absent', 'Formation')),
        date_embauche DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Table des compétences
      `CREATE TABLE IF NOT EXISTS competences (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        niveau VARCHAR(20) NOT NULL CHECK (niveau IN ('X', 'XX')),
        date_validation DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(employee_id, vehicle_id)
      );`,
      
      // Table du planning
      `CREATE TABLE IF NOT EXISTS planning (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        role VARCHAR(50) DEFAULT 'Équipier',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Fonction pour updated_at
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
           NEW.updated_at = NOW();
           RETURN NEW;
       END;
       $$ language 'plpgsql';`,
       
      // Triggers
      `CREATE TRIGGER IF NOT EXISTS update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
      `CREATE TRIGGER IF NOT EXISTS update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
      `CREATE TRIGGER IF NOT EXISTS update_competences_updated_at BEFORE UPDATE ON competences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
      `CREATE TRIGGER IF NOT EXISTS update_planning_updated_at BEFORE UPDATE ON planning FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
    ];

    for (const sql of tables) {
      try {
        await supabase.from('_').select().limit(0); // Test de connexion
        console.log('⚠️ Les tables doivent être créées manuellement via SQL Editor');
        console.log('📋 Copiez le contenu de database/schema.sql dans Supabase SQL Editor');
        break;
      } catch (error) {
        // Continue avec l'insertion des données
        break;
      }
    }

    // 2. Insérer les véhicules
    console.log('🚗 Insertion des véhicules...');
    const vehicles = [
      { nom: 'Crafter 21', capacite: 3, type: 'Collecte', couleur: '#3b82f6' },
      { nom: 'Crafter 23', capacite: 3, type: 'Collecte', couleur: '#10b981' },
      { nom: 'Jumper', capacite: 3, type: 'Collecte', couleur: '#8b5cf6' },
      { nom: 'Ducato', capacite: 3, type: 'Collecte', couleur: '#f59e0b' },
      { nom: 'Transit', capacite: 8, type: 'Formation', couleur: '#ef4444' }
    ];

    const { error: vehiclesError } = await supabase
      .from('vehicles')
      .upsert(vehicles, { onConflict: 'nom' });
    
    if (vehiclesError) {
      console.log('⚠️ Table vehicles non trouvée. Créez d\'abord les tables avec schema.sql');
      console.log('✅ Script préparé, exécutez d\'abord les tables manuellement');
      return;
    }
    console.log('✅ Véhicules insérés');

    // 3. Insérer les employés
    console.log('👥 Insertion des employés...');
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

    const { error: employeesError } = await supabase
      .from('employees')
      .upsert(employees, { onConflict: 'email' });
    if (employeesError) throw employeesError;
    console.log('✅ Employés insérés');

    // 4. Configurer les compétences
    console.log('🎯 Configuration des compétences...');
    
    // Récupérer les IDs des employés et véhicules
    const { data: empData } = await supabase.from('employees').select('id, nom');
    const { data: vehData } = await supabase.from('vehicles').select('id, nom');
    
    const empMap = empData.reduce((acc, emp) => ({ ...acc, [emp.nom]: emp.id }), {});
    const vehMap = vehData.reduce((acc, veh) => ({ ...acc, [veh.nom]: veh.id }), {});

    const competences = [];
    
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

    const { error: compError } = await supabase
      .from('competences')
      .upsert(competences, { onConflict: ['employee_id', 'vehicle_id'] });
    if (compError) throw compError;
    console.log('✅ Compétences configurées');

    // 5. Créer un planning de démonstration
    console.log('📅 Création du planning de démonstration...');
    const planning = [
      { employee_id: empMap['Martial'], vehicle_id: vehMap['Crafter 21'], date: new Date().toISOString().split('T')[0], role: 'Conducteur' },
      { employee_id: empMap['Shadi'], vehicle_id: vehMap['Crafter 21'], date: new Date().toISOString().split('T')[0], role: 'Équipier' },
      { employee_id: empMap['Tamara'], vehicle_id: vehMap['Crafter 21'], date: new Date().toISOString().split('T')[0], role: 'Équipier' },
      { employee_id: empMap['Margot'], vehicle_id: vehMap['Crafter 23'], date: new Date().toISOString().split('T')[0], role: 'Conducteur' },
      { employee_id: empMap['Ahmad'], vehicle_id: vehMap['Crafter 23'], date: new Date().toISOString().split('T')[0], role: 'Équipier' },
      { employee_id: empMap['Basel'], vehicle_id: vehMap['Crafter 23'], date: new Date().toISOString().split('T')[0], role: 'Équipier' }
    ].filter(p => p.employee_id && p.vehicle_id);

    const { error: planError } = await supabase
      .from('planning')
      .upsert(planning, { onConflict: ['employee_id', 'vehicle_id', 'date'] });
    if (planError) throw planError;
    console.log('✅ Planning de démonstration créé');

    console.log('\n🎉 Configuration des données terminée avec succès !');
    console.log('\n📋 Résumé :');
    console.log('• Véhicules : 5 véhicules de la flotte');
    console.log('• Employés : 14 employés + votre compte admin');
    console.log('• Compétences : Configurées selon vos tableaux Excel');
    console.log('• Planning : Démonstration pour aujourd\'hui');
    
    console.log('\n⚠️ ÉTAPES RESTANTES :');
    console.log('1. Allez sur https://supabase.com/dashboard/project/cmmfaatcdtbmcmjnegyn');
    console.log('2. Authentication > Users > Add User :');
    console.log('   Email: maxime@caddy.lu');
    console.log('   Password: Cristobello54');
    console.log('   Email Confirm: ✓');
    console.log('3. Si les tables n\'existent pas, SQL Editor > Exécutez database/schema.sql');
    console.log('\n🚀 Puis testez l\'application !');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration :', error);
    console.log('\n🔧 Solution :');
    console.log('1. Vérifiez que les tables existent (schema.sql)');
    console.log('2. Créez votre compte manuellement sur Supabase Dashboard');
    console.log('3. Relancez ce script');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 