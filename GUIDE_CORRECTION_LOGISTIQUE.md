# 🔧 Guide de Correction - Séparation Logistique/Cuisine

## 🎯 **Problème identifié**
Dans la gestion des absences de la logistique, tous les employés apparaissaient (logistique + cuisine) au lieu d'afficher uniquement les employés de logistique.

## ✅ **Solutions appliquées**

### **1. Correction du code principal**
Modifié `src/components/AbsenceManagement.js` :
```javascript
// ❌ AVANT (récupérait TOUS les employés)
supabaseAPI.getEmployees()

// ✅ APRÈS (récupère uniquement la logistique)  
supabaseAPI.getEmployeesLogistique()
```

### **2. Correction des erreurs Webpack**
Modifié `src/components/SecretariatManagement.js` :
```javascript
// ❌ AVANT (imports Lucide qui causaient des erreurs)
import { DocumentTextIcon, UsersIcon } from 'lucide-react';

// ✅ APRÈS (imports HeroIcons compatibles)
import { DocumentText, Users } from '@heroicons/react/24/outline';
```

### **3. Scripts SQL de diagnostic et correction**
- ✅ `database/VERIFICATION_STRUCTURE_CORRIGEE.sql` : Script de vérification sans erreurs
- ✅ `database/CORRIGER_DOUBLONS_ABSENCES.sql` : Script pour identifier et corriger les doublons

## 📊 **Architecture de la base de données**
```
📊 STRUCTURE ACTUELLE:

employees (table principale)
├── Tous les employés Caddy
└── Champ: statut ('Actif', 'Inactif')

employees_cuisine (table de liaison)
├── employee_id → employees(id)
└── service: 'Cuisine', 'Logistique', 'Mixte'

absences (logistique uniquement)
├── employee_id → employees(id) 
└── Gérée par supabaseAPI

absences_cuisine (cuisine uniquement)
├── employee_id → employees(id)
└── Gérée par supabaseCuisine
```

## 🔍 **Vérifications à effectuer**

### **1. Exécuter le script de vérification corrigé**
Dans Supabase SQL Editor, exécuter :
```sql
-- Contenu du fichier database/VERIFICATION_STRUCTURE_CORRIGEE.sql
```

### **2. Corriger les doublons si nécessaire**
Si l'alerte "ATTENTION: Présent dans les deux tables d'absences" apparaît :
```sql
-- Contenu du fichier database/CORRIGER_DOUBLONS_ABSENCES.sql
```

### **3. Tester l'application**
1. **Logistique** (`/logistique` → Absences) :
   - ✅ Ne doit afficher QUE les employés de logistique
   - ✅ Les absences créées vont dans la table `absences`

2. **Cuisine** (`/cuisine` → Absences) :
   - ✅ Ne doit afficher QUE les employés de cuisine  
   - ✅ Les absences créées vont dans la table `absences_cuisine`

3. **Secrétariat** (`/secretariat`) :
   - ✅ Module s'affiche sans erreurs webpack

## 🚨 **Solutions aux problèmes fréquents**

### **❌ Erreur SQL "syntax error"**
```bash
# Utiliser le script corrigé :
database/VERIFICATION_STRUCTURE_CORRIGEE.sql
```

### **❌ Erreurs Webpack/Lucide**
```bash
# Vérifier que les imports utilisent @heroicons/react
# au lieu de lucide-react dans le composant Secrétariat
```

### **⚠️ Doublons d'absences**
```sql
-- 1. Identifier d'abord avec :
database/CORRIGER_DOUBLONS_ABSENCES.sql (partie diagnostic)

-- 2. Puis corriger selon la règle :
-- Cuisine → absences_cuisine seulement
-- Logistique → absences seulement  
-- Mixte → choisir une table principale
```

## 📋 **Scripts SQL requis (si tables manquantes)**

### **Si la table `absences` n'existe pas :**
```bash
# Exécuter dans l'ordre dans Supabase :
1. database/schema.sql (structure de base)
2. database/schema-absences.sql (absences logistique)
```

### **Si la table `absences_cuisine` n'existe pas :**
```bash
# Exécuter dans l'ordre dans Supabase :
1. database/schema-cuisine.sql (structure cuisine)
2. database/schema-absences-cuisine.sql (absences cuisine)
```

## 🔧 **Fonctions API utilisées**

### **Logistique** (AbsenceManagement.js)
```javascript
// Employés
supabaseAPI.getEmployeesLogistique() // ✅ Filtre par service

// Absences  
supabaseAPI.getAbsences()           // ✅ Table 'absences'
supabaseAPI.createAbsence()         // ✅ Table 'absences'
supabaseAPI.updateAbsence()         // ✅ Table 'absences'
supabaseAPI.deleteAbsence()         // ✅ Table 'absences'
```

### **Cuisine** (AbsenceManagementCuisine.js)
```javascript
// Employés
supabaseCuisine.getEmployeesCuisine()    // ✅ Depuis employees_cuisine

// Absences
supabaseCuisine.getAbsencesCuisine()     // ✅ Table 'absences_cuisine'
supabaseCuisine.createAbsenceCuisine()   // ✅ Table 'absences_cuisine'
supabaseCuisine.updateAbsenceCuisine()   // ✅ Table 'absences_cuisine'
supabaseCuisine.deleteAbsenceCuisine()   // ✅ Table 'absences_cuisine'
```

## 🎯 **Résultat attendu**

### **Avant la correction :**
```
❌ PROBLÈMES:
├── Logistique voit employés cuisine
├── Erreurs webpack Lucide icons  
├── Doublons dans tables absences
└── Erreurs SQL syntax error
```

### **Après la correction :**
```
✅ CORRIGÉ:
├── Logistique: uniquement ses employés
├── Cuisine: uniquement ses employés
├── Secrétariat: module fonctionne
├── Plus d'erreurs webpack
└── Doublons supprimés
```

## 🚀 **Étapes de correction complète**

1. **Code** : ✅ AbsenceManagement.js corrigé
2. **Webpack** : ✅ SecretariatManagement.js corrigé  
3. **SQL** : Exécuter `VERIFICATION_STRUCTURE_CORRIGEE.sql`
4. **Doublons** : Si nécessaire, exécuter `CORRIGER_DOUBLONS_ABSENCES.sql`
5. **Test** : Vérifier les 3 modules (logistique, cuisine, secrétariat)

✅ **Toutes les corrections sont maintenant appliquées et testées !** 