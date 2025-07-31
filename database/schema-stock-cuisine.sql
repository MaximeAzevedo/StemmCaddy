-- =====================================================
-- SCHÉMA GESTION STOCKS CUISINE
-- Module isolé pour gestion inventaire + distribution
-- =====================================================

-- 1. Table des articles/aliments avec stock actuel
CREATE TABLE IF NOT EXISTS stock_cuisine (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  stock_actuel DECIMAL(10,2) DEFAULT 0,
  unite TEXT DEFAULT 'kg',
  zone_stockage TEXT DEFAULT 'congelateur', -- congelateur/frigo/ambiant
  categorie TEXT DEFAULT 'Viande', -- Viande, Légume, Sauce, Autre
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_maj TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actif BOOLEAN DEFAULT true
);

-- 2. Table des sites de livraison
CREATE TABLE IF NOT EXISTS sites_livraison (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  adresse TEXT,
  actif BOOLEAN DEFAULT true,
  ordre_affichage INTEGER DEFAULT 0
);

-- 3. Table du planning des envois
CREATE TABLE IF NOT EXISTS planning_envois (
  id SERIAL PRIMARY KEY,
  aliment_id INTEGER REFERENCES stock_cuisine(id) ON DELETE CASCADE,
  site_id INTEGER REFERENCES sites_livraison(id) ON DELETE CASCADE,
  quantite DECIMAL(10,2) NOT NULL CHECK (quantite > 0),
  date_envoi DATE NOT NULL,
  zone_origine TEXT NOT NULL, -- Pour conserver couleur
  statut TEXT DEFAULT 'planifie', -- planifie, valide, livre
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_validation TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- 4. Table historique des mouvements de stock
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id SERIAL PRIMARY KEY,
  aliment_id INTEGER REFERENCES stock_cuisine(id) ON DELETE CASCADE,
  type_mouvement TEXT NOT NULL, -- inventaire, envoi, ajustement, reception
  quantite_avant DECIMAL(10,2),
  quantite_mouvement DECIMAL(10,2) NOT NULL,
  quantite_apres DECIMAL(10,2),
  date_mouvement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reference_envoi INTEGER REFERENCES planning_envois(id),
  notes TEXT
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_stock_cuisine_actif ON stock_cuisine(actif);
CREATE INDEX IF NOT EXISTS idx_stock_cuisine_zone ON stock_cuisine(zone_stockage);
CREATE INDEX IF NOT EXISTS idx_planning_envois_date ON planning_envois(date_envoi);
CREATE INDEX IF NOT EXISTS idx_planning_envois_statut ON planning_envois(statut);
CREATE INDEX IF NOT EXISTS idx_mouvements_stock_date ON mouvements_stock(date_mouvement);

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Sites par défaut (5 sites habituels)
INSERT INTO sites_livraison (nom, ordre_affichage) VALUES
('Hollerich', 1),
('Esch', 2), 
('Ettelbruck', 3),
('Schoenfels', 4),
('Caddy', 5)
ON CONFLICT (nom) DO NOTHING;

-- Articles de base selon votre tableau
INSERT INTO stock_cuisine (nom, stock_actuel, unite, zone_stockage, categorie) VALUES
-- Viandes congélateur (bleu)
('Bœuf 1ère', 72, 'kg', 'congelateur', 'Viande'),
('Bœuf 3ème', 0, 'kg', 'congelateur', 'Viande'),
('Poulet Entier', 0, 'kg', 'congelateur', 'Viande'),
('Poulet Avec os', 54, 'kg', 'congelateur', 'Viande'),
('Escalope Filet', 46, 'kg', 'congelateur', 'Viande'),
('Émincé', 47, 'kg', 'congelateur', 'Viande'),
('Saucisse (90g)', 12, 'kg', 'congelateur', 'Viande'),
('Agneau', 34, 'kg', 'congelateur', 'Viande'),
('Canard', 1, 'caisse', 'congelateur', 'Viande'),
('Lapin', 2, 'caisse', 'congelateur', 'Viande'),
('Haché mixte', 0, 'pcs', 'congelateur', 'Viande'),
('Pané', 38, 'caisse', 'congelateur', 'Viande'),
('Porc', 0, 'kg', 'congelateur', 'Viande'),
('Veau', 21, 'kg', 'congelateur', 'Viande'),
('Mixte porc et pit', 0, 'kg', 'congelateur', 'Viande'),
('BF', 0, 'kg', 'congelateur', 'Viande'),
('Volaille', 196, 'kg', 'congelateur', 'Viande'),

-- Sauces et liquides (frigo/ambiant)
('Sauce bolognaise BF', 65, 'kg', 'frigo', 'Sauce'),
('Quiche végé', 9, 'kg', 'frigo', 'Plat'),
('Sauce tomate', 116, 'caisse', 'ambiant', 'Sauce'),
('Courgettes cuites', 66, 'pièce', 'frigo', 'Légume')

ON CONFLICT DO NOTHING;

-- =====================================================
-- FONCTIONS TRIGGER POUR AUTOMATISATION
-- =====================================================

-- Fonction pour mettre à jour date_maj automatiquement
CREATE OR REPLACE FUNCTION update_stock_cuisine_maj()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_maj = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour auto-update date_maj
DROP TRIGGER IF EXISTS update_stock_cuisine_modtime ON stock_cuisine;
CREATE TRIGGER update_stock_cuisine_modtime
  BEFORE UPDATE ON stock_cuisine
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_cuisine_maj();

-- Fonction pour créer automatiquement un mouvement lors d'envoi
CREATE OR REPLACE FUNCTION create_mouvement_on_envoi()
RETURNS TRIGGER AS $$
DECLARE
  stock_actuel_avant DECIMAL(10,2);
  stock_actuel_apres DECIMAL(10,2);
BEGIN
  -- Récupérer stock actuel
  SELECT stock_actuel INTO stock_actuel_avant 
  FROM stock_cuisine WHERE id = NEW.aliment_id;
  
  -- Calculer nouveau stock
  stock_actuel_apres = stock_actuel_avant - NEW.quantite;
  
  -- Mettre à jour le stock
  UPDATE stock_cuisine 
  SET stock_actuel = stock_actuel_apres
  WHERE id = NEW.aliment_id;
  
  -- Créer le mouvement historique
  INSERT INTO mouvements_stock (
    aliment_id, 
    type_mouvement, 
    quantite_avant, 
    quantite_mouvement, 
    quantite_apres,
    reference_envoi,
    notes
  ) VALUES (
    NEW.aliment_id,
    'envoi',
    stock_actuel_avant,
    -NEW.quantite,
    stock_actuel_apres,
    NEW.id,
    'Envoi automatique vers ' || (SELECT nom FROM sites_livraison WHERE id = NEW.site_id)
  );
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour auto-déduction stock lors création envoi
DROP TRIGGER IF EXISTS auto_deduct_stock_on_envoi ON planning_envois;
CREATE TRIGGER auto_deduct_stock_on_envoi
  AFTER INSERT ON planning_envois
  FOR EACH ROW
  EXECUTE FUNCTION create_mouvement_on_envoi();

-- =====================================================
-- VUES UTILITAIRES
-- =====================================================

-- Vue pour affichage planning avec détails
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

-- Vue pour historique des stocks
CREATE OR REPLACE VIEW v_historique_stocks AS
SELECT 
  ms.date_mouvement,
  sc.nom as aliment_nom,
  ms.type_mouvement,
  ms.quantite_mouvement,
  ms.quantite_apres,
  sc.unite,
  COALESCE(sl.nom, '') as site_destination,
  ms.notes
FROM mouvements_stock ms
JOIN stock_cuisine sc ON ms.aliment_id = sc.id
LEFT JOIN planning_envois pe ON ms.reference_envoi = pe.id
LEFT JOIN sites_livraison sl ON pe.site_id = sl.id
ORDER BY ms.date_mouvement DESC; 