#!/usr/bin/env node

/**
 * Script simplifié pour créer les tables stocks cuisine
 * Utilise les requêtes Supabase directes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Configuration
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStockTables() {
  console.log('🍽️ Création des tables stocks cuisine...\n');

  try {
    // 1. Créer la table stock_cuisine
    console.log('📦 Création table stock_cuisine...');
    await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS stock_cuisine (
          id SERIAL PRIMARY KEY,
          nom TEXT NOT NULL,
          stock_actuel DECIMAL(10,2) DEFAULT 0,
          unite TEXT DEFAULT 'kg',
          zone_stockage TEXT DEFAULT 'congelateur',
          categorie TEXT DEFAULT 'Viande',
          date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          date_maj TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          actif BOOLEAN DEFAULT true
        );
      `
    });

    // 2. Créer la table sites_livraison
    console.log('🚚 Création table sites_livraison...');
    await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS sites_livraison (
          id SERIAL PRIMARY KEY,
          nom TEXT NOT NULL UNIQUE,
          adresse TEXT,
          actif BOOLEAN DEFAULT true,
          ordre_affichage INTEGER DEFAULT 0
        );
      `
    });

    // 3. Insérer les données de base
    console.log('📊 Insertion des données de base...');
    
    // Sites
    const { error: sitesError } = await supabase
      .from('sites_livraison')
      .upsert([
        { nom: 'Hollerich', ordre_affichage: 1 },
        { nom: 'Esch', ordre_affichage: 2 },
        { nom: 'Ettelbruck', ordre_affichage: 3 },
        { nom: 'Schoenfels', ordre_affichage: 4 },
        { nom: 'Caddy', ordre_affichage: 5 }
      ], { onConflict: 'nom' });

    if (sitesError) {
      console.log('⚠️ Erreur insertion sites:', sitesError.message);
    } else {
      console.log('✅ Sites de livraison créés');
    }

    // Aliments selon votre tableau
    const { error: alimentsError } = await supabase
      .from('stock_cuisine')
      .upsert([
        // Viandes congélateur (bleu)
        { nom: 'Bœuf 1ère', stock_actuel: 72, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Bœuf 3ème', stock_actuel: 0, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Poulet Entier', stock_actuel: 0, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Poulet Avec os', stock_actuel: 54, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Escalope Filet', stock_actuel: 46, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Émincé', stock_actuel: 47, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Saucisse (90g)', stock_actuel: 12, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Agneau', stock_actuel: 34, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Canard', stock_actuel: 1, unite: 'caisse', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Lapin', stock_actuel: 2, unite: 'caisse', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Haché mixte', stock_actuel: 0, unite: 'pcs', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Pané', stock_actuel: 38, unite: 'caisse', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Porc', stock_actuel: 200, unite: 'caisse', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Veau', stock_actuel: 21, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Mixte porc et pit', stock_actuel: 0, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'BF', stock_actuel: 0, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        { nom: 'Volaille', stock_actuel: 196, unite: 'kg', zone_stockage: 'congelateur', categorie: 'Viande' },
        
        // Sauces et liquides (frigo/ambiant)
        { nom: 'Sauce bolognaise BF', stock_actuel: 65, unite: 'kg', zone_stockage: 'frigo', categorie: 'Sauce' },
        { nom: 'Quiche végé', stock_actuel: 9, unite: 'kg', zone_stockage: 'frigo', categorie: 'Plat' },
        { nom: 'Sauce tomate', stock_actuel: 116, unite: 'caisse', zone_stockage: 'ambiant', categorie: 'Sauce' },
        { nom: 'Courgettes cuites', stock_actuel: 66, unite: 'pièce', zone_stockage: 'frigo', categorie: 'Légume' }
      ], { onConflict: 'nom' });

    if (alimentsError) {
      console.log('⚠️ Erreur insertion aliments:', alimentsError.message);
    } else {
      console.log('✅ Aliments de base créés');
    }

    // 4. Créer la table planning_envois (version simplifiée)
    console.log('📅 Création table planning_envois...');
    await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS planning_envois (
          id SERIAL PRIMARY KEY,
          aliment_id INTEGER,
          site_id INTEGER,
          quantite DECIMAL(10,2) NOT NULL,
          date_envoi DATE NOT NULL,
          zone_origine TEXT NOT NULL,
          statut TEXT DEFAULT 'planifie',
          date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          notes TEXT
        );
      `
    });

    // 5. Créer la table mouvements_stock
    console.log('📝 Création table mouvements_stock...');
    await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS mouvements_stock (
          id SERIAL PRIMARY KEY,
          aliment_id INTEGER,
          type_mouvement TEXT NOT NULL,
          quantite_avant DECIMAL(10,2),
          quantite_mouvement DECIMAL(10,2) NOT NULL,
          quantite_apres DECIMAL(10,2),
          date_mouvement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          reference_envoi INTEGER,
          notes TEXT
        );
      `
    });

    // 6. Test final
    console.log('\n🧪 Test des tables...');
    
    const { data: sites } = await supabase.from('sites_livraison').select('*');
    const { data: aliments } = await supabase.from('stock_cuisine').select('*');
    
    console.log(`✅ ${sites?.length || 0} sites disponibles`);
    console.log(`✅ ${aliments?.length || 0} aliments en stock`);
    
    console.log('\n🎉 Tables créées avec succès !');
    console.log('➡️ Rafraîchissez votre navigateur pour voir les données');

  } catch (error) {
    console.error('💥 Erreur:', error);
  }
}

createStockTables(); 