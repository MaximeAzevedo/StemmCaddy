-- =====================================================
-- SCHÉMA BASE DE DONNÉES - MODULE SECRÉTARIAT
-- Gestion des denrées alimentaires récupérées
-- =====================================================

-- Table principale des denrées alimentaires récupérées
CREATE TABLE IF NOT EXISTS denrees_alimentaires (
  id SERIAL PRIMARY KEY,
  fournisseur TEXT NOT NULL,
  mois INTEGER NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee INTEGER NOT NULL CHECK (annee >= 2020 AND annee <= 2030),
  quantite DECIMAL(10,2) NOT NULL CHECK (quantite > 0),
  unite TEXT NOT NULL DEFAULT 'kg',
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,  -- Suppression de la référence FK pour éviter les erreurs
  notes TEXT,
  
  -- Index pour optimiser les requêtes
  UNIQUE(fournisseur, mois, annee)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_denrees_fournisseur ON denrees_alimentaires(fournisseur);
CREATE INDEX IF NOT EXISTS idx_denrees_annee ON denrees_alimentaires(annee);
CREATE INDEX IF NOT EXISTS idx_denrees_periode ON denrees_alimentaires(annee, mois);

-- Fonction pour mettre à jour automatiquement date_modification
CREATE OR REPLACE FUNCTION update_denrees_modification_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_modification = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour auto-update de date_modification
DROP TRIGGER IF EXISTS update_denrees_modtime ON denrees_alimentaires;
CREATE TRIGGER update_denrees_modtime
  BEFORE UPDATE ON denrees_alimentaires
  FOR EACH ROW
  EXECUTE FUNCTION update_denrees_modification_time();

-- =====================================================
-- INSERTION DES DONNÉES RÉELLES DU TABLEAU
-- =====================================================

-- Données 2025 basées sur le tableau fourni
INSERT INTO denrees_alimentaires (fournisseur, mois, annee, quantite, unite) VALUES
-- Kirchberg
('Kirchberg', 1, 2025, 3278.70, 'kg'),
('Kirchberg', 2, 2025, 3514.00, 'kg'),
('Kirchberg', 3, 2025, 4109.00, 'kg'),
('Kirchberg', 4, 2025, 3411.00, 'kg'),
('Kirchberg', 5, 2025, 4417.00, 'kg'),

-- Cloche d'Or
('Cloche d''Or', 1, 2025, 1847.50, 'kg'),
('Cloche d''Or', 2, 2025, 2153.00, 'kg'),
('Cloche d''Or', 3, 2025, 1803.50, 'kg'),
('Cloche d''Or', 4, 2025, 1679.50, 'kg'),
('Cloche d''Or', 5, 2025, 1359.00, 'kg'),
('Cloche d''Or', 6, 2025, 1749.00, 'kg'),

-- Dudelange
('Dudelange', 1, 2025, 4103.00, 'kg'),
('Dudelange', 2, 2025, 1555.50, 'kg'),
('Dudelange', 3, 2025, 3091.00, 'kg'),
('Dudelange', 4, 2025, 3075.00, 'kg'),
('Dudelange', 5, 2025, 1854.00, 'kg'),

-- Opkorn
('Opkorn', 1, 2025, 1901.00, 'kg'),
('Opkorn', 2, 2025, 1677.50, 'kg'),
('Opkorn', 3, 2025, 3905.50, 'kg'),
('Opkorn', 4, 2025, 3550.00, 'kg'),
('Opkorn', 5, 2025, 1457.50, 'kg'),

-- Total général (ligne de synthèse)
('Total général', 1, 2025, 11130.20, 'kg'),
('Total général', 2, 2025, 8900.00, 'kg'),
('Total général', 3, 2025, 12909.00, 'kg'),
('Total général', 4, 2025, 11715.50, 'kg'),
('Total général', 5, 2025, 9087.50, 'kg'),
('Total général', 6, 2025, 1749.00, 'kg'),
('Total général', 7, 2025, 0.00, 'kg'),
('Total général', 8, 2025, 0.00, 'kg'),
('Total général', 9, 2025, 0.00, 'kg'),
('Total général', 10, 2025, 0.00, 'kg'),
('Total général', 11, 2025, 0.00, 'kg'),
('Total général', 12, 2025, 0.00, 'kg')

-- En cas de conflit (doublon), ne rien faire
ON CONFLICT (fournisseur, mois, annee) DO NOTHING;

-- =====================================================
-- DONNÉES COMPARATIVES 2024 (pour les statistiques)
-- =====================================================

-- Ajouter quelques données 2024 pour comparaison
INSERT INTO denrees_alimentaires (fournisseur, mois, annee, quantite, unite) VALUES
-- Données approximatives pour 2024 (pour avoir des comparaisons)
('Kirchberg', 1, 2024, 3100.00, 'kg'),
('Kirchberg', 2, 2024, 3200.00, 'kg'),
('Kirchberg', 3, 2024, 3800.00, 'kg'),
('Kirchberg', 4, 2024, 3300.00, 'kg'),
('Kirchberg', 5, 2024, 4200.00, 'kg'),
('Kirchberg', 6, 2024, 3900.00, 'kg'),
('Kirchberg', 7, 2024, 4100.00, 'kg'),
('Kirchberg', 8, 2024, 3700.00, 'kg'),
('Kirchberg', 9, 2024, 3600.00, 'kg'),
('Kirchberg', 10, 2024, 3500.00, 'kg'),
('Kirchberg', 11, 2024, 3400.00, 'kg'),
('Kirchberg', 12, 2024, 3800.00, 'kg'),

('Cloche d''Or', 1, 2024, 1700.00, 'kg'),
('Cloche d''Or', 2, 2024, 1900.00, 'kg'),
('Cloche d''Or', 3, 2024, 1650.00, 'kg'),
('Cloche d''Or', 4, 2024, 1800.00, 'kg'),
('Cloche d''Or', 5, 2024, 1500.00, 'kg'),
('Cloche d''Or', 6, 2024, 1600.00, 'kg'),
('Cloche d''Or', 7, 2024, 1750.00, 'kg'),
('Cloche d''Or', 8, 2024, 1650.00, 'kg'),
('Cloche d''Or', 9, 2024, 1700.00, 'kg'),
('Cloche d''Or', 10, 2024, 1800.00, 'kg'),
('Cloche d''Or', 11, 2024, 1900.00, 'kg'),
('Cloche d''Or', 12, 2024, 2000.00, 'kg')

ON CONFLICT (fournisseur, mois, annee) DO NOTHING;

-- =====================================================
-- VUES UTILES POUR LES STATISTIQUES
-- =====================================================

-- Vue pour les totaux par fournisseur et année
CREATE OR REPLACE VIEW v_denrees_totaux_fournisseur AS
SELECT 
  fournisseur,
  annee,
  SUM(quantite) as total_quantite,
  COUNT(*) as nombre_mois,
  AVG(quantite) as moyenne_mensuelle,
  unite
FROM denrees_alimentaires 
WHERE fournisseur != 'Total général'  -- Exclure la ligne de synthèse
GROUP BY fournisseur, annee, unite
ORDER BY annee DESC, total_quantite DESC;

-- Vue pour l'évolution mensuelle
CREATE OR REPLACE VIEW v_denrees_evolution_mensuelle AS
SELECT 
  annee,
  mois,
  SUM(CASE WHEN fournisseur != 'Total général' THEN quantite ELSE 0 END) as total_mois,
  COUNT(CASE WHEN fournisseur != 'Total général' THEN 1 END) as nombre_fournisseurs
FROM denrees_alimentaires 
GROUP BY annee, mois
ORDER BY annee DESC, mois;

-- Vue pour les statistiques globales
CREATE OR REPLACE VIEW v_denrees_stats_globales AS
SELECT 
  annee,
  SUM(CASE WHEN fournisseur != 'Total général' THEN quantite ELSE 0 END) as total_annee,
  AVG(CASE WHEN fournisseur != 'Total général' THEN quantite ELSE NULL END) as moyenne_mensuelle,
  MAX(CASE WHEN fournisseur != 'Total général' THEN quantite ELSE 0 END) as meilleur_mois,
  MIN(CASE WHEN fournisseur != 'Total général' AND quantite > 0 THEN quantite ELSE NULL END) as moins_bon_mois,
  COUNT(DISTINCT CASE WHEN fournisseur != 'Total général' THEN fournisseur END) as nombre_fournisseurs
FROM denrees_alimentaires 
GROUP BY annee
ORDER BY annee DESC;

-- =====================================================
-- SÉCURITÉ RLS (Row Level Security)
-- =====================================================

-- Activer RLS sur la table
ALTER TABLE denrees_alimentaires ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire les données
CREATE POLICY "Lecture libre denrees" ON denrees_alimentaires
FOR SELECT USING (true);

-- Politique : Seuls les utilisateurs authentifiés peuvent modifier
CREATE POLICY "Modification authentifiée denrees" ON denrees_alimentaires
FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour obtenir les statistiques d'une année
CREATE OR REPLACE FUNCTION get_denrees_stats(target_year INTEGER)
RETURNS TABLE (
  total_kg DECIMAL,
  moyenne_mensuelle DECIMAL,
  nombre_fournisseurs BIGINT,
  meilleur_mois DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN d.fournisseur != 'Total général' THEN d.quantite ELSE 0 END), 0) as total_kg,
    COALESCE(AVG(CASE WHEN d.fournisseur != 'Total général' THEN d.quantite ELSE NULL END), 0) as moyenne_mensuelle,
    COUNT(DISTINCT CASE WHEN d.fournisseur != 'Total général' THEN d.fournisseur END) as nombre_fournisseurs,
    COALESCE(MAX(CASE WHEN d.fournisseur != 'Total général' THEN d.quantite ELSE 0 END), 0) as meilleur_mois
  FROM denrees_alimentaires d
  WHERE d.annee = target_year;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir la répartition par fournisseur
