import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook pour gérer les états React de manière sécurisée
 * Évite les erreurs null/undefined et fournit des valeurs par défaut robustes
 */
export const useSafeState = (initialValue, options = {}) => {
  const {
    fallback = null,
    validator = null,
    onError = null
  } = options;

  const [state, setState] = useState(() => {
    try {
      return initialValue !== undefined ? initialValue : fallback;
    } catch (error) {
      console.warn('⚠️ Erreur initialisation useSafeState:', error);
      return fallback;
    }
  });

  const safeSetState = useCallback((newValue) => {
    try {
      // Si c'est une fonction de mise à jour
      if (typeof newValue === 'function') {
        setState(prevState => {
          try {
            const result = newValue(prevState);
            
            // Valider le résultat si un validateur est fourni
            if (validator && !validator(result)) {
              console.warn('⚠️ Validation échouée pour:', result);
              if (onError) onError(new Error('Validation failed'), result);
              return prevState; // Garder l'ancienne valeur
            }
            
            return result !== undefined ? result : fallback;
          } catch (error) {
            console.warn('⚠️ Erreur fonction mise à jour état:', error);
            if (onError) onError(error, newValue);
            return prevState;
          }
        });
      } else {
        // Valider la nouvelle valeur
        if (validator && !validator(newValue)) {
          console.warn('⚠️ Validation échouée pour:', newValue);
          if (onError) onError(new Error('Validation failed'), newValue);
          return;
        }
        
        setState(newValue !== undefined ? newValue : fallback);
      }
    } catch (error) {
      console.warn('⚠️ Erreur safeSetState:', error);
      if (onError) onError(error, newValue);
    }
  }, [validator, onError, fallback]);

  return [state, safeSetState];
};

/**
 * Hook pour gérer les listes/arrays de manière sécurisée
 */
export const useSafeArray = (initialArray = []) => {
  const [array, setArray] = useSafeState(initialArray, {
    fallback: [],
    validator: (value) => Array.isArray(value),
    onError: (error, value) => {
      console.warn('⚠️ Valeur non-array reçue:', value);
    }
  });

  const safeAdd = useCallback((item) => {
    if (item !== undefined && item !== null) {
      setArray(prev => [...prev, item]);
    }
  }, [setArray]);

  const safeRemove = useCallback((index) => {
    if (typeof index === 'number' && index >= 0) {
      setArray(prev => prev.filter((_, i) => i !== index));
    }
  }, [setArray]);

  const safeUpdate = useCallback((index, newItem) => {
    if (typeof index === 'number' && index >= 0 && newItem !== undefined) {
      setArray(prev => prev.map((item, i) => i === index ? newItem : item));
    }
  }, [setArray]);

  const safeClear = useCallback(() => {
    setArray([]);
  }, [setArray]);

  return {
    items: array,
    setItems: setArray,
    addItem: safeAdd,
    removeItem: safeRemove,
    updateItem: safeUpdate,
    clearItems: safeClear,
    count: array.length
  };
};

/**
 * Hook pour gérer les objets de manière sécurisée
 */
export const useSafeObject = (initialObject = {}) => {
  const [object, setObject] = useSafeState(initialObject, {
    fallback: {},
    validator: (value) => typeof value === 'object' && value !== null,
    onError: (error, value) => {
      console.warn('⚠️ Valeur non-object reçue:', value);
    }
  });

  const safeUpdateProperty = useCallback((key, value) => {
    if (key && value !== undefined) {
      setObject(prev => ({
        ...prev,
        [key]: value
      }));
    }
  }, [setObject]);

  const safeRemoveProperty = useCallback((key) => {
    if (key) {
      setObject(prev => {
        const newObj = { ...prev };
        delete newObj[key];
        return newObj;
      });
    }
  }, [setObject]);

  const safeGet = useCallback((key, defaultValue = null) => {
    return object && object[key] !== undefined ? object[key] : defaultValue;
  }, [object]);

  return {
    data: object,
    setData: setObject,
    updateProperty: safeUpdateProperty,
    removeProperty: safeRemoveProperty,
    get: safeGet,
    keys: Object.keys(object || {}),
    isEmpty: !object || Object.keys(object).length === 0
  };
};

/**
 * Hook pour gérer les employés sélectionnés de manière sécurisée
 */
export const useSafeEmployee = (initialEmployee = null) => {
  const [employee, setEmployee] = useSafeState(initialEmployee, {
    fallback: null,
    validator: (value) => value === null || (typeof value === 'object' && value.employee),
    onError: (error, value) => {
      console.warn('⚠️ Employé invalide:', value);
    }
  });

  const selectEmployee = useCallback((emp) => {
    if (emp && emp.employee && emp.employee.nom) {
      setEmployee(emp);
    } else {
      console.warn('⚠️ Tentative de sélection employé invalide:', emp);
    }
  }, [setEmployee]);

  const clearEmployee = useCallback(() => {
    setEmployee(null);
  }, [setEmployee]);

  const isSelected = employee !== null;
  const employeeName = employee?.employee?.nom || '';
  const employeeId = employee?.employee_id || null;

  return {
    employee,
    setEmployee: selectEmployee,
    clearEmployee,
    isSelected,
    employeeName,
    employeeId
  };
};

/**
 * Hook pour gérer les états de chargement avec timeout automatique
 */
export const useSafeLoading = (initialLoading = false, timeoutMs = 30000) => {
  const [loading, setLoading] = useSafeState(initialLoading, {
    fallback: false,
    validator: (value) => typeof value === 'boolean'
  });

  const timeoutRef = useRef(null);

  const startLoading = useCallback(() => {
    setLoading(true);
    
    // Timeout automatique pour éviter les chargements infinis
    if (timeoutMs > 0) {
      timeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Timeout de chargement atteint');
        setLoading(false);
      }, timeoutMs);
    }
  }, [setLoading, timeoutMs]);

  const stopLoading = useCallback(() => {
    setLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [setLoading]);

  // Nettoyage du timeout au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    loading,
    startLoading,
    stopLoading,
    setLoading: (value) => {
      if (value) {
        startLoading();
      } else {
        stopLoading();
      }
    }
  };
};

/**
 * Hook pour gérer les erreurs de manière centralisée
 */
export const useSafeError = () => {
  const [error, setError] = useSafeState(null, {
    fallback: null
  });

  const handleError = useCallback((err, context = '') => {
    const errorInfo = {
      message: err?.message || 'Erreur inconnue',
      context,
      timestamp: new Date().toISOString(),
      stack: err?.stack || ''
    };

    setError(errorInfo);
    
    // Log pour debug
    console.group('🚨 Erreur capturée');
    console.error('Context:', context);
    console.error('Error:', err);
    console.groupEnd();

    // TODO: Envoyer à un service de monitoring d'erreurs
  }, [setError]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    error,
    hasError: error !== null,
    handleError,
    clearError
  };
}; 