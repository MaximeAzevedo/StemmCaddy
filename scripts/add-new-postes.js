import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🍽️ Ajout des nouveaux postes/services cuisine...\n');

const nouveauxPostes = [
  {
    nom: 'Self Midi',
    description: 'Service du self midi (11h-11h45 et 11h45-12h45)',
    couleur: '#f59e0b',
    icone: '🥙',
    actif: true,
    ordre_affichage: 6
  },
  {
    nom: 'Equipe Pina et Saskia',
    description: 'Équipe spécialisée Pina et Saskia (11h-12h45)',
    couleur: '#10b981',
    icone: '👥',
    actif: true,
    ordre_affichage: 7
  }
];

async function ajouterPostes() {
  try {
    console.log('📋 Ajout des nouveaux postes en base...');
    
    // Vérifier si les postes existent déjà
    const { data: existing } = await supabase
      .from('postes_cuisine')
      .select('nom')
      .in('nom', nouveauxPostes.map(p => p.nom));
    
    const existingNames = existing?.map(p => p.nom) || [];
    const postesToAdd = nouveauxPostes.filter(p => !existingNames.includes(p.nom));
    
    if (postesToAdd.length === 0) {
      console.log('ℹ️ Tous les postes existent déjà en base.');
      return;
    }
    
    // Insérer les nouveaux postes
    const { data, error } = await supabase
      .from('postes_cuisine')
      .insert(postesToAdd)
      .select();
    
    if (error) {
      console.error('❌ Erreur lors de l\'ajout des postes:', error);
      return;
    }
    
    console.log(`✅ ${postesToAdd.length} nouveaux postes ajoutés:`);
    postesToAdd.forEach(p => {
      console.log(`   • ${p.nom} (${p.icone}) - ${p.description}`);
    });
    
    // Afficher tous les postes disponibles
    const { data: allPostes } = await supabase
      .from('postes_cuisine')
      .select('*')
      .eq('actif', true)
      .order('ordre_affichage');
    
    console.log('\n📋 Postes cuisine disponibles:');
    allPostes?.forEach(p => {
      console.log(`   ${p.ordre_affichage}. ${p.nom} (${p.icone}) - ${p.couleur}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

ajouterPostes().then(() => {
  console.log('\n🎉 Configuration des postes terminée !');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}); 