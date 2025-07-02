# 🚛 Application de Gestion Caddy

Une application web moderne pour la gestion intelligente des équipes et du planning des véhicules Caddy, avec assistant IA intégré.

![React](https://img.shields.io/badge/React-18.2.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3.0-blue)
![OpenAI](https://img.shields.io/badge/OpenAI-Assistant%20IA-orange)

## 🎯 Fonctionnalités

### 📊 Gestion Intelligente
- **Gestion des employés** : Profils (Faible/Moyen/Fort), langues, compétences
- **Gestion des véhicules** : 5 types de véhicules avec capacités spécifiques
- **Planning optimisé** : Règles d'insertion sociale automatiques
- **Gestion des absences** : Déclaration, suivi, suggestions de remplacements

### 🤖 Assistant IA Vocal
- **Commandes vocales** pour gérer les absences
- **Suggestions intelligentes** de remplacements
- **Analyse automatique** des conflits de planning
- **Optimisation** selon les règles d'insertion sociale

### 🎨 Interface Moderne
- **Design responsive** avec Tailwind CSS
- **Animations fluides** avec Framer Motion
- **Interface intuitive** avec composants Headless UI
- **Notifications** temps réel avec React Hot Toast

## 🚀 Installation

### Prérequis
- Node.js 16+ 
- npm ou yarn
- Compte Supabase

### 1. Cloner le projet
```bash
git clone https://github.com/MaximeAzevedo/StemmCaddy.git
cd StemmCaddy
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration Supabase
1. Créer un projet sur [Supabase](https://supabase.com)
2. Copier le fichier `.env.example` vers `.env`
3. Remplir les variables d'environnement Supabase
4. Exécuter le schéma SQL dans l'éditeur Supabase :
```bash
# Copier le contenu de database/schema.sql dans Supabase SQL Editor
```

### 4. Configuration de la base de données
```bash
npm run setup-db
```

### 5. Lancer l'application
```bash
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 📋 Scripts Disponibles

- `npm start` - Lancer en mode développement
- `npm run build` - Créer une version de production
- `npm run test` - Lancer les tests
- `npm run setup-db` - Configurer la base de données
- `npm run test-db` - Tester la connexion Supabase

## 🗄️ Structure de la Base de Données

### Tables Principales
- **employees** : Informations des employés (profil, langues, compétences)
- **vehicles** : Véhicules avec capacités et types
- **competences** : Relations employé-véhicule (niveaux X/XX)
- **planning** : Affectations quotidiennes
- **absences** : Gestion des absences avec motifs

### Règles d'Insertion Sociale
- Jamais de profils faibles seuls
- Mélange des langues pour apprentissage
- Respect des compétences véhicules
- 2-3 personnes par véhicule selon capacité

## 🤖 Assistant IA - Commandes Vocales

### Gestion des Absences
```
"Déclarer Shadi absent aujourd'hui pour maladie"
"Supprimer absence de Ahmad"
"Qui est absent cette semaine ?"
```

### Informations
```
"Martial est disponible ?"
"Employés disponibles"
"Statistiques du jour"
```

### Planning
```
"Générer planning automatique"
"Optimiser le planning de demain"
```

## 🛠️ Technologies Utilisées

### Frontend
- **React 18** - Interface utilisateur
- **Tailwind CSS** - Styling moderne
- **Framer Motion** - Animations
- **Headless UI** - Composants accessibles
- **Heroicons** - Icônes

### Backend & Database
- **Supabase** - Base de données PostgreSQL
- **Row Level Security** - Sécurité des données

### IA & Intégrations
- **OpenAI API** - Assistant intelligent
- **Web Speech API** - Reconnaissance vocale
- **Date-fns** - Manipulation des dates

## 👥 Équipe de Développement

Développé pour **Stemm/Caddy Luxembourg** par Maxime Deazevedo

## 📄 Licence

Ce projet est sous licence privée - voir le fichier LICENSE pour plus de détails.

## 🔧 Support

Pour toute question ou support technique :
- Email : maxime@caddy.lu
- Documentation : Voir `/docs`
- Issues : GitHub Issues

---

**Application Caddy** - Gestion intelligente d'équipes avec IA 🚛✨ 