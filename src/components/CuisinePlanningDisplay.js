import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { getSessionConfig } from '../planning/config';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import { getCreneauxForPoste } from '../planning/config';

const CuisinePlanningDisplay = () => {
  const [searchParams] = useSearchParams();
  const [localBoard, setLocalBoard] = useState({});
  const [postes, setPostes] = useState([]);
  const [employeesCuisine, setEmployeesCuisine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentGroup, setCurrentGroup] = useState(1); // 1 ou 2 pour alterner
  const [timeLeft, setTimeLeft] = useState(15); // Compte à rebours
  const [isPaused, setIsPaused] = useState(false); // État de pause
  
  // Paramètres URL ou valeurs par défaut
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const sessionParam = searchParams.get('session') || 'matin';

  // ✅ GROUPES DE ROTATION
  const postesGroups = {
    1: ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits'],
    2: ['Vaisselle', 'Légumerie', 'Self Midi', 'Equipe Pina et Saskia']
  };

  const groupNames = {
    1: 'Préparation & Service',
    2: 'Support & Nettoyage'
  };

  /**
   * ✅ ROTATION AUTOMATIQUE toutes les 15 secondes avec timer visuel
   */
  useEffect(() => {
    if (isPaused) return; // Ne pas tourner si en pause

    const rotationInterval = setInterval(() => {
      setCurrentGroup(prev => prev === 1 ? 2 : 1);
      setTimeLeft(15); // Reset le timer
      console.log(`📺 Rotation vers groupe ${currentGroup === 1 ? 2 : 1}`);
    }, 15000); // 15 secondes

    const timerInterval = setInterval(() => {
      if (!isPaused) {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 15);
      }
    }, 1000); // Chaque seconde

    return () => {
      clearInterval(rotationInterval);
      clearInterval(timerInterval);
    };
  }, [currentGroup, isPaused]);

  /**
   * ✅ CONTRÔLES MANUELS
   */
  const togglePause = () => {
    setIsPaused(!isPaused);
    console.log(`📺 Timer ${!isPaused ? 'mis en pause' : 'repris'}`);
  };

  const switchGroup = () => {
    setCurrentGroup(prev => prev === 1 ? 2 : 1);
    setTimeLeft(15); // Reset le timer
    console.log(`📺 Switch manuel vers groupe ${currentGroup === 1 ? 2 : 1}`);
  };

  /**
   * ✅ CHARGEMENT AUTONOME RAPIDE pour Mode TV uniquement
   */
  const loadTVData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📺 Mode TV - Chargement autonome rapide...');
      
      // Chargement minimal : postes + employés seulement (pas d'absences, compétences, etc.)
      const [postesRes, employeesRes] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getEmployeesCuisine()
      ]);
      
      if (postesRes.data) setPostes(postesRes.data);
      if (employeesRes.data) setEmployeesCuisine(employeesRes.data);
      
      console.log('📺 Mode TV - Données chargées:', {
        postes: postesRes.data?.length || 0,
        employés: employeesRes.data?.length || 0
      });
      
    } catch (error) {
      console.error('❌ Mode TV - Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Chargement du planning depuis localStorage  
   */
  const loadLocalPlanning = useCallback(() => {
    try {
      const planningKey = `planning-${dateParam}`;
      const saved = localStorage.getItem(planningKey);
      
      if (saved) {
        const data = JSON.parse(saved);
        console.log('📺 Mode TV - Planning chargé depuis localStorage:', data.planning ? Object.keys(data.planning).length : 0, 'cellules');
        setLocalBoard(data.planning || {});
        return data.planning || {};
      }
      
      console.log('📺 Mode TV - Aucun planning local trouvé');
      return {};
    } catch (error) {
      console.error('❌ Erreur chargement planning local pour TV:', error);
      return {};
    }
  }, [dateParam]);

  /**
   * Synchronisation automatique avec localStorage
   */
  useEffect(() => {
    // Chargement initial
    loadLocalPlanning();

    // Écouter les events de mise à jour du planning
    const handlePlanningUpdate = (event) => {
      const { detail } = event;
      if (detail.date === dateParam) {
        console.log('📺 Mode TV - Synchronisation en temps réel reçue');
        setLocalBoard(detail.planning);
      }
    };

    // Écouter les events de reset
    const handlePlanningReset = (event) => {
      const { detail } = event;
      if (detail.date === dateParam) {
        console.log('📺 Mode TV - Reset reçu');
        setLocalBoard({});
      }
    };

    // Polling de sécurité toutes les 5 secondes
    const pollInterval = setInterval(() => {
      loadLocalPlanning();
    }, 5000);

    // Abonnement aux events
    window.addEventListener('planning-updated', handlePlanningUpdate);
    window.addEventListener('planning-reset', handlePlanningReset);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('planning-updated', handlePlanningUpdate);
      window.removeEventListener('planning-reset', handlePlanningReset);
    };
  }, [dateParam, loadLocalPlanning]);

  /**
   * ✅ CHARGEMENT INITIAL des données métier pour Mode TV
   */
  useEffect(() => {
    const initializeMetaData = async () => {
      try {
        console.log('📺 Mode TV - Chargement des données métier...');
        await loadTVData();
        console.log('📺 Mode TV - Données métier chargées avec succès');
      } catch (error) {
        console.error('❌ Mode TV - Erreur chargement données métier:', error);
      }
    };

    initializeMetaData();
  }, [loadTVData]);

  /**
   * Obtenir les employés assignés pour un poste/créneau depuis localStorage
   */
  const getEmployeesForPosteCreneauLocal = (posteName, creneau) => {
    if (!postes || !employeesCuisine) return [];
    
    const poste = postes.find(p => p.nom === posteName);
    if (!poste) return [];
    
    const cellId = `${poste.id}-${creneau}`;
    const assignedItems = localBoard[cellId] || [];
    
    return assignedItems.map(item => {
      const empCuisine = employeesCuisine.find(ec => ec.id === item.employeeId);
      return empCuisine ? {
        ...empCuisine,
        isAIGenerated: item.generatedBy === 'ai'
      } : null;
    }).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Chargement du Mode TV</h2>
          <p className="text-blue-200">
            Chargement des données métier...
          </p>
        </div>
      </div>
    );
  }

  const conf = getSessionConfig(sessionParam);
  const postesActifs = postes?.filter(p => 
    conf.postesActifs.includes(p.nom) && 
    postesGroups[currentGroup].includes(p.nom)
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-6">
      {/* ✅ Header simplifié avec indicateur de groupe */}
      <div className="bg-black bg-opacity-30 backdrop-blur-sm rounded-2xl p-6 mb-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            🍽️ Planning Cuisine - Mode TV
          </h1>
          <p className="text-xl text-blue-200">
            📅 {format(new Date(dateParam), 'dd/MM/yyyy')} • 
            ⏰ Session {conf.label}
          </p>
          <div className="mt-4 flex justify-center items-center gap-4">
            <div className="bg-blue-600 bg-opacity-50 rounded-full px-6 py-2 text-lg font-semibold">
              Groupe {currentGroup} • {groupNames[currentGroup]}
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-medium ${
              isPaused ? 'bg-orange-600 bg-opacity-50' : 'bg-gray-600 bg-opacity-50'
            }`}>
              {isPaused ? '⏸️ PAUSE' : `⏱️ ${timeLeft}s`}
            </div>
            
            {/* Boutons de contrôle */}
            <button 
              onClick={togglePause}
              className="bg-green-600 bg-opacity-70 hover:bg-opacity-90 rounded-full px-4 py-2 text-sm font-medium transition-all"
            >
              {isPaused ? '▶️ Play' : '⏸️ Pause'}
            </button>
            <button 
              onClick={switchGroup}
              className="bg-purple-600 bg-opacity-70 hover:bg-opacity-90 rounded-full px-4 py-2 text-sm font-medium transition-all"
            >
              🔄 Switch
            </button>
          </div>
        </div>
      </div>

      {/* Grid 4 colonnes - Une colonne par poste */}
      <div className="grid grid-cols-4 gap-8 h-full">
        {postesActifs.map((poste) => {
          const creneauxForPoste = getCreneauxForPoste(poste.nom, sessionParam);
          
          // Récupérer tous les employés de tous les créneaux pour ce poste
          const allEmployeesForPoste = creneauxForPoste.flatMap(creneau => 
            getEmployeesForPosteCreneauLocal(poste.nom, creneau).map(emp => ({
              ...emp,
              creneau
            }))
          );

          return (
            <div key={poste.id} className="flex flex-col h-full">
              {/* Header du poste */}
              <div 
                className="rounded-t-3xl p-4 text-white text-center mb-6"
                style={{ backgroundColor: poste.couleur }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">{poste.icone}</span>
                  <h3 className="text-2xl font-bold">{poste.nom}</h3>
                  <div className="text-lg font-semibold mt-1">
                    {allEmployeesForPoste.length} employé{allEmployeesForPoste.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Liste des employés en colonne */}
              <div className="flex-1 space-y-6">
                {allEmployeesForPoste.length === 0 ? (
                  <div className="text-gray-400 text-center py-8 text-xl italic">
                    Aucune assignation
                  </div>
                ) : (
                  allEmployeesForPoste.map((empCuisine, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center text-center"
                    >
                      {/* Photo sans rectangle */}
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-r from-blue-100 to-violet-100 flex items-center justify-center">
                        {empCuisine.photo_url ? (
                          <img 
                            src={empCuisine.photo_url} 
                            alt={empCuisine.prenom}
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-blue-600">
                            {empCuisine.prenom?.[0]}{empCuisine.prenom?.[1] || ''}
                          </span>
                        )}
                      </div>
                      
                      {/* Prénom */}
                      <div className="font-bold text-white text-xl mb-2">
                        {empCuisine.prenom}
                      </div>
                      
                      {/* Créneau */}
                      <div className="text-blue-200 text-base">
                        {empCuisine.creneau}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CuisinePlanningDisplay; 