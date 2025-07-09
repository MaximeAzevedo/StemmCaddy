#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Vérifiez que REACT_APP_SUPABASE_URL et SUPABASE_SERVICE_KEY sont définis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Configuration automatique de la base de données Caddy...');
  
  try {
    // Lire le schéma SQL
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Fichier schema.sql non trouvé');
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Exécution du schéma SQL...');
    
    // Diviser en requêtes individuelles et les exécuter une par une
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (error && !error.message.includes('already exists')) {
            console.warn(`⚠️ Avertissement sur requête: ${error.message}`);
          }
        } catch (err) {
          // Essayer avec une approche différente pour les CREATE TABLE
          if (statement.toLowerCase().includes('create table')) {
            console.log(`📝 Tentative création table...`);
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            if (error && !error.message.includes('already exists')) {
              console.warn(`⚠️ ${error.message}`);
            }
          }
        }
      }
    }
    
    console.log('✅ Schéma SQL exécuté');
    
    // Vérifier que les tables principales existent
    console.log('🔍 Vérification des tables...');
    
    const tables = ['vehicles', 'employees', 'competences', 'planning', 'absences'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Table ${table} non accessible:`, error.message);
      } else {
        console.log(`✅ Table ${table} OK`);
      }
    }
    
    // Insérer des données de test si les tables sont vides
    console.log('📊 Vérification et insertion des données...');
    
    const { data: vehiclesData } = await supabase.from('vehicles').select('*');
    if (!vehiclesData || vehiclesData.length === 0) {
      console.log('🚗 Insertion des véhicules...');
      const vehiclesResult = await supabase.from('vehicles').insert([
        { nom: 'Crafter 21', capacite: 3, type: 'Collecte', couleur: '#3b82f6' },
        { nom: 'Crafter 23', capacite: 3, type: 'Collecte', couleur: '#10b981' },
        { nom: 'Jumper', capacite: 3, type: 'Collecte', couleur: '#8b5cf6' },
        { nom: 'Ducato', capacite: 3, type: 'Collecte', couleur: '#f59e0b' },
        { nom: 'Transit', capacite: 8, type: 'Formation', couleur: '#ef4444' }
      ]);
      if (vehiclesResult.error) {
        console.error('❌ Erreur insertion véhicules:', vehiclesResult.error);
      } else {
        console.log('✅ Véhicules insérés');
      }
    }
    
    const { data: employeesData } = await supabase.from('employees').select('*');
    if (!employeesData || employeesData.length === 0) {
      console.log('👥 Insertion des employés...');
      const employeesResult = await supabase.from('employees').insert([
        { nom: 'Martial', prenom: 'Martial', profil: 'Fort', langues: ['Français'], permis: true, etoiles: 2, email: 'martial@caddy.lu' },
        { nom: 'Margot', prenom: 'Margot', profil: 'Moyen', langues: ['Français'], permis: true, etoiles: 2, email: 'margot@caddy.lu' },
        { nom: 'Shadi', prenom: 'Shadi', profil: 'Fort', langues: ['Arabe', 'Anglais', 'Français'], permis: false, etoiles: 2, email: 'shadi@caddy.lu' },
        { nom: 'Ahmad', prenom: 'Ahmad', profil: 'Moyen', langues: ['Arabe'], permis: true, etoiles: 1, email: 'ahmad@caddy.lu' },
        { nom: 'Tamara', prenom: 'Tamara', profil: 'Faible', langues: ['Luxembourgeois', 'Français'], permis: true, etoiles: 1, email: 'tamara@caddy.lu' }
      ]);
      if (employeesResult.error) {
        console.error('❌ Erreur insertion employés:', employeesResult.error);
      } else {
        console.log('✅ Employés insérés');
      }
    }
    
    console.log('🎉 Configuration de base de données terminée avec succès !');
    console.log('');
    console.log('🔧 Prochaines étapes :');
    console.log('1. Redémarrez l\'application : npm start');
    console.log('2. Testez la connexion aux absences');
    console.log('3. Si problème persiste, vérifiez les politiques RLS dans Supabase');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    console.log('');
    console.log('🔧 Solution alternative :');
    console.log('1. Allez sur https://supabase.com/dashboard');
    console.log('2. Ouvrez votre projet');
    console.log('3. Allez dans SQL Editor');
    console.log('4. Copiez le contenu de database/schema.sql');
    console.log('5. Exécutez le script SQL manuellement');
  }
}

// Fonction alternative pour créer les tables une par une
async function createTablesIndividually() {
  console.log('📋 Création individuelle des tables...');
  
  const createVehicles = `
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      nom VARCHAR(50) NOT NULL,
      capacite INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      couleur VARCHAR(20),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  const createEmployees = `
    CREATE TABLE IF NOT EXISTS employees (
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
    );
  `;
  
  const createAbsences = `
    CREATE TABLE IF NOT EXISTS absences (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      date_debut DATE NOT NULL,
      date_fin DATE NOT NULL,
      type_absence VARCHAR(50) DEFAULT 'Absent' CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation')),
      statut VARCHAR(20) DEFAULT 'Confirmée' CHECK (statut IN ('Confirmée', 'En attente', 'Annulée')),
      motif TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CHECK (date_fin >= date_debut)
    );
  `;
  
  const tables = [
    { name: 'vehicles', sql: createVehicles },
    { name: 'employees', sql: createEmployees },
    { name: 'absences', sql: createAbsences }
  ];
  
  for (const table of tables) {
    try {
      console.log(`📝 Création table ${table.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      if (error) {
        console.warn(`⚠️ ${table.name}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table.name} créée`);
      }
    } catch (err) {
      console.error(`❌ Erreur ${table.name}:`, err.message);
    }
  }
}

if (require.main === module) {
  setupDatabase().catch(console.error);
} 