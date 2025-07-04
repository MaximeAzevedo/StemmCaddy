-- Script de réparation pour le Module Cuisine
-- À exécuter dans Supabase SQL Editor

-- 1. Désactiver temporairement RLS pour les tests
ALTER TABLE postes_cuisine DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees_cuisine DISABLE ROW LEVEL SECURITY;
ALTER TABLE competences_cuisine DISABLE ROW LEVEL SECURITY;
ALTER TABLE planning_cuisine DISABLE ROW LEVEL SECURITY;
ALTER TABLE creneaux_cuisine DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer les politiques existantes
DROP POLICY IF EXISTS "Permettre l'accès aux utilisateurs authentifiés" ON postes_cuisine;
DROP POLICY IF EXISTS "Permettre l'accès aux utilisateurs authentifiés" ON employees_cuisine;
DROP POLICY IF EXISTS "Permettre l'accès aux utilisateurs authentifiés" ON competences_cuisine;
DROP POLICY IF EXISTS "Permettre l'accès aux utilisateurs authentifiés" ON planning_cuisine;
DROP POLICY IF EXISTS "Permettre l'accès aux utilisateurs authentifiés" ON creneaux_cuisine;

-- 3. Insérer les postes cuisine (avec gestion des conflits)
INSERT INTO postes_cuisine (nom, description, couleur, icone, ordre_affichage) VALUES
('Cuisine chaude', 'Préparation des plats chauds et cuisson', '#dc2626', '🔥', 1),
('Sandwichs', 'Préparation des sandwichs et snacks', '#f59e0b', '🥪', 2),
('Pain', 'Gestion du pain et boulangerie', '#d97706', '🍞', 3),
('Jus de fruits', 'Préparation des boissons et jus', '#10b981', '🧃', 4),
('Vaisselle', 'Nettoyage et gestion de la vaisselle', '#3b82f6', '🍽️', 5),
('Légumerie', 'Préparation des légumes et salades', '#22c55e', '🥬', 6)
ON CONFLICT (nom) DO UPDATE SET 
  description = EXCLUDED.description,
  couleur = EXCLUDED.couleur,
  icone = EXCLUDED.icone,
  ordre_affichage = EXCLUDED.ordre_affichage;

-- 4. Insérer les créneaux horaires (avec gestion des conflits)
INSERT INTO creneaux_cuisine (nom, heure_debut, heure_fin, couleur, ordre_affichage) VALUES
('Self midi', '11:00', '11:45', '#3b82f6', 1),
('Service continu', '11:45', '12:45', '#10b981', 2),
('Service 8h', '08:00', '16:00', '#8b5cf6', 3),
('Service 10h', '10:00', '18:00', '#f59e0b', 4),
('Service 12h', '12:00', '20:00', '#ef4444', 5)
ON CONFLICT (nom) DO UPDATE SET
  heure_debut = EXCLUDED.heure_debut,
  heure_fin = EXCLUDED.heure_fin,
  couleur = EXCLUDED.couleur,
  ordre_affichage = EXCLUDED.ordre_affichage;

-- 5. Vérification des données
SELECT 'Postes cuisine' as table_name, count(*) as count FROM postes_cuisine
UNION ALL
SELECT 'Créneaux cuisine' as table_name, count(*) as count FROM creneaux_cuisine
UNION ALL
SELECT 'Employés cuisine' as table_name, count(*) as count FROM employees_cuisine
UNION ALL
SELECT 'Compétences cuisine' as table_name, count(*) as count FROM competences_cuisine;

-- 6. Créer des politiques permissives pour les tests
CREATE POLICY "Allow all access" ON postes_cuisine FOR ALL USING (true);
CREATE POLICY "Allow all access" ON employees_cuisine FOR ALL USING (true);
CREATE POLICY "Allow all access" ON competences_cuisine FOR ALL USING (true);
CREATE POLICY "Allow all access" ON planning_cuisine FOR ALL USING (true);
CREATE POLICY "Allow all access" ON creneaux_cuisine FOR ALL USING (true);

-- 7. Réactiver RLS avec les nouvelles politiques
ALTER TABLE postes_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE competences_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_cuisine ENABLE ROW LEVEL SECURITY;
ALTER TABLE creneaux_cuisine ENABLE ROW LEVEL SECURITY; 