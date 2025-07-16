-- =====================================================
-- MIGRATION FINALE : REMPLACEMENT DES ANCIENNES TABLES
-- =====================================================
-- Ce script remplace définitivement les anciennes tables par les nouvelles

-- ÉTAPE 1: Sauvegarder les anciennes tables (au cas où)
DO $$
BEGIN
    -- Renommer les anciennes tables avec un suffixe _old
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'employes_cuisine') THEN
        ALTER TABLE employes_cuisine RENAME TO employes_cuisine_old;
        RAISE NOTICE '✅ Table employes_cuisine renommée en employes_cuisine_old';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'planning_cuisine') THEN
        ALTER TABLE planning_cuisine RENAME TO planning_cuisine_old;
        RAISE NOTICE '✅ Table planning_cuisine renommée en planning_cuisine_old';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'absences_cuisine') THEN
        ALTER TABLE absences_cuisine RENAME TO absences_cuisine_old;
        RAISE NOTICE '✅ Table absences_cuisine renommée en absences_cuisine_old';
    END IF;
    
    -- Renommer les autres anciennes tables
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'competences_cuisine') THEN
        ALTER TABLE competences_cuisine RENAME TO competences_cuisine_old;
        RAISE NOTICE '✅ Table competences_cuisine renommée en competences_cuisine_old';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'postes_cuisine') THEN
        ALTER TABLE postes_cuisine RENAME TO postes_cuisine_old;
        RAISE NOTICE '✅ Table postes_cuisine renommée en postes_cuisine_old';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'creneaux_cuisine') THEN
        ALTER TABLE creneaux_cuisine RENAME TO creneaux_cuisine_old;
        RAISE NOTICE '✅ Table creneaux_cuisine renommée en creneaux_cuisine_old';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'disponibilites') THEN
        ALTER TABLE disponibilites RENAME TO disponibilites_old;
        RAISE NOTICE '✅ Table disponibilites renommée en disponibilites_old';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'employees_cuisine') THEN
        ALTER TABLE employees_cuisine RENAME TO employees_cuisine_old;
        RAISE NOTICE '✅ Table employees_cuisine renommée en employees_cuisine_old';
    END IF;
END $$;

-- ÉTAPE 2: Renommer les nouvelles tables vers les noms finaux
DO $$
BEGIN
    -- Renommer les nouvelles tables vers les noms standards
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'employes_cuisine_new') THEN
        ALTER TABLE employes_cuisine_new RENAME TO employes_cuisine;
        RAISE NOTICE '✅ Table employes_cuisine_new renommée en employes_cuisine';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'planning_cuisine_new') THEN
        ALTER TABLE planning_cuisine_new RENAME TO planning_cuisine;
        RAISE NOTICE '✅ Table planning_cuisine_new renommée en planning_cuisine';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'absences_cuisine_new') THEN
        ALTER TABLE absences_cuisine_new RENAME TO absences_cuisine;
        RAISE NOTICE '✅ Table absences_cuisine_new renommée en absences_cuisine';
    END IF;
END $$;

-- ÉTAPE 3: Mettre à jour les contraintes et index
DO $$
BEGIN
    -- Renommer les contraintes de clés étrangères si nécessaire
    IF EXISTS (SELECT FROM pg_constraint WHERE conname LIKE '%_new_%') THEN
        -- Les contraintes sont automatiquement renommées avec les tables
        RAISE NOTICE '✅ Contraintes automatiquement mises à jour';
    END IF;
    
    -- Renommer les index si nécessaire
    ALTER INDEX IF EXISTS idx_employes_cuisine_new_actif RENAME TO idx_employes_cuisine_actif;
    ALTER INDEX IF EXISTS idx_employes_cuisine_new_prenom RENAME TO idx_employes_cuisine_prenom;
    ALTER INDEX IF EXISTS idx_planning_cuisine_new_date RENAME TO idx_planning_cuisine_date;
    ALTER INDEX IF EXISTS idx_planning_cuisine_new_employee RENAME TO idx_planning_cuisine_employee;
    ALTER INDEX IF EXISTS idx_absences_cuisine_new_dates RENAME TO idx_absences_cuisine_dates;
    ALTER INDEX IF EXISTS idx_absences_cuisine_new_employee RENAME TO idx_absences_cuisine_employee;
    
    RAISE NOTICE '✅ Index renommés';
END $$;

-- ÉTAPE 4: Mettre à jour les triggers et fonctions
DO $$
BEGIN
    -- Renommer le trigger
    IF EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_employes_cuisine_new_updated_at') THEN
        DROP TRIGGER IF EXISTS update_employes_cuisine_new_updated_at ON employes_cuisine;
        CREATE TRIGGER update_employes_cuisine_updated_at 
            BEFORE UPDATE ON employes_cuisine 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger updated_at reconfiguré';
    END IF;
END $$;

-- ÉTAPE 5: Recréer les vues avec les bons noms de tables
DROP VIEW IF EXISTS planning_lisible CASCADE;
DROP VIEW IF EXISTS absences_lisibles CASCADE;
DROP VIEW IF EXISTS planning_aujourdhui CASCADE;
DROP VIEW IF EXISTS absences_aujourdhui CASCADE;
DROP VIEW IF EXISTS competences_employes CASCADE;

-- Vue planning avec prénoms (tables finales)
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
    langue_parlee,
    cuisine_chaude,
    cuisine_froide,
    chef_sandwichs,
    sandwichs,
    vaisselle,
    legumerie,
    equipe_pina_saskia,
    (CASE WHEN cuisine_chaude THEN 1 ELSE 0 END +
     CASE WHEN cuisine_froide THEN 1 ELSE 0 END +
     CASE WHEN chef_sandwichs THEN 1 ELSE 0 END +
     CASE WHEN sandwichs THEN 1 ELSE 0 END +
     CASE WHEN vaisselle THEN 1 ELSE 0 END +
     CASE WHEN legumerie THEN 1 ELSE 0 END +
     CASE WHEN equipe_pina_saskia THEN 1 ELSE 0 END) AS nb_competences
FROM employes_cuisine
WHERE actif = TRUE
ORDER BY nb_competences DESC, prenom;

-- ÉTAPE 6: Mettre à jour les fonctions pour utiliser les bonnes tables
DROP FUNCTION IF EXISTS peut_affecter_poste(INTEGER, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_employes_disponibles_poste(VARCHAR, DATE) CASCADE;
DROP FUNCTION IF EXISTS ajouter_absence(VARCHAR, DATE, DATE, VARCHAR, TEXT) CASCADE;

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

-- RAPPORT FINAL DE MIGRATION
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 MIGRATION TERMINÉE AVEC SUCCÈS !';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NOUVELLES TABLES ACTIVES:';
    RAISE NOTICE '   ✅ employes_cuisine: % employés', (SELECT COUNT(*) FROM employes_cuisine);
    RAISE NOTICE '   ✅ planning_cuisine: % plannings', (SELECT COUNT(*) FROM planning_cuisine);
    RAISE NOTICE '   ✅ absences_cuisine: % absences', (SELECT COUNT(*) FROM absences_cuisine);
    RAISE NOTICE '';
    RAISE NOTICE '📦 ANCIENNES TABLES SAUVEGARDÉES:';
    RAISE NOTICE '   📁 employes_cuisine_old, planning_cuisine_old, absences_cuisine_old, etc.';
    RAISE NOTICE '';
    RAISE NOTICE '👁️  VUES MISES À JOUR:';
    RAISE NOTICE '   ✅ planning_lisible, absences_lisibles, competences_employes';
    RAISE NOTICE '';
    RAISE NOTICE '🧹 POUR SUPPRIMER LES ANCIENNES TABLES (OPTIONNEL):';
    RAISE NOTICE '   DROP TABLE IF EXISTS employes_cuisine_old CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS planning_cuisine_old CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS absences_cuisine_old CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS competences_cuisine_old CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS postes_cuisine_old CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS creneaux_cuisine_old CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS disponibilites_old CASCADE;';
    RAISE NOTICE '   DROP TABLE IF EXISTS employees_cuisine_old CASCADE;';
    RAISE NOTICE '';
    RAISE NOTICE '✨ SYSTÈME CUISINE UNIFIÉ PRÊT !';
END $$; 