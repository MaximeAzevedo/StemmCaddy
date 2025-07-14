import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  PlayIcon, 
  PauseIcon, 
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const CuisinePlanningDisplay = ({ tvMode = false }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentSession, setCurrentSession] = useState('matin');
  const [currentGroup, setCurrentGroup] = useState(1);
  const [autoMode, setAutoMode] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const [planning, setPlanning] = useState([]);
  const [postes, setPostes] = useState([]);
  const [employeesCuisine, setEmployeesCuisine] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Initialisation avec paramètres URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const syncDate = urlParams.get('date');
    const syncSession = urlParams.get('session');
    
    if (syncDate) {
      setSelectedDate(new Date(syncDate));
    }
    
    if (syncSession && (syncSession === 'matin' || syncSession === 'apres-midi')) {
      setCurrentSession(syncSession);
    }
  }, []);

  // Configuration des groupes de services
  const serviceGroups = {
    1: ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits'],
    2: ['Vaisselle', 'Légumerie', 'Self Midi', 'Equipe Pina et Saskia']
  };

  // Configuration premium des sessions avec thème bleu
  const sessionsConfig = {
    matin: {
      label: 'Service Matinal',
      gradient: 'from-blue-50 via-indigo-50 to-slate-50',
      accent: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-900',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600'
    },
    'apres-midi': {
      label: 'Service Vespéral', 
      gradient: 'from-indigo-50 via-blue-50 to-purple-50',
      accent: 'from-indigo-600 to-purple-700',
      textColor: 'text-indigo-900',
      borderColor: 'border-indigo-200',
      iconColor: 'text-indigo-600'
    }
  };

  // Logique des créneaux (optimisée pour éviter les logs constants)
  const getCreneauxForPoste = useCallback((posteName, sessionKey) => {
    if (sessionKey === 'matin') {
      if (posteName === 'Vaisselle') {
        return ['8h', '10h', 'midi'];
      } else if (posteName === 'Self Midi') {
        return ['11h-11h45', '11h45-12h45'];
      } else {
        return [];
      }
    } else {
      if (posteName === 'Vaisselle') {
        return ['8h', '10h', 'midi'];
      } else {
        return [];
      }
    }
  }, []);

  // Charger les données (stabilisé pour éviter les rafraîchissements intempestifs)
  const loadPlanningData = useCallback(async (dateToLoad) => {
    try {
      setLoading(true);
      const dateStr = format(dateToLoad || selectedDate, 'yyyy-MM-dd');
      
      const [postesResult, employeesResult, planningResult] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPlanningCuisine(dateStr)
      ]);

      if (postesResult.data) setPostes(postesResult.data);
      if (employeesResult.data) setEmployeesCuisine(employeesResult.data);
      if (planningResult.data) setPlanning(planningResult.data);
      
    } catch (error) {
      console.error('❌ TV - Erreur chargement planning:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Chargement initial et lors du changement de date
  useEffect(() => {
    loadPlanningData();
  }, [loadPlanningData]);

  // Rechargement automatique (séparé et stabilisé)
  useEffect(() => {
    const dataRefreshInterval = setInterval(() => {
      loadPlanningData();
    }, 30000);
    return () => clearInterval(dataRefreshInterval);
  }, [loadPlanningData]);

  // Timer automatique pour les groupes (stabilisé)
  useEffect(() => {
    if (!autoMode) return;
    
    // Reset timer when switching modes to avoid conflicts
    setTimeLeft(15);
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime < 0) {
          setCurrentGroup(current => current === 1 ? 2 : 1);
          return 15;
        }
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [autoMode]); // Seule dépendance nécessaire

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setAutoMode(prev => !prev);
      }
      if (event.key === 'ArrowLeft') setCurrentGroup(1);
      if (event.key === 'ArrowRight') setCurrentGroup(2);
      if (event.key === 'ArrowUp') setCurrentSession('matin');
      if (event.key === 'ArrowDown') setCurrentSession('apres-midi');
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Obtenir les employés pour un poste et un créneau (corrigé pour les postes sans créneaux)
  const getEmployeesForPosteCreneau = useCallback((posteName, creneau) => {
    const poste = postes.find(p => p.nom === posteName);
    if (!poste) return [];

    // Si pas de créneau spécifique, récupérer tous les employés du poste pour la session
    if (!creneau) {
      const filteredPlanning = planning.filter(p => p.poste_id === poste.id);
      return filteredPlanning.map(p => {
        const employeeCuisine = employeesCuisine.find(ec => ec.employee_id === p.employee_id);
        if (!employeeCuisine) return null;
        return {
          ...p,
          employee: employeeCuisine?.employee,
          photo_url: employeeCuisine?.photo_url
        };
      }).filter(Boolean);
    }

    // Logique normale pour les postes avec créneaux spécifiques
    const filteredPlanning = planning.filter(p => 
      p.poste_id === poste.id && p.creneau === creneau
    );

    return filteredPlanning.map(p => {
      const employeeCuisine = employeesCuisine.find(ec => ec.employee_id === p.employee_id);
      if (!employeeCuisine) return null;
      return {
        ...p,
        employee: employeeCuisine?.employee,
        photo_url: employeeCuisine?.photo_url
      };
    }).filter(Boolean);
  }, [postes, planning, employeesCuisine]);

  // Rendu premium d'un poste avec couleurs spécifiques
  const renderPoste = (posteName) => {
    const creneauxForPoste = getCreneauxForPoste(posteName, currentSession);
    const poste = postes.find(p => p.nom === posteName);
    if (!poste) return null;

    // Utiliser la couleur spécifique du poste
    const posteColor = poste.couleur || '#6B7280';
    const config = sessionsConfig[currentSession];

    return (
      <motion.div
        key={`${posteName}-${currentGroup}-${currentSession}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-blue-100/50 overflow-hidden hover:shadow-3xl transition-all duration-500"
      >
        {/* Header Premium du poste avec couleur spécifique */}
        <div className="relative overflow-hidden">
          <div 
            className="px-8 py-6 relative"
            style={{ backgroundColor: posteColor }}
          >
            <div className="flex items-center justify-center space-x-4 relative z-10">
              <div className="w-12 h-12 bg-white/25 rounded-2xl flex items-center justify-center backdrop-blur-sm ring-2 ring-white/20">
                <span className="text-2xl filter drop-shadow-lg">{poste.icone}</span>
              </div>
              <div className="text-center">
                <h3 className="text-white font-bold text-xl tracking-wide drop-shadow-lg">
                  {poste.nom}
                </h3>
                <div className="h-1 w-16 bg-white/40 rounded-full mx-auto mt-2 shadow-sm"></div>
              </div>
            </div>
            {/* Effet de brillance premium */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            {/* Effet de profondeur */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          </div>
        </div>

        {/* Créneaux Premium */}
        <div className="p-8 space-y-8">
          {creneauxForPoste.length > 0 ? (
            // Postes avec créneaux spécifiques (Vaisselle, Self Midi)
            creneauxForPoste.map(creneau => {
              const employees = getEmployeesForPosteCreneau(posteName, creneau);
              
              return (
                <div key={creneau} className="relative">
                  {/* Badge créneau premium avec couleur du poste */}
                  <div className="flex justify-center mb-6">
                    <div 
                      className="inline-flex items-center px-8 py-4 rounded-2xl text-white shadow-xl ring-4 ring-white/20 backdrop-blur-sm"
                      style={{ backgroundColor: posteColor }}
                    >
                      <ClockIcon className="w-6 h-6 mr-3 drop-shadow-sm" />
                      <span className="font-bold text-xl tracking-wide drop-shadow-sm">{creneau}</span>
                    </div>
                  </div>
                  
                  {/* Employés avec design premium */}
                  {employees.length > 0 ? (
                    <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      {employees.map((emp, index) => (
                        <motion.div
                          key={`${emp.employee?.id}-${index}`}
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: index * 0.2, duration: 0.6, ease: "easeOut" }}
                          className="group cursor-pointer"
                        >
                          <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-blue-100/30 hover:border-blue-200/50">
                            {/* Effet de brillance au hover */}
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/5 via-transparent to-indigo-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            {/* Photo premium avec frame élégant */}
                            <div className="flex flex-col items-center relative z-10">
                              <div className="relative">
                                <div className="w-24 h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-full overflow-hidden shadow-2xl ring-6 ring-white/60 group-hover:ring-white/80 transition-all duration-500 group-hover:scale-105">
                                  {emp.photo_url ? (
                                    <img 
                                      src={emp.photo_url} 
                                      alt="Employé"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                      <span className="text-gray-600 font-black text-2xl lg:text-3xl xl:text-4xl">
                                        {emp.employee?.nom?.[0]}{emp.employee?.nom?.[1] || ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {/* Indicateur de statut premium avec animation */}
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                </div>
                                {/* Halo lumineux */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                              </div>
                              
                              {/* Nom avec typographie premium */}
                              <div className="mt-6 text-center">
                                <h4 className={`font-bold text-xl xl:text-2xl ${config.textColor} tracking-wide group-hover:scale-105 transition-transform duration-300`}>
                                  {emp.employee?.nom}
                                </h4>
                                <div 
                                  className="h-1 w-16 rounded-full mx-auto mt-3 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                                  style={{ backgroundColor: posteColor }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    /* État vide premium */
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-16"
                    >
                      <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${config.accent} rounded-3xl flex items-center justify-center mb-6 shadow-xl ring-4 ring-blue-100/50`}>
                        <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      </div>
                      <p className={`${config.textColor} font-bold text-xl mb-2`}>Poste disponible</p>
                      <p className="text-gray-500 text-lg">En attente d'assignation</p>
                    </motion.div>
                  )}
                </div>
              );
            })
          ) : (
            // Postes sans créneaux spécifiques - afficher directement les employés
            (() => {
              const employees = getEmployeesForPosteCreneau(posteName, null);
              
              return employees.length > 0 ? (
                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {employees.map((emp, index) => (
                    <motion.div
                      key={`${emp.employee?.id}-${index}`}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.2, duration: 0.6, ease: "easeOut" }}
                      className="group cursor-pointer"
                    >
                      <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-blue-100/30 hover:border-blue-200/50">
                        {/* Effet de brillance au hover */}
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/5 via-transparent to-indigo-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        {/* Photo premium avec frame élégant */}
                        <div className="flex flex-col items-center relative z-10">
                          <div className="relative">
                            <div className="w-24 h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-full overflow-hidden shadow-2xl ring-6 ring-white/60 group-hover:ring-white/80 transition-all duration-500 group-hover:scale-105">
                              {emp.photo_url ? (
                                <img 
                                  src={emp.photo_url} 
                                  alt="Employé"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-600 font-black text-2xl lg:text-3xl xl:text-4xl">
                                    {emp.employee?.nom?.[0]}{emp.employee?.nom?.[1] || ''}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Indicateur de statut premium avec animation */}
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            </div>
                            {/* Halo lumineux */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                          </div>
                          
                          {/* Nom avec typographie premium */}
                          <div className="mt-6 text-center">
                            <h4 className={`font-bold text-xl xl:text-2xl ${config.textColor} tracking-wide group-hover:scale-105 transition-transform duration-300`}>
                              {emp.employee?.nom}
                            </h4>
                            <div 
                              className="h-1 w-16 rounded-full mx-auto mt-3 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                              style={{ backgroundColor: posteColor }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* État vide premium */
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${config.accent} rounded-3xl flex items-center justify-center mb-6 shadow-xl ring-4 ring-blue-100/50`}>
                    <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className={`${config.textColor} font-bold text-xl mb-2`}>Poste disponible</p>
                  <p className="text-gray-500 text-lg">En attente d'assignation</p>
                </motion.div>
              );
            })()
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    const config = sessionsConfig[currentSession];
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.gradient} flex items-center justify-center relative overflow-hidden`}>
        {/* Effets de fond animés */}
        <div className="absolute inset-0 opacity-20">
          <div className={`absolute top-0 left-0 w-96 h-96 bg-gradient-to-br ${config.accent} rounded-full -translate-x-48 -translate-y-48 blur-3xl animate-pulse`}></div>
          <div className={`absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br ${config.accent} rounded-full translate-x-48 translate-y-48 blur-3xl animate-pulse`} style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-blue-200 rounded-full animate-spin mx-auto"></div>
            <div className={`absolute inset-0 w-24 h-24 border-4 border-transparent border-t-blue-600 rounded-full animate-spin mx-auto`}></div>
          </div>
          <h3 className={`text-3xl font-bold ${config.textColor} mb-4`}>
            Chargement du planning
          </h3>
          <p className="text-blue-600 text-xl">Synchronisation en cours...</p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-blue-700 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const config = sessionsConfig[currentSession];
  const currentServices = serviceGroups[currentGroup];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} relative overflow-hidden`}>
      {/* Effets de fond premium avec animation */}
      <div className="absolute inset-0 opacity-40">
        <div className={`absolute top-0 left-0 w-96 h-96 bg-gradient-to-br ${config.accent} rounded-full -translate-x-48 -translate-y-48 blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br ${config.accent} rounded-full translate-x-48 translate-y-48 blur-3xl animate-pulse`} style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-white/5"></div>
      </div>
      
      {/* Header Premium Fixe */}
      <div className="relative z-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-2xl border-b border-blue-300/20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Section titre premium */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 px-6 py-3 rounded-xl bg-white/15 text-white shadow-xl ring-2 ring-white/20 backdrop-blur-sm">
                <div className="w-8 h-8 bg-white/25 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <CalendarIcon className="w-5 h-5 drop-shadow-sm" />
                </div>
                <div>
                  <h1 className="font-bold text-lg tracking-wide drop-shadow-sm">{config.label}</h1>
                  <p className="text-white/90 text-xs font-medium">Groupe {currentGroup}</p>
                </div>
              </div>
              
              {/* Sélecteur de date premium compact */}
              <div className="flex items-center space-x-2">
                <div className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-white/20">
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="bg-transparent border-none outline-none text-white font-semibold text-sm placeholder-white/70"
                  />
                </div>
              </div>
            </div>

            {/* Contrôles premium compacts */}
            <div className="flex items-center space-x-3">
              
              {/* Timer élégant compact */}
              {autoMode && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-lg shadow-lg border border-white/20">
                  <ClockIcon className="w-4 h-4 text-white/90" />
                  <span className="font-mono font-bold text-sm text-white">
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                    {String(timeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Bouton Play/Pause premium neutre */}
              <button
                onClick={() => setAutoMode(!autoMode)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                  autoMode 
                    ? 'bg-slate-500 hover:bg-slate-600 text-white border border-slate-400/30' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400/30'
                }`}
              >
                {autoMode ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                <span className="text-sm">{autoMode ? 'Pause' : 'Play'}</span>
              </button>

              {/* Contrôles de navigation premium compacts */}
              <div className="flex items-center space-x-1 bg-white/15 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-white/20">
                <button
                  onClick={() => setCurrentGroup(1)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm ${
                    currentGroup === 1
                      ? 'bg-white/25 text-white shadow-md ring-2 ring-white/30'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  G1
                </button>
                <button
                  onClick={() => setCurrentGroup(2)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm ${
                    currentGroup === 2
                      ? 'bg-white/25 text-white shadow-md ring-2 ring-white/30'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  G2
                </button>
              </div>

              {/* Sélecteur de session premium compact */}
              <div className="flex items-center space-x-1 bg-white/15 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-white/20">
                <button
                  onClick={() => setCurrentSession('matin')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm ${
                    currentSession === 'matin'
                      ? 'bg-white/25 text-white shadow-md ring-2 ring-white/30'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  Matin
                </button>
                <button
                  onClick={() => setCurrentSession('apres-midi')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm ${
                    currentSession === 'apres-midi'
                      ? 'bg-white/25 text-white shadow-md ring-2 ring-white/30'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  Soir
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Effet de brillance premium */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50"></div>
      </div>

      {/* Grille de planning premium */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentGroup}-${currentSession}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="grid gap-8 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4"
          >
            {currentServices.map(posteName => renderPoste(posteName))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CuisinePlanningDisplay; 