# 🔄 Migration Planning : LocalStorage → Base Partagée

**Objectif :** Passer du localStorage au partage en temps réel via `planning_cuisine_new`  
**Avantage :** Tous les utilisateurs voient les mêmes données instantanément  
**Simplicité :** Architecture simple mais efficace

---

## 🏗️ **Architecture Cible**

### **🎯 Système Hybride Intelligent**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  FRONTEND       │    │  SUPABASE DB     │    │  AUTRES USERS   │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ planning_cuisine │    │ ┌─────────────┐ │
│ │ Cache 30s   │◄┼────┼─► _new (shared) ◄┼────┼►│ Cache 30s   │ │
│ │ (mémoire)   │ │    │                  │    │ │ (mémoire)   │ │
│ └─────────────┘ │    │                  │    │ └─────────────┘ │
│       ▲         │    │                  │    │       ▲         │
│ ┌─────▼─────┐   │    │                  │    │ ┌─────▼─────┐   │
│ │ Interface │   │    │                  │    │ │ Interface │   │
│ │Drag & Drop│   │    │                  │    │ │Drag & Drop│   │
│ └───────────┘   │    │                  │    │ └───────────┘   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **⚡ Synchronisation Temps Réel**
1. **Drag & Drop** → Sauvegarde immédiate en DB
2. **Polling 30s** → Récupération automatique des changements
3. **Cache mémoire** → Pas de localStorage, performance optimale
4. **Supabase Realtime** (optionnel) → Push instantané

---

## 📊 **Comparatif Solutions**

| Solution | Simplicité | Performance | Partage | Coût Dev |
|----------|------------|-------------|---------|----------|
| **DB + Polling** | 🟢 Simple | 🟡 Bon | ✅ Total | 🟢 Faible |
| **DB + Realtime** | 🟡 Moyen | 🟢 Excellent | ✅ Total | 🟡 Moyen |
| **LocalStorage** | 🟢 Simple | 🟢 Rapide | ❌ Aucun | 🟢 Actuel |

---

## 🔧 **Plan de Migration**

### **ÉTAPE 1 : Adapter la Structure DB**
La table `planning_cuisine_new` est déjà parfaite :
```sql
TABLE planning_cuisine_new (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER,              -- ✅ Employé assigné
  date DATE,                       -- ✅ Date du planning  
  poste VARCHAR,                   -- ✅ "Sandwichs", "Cuisine chaude"
  creneau VARCHAR,                 -- ✅ "05:00-09:00"
  heure_debut TIME,                -- ✅ Heure précise début
  heure_fin TIME,                  -- ✅ Heure précise fin
  role VARCHAR DEFAULT 'Équipier', -- ✅ Rôle de l'employé
  poste_couleur VARCHAR,           -- ✅ Couleur interface
  poste_icone VARCHAR,             -- ✅ Icône interface
  notes TEXT,                      -- ✅ Notes additionnelles
  created_at TIMESTAMPTZ           -- ✅ Traçabilité
)
```

