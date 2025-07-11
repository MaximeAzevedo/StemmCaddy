import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  PlayIcon, 
  PauseIcon, 
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { supabaseCuisine, getCreneauxForPoste, mapOldCreneauToNew, isCreneauValidForPoste } from '../lib/supabase-cuisine';

const CuisinePlanningDisplay = ({ tvMode = false }) => {
  // eslint-disable-next-line no-unused-vars
  const [selectedDate, setSelectedDate] = useState(new Date()); // Toujours aujourd'hui par défaut
  const [currentSession, setCurrentSession] = useState('matin');
  const [currentGroup, setCurrentGroup] = useState(1); // Nouveau: groupe 1 ou 2
  const [autoMode, setAutoMode] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const [planning, setPlanning] = useState([]);
  const [postes, setPostes] = useState([]);
  const [employeesCuisine, setEmployeesCuisine] = useState([]);
  const [absences, setAbsences] = useState([]); // AJOUT: Gestion des absences
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Initialisation avec paramètres URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const syncDate = urlParams.get('date');
    const syncSession = urlParams.get('session');
    
    if (syncDate) {
      console.log('📺 TV - Initialisation avec date URL:', syncDate);
      setSelectedDate(new Date(syncDate));
    }
    
    if (syncSession && (syncSession === 'matin' || syncSession === 'apres-midi')) {
      console.log('📺 TV - Initialisation avec session URL:', syncSession);
      setCurrentSession(syncSession);
    }
  }, []);

  // Configuration des groupes de services (4 par groupe)
  const serviceGroups = {
    1: ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits'],
    2: ['Vaisselle', 'Légumerie', 'Self Midi', 'Equipe Pina et Saskia']
  };

  // Configuration des sessions pour les données
  const sessionsConfig = {
    matin: {
      label: 'Planning Matin',
      color: 'from-yellow-400 to-orange-500',
      postesActifs: ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits', 'Vaisselle', 'Légumerie', 'Self Midi', 'Equipe Pina et Saskia']
    },
    'apres-midi': {
      label: 'Planning Après-midi', 
      color: 'from-blue-400 to-indigo-600',
      postesActifs: ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits', 'Vaisselle', 'Légumerie', 'Equipe Pina et Saskia']
    }
  };

  // Charger les données - DÉPLACÉ AVANT forceCleanReload
  const loadPlanningData = useCallback(async (isAutoRefresh = false) => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const loadType = isAutoRefresh ? 'RECHARGEMENT AUTO' : 'CHARGEMENT INITIAL';
      console.log(`📺 TV - ${loadType} pour la date: ${dateStr}`);
      console.log(`📺 TV - Session courante: ${currentSession}`);
      
      // VÉRIFICATION DIRECTE DE LA BASE DE DONNÉES
      console.log(`🔍 TV - ${loadType} - Vérification directe de la base de données...`);
      
      // Vérifier les données brutes de planning_cuisine pour cette date
      const { data: rawPlanning, error: rawError } = await supabaseCuisine.supabase
        .from('planning_cuisine')
        .select('*')
        .eq('date', dateStr);
      
      console.log(`📊 TV - ${loadType} - Données BRUTES planning_cuisine:`, {
        date: dateStr,
        count: rawPlanning?.length || 0,
        data: rawPlanning,
        timestamp: new Date().toLocaleTimeString()
      });
      
      if (rawError) {
        console.error(`❌ TV - ${loadType} - Erreur requête brute:`, rawError);
      }
      
      // AJOUT: Charger aussi les absences comme le planning principal
      const [postesResult, employeesResult, planningResult, absencesResult] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPlanningCuisine(dateStr),
        supabaseCuisine.getAbsencesCuisine(dateStr, dateStr) // AJOUT
      ]);

      console.log(`📺 TV - ${loadType} - Postes chargés:`, postesResult.data?.length || 0);
      console.log(`📺 TV - ${loadType} - Employés chargés:`, employeesResult.data?.length || 0);
      console.log(`📺 TV - ${loadType} - Planning chargé (avec jointures):`, planningResult.data?.length || 0, 'entrées');
      console.log(`📺 TV - ${loadType} - Absences chargées:`, absencesResult.data?.length || 0, 'entrées'); // AJOUT
      console.log(`📺 TV - ${loadType} - Détail planning pour`, dateStr, ':', planningResult.data);
      
      // Comparer les données brutes vs avec jointures
      if (rawPlanning?.length !== planningResult.data?.length) {
        console.warn(`⚠️ TV - ${loadType} - DIFFÉRENCE entre données brutes et jointures!`, {
          brutes: rawPlanning?.length || 0,
          jointures: planningResult.data?.length || 0
        });
        
        // Analyser les différences
        if (rawPlanning && planningResult.data) {
          const bruteIds = rawPlanning.map(p => p.id);
          const jointureIds = planningResult.data.map(p => p.id);
          const missing = bruteIds.filter(id => !jointureIds.includes(id));
          if (missing.length > 0) {
            console.warn(`⚠️ TV - ${loadType} - IDs manquants dans les jointures:`, missing);
          }
        }
      } else {
        console.log(`✅ TV - ${loadType} - Cohérence entre données brutes et jointures`);
      }

      if (postesResult.data) setPostes(postesResult.data);
      if (employeesResult.data) setEmployeesCuisine(employeesResult.data);
      if (absencesResult.data) setAbsences(absencesResult.data); // AJOUT
      if (planningResult.data) {
        setPlanning(planningResult.data);
        console.log(`📺 TV - ${loadType} - Planning setState terminé avec`, planningResult.data.length, 'entrées');
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error(`❌ TV - Erreur ${isAutoRefresh ? 'rechargement' : 'chargement'}:`, error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, currentSession]);

  // RAJOUT: useEffect pour charger les données au démarrage et lors des changements
  useEffect(() => {
    loadPlanningData();
  }, [loadPlanningData]);

  // Rechargement automatique des données toutes les 30 secondes pour le mode TV
  useEffect(() => {
    const dataRefreshInterval = setInterval(() => {
      console.log('🔄 Rechargement automatique des données TV...');
      loadPlanningData(true); // true = rechargement automatique
    }, 30000); // 30 secondes

    return () => clearInterval(dataRefreshInterval);
  }, [loadPlanningData]);

  // Timer automatique pour alterner entre les groupes de services
  useEffect(() => {
    if (!autoMode) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Basculer entre groupe 1 et groupe 2
          setCurrentGroup(current => current === 1 ? 2 : 1);
          return 15; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoMode]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setAutoMode(prev => !prev);
      }
      if (event.key === 'ArrowLeft') {
        setCurrentGroup(1);
      }
      if (event.key === 'ArrowRight') {
        setCurrentGroup(2);
      }
      if (event.key === 'ArrowUp') {
        setCurrentSession('matin');
      }
      if (event.key === 'ArrowDown') {
        setCurrentSession('apres-midi');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Obtenir les employés pour un poste et un créneau spécifique - MODIFIÉ avec gestion des absences
  const getEmployeesForPosteCreneau = (posteName, creneau) => {
    console.log(`📺 TV - Recherche employés pour ${posteName} - ${creneau}`);
    console.log(`📺 TV - Date sélectionnée: ${format(selectedDate, 'yyyy-MM-dd')}`);
    console.log(`📺 TV - Session courante: ${currentSession}`);
    console.log(`📺 TV - Postes disponibles:`, postes.map(p => `${p.nom} (ID: ${p.id})`));
    console.log(`📺 TV - Planning total:`, planning.length, 'entrées');
    console.log(`📺 TV - Absences total:`, absences.length, 'entrées'); // AJOUT
    
    // Tous les postes existent maintenant en base de données
    const poste = postes.find(p => p.nom === posteName);
    
    if (!poste) {
      console.log(`❌ TV - Poste "${posteName}" non trouvé dans:`, postes.map(p => p.nom));
      return [];
    }

    console.log(`✅ TV - Poste trouvé: ${poste.nom} (ID: ${poste.id})`);
    
    // AJOUT: Filtrer les employés absents comme dans le planning principal
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const absentEmployeeIds = absences
      .filter(abs => abs.statut === 'Confirmée' && dateStr >= abs.date_debut && dateStr <= abs.date_fin)
      .map(abs => abs.employee_id);
    
    console.log(`📺 TV - Employés absents pour ${dateStr}:`, absentEmployeeIds);
    
    // NOUVELLE LOGIQUE SYNCHRONISÉE : Filtrer avec mapping automatique
    const filteredPlanning = planning.filter(p => {
      // Vérifier que c'est le bon poste
      if (p.poste_id !== poste.id) return false;
      
      // AJOUT: Vérifier que l'employé n'est pas absent
      if (absentEmployeeIds.includes(p.employee_id)) {
        console.log(`⚠️ TV - Employé ${p.employee_id} est absent, filtré`);
        return false;
      }
      
      // Vérifier que le créneau est valide avec mapping
      if (!isCreneauValidForPoste(p.creneau, poste.nom, currentSession)) {
        console.log(`⚠️ TV - Créneau "${p.creneau}" invalide pour poste "${poste.nom}"`);
        return false;
      }
      
      // Mapper le créneau et vérifier s'il correspond
      const mappedCreneau = mapOldCreneauToNew(p.creneau, poste.nom);
      const matches = mappedCreneau === creneau;
      
      console.log(`📋 TV - Planning ID ${p.id}: poste_id=${p.poste_id}, creneau="${p.creneau}" → mappé:"${mappedCreneau}", cherché:"${creneau}", match=${matches}`);
      
      return matches;
    });
    
    console.log(`📋 TV - Planning filtré pour ${posteName}-${creneau}:`, filteredPlanning);

    const result = filteredPlanning.map(p => {
      const employeeCuisine = employeesCuisine.find(ec => ec.employee_id === p.employee_id);
      if (!employeeCuisine) {
        console.log(`⚠️ TV - Employee cuisine non trouvé pour employee_id: ${p.employee_id}`);
        console.log(`⚠️ TV - Employés cuisine disponibles:`, employeesCuisine.map(ec => `ID:${ec.employee_id} - ${ec.employee?.nom}`));
        return null;
      }
      console.log(`✅ TV - Employé trouvé: ${employeeCuisine.employee?.nom} (ID: ${employeeCuisine.employee_id})`);
      return {
        ...p,
        employee: employeeCuisine?.employee,
        photo_url: employeeCuisine?.photo_url
      };
    }).filter(Boolean); // Enlever les null
    
    console.log(`🎯 TV - Résultat final pour ${posteName}-${creneau}:`, result.length, 'employé(s)', result.map(r => r.employee?.nom));
    return result;
  };

  // Rendu d'un poste avec affichage vertical des créneaux
  const renderPoste = (posteName) => {
    const creneauxForPoste = getCreneauxForPoste(posteName, currentSession);
    
    // Tous les postes existent maintenant en base de données
    const poste = postes.find(p => p.nom === posteName);
    if (!poste) return null;

    return (
      <motion.div
        key={`${posteName}-${currentGroup}-${currentSession}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-xl shadow-xl border-4 hover:shadow-2xl transition-shadow w-full"
        style={{ borderColor: poste.couleur }}
      >
        {/* Header du poste - Plus compact */}
        <div className="flex items-center justify-center mb-4 p-3">
          <div 
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white font-bold shadow-lg"
            style={{ backgroundColor: poste.couleur }}
          >
            <span className="text-xl">{poste.icone}</span>
            <span className="text-lg font-black">{poste.nom}</span>
          </div>
        </div>

        {/* Affichage vertical des créneaux avec photos GÉANTES */}
        <div className="space-y-4 px-2 pb-4">
          {creneauxForPoste.map(creneau => {
            const employees = getEmployeesForPosteCreneau(posteName, creneau);
            
            return (
              <div key={creneau} className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50">
                {/* Nom du créneau - Plus compact */}
                <div className="text-center mb-3">
                  <span className="px-4 py-2 bg-gray-200 rounded-xl text-base sm:text-lg font-bold text-gray-700 border border-gray-300 shadow-sm">
                    {creneau}
                  </span>
                </div>
                
                {/* Employés pour ce créneau - PHOTOS GÉANTES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {employees.map((emp, index) => (
                    <motion.div
                      key={`${emp.employee?.id}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center"
                    >
                      {/* Photo GÉANTE pour TV - Taille réduite de 20% */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 2xl:w-40 2xl:h-40 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-2xl">
                        {emp.photo_url ? (
                          <img 
                            src={emp.photo_url} 
                            alt="Employé"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                            <span className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl xl:text-5xl">
                              {emp.employee?.nom?.[0]}{emp.employee?.nom?.[1] || ''}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Nom VISIBLE pour TV - Taille réduite de 20% */}
                      <span className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-900 text-center leading-tight font-black mt-2 px-2 py-1 bg-white rounded-lg shadow-lg border-2 border-gray-200">
                        {emp.employee?.nom}
                      </span>
                    </motion.div>
                  ))}
                </div>
                
                {/* Message si aucun employé - VISIBLE pour TV */}
                {employees.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    <div className="text-center">
                      <div className="text-6xl mb-2">👤</div>
                      <span className="text-xl sm:text-2xl lg:text-3xl italic font-bold bg-gray-100 px-4 py-2 rounded-xl">
                        Personne assigné
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-orange-600 mx-auto"></div>
          <p className="mt-6 text-2xl text-gray-600 font-medium">Chargement du planning cuisine...</p>
        </div>
      </div>
    );
  }

  const config = sessionsConfig[currentSession];
  const currentServices = serviceGroups[currentGroup];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 w-full">
      {/* Header COMPACT pour TV */}
      <div className="bg-white/90 backdrop-blur shadow-lg border-b border-gray-200 w-full">
        <div className="w-full px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Titre et date - Compact */}
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r ${config.color} text-white shadow-md`}>
                <span className="font-bold text-sm">{config.label} - Groupe {currentGroup}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700">
                <CalendarIcon className="w-4 h-4" />
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Contrôles TV - Compacts */}
            <div className="flex items-center space-x-3">
              {/* Timer compact */}
              {autoMode && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                  <ClockIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600 font-mono font-bold text-sm">
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                    {String(timeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Bouton Pause compact */}
              <button
                onClick={() => setAutoMode(!autoMode)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg font-medium text-sm transition-colors ${
                  autoMode 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                }`}
              >
                {autoMode ? (
                  <><PauseIcon className="w-4 h-4" /><span className="hidden sm:inline">PAUSE</span></>
                ) : (
                  <><PlayIcon className="w-4 h-4" /><span className="hidden sm:inline">PLAY</span></>
                )}
              </button>

              {/* Indicateur dernière actualisation */}
              {lastRefresh && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-lg border border-green-200 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium hidden sm:inline">
                    Actualisé à {format(lastRefresh, 'HH:mm:ss')}
                  </span>
                </div>
              )}

              {/* Navigation groupes - Compacte */}
              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentGroup(1)}
                  className={`px-2 py-1 rounded-lg font-medium text-xs transition-colors ${
                    currentGroup === 1
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  G1
                </button>
                <button
                  onClick={() => setCurrentGroup(2)}
                  className={`px-2 py-1 rounded-lg font-medium text-xs transition-colors ${
                    currentGroup === 2
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  G2
                </button>
              </div>

              {/* Navigation session - Compacte */}
              <div className="flex space-x-1">
                <button
                  onClick={() => setCurrentSession('matin')}
                  className={`px-2 py-1 rounded-lg font-medium text-xs transition-colors ${
                    currentSession === 'matin'
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Matin
                </button>
                <button
                  onClick={() => setCurrentSession('apres-midi')}
                  className={`px-2 py-1 rounded-lg font-medium text-xs transition-colors ${
                    currentSession === 'apres-midi'
                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Après-midi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Planning Grid - PLEIN ÉCRAN avec photos GÉANTES */}
      <div className="w-full px-1 py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentGroup}-${currentSession}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5 }}
            className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 w-full"
          >
            {currentServices.map(posteName => renderPoste(posteName))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CuisinePlanningDisplay; 