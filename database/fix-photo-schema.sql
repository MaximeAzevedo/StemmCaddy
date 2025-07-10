-- Script de correction pour le stockage des photos
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter le champ photo à la table employees principale (pour logistique)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo TEXT;

-- 2. Vérifier que la table employees_cuisine existe avec photo_url
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

-- 3. Créer des index pour optimiser les requêtes photos
CREATE INDEX IF NOT EXISTS idx_employees_photo ON employees(id) WHERE photo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_cuisine_photo ON employees_cuisine(employee_id) WHERE photo_url IS NOT NULL;

-- 4. Fonction pour gérer la taille des photos (vérification côté serveur)
CREATE OR REPLACE FUNCTION validate_photo_size(photo_data TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier que la photo base64 ne dépasse pas ~7MB (5MB * 1.33 pour base64)
  -- Base64 augmente la taille d'environ 33%
  IF LENGTH(photo_data) > 7000000 THEN
    RAISE EXCEPTION 'Photo trop volumineuse. Maximum 5MB autorisé.';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger pour valider la taille des photos avant insertion/update
CREATE OR REPLACE FUNCTION check_photo_before_save()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier photo pour employees
  IF TG_TABLE_NAME = 'employees' AND NEW.photo IS NOT NULL THEN
    PERFORM validate_photo_size(NEW.photo);
  END IF;
  
  -- Vérifier photo_url pour employees_cuisine  
  IF TG_TABLE_NAME = 'employees_cuisine' AND NEW.photo_url IS NOT NULL THEN
    PERFORM validate_photo_size(NEW.photo_url);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Appliquer les triggers
DROP TRIGGER IF EXISTS validate_employee_photo ON employees;
CREATE TRIGGER validate_employee_photo
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION check_photo_before_save();

DROP TRIGGER IF EXISTS validate_employee_cuisine_photo ON employees_cuisine;
CREATE TRIGGER validate_employee_cuisine_photo
  BEFORE INSERT OR UPDATE ON employees_cuisine
  FOR EACH ROW EXECUTE FUNCTION check_photo_before_save();

-- 7. Commentaires pour documentation
COMMENT ON COLUMN employees.photo IS 'Photo employé en base64 (max 5MB)';
COMMENT ON COLUMN employees_cuisine.photo_url IS 'Photo employé cuisine en base64 (max 5MB)';

-- 8. Affichage de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Schéma photos corrigé avec succès !';
  RAISE NOTICE '📸 employees.photo : Photos logistique';
  RAISE NOTICE '📸 employees_cuisine.photo_url : Photos cuisine';
  RAISE NOTICE '🔒 Validation automatique 5MB activée';
END $$; 