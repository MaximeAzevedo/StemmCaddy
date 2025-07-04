-- Mise à jour des créneaux cuisine pour correspondre au nouveau planning
-- À exécuter dans Supabase SQL Editor

-- Mettre à jour les noms des créneaux pour le nouveau planning
UPDATE creneaux_cuisine SET nom = '8h' WHERE nom = 'Service 8h';
UPDATE creneaux_cuisine SET nom = '10h' WHERE nom = 'Service 10h';
UPDATE creneaux_cuisine SET nom = '12h' WHERE nom = 'Service 12h';

-- Créer quelques données d'exemple pour tester le nouveau planning
-- D'abord, récupérer des IDs d'employés et de postes
INSERT INTO planning_cuisine (employee_id, poste_id, date, creneau, role, priorite)
SELECT 
  e.id as employee_id,
  p.id as poste_id,
  CURRENT_DATE as date,
  '8h' as creneau,
  'Équipier' as role,
  1 as priorite
FROM employees e
JOIN employees_cuisine ec ON e.id = ec.employee_id
JOIN postes_cuisine p ON p.nom = 'Cuisine chaude'
WHERE e.nom IN ('Mohammad', 'Amar')
LIMIT 2
ON CONFLICT DO NOTHING;

-- Ajouter quelques employés pour le matin
INSERT INTO planning_cuisine (employee_id, poste_id, date, creneau, role, priorite)
SELECT 
  e.id as employee_id,
  p.id as poste_id,
  CURRENT_DATE as date,
  '10h' as creneau,
  'Équipier' as role,
  1 as priorite
FROM employees e
JOIN employees_cuisine ec ON e.id = ec.employee_id
JOIN postes_cuisine p ON p.nom = 'Pain'
WHERE e.nom IN ('Haile', 'Salah')
LIMIT 2
ON CONFLICT DO NOTHING;

-- Ajouter pour l'après-midi
INSERT INTO planning_cuisine (employee_id, poste_id, date, creneau, role, priorite)
SELECT 
  e.id as employee_id,
  p.id as poste_id,
  CURRENT_DATE as date,
  '12h' as creneau,
  'Équipier' as role,
  1 as priorite
FROM employees e
JOIN employees_cuisine ec ON e.id = ec.employee_id
JOIN postes_cuisine p ON p.nom = 'Vaisselle'
WHERE e.nom IN ('Maida')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Vérification
SELECT 
  p.nom as poste,
  c.nom as creneau,
  e.nom,
  e.prenom,
  pl.date
FROM planning_cuisine pl
JOIN employees e ON pl.employee_id = e.id
JOIN postes_cuisine p ON pl.poste_id = p.id
JOIN creneaux_cuisine c ON c.nom = pl.creneau
WHERE pl.date = CURRENT_DATE
ORDER BY p.nom, c.ordre_affichage; 