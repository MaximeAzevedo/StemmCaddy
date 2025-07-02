# Configuration Base de Données Caddy App

## Étapes d'installation

### 1. Connexion à Supabase
- Allez sur https://supabase.com/dashboard
- Connectez-vous à votre projet : `cmmfaatcdtbmcmjnegyn`

### 2. Exécution du schéma principal
1. Dans le dashboard Supabase, allez dans **SQL Editor**
2. Créez une nouvelle query
3. Copiez tout le contenu de `schema.sql`
4. Exécutez le script (bouton "Run")

### 3. Configuration du compte utilisateur
1. Allez dans **Authentication** > **Users** 
2. Cliquez sur **Add user**
3. Ajoutez :
   - **Email** : `maxime@caddy.lu`
   - **Password** : `Cristobello54`
   - **Email Confirm** : Coché (true)
4. Cliquez **Create user**

### 4. Finalisation avec les permissions
1. Retournez dans **SQL Editor**
2. Créez une nouvelle query
3. Copiez tout le contenu de `setup-user.sql`
4. Exécutez le script

### 5. Vérification
Vous devriez maintenant avoir :
- ✅ 4 tables créées (`vehicles`, `employees`, `competences`, `planning`)
- ✅ 5 véhicules insérés
- ✅ 14 employés + votre compte admin
- ✅ Compétences configurées selon vos tableaux
- ✅ Planning de démonstration

### 6. Test de connexion
1. Retournez à l'application (`npm start`)
2. Connectez-vous avec :
   - **Email** : `maxime@caddy.lu`
   - **Mot de passe** : `Cristobello54`

## Structure des tables

### `vehicles`
- Véhicules de la flotte (Crafter 21, Crafter 23, Jumper, Ducato, Transit)

### `employees`
- Tous les employés avec profils, langues, permis, étoiles
- Votre compte administrateur inclus

### `competences`
- Relation employé-véhicule avec niveaux X/XX
- Basée sur vos tableaux Excel existants

### `planning`
- Affectations employé-véhicule par date
- Planning de démonstration pour aujourd'hui

## Sécurité
- Row Level Security (RLS) activé
- Seuls les utilisateurs authentifiés peuvent accéder aux données
- Votre compte a les privilèges administrateur complets

## Données de test
Les données correspondent exactement à vos tableaux Excel :
- **Profils** : Faible/Moyen/Fort avec règles d'insertion
- **Langues** : Mélange selon vos équipes
- **Compétences** : X (avec accompagnement) / XX (autonome)
- **Véhicules** : Capacités et types corrects 