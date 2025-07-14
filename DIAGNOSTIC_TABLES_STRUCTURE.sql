-- 🔍 DIAGNOSTIC STRUCTURE DES TABLES
-- À exécuter AVANT toute migration pour comprendre les vraies colonnes

-- ==================== STRUCTURE TABLE EMPLOYEES ====================
SELECT 
  'EMPLOYEES' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employees'
ORDER BY ordinal_position;

-- ==================== STRUCTURE TABLE EMPLOYEES_CUISINE ====================
SELECT 
  'EMPLOYEES_CUISINE' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employees_cuisine'
ORDER BY ordinal_position;

-- ==================== STRUCTURE TABLE COMPETENCES ====================
SELECT 
  'COMPETENCES' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'competences'
ORDER BY ordinal_position;

-- ==================== STRUCTURE TABLE COMPETENCES_CUISINE ====================
SELECT 
  'COMPETENCES_CUISINE' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'competences_cuisine'
ORDER BY ordinal_position;

-- ==================== APERÇU DES DONNÉES EMPLOYEES ====================
SELECT 'EMPLOYEES - APERÇU DONNÉES' as info;
SELECT * FROM employees LIMIT 3;

-- ==================== APERÇU DES DONNÉES EMPLOYEES_CUISINE ====================
SELECT 'EMPLOYEES_CUISINE - APERÇU DONNÉES' as info;
SELECT * FROM employees_cuisine LIMIT 3;

-- ==================== APERÇU DES DONNÉES COMPETENCES ====================
SELECT 'COMPETENCES - APERÇU DONNÉES' as info;
SELECT * FROM competences LIMIT 3;

-- ==================== APERÇU DES DONNÉES COMPETENCES_CUISINE ====================
SELECT 'COMPETENCES_CUISINE - APERÇU DONNÉES' as info;
SELECT * FROM competences_cuisine LIMIT 3;

-- ==================== RÉSUMÉ ====================
SELECT 'DIAGNOSTIC TERMINÉ' as status,
       'Analysez les structures avant de procéder à la migration' as message; 