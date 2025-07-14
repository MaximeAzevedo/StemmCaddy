-- Script pour créer les disponibilités des employés cuisine et appliquer les horaires personnalisés
-- À exécuter dans l'interface Supabase SQL Editor

-- 1. Créer les disponibilités de base (8h-17h du lundi au vendredi) pour tous les employés cuisine
INSERT INTO disponibilites (employee_id, jour_semaine, heure_debut, heure_fin, disponible)
SELECT 
    e.id,
    jour.jour_semaine,
    '08:00:00'::time,
    '17:00:00'::time,
    true
FROM employees e
CROSS JOIN (
    SELECT 1 as jour_semaine UNION ALL
    SELECT 2 UNION ALL
    SELECT 3 UNION ALL
    SELECT 4 UNION ALL
    SELECT 5
) jour
WHERE e.id IN (43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71)
AND NOT EXISTS (
    SELECT 1 FROM disponibilites d 
    WHERE d.employee_id = e.id AND d.jour_semaine = jour.jour_semaine
);

-- 2. Appliquer les horaires personnalisés

-- Abdul (ID: 52): 10h-16h (du lundi au vendredi)
UPDATE disponibilites 
SET heure_debut = '10:00:00', heure_fin = '16:00:00', updated_at = now()
WHERE employee_id = 52;

-- Fatumata (ID: 53): 10h-16h (du lundi au vendredi)
UPDATE disponibilites 
SET heure_debut = '10:00:00', heure_fin = '16:00:00', updated_at = now()
WHERE employee_id = 53;

-- Jurom (ID: 60): 10h-16h (du lundi au vendredi)
UPDATE disponibilites 
SET heure_debut = '10:00:00', heure_fin = '16:00:00', updated_at = now()
WHERE employee_id = 60;

-- Carla (ID: 55): 8h-14h (du lundi au vendredi)
UPDATE disponibilites 
SET heure_debut = '08:00:00', heure_fin = '14:00:00', updated_at = now()
WHERE employee_id = 55;

-- Maria (ID: 61): 8h-14h (du lundi au vendredi)
UPDATE disponibilites 
SET heure_debut = '08:00:00', heure_fin = '14:00:00', updated_at = now()
WHERE employee_id = 61;

-- Charif (ID: 66): 8h-12h (du lundi au vendredi)
UPDATE disponibilites 
SET heure_debut = '08:00:00', heure_fin = '12:00:00', updated_at = now()
WHERE employee_id = 66;

-- Magali (ID: 68): 8h-17h sauf vendredi (du lundi au jeudi seulement)
UPDATE disponibilites 
SET heure_debut = '08:00:00', heure_fin = '17:00:00', updated_at = now()
WHERE employee_id = 68 AND jour_semaine IN (1, 2, 3, 4);

-- Magali: Supprimer la disponibilité du vendredi
UPDATE disponibilites 
SET disponible = false, updated_at = now()
WHERE employee_id = 68 AND jour_semaine = 5;

-- 3. Vérification des horaires mis à jour
SELECT 
    e.nom as employe,
    CASE d.jour_semaine
        WHEN 1 THEN 'Lundi'
        WHEN 2 THEN 'Mardi'
        WHEN 3 THEN 'Mercredi'
        WHEN 4 THEN 'Jeudi'
        WHEN 5 THEN 'Vendredi'
        WHEN 6 THEN 'Samedi'
        WHEN 7 THEN 'Dimanche'
    END as jour,
    d.heure_debut,
    d.heure_fin,
    d.disponible
FROM disponibilites d
JOIN employees e ON d.employee_id = e.id
WHERE e.id IN (52, 53, 60, 55, 61, 66, 68)
ORDER BY e.nom, d.jour_semaine; 