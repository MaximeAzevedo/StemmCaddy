-- Script de mise à jour des compétences cuisine
-- À exécuter dans l'interface Supabase SQL Editor

-- 1. Supprimer toutes les compétences existantes
DELETE FROM competences_cuisine;

-- 2. Insérer les nouvelles compétences selon le tableau fourni

-- Salah: Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES (43, 6, 'Confirmé', '2025-01-07');

-- Maida: Cuisine chaude, Cuisine froide, Chef sandwichs, Sandwichs, Vaisselle
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(44, 1, 'Confirmé', '2025-01-07'),
(44, 19, 'Confirmé', '2025-01-07'),
(44, 20, 'Confirmé', '2025-01-07'),
(44, 2, 'Confirmé', '2025-01-07'),
(44, 5, 'Confirmé', '2025-01-07');

-- Mahmoud: Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(45, 2, 'Confirmé', '2025-01-07'),
(45, 5, 'Confirmé', '2025-01-07'),
(45, 6, 'Confirmé', '2025-01-07');

-- Mohammad: Sandwichs, Vaisselle
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(46, 2, 'Confirmé', '2025-01-07'),
(46, 5, 'Confirmé', '2025-01-07');

-- Amar: Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(47, 2, 'Confirmé', '2025-01-07'),
(47, 5, 'Confirmé', '2025-01-07'),
(47, 6, 'Confirmé', '2025-01-07');

-- Haile: Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(48, 2, 'Confirmé', '2025-01-07'),
(48, 5, 'Confirmé', '2025-01-07'),
(48, 6, 'Confirmé', '2025-01-07');

-- Aïssatou: Cuisine chaude, Cuisine froide, Chef sandwichs, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(49, 1, 'Confirmé', '2025-01-07'),
(49, 19, 'Confirmé', '2025-01-07'),
(49, 20, 'Confirmé', '2025-01-07'),
(49, 2, 'Confirmé', '2025-01-07'),
(49, 5, 'Confirmé', '2025-01-07'),
(49, 21, 'Confirmé', '2025-01-07'),
(49, 6, 'Confirmé', '2025-01-07');

-- Halimatou: Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(50, 2, 'Confirmé', '2025-01-07'),
(50, 5, 'Confirmé', '2025-01-07'),
(50, 6, 'Confirmé', '2025-01-07');

-- Idiatou: Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(51, 2, 'Confirmé', '2025-01-07'),
(51, 5, 'Confirmé', '2025-01-07'),
(51, 6, 'Confirmé', '2025-01-07');

-- Abdul: Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(52, 2, 'Confirmé', '2025-01-07'),
(52, 5, 'Confirmé', '2025-01-07'),
(52, 6, 'Confirmé', '2025-01-07');

-- Fatumata: Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(53, 19, 'Confirmé', '2025-01-07'),
(53, 2, 'Confirmé', '2025-01-07'),
(53, 5, 'Confirmé', '2025-01-07'),
(53, 21, 'Confirmé', '2025-01-07'),
(53, 6, 'Confirmé', '2025-01-07');

-- Giovanna: Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(54, 2, 'Confirmé', '2025-01-07'),
(54, 5, 'Confirmé', '2025-01-07'),
(54, 6, 'Confirmé', '2025-01-07');

-- Carla: Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(55, 2, 'Confirmé', '2025-01-07'),
(55, 5, 'Confirmé', '2025-01-07'),
(55, 21, 'Confirmé', '2025-01-07'),
(55, 6, 'Confirmé', '2025-01-07');

-- Liliana: Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(56, 19, 'Confirmé', '2025-01-07'),
(56, 2, 'Confirmé', '2025-01-07'),
(56, 5, 'Confirmé', '2025-01-07'),
(56, 21, 'Confirmé', '2025-01-07'),
(56, 6, 'Confirmé', '2025-01-07');

-- Djenabou: Cuisine chaude, Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(57, 1, 'Confirmé', '2025-01-07'),
(57, 19, 'Confirmé', '2025-01-07'),
(57, 2, 'Confirmé', '2025-01-07'),
(57, 5, 'Confirmé', '2025-01-07'),
(57, 21, 'Confirmé', '2025-01-07'),
(57, 6, 'Confirmé', '2025-01-07');

-- Harissatou: Cuisine chaude, Cuisine froide, Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(58, 1, 'Confirmé', '2025-01-07'),
(58, 19, 'Confirmé', '2025-01-07'),
(58, 2, 'Confirmé', '2025-01-07'),
(58, 5, 'Confirmé', '2025-01-07'),
(58, 6, 'Confirmé', '2025-01-07');

