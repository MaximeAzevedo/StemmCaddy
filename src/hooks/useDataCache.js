import { useState, useEffect, useRef } from 'react';

/**
 * 🧠 SYSTÈME DE CACHE INTELLIGENT
 * 
 * Évite les rechargements constants et les boucles infinies
 * en mettant en cache les données avec TTL et invalidation smart
 */

// Cache global partagé entre tous les composants
const globalCache = new Map();
const cacheTimestamps = new Map();

// Configuration du cache
const CACHE_CONFIG = {
  // TTL par type de données (en millisecondes)
  TTL: {
    employees: 5 * 60 * 1000,      // 5 minutes
    competences: 10 * 60 * 1000,   // 10 minutes  
    postes: 30 * 60 * 1000,        // 30 minutes (change rarement)
    planning: 2 * 60 * 1000,       // 2 minutes (change souvent)
    absences: 1 * 60 * 1000        // 1 minute (temps réel)
  },
  
  // Taille maximale du cache
  MAX_SIZE: 100
};

/**
 * Hook de cache avec invalidation intelligente
 */
export const useDataCache = (key, fetchFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const fetchRef = useRef(fetchFunction);
  const dependencyRef = useRef(dependencies);
  
  // Mise à jour des refs sans déclencher de re-render
  useEffect(() => {
    fetchRef.current = fetchFunction;
    dependencyRef.current = dependencies;
  });

  /**
   * Vérifier si les données en cache sont encore valides
   */
  const isCacheValid = (cacheKey) => {
    const timestamp = cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    const dataType = cacheKey.split(':')[0];
    const ttl = CACHE_CONFIG.TTL[dataType] || CACHE_CONFIG.TTL.employees;
    
    return (Date.now() - timestamp) < ttl;
  };

  /**
   * Nettoyer le cache si il devient trop volumineux
   */
  const cleanupCache = () => {
    if (globalCache.size > CACHE_CONFIG.MAX_SIZE) {
      console.log('🧹 Nettoyage du cache (taille dépassée)');
      
      // Supprimer les entrées les plus anciennes
      const entries = Array.from(cacheTimestamps.entries())
        .sort(([,a], [,b]) => a - b)
        .slice(0, 20); // Garder les 20 plus récentes
      
      globalCache.clear();
      cacheTimestamps.clear();
      
      entries.forEach(([key, timestamp]) => {
        cacheTimestamps.set(key, timestamp);
      });
    }
  };

  /**
   * Fonction de chargement avec cache
   */
  const loadData = async (forceRefresh = false) => {
    try {
      const cacheKey = `${key}:${JSON.stringify(dependencyRef.current)}`;
      
      // Vérifier le cache si pas de forceRefresh
      if (!forceRefresh && isCacheValid(cacheKey)) {
        const cachedData = globalCache.get(cacheKey);
        if (cachedData) {
          console.log(`💾 Données récupérées du cache: ${key}`);
          setData(cachedData);
          setError(null);
          setLastUpdated(cacheTimestamps.get(cacheKey));
          setLoading(false);
          return cachedData;
        }
      }

      // Chargement depuis l'API
      console.log(`🔄 Chargement depuis l'API: ${key}`);
      setLoading(true);
      setError(null);
      
      const result = await fetchRef.current();
      
      if (result.error) {
        throw new Error(result.error.message || 'Erreur de chargement');
      }
      
      // Mise en cache
      const timestamp = Date.now();
      globalCache.set(cacheKey, result.data);
      cacheTimestamps.set(cacheKey, timestamp);
      
      // Nettoyage si nécessaire
      cleanupCache();
      
      setData(result.data);
      setLastUpdated(timestamp);
      setLoading(false);
      
      console.log(`✅ Données mises en cache: ${key}`, {
        taille: Array.isArray(result.data) ? result.data.length : 'object'
      });
      
      return result.data;
      
    } catch (err) {
      console.error(`❌ Erreur chargement ${key}:`, err);
      setError(err);
      setLoading(false);
      return null;
    }
  };

  /**
   * Invalidation du cache pour une clé spécifique
   */
  const invalidateCache = (targetKey = key) => {
    console.log(`🗑️ Invalidation cache: ${targetKey}`);
    
    // Supprimer toutes les entrées qui correspondent à la clé
    Array.from(globalCache.keys())
      .filter(k => k.startsWith(targetKey))
      .forEach(k => {
        globalCache.delete(k);
        cacheTimestamps.delete(k);
      });
  };

  /**
   * Invalidation globale du cache
   */
  const clearAllCache = () => {
    console.log('🧹 Nettoyage complet du cache');
    globalCache.clear();
    cacheTimestamps.clear();
  };

  /**
   * Préchargement en arrière-plan
   */
  const preloadData = async () => {
    await loadData(false); // Utilise le cache si disponible
  };

  // Chargement initial
  useEffect(() => {
    loadData();
  }, [key]); // Seule dépendance : la clé

  // Information sur le cache
  const cacheInfo = {
    isFromCache: isCacheValid(`${key}:${JSON.stringify(dependencies)}`),
    lastUpdated,
    cacheSize: globalCache.size,
    canRefresh: !loading
  };

  return {
    data,
    loading,
    error,
    refresh: () => loadData(true),
    preload: preloadData,
    invalidate: invalidateCache,
    clearCache: clearAllCache,
    cacheInfo
  };
};

