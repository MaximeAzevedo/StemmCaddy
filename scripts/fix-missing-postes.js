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

const postesManquants = [
  {
    nom: 'Légumerie',
    description: 'Préparation des légumes et salades',
    couleur: '#22c55e',
    icone: '🥬',
    ordre_affichage: 6,
    actif: true
  },
  {
    nom: 'Self Midi',
    description: 'Service du self midi (11h-11h45 et 11h45-12h45)',
    couleur: '#f59e0b',
    icone: '🥙',
    ordre_affichage: 7,
    actif: true
  },
  {
    nom: 'Equipe Pina et Saskia',
    description: 'Équipe spécialisée Pina et Saskia (11h-12h45)',
    couleur: '#10b981',
    icone: '👥',
    ordre_affichage: 8,
    actif: true
  }
];

async function ajouterPostesManquants() {
  try {
    console.log('🔧 Correction des postes cuisine manquants...\n');
    
    // Vérifier les postes existants
    const { data: existingPostes, error: fetchError } = await supabase
      .from('postes_cuisine')
      .select('nom');
    
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des postes:', fetchError);
      return;
    }
    
    const existingNames = existingPostes?.map(p => p.nom) || [];
    console.log('📋 Postes existants:', existingNames);
    
    // Filtrer les postes à ajouter
    const postesToAdd = postesManquants.filter(p => !existingNames.includes(p.nom));
    
    if (postesToAdd.length === 0) {
      console.log('✅ Tous les postes existent déjà !');
      return;
    }
    
    // Ajouter les postes manquants
    console.log(`\n🚀 Ajout de ${postesToAdd.length} postes manquants...`);
    
    const { data, error } = await supabase
      .from('postes_cuisine')
      .insert(postesToAdd)
      .select();
    
    if (error) {
      console.error('❌ Erreur lors de l\'ajout des postes:', error);
      return;
    }
    
    console.log('✅ Postes ajoutés avec succès:');
    postesToAdd.forEach(p => {
      console.log(`   • ${p.nom} (${p.icone}) - ${p.couleur}`);
    });
    
    // Vérification finale
    const { data: finalPostes } = await supabase
      .from('postes_cuisine')
      .select('nom, couleur, icone')
      .eq('actif', true)
      .order('ordre_affichage');
    
    console.log('\n🎯 Liste finale des postes cuisine:');
    finalPostes?.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.nom} (${p.icone}) - ${p.couleur}`);
    });
    
    console.log('\n🎉 Correction terminée ! Rafraîchissez votre application.');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

ajouterPostesManquants(); 