-- Oumou: Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(59, 2, 'Confirmé', '2025-01-07'),
(59, 5, 'Confirmé', '2025-01-07'),
(59, 6, 'Confirmé', '2025-01-07');

-- Jurom: Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(60, 5, 'Confirmé', '2025-01-07'),
(60, 21, 'Confirmé', '2025-01-07'),
(60, 6, 'Confirmé', '2025-01-07');

-- Maria: Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(61, 2, 'Confirmé', '2025-01-07'),
(61, 5, 'Confirmé', '2025-01-07'),
(61, 21, 'Confirmé', '2025-01-07'),
(61, 6, 'Confirmé', '2025-01-07');

-- Kifle: Cuisine chaude, Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(62, 1, 'Confirmé', '2025-01-07'),
(62, 19, 'Confirmé', '2025-01-07'),
(62, 2, 'Confirmé', '2025-01-07'),
(62, 5, 'Confirmé', '2025-01-07'),
(62, 21, 'Confirmé', '2025-01-07'),
(62, 6, 'Confirmé', '2025-01-07');

-- Hayle Almedom: Cuisine chaude, Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(63, 1, 'Confirmé', '2025-01-07'),
(63, 19, 'Confirmé', '2025-01-07'),
(63, 2, 'Confirmé', '2025-01-07'),
(63, 5, 'Confirmé', '2025-01-07'),
(63, 21, 'Confirmé', '2025-01-07'),
(63, 6, 'Confirmé', '2025-01-07');

-- Yeman: Cuisine chaude, Cuisine froide, Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(64, 1, 'Confirmé', '2025-01-07'),
(64, 19, 'Confirmé', '2025-01-07'),
(64, 2, 'Confirmé', '2025-01-07'),
(64, 5, 'Confirmé', '2025-01-07'),
(64, 6, 'Confirmé', '2025-01-07');

-- Nesrin: Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(65, 19, 'Confirmé', '2025-01-07'),
(65, 2, 'Confirmé', '2025-01-07'),
(65, 5, 'Confirmé', '2025-01-07'),
(65, 21, 'Confirmé', '2025-01-07'),
(65, 6, 'Confirmé', '2025-01-07');

-- Charif: Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(66, 19, 'Confirmé', '2025-01-07'),
(66, 2, 'Confirmé', '2025-01-07'),
(66, 5, 'Confirmé', '2025-01-07'),
(66, 21, 'Confirmé', '2025-01-07'),
(66, 6, 'Confirmé', '2025-01-07');

-- Elsa: Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(67, 2, 'Confirmé', '2025-01-07'),
(67, 5, 'Confirmé', '2025-01-07'),
(67, 21, 'Confirmé', '2025-01-07'),
(67, 6, 'Confirmé', '2025-01-07');

-- Magali: Cuisine chaude, Cuisine froide, Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(68, 1, 'Confirmé', '2025-01-07'),
(68, 19, 'Confirmé', '2025-01-07'),
(68, 2, 'Confirmé', '2025-01-07'),
(68, 5, 'Confirmé', '2025-01-07'),
(68, 6, 'Confirmé', '2025-01-07');

-- Niyat: Cuisine chaude, Cuisine froide, Sandwichs, Vaisselle, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(69, 1, 'Confirmé', '2025-01-07'),
(69, 19, 'Confirmé', '2025-01-07'),
(69, 2, 'Confirmé', '2025-01-07'),
(69, 5, 'Confirmé', '2025-01-07'),
(69, 6, 'Confirmé', '2025-01-07');

-- Yvette: Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(70, 19, 'Confirmé', '2025-01-07'),
(70, 2, 'Confirmé', '2025-01-07'),
(70, 5, 'Confirmé', '2025-01-07'),
(70, 21, 'Confirmé', '2025-01-07'),
(70, 6, 'Confirmé', '2025-01-07');

-- Azmera: Cuisine froide, Sandwichs, Vaisselle, Banque alimentaire, Légumerie
INSERT INTO competences_cuisine (employee_id, poste_id, niveau, date_validation) VALUES 
(71, 19, 'Confirmé', '2025-01-07'),
(71, 2, 'Confirmé', '2025-01-07'),
(71, 5, 'Confirmé', '2025-01-07'),
(71, 21, 'Confirmé', '2025-01-07'),
(71, 6, 'Confirmé', '2025-01-07');

-- Vérification du résultat
SELECT 
    e.nom as employe,
    p.nom as poste,
    cc.niveau,
    cc.date_validation
FROM competences_cuisine cc
JOIN employees e ON cc.employee_id = e.id
JOIN postes_cuisine p ON cc.poste_id = p.id
ORDER BY e.nom, p.ordre_affichage; 