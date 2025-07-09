-- =====================================================
-- SCHÉMA SQL POUR LES ABSENCES CUISINE - CADDY
-- =====================================================

-- Table des absences pour les employés cuisine
CREATE TABLE IF NOT EXISTS absences_cuisine (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type_absence VARCHAR(50) DEFAULT 'Absent' CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation', 'Accident')),
  statut VARCHAR(20) DEFAULT 'Confirmée' CHECK (statut IN ('Confirmée', 'En attente', 'Annulée')),
  motif TEXT,
  remplacant_id INTEGER REFERENCES employees(id),
  created_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (date_fin >= date_debut)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_employee_id ON absences_cuisine(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_dates ON absences_cuisine(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_statut ON absences_cuisine(statut);

-- Politique RLS pour permettre l'accès public (à ajuster selon les besoins de sécurité)
ALTER TABLE absences_cuisine ENABLE ROW LEVEL SECURITY;

-- Politique permissive pour les tests (à remplacer par des politiques plus strictes en production)
CREATE POLICY "Accès public absences cuisine" ON absences_cuisine FOR ALL USING (true);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_absences_cuisine_updated_at 
  BEFORE UPDATE ON absences_cuisine 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vue pour faciliter les requêtes avec informations employé
CREATE OR REPLACE VIEW absences_cuisine_avec_employe AS
SELECT 
  ac.*,
  e.nom as employee_nom,
  e.prenom as employee_prenom,
  e.profil as employee_profil,
  e.langues as employee_langues,
  remplacant.nom as remplacant_nom,
  remplacant.prenom as remplacant_prenom
FROM absences_cuisine ac
LEFT JOIN employees e ON ac.employee_id = e.id
LEFT JOIN employees remplacant ON ac.remplacant_id = remplacant.id;

-- Fonction pour vérifier la disponibilité d'un employé cuisine
CREATE OR REPLACE FUNCTION est_disponible_cuisine(p_employee_id INTEGER, p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM absences_cuisine 
    WHERE employee_id = p_employee_id 
    AND statut = 'Confirmée'
    AND p_date BETWEEN date_debut AND date_fin
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les employés cuisine disponibles à une date
CREATE OR REPLACE FUNCTION get_employes_cuisine_disponibles(p_date DATE)
RETURNS TABLE (
  employee_id INTEGER,
  nom VARCHAR,
  prenom VARCHAR,
  profil VARCHAR,
  disponible BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.employee_id,
    e.nom,
    e.prenom,
    e.profil,
    est_disponible_cuisine(ec.employee_id, p_date) as disponible
  FROM employees_cuisine ec
  JOIN employees e ON ec.employee_id = e.id
  WHERE e.statut = 'Actif'
  ORDER BY e.nom;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour détecter les conflits dans le planning cuisine
CREATE OR REPLACE FUNCTION detecter_conflits_planning_cuisine(p_date DATE)
RETURNS TABLE (
  employee_id INTEGER,
  employee_nom VARCHAR,
  poste_nom VARCHAR,
  creneau VARCHAR,
  type_conflit VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.employee_id,
    e.nom as employee_nom,
    p.nom as poste_nom,
    pc.creneau,
    'ABSENT' as type_conflit
  FROM planning_cuisine pc
  JOIN employees e ON pc.employee_id = e.id
  JOIN postes_cuisine p ON pc.poste_id = p.id
  WHERE pc.date = p_date
  AND NOT est_disponible_cuisine(pc.employee_id, p_date);
END;
$$ LANGUAGE plpgsql;

-- Données d'exemple pour tester (optionnel)
/*
INSERT INTO absences_cuisine (employee_id, date_debut, date_fin, type_absence, motif) VALUES
(1, '2024-01-15', '2024-01-15', 'Maladie', 'Grippe'),
(2, '2024-01-20', '2024-01-22', 'Congé', 'Congés personnels'),
(3, '2024-01-25', '2024-01-25', 'Formation', 'Formation hygiène alimentaire');
*/

-- Commentaires pour la documentation
COMMENT ON TABLE absences_cuisine IS 'Table des absences pour les employés cuisine';
COMMENT ON COLUMN absences_cuisine.employee_id IS 'ID de l employé absent';
COMMENT ON COLUMN absences_cuisine.date_debut IS 'Date de début de l absence';
COMMENT ON COLUMN absences_cuisine.date_fin IS 'Date de fin de l absence';
COMMENT ON COLUMN absences_cuisine.type_absence IS 'Type d absence : Absent, Congé, Maladie, Formation, Accident';
COMMENT ON COLUMN absences_cuisine.statut IS 'Statut : Confirmée, En attente, Annulée';
COMMENT ON COLUMN absences_cuisine.motif IS 'Motif détaillé de l absence';
COMMENT ON COLUMN absences_cuisine.remplacant_id IS 'ID de l employé remplaçant (optionnel)'; 