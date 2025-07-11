-- =====================================================
-- SCHÉMA BASE DE DONNÉES - ASSISTANT IA CUISINE
-- =====================================================
-- Extension du schéma existant pour supporter l'IA
-- Date: 2025
-- Version: 1.0

-- =====================================================
-- TABLE: COMPÉTENCES
-- =====================================================
CREATE TABLE IF NOT EXISTS competences (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    niveau_requis INTEGER DEFAULT 1 CHECK (niveau_requis BETWEEN 1 AND 5),
    categorie VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: COMPÉTENCES DES EMPLOYÉS
-- =====================================================
CREATE TABLE IF NOT EXISTS employe_competences (
    id SERIAL PRIMARY KEY,
    employe_id INTEGER NOT NULL,
    competence_id INTEGER NOT NULL REFERENCES competences(id) ON DELETE CASCADE,
    niveau_actuel INTEGER DEFAULT 1 CHECK (niveau_actuel BETWEEN 1 AND 5),
    date_validation DATE DEFAULT CURRENT_DATE,
    validateur VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employe_id, competence_id)
);

-- =====================================================
-- TABLE: ABSENCES
-- =====================================================
CREATE TABLE IF NOT EXISTS absences (
    id SERIAL PRIMARY KEY,
    employe_id INTEGER NOT NULL,
    employe_nom VARCHAR(100) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    motif VARCHAR(100) DEFAULT 'Non spécifié',
    statut VARCHAR(20) DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'annulee')),
    remplacant_id INTEGER,
    remplacant_nom VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(100),
    ia_suggestion BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (date_fin >= date_debut)
);

-- =====================================================
-- TABLE: PLANNINGS IA
-- =====================================================
CREATE TABLE IF NOT EXISTS plannings_ia (
    id SERIAL PRIMARY KEY,
    semaine DATE NOT NULL, -- Lundi de la semaine
    employe_id INTEGER NOT NULL,
    employe_nom VARCHAR(100) NOT NULL,
    poste VARCHAR(100) NOT NULL,
    jour INTEGER NOT NULL CHECK (jour BETWEEN 1 AND 7), -- 1=Lundi, 7=Dimanche
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    statut VARCHAR(20) DEFAULT 'propose' CHECK (statut IN ('propose', 'valide', 'refuse', 'modifie')),
    confidence_ia FLOAT DEFAULT 0.8, -- Confiance de l'IA (0-1)
    raison_ia TEXT, -- Explication de l'IA
    created_by VARCHAR(20) DEFAULT 'IA',
    validated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (heure_fin > heure_debut)
);

