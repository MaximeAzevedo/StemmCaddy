-- ========================================
-- SUPPRESSION CONTRAINTE UNIQUE PLANNING
-- ========================================
-- 
-- Ce script supprime la contrainte UNIQUE qui empêche 
-- qu'un employé soit assigné à plusieurs postes
-- dans la même journée/créneau.
--
-- PROBLÈME ACTUEL:
-- UNIQUE(employee_id, date, creneau) empêche:
-- - Marie sur "Sandwichs-8h-16h" ET "Cuisine chaude-8h-16h"
--
-- APRÈS ce script:
-- - Assignations multiples autorisées ✅
-- - Même employé peut être sur plusieurs postes ✅
--

-- Supprimer la contrainte UNIQUE problématique
ALTER TABLE planning_cuisine_new 
DROP CONSTRAINT planning_cuisine_new_employee_id_date_creneau_key;

-- Vérification: lister les contraintes restantes
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'planning_cuisine_new'::regclass;

-- Message de confirmation
SELECT 'Contrainte UNIQUE supprimée avec succès! Les assignations multiples sont maintenant possibles.' as status; 

-- Ajout des colonnes manquantes pour les compétences cuisine
ALTER TABLE employes_cuisine_new 
ADD COLUMN IF NOT EXISTS pain boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS jus_de_fruits boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS self_midi boolean DEFAULT false;

-- Commentaires pour documentation
COMMENT ON COLUMN employes_cuisine_new.pain IS 'Compétence pour le poste Pain (ID 3)';
COMMENT ON COLUMN employes_cuisine_new.jus_de_fruits IS 'Compétence pour le poste Jus de fruits (ID 4)';
COMMENT ON COLUMN employes_cuisine_new.self_midi IS 'Compétence pour le poste Self Midi (ID 7)'; 