-- Extension du schéma pour le Module Cuisine
-- À exécuter après le schéma principal

-- 1. Table des postes de cuisine
CREATE TABLE IF NOT EXISTS postes_cuisine (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  horaire_debut TIME,
  horaire_fin TIME,
  capacite_max INTEGER DEFAULT 3,
  couleur VARCHAR(20),
  icone VARCHAR(50),
  ordre_affichage INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des employés cuisine (extension de employees avec spécificités)
CREATE TABLE IF NOT EXISTS employees_cuisine (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  service VARCHAR(20) DEFAULT 'Cuisine' CHECK (service IN ('Cuisine', 'Logistique', 'Mixte')),
  photo_url TEXT,
  horaires_preferes TEXT[],
  notes_cuisine TEXT,
  date_formation_cuisine DATE,
  niveau_hygiene VARCHAR(20) DEFAULT 'Base' CHECK (niveau_hygiene IN ('Base', 'Avancé', 'Formateur')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Ajouter le champ photo dans la table employees principale si manquant
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo TEXT;

-- 3. Table des compétences cuisine (équivalent des compétences véhicules)
CREATE TABLE IF NOT EXISTS competences_cuisine (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  poste_id INTEGER REFERENCES postes_cuisine(id) ON DELETE CASCADE,
  niveau VARCHAR(20) NOT NULL CHECK (niveau IN ('Débutant', 'Confirmé', 'Expert')),
  date_validation DATE,
  formateur_id INTEGER REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, poste_id)
);

-- 4. Table du planning cuisine
CREATE TABLE IF NOT EXISTS planning_cuisine (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  poste_id INTEGER REFERENCES postes_cuisine(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  creneau VARCHAR(20) NOT NULL, -- '11h00-11h45', '11h45-12h45', etc.
  role VARCHAR(50) DEFAULT 'Équipier',
  priorite INTEGER DEFAULT 1, -- 1=Principal, 2=Support, 3=Formation
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table des créneaux horaires
CREATE TABLE IF NOT EXISTS creneaux_cuisine (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(50) NOT NULL UNIQUE,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  description TEXT,
  couleur VARCHAR(20),
  actif BOOLEAN DEFAULT TRUE,
  ordre_affichage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Triggers pour updated_at
CREATE TRIGGER update_postes_cuisine_updated_at BEFORE UPDATE ON postes_cuisine FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_cuisine_updated_at BEFORE UPDATE ON employees_cuisine FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_competences_cuisine_updated_at BEFORE UPDATE ON competences_cuisine FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planning_cuisine_updated_at BEFORE UPDATE ON planning_cuisine FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Insertion des postes de cuisine
INSERT INTO postes_cuisine (nom, description, couleur, icone, ordre_affichage) VALUES
('Cuisine chaude', 'Préparation des plats chauds et cuisson', '#dc2626', '🔥', 1),
('Sandwichs', 'Préparation des sandwichs et snacks', '#f59e0b', '🥪', 2),
('Pain', 'Gestion du pain et boulangerie', '#d97706', '🍞', 3),
('Jus de fruits', 'Préparation des boissons et jus', '#10b981', '🧃', 4),
('Vaisselle', 'Nettoyage et gestion de la vaisselle', '#3b82f6', '🍽️', 5),
('Légumerie', 'Préparation des légumes et salades', '#22c55e', '🥬', 6);

-- 8. Insertion des créneaux horaires
INSERT INTO creneaux_cuisine (nom, heure_debut, heure_fin, couleur, ordre_affichage) VALUES
('Self midi', '11:00', '11:45', '#3b82f6', 1),
('Service continu', '11:45', '12:45', '#10b981', 2),
('Service 8h', '08:00', '16:00', '#8b5cf6', 3),
('Service 10h', '10:00', '18:00', '#f59e0b', 4),
('Service 12h', '12:00', '20:00', '#ef4444', 5);

-- 9. Insertion des employés cuisine basée sur vos données
INSERT INTO employees (nom, prenom, profil, langues, permis, etoiles, email, statut) VALUES
('Salah', 'Salah', 'Faible', ARRAY['Arabe'], false, 1, 'salah@stemm.lu', 'Actif'),
('Maida', 'Maida', 'Fort', ARRAY['Yougoslave'], false, 2, 'maida@stemm.lu', 'Actif'),
('Mahmoud', 'Mahmoud', 'Moyen', ARRAY['Arabe'], false, 1, 'mahmoud@stemm.lu', 'Actif'),
('Mohammad', 'Mohammad', 'Faible', ARRAY['Arabe'], false, 1, 'mohammad@stemm.lu', 'Actif'),
('Amar', 'Amar', 'Moyen', ARRAY['Arabe'], false, 1, 'amar@stemm.lu', 'Actif'),
('Haile', 'Haile', 'Moyen', ARRAY['Tigrinya'], false, 1, 'haile@stemm.lu', 'Actif'),
('Aïssatou', 'Aïssatou', 'Fort', ARRAY['Guinéen'], false, 2, 'aissatou@stemm.lu', 'Actif'),
('Halimatou', 'Halimatou', 'Faible', ARRAY['Guinéen'], false, 1, 'halimatou@stemm.lu', 'Actif'),
('Idiatou', 'Idiatou', 'Faible', ARRAY['Guinéen'], false, 1, 'idiatou@stemm.lu', 'Actif'),
('Abdul', 'Abdul', 'Faible', ARRAY['Bengali'], false, 1, 'abdul@stemm.lu', 'Actif'),
('Fatumata', 'Fatumata', 'Fort', ARRAY['Guinéen'], false, 2, 'fatumata@stemm.lu', 'Actif'),
('Giovanna', 'Giovanna', 'Faible', ARRAY['Français'], false, 1, 'giovanna@stemm.lu', 'Actif'),
('Carla', 'Carla', 'Moyen', ARRAY['Portugais'], false, 1, 'carla@stemm.lu', 'Actif'),
('Liliana', 'Liliana', 'Moyen', ARRAY['Français'], false, 1, 'liliana@stemm.lu', 'Actif'),
('Djenabou', 'Djenabou', 'Fort', ARRAY['Guinéen'], false, 2, 'djenabou@stemm.lu', 'Actif'),
('Harissatou', 'Harissatou', 'Moyen', ARRAY['Guinéen'], false, 1, 'harissatou@stemm.lu', 'Actif'),
('Oumou', 'Oumou', 'Faible', ARRAY['Guinéen'], false, 1, 'oumou@stemm.lu', 'Actif'),
('Jurom', 'Jurom', 'Moyen', ARRAY['Tigrinya'], false, 1, 'jurom@stemm.lu', 'Actif'),
('Maria', 'Maria', 'Moyen', ARRAY['Portugais'], false, 1, 'maria@stemm.lu', 'Actif'),
('Kifle', 'Kifle', 'Moyen', ARRAY['Tigrinya'], false, 1, 'kifle@stemm.lu', 'Actif'),
('Hayle Almedom', 'Hayle', 'Fort', ARRAY['Tigrinya'], false, 2, 'hayle@stemm.lu', 'Actif'),
('Yeman', 'Yeman', 'Moyen', ARRAY['Tigrinya'], false, 1, 'yeman@stemm.lu', 'Actif'),
('Nesrin', 'Nesrin', 'Moyen', ARRAY['Syrien'], false, 1, 'nesrin@stemm.lu', 'Actif'),
('Charif', 'Charif', 'Fort', ARRAY['Syrien'], false, 2, 'charif@stemm.lu', 'Actif'),
('Elsa', 'Elsa', 'Faible', ARRAY['Portugais'], false, 1, 'elsa@stemm.lu', 'Actif'),
('Magali', 'Magali', 'Moyen', ARRAY['Français'], false, 1, 'magali@stemm.lu', 'Actif'),
('Niyat', 'Niyat', 'Moyen', ARRAY['Tigrinya'], false, 1, 'niyat@stemm.lu', 'Actif'),
('Yvette', 'Yvette', 'Moyen', ARRAY['Français'], false, 1, 'yvette@stemm.lu', 'Actif'),
('Azmera', 'Azmera', 'Moyen', ARRAY['Tigrinya'], false, 1, 'azmera@stemm.lu', 'Actif')
ON CONFLICT (email) DO NOTHING;

-- 10. Marquer les employés comme appartenant au service cuisine
INSERT INTO employees_cuisine (employee_id, service, niveau_hygiene)
SELECT e.id, 'Cuisine', 'Base'
FROM employees e 
WHERE e.email LIKE '%@stemm.lu'
ON CONFLICT (employee_id) DO NOTHING;

-- 11. Politique de sécurité RLS
ALTER TABLE postes_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE competences_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE creneaux_cuisine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON postes_cuisine FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON employees_cuisine FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON competences_cuisine FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON planning_cuisine FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permettre l'accès aux utilisateurs authentifiés" ON creneaux_cuisine FOR ALL USING (auth.role() = 'authenticated');

-- 12. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_planning_cuisine_date ON planning_cuisine(date);
CREATE INDEX IF NOT EXISTS idx_planning_cuisine_employee ON planning_cuisine(employee_id);
CREATE INDEX IF NOT EXISTS idx_planning_cuisine_poste ON planning_cuisine(poste_id);
CREATE INDEX IF NOT EXISTS idx_competences_cuisine_employee ON competences_cuisine(employee_id);
CREATE INDEX IF NOT EXISTS idx_competences_cuisine_poste ON competences_cuisine(poste_id);
CREATE INDEX IF NOT EXISTS idx_employees_cuisine_service ON employees_cuisine(service); 