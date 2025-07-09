require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAbsencesCuisineAPI() {
  console.log('🧪 Test complet de l\'API des absences cuisine...');
  console.log('');
  
  try {
    // Test 1: Récupération des employés cuisine
    console.log('1️⃣ Test récupération des employés cuisine...');
    const { data: employeesCuisine, error: empError } = await supabase
      .from('employees_cuisine')
      .select(`
        *,
        employee:employees(*)
      `)
      .order('employee_id');
    
    if (empError) {
      console.error('❌ Erreur employés cuisine:', empError);
      return;
    }
    
    console.log(`✅ ${employeesCuisine.length} employés cuisine récupérés`);
    employeesCuisine.forEach(ec => {
      const emp = ec.employee;
      console.log(`   • ${emp.nom} ${emp.prenom} (${emp.profil}) - Service: ${ec.service}`);
    });
    console.log('');
    
    // Test 2: Vérification de la table absences_cuisine
    console.log('2️⃣ Test table absences_cuisine...');
    const { data: tableTest, error: tableError } = await supabase
      .from('absences_cuisine')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table absences_cuisine non accessible:', tableError);
      console.log('');
      console.log('📋 SOLUTION : Exécutez le script SQL suivant dans Supabase SQL Editor :');
      console.log('database/schema-absences-cuisine.sql');
      return;
    }
    
    console.log('✅ Table absences_cuisine accessible');
    
    // Test 3: Récupération des absences cuisine (simple)
    console.log('3️⃣ Test récupération des absences cuisine (mode simple)...');
    const { data: absencesSimple, error: absError1 } = await supabase
      .from('absences_cuisine')
      .select('*')
      .order('date_debut', { ascending: false });
    
    if (absError1) {
      console.error('❌ Erreur absences simples:', absError1);
    } else {
      console.log(`✅ ${absencesSimple.length} absences cuisine récupérées (mode simple)`);
    }
    
    // Test 4: Récupération des absences avec jointure
    console.log('4️⃣ Test récupération des absences (avec jointure)...');
    const { data: absencesJoin, error: absError2 } = await supabase
      .from('absences_cuisine')
      .select(`
        *,
        employee:employees!absences_cuisine_employee_id_fkey(nom, prenom, profil)
      `)
      .order('date_debut', { ascending: false });
    
    if (absError2) {
      console.error('❌ Erreur absences avec jointure:', absError2);
      console.log('ℹ️ L\'application utilisera le mode simple en fallback');
    } else {
      console.log(`✅ ${absencesJoin.length} absences récupérées (avec jointure)`);
    }
    console.log('');
    
    // Test 5: Création d'une absence de test (si des employés existent)
    if (employeesCuisine.length > 0) {
      console.log('5️⃣ Test création d\'absence cuisine...');
      
      const testEmployee = employeesCuisine[0];
      const testAbsence = {
        employee_id: testEmployee.employee_id,
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: new Date().toISOString().split('T')[0],
        type_absence: 'Absent',
        statut: 'Confirmée',
        motif: 'Test automatique API cuisine'
      };
      
      const { data: newAbsence, error: createError } = await supabase
        .from('absences_cuisine')
        .insert([testAbsence])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erreur création absence:', createError);
      } else {
        console.log(`✅ Absence créée pour ${testEmployee.employee.nom}`);
        
        // Test 6: Suppression de l'absence de test
        console.log('6️⃣ Test suppression d\'absence...');
        const { error: deleteError } = await supabase
          .from('absences_cuisine')
          .delete()
          .eq('id', newAbsence.id);
        
        if (deleteError) {
          console.error('❌ Erreur suppression:', deleteError);
        } else {
          console.log('✅ Absence de test supprimée');
        }
      }
    }
    
    // Test 7: Test des fonctions SQL personnalisées
    console.log('7️⃣ Test fonctions SQL personnalisées...');
    
    if (employeesCuisine.length > 0) {
      const testEmployeeId = employeesCuisine[0].employee_id;
      const testDate = new Date().toISOString().split('T')[0];
      
      // Test fonction de disponibilité
      try {
        const { data: isAvailable, error: availError } = await supabase
          .rpc('est_disponible_cuisine', {
            p_employee_id: testEmployeeId,
            p_date: testDate
          });
        
        if (availError) {
          console.log('❌ Fonction est_disponible_cuisine non disponible:', availError.message);
        } else {
          console.log(`✅ Fonction est_disponible_cuisine: ${isAvailable ? 'Disponible' : 'Non disponible'}`);
        }
      } catch (err) {
        console.log('❌ Fonction est_disponible_cuisine non créée');
      }
      
      // Test fonction employés disponibles
      try {
        const { data: availableEmployees, error: availEmpError } = await supabase
          .rpc('get_employes_cuisine_disponibles', {
            p_date: testDate
          });
        
        if (availEmpError) {
          console.log('❌ Fonction get_employes_cuisine_disponibles non disponible:', availEmpError.message);
        } else {
          console.log(`✅ Fonction get_employes_cuisine_disponibles: ${availableEmployees.length} employés`);
        }
      } catch (err) {
        console.log('❌ Fonction get_employes_cuisine_disponibles non créée');
      }
    }
    
    console.log('');
    console.log('🎯 Résumé du test absences cuisine :');
    console.log('• Les employés cuisine sont accessibles ✅');
    console.log(`• La table absences_cuisine est ${tableError ? '❌' : '✅'} accessible`);
    console.log(`• Les absences sont ${absError1 ? '❌' : '✅'} accessibles`);
    console.log(`• Les jointures sont ${absError2 ? '❌' : '✅'} fonctionnelles`);
    console.log('');
    
    if (!tableError && !absError1) {
      console.log('🎉 L\'API des absences cuisine fonctionne correctement !');
      console.log('📋 Vous pouvez maintenant utiliser l\'onglet Absences dans le module Cuisine');
    } else {
      console.log('⚠️ Problèmes détectés dans l\'API des absences cuisine');
      console.log('💡 Solution : Exécutez le script database/schema-absences-cuisine.sql dans Supabase');
    }
    
  } catch (error) {
    console.error('❌ Erreur critique lors des tests:', error);
  }
}

