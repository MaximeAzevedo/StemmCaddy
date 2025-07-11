import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🍽️ Ajout des nouveaux créneaux cuisine...\n');

const nouveauxCreneaux = [
  {
    nom: 'Self midi',
    heure_debut: '11:00:00',
    heure_fin: '12:45:00',
    description: 'Service continu du self : de 11h à 12h45 (comprend les deux créneaux 11h-11h45 et 11h45-12h45)',
    couleur: '#f59e0b',
    actif: true,
    ordre_affichage: 3
  },
  {
    nom: 'Equipe Pina et Saskia',
    heure_debut: '11:00:00',
    heure_fin: '12:45:00',
    description: 'Équipe spécialisée Pina et Saskia',
    couleur: '#10b981',
    actif: true,
    ordre_affichage: 4
  }
];

async function ajouterCreneaux() {
  try {
    console.log('📅 Ajout des créneaux en base...');
    
    // Vérifier si les créneaux existent déjà
    const { data: existing } = await supabase
      .from('creneaux_cuisine')
      .select('nom')
      .in('nom', nouveauxCreneaux.map(c => c.nom));
    
    const existingNames = existing?.map(c => c.nom) || [];
    const creneauxToAdd = nouveauxCreneaux.filter(c => !existingNames.includes(c.nom));
    
    if (creneauxToAdd.length === 0) {
      console.log('ℹ️ Tous les créneaux existent déjà en base.');
      return;
    }
    
    // Insérer les nouveaux créneaux
    const { data, error } = await supabase
      .from('creneaux_cuisine')
      .insert(creneauxToAdd)
      .select();
    
    if (error) {
      console.error('❌ Erreur lors de l\'ajout des créneaux:', error);
      return;
    }
    
    console.log(`✅ ${creneauxToAdd.length} nouveaux créneaux ajoutés:`);
    creneauxToAdd.forEach(c => {
      console.log(`   • ${c.nom} (${c.heure_debut} - ${c.heure_fin})`);
    });
    
    // Afficher tous les créneaux disponibles
    const { data: allCreneaux } = await supabase
      .from('creneaux_cuisine')
      .select('*')
      .eq('actif', true)
      .order('ordre_affichage');
    
    console.log('\n📋 Créneaux cuisine disponibles:');
    allCreneaux?.forEach(c => {
      console.log(`   ${c.ordre_affichage}. ${c.nom} (${c.heure_debut} - ${c.heure_fin})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

ajouterCreneaux().then(() => {
  console.log('\n🎉 Configuration des créneaux terminée !');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}); 