require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Vérifiez que REACT_APP_SUPABASE_URL et SUPABASE_SERVICE_KEY sont définis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTablesAndData() {
  console.log('🚀 Configuration automatique des tables et données Caddy...');
  
  try {
    // 1. Créer les données directement (les tables seront créées automatiquement)
    console.log('🚗 Création/mise à jour des véhicules...');
    
    const vehiclesData = [
      { nom: 'Crafter 21', capacite: 3, type: 'Collecte', couleur: '#3b82f6' },
      { nom: 'Crafter 23', capacite: 3, type: 'Collecte', couleur: '#10b981' },
      { nom: 'Jumper', capacite: 3, type: 'Collecte', couleur: '#8b5cf6' },
      { nom: 'Ducato', capacite: 3, type: 'Collecte', couleur: '#f59e0b' },
      { nom: 'Transit', capacite: 8, type: 'Formation', couleur: '#ef4444' }
    ];
    
    // Essayer d'insérer les véhicules
    const { data: vehiclesResult, error: vehiclesError } = await supabase
      .from('vehicles')
      .upsert(vehiclesData, { onConflict: 'nom' });
    
    if (vehiclesError) {
      console.log('📋 Table vehicles n\'existe pas, création manuelle nécessaire');
      console.log('ℹ️ Exécutez le schéma SQL complet dans Supabase Dashboard');
    } else {
      console.log('✅ Véhicules créés/mis à jour');
    }
    
    // 2. Créer les employés
    console.log('👥 Création/mise à jour des employés...');
    
    const employeesData = [
      { nom: 'Martial', prenom: 'Martial', profil: 'Fort', langues: ['Français'], permis: true, etoiles: 2, email: 'martial@caddy.lu', statut: 'Actif' },
      { nom: 'Margot', prenom: 'Margot', profil: 'Moyen', langues: ['Français'], permis: true, etoiles: 2, email: 'margot@caddy.lu', statut: 'Actif' },
      { nom: 'Shadi', prenom: 'Shadi', profil: 'Fort', langues: ['Arabe', 'Anglais', 'Français'], permis: false, etoiles: 2, email: 'shadi@caddy.lu', statut: 'Actif' },
      { nom: 'Ahmad', prenom: 'Ahmad', profil: 'Moyen', langues: ['Arabe'], permis: true, etoiles: 1, email: 'ahmad@caddy.lu', statut: 'Actif' },
      { nom: 'Tamara', prenom: 'Tamara', profil: 'Faible', langues: ['Luxembourgeois', 'Français'], permis: true, etoiles: 1, email: 'tamara@caddy.lu', statut: 'Actif' },
      { nom: 'Soroosh', prenom: 'Soroosh', profil: 'Fort', langues: ['Perse'], permis: true, etoiles: 2, email: 'soroosh@caddy.lu', statut: 'Actif' },
      { nom: 'Imad', prenom: 'Imad', profil: 'Moyen', langues: ['Arabe'], permis: true, etoiles: 1, email: 'imad@caddy.lu', statut: 'Actif' }
    ];
    
    const { data: employeesResult, error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesData, { onConflict: 'email' });
    
    if (employeesError) {
      console.log('📋 Table employees n\'existe pas, création manuelle nécessaire');
    } else {
      console.log('✅ Employés créés/mis à jour');
    }
    
    // 3. Tester la table absences
    console.log('🚫 Test de la table absences...');
    
    const { data: absencesTest, error: absencesError } = await supabase
      .from('absences')
      .select('*')
      .limit(1);
    
    if (absencesError) {
      console.log('📋 Table absences n\'existe pas');
      console.log('');
      console.log('❗ SOLUTION REQUISE :');
      console.log('1. Allez sur https://supabase.com/dashboard');
      console.log('2. Ouvrez votre projet Caddy');
      console.log('3. Allez dans "SQL Editor"');
      console.log('4. Exécutez ce script SQL :');
      console.log('');
      console.log('-- Création table absences');
      console.log('CREATE TABLE IF NOT EXISTS absences (');
      console.log('  id SERIAL PRIMARY KEY,');
      console.log('  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,');
      console.log('  date_debut DATE NOT NULL,');
      console.log('  date_fin DATE NOT NULL,');
      console.log('  type_absence VARCHAR(50) DEFAULT \'Absent\' CHECK (type_absence IN (\'Absent\', \'Congé\', \'Maladie\', \'Formation\')),');
      console.log('  statut VARCHAR(20) DEFAULT \'Confirmée\' CHECK (statut IN (\'Confirmée\', \'En attente\', \'Annulée\')),');
      console.log('  motif TEXT,');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  CHECK (date_fin >= date_debut)');
      console.log(');');
      console.log('');
      console.log('-- Activer RLS');
      console.log('ALTER TABLE absences ENABLE ROW LEVEL SECURITY;');
      console.log('CREATE POLICY "Permettre l\'accès aux utilisateurs authentifiés" ON absences FOR ALL USING (auth.role() = \'authenticated\');');
      console.log('');
    } else {
      console.log('✅ Table absences existe et est accessible');
    }
    
    // 4. Vérification finale
    console.log('');
    console.log('🔍 Vérification finale des accès...');
    
    const tables = [
      { name: 'vehicles', emoji: '🚗' },
      { name: 'employees', emoji: '👥' },
      { name: 'absences', emoji: '🚫' }
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`${table.emoji} Table ${table.name}: ❌ ${error.message}`);
        } else {
          console.log(`${table.emoji} Table ${table.name}: ✅ OK (${data?.length || 0} enregistrements visibles)`);
        }
      } catch (err) {
        console.log(`${table.emoji} Table ${table.name}: ❌ Erreur critique: ${err.message}`);
      }
    }
    
    console.log('');
    console.log('🎯 Résumé :');
    console.log('• Si toutes les tables sont ✅ OK, redémarrez l\'application');
    console.log('• Si des tables sont ❌, exécutez le script SQL dans Supabase Dashboard');
    console.log('• Fichier SQL complet : database/schema.sql');
    
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

if (require.main === module) {
  createTablesAndData().catch(console.error);
}

module.exports = { createTablesAndData }; 