-- =====================================================
-- NOUVEAU SYSTÈME CUISINE - DONNÉES RÉELLES
-- =====================================================
-- Script propre avec les vraies données du tableau Excel
-- Date: 2025-01-15

-- =====================================================
-- ÉTAPE 1: CRÉATION DES TABLES PROPRES
-- =====================================================

-- Suppression propre (pas de migration complexe)
DROP VIEW IF EXISTS planning_lisible CASCADE;
DROP VIEW IF EXISTS absences_lisibles CASCADE;
DROP VIEW IF EXISTS planning_aujourdhui CASCADE;
DROP VIEW IF EXISTS absences_aujourdhui CASCADE;
DROP VIEW IF EXISTS competences_employes CASCADE;

DROP FUNCTION IF EXISTS peut_affecter_poste(INTEGER, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_employes_disponibles_poste(VARCHAR, DATE) CASCADE;
DROP FUNCTION IF EXISTS ajouter_absence(VARCHAR, DATE, DATE, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Créer les nouvelles tables avec un suffixe pour éviter les conflits
CREATE TABLE employes_cuisine_new (
    id SERIAL PRIMARY KEY,
    prenom VARCHAR(100) NOT NULL,
    langue_parlee VARCHAR(100),
    photo_url TEXT,
    
    -- HORAIRES HEBDOMADAIRES (par défaut 8h-16h sauf exceptions)
    lundi_debut TIME DEFAULT '08:00:00',
    lundi_fin TIME DEFAULT '16:00:00',
    mardi_debut TIME DEFAULT '08:00:00',
    mardi_fin TIME DEFAULT '16:00:00',
    mercredi_debut TIME DEFAULT '08:00:00',
    mercredi_fin TIME DEFAULT '16:00:00',
    jeudi_debut TIME DEFAULT '08:00:00',
    jeudi_fin TIME DEFAULT '16:00:00',
    vendredi_debut TIME DEFAULT '08:00:00',
    vendredi_fin TIME DEFAULT '16:00:00',
    
    -- COMPÉTENCES VALIDÉES (true/false)
    cuisine_chaude BOOLEAN DEFAULT FALSE,
    cuisine_froide BOOLEAN DEFAULT FALSE,
    chef_sandwichs BOOLEAN DEFAULT FALSE,
    sandwichs BOOLEAN DEFAULT FALSE,
    vaisselle BOOLEAN DEFAULT FALSE,
    legumerie BOOLEAN DEFAULT FALSE,
    equipe_pina_saskia BOOLEAN DEFAULT FALSE, -- BA triage congelé
    
    -- MÉTADONNÉES
    actif BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table planning avec la bonne structure
CREATE TABLE planning_cuisine_new (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employes_cuisine_new(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- POSTE
    poste VARCHAR(50) NOT NULL,
    poste_couleur VARCHAR(20) DEFAULT '#6b7280',
    poste_icone VARCHAR(10) DEFAULT '👨‍🍳',
    
    -- CRÉNEAU
    creneau VARCHAR(30) NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    
    -- MÉTADONNÉES
    role VARCHAR(50) DEFAULT 'Équipier',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(employee_id, date, creneau),
    CHECK (heure_fin > heure_debut)
);

-- Table absences
CREATE TABLE absences_cuisine_new (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employes_cuisine_new(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    type_absence VARCHAR(50) DEFAULT 'Absent' CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation')),
    motif TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (date_fin >= date_debut)
);

-- =====================================================
-- ÉTAPE 2: INSERTION DES VRAIES DONNÉES
-- =====================================================

INSERT INTO employes_cuisine_new (
    prenom, 
    langue_parlee,
    lundi_debut, lundi_fin, mardi_debut, mardi_fin, mercredi_debut, mercredi_fin, 
    jeudi_debut, jeudi_fin, vendredi_debut, vendredi_fin,
    cuisine_chaude, cuisine_froide, chef_sandwichs, sandwichs, vaisselle, legumerie, equipe_pina_saskia,
    actif
) VALUES 
    -- Salah - Arabe - Cuisine chaude, froide, Chef sandwichs, Sandwichs, Vaisselle, Légumerie
    ('Salah', 'Arabe', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, true, true, true, true, true, false, true),
    
    -- Majda - Yougoslave - Cuisine chaude, Sandwichs, Vaisselle, Légumerie
    ('Majda', 'Yougoslave', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, false, true, true, true, false, true),
    
    -- Mahmoud - Arabe - Cuisine chaude, froide, Sandwichs, Vaisselle, Légumerie
    ('Mahmoud', 'Arabe', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, true, false, true, true, true, false, true),
    
    -- Mohammad - Arabe - Sandwichs, Vaisselle, Légumerie
    ('Mohammad', 'Arabe', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', false, false, false, true, true, true, false, true),
    
    -- Amar - Arabe - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Amar', 'Arabe', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Haile - Tigrinya - Cuisine chaude, Sandwichs, Vaisselle, Légumerie
    ('Haile', 'Tigrinya', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, false, true, true, true, false, true),
    
    -- Aissatou - Guinéen - Cuisine chaude, froide, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Aissatou', 'Guinéen', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, true, true, true, true, true, false, true),
    
    -- Halimatou - Guinéen - Sandwichs, Vaisselle, Légumerie
    ('Halimatou', 'Guinéen', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', false, false, false, true, true, true, false, true),
    
    -- Djiatou - Guinéen - Cuisine chaude, Sandwichs, Vaisselle, Légumerie
    ('Djiatou', 'Guinéen', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, false, true, true, true, false, true),
    
    -- Abdul - Bengali - Cuisine chaude (xx), Sandwichs, Vaisselle, Chef sandwichs, Légumerie (10-16)
    ('Abdul', 'Bengali', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Fatumata - Guinéen - Cuisine chaude, froide, Sandwichs, Vaisselle, Légumerie (10-16)
    ('Fatumata', 'Guinéen', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', true, true, false, true, true, true, false, true),
    
    -- Giovanna - Français - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Giovanna', 'Français', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Carla - Portugais - Sandwichs, Vaisselle, Légumerie (8-14)
    ('Carla', 'Portugais', '08:00', '14:00', '08:00', '14:00', '08:00', '14:00', '08:00', '14:00', '08:00', '14:00', false, false, false, true, true, true, false, true),
    
    -- Liliana - Français - Cuisine chaude, Sandwichs, Vaisselle, Légumerie
    ('Liliana', 'Français', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, false, true, true, true, false, true),
    
    -- Djenabou - Guinéen - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Djenabou', 'Guinéen', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Harissatou - Guinéen - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Harissatou', 'Guinéen', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Oumou - Guinéen - Sandwichs, Vaisselle, Légumerie
    ('Oumou', 'Guinéen', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', false, false, false, true, true, true, false, true),
    
    -- Jurom - Tigrinya - Vaisselle, Chef sandwichs, Légumerie (10-16)
    ('Jurom', 'Tigrinya', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', '10:00', '16:00', false, false, true, false, true, true, false, true),
    
    -- Maria - Portugais - Sandwichs, Vaisselle, Chef sandwichs, Légumerie (8-12)
    ('Maria', 'Portugais', '08:00', '12:00', '08:00', '12:00', '08:00', '12:00', '08:00', '12:00', '08:00', '12:00', false, false, true, true, true, true, false, true),
    
    -- Kifle - Tigrinya - Cuisine chaude, Sandwichs, Vaisselle, Légumerie
    ('Kifle', 'Tigrinya', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, false, true, true, true, false, true),
    
    -- Hayle Almedom - Tigrinya - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Hayle Almedom', 'Tigrinya', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Yeman - Tigrinya - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Yeman', 'Tigrinya', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Nesrin - Syrien - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Nesrin', 'Syrien', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Charif - Syrien - Cuisine chaude, froide, Sandwichs, Vaisselle, Chef sandwichs, Légumerie (8-12)
    ('Charif', 'Syrien', '08:00', '12:00', '08:00', '12:00', '08:00', '12:00', '08:00', '12:00', '08:00', '12:00', true, true, true, true, true, true, false, true),
    
    -- Elsa - Portugais - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Elsa', 'Portugais', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Magali - Français - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie (sauf vendredi)
    ('Magali', 'Français', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', NULL, NULL, true, false, true, true, true, true, false, true),
    
    -- Niyat - Tigrinya - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Niyat', 'Tigrinya', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Yvette - Français - Cuisine chaude, Sandwichs, Vaisselle, Légumerie
    ('Yvette', 'Français', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, false, true, true, true, false, true),
    
    -- Azmera - Tigrinya - Cuisine chaude, Sandwichs, Vaisselle, Chef sandwichs, Légumerie
    ('Azmera', 'Tigrinya', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', true, false, true, true, true, true, false, true),
    
    -- Pina - Équipe Pina et Saskia (BA triage congelé)
    ('Pina', 'Français', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', false, false, false, false, false, false, true, true),
    
    -- Saskia - Équipe Pina et Saskia (BA triage congelé)
    ('Saskia', 'Français', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', '08:00', '16:00', false, false, false, false, false, false, true, true);

-- =====================================================
-- ÉTAPE 3: CRÉATION DES VUES FONCTIONNELLES
-- =====================================================

-- Vue planning avec prénoms (utilise les nouvelles tables)
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
FROM planning_cuisine_new p
JOIN employes_cuisine_new e ON p.employee_id = e.id
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
FROM absences_cuisine_new a
JOIN employes_cuisine_new e ON a.employee_id = e.id
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

-- Vue compétences par employé (mise à jour avec les nouvelles compétences)
CREATE VIEW competences_employes AS
SELECT 
    id,
    prenom,
    langue_parlee,
    cuisine_chaude,
    cuisine_froide,
    chef_sandwichs,
    sandwichs,
    vaisselle,
    legumerie,
    equipe_pina_saskia,
    -- Comptage automatique des compétences
    (CASE WHEN cuisine_chaude THEN 1 ELSE 0 END +
     CASE WHEN cuisine_froide THEN 1 ELSE 0 END +
     CASE WHEN chef_sandwichs THEN 1 ELSE 0 END +
     CASE WHEN sandwichs THEN 1 ELSE 0 END +
     CASE WHEN vaisselle THEN 1 ELSE 0 END +
     CASE WHEN legumerie THEN 1 ELSE 0 END +
     CASE WHEN equipe_pina_saskia THEN 1 ELSE 0 END) AS nb_competences
FROM employes_cuisine_new
WHERE actif = TRUE
ORDER BY nb_competences DESC, prenom;

-- =====================================================
-- ÉTAPE 4: FONCTIONS UTILES (mises à jour)
-- =====================================================

-- Fonction pour vérifier si un employé peut être affecté à un poste
CREATE FUNCTION peut_affecter_poste(p_employee_id INTEGER, p_poste VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    employe_record employes_cuisine_new%ROWTYPE;
BEGIN
    SELECT * INTO employe_record 
    FROM employes_cuisine_new 
    WHERE id = p_employee_id AND actif = TRUE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    RETURN CASE p_poste
        WHEN 'Cuisine chaude' THEN employe_record.cuisine_chaude
        WHEN 'Cuisine froide' THEN employe_record.cuisine_froide
        WHEN 'Chef sandwichs' THEN employe_record.chef_sandwichs
        WHEN 'Sandwichs' THEN employe_record.sandwichs
        WHEN 'Vaisselle' THEN employe_record.vaisselle
        WHEN 'Légumerie' THEN employe_record.legumerie
        WHEN 'Équipe Pina et Saskia' THEN employe_record.equipe_pina_saskia
        WHEN 'BA triage congelé' THEN employe_record.equipe_pina_saskia
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les employés disponibles pour un poste
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
            SELECT 1 FROM absences_cuisine_new a 
            WHERE a.employee_id = e.id 
            AND p_date BETWEEN a.date_debut AND a.date_fin
        ) as disponible
    FROM employes_cuisine_new e
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
    FROM employes_cuisine_new 
    WHERE prenom ILIKE p_prenom AND actif = TRUE 
    LIMIT 1;
    
    IF employee_id IS NULL THEN
        RAISE EXCEPTION 'Employé % non trouvé', p_prenom;
    END IF;
    
    INSERT INTO absences_cuisine_new (employee_id, date_debut, date_fin, type_absence, motif)
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

CREATE TRIGGER update_employes_cuisine_new_updated_at 
    BEFORE UPDATE ON employes_cuisine_new 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÉTAPE 5: INDEX ET OPTIMISATIONS
-- =====================================================

CREATE INDEX idx_employes_cuisine_new_actif ON employes_cuisine_new(actif);
CREATE INDEX idx_employes_cuisine_new_prenom ON employes_cuisine_new(prenom);
CREATE INDEX idx_planning_cuisine_new_date ON planning_cuisine_new(date);
CREATE INDEX idx_planning_cuisine_new_employee ON planning_cuisine_new(employee_id);
CREATE INDEX idx_absences_cuisine_new_dates ON absences_cuisine_new(date_debut, date_fin);
CREATE INDEX idx_absences_cuisine_new_employee ON absences_cuisine_new(employee_id);

-- =====================================================
-- RAPPORT FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 SYSTÈME CUISINE CRÉÉ AVEC VRAIES DONNÉES !';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tables créées:';
    RAISE NOTICE '   ✅ employes_cuisine_new: % employés', (SELECT COUNT(*) FROM employes_cuisine_new);
    RAISE NOTICE '   ✅ planning_cuisine_new: % plannings', (SELECT COUNT(*) FROM planning_cuisine_new);
    RAISE NOTICE '   ✅ absences_cuisine_new: % absences', (SELECT COUNT(*) FROM absences_cuisine_new);
    RAISE NOTICE '';
    RAISE NOTICE '👥 Employés par compétence:';
    RAISE NOTICE '   🔥 Cuisine chaude: %', (SELECT COUNT(*) FROM employes_cuisine_new WHERE cuisine_chaude = true);
    RAISE NOTICE '   ❄️  Cuisine froide: %', (SELECT COUNT(*) FROM employes_cuisine_new WHERE cuisine_froide = true);
    RAISE NOTICE '   👨‍🍳 Chef sandwichs: %', (SELECT COUNT(*) FROM employes_cuisine_new WHERE chef_sandwichs = true);
    RAISE NOTICE '   🥪 Sandwichs: %', (SELECT COUNT(*) FROM employes_cuisine_new WHERE sandwichs = true);
    RAISE NOTICE '   🍽️  Vaisselle: %', (SELECT COUNT(*) FROM employes_cuisine_new WHERE vaisselle = true);
    RAISE NOTICE '   🥬 Légumerie: %', (SELECT COUNT(*) FROM employes_cuisine_new WHERE legumerie = true);
    RAISE NOTICE '   🧊 Équipe Pina et Saskia: %', (SELECT COUNT(*) FROM employes_cuisine_new WHERE equipe_pina_saskia = true);
    RAISE NOTICE '';
    RAISE NOTICE '📝 POUR TESTER:';
    RAISE NOTICE '   SELECT * FROM competences_employes;';
    RAISE NOTICE '   SELECT * FROM planning_lisible;';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  PROCHAINE ÉTAPE: Modifier le frontend pour utiliser les tables *_new';
END $$; 