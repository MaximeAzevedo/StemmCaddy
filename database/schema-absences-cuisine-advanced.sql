-- =====================================================
-- SCHÉMA AVANCÉ POUR LES ABSENCES CUISINE - VERSION 2.0
-- =====================================================
-- Basé sur la structure logistique, adapté pour la cuisine
-- Intègre tous les types d'absence et fonctionnalités avancées

-- Table des absences cuisine avancée (temporaire pour migration)
CREATE TABLE IF NOT EXISTS absences_cuisine_advanced (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employes_cuisine_new(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  
  -- Types d'absence étendus (basés sur logistique)
  type_absence VARCHAR(50) NOT NULL DEFAULT 'Absent' CHECK (type_absence IN (
    'Absent',           -- Absence classique
    'Congé',           -- Congés payés
    'Maladie',         -- Arrêt maladie
    'Formation',       -- Formation professionnelle
    'Rendez-vous',     -- RDV médical/administratif avec heure
    'Fermeture'        -- Fermeture du service cuisine (employee_id = NULL)
  )),
  
  -- Détails de l'absence
  motif TEXT,
  
  -- Gestion des heures pour rendez-vous
  heure_debut TIME, -- Pour les rendez-vous (ex: "10:30")
  heure_fin TIME,   -- Optionnel, pour durée précise
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes de cohérence
  CONSTRAINT valid_dates CHECK (date_fin >= date_debut),
  CONSTRAINT valid_duration CHECK ((date_fin - date_debut) <= 365), -- Max 1 an
  CONSTRAINT valid_fermeture CHECK (
    (type_absence = 'Fermeture' AND employee_id IS NULL) OR 
    (type_absence != 'Fermeture' AND employee_id IS NOT NULL)
  )
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_advanced_employee_dates 
ON absences_cuisine_advanced(employee_id, date_debut, date_fin);

CREATE INDEX IF NOT EXISTS idx_absences_cuisine_advanced_period 
ON absences_cuisine_advanced(date_debut, date_fin);

CREATE INDEX IF NOT EXISTS idx_absences_cuisine_advanced_type 
ON absences_cuisine_advanced(type_absence);

CREATE INDEX IF NOT EXISTS idx_absences_cuisine_advanced_fermetures 
ON absences_cuisine_advanced(type_absence, date_debut, date_fin) 
WHERE type_absence = 'Fermeture';

-- Politique RLS pour sécurité
ALTER TABLE absences_cuisine_advanced ENABLE ROW LEVEL SECURITY;

-- Politique permissive pour l'équipe cuisine
CREATE POLICY "Accès équipe cuisine absences advanced" ON absences_cuisine_advanced 
FOR ALL USING (true);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_absences_cuisine_advanced_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_absences_cuisine_advanced_updated_at_trigger
  BEFORE UPDATE ON absences_cuisine_advanced 
  FOR EACH ROW EXECUTE FUNCTION update_absences_cuisine_advanced_updated_at();

-- Vue pour faciliter les requêtes avec informations employé
CREATE OR REPLACE VIEW absences_cuisine_advanced_avec_employe AS
SELECT 
  a.*,
  e.prenom,
  e.langue_parlee,
  e.photo_url,
  CASE 
    WHEN a.type_absence = 'Fermeture' THEN 'Service fermé'
    ELSE e.prenom
  END as employe_display
FROM absences_cuisine_advanced a
LEFT JOIN employes_cuisine_new e ON a.employee_id = e.id
ORDER BY a.date_debut DESC, a.created_at DESC;

-- Données de démonstration pour tester
INSERT INTO absences_cuisine_advanced (
  employee_id, 
  date_debut, 
  date_fin, 
  type_absence, 
  motif, 
  heure_debut
) VALUES 
-- Absences classiques
(1, CURRENT_DATE, CURRENT_DATE, 'Absent', 'Rendez-vous médical', NULL),
(2, CURRENT_DATE + 1, CURRENT_DATE + 3, 'Congé', 'Congés d''été', NULL),
(3, CURRENT_DATE + 2, CURRENT_DATE + 2, 'Maladie', 'Grippe', NULL),

-- Rendez-vous avec heure
(4, CURRENT_DATE + 5, CURRENT_DATE + 5, 'Rendez-vous', 'Visite médicale', '10:30:00'),
(1, CURRENT_DATE + 7, CURRENT_DATE + 7, 'Rendez-vous', 'Dentiste', '14:00:00'),

-- Formation
(2, CURRENT_DATE + 10, CURRENT_DATE + 10, 'Formation', 'Formation hygiène HACCP', NULL),

-- Fermeture service (employee_id = NULL)
(NULL, CURRENT_DATE + 15, CURRENT_DATE + 15, 'Fermeture', 'Jour férié - Assomption', NULL);

-- Commentaires pour documentation
COMMENT ON TABLE absences_cuisine_advanced IS 'Table des absences cuisine avancée - Version 2.0 avec tous les types d''absence et gestion des heures';
COMMENT ON COLUMN absences_cuisine_advanced.employee_id IS 'ID employé (NULL pour les fermetures de service)';
COMMENT ON COLUMN absences_cuisine_advanced.type_absence IS 'Type: Absent, Congé, Maladie, Formation, Rendez-vous, Fermeture';
COMMENT ON COLUMN absences_cuisine_advanced.heure_debut IS 'Heure de début pour les rendez-vous (optionnel)';
COMMENT ON COLUMN absences_cuisine_advanced.heure_fin IS 'Heure de fin pour les rendez-vous (optionnel)'; 