/**
 * Hook spécialisé pour les employés cuisine
 */
export const useEmployeesCuisineCache = (dependencies = []) => {
  const { unifiedSupabase } = require('../lib/supabase-unified');
  
  return useDataCache(
    'employes_cuisine',
    () => unifiedSupabase.employees.getCuisine(),
    dependencies
  );
};

/**
 * Hook spécialisé pour les compétences cuisine
 */
export const useCompetencesCuisineCache = (dependencies = []) => {
  const { unifiedSupabase } = require('../lib/supabase-unified');
  
  return useDataCache(
    'competences_cuisine',
    () => unifiedSupabase.competences.getByCuisine(),
    dependencies
  );
};

/**
 * Hook spécialisé pour les postes cuisine
 */
export const usePostesCuisineCache = (dependencies = []) => {
  const { unifiedSupabase } = require('../lib/supabase-unified');
  
  // Dans le nouveau système, les postes sont codés en dur
  const getPostesCuisineStatic = () => {
    const postes = [
      { id: 1, nom: 'Cuisine chaude', couleur: '#f59e0b', icone: '🔥' },
      { id: 2, nom: 'Cuisine froide', couleur: '#06b6d4', icone: '❄️' },
      { id: 3, nom: 'Chef sandwichs', couleur: '#8b5cf6', icone: '👨‍🍳' },
      { id: 4, nom: 'Sandwichs', couleur: '#10b981', icone: '🥪' },
      { id: 5, nom: 'Vaisselle', couleur: '#6b7280', icone: '🍽️' },
      { id: 6, nom: 'Légumerie', couleur: '#84cc16', icone: '🥬' },
      { id: 7, nom: 'Équipe Pina et Saskia', couleur: '#ec4899', icone: '🧊' }
    ];
    return Promise.resolve({ data: postes, error: null });
  };
  
  return useDataCache(
    'postes_cuisine_static',
    getPostesCuisineStatic,
    dependencies
  );
};

/**
 * Utilitaires pour le debug du cache
 */
export const cacheDebug = {
  /**
   * Afficher l'état actuel du cache
   */
  logCacheState() {
    console.group('📊 État du Cache');
    console.log('Taille:', globalCache.size);
    console.log('Clés:', Array.from(globalCache.keys()));
    console.log('Timestamps:', Array.from(cacheTimestamps.entries()));
    console.groupEnd();
  },

  /**
   * Vérifier la validité d'une clé
   */
  checkValidity(key) {
    const isValid = Array.from(globalCache.keys())
      .filter(k => k.startsWith(key))
      .map(k => ({
        key: k,
        timestamp: cacheTimestamps.get(k),
        age: Date.now() - cacheTimestamps.get(k),
        valid: this.isCacheValid(k)
      }));
      
    console.table(isValid);
    return isValid;
  }
};

export default useDataCache; 