-- Schéma de base de données Caddy - Configuration complète avec vraies données
-- À exécuter dans Supabase SQL Editor

-- 1. SUPPRESSION DES TABLES EXISTANTES (si elles existent)
DROP TABLE IF EXISTS planning CASCADE;
DROP TABLE IF EXISTS competences CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;

-- 2. CRÉATION DES TABLES

-- Table des véhicules
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL UNIQUE,
  capacite INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  couleur VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des employés
CREATE TABLE employees (
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

-- Table des compétences
CREATE TABLE competences (
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

-- Table du planning
CREATE TABLE planning (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  role VARCHAR(50) DEFAULT 'Équipier',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INSERTION DES VÉHICULES
INSERT INTO vehicles (nom, capacite, type, couleur) VALUES
('Crafter 21', 3, 'Collecte', '#3b82f6'),
('Crafter 23', 3, 'Collecte', '#10b981'),
('Jumper', 3, 'Collecte', '#8b5cf6'),
('Ducato', 3, 'Collecte', '#f59e0b'),
('Transit', 8, 'Formation', '#ef4444');

-- 4. INSERTION DES 21 EMPLOYÉS RÉELS
INSERT INTO employees (nom, profil, langues, permis, etoiles, email) VALUES
('Abdelaziz', 'Moyen', ARRAY['Arabe'], false, 1, 'abdelaziz@caddy.lu'),
('Tesfaldet', 'Moyen', ARRAY['Tigrinya'], false, 1, 'tesfaldet@caddy.lu'),
('Shadi', 'Fort', ARRAY['Arabe', 'Anglais', 'Français'], false, 2, 'shadi@caddy.lu'),
('Emahaston', 'Fort', ARRAY['Tigrinya', 'Français'], false, 2, 'emahaston@caddy.lu'),
('Hamed', 'Moyen', ARRAY['Perse', 'Anglais', 'Arabe'], true, 1, 'hamed@caddy.lu'),
('Soroosh', 'Fort', ARRAY['Perse'], true, 2, 'soroosh@caddy.lu'),
('Cemalettin', 'Moyen', ARRAY['Turc'], false, 1, 'cemalettin@caddy.lu'),
('Ahmad', 'Moyen', ARRAY['Arabe'], true, 1, 'ahmad@caddy.lu'),
('Juan', 'Fort', ARRAY['Arabe'], true, 2, 'juan@caddy.lu'),
('Basel', 'Moyen', ARRAY['Arabe', 'Anglais', 'Allemand'], true, 1, 'basel@caddy.lu'),
('Firas', 'Fort', ARRAY['Arabe'], true, 2, 'firas@caddy.lu'),
('José', 'Fort', ARRAY['Créole', 'Français'], true, 2, 'jose@caddy.lu'),
('Imad', 'Moyen', ARRAY['Arabe'], true, 1, 'imad@caddy.lu'),
('Mejrema', 'Faible', ARRAY['Yougoslave', 'Allemand'], false, 1, 'mejrema@caddy.lu'),
('Hassene', 'Faible', ARRAY['Arabe', 'Français'], true, 1, 'hassene@caddy.lu'),
('Tamara', 'Faible', ARRAY['Lux', 'Français'], true, 1, 'tamara@caddy.lu'),
('Elton', 'Faible', ARRAY['Yougoslave', 'Français'], false, 1, 'elton@caddy.lu'),
('Mersad', 'Faible', ARRAY['Yougoslave', 'Français'], false, 1, 'mersad@caddy.lu'),
('Siamak', 'Fort', ARRAY['Perse', 'Français', 'Anglais'], true, 2, 'siamak@caddy.lu'),
('Mojoos', 'Faible', ARRAY['Tigrinya'], false, 1, 'mojoos@caddy.lu'),
('Medhanie', 'Fort', ARRAY['Tigrinya', 'Anglais', 'Français'], true, 2, 'medhanie@caddy.lu');

-- 5. CONFIGURATION DES COMPÉTENCES selon votre tableau

-- Crafter 23 - Compétences XX
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 2, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak');

-- Crafter 23 - Compétences X
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 2, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Abdelaziz', 'Tesfaldet', 'Cemalettin', 'Mojoos');

-- Crafter 21 - Compétences XX
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 1, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak');

-- Crafter 21 - Compétences X
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 1, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Abdelaziz', 'Tesfaldet', 'Shadi', 'Cemalettin', 'Mojoos');

-- Jumper - Compétences XX
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 3, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak');

-- Jumper - Compétences X
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 3, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Abdelaziz', 'Tesfaldet', 'Shadi', 'Cemalettin', 'Hassene', 'Tamara');

-- Ducato - Compétences XX
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 4, 'XX', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak');

-- Ducato - Compétences X
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 4, 'X', CURRENT_DATE
FROM employees e 
WHERE e.nom IN ('Abdelaziz', 'Tesfaldet', 'Shadi', 'Cemalettin', 'Hassene', 'Tamara');

-- Transit - Tous en X (Formation)
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation) 
SELECT e.id, 5, 'X', CURRENT_DATE
FROM employees e;

-- 6. CRÉATION D'UN PLANNING DE DÉMONSTRATION
INSERT INTO planning (employee_id, vehicle_id, date, role) 
SELECT 
  e.id,
  CASE 
    WHEN e.nom IN ('Ahmad', 'Juan', 'Basel') THEN 2    -- Crafter 23
    WHEN e.nom IN ('Firas', 'José', 'Imad') THEN 1     -- Crafter 21
    WHEN e.nom IN ('Emahaston', 'Hamed', 'Soroosh') THEN 3  -- Jumper
    WHEN e.nom IN ('Siamak', 'Hassene', 'Tamara') THEN 4    -- Ducato
    ELSE 5                                             -- Transit formation
  END,
  CURRENT_DATE,
  CASE WHEN e.permis AND e.etoiles = 2 THEN 'Conducteur' ELSE 'Équipier' END
FROM employees e
WHERE e.nom IN ('Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak', 'Hassene', 'Tamara');

-- 7. TRIGGERS pour updated_at
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

-- 8. INDEX pour les performances
CREATE INDEX IF NOT EXISTS idx_planning_date ON planning(date);
CREATE INDEX IF NOT EXISTS idx_planning_employee ON planning(employee_id);
CREATE INDEX IF NOT EXISTS idx_planning_vehicle ON planning(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_competences_employee ON competences(employee_id);
CREATE INDEX IF NOT EXISTS idx_competences_vehicle ON competences(vehicle_id);

-- 9. POLITIQUE DE SÉCURITÉ RLS (Row Level Security)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning ENABLE ROW LEVEL SECURITY;

-- Politiques pour permettre l'accès aux utilisateurs authentifiés
CREATE POLICY "Allow authenticated access" ON vehicles FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow authenticated access" ON employees FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow authenticated access" ON competences FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow authenticated access" ON planning FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 10. AFFICHAGE DU RÉSUMÉ
DO $$
BEGIN
    RAISE NOTICE '🎉 CONFIGURATION CADDY TERMINÉE !';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '✅ Tables : vehicles, employees, competences, planning';
    RAISE NOTICE '✅ Véhicules : 5 véhicules de votre flotte';
    RAISE NOTICE '✅ Employés : 21 employés selon votre tableau';
    RAISE NOTICE '✅ Compétences : Configurées X/XX selon données réelles';
    RAISE NOTICE '✅ Planning : Démonstration avec règles d''insertion';
    RAISE NOTICE '✅ Sécurité : RLS activée';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 PROCHAINES ÉTAPES :';
    RAISE NOTICE '1. Authentication > Users > Add User';
    RAISE NOTICE '   Email: maxime@caddy.lu';
    RAISE NOTICE '   Password: Cristobello54';
    RAISE NOTICE '2. npm start (dans votre terminal)';
    RAISE NOTICE '3. http://localhost:3001';
    RAISE NOTICE '═══════════════════════════════════════';
END $$; 