-- =====================================================
-- NOUVEAU SYSTÈME CUISINE SIMPLIFIÉ
-- =====================================================
-- 3 tables propres + vues lisibles
-- Date: 2025-01-15
-- Objectif: Maximum de simplicité pour les utilisateurs

-- =====================================================
-- ÉTAPE 1: CRÉATION DES 3 TABLES PRINCIPALES
-- =====================================================

-- 1. TABLE EMPLOYÉS CUISINE (tout-en-un)
CREATE TABLE IF NOT EXISTS employes_cuisine (
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

-- 2. TABLE PLANNING CUISINE (références propres)
CREATE TABLE IF NOT EXISTS planning_cuisine (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employes_cuisine(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- POSTE
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

-- 3. TABLE ABSENCES CUISINE (références propres)
CREATE TABLE IF NOT EXISTS absences_cuisine (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employes_cuisine(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    type_absence VARCHAR(50) DEFAULT 'Absent' CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation')),
    motif TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (date_fin >= date_debut)
);

-- =====================================================
-- ÉTAPE 2: VUES LISIBLES (avec prénoms automatiques)
-- =====================================================

-- Vue planning avec prénoms
CREATE OR REPLACE VIEW planning_lisible AS
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
CREATE OR REPLACE VIEW absences_lisibles AS
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

-- Vue planning du jour (très utile au quotidien)
CREATE OR REPLACE VIEW planning_aujourdhui AS
SELECT *
FROM planning_lisible
WHERE date = CURRENT_DATE
ORDER BY heure_debut, poste;

-- Vue absences du jour
CREATE OR REPLACE VIEW absences_aujourdhui AS
SELECT 
    prenom,
    type_absence,
    motif
FROM absences_lisibles
WHERE CURRENT_DATE BETWEEN date_debut AND date_fin;

-- Vue compétences par employé
CREATE OR REPLACE VIEW competences_employes AS
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
    -- Comptage automatique des compétences
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

-- =====================================================
-- ÉTAPE 3: FONCTIONS UTILES
-- =====================================================

-- Fonction pour vérifier si un employé peut être affecté à un poste
CREATE OR REPLACE FUNCTION peut_affecter_poste(p_employee_id INTEGER, p_poste VARCHAR)
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

-- Fonction pour obtenir les employés disponibles pour un poste à une date
CREATE OR REPLACE FUNCTION get_employes_disponibles_poste(p_poste VARCHAR, p_date DATE)
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

-- Fonction pour ajouter rapidement une absence
CREATE OR REPLACE FUNCTION ajouter_absence(
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
    -- Trouver l'employé par prénom
    SELECT id INTO employee_id 
    FROM employes_cuisine 
    WHERE prenom ILIKE p_prenom AND actif = TRUE 
    LIMIT 1;
    
    IF employee_id IS NULL THEN
        RAISE EXCEPTION 'Employé % non trouvé', p_prenom;
    END IF;
    
    -- Insérer l'absence
    INSERT INTO absences_cuisine (employee_id, date_debut, date_fin, type_absence, motif)
    VALUES (employee_id, p_date_debut, p_date_fin, p_type, p_motif)
    RETURNING id INTO absence_id;
    
    RETURN absence_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÉTAPE 4: MIGRATION DES DONNÉES EXISTANTES
-- =====================================================

-- Migration des employés avec formation du prénom
INSERT INTO employes_cuisine (prenom, photo_url, actif)
SELECT DISTINCT
    CASE 
        WHEN e.nom IS NOT NULL THEN
            CASE 
                WHEN LENGTH(e.nom) > 0 THEN 
                    CASE
                        -- Essayer de créer "Prénom Initiale" s'il y a un prénom dans la table employees
                        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'prenom')
                             AND LENGTH(COALESCE((SELECT prenom FROM employees e2 WHERE e2.id = e.id), '')) > 0 THEN
                            (SELECT prenom FROM employees e2 WHERE e2.id = e.id) || ' ' || LEFT(e.nom, 1) || '.'
                        ELSE
                            -- Sinon utiliser juste le nom
                            e.nom
                    END
                ELSE 'Employé ' || e.id::text
            END
        ELSE 'Employé ' || e.id::text
    END as prenom_formate,
    COALESCE(ec.photo_url, ''),
    CASE WHEN e.statut = 'Actif' THEN TRUE ELSE FALSE END
FROM employees e
LEFT JOIN employees_cuisine ec ON e.id = ec.employee_id
WHERE e.id IN (43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71)
ON CONFLICT DO NOTHING;

-- Table de correspondance pour la migration
CREATE TEMP TABLE correspondance_migration AS
SELECT 
    e.id as ancien_id,
    ec_new.id as nouveau_id,
    e.nom,
    ec_new.prenom
FROM employees e
JOIN employes_cuisine ec_new ON (
    ec_new.prenom LIKE '%' || e.nom || '%' OR
    ec_new.prenom LIKE e.nom || '%'
)
WHERE e.id IN (43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71);

-- Migration des horaires (si disponibles)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'disponibilites') THEN
        -- Mettre à jour les horaires pour chaque jour
        FOR day_num IN 1..5 LOOP
            EXECUTE format('
                UPDATE employes_cuisine ec
                SET %I = d.heure_debut,
                    %I = d.heure_fin
                FROM correspondance_migration c
                JOIN disponibilites d ON c.ancien_id = d.employee_id
                WHERE c.nouveau_id = ec.id AND d.jour_semaine = %s',
                CASE day_num 
                    WHEN 1 THEN 'lundi_debut'
                    WHEN 2 THEN 'mardi_debut'
                    WHEN 3 THEN 'mercredi_debut'
                    WHEN 4 THEN 'jeudi_debut'
                    WHEN 5 THEN 'vendredi_debut'
                END,
                CASE day_num 
                    WHEN 1 THEN 'lundi_fin'
                    WHEN 2 THEN 'mardi_fin'
                    WHEN 3 THEN 'mercredi_fin'
                    WHEN 4 THEN 'jeudi_fin'
                    WHEN 5 THEN 'vendredi_fin'
                END,
                day_num
            );
        END LOOP;
        RAISE NOTICE 'Migration des horaires terminée';
    END IF;
END $$;

-- Migration des compétences (si disponibles)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'competences_cuisine') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'postes_cuisine') THEN
        
        UPDATE employes_cuisine ec
        SET 
            cuisine_chaude = EXISTS (
                SELECT 1 FROM competences_cuisine cc
                JOIN postes_cuisine pc ON cc.poste_id = pc.id
                JOIN correspondance_migration c ON cc.employee_id = c.ancien_id
                WHERE c.nouveau_id = ec.id AND pc.nom = 'Cuisine chaude'
            ),
            sandwichs = EXISTS (
                SELECT 1 FROM competences_cuisine cc
                JOIN postes_cuisine pc ON cc.poste_id = pc.id
                JOIN correspondance_migration c ON cc.employee_id = c.ancien_id
                WHERE c.nouveau_id = ec.id AND pc.nom = 'Sandwichs'
            ),
            pain = EXISTS (
                SELECT 1 FROM competences_cuisine cc
                JOIN postes_cuisine pc ON cc.poste_id = pc.id
                JOIN correspondance_migration c ON cc.employee_id = c.ancien_id
                WHERE c.nouveau_id = ec.id AND pc.nom = 'Pain'
            ),
            jus_fruits = EXISTS (
                SELECT 1 FROM competences_cuisine cc
                JOIN postes_cuisine pc ON cc.poste_id = pc.id
                JOIN correspondance_migration c ON cc.employee_id = c.ancien_id
                WHERE c.nouveau_id = ec.id AND pc.nom = 'Jus de fruits'
            ),
            legumerie = EXISTS (
                SELECT 1 FROM competences_cuisine cc
                JOIN postes_cuisine pc ON cc.poste_id = pc.id
                JOIN correspondance_migration c ON cc.employee_id = c.ancien_id
                WHERE c.nouveau_id = ec.id AND pc.nom = 'Légumerie'
            ),
            vaisselle = EXISTS (
                SELECT 1 FROM competences_cuisine cc
                JOIN postes_cuisine pc ON cc.poste_id = pc.id
                JOIN correspondance_migration c ON cc.employee_id = c.ancien_id
                WHERE c.nouveau_id = ec.id AND pc.nom = 'Vaisselle'
            ),
            cuisine_froide = EXISTS (
                SELECT 1 FROM competences_cuisine cc
                JOIN postes_cuisine pc ON cc.poste_id = pc.id
                JOIN correspondance_migration c ON cc.employee_id = c.ancien_id
                WHERE c.nouveau_id = ec.id AND pc.nom = 'Cuisine froide'
            ),
            chef_sandwichs = EXISTS (
                SELECT 1 FROM competences_cuisine cc
                JOIN postes_cuisine pc ON cc.poste_id = pc.id
                JOIN correspondance_migration c ON cc.employee_id = c.ancien_id
                WHERE c.nouveau_id = ec.id AND pc.nom = 'Chef sandwichs'
            );
        
        RAISE NOTICE 'Migration des compétences terminée';
    END IF;
END $$;

-- Migration des absences (si disponibles)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'absences_cuisine') THEN
        INSERT INTO absences_cuisine (employee_id, date_debut, date_fin, type_absence, motif)
        SELECT 
            c.nouveau_id,
            ac.date_debut,
            ac.date_fin,
            ac.type_absence,
            COALESCE(ac.motif, '')
        FROM absences_cuisine ac
        JOIN correspondance_migration c ON ac.employee_id = c.ancien_id
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Migration des absences terminée';
    END IF;
