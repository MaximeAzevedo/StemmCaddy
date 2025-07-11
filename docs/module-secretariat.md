# 📊 Module Secrétariat - Gestion des Denrées Alimentaires

## 🎯 Objectif

Le module Secrétariat permet de **comptabiliser et analyser les quantités de denrées alimentaires récupérées** auprès de différents fournisseurs et supermarchés. Il remplace l'ancien système de tableau Excel par une interface web moderne avec graphiques et statistiques.

## 🏗️ Architecture

### Base de données
- **Table principale** : `denrees_alimentaires`
- **Colonnes** : fournisseur, mois, année, quantité, unité, notes
- **Contraintes** : Combinaison unique fournisseur + mois + année
- **Sécurité** : RLS (Row Level Security) activé

### API Supabase
- **Fichier** : `src/lib/supabase-secretariat.js`
- **Fonctionnalités** : CRUD complet, statistiques, export CSV
- **Gestion d'erreurs** : Fallback côté client si fonctions SQL échouent

## 📋 Fonctionnalités

### 1. Tableau de bord statistiques
- **KPIs principaux** : Total récupéré, fournisseurs actifs, moyenne mensuelle, meilleur mois
- **Graphiques** :
  - Secteurs : Répartition par fournisseur
  - Barres : Évolution mensuelle
- **Tableau détaillé** : Vue mensuelle par fournisseur (style Excel)
- **Export CSV** : Téléchargement des données

### 2. Saisie des données
- **Formulaire** : Fournisseur, mois, année, quantité, unité, notes
- **Validation** : Prévention des doublons, contrôles de saisie
- **Actions** : Ajouter, modifier, supprimer
- **Interface** : Modal responsive, feedbacks utilisateur

## 🚀 Installation et Configuration

### 1. Prérequis
```bash
# Dépendances nécessaires
npm install chart.js react-chartjs-2
```

### 2. Variables d'environnement
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Pour l'initialisation DB
```

### 3. Initialisation de la base de données
```bash
# Exécuter le script d'initialisation
node scripts/init-secretariat-db.js

# Ou manuellement dans l'éditeur SQL Supabase
# Copier/coller le contenu de database/schema-secretariat.sql
```

## 📊 Données d'Exemple Intégrées

Le module est livré avec les **vraies données** du tableau Excel actuel :

### Fournisseurs
- **Kirchberg** : 5 mois de données (Jan-Mai 2025)
- **Cloche d'Or** : 6 mois de données (Jan-Juin 2025)
- **Dudelange** : 5 mois de données (Jan-Mai 2025)
- **Opkorn** : 5 mois de données (Jan-Mai 2025)

### Statistiques 2025 (exemple)
- **Total récupéré** : ~55 491 kg
- **Fournisseurs actifs** : 4
- **Moyenne mensuelle** : ~2 640 kg
- **Meilleur mois** : Mai avec 9 087 kg

## 🎨 Interface Utilisateur

### Design
- **Couleurs** : Palette verte (écologie, alimentation durable)
- **Layout** : Responsive, optimisé mobile et desktop
- **Animations** : Transitions fluides avec Framer Motion
- **Feedback** : Toast notifications pour toutes les actions

### Navigation
- **Onglet 1** : Tableau de bord (statistiques et graphiques)
- **Onglet 2** : Saisie des données (CRUD interface)

## 🔧 Utilisation

### Ajouter une nouvelle entrée
1. Aller dans l'onglet "Saisie des données"
2. Cliquer sur "Nouvelle entrée"
3. Remplir le formulaire (fournisseur, mois, année, quantité)
4. Valider → Données sauvées automatiquement

### Voir les statistiques
1. Aller dans l'onglet "Tableau de bord"
2. Sélectionner l'année dans le menu déroulant
3. Consulter les KPIs, graphiques et tableau détaillé
4. Exporter les données en CSV si nécessaire

### Modifier/Supprimer
1. Dans l'onglet "Saisie", cliquer sur l'icône ✏️ ou 🗑️
2. Confirmer l'action
3. Les statistiques se mettent à jour automatiquement

## 🚨 Gestion d'Erreurs

### Prévention des doublons
- Contrôle automatique avant insertion
- Message d'erreur explicite si doublon détecté
- Possibilité de modifier l'entrée existante

### Fallbacks
- Si les fonctions SQL personnalisées échouent → calcul côté client
- Si la base de données est inaccessible → message d'erreur clair
- Données exemples intégrées pour démonstration

## 📈 Évolutions Futures

### Fonctionnalités prévues
- **Comparaisons annuelles** : Graphiques d'évolution sur plusieurs années
- **Prédictions** : IA pour prédire les récupérations futures
- **Alertes** : Notifications si baisse significative des quantités
- **Import Excel** : Migration automatique depuis fichiers existants
- **Géolocalisation** : Carte des fournisseurs et leurs performances

### Améliorations techniques
- **Cache** : Optimisation des requêtes répétitives
- **Pagination** : Pour gérer de gros volumes de données
- **Filtres avancés** : Recherche par période, fournisseur, quantité
- **API REST** : Intégration avec d'autres systèmes

## 🔍 Maintenance

### Monitoring
- Logs détaillés de toutes les opérations
- Statistiques d'usage dans la console navigateur
- Gestion des erreurs avec messages explicites

### Sauvegardes
- Données stockées en base PostgreSQL (Supabase)
- Export CSV possible à tout moment
- Historique complet avec dates de création/modification

## 🤝 Support

### En cas de problème
1. Vérifier les variables d'environnement Supabase
2. Consulter la console navigateur pour les erreurs
3. Tester la connexion à la base de données
4. Réinitialiser avec le script `init-secretariat-db.js`

### Contact technique
- Développeur : Assistant IA spécialisé
- Documentation complète dans le code source
- Exemples d'utilisation intégrés 