-- =====================================================
-- CORRECTIONS FRONTEND APRÈS MIGRATION FINALE
-- =====================================================
-- Après avoir exécuté migration-vers-nouveau-systeme.sql,
-- il faut corriger les références *_new dans le code frontend

-- FICHIERS À CORRIGER AUTOMATIQUEMENT :
-- 
-- src/lib/supabase-cuisine.js :
--   - Remplacer toutes les occurrences de 'employes_cuisine_new' par 'employes_cuisine'
--   - Remplacer toutes les occurrences de 'planning_cuisine_new' par 'planning_cuisine'  
--   - Remplacer toutes les occurrences de 'absences_cuisine_new' par 'absences_cuisine'
--
-- src/lib/supabase-unified.js :
--   - Remplacer toutes les occurrences de 'employes_cuisine_new' par 'employes_cuisine'
--   - Remplacer toutes les occurrences de 'planning_cuisine_new' par 'planning_cuisine'
--   - Remplacer toutes les occurrences de 'absences_cuisine_new' par 'absences_cuisine'
--
-- src/planning/hooks/usePlanningSync.js :
--   - Remplacer 'planning_cuisine_new' par 'planning_cuisine'
--
-- src/components/AbsenceManagementCuisine.js :
--   - Remplacer 'absences_cuisine_new' par 'absences_cuisine'
--
-- src/hooks/useDataCache.js :
--   - Remplacer 'employes_cuisine_new' par 'employes_cuisine'

-- EXEMPLES DE CORRECTIONS :

-- AVANT:
-- .from('employes_cuisine_new')
-- .from('planning_cuisine_new')  
-- .from('absences_cuisine_new')

-- APRÈS:
-- .from('employes_cuisine')
-- .from('planning_cuisine')
-- .from('absences_cuisine')

-- COMMANDES BASH POUR CORRIGER AUTOMATIQUEMENT :
-- 
-- find src/ -name "*.js" -exec sed -i 's/employes_cuisine_new/employes_cuisine/g' {} \;
-- find src/ -name "*.js" -exec sed -i 's/planning_cuisine_new/planning_cuisine/g' {} \;
-- find src/ -name "*.js" -exec sed -i 's/absences_cuisine_new/absences_cuisine/g' {} \;

-- OU MANUELLEMENT, REMPLACER DANS CES FICHIERS :
-- - src/lib/supabase-cuisine.js (lignes ~400-800)
-- - src/lib/supabase-unified.js (lignes ~200-300)  
-- - src/planning/hooks/usePlanningSync.js (lignes ~80-150)
-- - src/components/AbsenceManagementCuisine.js (ligne ~60)
-- - src/hooks/useDataCache.js (ligne ~210)

-- VALIDATION APRÈS CORRECTIONS :
-- 
-- 1. grep -r "employes_cuisine_new" src/ (doit retourner 0 résultat)
-- 2. grep -r "planning_cuisine_new" src/ (doit retourner 0 résultat)  
-- 3. grep -r "absences_cuisine_new" src/ (doit retourner 0 résultat)

SELECT 'Script de documentation créé. Voir les instructions ci-dessus.' as message; 