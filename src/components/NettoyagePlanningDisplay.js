import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const NettoyagePlanningDisplay = () => {
  const [searchParams] = useSearchParams();
  const [nettoyageData, setNettoyageData] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentGroup, setCurrentGroup] = useState(1); // 1 ou 2 pour alterner
  const [timeLeft, setTimeLeft] = useState(20); // Compte à rebours
  const [isPaused, setIsPaused] = useState(false); // État de pause
  
  // ✅ Paramètres URL avec date dynamique
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  // ✅ ZONES NETTOYAGE MODE TV
  const ZONES_NETTOYAGE = [
    { id: 1, nom: 'Plonge', couleur: '#3b82f6', image: '/images/nettoyage/plonge.jpg', icone: '🧽' },
    { id: 2, nom: 'Couloir sale et frigo', couleur: '#ef4444', image: '/images/nettoyage/couloir-sale-frigo.jpg', icone: '🚪' },
    { id: 3, nom: 'Légumerie', couleur: '#10b981', image: '/images/nettoyage/legumerie.jpg', icone: '🥬' },
    { id: 4, nom: 'Cuisine chaude', couleur: '#f59e0b', image: '/images/nettoyage/cuisine-chaude.jpg', icone: '🔥' },
    { id: 5, nom: 'Sandwicherie et sous vide', couleur: '#8b5cf6', image: '/images/nettoyage/sandwicherie-sous-vide.jpg', icone: '🥪' },
    { id: 6, nom: 'Couloir propre et frigo', couleur: '#22c55e', image: '/images/nettoyage/couloir-propre-frigo.jpg', icone: '✨' }
  ];

  // ✅ GROUPES DE ROTATION (3 zones par groupe)
  const ZONES_GROUPS = {
    1: [1, 2, 3], // Plonge, Couloir sale, Légumerie
    2: [4, 5, 6]  // Cuisine chaude, Sandwicherie, Couloir propre
  };

  const groupNames = {
    1: 'Zones Préparation',
    2: 'Zones Finition'
  };

  /**
   * ✅ Charger les données de nettoyage
   */
  const loadNettoyageData = useCallback(async () => {
    try {
      console.log('🧹 Chargement planning nettoyage TV...');
      setLoading(true);
      
      const result = await supabaseCuisine.loadPlanningNettoyage(new Date(dateParam));
      
      if (result.error) {
        console.error('❌ Erreur chargement nettoyage TV:', result.error);
        setNettoyageData({});
        return;
      }
      
      setNettoyageData(result.data || {});
      console.log('✅ Planning nettoyage TV chargé');
      
    } catch (error) {
      console.error('❌ Erreur chargement nettoyage TV:', error);
      setNettoyageData({});
    } finally {
      setLoading(false);
    }
  }, [dateParam]);

  /**
   * ✅ ROTATION AUTOMATIQUE toutes les 15 secondes avec timer visuel
   */
  useEffect(() => {
    if (isPaused) return; // Ne pas tourner si en pause

    const rotationInterval = setInterval(() => {
      setCurrentGroup(prev => prev === 1 ? 2 : 1);
      setTimeLeft(20); // Reset le timer
      console.log(`🧹 Rotation vers groupe ${currentGroup === 1 ? 2 : 1}`);
    }, 20000); // 20 secondes

    const timerInterval = setInterval(() => {
      if (!isPaused) {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 20);
      }
    }, 1000); // Chaque seconde

    return () => {
      clearInterval(rotationInterval);
      clearInterval(timerInterval);
    };
  }, [isPaused, currentGroup]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    console.log(`🧹 Timer ${!isPaused ? 'mis en pause' : 'repris'}`);
  };

  const switchGroup = () => {
    setCurrentGroup(prev => prev === 1 ? 2 : 1);
    setTimeLeft(20); // Reset le timer
    console.log(`🧹 Switch manuel vers groupe ${currentGroup === 1 ? 2 : 1}`);
  };

  // ✅ Charger les données au montage et auto-actualisation
  useEffect(() => {
    loadNettoyageData();
    
    // Auto-actualisation toutes les 30 secondes
    const interval = setInterval(() => {
      loadNettoyageData();
      console.log('🔄 Auto-actualisation planning nettoyage TV');
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadNettoyageData]);

  /**
   * ✅ Rendu d'un employé assigné à une zone
   */
  const renderEmployeeInZone = (employee) => (
    <div 
      key={employee.id}
      className="bg-white/90 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
    >
      <div className="flex items-center gap-3">
        {/* Photo */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0 overflow-hidden">
          {employee.photo_url ? (
            <img 
              src={employee.photo_url} 
              alt={employee.nom}
              className="w-full h-full rounded-full object-cover"
              style={{ 
                objectPosition: 'center top',
                objectFit: 'cover',
                minWidth: '100%',
                minHeight: '100%'
              }}
            />
          ) : (
            employee.nom?.charAt(0)?.toUpperCase() || '?'
          )}
        </div>
        
        {/* Nom et prénom */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 text-lg truncate">
            {employee.nom}
          </div>
          <div className="text-sm text-gray-600 font-medium">
            {employee.prenom || 'Employé'}
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * ✅ Rendu d'une zone de nettoyage (photos 2x plus grandes)
   */
  const renderZone = (zone) => {
    const assignedEmployees = nettoyageData[zone.id] || [];
    
    return (
      <div key={zone.id} className="bg-white/60 backdrop-blur-md border border-white/30 rounded-3xl shadow-xl p-6">
        {/* Header de zone avec image agrandie */}
        <div className="text-center mb-6">
          <div 
            className="w-64 h-64 mx-auto rounded-3xl shadow-2xl mb-4 flex items-center justify-center text-6xl overflow-hidden"
            style={{ backgroundColor: zone.couleur + '20', border: `3px solid ${zone.couleur}` }}
          >
            <img 
              src={zone.image} 
              alt={zone.nom}
              className="w-full h-full object-cover object-center rounded-3xl"
              style={{ objectPosition: 'center center' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div 
              className="w-full h-full flex items-center justify-center text-6xl"
              style={{ display: 'none' }}
            >
              {zone.icone}
            </div>
          </div>
          
          <h3 
            className="text-3xl font-bold mb-2"
            style={{ color: zone.couleur }}
          >
            {zone.icone} {zone.nom}
          </h3>
          
          <div className="text-xl text-gray-600 font-medium">
            {assignedEmployees.length} personne{assignedEmployees.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Employés assignés */}
        <div className="space-y-3">
          {assignedEmployees.length > 0 ? (
            assignedEmployees.map(employee => renderEmployeeInZone(employee))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🚫</div>
              <div className="text-lg font-medium">Aucune assignation</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-100 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Chargement du Mode TV</h2>
          <p className="text-gray-600">Planning Nettoyage en cours de chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-blue-100 text-gray-800 p-6">
      {/* ✅ Header Premium avec contrôles */}
      <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl p-6 mb-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-green-600 via-blue-600 to-purple-500 bg-clip-text text-transparent">
            🧹 Planning Nettoyage - Mode TV
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            📅 {format(new Date(dateParam), 'dd/MM/yyyy')} • 
            ✨ Rotation automatique des zones
          </p>
          <div className="mt-6 flex justify-center items-center gap-6">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-full px-8 py-3 text-lg font-semibold shadow-lg">
              Groupe {currentGroup} • {groupNames[currentGroup]}
            </div>
            <div className={`rounded-full px-6 py-3 text-sm font-medium shadow-lg ${
              isPaused 
                ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white' 
                : 'bg-white/80 text-gray-700 border border-gray-200'
            }`}>
              {isPaused ? '⏸️ PAUSE' : `⏱️ ${timeLeft}s`}
            </div>
            
            {/* Boutons de contrôle Premium */}
            <button 
              onClick={togglePause}
              className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isPaused ? '▶️ Play' : '⏸️ Pause'}
            </button>
            <button 
              onClick={switchGroup}
              className="bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🔄 Switch
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Grille des zones du groupe actuel (3 colonnes) */}
      <div className="grid grid-cols-3 gap-8 max-w-7xl mx-auto">
        {ZONES_NETTOYAGE
          .filter(zone => ZONES_GROUPS[currentGroup].includes(zone.id))
          .map(zone => renderZone(zone))
        }
      </div>


    </div>
  );
};

export default NettoyagePlanningDisplay; 