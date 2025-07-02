-- Script de réparation pour la gestion des absences
-- À exécuter dans Supabase SQL Editor si des erreurs persistent

-- 1. Vérifier et créer la table employees si elle n'existe pas
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  telephone VARCHAR(20),
  profil VARCHAR(20) NOT NULL DEFAULT 'Moyen' CHECK (profil IN ('Faible', 'Moyen', 'Fort')),
  langues TEXT[] DEFAULT '{}',
  permis BOOLEAN DEFAULT FALSE,
  etoiles INTEGER DEFAULT 1 CHECK (etoiles IN (1, 2)),
  statut VARCHAR(20) DEFAULT 'Actif' CHECK (statut IN ('Actif', 'Absent', 'Formation')),
  date_embauche DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ajouter des employés par défaut si la table est vide
INSERT INTO employees (nom, profil, langues, permis, statut) VALUES
('Martial', 'Fort', ARRAY['français', 'luxembourgeois'], true, 'Actif'),
('Margot', 'Moyen', ARRAY['français'], false, 'Actif'),
('Shadi', 'Fort', ARRAY['français', 'arabe'], true, 'Actif'),
('Ahmad', 'Moyen', ARRAY['français', 'arabe'], false, 'Actif'),
('Tamara', 'Faible', ARRAY['français'], false, 'Actif'),
('Anouar', 'Moyen', ARRAY['français', 'arabe'], true, 'Actif'),
('Fatima', 'Fort', ARRAY['français', 'arabe'], false, 'Actif')
ON CONFLICT (email) DO NOTHING;

-- 3. Créer/recréer la table absences avec la bonne structure
DROP TABLE IF EXISTS absences CASCADE;

CREATE TABLE absences (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type_absence VARCHAR(50) NOT NULL DEFAULT 'Absent' CHECK (type_absence IN (
    'Maladie', 
    'Congés', 
    'Formation', 
    'Indisponibilité', 
    'Absence exceptionnelle',
    'Congé maternité',
    'Congé paternité',
    'RTT',
    'Absent'
  )),
  motif TEXT,
  statut VARCHAR(20) DEFAULT 'Confirmée' CHECK (statut IN ('Demandée', 'Confirmée', 'Refusée', 'Annulée')),
  justificatif_requis BOOLEAN DEFAULT FALSE,
  justificatif_fourni BOOLEAN DEFAULT FALSE,
  remplacant_id INTEGER REFERENCES employees(id),
  notes TEXT,
  created_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes de cohérence
  CONSTRAINT valid_dates CHECK (date_fin >= date_debut),
  CONSTRAINT valid_duration CHECK ((date_fin - date_debut) <= 365)
);

-- 4. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_absences_employee_dates ON absences(employee_id, date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_period ON absences(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_type ON absences(type_absence);

-- 5. Activer RLS (Row Level Security)
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- 6. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Tous peuvent voir les absences" ON absences;
DROP POLICY IF EXISTS "Managers peuvent gérer les absences" ON absences;

-- 7. Créer les nouvelles politiques RLS
CREATE POLICY "Tous peuvent voir les absences" ON absences
  FOR SELECT USING (true);

CREATE POLICY "Managers peuvent gérer les absences" ON absences
  FOR ALL USING (true);

-- 8. Ajouter quelques données de test
INSERT INTO absences (employee_id, date_debut, date_fin, type_absence, motif, statut) VALUES
(3, CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 'Absent', 'Grippe saisonnière', 'Confirmée'),
(5, CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '9 days', 'Absent', 'Formation sécurité alimentaire', 'Confirmée')
ON CONFLICT DO NOTHING;

-- 9. Recréer les fonctions de disponibilité
CREATE OR REPLACE FUNCTION est_disponible(
  p_employee_id INTEGER,
  p_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier s'il y a une absence confirmée à cette date
  RETURN NOT EXISTS (
    SELECT 1 FROM absences 
    WHERE employee_id = p_employee_id 
    AND p_date BETWEEN date_debut AND date_fin
    AND statut = 'Confirmée'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_employes_disponibles(p_date DATE)
RETURNS TABLE(
  id INTEGER,
  nom VARCHAR,
  prenom VARCHAR,
  profil VARCHAR,
  langues TEXT[],
  permis BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.nom,
    e.prenom,
    e.profil,
    e.langues,
    e.permis
  FROM employees e
  WHERE e.statut = 'Actif'
  AND est_disponible(e.id, p_date);
END;
$$ LANGUAGE plpgsql;

-- 10. Vérification finale
DO $$
DECLARE
  employee_count INTEGER;
  absence_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO employee_count FROM employees;
  SELECT COUNT(*) INTO absence_count FROM absences;
  
  RAISE NOTICE '✅ RÉPARATION TERMINÉE !';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Employés dans la base: %', employee_count;
  RAISE NOTICE 'Absences dans la base: %', absence_count;
  RAISE NOTICE '═══════════════════════════════════════';
  
  IF employee_count = 0 THEN
    RAISE WARNING '⚠️ Aucun employé trouvé ! Vérifiez la table employees.';
  END IF;
  
  RAISE NOTICE '🚀 La gestion des absences devrait maintenant fonctionner !';
END $$; 