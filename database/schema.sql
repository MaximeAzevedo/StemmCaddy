-- Schéma de base de données pour l'application Caddy
-- À exécuter dans Supabase SQL Editor

-- 1. Table des véhicules
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  capacite INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  couleur VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des employés
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  telephone VARCHAR(20),
  profil VARCHAR(20) NOT NULL CHECK (profil IN ('Faible', 'Moyen', 'Fort')),
  langues TEXT[] DEFAULT '{}',
  permis BOOLEAN DEFAULT FALSE,
  etoiles INTEGER DEFAULT 1 CHECK (etoiles IN (1, 2)),
  statut VARCHAR(20) DEFAULT 'Actif' CHECK (statut IN ('Actif', 'Absent', 'Formation')),
  date_embauche DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table des compétences (relation employé-véhicule)
CREATE TABLE IF NOT EXISTS competences (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  niveau VARCHAR(20) NOT NULL CHECK (niveau IN ('X', 'XX')),
  date_validation DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, vehicle_id)
);

-- 4. Table du planning
CREATE TABLE IF NOT EXISTS planning (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  role VARCHAR(50) DEFAULT 'Équipier',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table des absences
CREATE TABLE IF NOT EXISTS absences (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type_absence VARCHAR(50) DEFAULT 'Absent' CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation')),
  statut VARCHAR(20) DEFAULT 'Confirmée' CHECK (statut IN ('Confirmée', 'En attente', 'Annulée')),
  motif TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (date_fin >= date_debut)
);

-- 6. Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competences_updated_at BEFORE UPDATE ON competences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planning_updated_at BEFORE UPDATE ON planning FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_absences_updated_at BEFORE UPDATE ON absences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Insertion des véhicules
INSERT INTO vehicles (nom, capacite, type, couleur) VALUES
('Crafter 21', 3, 'Collecte', '#3b82f6'),
('Crafter 23', 3, 'Collecte', '#10b981'),
('Jumper', 3, 'Collecte', '#8b5cf6'),
('Ducato', 3, 'Collecte', '#f59e0b'),
('Transit', 8, 'Formation', '#ef4444')
ON CONFLICT DO NOTHING;

-- 8. Insertion des employés basée sur vos données
INSERT INTO employees (nom, prenom, profil, langues, permis, etoiles, email) VALUES
('Martial', 'Martial', 'Fort', ARRAY['Français'], true, 2, 'martial@caddy.lu'),
('Margot', 'Margot', 'Moyen', ARRAY['Français'], true, 2, 'margot@caddy.lu'),
('Shadi', 'Shadi', 'Fort', ARRAY['Arabe', 'Anglais', 'Français'], false, 2, 'shadi@caddy.lu'),
('Ahmad', 'Ahmad', 'Moyen', ARRAY['Arabe'], true, 1, 'ahmad@caddy.lu'),
('Tamara', 'Tamara', 'Faible', ARRAY['Luxembourgeois', 'Français'], true, 1, 'tamara@caddy.lu'),
('Soroosh', 'Soroosh', 'Fort', ARRAY['Perse'], true, 2, 'soroosh@caddy.lu'),
('Imad', 'Imad', 'Moyen', ARRAY['Arabe'], true, 1, 'imad@caddy.lu'),
('Basel', 'Basel', 'Faible', ARRAY['Arabe'], false, 1, 'basel@caddy.lu'),
('Firas', 'Firas', 'Moyen', ARRAY['Arabe'], true, 1, 'firas@caddy.lu'),
('José', 'José', 'Fort', ARRAY['Espagnol', 'Français'], true, 2, 'jose@caddy.lu'),
('Juan', 'Juan', 'Moyen', ARRAY['Espagnol'], false, 1, 'juan@caddy.lu'),
('Emaha', 'Emaha', 'Faible', ARRAY['Tigrinya'], false, 1, 'emaha@caddy.lu'),
('Medha', 'Medha', 'Faible', ARRAY['Tigrinya'], false, 1, 'medha@caddy.lu'),
('Tesfa', 'Tesfa', 'Moyen', ARRAY['Tigrinya'], false, 1, 'tesfa@caddy.lu')
ON CONFLICT (email) DO NOTHING;

-- 9. Insertion des compétences basées sur vos tableaux
-- Crafter 21 (vehicle_id = 1)
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 1, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Martial', 'Margot', 'Shadi', 'Soroosh', 'José')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 1, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Ahmad', 'Imad', 'Firas')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

-- Crafter 23 (vehicle_id = 2)
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 2, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Martial', 'Margot', 'Ahmad', 'Soroosh', 'José')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 2, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Shadi', 'Imad', 'Firas', 'Juan')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

-- Jumper (vehicle_id = 3)
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 3, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Martial', 'Margot', 'Ahmad', 'Soroosh', 'Imad', 'José')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 3, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Shadi', 'Firas', 'Juan')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

-- Ducato (vehicle_id = 4)
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 4, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Martial', 'Margot', 'Ahmad', 'Soroosh', 'Imad', 'José', 'Firas')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 4, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Shadi', 'Juan')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

-- Transit (vehicle_id = 5) - Formation
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 5, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Martial', 'Margot', 'Ahmad', 'Soroosh', 'Imad', 'José', 'Firas', 'Juan')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 5, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Shadi', 'Tamara', 'Basel', 'Tesfa')
ON CONFLICT (employee_id, vehicle_id) DO NOTHING;

-- 10. Planning exemple pour la semaine actuelle
INSERT INTO planning (employee_id, vehicle_id, date, role) 
SELECT 
  e.id,
  CASE 
    WHEN e.nom = 'Martial' THEN 1  -- Crafter 21
    WHEN e.nom = 'Shadi' THEN 1
    WHEN e.nom = 'Tamara' THEN 1
    WHEN e.nom = 'Margot' THEN 2   -- Crafter 23
    WHEN e.nom = 'Ahmad' THEN 2
    WHEN e.nom = 'Basel' THEN 2
    WHEN e.nom = 'Soroosh' THEN 3  -- Jumper
    WHEN e.nom = 'Imad' THEN 3
    WHEN e.nom = 'Firas' THEN 3
    WHEN e.nom = 'José' THEN 4     -- Ducato
    WHEN e.nom = 'Juan' THEN 4
    WHEN e.nom = 'Tesfa' THEN 4
    ELSE 5                         -- Transit formation
  END,
  CURRENT_DATE,
  CASE WHEN e.nom IN ('Martial', 'Margot', 'Soroosh', 'José') THEN 'Conducteur' ELSE 'Équipier' END
FROM employees e
WHERE e.nom IN ('Martial', 'Shadi', 'Tamara', 'Margot', 'Ahmad', 'Basel', 'Soroosh', 'Imad', 'Firas', 'José', 'Juan', 'Tesfa')
ON CONFLICT DO NOTHING;

-- 11. Politique de sécurité RLS (Row Level Security)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'accès authentifié
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON vehicles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON employees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON competences FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON planning FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON absences FOR ALL USING (auth.role() = 'authenticated');

-- 12. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_planning_date ON planning(date);
CREATE INDEX IF NOT EXISTS idx_planning_employee ON planning(employee_id);
CREATE INDEX IF NOT EXISTS idx_planning_vehicle ON planning(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_competences_employee ON competences(employee_id);
CREATE INDEX IF NOT EXISTS idx_competences_vehicle ON competences(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_absences_employee ON absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(date_debut, date_fin); 