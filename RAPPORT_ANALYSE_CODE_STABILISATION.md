# 📋 PLAN DE REFACTORING PRIORITAIRE - MODULE CUISINE

## 🚨 **ACTIONS IMMÉDIATES** (0-2h)

### 1. **Remplacer les regex défaillantes**
```bash
# Remplacer ia-action-engine.js par la version corrigée
mv src/lib/ia-action-engine.js src/lib/ia-action-engine-old.js
mv src/lib/ia-action-engine-fixed.js src/lib/ia-action-engine.js
```

### 2. **Intégrer les hooks sécurisés dans CuisineManagement**
```javascript
// Remplacer les useState fragiles
import { useSafeEmployee, useSafeLoading, useSafeError, useSafeArray } from '../hooks/useSafeState';

// Au lieu de:
const [selectedEmployee, setSelectedEmployee] = useState(null);
const [loading, setLoading] = useState(true);
const [employees, setEmployees] = useState([]);

// Utiliser:
const { employee: selectedEmployee, selectEmployee, clearEmployee } = useSafeEmployee();
const { loading, startLoading, stopLoading } = useSafeLoading();
const { items: employees, setItems: setEmployees } = useSafeArray();
```

### 3. **Ajouter protection null partout**
```javascript
// Protection automatique des accès
const employeeName = selectedEmployee?.employee?.nom || 'Inconnu';
const employeeId = selectedEmployee?.employee_id || 0;

// Validation avant actions critiques
if (!selectedEmployee?.employee?.nom) {
  toast.warning('Veuillez sélectionner un employé valide');
  return;
}
```

---

## ⚡ **OPTIMISATIONS PERFORMANCE** (2-4h)

### 1. **Mise en cache des données**
```javascript
// Cache API avec React Query ou SWR
const useEmployeesCuisine = () => {
  return useQuery(
    ['employees-cuisine'],
    () => supabaseCuisine.getEmployeesCuisine(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    }
  );
};
```

### 2. **Optimisation des re-renders**
```javascript
// Memoïser les composants coûteux
const EmployeeCard = React.memo(({ employee, onClick }) => {
  // ...
});

// Memoïser les fonctions de callback
const handleEmployeeSelect = useCallback((emp) => {
  selectEmployee(emp);
}, [selectEmployee]);

// Memoïser les calculs lourds
const filteredEmployees = useMemo(() => {
  return employees.filter(emp => 
    emp.employee.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [employees, searchTerm]);
```

### 3. **Lazy loading des composants**
```javascript
// Chargement différé des composants lourds
const CuisinePlanningInteractive = lazy(() => import('./CuisinePlanningInteractive'));
const EmployeeDetail = lazy(() => import('./EmployeeDetail'));

// Dans le render
<Suspense fallback={<LoadingSpinner />}>
  <CuisinePlanningInteractive />
</Suspense>
```

---

## 🛡️ **ROBUSTESSE & TESTS** (4-6h)

### 1. **Error Boundaries**
```javascript
// Wrapper de protection pour chaque module
const CuisineErrorBoundary = ({ children }) => (
  <ErrorBoundary
    fallback={<CuisineErrorFallback />}
    onError={(error, errorInfo) => {
      console.error('🚨 Erreur Module Cuisine:', error);
      // Envoyer à un service de monitoring
    }}
  >
    {children}
  </ErrorBoundary>
);
```

### 2. **Validation de données**
```javascript
// Schémas de validation avec Zod ou Yup
const EmployeeSchema = z.object({
  employee_id: z.number().positive(),
  employee: z.object({
    nom: z.string().min(1),
    profil: z.enum(['Débutant', 'Intermédiaire', 'Expérimenté', 'Expert']),
    statut: z.enum(['Actif', 'Inactif'])
  }),
  photo_url: z.string().url().optional()
});

// Validation avant utilisation
const validatedEmployee = EmployeeSchema.safeParse(rawEmployee);
if (!validatedEmployee.success) {
  handleError(new Error('Données employé invalides'));
  return;
}
```

### 3. **Tests unitaires critiques**
```javascript
// Tests pour les hooks sécurisés
describe('useSafeEmployee', () => {
  test('doit gérer les employés null sans erreur', () => {
    // ...
  });
  
  test('doit valider la structure employé', () => {
    // ...
  });
});

// Tests pour les composants fragiles
describe('CuisineManagement', () => {
  test('doit afficher fallback si pas d\'employés', () => {
    // ...
  });
});
```

---

## 🔧 **REFACTORING STRUCTUREL** (6-8h)

### 1. **Architecture en couches**
```
src/
├── hooks/          # Hooks réutilisables sécurisés
├── services/       # Services API avec cache
├── components/
│   ├── cuisine/    # Composants cuisine spécialisés
│   ├── common/     # Composants réutilisables
│   └── layout/     # Composants de mise en page
├── utils/          # Utilitaires et helpers
├── types/          # Types TypeScript
└── constants/      # Constantes et config
```

### 2. **Context API pour état global**
```javascript
// Context pour l'état cuisine global
const CuisineContext = createContext();

export const CuisineProvider = ({ children }) => {
  const { items: employees, setItems: setEmployees } = useSafeArray();
  const { loading, startLoading, stopLoading } = useSafeLoading();
  const { error, handleError, clearError } = useSafeError();
  
  return (
    <CuisineContext.Provider value={{
      employees, setEmployees,
      loading, startLoading, stopLoading,
      error, handleError, clearError
    }}>
      {children}
    </CuisineContext.Provider>
  );
};
```

### 3. **Migration vers TypeScript** (Optionnel)
```typescript
// Types stricts pour éviter les erreurs
interface Employee {
  employee_id: number;
  employee: {
    nom: string;
    profil: 'Débutant' | 'Intermédiaire' | 'Expérimenté' | 'Expert';
    statut: 'Actif' | 'Inactif';
    langues: string[];
  };
  photo_url?: string;
}

interface CuisineState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  loading: boolean;
  error: string | null;
}
```

---

## 📊 **MÉTRIQUES DE SUCCÈS**

### Avant refactoring:
- ❌ **20+ warnings ESLint**
- ❌ **3-5 crashes par session**
- ❌ **500ms+ temps de chargement**
- ❌ **15-20 re-renders par action**

### Après refactoring:
- ✅ **0 warnings ESLint**
- ✅ **0 crashes (Error Boundaries)**
- ✅ **<200ms temps de chargement**
- ✅ **2-3 re-renders par action**

---

## 🚀 **PROCHAINES ÉTAPES**

1. **Immédiat** (0-1h): Appliquer les corrections critiques
2. **Court terme** (1-2h): Intégrer les hooks sécurisés
3. **Moyen terme** (2-4h): Optimisations performance
4. **Long terme** (4-8h): Refactoring structurel complet

**Priorité absolue**: Éliminer les erreurs récurrentes et stabiliser l'interface utilisateur. 