-- =====================================================
-- MIGRATION : ALIGNER LA DB SUR L'EXCEL MÉTIER
-- =====================================================
-- Date: Janvier 2025
-- Objectif: Adapter employes_cuisine_new selon l'Excel réel

-- 1. SUPPRIMER LA COLONNE cuisine_froide (pas dans l'Excel)
ALTER TABLE employes_cuisine_new DROP COLUMN IF EXISTS cuisine_froide;

-- 2. RENOMMER LES COLONNES POUR MATCHER L'EXCEL
ALTER TABLE employes_cuisine_new RENAME COLUMN equipe_pina_saskia TO pina_et_saskia;
ALTER TABLE employes_cuisine_new RENAME COLUMN jus_de_fruits TO jus_de_fruit;
ALTER TABLE employes_cuisine_new RENAME COLUMN self_midi TO self;

-- 3. SIMPLIFIER LES HORAIRES (une seule colonne comme dans l'Excel)
-- Supprimer les colonnes horaires détaillées
ALTER TABLE employes_cuisine_new 
  DROP COLUMN IF EXISTS lundi_debut,
  DROP COLUMN IF EXISTS lundi_fin,
  DROP COLUMN IF EXISTS mardi_debut,
  DROP COLUMN IF EXISTS mardi_fin,
  DROP COLUMN IF EXISTS mercredi_debut,
  DROP COLUMN IF EXISTS mercredi_fin,
  DROP COLUMN IF EXISTS jeudi_debut,
  DROP COLUMN IF EXISTS jeudi_fin,
  DROP COLUMN IF EXISTS vendredi_debut,
  DROP COLUMN IF EXISTS vendredi_fin;

-- Ajouter une colonne horaires simple
ALTER TABLE employes_cuisine_new ADD COLUMN IF NOT EXISTS horaires VARCHAR(50);

-- 4. AJOUTER UNE COLONNE PROFIL (visible dans l'Excel)
ALTER TABLE employes_cuisine_new ADD COLUMN IF NOT EXISTS profil VARCHAR(20) DEFAULT 'Moyen';

-- 5. VÉRIFIER LA STRUCTURE FINALE
-- Structure attendue après migration :
/*
employes_cuisine_new:
  - id
  - prenom (Nom principal)
  - profil (Faible/Moyen/Fort)
  - langue_parlee
  - cuisine_chaude (boolean)
  - chef_sandwichs (boolean)  
  - sandwichs (boolean)
  - vaisselle (boolean)
  - pina_et_saskia (boolean) -- RENOMMÉ
  - legumerie (boolean)
  - jus_de_fruit (boolean) -- RENOMMÉ
  - pain (boolean)
  - self (boolean) -- RENOMMÉ
  - horaires (string simple) -- SIMPLIFIÉ
  - photo_url
  - actif
  - notes
  - created_at
  - updated_at
*/

-- 6. MISE À JOUR DES DONNÉES EXISTANTES
-- Convertir les anciens horaires en format simple si des données existent
UPDATE employes_cuisine_new 
SET horaires = CASE 
  WHEN lundi_debut IS NOT NULL THEN lundi_debut::text || '-' || lundi_fin::text
  ELSE '8-16'
END
WHERE horaires IS NULL OR horaires = '';

-- 7. AFFICHER LA STRUCTURE FINALE
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'employes_cuisine_new' 
ORDER BY ordinal_position; 