-- =====================================================
-- TABLE: ACTIONS IA (Historique et apprentissage)
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_actions (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- 'ajouter_absence', 'suggest_replacement', etc.
    intent VARCHAR(50), -- L'intention détectée
    user_input TEXT NOT NULL, -- Commande utilisateur originale
    parametres JSONB, -- Paramètres extraits
    resultat JSONB, -- Résultat de l'action
    statut VARCHAR(20) DEFAULT 'success' CHECK (statut IN ('success', 'error', 'pending')),
    feedback_utilisateur INTEGER CHECK (feedback_utilisateur BETWEEN 1 AND 5), -- 1=Mauvais, 5=Excellent
    correction_utilisateur JSONB, -- Si l'utilisateur corrige
    execution_time_ms INTEGER,
    user_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: CONFIGURATION IA
-- =====================================================
CREATE TABLE IF NOT EXISTS ia_config (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) NOT NULL UNIQUE,
    valeur JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INSERTION DES COMPÉTENCES DE BASE
-- =====================================================
INSERT INTO competences (nom, description, niveau_requis, categorie) VALUES
-- Cuisine chaude
('Cuisine chaude - Base', 'Préparation des plats chauds de base', 2, 'cuisine_chaude'),
('Cuisine chaude - Avancé', 'Maîtrise complète des techniques de cuisine chaude', 4, 'cuisine_chaude'),
('Grillades', 'Cuisson à la plancha et au grill', 3, 'cuisine_chaude'),
('Sauces', 'Préparation et liaison des sauces', 3, 'cuisine_chaude'),

-- Cuisine froide
('Cuisine froide - Base', 'Préparation des entrées et salades', 2, 'cuisine_froide'),
('Cuisine froide - Avancé', 'Maîtrise des techniques de cuisine froide', 4, 'cuisine_froide'),
('Découpe légumes', 'Techniques de découpe et présentation', 2, 'cuisine_froide'),

-- Pâtisserie
('Pâtisserie - Base', 'Préparation des desserts simples', 3, 'patisserie'),
('Pâtisserie - Avancé', 'Maîtrise complète de la pâtisserie', 5, 'patisserie'),
('Boulangerie', 'Préparation du pain et viennoiseries', 4, 'patisserie'),

-- Général
('Hygiène HACCP', 'Respect des normes d\'hygiène', 3, 'general'),
('Gestion équipe', 'Encadrement et formation d\'équipe', 4, 'management'),
('Service clientèle', 'Relation client et service', 2, 'service')

ON CONFLICT (nom) DO NOTHING;

-- =====================================================
-- CONFIGURATION IA PAR DÉFAUT
-- =====================================================
INSERT INTO ia_config (cle, valeur, description) VALUES
('seuil_confidence_suggestions', '0.7', 'Seuil minimum de confiance pour les suggestions automatiques'),
('max_heures_semaine', '35', 'Nombre maximum d''heures par semaine par employé'),
('heures_ouverture', '{"debut": "06:00", "fin": "20:00"}', 'Heures d''ouverture du restaurant'),
('postes_obligatoires', '["Cuisine chaude", "Cuisine froide", "Pâtisserie"]', 'Postes qui doivent toujours être pourvus'),
('delai_remplacement_min', '2', 'Délai minimum en heures pour proposer un remplacement')
ON CONFLICT (cle) DO NOTHING;

-- =====================================================
-- INDEXES POUR OPTIMISER LES PERFORMANCES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employe_competences_employe ON employe_competences(employe_id);
CREATE INDEX IF NOT EXISTS idx_employe_competences_competence ON employe_competences(competence_id);
CREATE INDEX IF NOT EXISTS idx_absences_employe ON absences(employe_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_plannings_semaine ON plannings_ia(semaine);
CREATE INDEX IF NOT EXISTS idx_plannings_employe ON plannings_ia(employe_id);
CREATE INDEX IF NOT EXISTS idx_ia_actions_type ON ia_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_ia_actions_date ON ia_actions(created_at);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour obtenir les employés disponibles à une date/heure donnée
CREATE OR REPLACE FUNCTION get_employes_disponibles(
    p_date DATE,
    p_heure_debut TIME,
    p_heure_fin TIME,
    p_poste VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    employe_id INTEGER,
    employe_nom VARCHAR,
    competences_pertinentes JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        e.id,
        e.nom,
        COALESCE(
            json_agg(
                json_build_object(
                    'competence', c.nom,
                    'niveau', ec.niveau_actuel
                )
            ) FILTER (WHERE c.nom IS NOT NULL), 
            '[]'::json
        )::jsonb as competences
    FROM employes e
    LEFT JOIN employe_competences ec ON e.id = ec.employe_id
    LEFT JOIN competences c ON ec.competence_id = c.id
    WHERE e.id NOT IN (
        -- Exclure les employés en absence
        SELECT a.employe_id 
        FROM absences a 
        WHERE p_date BETWEEN a.date_debut AND a.date_fin
        AND a.statut IN ('planifiee', 'en_cours')
    )
    AND (p_poste IS NULL OR EXISTS (
        -- Vérifier si l'employé a les compétences pour ce poste
        SELECT 1 FROM employe_competences ec2
        JOIN competences c2 ON ec2.competence_id = c2.id
        WHERE ec2.employe_id = e.id 
        AND c2.nom ILIKE '%' || p_poste || '%'
        AND ec2.niveau_actuel >= c2.niveau_requis
    ))
    GROUP BY e.id, e.nom
    ORDER BY e.nom;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour suggérer un remplaçant
CREATE OR REPLACE FUNCTION suggest_replacement(
    p_employe_absent_id INTEGER,
    p_date DATE,
    p_poste VARCHAR
)
RETURNS TABLE (
    employe_id INTEGER,
    employe_nom VARCHAR,
    score_compatibilite FLOAT,
    raison TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH competences_requises AS (
        -- Compétences de l'employé absent pour ce poste
        SELECT c.id, c.nom, ec.niveau_actuel
        FROM employe_competences ec
        JOIN competences c ON ec.competence_id = c.id
        WHERE ec.employe_id = p_employe_absent_id
        AND c.nom ILIKE '%' || p_poste || '%'
    ),
    candidats AS (
        SELECT * FROM get_employes_disponibles(p_date, '06:00', '20:00', p_poste)
        WHERE employe_id != p_employe_absent_id
    )
    SELECT 
        c.employe_id,
        c.employe_nom,
        CASE 
            WHEN EXISTS (SELECT 1 FROM competences_requises) THEN
                (SELECT AVG(
                    CASE WHEN ec.niveau_actuel >= cr.niveau_actuel THEN 1.0
                         WHEN ec.niveau_actuel >= cr.niveau_actuel - 1 THEN 0.7
                         ELSE 0.3 END
                ) FROM competences_requises cr
                LEFT JOIN employe_competences ec ON ec.employe_id = c.employe_id AND ec.competence_id = cr.id)
            ELSE 0.5
        END as score,
        'Compatibilité basée sur les compétences pour ' || p_poste as raison
    FROM candidats c
    ORDER BY score DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_competences_updated_at BEFORE UPDATE ON competences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employe_competences_updated_at BEFORE UPDATE ON employe_competences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_absences_updated_at BEFORE UPDATE ON absences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plannings_ia_updated_at BEFORE UPDATE ON plannings_ia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) - Sécurité
-- =====================================================
ALTER TABLE competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE employe_competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE plannings_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_config ENABLE ROW LEVEL SECURITY;

-- Politiques RLS basiques (à ajuster selon vos besoins)
CREATE POLICY "Lecture publique compétences" ON competences FOR SELECT USING (true);
CREATE POLICY "Lecture publique employe_competences" ON employe_competences FOR SELECT USING (true);
CREATE POLICY "Lecture publique absences" ON absences FOR SELECT USING (true);
CREATE POLICY "Lecture publique plannings_ia" ON plannings_ia FOR SELECT USING (true);
CREATE POLICY "Lecture publique ia_actions" ON ia_actions FOR SELECT USING (true);
CREATE POLICY "Lecture publique ia_config" ON ia_config FOR SELECT USING (true);

-- Permettre les insertions/updates pour les utilisateurs authentifiés
CREATE POLICY "Insertion authentifiée" ON employe_competences FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Insertion authentifiée" ON absences FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Insertion authentifiée" ON plannings_ia FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Insertion authentifiée" ON ia_actions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Modification authentifiée" ON employe_competences FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Modification authentifiée" ON absences FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Modification authentifiée" ON plannings_ia FOR UPDATE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- DONNÉES D'EXEMPLE POUR TESTS
-- =====================================================
-- Ces données seront ajoutées seulement si la table est vide

-- Exemple d'assignation de compétences (à adapter selon vos employés existants)
-- INSERT INTO employe_competences (employe_id, competence_id, niveau_actuel, validateur) 
-- SELECT 1, id, 3, 'Chef' FROM competences WHERE nom LIKE '%Cuisine chaude%' LIMIT 1
-- ON CONFLICT DO NOTHING;

COMMENT ON TABLE competences IS 'Liste des compétences disponibles dans la cuisine';
COMMENT ON TABLE employe_competences IS 'Association des compétences par employé avec leur niveau';
COMMENT ON TABLE absences IS 'Gestion des absences avec suggestions IA de remplaçants';
COMMENT ON TABLE plannings_ia IS 'Plannings proposés et validés par l''IA';
COMMENT ON TABLE ia_actions IS 'Historique des actions de l''IA pour apprentissage';
COMMENT ON TABLE ia_config IS 'Configuration et paramètres de l''IA';

-- =====================================================
-- FIN DU SCHÉMA
-- ===================================================== 