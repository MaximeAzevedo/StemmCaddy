-- 🗄️ MIGRATION SUPABASE SÉCURISÉE
-- Suppression des tables redondantes avec sauvegarde

-- ==================== ÉTAPE 1 : SAUVEGARDE ==================== 

-- Sauvegarde des données avant suppression
CREATE TABLE backup_employees_cuisine AS SELECT * FROM employees_cuisine;
CREATE TABLE backup_competences_cuisine AS SELECT * FROM competences_cuisine;
CREATE TABLE backup_absences_cuisine AS SELECT * FROM absences_cuisine;

-- ==================== ÉTAPE 2 : MIGRATION EMPLOYEES ====================

-- Ajouter les colonnes nécessaires à la table employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT 'general';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cuisine_specialite VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS statut_cuisine VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Migrer les données de employees_cuisine vers employees
INSERT INTO employees (nom, profil, department, cuisine_specialite, statut_cuisine, photo_url)
SELECT 
  nom, 
  profil, 
  'cuisine' as department,
  specialite as cuisine_specialite,
  statut as statut_cuisine,
  photo_url
FROM employees_cuisine 
WHERE NOT EXISTS (
  SELECT 1 FROM employees 
  WHERE employees.nom = employees_cuisine.nom
);

-- Mettre à jour les employés existants avec les données cuisine
UPDATE employees 
SET 
  department = 'cuisine',
  cuisine_specialite = ec.specialite,
  statut_cuisine = ec.statut,
  photo_url = COALESCE(employees.photo_url, ec.photo_url)
FROM employees_cuisine ec
WHERE employees.nom = ec.nom;

-- ==================== ÉTAPE 3 : MIGRATION COMPETENCES ====================

-- Ajouter les colonnes nécessaires à la table competences
ALTER TABLE competences ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';
ALTER TABLE competences ADD COLUMN IF NOT EXISTS poste_cuisine_id INTEGER;
ALTER TABLE competences ADD COLUMN IF NOT EXISTS niveau_cuisine VARCHAR(50);

-- Migrer les compétences cuisine
INSERT INTO competences (employee_id, type, poste_cuisine_id, niveau_cuisine, date_validation)
SELECT 
  cc.employee_id,
  'cuisine' as type,
  cc.poste_id as poste_cuisine_id,
  cc.niveau as niveau_cuisine,
  cc.date_validation
FROM competences_cuisine cc
WHERE NOT EXISTS (
  SELECT 1 FROM competences c
  WHERE c.employee_id = cc.employee_id 
    AND c.type = 'cuisine' 
    AND c.poste_cuisine_id = cc.poste_id
);

-- Marquer les compétences véhicules existantes
UPDATE competences 
SET type = 'vehicule' 
WHERE vehicle_id IS NOT NULL AND type = 'general';

-- ==================== ÉTAPE 4 : MIGRATION ABSENCES ====================

-- Ajouter colonne department à la table absences
ALTER TABLE absences ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT 'general';

-- Migrer les absences cuisine (si la table existe)
INSERT INTO absences (employee_id, date_debut, date_fin, type_absence, motif, statut, department)
SELECT 
  ac.employee_id,
  ac.date_debut,
  ac.date_fin,
  ac.type_absence,
  ac.motif,
  ac.statut,
  'cuisine' as department
FROM absences_cuisine ac
WHERE EXISTS (SELECT 1 FROM absences_cuisine LIMIT 1)  -- Vérifier si la table a des données
  AND NOT EXISTS (
    SELECT 1 FROM absences a
    WHERE a.employee_id = ac.employee_id 
      AND a.date_debut = ac.date_debut
      AND a.department = 'cuisine'
  );

-- ==================== ÉTAPE 5 : VÉRIFICATIONS ====================

-- Vérifier la migration des employés
SELECT 
  'EMPLOYEES' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN department = 'cuisine' THEN 1 END) as cuisine_records
FROM employees
UNION ALL
SELECT 
  'EMPLOYEES_CUISINE',
  COUNT(*) as total_records,
  COUNT(*) as cuisine_records  
FROM employees_cuisine;

-- Vérifier la migration des compétences  
SELECT 
  'COMPETENCES' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN type = 'cuisine' THEN 1 END) as cuisine_records
FROM competences
UNION ALL
SELECT 
  'COMPETENCES_CUISINE',
  COUNT(*) as total_records,
  COUNT(*) as cuisine_records
FROM competences_cuisine;

-- ==================== ÉTAPE 6 : SUPPRESSION SÉCURISÉE ====================

-- ⚠️ ATTENTION : Ne pas exécuter avant d'avoir vérifié la migration !

-- COMMENTER ces lignes jusqu'à validation complète :
-- DROP TABLE employees_cuisine;
-- DROP TABLE competences_cuisine;  
-- DROP TABLE absences_cuisine;

-- ==================== ÉTAPE 7 : NETTOYAGE FINAL ====================

-- Une fois la migration validée, supprimer les sauvegardes :
-- DROP TABLE backup_employees_cuisine;
-- DROP TABLE backup_competences_cuisine;
-- DROP TABLE backup_absences_cuisine;

-- ==================== RÉSUMÉ ====================

SELECT 'MIGRATION TERMINÉE' as status,
       'Tables unifiées avec succès' as message,
       'Vérifiez l''application avant de supprimer les anciennes tables' as warning; 