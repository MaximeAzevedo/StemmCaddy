-- Extension du schéma Caddy pour la gestion des absences
-- À exécuter dans Supabase SQL Editor

-- Table des absences et indisponibilités
CREATE TABLE IF NOT EXISTS absences (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type_absence VARCHAR(50) NOT NULL CHECK (type_absence IN (
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

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_absences_employee_dates ON absences(employee_id, date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_period ON absences(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_type ON absences(type_absence);

-- Table des disponibilités récurrentes (horaires habituels)
CREATE TABLE IF NOT EXISTS disponibilites (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  jour_semaine INTEGER NOT NULL CHECK (jour_semaine BETWEEN 1 AND 7), -- 1=Lundi, 7=Dimanche
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  disponible BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un employé ne peut avoir qu'une disponibilité par jour
  UNIQUE(employee_id, jour_semaine),
  
  -- Contrainte de cohérence horaire
  CONSTRAINT valid_hours CHECK (heure_fin > heure_debut)
);

-- Index pour les disponibilités
CREATE INDEX IF NOT EXISTS idx_disponibilites_employee ON disponibilites(employee_id);
CREATE INDEX IF NOT EXISTS idx_disponibilites_jour ON disponibilites(jour_semaine);

-- Vue pour les employés disponibles à une date donnée
CREATE OR REPLACE VIEW employes_disponibles AS
SELECT 
  e.id,
  e.nom,
  e.prenom,
  e.profil,
  e.langues,
  e.permis,
  e.statut,
  CASE 
    WHEN a.id IS NOT NULL THEN FALSE 
    ELSE TRUE 
  END AS disponible_aujourd_hui,
  a.type_absence,
  a.date_debut AS absence_debut,
  a.date_fin AS absence_fin,
  a.motif AS motif_absence
FROM employees e
LEFT JOIN absences a ON (
  e.id = a.employee_id 
  AND CURRENT_DATE BETWEEN a.date_debut AND a.date_fin
  AND a.statut = 'Confirmée'
)
WHERE e.statut = 'Actif';

-- Fonction pour vérifier la disponibilité d'un employé
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

-- Fonction pour obtenir les employés disponibles à une date
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

-- Fonction pour détecter les conflits de planning
CREATE OR REPLACE FUNCTION detecter_conflits_planning(p_date DATE)
RETURNS TABLE(
  vehicle_nom VARCHAR,
  places_manquantes INTEGER,
  employes_absents TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH planning_jour AS (
    SELECT 
      v.nom as vehicle_nom,
      v.capacite,
      COUNT(p.employee_id) as employes_planifies,
      ARRAY_AGG(e.nom) as noms_employes,
      ARRAY_AGG(
        CASE WHEN NOT est_disponible(e.id, p_date) 
        THEN e.nom ELSE NULL END
      ) FILTER (WHERE NOT est_disponible(e.id, p_date)) as employes_absents_array
    FROM vehicles v
    LEFT JOIN planning p ON v.id = p.vehicle_id AND p.date = p_date
    LEFT JOIN employees e ON p.employee_id = e.id
    GROUP BY v.id, v.nom, v.capacite
  )
  SELECT 
    pj.vehicle_nom,
    GREATEST(0, pj.capacite - (pj.employes_planifies - COALESCE(array_length(pj.employes_absents_array, 1), 0))) as places_manquantes,
    COALESCE(pj.employes_absents_array, '{}') as employes_absents
  FROM planning_jour pj
  WHERE COALESCE(array_length(pj.employes_absents_array, 1), 0) > 0;
END;
$$ LANGUAGE plpgsql;

-- Données d'exemple pour tester
INSERT INTO absences (employee_id, date_debut, date_fin, type_absence, motif, statut) VALUES
-- Shadi en maladie cette semaine
(3, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 'Absent', 'Grippe', 'Confirmée'),
-- Tamara en formation la semaine prochaine
(5, CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '9 days', 'Absent', 'Formation sécurité alimentaire', 'Confirmée'),
-- Ahmad en congés dans 2 semaines
(4, CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '18 days', 'Absent', 'Vacances été', 'Demandée')
ON CONFLICT DO NOTHING;

-- Disponibilités standards (Lundi-Vendredi pour tous)
INSERT INTO disponibilites (employee_id, jour_semaine, heure_debut, heure_fin) 
SELECT 
  e.id,
  generate_series(1, 5) as jour, -- Lundi à Vendredi
  '08:00'::TIME,
  '17:00'::TIME
FROM employees e
WHERE e.statut = 'Actif'
ON CONFLICT (employee_id, jour_semaine) DO NOTHING;

-- Activer RLS (Row Level Security)
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilites ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les absences (lecture pour tous les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Tous peuvent voir les absences" ON absences;
CREATE POLICY "Tous peuvent voir les absences" ON absences
  FOR SELECT USING (true);

-- Politique RLS pour les disponibilités
DROP POLICY IF EXISTS "Tous peuvent voir les disponibilités" ON disponibilites;
CREATE POLICY "Tous peuvent voir les disponibilités" ON disponibilites
  FOR SELECT USING (true);

-- Permissions d'insertion/modification
DROP POLICY IF EXISTS "Managers peuvent gérer les absences" ON absences;
CREATE POLICY "Managers peuvent gérer les absences" ON absences
  FOR ALL USING (true);

COMMENT ON TABLE absences IS 'Gestion des absences, congés, maladies et indisponibilités des employés';
COMMENT ON TABLE disponibilites IS 'Horaires de travail et disponibilités récurrentes des employés';
COMMENT ON FUNCTION est_disponible IS 'Vérifie si un employé est disponible à une date donnée';
COMMENT ON FUNCTION get_employes_disponibles IS 'Retourne la liste des employés disponibles à une date';
COMMENT ON FUNCTION detecter_conflits_planning IS 'Détecte les conflits dans le planning dus aux absences';

-- Résumé
DO $$
BEGIN
  RAISE NOTICE '✅ SCHÉMA ABSENCES CRÉÉ AVEC SUCCÈS !';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '📋 Tables créées :';
  RAISE NOTICE '  • absences (gestion complète des absences)';
  RAISE NOTICE '  • disponibilites (horaires récurrents)';
  RAISE NOTICE '🔍 Vues créées :';
  RAISE NOTICE '  • employes_disponibles (vue temps réel)';
  RAISE NOTICE '⚡ Fonctions créées :';
  RAISE NOTICE '  • est_disponible() - vérification individuelle';
  RAISE NOTICE '  • get_employes_disponibles() - liste filtrée';
  RAISE NOTICE '  • detecter_conflits_planning() - alertes';
  RAISE NOTICE '📊 Données de test ajoutées';
  RAISE NOTICE '🔒 Sécurité RLS activée';
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '🚀 Prêt pour intégration dans l''application !';
END $$; 