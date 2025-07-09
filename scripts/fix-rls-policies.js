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

async function fixRLSPolicies() {
  console.log('🔒 Configuration des politiques RLS pour accès public...');
  
  const sqlCommands = [
    // Désactiver RLS temporairement pour les tests
    'ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE employees DISABLE ROW LEVEL SECURITY;', 
    'ALTER TABLE absences DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE competences DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE planning DISABLE ROW LEVEL SECURITY;',
    
    // Supprimer les anciennes politiques restrictives
    'DROP POLICY IF EXISTS "Permettre l\'accès aux utilisateurs authentifiés" ON vehicles;',
    'DROP POLICY IF EXISTS "Permettre l\'accès aux utilisateurs authentifiés" ON employees;',
    'DROP POLICY IF EXISTS "Permettre l\'accès aux utilisateurs authentifiés" ON absences;',
    'DROP POLICY IF EXISTS "Permettre l\'accès aux utilisateurs authentifiés" ON competences;',
    'DROP POLICY IF EXISTS "Permettre l\'accès aux utilisateurs authentifiés" ON planning;',
    
    // Réactiver RLS
    'ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE employees ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE absences ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE competences ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE planning ENABLE ROW LEVEL SECURITY;',
    
    // Créer des politiques permissives pour l'accès public
    'CREATE POLICY "Accès public en lecture" ON vehicles FOR SELECT USING (true);',
    'CREATE POLICY "Accès public en écriture" ON vehicles FOR ALL USING (true);',
    
    'CREATE POLICY "Accès public en lecture" ON employees FOR SELECT USING (true);',
    'CREATE POLICY "Accès public en écriture" ON employees FOR ALL USING (true);',
    
    'CREATE POLICY "Accès public en lecture" ON absences FOR SELECT USING (true);',
    'CREATE POLICY "Accès public en écriture" ON absences FOR ALL USING (true);',
    
    'CREATE POLICY "Accès public en lecture" ON competences FOR SELECT USING (true);',
    'CREATE POLICY "Accès public en écriture" ON competences FOR ALL USING (true);',
    
    'CREATE POLICY "Accès public en lecture" ON planning FOR SELECT USING (true);',
    'CREATE POLICY "Accès public en écriture" ON planning FOR ALL USING (true);'
  ];
  
  try {
    console.log('📝 Configuration en cours...');
    console.log('');
    console.log('❗ Instructions pour Supabase Dashboard :');
    console.log('1. Allez sur https://supabase.com/dashboard');
    console.log('2. Ouvrez votre projet Caddy');
    console.log('3. Allez dans "SQL Editor"');
    console.log('4. Copiez et exécutez les commandes suivantes :');
    console.log('');
    
    sqlCommands.forEach((cmd, index) => {
      console.log(`-- Commande ${index + 1}`);
      console.log(cmd);
      console.log('');
    });
    
    console.log('🎯 Alternative : Exécution du script complet');
    console.log('Copiez et exécutez tout d\'un coup :');
    console.log('');
    console.log('-- Script RLS Caddy');
    console.log(sqlCommands.join('\n'));
    console.log('');
    
    console.log('✅ Instructions générées !');
    console.log('');
    console.log('🔧 Après avoir exécuté le SQL :');
    console.log('1. Redémarrez l\'application : npm start');
    console.log('2. Testez la gestion des absences');
    console.log('3. Vérifiez que les erreurs CORS ont disparu');
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
  }
}

async function testAccess() {
  console.log('🧪 Test d\'accès aux tables...');
  
  const tables = ['vehicles', 'employees', 'absences', 'competences', 'planning'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Accès OK`);
      }
    } catch (err) {
      console.log(`💥 ${table}: Erreur critique - ${err.message}`);
    }
  }
  
  console.log('');
  console.log('🎯 Si des erreurs persistent, exécutez le script SQL ci-dessus');
}

async function main() {
  await fixRLSPolicies();
  console.log('');
  await testAccess();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixRLSPolicies, testAccess }; 