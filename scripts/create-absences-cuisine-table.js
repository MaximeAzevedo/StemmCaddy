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

async function createAbsencesCuisineTable() {
  console.log('🚀 Création de la table absences_cuisine...');
  
  try {
    // Script SQL complet pour créer la table et ses dépendances
    const createTableSQL = `
-- Table des absences pour les employés cuisine
CREATE TABLE IF NOT EXISTS absences_cuisine (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type_absence VARCHAR(50) DEFAULT 'Absent' CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation', 'Accident')),
  statut VARCHAR(20) DEFAULT 'Confirmée' CHECK (statut IN ('Confirmée', 'En attente', 'Annulée')),
  motif TEXT,
  remplacant_id INTEGER REFERENCES employees(id),
  created_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (date_fin >= date_debut)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_employee_id ON absences_cuisine(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_dates ON absences_cuisine(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_statut ON absences_cuisine(statut);

-- Politique RLS pour permettre l'accès public
ALTER TABLE absences_cuisine ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Accès public absences cuisine" ON absences_cuisine FOR ALL USING (true);
    `;

    console.log('📝 Exécution du SQL de création...');
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Erreur lors de la création:', error);
      console.log('');
      console.log('📋 SOLUTION ALTERNATIVE :');
      console.log('1. Allez sur https://supabase.com/dashboard');
      console.log('2. Ouvrez votre projet');
      console.log('3. Allez dans SQL Editor');
      console.log('4. Copiez et exécutez le contenu du fichier database/schema-absences-cuisine.sql');
      return;
    }

    console.log('✅ Table absences_cuisine créée avec succès !');
    
    // Test d'accès à la table
    console.log('🧪 Test d\'accès à la table...');
    const { data: testData, error: testError } = await supabase
      .from('absences_cuisine')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erreur d\'accès à la table:', testError);
    } else {
      console.log('✅ Table accessible - prête à être utilisée !');
    }
    
    // Insertion de données de test (optionnel)
    console.log('📊 Ajout de données de test...');
    const { data: employeesData, error: empError } = await supabase
      .from('employees_cuisine')
      .select('employee_id')
      .limit(3);
    
    if (!empError && employeesData.length > 0) {
      const testAbsences = [
        {
          employee_id: employeesData[0].employee_id,
          date_debut: '2024-01-15',
          date_fin: '2024-01-15',
          type_absence: 'Maladie',
          motif: 'Grippe - données de test'
        },
        {
          employee_id: employeesData[1]?.employee_id || employeesData[0].employee_id,
          date_debut: '2024-01-20',
          date_fin: '2024-01-22',
          type_absence: 'Congé',
          motif: 'Congés personnels - données de test'
        }
      ];
      
      const { error: insertError } = await supabase
        .from('absences_cuisine')
        .insert(testAbsences);
      
      if (insertError) {
        console.warn('⚠️ Erreur insertion données de test:', insertError.message);
      } else {
        console.log('✅ Données de test ajoutées');
      }
    }
    
    console.log('');
    console.log('🎉 Configuration terminée !');
    console.log('📋 Prochaines étapes :');
    console.log('1. Redémarrez l\'application React si nécessaire');
    console.log('2. Allez dans Cuisine > Onglet Absences');
    console.log('3. Testez la création/modification d\'absences');
    
  } catch (error) {
    console.error('❌ Erreur critique:', error);
    console.log('');
    console.log('📋 SOLUTION MANUELLE :');
    console.log('Exécutez le fichier database/schema-absences-cuisine.sql dans Supabase SQL Editor');
  }
}

// Fonction pour nettoyer les données de test
async function cleanTestData() {
  console.log('🧹 Nettoyage des données de test...');
  
  try {
    const { error } = await supabase
      .from('absences_cuisine')
      .delete()
      .like('motif', '%données de test%');
    
    if (error) {
      console.error('❌ Erreur nettoyage:', error);
    } else {
      console.log('✅ Données de test supprimées');
    }
  } catch (err) {
    console.error('❌ Erreur critique nettoyage:', err);
  }
}

// Interface de ligne de commande
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'clean':
      await cleanTestData();
      break;
    case 'create':
    default:
      await createAbsencesCuisineTable();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createAbsencesCuisineTable, cleanTestData }; 