### **ÉTAPE 2 : Créer l'API Planning Partagé**
```javascript
// src/lib/supabase-planning-shared.js

/**
 * PLANNING PARTAGÉ - API Unifiée
 * Remplace localStorage par base de données partagée
 */

// 📥 CHARGEMENT DU PLANNING JOUR
async function getPlanningPartage(date) {
  const { data, error } = await supabase
    .from('planning_cuisine_new')
    .select(`
      *,
      employe:employes_cuisine_new(id, prenom, photo_url, langue_parlee)
    `)
    .eq('date', date)
    .order('heure_debut');

  if (error) return { data: [], error };

  // Conversion vers format board compatible
  const board = {};
  data.forEach(entry => {
    const cellId = `${entry.poste}-${entry.creneau}`;
    if (!board[cellId]) board[cellId] = [];
    
    board[cellId].push({
      draggableId: `db-${entry.id}`,
      employeeId: entry.employee_id,
      planningId: entry.id,
      employee: {
        id: entry.employe.id,
        nom: entry.employe.prenom,
        profil: entry.employe.langue_parlee
      },
      photo_url: entry.employe.photo_url,
      isLocal: false,
      role: entry.role,
      notes: entry.notes
    });
  });

  return { data: board, error: null };
}

// 💾 SAUVEGARDE ASSIGNATION
async function saveAssignationPartage(employeeId, date, poste, creneau, role = 'Équipier') {
  // Calculer heures depuis créneau (ex: "05:00-09:00")
  const [debut, fin] = creneau.split('-');
  
  const assignationData = {
    employee_id: employeeId,
    date: date,
    poste: poste,
    creneau: creneau,
    heure_debut: debut,
    heure_fin: fin,
    role: role,
    poste_couleur: getPosteConfig(poste).couleur,
    poste_icone: getPosteConfig(poste).icone
  };

  const { data, error } = await supabase
    .from('planning_cuisine_new')
    .insert(assignationData)
    .select(`
      *,
      employe:employes_cuisine_new(id, prenom, photo_url)
    `);

  return { data: data?.[0], error };
}

// 🗑️ SUPPRESSION ASSIGNATION
async function deleteAssignationPartage(planningId) {
  const { error } = await supabase
    .from('planning_cuisine_new')
    .delete()
    .eq('id', planningId);

  return { error };
}

// ⚡ VÉRIFICATION CHANGEMENTS (Polling)
async function checkPlanningChanges(date, lastCheck) {
  const { data, error } = await supabase
    .from('planning_cuisine_new')
    .select('id, created_at, employee_id, poste, creneau')
    .eq('date', date)
    .gte('created_at', lastCheck);

  return { 
    hasChanges: data && data.length > 0,
    changes: data || [],
    error
  };
}
```

### **ÉTAPE 3 : Hook Planning Partagé** 
```javascript
// src/planning/hooks/usePlanningShared.js

export const usePlanningShared = (selectedDate) => {
  const [board, setBoard] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  /**
   * Chargement initial depuis DB
   */
  const loadPlanning = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: boardData } = await getPlanningPartage(dateStr);
      
      setBoard(boardData);
      setLastSync(Date.now());
      console.log(`📥 Planning partagé chargé:`, Object.keys(boardData).length, 'cellules');
      
    } catch (error) {
      toast.error('Erreur chargement planning partagé');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  /**
   * Synchronisation automatique (polling 30s)
   */
  useEffect(() => {
    if (!lastSync) return;

    const interval = setInterval(async () => {
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { hasChanges } = await checkPlanningChanges(dateStr, new Date(lastSync));
        
        if (hasChanges) {
          console.log('🔄 Changements détectés, rechargement...');
          await loadPlanning();
          toast.success('Planning mis à jour par un autre utilisateur');
        }
      } catch (error) {
        console.warn('Erreur sync automatique:', error);
      }
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [lastSync, selectedDate, loadPlanning]);

  /**
   * Assignation avec sauvegarde immédiate
   */
  const assignEmployee = useCallback(async (employeeId, cellId, role = 'Équipier') => {
    try {
      // Parser cellId → poste + créneau
      const [poste, creneau] = cellId.split('-', 2);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Sauvegarde immédiate en DB
      const { data: newAssignation } = await saveAssignationPartage(
        employeeId, dateStr, poste, creneau, role
      );
      
      if (newAssignation) {
        // Mise à jour locale immédiate (optimistic update)
        const newBoard = { ...board };
        if (!newBoard[cellId]) newBoard[cellId] = [];
        
        newBoard[cellId].push({
          draggableId: `db-${newAssignation.id}`,
          employeeId: newAssignation.employee_id,
          planningId: newAssignation.id,
          employee: {
            id: newAssignation.employe.id,
            nom: newAssignation.employe.prenom
          },
          isLocal: false
        });
        
        setBoard(newBoard);
        setLastSync(Date.now());
        
        toast.success(`✅ ${newAssignation.employe.prenom} assigné(e) à ${poste}`);
      }
      
    } catch (error) {
      toast.error('Erreur assignation');
      console.error(error);
    }
  }, [board, selectedDate]);

  /**
   * Suppression avec mise à jour immédiate
   */
  const removeAssignment = useCallback(async (planningId, cellId) => {
    try {
      await deleteAssignationPartage(planningId);
      
      // Mise à jour locale
      const newBoard = { ...board };
      if (newBoard[cellId]) {
        newBoard[cellId] = newBoard[cellId].filter(
          item => item.planningId !== planningId
        );
        if (newBoard[cellId].length === 0) {
          delete newBoard[cellId];
        }
      }
      
      setBoard(newBoard);
      setLastSync(Date.now());
      toast.success('Assignation supprimée');
      
    } catch (error) {
      toast.error('Erreur suppression');
    }
  }, [board]);

  return {
    board,
    loading,
    loadPlanning,
    assignEmployee,
    removeAssignment,
    lastSync: lastSync ? new Date(lastSync) : null
  };
};
```

