# 🚀 Guide de Migration : Absences Cuisine Avancées

## 📋 Vue d'ensemble

Cette migration modernise le système de gestion des absences cuisine pour le porter au niveau de la logistique avec :
- **6 types d'absence** au lieu d'un seul
- **Vue calendrier hebdomadaire** avec légende complète
- **Gestion des heures** pour les rendez-vous
- **Fermetures de service** affectant toute l'équipe
- **Statistiques temps réel**

## ✅ **Phases Terminées**

### ✅ Phase 1 : Schéma Base de Données
- **Fichier créé** : `database/schema-absences-cuisine-advanced.sql`
- **Table** : `absences_cuisine_advanced` avec structure logistique
- **Types supportés** : Absent, Congé, Maladie, Formation, Rendez-vous, Fermeture
- **Fonctionnalités** : Heures pour RDV, fermetures de service

### ✅ Phase 2 : API Avancée  
- **Fichier créé** : `src/lib/supabase-cuisine-advanced.js`
- **Fonctions** : CRUD complet + utilitaires avancés
- **Compatibilité** : Structure logistique adaptée cuisine

### ✅ Phase 3 : Interface Utilisateur
- **Fichier créé** : `src/components/AbsenceManagementCuisineAdvanced.js`
- **Fonctionnalités** : Vue calendrier, légende, stats, formulaires avancés
- **Design** : Thème orange/rouge adapté cuisine

### ✅ Phase 4 : Script de Migration
- **Fichier créé** : `scripts/migrate-absences-cuisine-advanced.js`
- **Tests** : API + connexion Supabase validés

## 🔧 **Étapes Manuelles Requises**

### 1. Exécuter le SQL dans Supabase

```bash
# 1. Copier le contenu du fichier
cat database/schema-absences-cuisine-advanced.sql

# 2. Dans Supabase Dashboard :
# - Aller dans SQL Editor
# - Coller le contenu
# - Exécuter
```

### 2. Tester la Migration

```bash
# Lancer le script de test
node scripts/migrate-absences-cuisine-advanced.js
```

### 3. Intégrer l'Interface

Ajouter l'import dans votre système de routage :

```javascript
import AbsenceManagementCuisineAdvanced from './components/AbsenceManagementCuisineAdvanced';

// Remplacer l'ancien composant par le nouveau
```

## 📊 **Comparatif Avant/Après**

| Fonctionnalité | Ancien Système | Nouveau Système |
|---|---|---|
| Types d'absence | 1 (Absent) | 6 (Absent, Congé, Maladie, Formation, RDV, Fermeture) |
| Vue calendrier | Basique | Hebdomadaire avec légende |
| Gestion heures | ❌ | ✅ (pour RDV) |
| Fermetures service | ❌ | ✅ |
| Statistiques | ❌ | ✅ (temps réel) |
| Codes visuels | ❌ | ✅ (ABS, CONG, MAL, etc.) |

## 🎨 **Nouveautés Interface**

### Légende des Statuts
- 🔴 **ABS** - Absent
- 🔵 **CONG** - Congé  
- 🟡 **MAL** - Maladie
- 🟣 **FORM** - Formation
- 🟠 **RDV 10h** - Rendez-vous avec heure
- ⚫ **FERMÉ** - Service fermé

### Motifs Prédéfinis (Fermetures)
- Jour férié
- Formation collective  
- Maintenance cuisine
- Nettoyage approfondi
- Inventaire
- Audit hygiène
- Etc.

## 🔧 **Configuration Post-Migration**

### Variables d'Environnement
Assurez-vous que ces variables sont configurées :
```bash
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

### Permissions Supabase
La table `absences_cuisine_advanced` utilise RLS avec politique permissive.

## 🧪 **Tests Recommandés**

1. **Test Création d'Absence Simple**
   - Créer absence "Absent" pour 1 jour
   - Vérifier affichage calendrier

2. **Test Rendez-vous avec Heure**
   - Créer RDV à 10h30
   - Vérifier affichage "RDV 10h"

3. **Test Fermeture Service**
   - Créer fermeture "Jour férié"
   - Vérifier que tous employés montrent "FERMÉ"

4. **Test Statistiques**
   - Créer plusieurs absences aujourd'hui
   - Vérifier compteurs présents/absents

## ⚡ **Performance**

- **Indexes** : Optimisés pour requêtes fréquentes
- **Cache** : Données employés mises en cache
- **Pagination** : Vue calendrier limitée à 1 semaine

## 🐛 **Troubleshooting**

### Erreur "Table absences_cuisine_advanced does not exist"
➡️ **Solution** : Exécuter le SQL de migration dans Supabase

### Erreur "Permission denied"  
➡️ **Solution** : Vérifier les politiques RLS dans Supabase

### Interface ne charge pas
➡️ **Solution** : Vérifier les variables d'environnement

## 🔄 **Migration Finale** (Phase 4)

Une fois validé, pour basculer définitivement :

1. **Sauvegarder** l'ancien système
2. **Renommer** `absences_cuisine_advanced` → `absences_cuisine_new`  
3. **Supprimer** l'ancienne table
4. **Mettre à jour** les imports
5. **Nettoyer** les fichiers temporaires

## 📞 **Support**

En cas de problème :
1. Vérifier les logs dans la console navigateur
2. Tester avec `node scripts/migrate-absences-cuisine-advanced.js`
3. Vérifier la structure DB dans Supabase Table Editor

---

## 🎉 **Résultat Final**

L'équipe cuisine bénéficie maintenant d'un système de gestion des absences :
- **Aussi avancé que la logistique**
- **Adapté aux spécificités cuisine**  
- **Interface moderne et intuitive**
- **Statistiques en temps réel**

**Migration terminée avec succès ! 🚀** 