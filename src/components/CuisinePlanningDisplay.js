import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  PlayIcon, 
  PauseIcon, 
  CalendarIcon,
  ClockIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const CuisinePlanningDisplay = ({ tvMode = false }) => {
  // eslint-disable-next-line no-unused-vars
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentSession, setCurrentSession] = useState('matin'); // 'matin' ou 'apres-midi'
  const [autoMode, setAutoMode] = useState(tvMode ? true : true);
  const [timeLeft, setTimeLeft] = useState(15); // Timer en secondes
  const [planning, setPlanning] = useState([]);
  const [postes, setPostes] = useState([]);
  const [employeesCuisine, setEmployeesCuisine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [superTvMode, setSuperTvMode] = useState(tvMode ? true : false); // Force super mode pour TV

  // Configuration des postes par session
  const postesMatin = ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits', 'Vaisselle', 'Légumerie'];
  const postesApresMidi = ['Cuisine chaude', 'Sandwichs', 'Vaisselle', 'Légumerie'];

  // Configuration des sessions horaires
  const sessionsConfig = {
    matin: {
      label: 'Planning Matin',
      icon: SunIcon,
      color: 'from-yellow-400 to-orange-500',
      sessions: ['8h', '10h'],
      postes: postesMatin
    },
    'apres-midi': {
      label: 'Planning Après-midi', 
      icon: MoonIcon,
      color: 'from-blue-400 to-indigo-600',
      sessions: ['12h'],
      postes: postesApresMidi
    }
  };

  // Charger les données
  const loadPlanningData = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const [postesResult, employeesResult, planningResult] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPlanningCuisine(dateStr)
      ]);

      if (postesResult.data) setPostes(postesResult.data);
      if (employeesResult.data) setEmployeesCuisine(employeesResult.data);
      if (planningResult.data) setPlanning(planningResult.data);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadPlanningData();
  }, [loadPlanningData]);

  // Timer automatique
  useEffect(() => {
    if (!autoMode) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Basculer entre matin et après-midi
          setCurrentSession(current => current === 'matin' ? 'apres-midi' : 'matin');
          return 15; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoMode]);

  // NOUVEAU: Raccourcis clavier étendus
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Toggle Super TV Mode (seulement en mode normal)
      if (event.key.toLowerCase() === 't' && !tvMode) {
        setSuperTvMode(prev => !prev);
      }
      
      // Pause/Play avec barre d'espace
      if (event.code === 'Space') {
        event.preventDefault();
        setAutoMode(prev => !prev);
      }
      
      // Navigation avec flèches
      if (event.key === 'ArrowLeft') {
        setCurrentSession('matin');
      }
      if (event.key === 'ArrowRight') {
        setCurrentSession('apres-midi');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [tvMode]);

  // Obtenir les employés affectés pour un poste et une session
  const getEmployeesForPosteAndSession = (posteName, sessions) => {
    const poste = postes.find(p => p.nom === posteName);
    if (!poste) return [];

    return planning
      .filter(p => p.poste_id === poste.id && sessions.includes(p.creneau))
      .map(p => {
        const employeeCuisine = employeesCuisine.find(ec => ec.employee_id === p.employee_id);
        return {
          ...p,
          employee: employeeCuisine?.employee,
          photo_url: employeeCuisine?.photo_url
        };
      });
  };

  // Rendu d'un poste avec ses employés
  const renderPoste = (posteName) => {
    const poste = postes.find(p => p.nom === posteName);
    if (!poste) return null;

    const config = sessionsConfig[currentSession];
    const employees = getEmployeesForPosteAndSession(posteName, config.sessions);

    // Tailles beaucoup plus grandes
    const photoSize = superTvMode ? 'w-40 h-40' : 'w-32 h-32'; // 160px en super, 128px normal
    const minHeight = superTvMode ? 'min-h-[220px]' : 'min-h-[180px]';
    const textSize = superTvMode ? 'text-lg' : 'text-base';
    const nameSize = superTvMode ? 'text-base' : 'text-sm';
    const initialSize = superTvMode ? 'text-4xl' : 'text-2xl';
    const headerSize = superTvMode ? 'text-xl' : 'text-lg';
    const badgeSize = superTvMode ? 'text-base' : 'text-sm';

    return (
      <motion.div
        key={`${posteName}-${currentSession}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white rounded-xl shadow-lg p-6 border-2"
        style={{ borderColor: poste.couleur }}
      >
        {/* Header du poste - AGRANDI */}
        <div className="flex items-center justify-center mb-4">
          <div 
            className="flex items-center space-x-3 px-4 py-2 rounded-full text-white font-bold"
            style={{ backgroundColor: poste.couleur }}
          >
            <span className={headerSize}>{poste.icone}</span>
            <span className={badgeSize}>{poste.nom}</span>
          </div>
        </div>

        {/* Sessions actives - AGRANDI */}
        <div className="flex justify-center space-x-2 mb-4">
          {config.sessions.map(session => (
            <span 
              key={session}
              className={`px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700 ${superTvMode ? 'text-base px-4 py-2' : ''}`}
            >
              {session}
            </span>
          ))}
        </div>

        {/* Employés affectés - PHOTOS GÉANTES */}
        <div className={`grid grid-cols-2 gap-4 ${minHeight}`}>
          {employees.map((emp, index) => (
            <motion.div
              key={`${emp.employee?.id}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className={`${photoSize} rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg`}>
                {emp.photo_url ? (
                  <img 
                    src={emp.photo_url} 
                    alt="Employé"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                    <span className={`text-white font-bold ${initialSize}`}>
                      {emp.employee?.prenom?.[0]}{emp.employee?.nom?.[0]}
                    </span>
                  </div>
                )}
              </div>
              <span className={`${textSize} text-gray-700 mt-3 font-bold`}>
                {emp.creneau}
              </span>
              <span className={`${nameSize} text-gray-600 text-center leading-tight font-medium`}>
                {emp.employee?.prenom} {emp.employee?.nom}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Indicator si aucun employé */}
        {employees.length === 0 && (
          <div className={`flex items-center justify-center ${minHeight.replace('min-h-', 'h-')} text-gray-400`}>
            <span className={superTvMode ? 'text-lg italic' : 'text-sm italic'}>Aucun employé assigné</span>
          </div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du planning cuisine...</p>
        </div>
      </div>
    );
  }

  const config = sessionsConfig[currentSession];
  const SessionIcon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Titre et date */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r ${config.color} text-white`}>
                <SessionIcon className="w-6 h-6" />
                <span className="font-bold text-lg">{config.label}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <CalendarIcon className="w-5 h-5" />
                <span className="font-medium">
                  {format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>

            {/* Contrôles */}
            <div className="flex items-center space-x-4">
              {/* Timer */}
              {autoMode && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <ClockIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600 font-mono font-bold">
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                    {String(timeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Contrôles Mode TV */}
              {tvMode ? (
                <div className="flex items-center space-x-3">
                  {/* Pause/Play */}
                  <button
                    onClick={() => setAutoMode(!autoMode)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-lg transition-colors ${
                      autoMode 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {autoMode ? (
                      <><PauseIcon className="w-6 h-6" /><span>PAUSE</span></>
                    ) : (
                      <><PlayIcon className="w-6 h-6" /><span>PLAY</span></>
                    )}
                  </button>

                  {/* Navigation sessions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentSession('matin')}
                      className={`px-4 py-2 rounded-lg font-bold text-lg transition-colors ${
                        currentSession === 'matin'
                          ? 'bg-yellow-200 text-yellow-800 shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <SunIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setCurrentSession('apres-midi')}
                      className={`px-4 py-2 rounded-lg font-bold text-lg transition-colors ${
                        currentSession === 'apres-midi'
                          ? 'bg-blue-200 text-blue-800 shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <MoonIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Contrôles Mode Normal */
                <>
                  {/* Toggle Super TV Mode - seulement en mode normal */}
                  <button
                    onClick={() => setSuperTvMode(!superTvMode)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                      superTvMode 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={superTvMode ? 'Mode normal' : 'Mode Super TV (photos géantes)'}
                  >
                    <span className="text-lg">📺</span>
                    <span className="text-sm">{superTvMode ? 'Grande' : 'Normale'}</span>
                  </button>

                  <button
                    onClick={() => setAutoMode(!autoMode)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      autoMode 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {autoMode ? (
                      <><PauseIcon className="w-4 h-4" /><span>Mode Auto</span></>
                    ) : (
                      <><PlayIcon className="w-4 h-4" /><span>Mode Manuel</span></>
                    )}
                  </button>

                  {/* Navigation manuelle */}
                  {!autoMode && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentSession('matin')}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                          currentSession === 'matin'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <SunIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentSession('apres-midi')}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                          currentSession === 'apres-midi'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <MoonIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Planning Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSession}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className={`grid gap-6 ${
              tvMode || superTvMode 
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {config.postes.map(posteName => renderPoste(posteName))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer info */}
      <div className="fixed bottom-4 left-4 right-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Sessions {currentSession === 'matin' ? 'Matin' : 'Après-midi'}: {config.sessions.join(', ')}
              </span>
              <div className="flex items-center space-x-4">
                <span>
                  {employeesCuisine.length} employés • {config.postes.length} postes actifs
                </span>
                {tvMode ? (
                  <div className="flex items-center space-x-4 text-xs bg-gray-100 px-3 py-1 rounded">
                    <span>
                      <kbd className="font-mono font-bold">ESPACE</kbd> pause
                    </span>
                    <span>
                      <kbd className="font-mono font-bold">←→</kbd> sessions
                    </span>
                  </div>
                ) : (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    <kbd className="font-mono font-bold">T</kbd> pour {superTvMode ? 'réduire' : 'agrandir'} • 
                    <kbd className="font-mono font-bold">ESPACE</kbd> pause
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CuisinePlanningDisplay; 