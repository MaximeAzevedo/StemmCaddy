require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAbsencesAPI() {
  console.log('🧪 Test complet de l\'API des absences...');
  console.log('');
  
  try {
    // Test 1: Récupération des employés
    console.log('1️⃣ Test récupération des employés...');
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .order('nom');
    
    if (empError) {
      console.error('❌ Erreur employés:', empError);
      return;
    }
    
    console.log(`✅ ${employees.length} employés récupérés`);
    employees.forEach(emp => {
      console.log(`   • ${emp.nom} (${emp.profil}) - ${emp.email}`);
    });
    console.log('');
    
    // Test 2: Récupération des absences (simple)
    console.log('2️⃣ Test récupération des absences (mode simple)...');
    const { data: absencesSimple, error: absError1 } = await supabase
      .from('absences')
      .select('*')
      .order('date_debut', { ascending: false });
    
    if (absError1) {
      console.error('❌ Erreur absences simples:', absError1);
    } else {
      console.log(`✅ ${absencesSimple.length} absences récupérées (mode simple)`);
    }
    
    // Test 3: Récupération des absences avec jointure
    console.log('3️⃣ Test récupération des absences (avec jointure)...');
    const { data: absencesJoin, error: absError2 } = await supabase
      .from('absences')
      .select(`
        *,
        employee:employees!absences_employee_id_fkey(nom, prenom, profil)
      `)
      .order('date_debut', { ascending: false });
    
    if (absError2) {
      console.error('❌ Erreur absences avec jointure:', absError2);
      console.log('ℹ️ L\'application utilisera le mode simple en fallback');
    } else {
      console.log(`✅ ${absencesJoin.length} absences récupérées (avec jointure)`);
    }
    console.log('');
    
    // Test 4: Création d'une absence de test
    if (employees.length > 0) {
      console.log('4️⃣ Test création d\'absence...');
      
      const testAbsence = {
        employee_id: employees[0].id,
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: new Date().toISOString().split('T')[0],
        type_absence: 'Absent',
        statut: 'Confirmée',
        motif: 'Test automatique API'
      };
      
      const { data: newAbsence, error: createError } = await supabase
        .from('absences')
        .insert([testAbsence])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erreur création absence:', createError);
      } else {
        console.log(`✅ Absence créée pour ${employees[0].nom}`);
        
        // Test 5: Suppression de l'absence de test
        console.log('5️⃣ Test suppression d\'absence...');
        const { error: deleteError } = await supabase
          .from('absences')
          .delete()
          .eq('id', newAbsence.id);
        
        if (deleteError) {
          console.error('❌ Erreur suppression:', deleteError);
        } else {
          console.log('✅ Absence de test supprimée');
        }
      }
    }
    
    console.log('');
    console.log('🎯 Résumé du test :');
    console.log('• Les employés sont accessibles ✅');
    console.log(`• Les absences sont ${absError1 ? '❌' : '✅'} accessibles`);
    console.log(`• Les jointures sont ${absError2 ? '❌' : '✅'} fonctionnelles`);
    console.log('');
    
    if (!absError1) {
      console.log('🎉 L\'API des absences fonctionne correctement !');
      console.log('📋 Vérifiez maintenant l\'interface utilisateur sur http://localhost:3000');
    } else {
      console.log('⚠️ Problèmes détectés dans l\'API des absences');
      console.log('💡 Solution : Exécutez le script SQL de correction RLS');
    }
    
  } catch (error) {
    console.error('❌ Erreur critique lors des tests:', error);
  }
}

async function simulateComponentLoad() {
  console.log('');
  console.log('🎭 Simulation du chargement du composant AbsenceManagement...');
  
  try {
    // Simuler exactement ce que fait le composant
    const [employeesResult, absencesResult] = await Promise.all([
      supabase.from('employees').select('*').order('nom'),
      supabase.from('absences').select(`
        *,
        employee:employees(nom, prenom, profil)
      `).order('date_debut', { ascending: false })
    ]);
    
    console.log('👥 Employés:', employeesResult.error ? '❌' : `✅ ${employeesResult.data?.length || 0}`);
    console.log('🚫 Absences:', absencesResult.error ? '❌' : `✅ ${absencesResult.data?.length || 0}`);
    
    if (employeesResult.error) {
      console.log('   Erreur employés:', employeesResult.error.message);
    }
    
    if (absencesResult.error) {
      console.log('   Erreur absences:', absencesResult.error.message);
      
      // Test fallback (sans jointure)
      console.log('🔄 Test fallback sans jointure...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('absences')
        .select('*')
        .order('date_debut', { ascending: false });
      
      console.log('🚫 Absences (fallback):', fallbackError ? '❌' : `✅ ${fallbackData?.length || 0}`);
    }
    
  } catch (err) {
    console.error('💥 Erreur simulation:', err);
  }
}

async function main() {
  await testAbsencesAPI();
  await simulateComponentLoad();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAbsencesAPI, simulateComponentLoad }; 