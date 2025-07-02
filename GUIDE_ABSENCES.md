# 📅 Guide - Système de Gestion des Absences Caddy

## 🎯 Vue d'ensemble

Le système de gestion des absences simplifié permet de :
- ✅ **Déclarer des absences** rapidement
- 📊 **Voir les disponibilités** en temps réel  
- 🔄 **Intégrer avec le planning** automatiquement
- 📈 **Suivre les statistiques** d'absence

---

## 🚀 Installation Base de Données

### 1. Exécuter le schéma dans Supabase

Copiez et exécutez le contenu de `database/schema-absences.sql` dans votre **SQL Editor** Supabase :

```sql
-- ✅ Crée les tables 'absences' et 'disponibilites'
-- ✅ Ajoute les fonctions intelligentes
-- ✅ Configure la sécurité RLS
-- ✅ Insère des données de test
```

### 2. Vérification

Après exécution, vous devriez voir :
- ✅ Table `absences` créée
- ✅ Table `disponibilites` créée  
- ✅ Vue `employes_disponibles`
- ✅ 3 fonctions SQL créées
- ✅ Données de test ajoutées

---

## 🎮 Utilisation de l'Interface

### 📱 Accès au Module

1. **Depuis le Dashboard** → Cliquer sur **"Gestion des Absences"**
2. **URL directe** → `/absences`

### ➕ Déclarer une Absence

1. Cliquer sur **"Nouvelle absence"**
2. Sélectionner l'**employé**
3. Définir les **dates de début/fin**
4. Optionnel : Ajouter un **motif**
5. Cliquer **"Ajouter"**

### 📊 Vue Calendrier Hebdomadaire

- 🔴 **Rond rouge** = Employé absent
- 🟢 **Rond vert** = Employé disponible
- ⬅️➡️ **Navigation** entre les semaines

### 🔍 Recherche et Filtrage

- **Barre de recherche** : Par nom d'employé ou motif
- **Navigation** : Modification/suppression des absences

---

## 🤖 Intégration IA

### Commandes Vocales Supportées

```
"Shadi est absent aujourd'hui"
"Qui est absent cette semaine ?"
"Combien d'employés disponibles ?"
```

### Suggestions Automatiques

L'IA peut maintenant :
- 🔄 **Détecter les conflits** de planning
- 💡 **Suggérer des remplacements** intelligents
- 📊 **Analyser les tendances** d'absence

---

## 📊 Statistiques Disponibles

### Dashboard Principal
- **Absences total** : Nombre total d'absences
- **Disponibles aujourd'hui** : Employés présents
- **Absents aujourd'hui** : Employés indisponibles

### Analytics Avancées
```javascript
// Exemple d'utilisation de l'API
const stats = await supabaseAPI.getAbsenceStats('2024-01-01', '2024-12-31');
console.log(stats.data);
```

---

## ⚡ Fonctionnalités Automatiques

### 🔍 Détection de Conflits
```sql
-- Vérifie automatiquement si le planning est affecté
SELECT * FROM detecter_conflits_planning('2024-01-15');
```

### 👥 Employés Disponibles
```sql  
-- Liste en temps réel des employés disponibles
SELECT * FROM get_employes_disponibles('2024-01-15');
```

### ✅ Vérification Individuelle
```sql
-- Vérifier si un employé spécifique est disponible
SELECT est_disponible(3, '2024-01-15');
```

---

## 🔧 API JavaScript

### Gestion des Absences
```javascript
// Créer une absence
await supabaseAPI.createAbsence({
  employee_id: 3,
  date_debut: '2024-01-15',
  date_fin: '2024-01-17',
  type_absence: 'Absent',
  statut: 'Confirmée',
  motif: 'Maladie'
});

// Vérifier disponibilité
const { available } = await supabaseAPI.isEmployeeAvailable(3, '2024-01-15');

// Obtenir employés disponibles
const { data } = await supabaseAPI.getAvailableEmployees('2024-01-15');
```

### Intégration Planning
```javascript
// Planning avec informations d'absence
const planning = await supabaseAPI.getPlanningWithAvailability(
  '2024-01-15', 
  '2024-01-21'
);

// Détecter conflits
const conflicts = await supabaseAPI.detectPlanningConflicts('2024-01-15');
```

---

## 🎨 Interface Utilisateur

### 🎯 Design Simplifié
- **Une seule catégorie** : "Absent" (pas de sous-types)
- **Couleurs intuitives** : Rouge = absent, Vert = présent
- **Formulaire minimal** : Employé + dates + motif optionnel

### 📱 Responsive
- ✅ Desktop, tablet, mobile
- ✅ Calendrier adaptatif
- ✅ Modales optimisées

### ⚡ Performance
- ✅ Chargement parallèle des données
- ✅ Mise en cache automatique
- ✅ Updates en temps réel

---

## 🚨 Gestion d'Erreurs

### Fallback Automatique
Si la base de données n'est pas disponible :
- 📊 **Données de démonstration** chargées
- 🔄 **Interface fonctionnelle** maintenue
- ⚠️ **Notifications** d'erreur claires

### Validation
- ✅ **Dates cohérentes** (fin ≥ début)
- ✅ **Employé obligatoire**
- ✅ **Durée maximale** (365 jours)

---

## 🎉 Avantages du Système

### 👨‍💼 Pour les Managers
- 🏃‍♂️ **Saisie rapide** des absences
- 👁️ **Vue d'ensemble** claire
- 🤖 **Suggestions automatiques** de remplacements

### 🎯 Pour l'Équipe
- 📱 **Interface simple** et intuitive
- ⚡ **Pas de complexité** inutile
- 🔄 **Synchronisation** avec le planning

### 💻 Pour les Développeurs
- 🔧 **API complète** et documentée
- 🛡️ **Sécurité RLS** intégrée
- 📊 **Analytics** prêtes à l'emploi

---

## 🎭 Exemples d'Usage

### Scénario 1 : Absence Soudaine
```
1. Manager reçoit un appel : "Shadi est malade"
2. Ouvre l'app → "Nouvelle absence"
3. Sélectionne Shadi, dates, motif "Maladie"
4. Sauvegarde → L'IA suggère des remplacements
5. Planning automatiquement ajusté
```

### Scénario 2 : Planning de la Semaine
```
1. Lundi matin → Vue calendrier hebdomadaire
2. Vue d'ensemble : 1 absent, 6 disponibles
3. Vérification rapide des conflits
4. Ajustements si nécessaire
```

### Scénario 3 : Analyse Mensuelle
```
1. Fin de mois → Génération statistiques
2. Identification des tendances
3. Planification préventive
4. Optimisation des équipes
```

---

## ✅ Checklist d'Installation

- [ ] Schéma de base de données exécuté
- [ ] Composant `AbsenceManagement` intégré
- [ ] Routes mises à jour dans `App.js`
- [ ] Liens ajoutés dans le Dashboard
- [ ] API Supabase étendue
- [ ] Tests fonctionnels validés

---

## 🎯 Prochaines Étapes

### Améliorations Possibles
1. **Notifications push** pour les absences
2. **Calendrier mensuel** complet
3. **Export PDF** des plannings
4. **Synchronisation** avec calendriers externes
5. **Validation** par les employés eux-mêmes

### Intégrations
- 📧 **Email** automatique aux managers
- 📱 **SMS** d'alerte pour urgences
- 📊 **Reporting** avancé mensuel/annuel

---

**🎉 Le système de gestion des absences est maintenant opérationnel et prêt à simplifier la vie de l'équipe Caddy !** 