-- Script pour ajouter les postes cuisine manquants
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter la Légumerie
INSERT INTO postes_cuisine (nom, description, couleur, icone, ordre_affichage, actif) VALUES
('Légumerie', 'Préparation des légumes et salades', '#22c55e', '🥬', 6, true)
ON CONFLICT (nom) DO NOTHING;

-- 2. Ajouter Self Midi
INSERT INTO postes_cuisine (nom, description, couleur, icone, ordre_affichage, actif) VALUES
('Self Midi', 'Service du self midi (11h-11h45 et 11h45-12h45)', '#f59e0b', '🥙', 7, true)
ON CONFLICT (nom) DO NOTHING;

-- 3. Ajouter Equipe Pina et Saskia
INSERT INTO postes_cuisine (nom, description, couleur, icone, ordre_affichage, actif) VALUES
('Equipe Pina et Saskia', 'Équipe spécialisée Pina et Saskia (11h-12h45)', '#10b981', '👥', 8, true)
ON CONFLICT (nom) DO NOTHING;

-- 4. Vérification
SELECT nom, description, couleur, icone, ordre_affichage 
FROM postes_cuisine 
WHERE actif = true 
ORDER BY ordre_affichage; 