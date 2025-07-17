/**
 * 🏗️ INITIALISATION COMPÉTENCES DEPUIS EXCEL
 * =========================================
 * Met à jour les compétences selon la capture d'écran réelle
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 📊 DONNÉES EXCEL TRANSCRITES (selon capture d'écran)
 */
const COMPETENCES_EXCEL = [
  {
    nom: 'Salah',
    profil: 'Faible',
    langue: 'Arabe',
    competences: { sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Majda', // Correction: pas Maida
    profil: 'Fort',
    langue: 'Yougoslave',
    competences: { cuisine_chaude: true, chef_sandwichs: true, sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Mahmoud',
    profil: 'Moyen',
    langue: 'Arabe',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Mohammad',
    profil: 'Faible',
    langue: 'Arabe',
    competences: { sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Amar',
    profil: 'Moyen',
    langue: 'Arabe',
    competences: { sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Haile',
    profil: 'Moyen',
    langue: 'Tigrinya',
    competences: { sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Aissatou',
    profil: 'Fort',
    langue: 'Guinéen',
    competences: { cuisine_chaude: true, chef_sandwichs: true, sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Halimatou',
    profil: 'Faible',
    langue: 'Guinéen',
    competences: { sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Djiatou', // Correction selon DB
    profil: 'Faible',
    langue: 'Guinéen',
    competences: { sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Abdul',
    profil: 'Faible',
    langue: 'Bengali',
    competences: { vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, self: true }
  },
  {
    nom: 'Fatumata',
    profil: 'Fort',
    langue: 'Guinéen',
    competences: { chef_sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, self: true }
  },
  {
    nom: 'Giovanna',
    profil: 'Faible',
    langue: 'Français',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Carla',
    profil: 'Moyen',
    langue: 'Portugais',
    competences: { sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Liliana',
    profil: 'Moyen',
    langue: 'Français',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Djenabou',
    profil: 'Fort',
    langue: 'Guinéen',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Harissatou',
    profil: 'Moyen',
    langue: 'Guinéen',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Oumou',
    profil: 'Faible',
    langue: 'Guinéen',
    competences: { sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Jurom',
    profil: 'Moyen',
    langue: 'Tigrinya',
    competences: { vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Maria',
    profil: 'Moyen',
    langue: 'Portugais',
    competences: { sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Kifle', // Mofie selon DB
    profil: 'Moyen',
    langue: 'Tigrinya',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Hayle',
    profil: 'Fort',
    langue: 'Tigrinya',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Yeman',
    profil: 'Moyen',
    langue: 'Tigrinya',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Nesrin',
    profil: 'Moyen',
    langue: 'Syrien',
    competences: { sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Charif',
    profil: 'Fort',
    langue: 'Syrien',
    competences: { chef_sandwichs: true, sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Elsa',
    profil: 'Faible',
    langue: 'Portugais',
    competences: { sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Magali',
    profil: 'Moyen',
    langue: 'Français',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Niyat', // Niyet dans l'Excel
    profil: 'Moyen',
    langue: 'Tigrinya',
    competences: { cuisine_chaude: true, sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Yvette',
    profil: 'Moyen',
    langue: 'Français',
    competences: { sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  },
  {
    nom: 'Azmera',
    profil: 'Moyen',
    langue: 'Tigrinya',
    competences: { sandwichs: true, vaisselle: true, pina_et_saskia: true, legumerie: true, jus_de_fruit: true, pain: true, self: true }
  }
];

/**
 * 🚀 MISE À JOUR DES COMPÉTENCES
 */
async function updateCompetencesFromExcel() {
  console.log('🏗️ === INITIALISATION COMPÉTENCES DEPUIS EXCEL ===\n');

  let successCount = 0;
  let errorCount = 0;
  
  for (const excelEmp of COMPETENCES_EXCEL) {
    try {
      console.log(`🔄 Traitement ${excelEmp.nom}...`);

      // Mettre à jour les compétences selon l'Excel
      const { data, error } = await supabase
        .from('employes_cuisine_new')
        .update({
          // Compétences selon Excel (noms EXACTS des colonnes DB)
          cuisine_chaude: excelEmp.competences.cuisine_chaude || false,
          chef_sandwichs: excelEmp.competences.chef_sandwichs || false,
          sandwichs: excelEmp.competences.sandwichs || false,
          vaisselle: excelEmp.competences.vaisselle || false,
          legumerie: excelEmp.competences.legumerie || false,
          equipe_pina_saskia: excelEmp.competences.pina_et_saskia || false, // ✅ CORRIGÉ
          jus_de_fruits: excelEmp.competences.jus_de_fruit || false, // ✅ CORRIGÉ
          pain: excelEmp.competences.pain || false,
          self_midi: excelEmp.competences.self || false // ✅ CORRIGÉ
        })
        .ilike('prenom', `%${excelEmp.nom}%`)
        .select();

      if (error) {
        console.error(`  ❌ Erreur ${excelEmp.nom}:`, error.message);
        errorCount++;
      } else if (data && data.length > 0) {
        console.log(`  ✅ ${excelEmp.nom} mis à jour`);
        successCount++;
      } else {
        console.warn(`  ⚠️ ${excelEmp.nom} non trouvé en DB`);
        errorCount++;
      }

    } catch (error) {
      console.error(`  💥 Erreur fatale ${excelEmp.nom}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 === RÉSULTATS ===`);
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📋 Total traité: ${COMPETENCES_EXCEL.length}`);
  
  // Afficher un échantillon des mises à jour
  console.log(`\n🔍 === VÉRIFICATION ÉCHANTILLON ===`);
  const { data: verification } = await supabase
    .from('employes_cuisine_new')
    .select('prenom, profil, cuisine_chaude, chef_sandwichs, sandwichs, vaisselle')
    .limit(5);

  if (verification) {
    verification.forEach(emp => {
      console.log(`${emp.prenom} (${emp.profil}): Cuisine=${emp.cuisine_chaude ? '✓' : '✗'}, Chef=${emp.chef_sandwichs ? '✓' : '✗'}, Sandwichs=${emp.sandwichs ? '✓' : '✗'}`);
    });
  }
}

/**
 * 🚀 LANCEMENT
 */
updateCompetencesFromExcel().then(() => {
  console.log('\n✅ Initialisation terminée !');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}); 