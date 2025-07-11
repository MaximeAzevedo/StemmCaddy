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

async function cleanPlanningDuplicates() {
  try {
    console.log('🧹 Nettoyage des doublons du planning...\n');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Récupérer tout le planning d'aujourd'hui
    const { data: planning, error } = await supabase
      .from('planning_cuisine')
      .select('*')
      .eq('date', today)
      .order('created_at');
    
    if (error) {
      console.error('❌ Erreur récupération planning:', error);
      return;
    }
    
    console.log(`📊 Planning trouvé: ${planning.length} entrées`);
    
    // Grouper par employé + poste + créneau pour trouver les doublons
    const groups = {};
    const duplicates = [];
    
    planning.forEach(entry => {
      const key = `${entry.employee_id}-${entry.poste_id}-${entry.creneau}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });
    
    // Identifier les doublons (garder le plus ancien)
    Object.values(groups).forEach(group => {
      if (group.length > 1) {
        // Garder le premier (plus ancien), marquer les autres comme doublons
        for (let i = 1; i < group.length; i++) {
          duplicates.push(group[i]);
        }
      }
    });
    
    console.log(`🔍 Doublons trouvés: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n📋 Détail des doublons à supprimer:');
      duplicates.forEach((dup, index) => {
        console.log(`   ${index + 1}. ID: ${dup.id}, Employé: ${dup.employee_id}, Poste: ${dup.poste_id}, Créneau: ${dup.creneau}`);
      });
      
      // Demander confirmation avant suppression
      console.log(`\n⚠️ Voulez-vous supprimer ces ${duplicates.length} doublons ?`);
      console.log('Remplacez "false" par "true" dans le script si vous voulez procéder à la suppression.\n');
      
      const confirmDelete = true; // Mettre à true pour supprimer
      
      if (confirmDelete) {
        console.log('🗑️ Suppression des doublons...');
        
        const idsToDelete = duplicates.map(d => d.id);
        const { error: deleteError } = await supabase
          .from('planning_cuisine')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error('❌ Erreur suppression:', deleteError);
        } else {
          console.log(`✅ ${duplicates.length} doublons supprimés avec succès !`);
          
          // Vérification finale
          const { data: finalPlanning } = await supabase
            .from('planning_cuisine')
            .select('*')
            .eq('date', today);
          
          console.log(`📊 Planning final: ${finalPlanning?.length || 0} entrées`);
        }
      } else {
        console.log('ℹ️ Suppression annulée. Modifiez le script pour procéder à la suppression.');
      }
    } else {
      console.log('✅ Aucun doublon trouvé !');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

cleanPlanningDuplicates(); 