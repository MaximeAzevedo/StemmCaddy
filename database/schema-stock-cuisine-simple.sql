-- =====================================================
-- SCHÉMA SIMPLE - GESTION STOCKS CUISINE
-- À copier-coller dans l'éditeur SQL Supabase
-- =====================================================

-- 1. Créer la table stock_cuisine
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

-- 2. Créer la table sites_livraison
CREATE TABLE IF NOT EXISTS sites_livraison (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  adresse TEXT,
  actif BOOLEAN DEFAULT true,
  ordre_affichage INTEGER DEFAULT 0
);

-- 3. Créer la table planning_envois
CREATE TABLE IF NOT EXISTS planning_envois (
  id SERIAL PRIMARY KEY,
  aliment_id INTEGER REFERENCES stock_cuisine(id) ON DELETE CASCADE,
  site_id INTEGER REFERENCES sites_livraison(id) ON DELETE CASCADE,
  quantite DECIMAL(10,2) NOT NULL CHECK (quantite > 0),
  date_envoi DATE NOT NULL,
  zone_origine TEXT NOT NULL,
  statut TEXT DEFAULT 'planifie',
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 4. Créer la table mouvements_stock
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id SERIAL PRIMARY KEY,
  aliment_id INTEGER REFERENCES stock_cuisine(id) ON DELETE CASCADE,
  type_mouvement TEXT NOT NULL,
  quantite_avant DECIMAL(10,2),
  quantite_mouvement DECIMAL(10,2) NOT NULL,
  quantite_apres DECIMAL(10,2),
  date_mouvement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reference_envoi INTEGER REFERENCES planning_envois(id),
  notes TEXT
);

-- =====================================================
-- INSERTION DES DONNÉES DE BASE
-- =====================================================

-- Insérer les 5 sites de livraison
INSERT INTO sites_livraison (nom, ordre_affichage) VALUES
('Hollerich', 1),
('Esch', 2),
('Ettelbruck', 3),
('Schoenfels', 4),
('Caddy', 5)
ON CONFLICT (nom) DO NOTHING;

-- Insérer les aliments selon votre tableau
INSERT INTO stock_cuisine (nom, stock_actuel, unite, zone_stockage, categorie) VALUES

-- === VIANDES CONGÉLATEUR (🔵) ===
('Bœuf 1ère', 72, 'kg', 'congelateur', 'Viande'),
('Bœuf 3ème', 0, 'kg', 'congelateur', 'Viande'),
('Poulet Entier', 0, 'kg', 'congelateur', 'Viande'),
('Poulet Avec os', 54, 'kg', 'congelateur', 'Viande'),
('Escalope Filet', 46, 'kg', 'congelateur', 'Viande'),
('Émincé', 47, 'kg', 'congelateur', 'Viande'),
('Saucisse (90g)', 12, 'kg', 'congelateur', 'Viande'),

-- === BURGERS ===
('Burger Bœuf', 0, 'kg', 'congelateur', 'Viande'),
('Burger Poulet', 0, 'kg', 'congelateur', 'Viande'),
('Burger Porc', 0, 'kg', 'congelateur', 'Viande'),

-- === HACHÉ CAISSES ===
('Haché Bœuf', 0, 'caisse', 'congelateur', 'Viande'),
('Haché Poulet', 0, 'caisse', 'congelateur', 'Viande'),
('Haché Porc', 0, 'caisse', 'congelateur', 'Viande'),

-- === AUTRES VIANDES ===
('Agneau', 34, 'kg', 'congelateur', 'Viande'),
('Canard', 1, 'caisse', 'congelateur', 'Viande'),
('Lapin', 2, 'caisse', 'congelateur', 'Viande'),
('Haché mixte', 0, 'pcs', 'congelateur', 'Viande'),
('Pané', 38, 'caisse', 'congelateur', 'Viande'),
('Plats cuisinés (caisses)', 0, 'caisse', 'congelateur', 'Plat'),
('Porc', 200, 'caisse', 'congelateur', 'Viande'),
('Veau', 21, 'kg', 'congelateur', 'Viande'),
('Mixte porc et pit', 0, 'kg', 'congelateur', 'Viande'),
('BF', 0, 'kg', 'congelateur', 'Viande'),
('Volaille', 196, 'kg', 'congelateur', 'Viande'),

-- === SAUCES ET PRODUITS FRIGO (🔴) ===
('Sauce bolognaise BF', 65, 'kg', 'frigo', 'Sauce'),
('Quiche végé', 9, 'kg', 'frigo', 'Plat'),

-- === PRODUITS TEMPÉRATURE AMBIANTE (⚫) ===
('Sauce tomate', 116, 'caisse', 'ambiant', 'Sauce'),
('Courgettes cuites', 66, 'pièce', 'ambiant', 'Légume')

ON CONFLICT (nom) DO NOTHING;

-- =====================================================
-- CRÉER UNE VUE SIMPLIFIÉE POUR LE PLANNING
-- =====================================================

CREATE OR REPLACE VIEW v_planning_complet AS
SELECT 
  pe.id,
  pe.date_envoi,
  sc.nom as aliment_nom,
  pe.quantite,
  sc.unite,
  sc.zone_stockage,
  sl.nom as site_nom,
  pe.statut,
  pe.notes,
  CASE 
    WHEN sc.zone_stockage = 'congelateur' THEN '#3B82F6'
    WHEN sc.zone_stockage = 'frigo' THEN '#EF4444'
    ELSE '#1F2937'
  END as couleur_affichage,
  CASE 
    WHEN sc.zone_stockage = 'congelateur' THEN '🔵'
    WHEN sc.zone_stockage = 'frigo' THEN '🔴'
    ELSE '⚫'
  END as emoji_zone
FROM planning_envois pe
JOIN stock_cuisine sc ON pe.aliment_id = sc.id
JOIN sites_livraison sl ON pe.site_id = sl.id
WHERE sc.actif = true AND sl.actif = true
ORDER BY pe.date_envoi, sl.ordre_affichage, sc.nom;

-- =====================================================
-- ACTIVER RLS (Row Level Security) BASIQUE
-- =====================================================

ALTER TABLE stock_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites_livraison ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_envois ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;

-- Politique simple : tout le monde peut tout faire (à ajuster selon vos besoins)
CREATE POLICY "Permettre tout pour stock_cuisine" ON stock_cuisine FOR ALL USING (true);
CREATE POLICY "Permettre tout pour sites_livraison" ON sites_livraison FOR ALL USING (true);
CREATE POLICY "Permettre tout pour planning_envois" ON planning_envois FOR ALL USING (true);
CREATE POLICY "Permettre tout pour mouvements_stock" ON mouvements_stock FOR ALL USING (true); 