-- =====================================================
-- SCRIPT POUR CORRIGER LES DOUBLONS D'ABSENCES
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. IDENTIFIER LES DOUBLONS (employés dans les deux tables d'absences)
SELECT 
  e.id,
  e.nom,
  e.prenom,
  ec.service,
  'Employé présent dans absences ET absences_cuisine' as probleme
FROM employees e
LEFT JOIN employees_cuisine ec ON e.id = ec.employee_id
WHERE EXISTS (
  SELECT 1 FROM absences a WHERE a.employee_id = e.id
)
AND EXISTS (
  SELECT 1 FROM absences_cuisine ac WHERE ac.employee_id = e.id
)
ORDER BY e.nom;

-- 2. ANALYSER LA RÉPARTITION
-- Voir combien d'absences chaque employé en doublon a dans chaque table
SELECT 
  e.nom,
  e.prenom,
  ec.service,
  (SELECT COUNT(*) FROM absences a WHERE a.employee_id = e.id) as absences_logistique,
  (SELECT COUNT(*) FROM absences_cuisine ac WHERE ac.employee_id = e.id) as absences_cuisine
FROM employees e
LEFT JOIN employees_cuisine ec ON e.id = ec.employee_id
WHERE EXISTS (
  SELECT 1 FROM absences a WHERE a.employee_id = e.id
)
AND EXISTS (
  SELECT 1 FROM absences_cuisine ac WHERE ac.employee_id = e.id
)
ORDER BY e.nom;

-- 3. RECOMMANDATIONS POUR CORRIGER :

-- Pour les employés de CUISINE uniquement (service = 'Cuisine'):
-- Supprimer leurs absences de la table 'absences' (logistique)
/*
DELETE FROM absences 
WHERE employee_id IN (
  SELECT e.id FROM employees e
  JOIN employees_cuisine ec ON e.id = ec.employee_id
  WHERE ec.service = 'Cuisine'
);
*/

-- Pour les employés de LOGISTIQUE uniquement (pas dans employees_cuisine):
-- Supprimer leurs absences de la table 'absences_cuisine'
/*
DELETE FROM absences_cuisine 
WHERE employee_id IN (
  SELECT e.id FROM employees e
  WHERE NOT EXISTS (
    SELECT 1 FROM employees_cuisine ec 
    WHERE ec.employee_id = e.id
  )
);
*/

-- Pour les employés MIXTES (service = 'Mixte'):
-- Les garder dans les deux tables OU choisir une table principale
-- OPTION A: Tout migrer vers absences (logistique)
/*
INSERT INTO absences (employee_id, date_debut, date_fin, type_absence, motif, statut, created_at)
SELECT 
  employee_id, 
  date_debut, 
  date_fin, 
  type_absence, 
  motif, 
  statut, 
  created_at
FROM absences_cuisine ac
WHERE ac.employee_id IN (
  SELECT e.id FROM employees e
  JOIN employees_cuisine ec ON e.id = ec.employee_id
  WHERE ec.service = 'Mixte'
)
ON CONFLICT DO NOTHING;

DELETE FROM absences_cuisine 
WHERE employee_id IN (
  SELECT e.id FROM employees e
  JOIN employees_cuisine ec ON e.id = ec.employee_id
  WHERE ec.service = 'Mixte'
);
*/

-- 4. VÉRIFICATION FINALE (à exécuter après correction)
-- Doit retourner 0 lignes si tout est corrigé
SELECT 
  'PROBLEME DETECTE: Employé encore dans les deux tables' as alerte,
  e.nom,
  e.prenom
FROM employees e
WHERE EXISTS (
  SELECT 1 FROM absences a WHERE a.employee_id = e.id
)
AND EXISTS (
  SELECT 1 FROM absences_cuisine ac WHERE ac.employee_id = e.id
);

-- 5. RAPPORT FINAL - Répartition après correction
SELECT 
  'absences (logistique)' as table_name,
  COUNT(DISTINCT employee_id) as employes_uniques,
  COUNT(*) as total_absences
FROM absences
UNION ALL
SELECT 
  'absences_cuisine (cuisine)' as table_name,
  COUNT(DISTINCT employee_id) as employes_uniques,
  COUNT(*) as total_absences
FROM absences_cuisine; 