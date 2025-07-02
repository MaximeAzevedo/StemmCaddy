-- Configuration du compte utilisateur pour Maxime
-- À exécuter APRÈS le schéma principal

-- 1. Créer le profil utilisateur dans auth.users (via l'interface Supabase Auth)
-- Email: maxime@caddy.lu
-- Mot de passe: Cristobello54

-- 2. Insertion d'un profil administrateur dans la table employees
INSERT INTO employees (
  nom, 
  prenom, 
  email, 
  profil, 
  langues, 
  permis, 
  etoiles, 
  statut,
  date_embauche,
  notes
) VALUES (
  'Deazevedo',
  'Maxime', 
  'maxime@caddy.lu',
  'Fort',
  ARRAY['Français', 'Anglais'],
  true,
  2,
  'Actif',
  CURRENT_DATE,
  'Administrateur système - Accès complet'
) ON CONFLICT (email) DO UPDATE SET
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  profil = EXCLUDED.profil,
  langues = EXCLUDED.langues,
  permis = EXCLUDED.permis,
  etoiles = EXCLUDED.etoiles,
  statut = EXCLUDED.statut,
  notes = EXCLUDED.notes;

-- 3. Donner toutes les compétences à Maxime (administrateur)
INSERT INTO competences (employee_id, vehicle_id, niveau, date_validation, notes)
SELECT 
  e.id, 
  v.id, 
  'XX', 
  CURRENT_DATE,
  'Compétence administrateur'
FROM employees e, vehicles v 
WHERE e.email = 'maxime@caddy.lu'
ON CONFLICT (employee_id, vehicle_id) DO UPDATE SET
  niveau = 'XX',
  date_validation = CURRENT_DATE,
  notes = 'Compétence administrateur';

-- 4. Politique de sécurité pour l'admin
-- Les administrateurs peuvent tout faire
CREATE POLICY "Admin complet" ON vehicles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = auth.jwt() ->> 'email' 
    AND notes LIKE '%Administrateur%'
  )
);

CREATE POLICY "Admin complet" ON employees FOR ALL USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = auth.jwt() ->> 'email' 
    AND notes LIKE '%Administrateur%'
  )
);

CREATE POLICY "Admin complet" ON competences FOR ALL USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = auth.jwt() ->> 'email' 
    AND notes LIKE '%Administrateur%'
  )
);

CREATE POLICY "Admin complet" ON planning FOR ALL USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = auth.jwt() ->> 'email' 
    AND notes LIKE '%Administrateur%'
  )
); 