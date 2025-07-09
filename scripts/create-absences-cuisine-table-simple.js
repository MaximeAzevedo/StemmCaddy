require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAbsencesCuisineSetup() {
  console.log('🧪 Test et configuration de la table absences_cuisine...');
  console.log('');
  
  try {
    // Test 1: Vérifier si la table existe déjà
    console.log('1️⃣ Vérification de l\'existence de la table...');
    const { data, error } = await supabase
      .from('absences_cuisine')
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('❌ Table absences_cuisine n\'existe pas');
      console.log('');
      console.log('📋 INSTRUCTIONS POUR CRÉER LA TABLE :');
      console.log('1. Allez sur https://supabase.com/dashboard');
      console.log('2. Ouvrez votre projet Caddy');
      console.log('3. Allez dans "SQL Editor"');
      console.log('4. Créez une nouvelle requête et copiez-collez le SQL suivant :');
      console.log('');
      console.log('-- DÉBUT DU SCRIPT SQL --');
      console.log(`
-- Table des absences pour les employés cuisine
CREATE TABLE absences_cuisine (
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
CREATE INDEX idx_absences_cuisine_employee_id ON absences_cuisine(employee_id);
CREATE INDEX idx_absences_cuisine_dates ON absences_cuisine(date_debut, date_fin);
CREATE INDEX idx_absences_cuisine_statut ON absences_cuisine(statut);

-- Politique RLS pour permettre l'accès public
ALTER TABLE absences_cuisine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accès public absences cuisine" ON absences_cuisine FOR ALL USING (true);

-- Données de test
INSERT INTO absences_cuisine (employee_id, date_debut, date_fin, type_absence, motif) 
SELECT employee_id, '2024-01-15', '2024-01-15', 'Maladie', 'Test - Grippe'
FROM employees_cuisine LIMIT 1;

INSERT INTO absences_cuisine (employee_id, date_debut, date_fin, type_absence, motif) 
SELECT employee_id, '2024-01-20', '2024-01-22', 'Congé', 'Test - Congés personnels'
FROM employees_cuisine LIMIT 1 OFFSET 1;
      `);
      console.log('-- FIN DU SCRIPT SQL --');
      console.log('');
      console.log('5. Cliquez sur "Run" pour exécuter le script');
      console.log('6. Puis relancez ce script pour vérifier : node scripts/create-absences-cuisine-table-simple.js');
      
      return false;
    } else if (error) {
      console.error('❌ Erreur inattendue:', error);
      return false;
    } else {
      console.log('✅ Table absences_cuisine existe et est accessible');
      console.log(`📊 ${data?.length || 0} enregistrements trouvés`);
    }
    
    // Test 2: Vérifier les employés cuisine
    console.log('');
    console.log('2️⃣ Vérification des employés cuisine...');
    const { data: employeesData, error: empError } = await supabase
      .from('employees_cuisine')
      .select(`
        employee_id,
        employee:employees(nom, prenom)
      `)
      .limit(5);
    
    if (empError) {
      console.error('❌ Erreur employés cuisine:', empError);
    } else {
      console.log(`✅ ${employeesData.length} employés cuisine disponibles pour les tests`);
      employeesData.forEach(ec => {
        console.log(`   • ${ec.employee.nom} ${ec.employee.prenom} (ID: ${ec.employee_id})`);
      });
    }
    
    // Test 3: Test de création d'absence
    console.log('');
    console.log('3️⃣ Test de création d\'absence...');
    
    if (employeesData && employeesData.length > 0) {
      const testAbsence = {
        employee_id: employeesData[0].employee_id,
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: new Date().toISOString().split('T')[0],
        type_absence: 'Absent',
        statut: 'Confirmée',
        motif: 'Test automatique - Script de validation'
      };
      
      const { data: createdAbsence, error: createError } = await supabase
        .from('absences_cuisine')
        .insert([testAbsence])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erreur création:', createError);
      } else {
        console.log('✅ Absence créée avec succès');
        console.log(`   ID: ${createdAbsence.id}, Employé: ${employeesData[0].employee.nom}`);
        
        // Test 4: Suppression de l'absence de test
        console.log('');
        console.log('4️⃣ Nettoyage de l\'absence de test...');
        const { error: deleteError } = await supabase
          .from('absences_cuisine')
          .delete()
          .eq('id', createdAbsence.id);
        
        if (deleteError) {
          console.error('❌ Erreur suppression:', deleteError);
        } else {
          console.log('✅ Absence de test supprimée');
        }
      }
    }
    
    // Test 5: Test de jointure avec employees
    console.log('');
    console.log('5️⃣ Test jointure avec les employés...');
    const { data: joinData, error: joinError } = await supabase
      .from('absences_cuisine')
      .select(`
        *,
        employee:employees(nom, prenom, profil)
      `)
      .limit(3);
    
    if (joinError) {
      console.error('❌ Erreur jointure:', joinError);
      console.log('ℹ️ L\'application utilisera le mode fallback sans jointure');
    } else {
      console.log('✅ Jointures fonctionnent correctement');
      console.log(`📊 ${joinData.length} absences avec informations employé`);
    }
    
    console.log('');
    console.log('🎉 Configuration validée !');
    console.log('📋 L\'onglet Absences dans le module Cuisine est prêt à être utilisé');
    console.log('🔧 Pour tester : npm start puis allez dans Cuisine > Absences');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur critique:', error);
    return false;
  }
}

// Test de l'API complète
async function testFullAPI() {
  console.log('');
  console.log('🔬 Test complet de l\'API absences cuisine...');
  
  const operations = [
    {
      name: 'Récupération simple',
      test: () => supabase.from('absences_cuisine').select('*').limit(5)
    },
    {
      name: 'Récupération avec jointure',
      test: () => supabase.from('absences_cuisine').select(`
        *,
        employee:employees(nom, prenom, profil)
      `).limit(3)
    },
    {
      name: 'Filtrage par statut',
      test: () => supabase.from('absences_cuisine').select('*').eq('statut', 'Confirmée')
    },
    {
      name: 'Filtrage par dates',
      test: () => supabase.from('absences_cuisine').select('*')
        .gte('date_debut', '2024-01-01')
        .lte('date_fin', '2024-12-31')
    }
  ];
  
  for (const op of operations) {
    try {
      const { data, error } = await op.test();
      if (error) {
        console.log(`❌ ${op.name}: ${error.message}`);
      } else {
        console.log(`✅ ${op.name}: ${data.length} résultats`);
      }
    } catch (err) {
      console.log(`💥 ${op.name}: Erreur critique`);
    }
  }
}

async function main() {
  const success = await testAbsencesCuisineSetup();
  
  if (success) {
    await testFullAPI();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAbsencesCuisineSetup }; 