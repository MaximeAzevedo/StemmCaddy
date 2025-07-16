-- =====================================================
-- DIAGNOSTIC DES DONNÉES CUISINE EXISTANTES
-- =====================================================
-- Script pour observer les données avant de créer le nouveau système

-- 1. VOIR LES EMPLOYÉS CUISINE
SELECT 'EMPLOYÉS CUISINE - APERÇU' as info;
SELECT 
    e.id,
    e.nom,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'prenom')
        THEN 'prenom disponible'
        ELSE 'prenom non disponible'
    END as statut_prenom,
    e.statut,
    ec.service,
    ec.photo_url
FROM employees e
LEFT JOIN employees_cuisine ec ON e.id = ec.employee_id
WHERE e.id IN (43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71)
LIMIT 10;

-- 2. VOIR LES COMPÉTENCES ACTUELLES
SELECT 'COMPÉTENCES CUISINE - APERÇU' as info;
SELECT 
    e.nom,
    pc.nom as poste,
    cc.niveau
FROM competences_cuisine cc
JOIN employees e ON cc.employee_id = e.id
JOIN postes_cuisine pc ON cc.poste_id = pc.id
LIMIT 10;

-- 3. VOIR LES POSTES DISPONIBLES
SELECT 'POSTES CUISINE - LISTE COMPLÈTE' as info;
SELECT id, nom, description FROM postes_cuisine ORDER BY ordre_affichage;

-- 4. VOIR LES HORAIRES ACTUELS
SELECT 'HORAIRES - APERÇU' as info;
SELECT 
    e.nom,
    d.jour_semaine,
    d.heure_debut,
    d.heure_fin
FROM disponibilites d
JOIN employees e ON d.employee_id = e.id
WHERE e.id IN (43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71)
LIMIT 10;

-- 5. VOIR LES ABSENCES ACTUELLES
SELECT 'ABSENCES CUISINE - APERÇU' as info;
SELECT 
    e.nom,
    ac.date_debut,
    ac.date_fin,
    ac.type_absence,
    ac.motif
FROM absences_cuisine ac
JOIN employees e ON ac.employee_id = e.id
LIMIT 5;

-- 6. COMPTAGE GÉNÉRAL
SELECT 'COMPTAGES' as info;
SELECT 
    (SELECT COUNT(*) FROM employees WHERE id BETWEEN 43 AND 71) as nb_employes_cuisine,
    (SELECT COUNT(*) FROM competences_cuisine) as nb_competences,
    (SELECT COUNT(*) FROM postes_cuisine) as nb_postes,
    (SELECT COUNT(*) FROM disponibilites WHERE employee_id BETWEEN 43 AND 71) as nb_horaires,
    (SELECT COUNT(*) FROM absences_cuisine) as nb_absences;

-- 7. VÉRIFIER QUELLES TABLES EXISTENT
SELECT 'TABLES EXISTANTES' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
    'employees', 
    'employees_cuisine', 
    'competences_cuisine', 
    'postes_cuisine', 
    'creneaux_cuisine',
    'planning_cuisine',
    'absences_cuisine',
    'disponibilites'
)
ORDER BY table_name; 