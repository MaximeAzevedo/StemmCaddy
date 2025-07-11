-- =====================================================
-- SCHÉMA SIMPLIFIÉ - MODULE SECRÉTARIAT  
-- À exécuter directement dans l'éditeur SQL Supabase
-- =====================================================

-- 1. Créer la table principale
CREATE TABLE IF NOT EXISTS denrees_alimentaires (
  id SERIAL PRIMARY KEY,
  fournisseur TEXT NOT NULL,
  mois INTEGER NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee INTEGER NOT NULL CHECK (annee >= 2020 AND annee <= 2030),
  quantite DECIMAL(10,2) NOT NULL CHECK (quantite > 0),
  unite TEXT NOT NULL DEFAULT 'kg',
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  notes TEXT,
  UNIQUE(fournisseur, mois, annee)
);

-- 2. Créer les index
CREATE INDEX IF NOT EXISTS idx_denrees_fournisseur ON denrees_alimentaires(fournisseur);
CREATE INDEX IF NOT EXISTS idx_denrees_annee ON denrees_alimentaires(annee);
CREATE INDEX IF NOT EXISTS idx_denrees_periode ON denrees_alimentaires(annee, mois);

-- 3. Insérer les données 2025 (Kirchberg)
INSERT INTO denrees_alimentaires (fournisseur, mois, annee, quantite, unite) VALUES
('Kirchberg', 1, 2025, 3278.70, 'kg'),
('Kirchberg', 2, 2025, 3514.00, 'kg'),
('Kirchberg', 3, 2025, 4109.00, 'kg'),
('Kirchberg', 4, 2025, 3411.00, 'kg'),
('Kirchberg', 5, 2025, 4417.00, 'kg')
ON CONFLICT (fournisseur, mois, annee) DO NOTHING;

-- 4. Insérer les données 2025 (Cloche d'Or)
INSERT INTO denrees_alimentaires (fournisseur, mois, annee, quantite, unite) VALUES
('Cloche d''Or', 1, 2025, 1847.50, 'kg'),
('Cloche d''Or', 2, 2025, 2153.00, 'kg'),
('Cloche d''Or', 3, 2025, 1803.50, 'kg'),
('Cloche d''Or', 4, 2025, 1679.50, 'kg'),
('Cloche d''Or', 5, 2025, 1359.00, 'kg'),
('Cloche d''Or', 6, 2025, 1749.00, 'kg')
ON CONFLICT (fournisseur, mois, annee) DO NOTHING;

-- 5. Insérer les données 2025 (Dudelange)
INSERT INTO denrees_alimentaires (fournisseur, mois, annee, quantite, unite) VALUES
('Dudelange', 1, 2025, 4103.00, 'kg'),
('Dudelange', 2, 2025, 1555.50, 'kg'),
('Dudelange', 3, 2025, 3091.00, 'kg'),
('Dudelange', 4, 2025, 3075.00, 'kg'),
('Dudelange', 5, 2025, 1854.00, 'kg')
ON CONFLICT (fournisseur, mois, annee) DO NOTHING;

-- 6. Insérer les données 2025 (Opkorn)
INSERT INTO denrees_alimentaires (fournisseur, mois, annee, quantite, unite) VALUES
('Opkorn', 1, 2025, 1901.00, 'kg'),
('Opkorn', 2, 2025, 1677.50, 'kg'),
('Opkorn', 3, 2025, 3905.50, 'kg'),
('Opkorn', 4, 2025, 3550.00, 'kg'),
('Opkorn', 5, 2025, 1457.50, 'kg')
ON CONFLICT (fournisseur, mois, annee) DO NOTHING;

-- 7. Activer RLS
ALTER TABLE denrees_alimentaires ENABLE ROW LEVEL SECURITY;

-- 8. Créer les politiques de sécurité
CREATE POLICY "Lecture libre denrees" ON denrees_alimentaires
FOR SELECT USING (true);

CREATE POLICY "Modification authentifiée denrees" ON denrees_alimentaires
FOR ALL USING (auth.role() = 'authenticated');

-- 9. Fonction de statistiques
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

-- 10. Fonction de répartition par fournisseur
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
-- VÉRIFICATION : Compter les entrées créées
-- =====================================================
SELECT 
  'Données insérées' as statut,
  COUNT(*) as nombre_entrees,
  COUNT(DISTINCT fournisseur) as nombre_fournisseurs,
  MIN(annee) as annee_min,
  MAX(annee) as annee_max
FROM denrees_alimentaires; 