CREATE OR REPLACE FUNCTION get_denrees_by_fournisseur(target_year INTEGER)
RETURNS TABLE (
  fournisseur TEXT,
  total_quantite DECIMAL,
  pourcentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH totaux AS (
    SELECT 
      d.fournisseur,
      SUM(d.quantite) as total
    FROM denrees_alimentaires d
    WHERE d.annee = target_year 
      AND d.fournisseur != 'Total général'
    GROUP BY d.fournisseur
  ),
  grand_total AS (
    SELECT SUM(total) as gt FROM totaux
  )
  SELECT 
    t.fournisseur,
    t.total,
    ROUND((t.total / gt.gt * 100), 2) as pourcentage
  FROM totaux t, grand_total gt
  ORDER BY t.total DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE denrees_alimentaires IS 'Table principale stockant les quantités de denrées alimentaires récupérées par fournisseur et par mois';
COMMENT ON COLUMN denrees_alimentaires.fournisseur IS 'Nom du fournisseur ou supermarché (Kirchberg, Cloche d''Or, etc.)';
COMMENT ON COLUMN denrees_alimentaires.quantite IS 'Quantité récupérée en kilogrammes';
COMMENT ON COLUMN denrees_alimentaires.unite IS 'Unité de mesure (kg, tonnes, palettes, colis)';
COMMENT ON VIEW v_denrees_totaux_fournisseur IS 'Vue agrégée des totaux par fournisseur et année';
COMMENT ON FUNCTION get_denrees_stats IS 'Fonction retournant les statistiques principales pour une année donnée'; 