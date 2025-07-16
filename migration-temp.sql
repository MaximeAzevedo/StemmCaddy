-- =====================================================
-- SCHÉMA CUISINE UNIFIÉ - VERSION SIMPLIFIÉE
-- =====================================================
-- Fusion de toutes les tables cuisine en version optimisée
-- Date: 2025-01-15
-- Objectif: Simplifier pour les utilisateurs non-techniques

-- =====================================================
-- ÉTAPE 1: SAUVEGARDE DES DONNÉES EXISTANTES
-- =====================================================

-- Sauvegarde des employés cuisine existants
CREATE TABLE IF NOT EXISTS backup_ancien_schema AS 
SELECT 
    e.id,
    e.nom,
    e.prenom,
    ec.photo_url,
    ec.service,
    ec.horaires_preferes,
    ec.notes_cuisine
FROM employees e
LEFT JOIN employees_cuisine ec ON e.id = ec.employee_id
WHERE e.id IN (43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71);

-- =====================================================
-- ÉTAPE 2: NOUVEAU SCHÉMA UNIFIÉ
-- =====================================================

-- 1. TABLE EMPLOYÉS CUISINE UNIFIÉ
-- Remplace: employees_cuisine + competences_cuisine + disponibilites
CREATE TABLE IF NOT EXISTS employes_cuisine_unifie (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    photo_url TEXT,
    
    -- HORAIRES HEBDOMADAIRES (remplace disponibilites)
    lundi_debut TIME DEFAULT '08:00:00',
    lundi_fin TIME DEFAULT '17:00:00',
    mardi_debut TIME DEFAULT '08:00:00',
    mardi_fin TIME DEFAULT '17:00:00',
    mercredi_debut TIME DEFAULT '08:00:00',
    mercredi_fin TIME DEFAULT '17:00:00',
    jeudi_debut TIME DEFAULT '08:00:00',
    jeudi_fin TIME DEFAULT '17:00:00',
    vendredi_debut TIME DEFAULT '08:00:00',
    vendredi_fin TIME DEFAULT '17:00:00',
    
    -- COMPÉTENCES VALIDÉES (remplace competences_cuisine)
    cuisine_chaude BOOLEAN DEFAULT FALSE,
    sandwichs BOOLEAN DEFAULT FALSE,
    pain BOOLEAN DEFAULT FALSE,
    jus_fruits BOOLEAN DEFAULT FALSE,
    legumerie BOOLEAN DEFAULT FALSE,
    vaisselle BOOLEAN DEFAULT FALSE,
    cuisine_froide BOOLEAN DEFAULT FALSE,
    chef_sandwichs BOOLEAN DEFAULT FALSE,
    
    -- MÉTADONNÉES
    actif BOOLEAN DEFAULT TRUE,
    notes TEXT,
    date_formation_cuisine DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE PLANNING UNIFIÉ
-- Remplace: planning_cuisine + postes_cuisine + creneaux_cuisine
CREATE TABLE IF NOT EXISTS planning_cuisine_unifie (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employes_cuisine_unifie(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- POSTE (remplace postes_cuisine)
    poste VARCHAR(50) NOT NULL, -- "Cuisine chaude", "Sandwichs", "Pain", etc.
    poste_couleur VARCHAR(20) DEFAULT '#6b7280',
    poste_icone VARCHAR(10) DEFAULT '👨‍🍳',
    
    -- CRÉNEAU (remplace creneaux_cuisine)
    creneau VARCHAR(30) NOT NULL, -- "11h00-11h45", "11h45-12h45", etc.
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    
    -- RÔLE ET PRIORITÉ
    role VARCHAR(50) DEFAULT 'Équipier',
    priorite INTEGER DEFAULT 1, -- 1=Principal, 2=Support, 3=Formation
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(employee_id, date, creneau),
    CHECK (heure_fin > heure_debut)
);

-- 3. TABLE ABSENCES SIMPLIFIÉE
CREATE TABLE IF NOT EXISTS absences_cuisine_unifie (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employes_cuisine_unifie(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    type_absence VARCHAR(50) DEFAULT 'Absent' CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation')),
    motif TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (date_fin >= date_debut)
);

-- =====================================================
-- ÉTAPE 3: VUES UTILES POUR L'INTERFACE
-- =====================================================

-- Vue des absences du jour
CREATE OR REPLACE VIEW absences_aujourd_hui AS
SELECT 
    e.id,
    e.prenom,
    e.nom,
    a.type_absence,
    a.motif
FROM employes_cuisine_unifie e
JOIN absences_cuisine_unifie a ON e.id = a.employee_id
WHERE CURRENT_DATE BETWEEN a.date_debut AND a.date_fin
AND e.actif = TRUE;

-- Vue du planning du jour avec détails employé
CREATE OR REPLACE VIEW planning_aujourd_hui AS
SELECT 
    p.id,
    p.date,
    p.poste,
    p.creneau,
    p.heure_debut,
    p.heure_fin,
    p.role,
    e.prenom,
    e.nom,
    e.photo_url,
    p.poste_couleur,
    p.poste_icone,
    -- Vérification si employé disponible
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM absences_cuisine_unifie a 
            WHERE a.employee_id = e.id 
            AND p.date BETWEEN a.date_debut AND a.date_fin
        ) THEN FALSE 
        ELSE TRUE 
    END AS disponible
FROM planning_cuisine_unifie p
JOIN employes_cuisine_unifie e ON p.employee_id = e.id
WHERE p.date = CURRENT_DATE
ORDER BY p.heure_debut, p.poste;

-- Vue des compétences par employé
CREATE OR REPLACE VIEW competences_employes AS
SELECT 
    id,
    prenom,
    nom,
    cuisine_chaude,
    sandwichs,
    pain,
    jus_fruits,
    legumerie,
    vaisselle,
    cuisine_froide,
    chef_sandwichs,
    -- Comptage des compétences
    (CASE WHEN cuisine_chaude THEN 1 ELSE 0 END +
     CASE WHEN sandwichs THEN 1 ELSE 0 END +
     CASE WHEN pain THEN 1 ELSE 0 END +
     CASE WHEN jus_fruits THEN 1 ELSE 0 END +
     CASE WHEN legumerie THEN 1 ELSE 0 END +
     CASE WHEN vaisselle THEN 1 ELSE 0 END +
     CASE WHEN cuisine_froide THEN 1 ELSE 0 END +
     CASE WHEN chef_sandwichs THEN 1 ELSE 0 END) AS nb_competences
FROM employes_cuisine_unifie
WHERE actif = TRUE;

-- =====================================================
-- ÉTAPE 4: FONCTIONS UTILES
-- =====================================================

-- Fonction pour vérifier si un employé peut être affecté à un poste
CREATE OR REPLACE FUNCTION peut_affecter_poste(p_employee_id INTEGER, p_poste VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    employe_record employes_cuisine_unifie%ROWTYPE;
BEGIN
    SELECT * INTO employe_record 
    FROM employes_cuisine_unifie 
    WHERE id = p_employee_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    RETURN CASE p_poste
        WHEN 'Cuisine chaude' THEN employe_record.cuisine_chaude
        WHEN 'Sandwichs' THEN employe_record.sandwichs
        WHEN 'Pain' THEN employe_record.pain
        WHEN 'Jus de fruits' THEN employe_record.jus_fruits
        WHEN 'Légumerie' THEN employe_record.legumerie
        WHEN 'Vaisselle' THEN employe_record.vaisselle
        WHEN 'Cuisine froide' THEN employe_record.cuisine_froide
        WHEN 'Chef sandwichs' THEN employe_record.chef_sandwichs
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les employés disponibles pour un poste
CREATE OR REPLACE FUNCTION get_employes_disponibles_poste(p_poste VARCHAR, p_date DATE)
RETURNS TABLE (
    employee_id INTEGER,
    prenom VARCHAR,
    nom VARCHAR,
    competent BOOLEAN,
    disponible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.prenom,
        e.nom,
        peut_affecter_poste(e.id, p_poste) as competent,
        NOT EXISTS (
            SELECT 1 FROM absences_cuisine_unifie a 
            WHERE a.employee_id = e.id 
            AND p_date BETWEEN a.date_debut AND a.date_fin
        ) as disponible
    FROM employes_cuisine_unifie e
    WHERE e.actif = TRUE
    ORDER BY peut_affecter_poste(e.id, p_poste) DESC, e.prenom;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÉTAPE 5: MIGRATION DES DONNÉES EXISTANTES
-- =====================================================

-- Migration des employés cuisine
INSERT INTO employes_cuisine_unifie (
    nom, prenom, photo_url, notes, actif
)
SELECT DISTINCT
    COALESCE(e.nom, ''),
    COALESCE(e.prenom, ''),
    COALESCE(ec.photo_url, ''),
    COALESCE(ec.notes_cuisine, ''),
    CASE WHEN e.statut = 'Actif' THEN TRUE ELSE FALSE END
FROM employees e
LEFT JOIN employees_cuisine ec ON e.id = ec.employee_id
WHERE e.id IN (43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71)
ON CONFLICT DO NOTHING;

-- Création d'une table de correspondance pour la migration
CREATE TEMP TABLE correspondance_ids AS
SELECT 
    e.id as ancien_id,
    ecu.id as nouveau_id,
    e.nom,
    e.prenom
FROM employees e
JOIN employes_cuisine_unifie ecu ON (e.nom = ecu.nom AND e.prenom = ecu.prenom)
WHERE e.id IN (43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71);

-- Migration des horaires depuis les disponibilités
UPDATE employes_cuisine_unifie ecu
SET 
    lundi_debut = d.heure_debut,
    lundi_fin = d.heure_fin
FROM correspondance_ids c
JOIN disponibilites d ON c.ancien_id = d.employee_id
WHERE c.nouveau_id = ecu.id AND d.jour_semaine = 1;

UPDATE employes_cuisine_unifie ecu
SET 
    mardi_debut = d.heure_debut,
    mardi_fin = d.heure_fin
FROM correspondance_ids c
JOIN disponibilites d ON c.ancien_id = d.employee_id
WHERE c.nouveau_id = ecu.id AND d.jour_semaine = 2;

UPDATE employes_cuisine_unifie ecu
SET 
    mercredi_debut = d.heure_debut,
    mercredi_fin = d.heure_fin
FROM correspondance_ids c
JOIN disponibilites d ON c.ancien_id = d.employee_id
WHERE c.nouveau_id = ecu.id AND d.jour_semaine = 3;

UPDATE employes_cuisine_unifie ecu
SET 
    jeudi_debut = d.heure_debut,
    jeudi_fin = d.heure_fin
FROM correspondance_ids c
JOIN disponibilites d ON c.ancien_id = d.employee_id
WHERE c.nouveau_id = ecu.id AND d.jour_semaine = 4;

UPDATE employes_cuisine_unifie ecu
SET 
    vendredi_debut = d.heure_debut,
    vendredi_fin = d.heure_fin
FROM correspondance_ids c
JOIN disponibilites d ON c.ancien_id = d.employee_id
WHERE c.nouveau_id = ecu.id AND d.jour_semaine = 5;

-- Migration des compétences
UPDATE employes_cuisine_unifie ecu
SET 
    cuisine_chaude = EXISTS (
        SELECT 1 FROM competences_cuisine cc
        JOIN postes_cuisine pc ON cc.poste_id = pc.id
        JOIN correspondance_ids c ON cc.employee_id = c.ancien_id
        WHERE c.nouveau_id = ecu.id AND pc.nom = 'Cuisine chaude'
    ),
    sandwichs = EXISTS (
        SELECT 1 FROM competences_cuisine cc
        JOIN postes_cuisine pc ON cc.poste_id = pc.id
        JOIN correspondance_ids c ON cc.employee_id = c.ancien_id
        WHERE c.nouveau_id = ecu.id AND pc.nom = 'Sandwichs'
    ),
    pain = EXISTS (
        SELECT 1 FROM competences_cuisine cc
        JOIN postes_cuisine pc ON cc.poste_id = pc.id
        JOIN correspondance_ids c ON cc.employee_id = c.ancien_id
        WHERE c.nouveau_id = ecu.id AND pc.nom = 'Pain'
    ),
    jus_fruits = EXISTS (
        SELECT 1 FROM competences_cuisine cc
        JOIN postes_cuisine pc ON cc.poste_id = pc.id
        JOIN correspondance_ids c ON cc.employee_id = c.ancien_id
        WHERE c.nouveau_id = ecu.id AND pc.nom = 'Jus de fruits'
    ),
    legumerie = EXISTS (
        SELECT 1 FROM competences_cuisine cc
        JOIN postes_cuisine pc ON cc.poste_id = pc.id
        JOIN correspondance_ids c ON cc.employee_id = c.ancien_id
        WHERE c.nouveau_id = ecu.id AND pc.nom = 'Légumerie'
    ),
    vaisselle = EXISTS (
        SELECT 1 FROM competences_cuisine cc
        JOIN postes_cuisine pc ON cc.poste_id = pc.id
        JOIN correspondance_ids c ON cc.employee_id = c.ancien_id
        WHERE c.nouveau_id = ecu.id AND pc.nom = 'Vaisselle'
    ),
    cuisine_froide = EXISTS (
        SELECT 1 FROM competences_cuisine cc
        JOIN postes_cuisine pc ON cc.poste_id = pc.id
        JOIN correspondance_ids c ON cc.employee_id = c.ancien_id
        WHERE c.nouveau_id = ecu.id AND pc.nom = 'Cuisine froide'
    ),
    chef_sandwichs = EXISTS (
        SELECT 1 FROM competences_cuisine cc
        JOIN postes_cuisine pc ON cc.poste_id = pc.id
        JOIN correspondance_ids c ON cc.employee_id = c.ancien_id
        WHERE c.nouveau_id = ecu.id AND pc.nom = 'Chef sandwichs'
    );

-- Migration des absences
INSERT INTO absences_cuisine_unifie (employee_id, date_debut, date_fin, type_absence, motif)
SELECT 
    c.nouveau_id,
    ac.date_debut,
    ac.date_fin,
    ac.type_absence,
    ac.motif
FROM absences_cuisine ac
JOIN correspondance_ids c ON ac.employee_id = c.ancien_id;

-- =====================================================
-- ÉTAPE 6: INDEX ET OPTIMISATIONS
-- =====================================================

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_employes_cuisine_unifie_actif ON employes_cuisine_unifie(actif);
CREATE INDEX IF NOT EXISTS idx_planning_cuisine_unifie_date ON planning_cuisine_unifie(date);
CREATE INDEX IF NOT EXISTS idx_planning_cuisine_unifie_employee ON planning_cuisine_unifie(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_unifie_dates ON absences_cuisine_unifie(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_unifie_employee ON absences_cuisine_unifie(employee_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employes_cuisine_unifie_updated_at 
    BEFORE UPDATE ON employes_cuisine_unifie 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÉTAPE 7: POLITIQUES DE SÉCURITÉ (RLS)
-- =====================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE employes_cuisine_unifie ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_cuisine_unifie ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences_cuisine_unifie ENABLE ROW LEVEL SECURITY;

-- Politiques permissives pour l'instant (à ajuster selon besoins)
CREATE POLICY "Accès lecture employes_cuisine_unifie" ON employes_cuisine_unifie FOR SELECT USING (true);
CREATE POLICY "Accès lecture planning_cuisine_unifie" ON planning_cuisine_unifie FOR SELECT USING (true);
CREATE POLICY "Accès lecture absences_cuisine_unifie" ON absences_cuisine_unifie FOR SELECT USING (true);

-- =====================================================
-- ÉTAPE 8: DONNÉES D'EXEMPLE POUR LES POSTES
-- =====================================================

-- Insérer quelques créneaux d'exemple dans le planning
INSERT INTO planning_cuisine_unifie (employee_id, date, poste, poste_couleur, poste_icone, creneau, heure_debut, heure_fin) VALUES
(1, CURRENT_DATE, 'Cuisine chaude', '#dc2626', '🔥', '11h00-11h45', '11:00:00', '11:45:00'),
(2, CURRENT_DATE, 'Sandwichs', '#f59e0b', '🥪', '11h00-11h45', '11:00:00', '11:45:00'),
(3, CURRENT_DATE, 'Légumerie', '#10b981', '🥬', '08h00-10h00', '08:00:00', '10:00:00')
ON CONFLICT DO NOTHING;

-- =====================================================
-- RAPPORT DE MIGRATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION TERMINÉE ===';
    RAISE NOTICE 'Employés migrés: %', (SELECT COUNT(*) FROM employes_cuisine_unifie);
    RAISE NOTICE 'Absences migrées: %', (SELECT COUNT(*) FROM absences_cuisine_unifie);
    RAISE NOTICE '';
    RAISE NOTICE 'NOUVELLES TABLES CRÉÉES:';
    RAISE NOTICE '- employes_cuisine_unifie (profils complets)';
    RAISE NOTICE '- planning_cuisine_unifie (planning simplifié)';
    RAISE NOTICE '- absences_cuisine_unifie (absences simplifiées)';
    RAISE NOTICE '';
    RAISE NOTICE 'VUES DISPONIBLES:';
    RAISE NOTICE '- absences_aujourd_hui';
    RAISE NOTICE '- planning_aujourd_hui';
    RAISE NOTICE '- competences_employes';
    RAISE NOTICE '';
    RAISE NOTICE 'FONCTIONS DISPONIBLES:';
    RAISE NOTICE '- peut_affecter_poste(employee_id, poste)';
    RAISE NOTICE '- get_employes_disponibles_poste(poste, date)';
END $$; 