async function simulateComponentLoadCuisine() {
  console.log('');
  console.log('🎭 Simulation du chargement du composant AbsenceManagementCuisine...');
  
  try {
    // Simuler exactement ce que fait le composant
    const [employeesResult, absencesResult] = await Promise.all([
      supabase.from('employees_cuisine').select(`
        *,
        employee:employees(*)
      `),
      supabase.from('absences_cuisine').select(`
        *,
        employee:employees(nom, prenom, profil)
      `).order('date_debut', { ascending: false })
    ]);
    
    console.log('👥 Employés cuisine:', employeesResult.error ? '❌' : `✅ ${employeesResult.data?.length || 0}`);
    console.log('🚫 Absences cuisine:', absencesResult.error ? '❌' : `✅ ${absencesResult.data?.length || 0}`);
    
    if (employeesResult.error) {
      console.log('   Erreur employés cuisine:', employeesResult.error.message);
    }
    
    if (absencesResult.error) {
      console.log('   Erreur absences cuisine:', absencesResult.error.message);
      
      // Test fallback (sans jointure)
      console.log('🔄 Test fallback sans jointure...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('absences_cuisine')
        .select('*')
        .order('date_debut', { ascending: false });
      
      console.log('🚫 Absences cuisine (fallback):', fallbackError ? '❌' : `✅ ${fallbackData?.length || 0}`);
    }
    
  } catch (err) {
    console.error('💥 Erreur simulation:', err);
  }
}

async function main() {
  await testAbsencesCuisineAPI();
  await simulateComponentLoadCuisine();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAbsencesCuisineAPI, simulateComponentLoadCuisine }; 