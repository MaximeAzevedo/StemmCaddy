# 📊 Comparatif Base de Données : Existante vs Utilisée

**Date d'analyse :** Janvier 2025  
**Objectif :** Comparer la structure Supabase réelle avec l'utilisation dans l'application  
**Résultat :** Mapping et corrections appliquées

---

## 🗄️ **Tables Existantes dans Supabase**

### **📋 Tables Principales Détectées**

| Table | Lignes | Taille | Utilisation | Statut |
|-------|--------|---------|-------------|---------|
| `employes_cuisine_new` | 31 | 64 kB | ✅ **ACTIVE** | Cuisine uniquement |
| `employees` | 52 | 88 kB | ⚠️ **LOGISTIQUE** | Autre module |
| `planning_cuisine_new` | 0 | 40 kB | ✅ **PRÊTE** | Vide mais opérationnelle |
| `absences_cuisine_new` | 0 | 64 kB | ✅ **PRÊTE** | Vide mais opérationnelle |
| `planning_cuisine` | 494 | 200 kB | ❌ **ANCIENNE** | Structure différente |
| `vehicles` | 5 | 40 kB | ⚠️ **LOGISTIQUE** | Autre module |
| `competences` | 82 | 120 kB | ⚠️ **LOGISTIQUE** | Véhicules seulement |

---

## 🎯 **Mapping Application → Base de Données**

### **✅ Module Cuisine (CORRIGÉ)**

| Fonctionnalité | Table Utilisée | Structure Réelle | Code Adapté |
|----------------|----------------|------------------|-------------|
| **Employés Cuisine** | `employes_cuisine_new` | Structure directe | ✅ Corrigé |
| **Planning Cuisine** | Hybrid: localStorage + `planning_cuisine_new` | Pas de jointure complexe | ✅ Simplifié |
| **Absences Cuisine** | `absences_cuisine_new` | Sans colonne `statut` | ✅ Corrigé |
| **Compétences Cuisine** | Colonnes booléennes dans `employes_cuisine_new` | Pas de table séparée | ✅ Adapté |
| **Postes Cuisine** | Données en dur (JavaScript) | Pas de table en DB | ✅ Fonction |

---

## 🔍 **Analyse Détaillée par Table**

### **1. `employes_cuisine_new` (ACTIVE)**

**Structure Réelle :**
```sql
TABLE employes_cuisine_new (
  id SERIAL PRIMARY KEY,
  prenom VARCHAR NOT NULL,           -- ← Nom principal
  langue_parlee VARCHAR,             -- ← Profil/langue
  photo_url TEXT,
  actif BOOLEAN DEFAULT true,
  
  -- Horaires par jour
  lundi_debut TIME, lundi_fin TIME,
  mardi_debut TIME, mardi_fin TIME,
  mercredi_debut TIME, mercredi_fin TIME,
  jeudi_debut TIME, jeudi_fin TIME,
  vendredi_debut TIME, vendredi_fin TIME,
  
  -- Compétences (colonnes booléennes)
  cuisine_chaude BOOLEAN DEFAULT false,
  cuisine_froide BOOLEAN DEFAULT false,
  chef_sandwichs BOOLEAN DEFAULT false,
  sandwichs BOOLEAN DEFAULT false,
  vaisselle BOOLEAN DEFAULT false,
  legumerie BOOLEAN DEFAULT false,
  equipe_pina_saskia BOOLEAN DEFAULT false,
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

**Données d'Exemple :**
```json
[
  { "prenom": "Salah", "langue_parlee": "Arabe", "actif": true },
  { "prenom": "Majda", "langue_parlee": "Yougoslave", "actif": true },
  { "prenom": "Mahmoud", "langue_parlee": "Arabe", "actif": true },
  { "prenom": "Mohammad", "langue_parlee": "Arabe", "actif": true },
  { "prenom": "Amar", "langue_parlee": "Arabe", "actif": true },
  { "prenom": "Haile", "langue_parlee": "Tigrinya", "actif": true },
  { "prenom": "Aissatou", "langue_parlee": "Guinéen", "actif": true },
  { "prenom": "Halimatou", "langue_parlee": "Guinéen", "actif": true },
  { "prenom": "Djiatou", "langue_parlee": "Guinéen", "actif": true },
  { "prenom": "Abdul", "langue_parlee": "Bengali", "actif": true }
]
```

**Code Correction :**
```javascript
// AVANT : Structure attendue (ERREUR)
employee.employee.nom 

