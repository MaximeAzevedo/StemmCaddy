import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPlanningToday() {
  try {
    console.log('🔍 Test du planning d\'aujourd\'hui...\n');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Date testée: ${today}\n`);
    
    // Récupérer le planning d'aujourd'hui avec détails
    const { data: planning, error } = await supabase
      .from('planning_cuisine')
      .select(`
        *,
        employee:employees(nom, prenom),
        poste:postes_cuisine(nom, couleur, icone)
      `)
      .eq('date', today)
      .order('poste_id')
      .order('creneau');
    
    if (error) {
      console.error('❌ Erreur récupération planning:', error);
      return;
    }
    
    console.log(`✅ Planning trouvé: ${planning?.length || 0} entrées\n`);
    
    if (planning && planning.length > 0) {
      console.log('📋 Détail du planning:');
      planning.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.employee?.prenom} ${entry.employee?.nom}`);
        console.log(`      Poste: ${entry.poste?.nom} (${entry.poste?.icone})`);
        console.log(`      Créneau: ${entry.creneau}`);
        console.log(`      Date: ${entry.date}`);
        console.log(`      ID: ${entry.id}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Aucun planning trouvé pour aujourd\'hui');
      
      // Vérifier s'il y a des plannings pour d'autres dates
      const { data: allPlanning } = await supabase
        .from('planning_cuisine')
        .select('date, count(*)')
        .neq('date', null);
      
      if (allPlanning && allPlanning.length > 0) {
        console.log('\n📊 Plannings disponibles pour d\'autres dates:');
        const dateGroups = {};
        allPlanning.forEach(p => {
          dateGroups[p.date] = (dateGroups[p.date] || 0) + 1;
        });
        Object.entries(dateGroups).forEach(([date, count]) => {
          console.log(`   ${date}: ${count} entrées`);
        });
      }
    }
    
    // Test d'insertion
    console.log('\n🧪 Test d\'insertion d\'une nouvelle entrée...');
    
    // Récupérer un employé et un poste pour le test
    const { data: employees } = await supabase.from('employees').select('id, nom, prenom').limit(1);
    const { data: postes } = await supabase.from('postes_cuisine').select('id, nom').limit(1);
    
    if (employees && employees.length > 0 && postes && postes.length > 0) {
      const testEntry = {
        date: today,
        employee_id: employees[0].id,
        poste_id: postes[0].id,
        creneau: 'Test',
        role: 'Test',
        priorite: 1
      };
      
      const { data: insertResult, error: insertError } = await supabase
        .from('planning_cuisine')
        .insert([testEntry])
        .select();
      
      if (insertError) {
        console.error('❌ Erreur insertion test:', insertError);
      } else {
        console.log('✅ Insertion test réussie:', insertResult);
        
        // Supprimer l'entrée de test
        await supabase
          .from('planning_cuisine')
          .delete()
          .eq('id', insertResult[0].id);
        console.log('🗑️ Entrée de test supprimée');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testPlanningToday(); 