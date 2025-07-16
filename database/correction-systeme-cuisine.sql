-- =====================================================
-- CORRECTION DU SYSTÈME CUISINE
-- =====================================================
-- Ce script corrige les erreurs de structure

-- ÉTAPE 1: Suppression des vues (dans l'ordre)
DROP VIEW IF EXISTS planning_lisible CASCADE;
DROP VIEW IF EXISTS absences_lisibles CASCADE;
DROP VIEW IF EXISTS planning_aujourdhui CASCADE;
DROP VIEW IF EXISTS absences_aujourdhui CASCADE;
DROP VIEW IF EXISTS competences_employes CASCADE;

-- ÉTAPE 2: Suppression des fonctions
DROP FUNCTION IF EXISTS peut_affecter_poste(INTEGER, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_employes_disponibles_poste(VARCHAR, DATE) CASCADE;
DROP FUNCTION IF EXISTS ajouter_absence(VARCHAR, DATE, DATE, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ÉTAPE 3: Sauvegarde des données existantes (si nécessaire)
CREATE TEMP TABLE backup_planning AS 
SELECT * FROM planning_cuisine WHERE true;

CREATE TEMP TABLE backup_absences AS 
SELECT * FROM absences_cuisine WHERE true;

CREATE TEMP TABLE backup_employes AS 
SELECT * FROM employes_cuisine WHERE true;

-- ÉTAPE 4: Suppression des tables
DROP TABLE IF EXISTS planning_cuisine CASCADE;
DROP TABLE IF EXISTS absences_cuisine CASCADE;
DROP TABLE IF EXISTS employes_cuisine CASCADE;

-- ÉTAPE 5: Recréation propre des tables

-- 1. TABLE EMPLOYÉS CUISINE
CREATE TABLE employes_cuisine (
    id SERIAL PRIMARY KEY,
    prenom VARCHAR(100) NOT NULL, -- "Jean M.", "Marie L.", etc.
    photo_url TEXT,
    
    -- HORAIRES HEBDOMADAIRES
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
    
    -- COMPÉTENCES VALIDÉES (true/false)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE PLANNING CUISINE
CREATE TABLE planning_cuisine (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employes_cuisine(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- POSTE (colonne manquante dans l'ancien système)
    poste VARCHAR(50) NOT NULL, -- "Cuisine chaude", "Sandwichs", etc.
    poste_couleur VARCHAR(20) DEFAULT '#6b7280',
    poste_icone VARCHAR(10) DEFAULT '👨‍🍳',
    
    -- CRÉNEAU
    creneau VARCHAR(30) NOT NULL, -- "11h00-11h45", etc.
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    
    -- MÉTADONNÉES
    role VARCHAR(50) DEFAULT 'Équipier',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CONTRAINTES
    UNIQUE(employee_id, date, creneau),
    CHECK (heure_fin > heure_debut)
);

-- 3. TABLE ABSENCES CUISINE
CREATE TABLE absences_cuisine (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employes_cuisine(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    type_absence VARCHAR(50) DEFAULT 'Absent' CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation')),
    motif TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (date_fin >= date_debut)
);

-- ÉTAPE 6: Restauration des données sauvegardées
INSERT INTO employes_cuisine 
SELECT * FROM backup_employes
ON CONFLICT DO NOTHING;

-- Pour le planning, on doit mapper les anciennes données vers la nouvelle structure
DO $$
BEGIN
    -- Si l'ancienne table avait des données sans la colonne "poste"
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'backup_planning') THEN
        -- Insérer avec un poste par défaut ou essayer de le déduire
        INSERT INTO planning_cuisine (employee_id, date, poste, poste_couleur, poste_icone, creneau, heure_debut, heure_fin, role, notes, created_at)
        SELECT 
            employee_id,
            date,
            COALESCE('Cuisine générale') as poste, -- Poste par défaut
            COALESCE(poste_couleur, '#6b7280') as poste_couleur,
            COALESCE(poste_icone, '👨‍🍳') as poste_icone,
            creneau,
            heure_debut,
            heure_fin,
            COALESCE(role, 'Équipier') as role,
            notes,
            created_at
        FROM backup_planning
        WHERE employee_id IN (SELECT id FROM employes_cuisine)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Planning restauré avec postes par défaut';
    END IF;
END $$;

INSERT INTO absences_cuisine 
SELECT * FROM backup_absences 
WHERE employee_id IN (SELECT id FROM employes_cuisine)
ON CONFLICT DO NOTHING;

-- ÉTAPE 7: Recréation des vues

-- Vue planning avec prénoms
CREATE VIEW planning_lisible AS
SELECT 
    p.id,
    p.date,
    p.poste,
    p.creneau,
    p.heure_debut,
    p.heure_fin,
    p.role,
    p.poste_couleur,
    p.poste_icone,
    e.prenom,
    e.photo_url,
    p.notes,
    p.created_at
FROM planning_cuisine p
JOIN employes_cuisine e ON p.employee_id = e.id
WHERE e.actif = TRUE;

-- Vue absences avec prénoms
CREATE VIEW absences_lisibles AS
SELECT 
    a.id,
    a.date_debut,
    a.date_fin,
    a.type_absence,
    a.motif,
    e.prenom,
    a.created_at
FROM absences_cuisine a
JOIN employes_cuisine e ON a.employee_id = e.id
WHERE e.actif = TRUE;

-- Vue planning du jour
CREATE VIEW planning_aujourdhui AS
SELECT *
FROM planning_lisible
WHERE date = CURRENT_DATE
ORDER BY heure_debut, poste;

-- Vue absences du jour
CREATE VIEW absences_aujourdhui AS
SELECT 
    prenom,
    type_absence,
    motif
FROM absences_lisibles
WHERE CURRENT_DATE BETWEEN date_debut AND date_fin;

-- Vue compétences par employé
CREATE VIEW competences_employes AS
SELECT 
    id,
    prenom,
    cuisine_chaude,
    sandwichs,
    pain,
    jus_fruits,
    legumerie,
    vaisselle,
    cuisine_froide,
    chef_sandwichs,
    (CASE WHEN cuisine_chaude THEN 1 ELSE 0 END +
     CASE WHEN sandwichs THEN 1 ELSE 0 END +
     CASE WHEN pain THEN 1 ELSE 0 END +
     CASE WHEN jus_fruits THEN 1 ELSE 0 END +
     CASE WHEN legumerie THEN 1 ELSE 0 END +
     CASE WHEN vaisselle THEN 1 ELSE 0 END +
     CASE WHEN cuisine_froide THEN 1 ELSE 0 END +
     CASE WHEN chef_sandwichs THEN 1 ELSE 0 END) AS nb_competences
FROM employes_cuisine
WHERE actif = TRUE
ORDER BY nb_competences DESC, prenom;

-- ÉTAPE 8: Recréation des fonctions

-- Fonction pour vérifier si un employé peut être affecté à un poste
CREATE FUNCTION peut_affecter_poste(p_employee_id INTEGER, p_poste VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    employe_record employes_cuisine%ROWTYPE;
BEGIN
    SELECT * INTO employe_record 
    FROM employes_cuisine 
    WHERE id = p_employee_id AND actif = TRUE;
    
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

-- Fonction pour obtenir les employés disponibles
CREATE FUNCTION get_employes_disponibles_poste(p_poste VARCHAR, p_date DATE)
RETURNS TABLE (
    employee_id INTEGER,
    prenom VARCHAR,
    competent BOOLEAN,
    disponible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.prenom,
        peut_affecter_poste(e.id, p_poste) as competent,
        NOT EXISTS (
            SELECT 1 FROM absences_cuisine a 
            WHERE a.employee_id = e.id 
            AND p_date BETWEEN a.date_debut AND a.date_fin
        ) as disponible
    FROM employes_cuisine e
    WHERE e.actif = TRUE
    ORDER BY peut_affecter_poste(e.id, p_poste) DESC, e.prenom;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour ajouter une absence
CREATE FUNCTION ajouter_absence(
    p_prenom VARCHAR,
    p_date_debut DATE,
    p_date_fin DATE,
    p_type VARCHAR DEFAULT 'Absent',
    p_motif TEXT DEFAULT ''
) RETURNS INTEGER AS $$
DECLARE
    employee_id INTEGER;
    absence_id INTEGER;
BEGIN
    SELECT id INTO employee_id 
    FROM employes_cuisine 
    WHERE prenom ILIKE p_prenom AND actif = TRUE 
    LIMIT 1;
    
    IF employee_id IS NULL THEN
        RAISE EXCEPTION 'Employé % non trouvé', p_prenom;
    END IF;
    
    INSERT INTO absences_cuisine (employee_id, date_debut, date_fin, type_absence, motif)
    VALUES (employee_id, p_date_debut, p_date_fin, p_type, p_motif)
    RETURNING id INTO absence_id;
    
    RETURN absence_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employes_cuisine_updated_at 
    BEFORE UPDATE ON employes_cuisine 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ÉTAPE 9: Index et optimisations
CREATE INDEX idx_employes_cuisine_actif ON employes_cuisine(actif);
CREATE INDEX idx_employes_cuisine_prenom ON employes_cuisine(prenom);
CREATE INDEX idx_planning_cuisine_date ON planning_cuisine(date);
CREATE INDEX idx_planning_cuisine_employee ON planning_cuisine(employee_id);
CREATE INDEX idx_absences_cuisine_dates ON absences_cuisine(date_debut, date_fin);
CREATE INDEX idx_absences_cuisine_employee ON absences_cuisine(employee_id);

-- RAPPORT FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ CORRECTION TERMINÉE !';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tables corrigées:';
    RAISE NOTICE '   - employes_cuisine: % employés', (SELECT COUNT(*) FROM employes_cuisine);
    RAISE NOTICE '   - planning_cuisine: % plannings', (SELECT COUNT(*) FROM planning_cuisine);
    RAISE NOTICE '   - absences_cuisine: % absences', (SELECT COUNT(*) FROM absences_cuisine);
    RAISE NOTICE '';
    RAISE NOTICE '👁️  Vues fonctionnelles:';
    RAISE NOTICE '   - planning_lisible ✅';
    RAISE NOTICE '   - absences_lisibles ✅';
    RAISE NOTICE '   - planning_aujourdhui ✅';
    RAISE NOTICE '   - absences_aujourdhui ✅';
    RAISE NOTICE '   - competences_employes ✅';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SYSTÈME CORRIGÉ ET PRÊT !';
END $$; 