END $$;

-- =====================================================
-- ÉTAPE 5: INDEX ET OPTIMISATIONS
-- =====================================================

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_employes_cuisine_actif ON employes_cuisine(actif);
CREATE INDEX IF NOT EXISTS idx_employes_cuisine_prenom ON employes_cuisine(prenom);
CREATE INDEX IF NOT EXISTS idx_planning_cuisine_date ON planning_cuisine(date);
CREATE INDEX IF NOT EXISTS idx_planning_cuisine_employee ON planning_cuisine(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_dates ON absences_cuisine(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_absences_cuisine_employee ON absences_cuisine(employee_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employes_cuisine_updated_at 
    BEFORE UPDATE ON employes_cuisine 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÉTAPE 6: POLITIQUES DE SÉCURITÉ (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE employes_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences_cuisine ENABLE ROW LEVEL SECURITY;

-- Politiques permissives (à ajuster selon vos besoins)
CREATE POLICY "Accès lecture employes_cuisine" ON employes_cuisine FOR SELECT USING (true);
CREATE POLICY "Accès lecture planning_cuisine" ON planning_cuisine FOR SELECT USING (true);
CREATE POLICY "Accès lecture absences_cuisine" ON absences_cuisine FOR SELECT USING (true);

-- =====================================================
-- ÉTAPE 7: DONNÉES D'EXEMPLE
-- =====================================================

-- Ajouter quelques données d'exemple dans le planning (pour tester)
INSERT INTO planning_cuisine (employee_id, date, poste, poste_couleur, poste_icone, creneau, heure_debut, heure_fin) 
SELECT 
    1, 
    CURRENT_DATE, 
    'Sandwichs', 
    '#f59e0b', 
    '🥪', 
    '11h00-12h00', 
    '11:00:00', 
    '12:00:00'
WHERE EXISTS (SELECT 1 FROM employes_cuisine WHERE id = 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- RAPPORT FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== NOUVEAU SYSTÈME CUISINE CRÉÉ ===';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TABLES PRINCIPALES:';
    RAISE NOTICE '   ✅ employes_cuisine (%)', (SELECT COUNT(*) FROM employes_cuisine);
    RAISE NOTICE '   ✅ planning_cuisine (%)', (SELECT COUNT(*) FROM planning_cuisine);
    RAISE NOTICE '   ✅ absences_cuisine (%)', (SELECT COUNT(*) FROM absences_cuisine);
    RAISE NOTICE '';
    RAISE NOTICE '👁️  VUES CRÉÉES:';
    RAISE NOTICE '   ✅ planning_lisible (avec prénoms)';
    RAISE NOTICE '   ✅ absences_lisibles (avec prénoms)';
    RAISE NOTICE '   ✅ planning_aujourdhui';
    RAISE NOTICE '   ✅ absences_aujourdhui';
    RAISE NOTICE '   ✅ competences_employes';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FONCTIONS CRÉÉES:';
    RAISE NOTICE '   ✅ peut_affecter_poste(employee_id, poste)';
    RAISE NOTICE '   ✅ get_employes_disponibles_poste(poste, date)';
    RAISE NOTICE '   ✅ ajouter_absence(prenom, date_debut, date_fin, type, motif)';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SYSTÈME SIMPLIFIÉ PRÊT À UTILISER !';
    RAISE NOTICE '';
    RAISE NOTICE '📝 EXEMPLES D''USAGE:';
    RAISE NOTICE '   SELECT * FROM planning_aujourdhui;';
    RAISE NOTICE '   SELECT * FROM absences_aujourdhui;';
    RAISE NOTICE '   SELECT * FROM competences_employes;';
END $$; 