// APRÈS : Structure réelle (CORRIGÉ)
employee.prenom
```

### **2. `planning_cuisine_new` (PRÊTE)**

**Structure Réelle :**
```sql
TABLE planning_cuisine_new (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employes_cuisine_new(id),
  date DATE NOT NULL,
  poste VARCHAR NOT NULL,           -- Nom du poste
  poste_couleur VARCHAR DEFAULT '#6b7280',
  poste_icone VARCHAR DEFAULT '👨‍🍳',
  creneau VARCHAR NOT NULL,         -- Ex: "05:00-09:00"
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  role VARCHAR DEFAULT 'Équipier',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

**Usage Application :**
- ⚠️ **Hybrid**: localStorage pour rapidité + DB pour persistance
- ✅ **Drag & Drop** : Sauvegarde locale temps réel
- ✅ **Mode TV** : Lecture depuis localStorage + sync events

### **3. `absences_cuisine_new` (PRÊTE)**

**Structure Réelle :**
```sql
TABLE absences_cuisine_new (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employes_cuisine_new(id),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type_absence VARCHAR DEFAULT 'Absent' 
    CHECK (type_absence IN ('Absent', 'Congé', 'Maladie', 'Formation')),
  motif TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
  -- ❌ PAS de colonne 'statut' !
)
```

**Code Correction :**
```javascript
// AVANT : Tentative d'insertion avec statut (ERREUR)
const absenceData = {
  employee_id: 1,
  date_debut: '2025-01-20',
  date_fin: '2025-01-20',
  type_absence: 'Absent',
  statut: 'Confirmée'  // ❌ COLONNE N'EXISTE PAS
};

// APRÈS : Structure corrigée (CORRECT)
const absenceData = {
  employee_id: 1,
  date_debut: '2025-01-20',  
  date_fin: '2025-01-20',
  type_absence: 'Absent',
  motif: 'Absence déclarée par IA'
  // ✅ Pas de statut
};
```

---

## ⚠️ **Tables Inutilisées par l'Application Cuisine**

### **1. `employees` (Module Logistique)**
- **52 employés** avec structure complexe
- **Colonnes :** nom, email, telephone, profil, langues[], permis, etoiles, statut
- **Usage :** Module logistique uniquement
- **Relations :** competences → vehicles

### **2. `planning_cuisine` (Ancienne Version)**
- **494 entrées** avec structure différente
- **Problème :** poste_id au lieu de nom de poste
- **Statut :** Remplacée par `planning_cuisine_new`

### **3. `competences` (Véhicules)**
- **82 compétences** pour véhicules uniquement
- **Relations :** employee_id → vehicles
- **Usage :** Module logistique, pas cuisine

---

## 🔧 **Corrections Appliquées dans le Code**

### **1. supabase-cuisine.js**
```javascript
// ✅ CORRECTION : Structure employés directe
async getEmployeesCuisine() {
  const { data, error } = await supabase
    .from('employes_cuisine_new')  // ← Table correcte
    .select('*')
    .eq('actif', true)
    .order('prenom');              // ← Colonne correcte

  return { data: data || [], error: null };
}

// ✅ CORRECTION : Absences sans statut
async createAbsenceCuisine(absenceData) {
  const cleanData = {
    employee_id: absenceData.employee_id,
    date_debut: absenceData.date_debut,
    date_fin: absenceData.date_fin,
    type_absence: absenceData.type_absence || 'Absent',
    motif: absenceData.motif || null
    // ❌ Supprimé : statut (colonne n'existe pas)
  };
  
  const { data, error } = await supabase
    .from('absences_cuisine_new')  // ← Table correcte
    .insert(cleanData)
    .select(`
      *,
      employe:employes_cuisine_new(id, prenom, photo_url)
    `);
}

// ✅ CORRECTION : Postes en dur
const POSTES_CUISINE = [
  { id: 1, nom: 'Cuisine chaude', couleur: '#ef4444', icone: '🔥' },
  { id: 2, nom: 'Sandwichs', couleur: '#f59e0b', icone: '🥪' },
  { id: 3, nom: 'Pain', couleur: '#eab308', icone: '🍞' },
  { id: 4, nom: 'Jus de fruits', couleur: '#22c55e', icone: '🧃' },
  { id: 5, nom: 'Vaisselle', couleur: '#3b82f6', icone: '🍽️' },
  { id: 6, nom: 'Légumerie', couleur: '#10b981', icone: '🥬' },
  { id: 7, nom: 'Self Midi', couleur: '#8b5cf6', icone: '🍽️' },
  { id: 8, nom: 'Equipe Pina et Saskia', couleur: '#ec4899', icone: '👥' }
];
```

### **2. Hooks Planning**
```javascript
// ✅ CORRECTION : Structure employés adaptée
const availableItems = presentEmployees.map(ec => ({
  draggableId: `emp-${ec.id}`,
  employeeId: ec.id,
  // Structure adaptée : créer un objet employee compatible
  employee: {
    id: ec.id,
    nom: ec.prenom,                    // ← Mapping direct
    profil: ec.langue_parlee || 'Standard',
    statut: ec.actif ? 'Actif' : 'Inactif'
  },
  photo_url: ec.photo_url,
  nom: ec.prenom,
  prenom: ec.prenom
}));
```

### **3. Composants React**
```javascript
// ✅ CORRECTION : Affichage employés
// AVANT
emp.employee.nom

// APRÈS  
emp.prenom
```

---

## 📈 **Métriques Finales**

| Métrique | Valeur | Statut |
|----------|---------|---------|
| **Tables cuisine actives** | 3 | ✅ Opérationnelles |
| **Employés cuisine** | 31 | ✅ Tous chargés |
| **Postes configurés** | 8 | ✅ En dur |
| **Planning entries** | 0 | ✅ Prêt (localStorage) |
| **Absences entries** | 0 | ✅ Prêt |
| **Compétences** | Via colonnes booléennes | ✅ Simplifié |

---

## 🎯 **Architecture Finale**

```
📊 SUPABASE CUISINE SETUP
├── employes_cuisine_new (31 rows) ──► Employés actifs
├── planning_cuisine_new (0 rows) ───► Planning DB (backup)
├── absences_cuisine_new (0 rows) ──► Absences opérationnelles
└── localStorage planning ───────────► Planning temps réel

🔗 WORKFLOW
1. Employés ──► Chargés depuis employes_cuisine_new
2. Planning ──► localStorage (temps réel) + backup DB
3. Absences ──► absences_cuisine_new (direct)
4. Postes ───► Données en dur (pas de table)
5. Mode TV ──► localStorage + sync events
```

---

## ✅ **Conclusion**

### **✅ Problèmes Résolus**
- **Structure employés** : Mapping direct `ec.prenom` au lieu de `ec.employee.nom`
- **Absences** : Suppression colonne `statut` inexistante
- **Planning** : Architecture hybride localStorage + DB
- **Postes** : Données en dur au lieu de table manquante
- **Compétences** : Colonnes booléennes simplifiées

### **🚀 Résultat**
L'application utilise maintenant **EXACTEMENT** la structure Supabase existante :
- ✅ **31 employés** cuisine chargés et affichés
- ✅ **Planning fonctionnel** avec drag & drop
- ✅ **Absences CRUD** opérationnelles
- ✅ **Mode TV** synchronisé
- ✅ **IA intégrée** avec reconnaissance employés

**L'application est maintenant parfaitement alignée avec la base de données réelle !** 🎉 