### **ÉTAPE 4 : Migration des Composants**
```javascript
// Modification de CuisinePlanningInteractive.js

// AVANT : localStorage
const { 
  board, 
  saveToLocal 
} = useLocalPlanningSync(selectedDate);

// APRÈS : Planning partagé
const { 
  board, 
  loading,
  assignEmployee,
  removeAssignment,
  lastSync
} = usePlanningShared(selectedDate);

// Drag & Drop adapté
const onDragEnd = async (result) => {
  const { source, destination } = result;
  if (!destination) return;

  if (source.droppableId === 'unassigned') {
    // Assignation
    const draggedItem = availableEmployees[source.index];
    await assignEmployee(draggedItem.employeeId, destination.droppableId);
  } else {
    // Déplacement entre cellules
    // ... logique de déplacement avec sauvegarde DB
  }
};
```

---

## ✅ **Avantages de cette Solution**

### **🌐 Partage Temps Réel**
- ✅ **Tous les utilisateurs** voient les mêmes données
- ✅ **Synchronisation automatique** toutes les 30s
- ✅ **Mise à jour immédiate** pour l'utilisateur actif

### **🚀 Performance**
- ✅ **Cache mémoire** : pas de localStorage
- ✅ **Optimistic updates** : réactivité immédiate
- ✅ **Polling intelligent** : sync légère

### **🔧 Simplicité**
- ✅ **Architecture simple** : pas de WebSocket complexe
- ✅ **Table existante** : `planning_cuisine_new` déjà prête
- ✅ **Migration douce** : remplacement hook par hook

### **📊 Fonctionnalités**
- ✅ **Drag & Drop** : sauvegarde instantanée
- ✅ **Mode TV** : données partagées
- ✅ **Historique** : données persistantes
- ✅ **Multi-utilisateurs** : pas de conflit

---

## 🔄 **Migration Step-by-Step**

### **Phase 1 : Préparation (30 min)**
1. ✅ Table `planning_cuisine_new` déjà prête
2. 🔧 Créer `supabase-planning-shared.js`
3. 🔧 Créer `usePlanningShared.js`

### **Phase 2 : Test (1h)**
1. 🧪 Tester l'API planning partagé
2. 🧪 Vérifier sync entre 2 onglets
3. 🧪 Valider performance drag & drop

### **Phase 3 : Migration (30 min)**
1. 🔄 Remplacer `useLocalPlanningSync` par `usePlanningShared`
2. 🔄 Adapter les handlers drag & drop
3. 🗑️ Nettoyer code localStorage

### **Phase 4 : Amélioration (optionnel)**
1. 🚀 Ajouter Supabase Realtime si besoin
2. 📊 Optimiser requêtes avec cache plus intelligent
3. 🎨 Indicateur "Dernière sync" dans l'interface

---

## 🎯 **Résultat Final**

```
🏢 PLANNING PARTAGÉ CUISINE
├── 📱 Utilisateur A (iPhone) ────┐
├── 💻 Utilisateur B (Desktop) ───┼──► 🗄️ planning_cuisine_new
├── 📺 Mode TV (Affichage) ───────┤     (Base partagée)
└── 🤖 IA Assistant ─────────────┘

✅ Tous voient les mêmes données
✅ Sync automatique 30s
✅ Performance excellente
✅ Architecture simple
```

**Tu auras un système de planning totalement partagé, simple mais efficace !** 🎉 