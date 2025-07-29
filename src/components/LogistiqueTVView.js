import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Monitor, ArrowLeft, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Calendar, Maximize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabaseLogistique } from '../lib/supabase-logistique';

const LogistiqueTVView = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('vehicles-slide1'); // 'vehicles-slide1', 'vehicles-slide2', 'employees'
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [fullscreenFailed, setFullscreenFailed] = useState(false);
  
  // Données
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [planning, setPlanning] = useState({});
  const [absences, setAbsences] = useState([]);

  // Définition des groupes de véhicules pour les slides
  const vehicleSlides = {
    slide1: ['Caddy', 'Crafter 21', 'Crafter 23'],
    slide2: ['Ducato', 'Jumper', 'Transit']
  };

  // Filtrer les véhicules selon la slide courante
  const getVehiclesForCurrentSlide = () => {
    if (currentView === 'vehicles-slide1') {
      const filtered = vehicles.filter(v => vehicleSlides.slide1.includes(v.nom));
      console.log('🚐 SLIDE 1 - Véhicules disponibles:', vehicles.map(v => v.nom));
      console.log('🚐 SLIDE 1 - Véhicules filtrés:', filtered.map(v => v.nom));
      return filtered;
    } else if (currentView === 'vehicles-slide2') {
      return vehicles.filter(v => vehicleSlides.slide2.includes(v.nom));
    }
    return vehicles; // Pour la vue employés, on pourrait vouloir tous les véhicules
  };

  /**
   * Chargement des données complètes
   */
  const loadAllData = async () => {
    try {
      setLoading(true);

      // Calculer les dates de la semaine
      const weekDates = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(currentWeek);
        date.setDate(date.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }

      const [employeesResult, vehiculesResult, planningResult, absencesResult] = await Promise.all([
        supabaseLogistique.getEmployeesLogistique(),
        supabaseLogistique.getVehicules(),
        supabaseLogistique.loadPlanningHebdomadaire(format(currentWeek, 'yyyy-MM-dd')),
        supabaseLogistique.getAbsencesLogistique(weekDates[0], weekDates[4])
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (vehiculesResult.error) throw vehiculesResult.error;
      if (planningResult.error) throw planningResult.error;
      if (absencesResult.error) throw absencesResult.error;

      setEmployees(employeesResult.data || []);
      setVehicles(vehiculesResult.data || []);
      setPlanning(planningResult.data || {});
      setAbsences(absencesResult.data || []);

    } catch (error) {
      console.error('❌ Erreur chargement données TV:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Alternance automatique des vues avec timer (3 vues maintenant)
   */
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Cycle entre les 3 vues : vehicles-slide1 -> vehicles-slide2 -> employees -> vehicles-slide1
          setCurrentView(prevView => {
            if (prevView === 'vehicles-slide1') return 'vehicles-slide2';
            if (prevView === 'vehicles-slide2') return 'employees';
            return 'vehicles-slide1';
          });
          return 15;
        }
        return prev - 1;
      });
    }, 1000); // 1 seconde

    return () => clearInterval(interval);
  }, [isPaused]);

  /**
   * Contrôles manuels
   */
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const switchView = () => {
    setCurrentView(prev => {
      if (prev === 'vehicles-slide1') return 'vehicles-slide2';
      if (prev === 'vehicles-slide2') return 'employees';
      return 'vehicles-slide1';
    });
    setTimeLeft(15); // Reset timer
  };

  const resetTimer = () => {
    setTimeLeft(15);
  };

  /**
   * Navigation entre les semaines
   */
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => {
      const newWeek = new Date(prev);
      newWeek.setDate(newWeek.getDate() - 7);
      return newWeek;
    });
    setTimeLeft(15); // Reset timer lors du changement
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => {
      const newWeek = new Date(prev);
      newWeek.setDate(newWeek.getDate() + 7);
      return newWeek;
    });
    setTimeLeft(15); // Reset timer lors du changement
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setTimeLeft(15);
  };

  /**
   * Activer manuellement le plein écran
   */
  const enterFullscreenManually = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setFullscreenFailed(false);
      }
    } catch (error) {
      // Ignore silencieusement les erreurs
    }
  };

  /**
   * Chargement initial et au changement de semaine
   */
  useEffect(() => {
    console.log('🔄 === TV VIEW useEffect TRIGGER ===');
    console.log('📅 TV Semaine courante:', format(currentWeek, 'yyyy-MM-dd'));
    loadAllData();
  }, [currentWeek]); // 🔧 CORRECTION: Dépendance sur currentWeek au lieu de loadAllData

  /**
   * Plein écran au montage
   */
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setFullscreenFailed(false);
        }
      } catch (error) {
        // Ignorer silencieusement les erreurs de permissions plein écran
        setFullscreenFailed(true);
      }
    };

    // Délai pour éviter les erreurs de permissions (doit être après interaction utilisateur)
    setTimeout(enterFullscreen, 100);

    // Gestion de la touche Escape pour revenir au planning
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        navigate('/logistique/planning');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  /**
   * Vérifier si le service est fermé un jour donné
   */
  const isServiceFerme = (date) => {
    return absences.some(absence => 
      absence.type_absence === 'Fermeture' &&
      date >= absence.date_debut && 
      date <= absence.date_fin
    );
  };

  /**
   * Obtenir les informations de fermeture pour un jour donné
   */
  const getFermetureInfo = (date) => {
    const fermeture = absences.find(absence => 
      absence.type_absence === 'Fermeture' &&
      date >= absence.date_debut && 
      date <= absence.date_fin
    );
    return fermeture;
  };

  /**
   * Obtenir le statut d'un employé pour une date
   */
  const getEmployeeStatus = (employeeId, date) => {
    // DEBUG logs supprimés - fonction corrigée
    
    // Vérifier les vraies absences (pas les rendez-vous)
    const isAbsent = absences.some(absence => 
      absence.employee_id === employeeId &&
      absence.date_debut <= date &&
      absence.date_fin >= date &&
      absence.type_absence !== 'Rendez-vous' // ⚠️ Exclure les rendez-vous
    );

    if (isAbsent) {
      return { type: 'absent', display: 'Absent', color: 'bg-red-500' };
    }

    // Vérifier les assignations de véhicules (les rendez-vous peuvent être assignés)
    const dateKey = date;
    if (planning[dateKey]) {
      for (const [vehicleId, assignedEmployees] of Object.entries(planning[dateKey])) {
        
        const assignedEmployee = assignedEmployees.find(emp => emp.employee_id === employeeId);
        
        if (assignedEmployee) {
          const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
          if (vehicle) {
            // Vérifier si cet employé a un rendez-vous ce jour-là
            const rendezVous = absences.find(absence => 
              absence.employee_id === employeeId &&
              absence.date_debut <= date &&
              absence.date_fin >= date &&
              absence.type_absence === 'Rendez-vous'
            );
            
            let displayText = vehicle.nom;
            if (rendezVous && rendezVous.heure_debut) {
              const heure = rendezVous.heure_debut.split(':')[0];
              displayText = `${vehicle.nom} (RDV ${heure}h)`;
            }
            
            if (vehicle.nom === 'Caddy') {
              return { type: 'caddy', display: displayText, color: 'bg-gray-500' };
            } else {
              return { type: 'vehicle', display: displayText, color: vehicle.couleur || '#6b7280' };
            }
          }
        }
      }
    }

    // Non assigné
    return { type: 'unassigned', display: '—', color: 'bg-gray-200' };
  };

  /**
   * Récupérer le prénom
   */
  const getFirstName = (fullName) => {
    return fullName.split(' ')[0];
  };

  /**
   * Vue planning par véhicules (actuelle)
   */
  const renderVehicleView = () => {
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
    const currentSlideVehicles = getVehiclesForCurrentSlide();
    
    // Déterminer le titre de la slide
    const slideTitle = currentView === 'vehicles-slide1' ? 
      'Planning Véhicules - Slide 1/2' : 
      'Planning Véhicules - Slide 2/2';
    
    const slideSubtitle = currentView === 'vehicles-slide1' ? 
      'Caddy • Crafter 21 • Crafter 23' : 
      'Ducato • Jumper • Transit';

    return (
      <div className="h-full p-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{slideTitle}</h1>
          <p className="text-xl text-gray-600 mb-2">
            Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
          </p>
          <p className="text-lg text-blue-600 font-medium">{slideSubtitle}</p>
          
          {/* Indicateur de slide */}
          <div className="flex justify-center space-x-2 mt-4">
            <div className={`w-3 h-3 rounded-full ${currentView === 'vehicles-slide1' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentView === 'vehicles-slide2' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-6 h-[calc(100vh-200px)]">
          {/* Header jours */}
          <div className="text-2xl font-bold text-gray-700 flex items-center justify-center">
            Véhicules
          </div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {format(day, 'EEEE', { locale: fr })}
              </div>
              <div className="text-lg text-gray-600">
                {format(day, 'dd/MM')}
              </div>
            </div>
          ))}

          {/* Lignes véhicules */}
          {currentSlideVehicles.map(vehicle => (
            <React.Fragment key={vehicle.id}>
              <div className="flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-lg">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: vehicle.couleur }}
                ></div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{vehicle.nom}</div>
                  <div className="text-sm text-gray-500">{vehicle.capacite} places</div>
                </div>
              </div>
              {weekDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const assignedEmployees = planning[dateKey]?.[vehicle.id] || [];
                
                // 🔍 DEBUG: Vérifier pourquoi "Libre" s'affiche
                if (dateKey === '2025-07-29' && vehicle.nom === 'Crafter 21') {
                  console.log(`🔍 ${vehicle.nom} le ${dateKey}:`, {
                    planning: planning[dateKey],
                    vehicleId: vehicle.id,
                    assignedEmployees: assignedEmployees,
                    planningKeys: Object.keys(planning)
                  });
                }
                
                const isFerme = isServiceFerme(dateKey);
                const fermetureInfo = getFermetureInfo(dateKey);
                
                if (isFerme) {
                  return (
                    <div key={`${vehicle.id}-${day.toISOString()}`} className="p-4 border-2 border-gray-400 rounded-lg bg-gray-100 relative">
                      <div className="text-center py-8">
                        <div className="text-2xl mb-2">🚫</div>
                        <div className="text-lg font-bold text-gray-700 mb-1">FERMÉ</div>
                        {fermetureInfo && (
                          <div className="text-sm text-gray-500">{fermetureInfo.motif}</div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={`${vehicle.id}-${day.toISOString()}`} className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                    {assignedEmployees.length > 0 ? (
                      <div className="space-y-2">
                        {assignedEmployees.map((employee, index) => (
                          <div 
                            key={index}
                            className="px-3 py-2 bg-white rounded-lg text-center shadow-sm"
                          >
                            <div className={`text-lg font-medium ${
                              employee.role?.toLowerCase() === 'conducteur' ? 'text-red-600' :
                              employee.role?.toLowerCase() === 'assistant' ? 'text-green-600' :
                              'text-black'
                            }`}>
                              {getFirstName(employee.nom)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-lg">
                        Libre
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Vue planning par employés - Vue fusionnée (utilisant l'espace vertical)
   */
  const renderEmployeeView = () => {
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
    
    // Diviser les employés en groupes pour utiliser l'espace vertical
    const employeesPerGroup = 12; // Nombre d'employés par ligne
    const employeeGroups = [];
    for (let i = 0; i < employees.length; i += employeesPerGroup) {
      employeeGroups.push(employees.slice(i, i + employeesPerGroup));
    }

    return (
      <div className="h-full p-4">
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Planning Employés</h1>
          <p className="text-lg text-gray-600">
            Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
          </p>
        </div>

        <div className="space-y-6 overflow-auto h-[calc(100vh-140px)]">
          {employeeGroups.map((employeeGroup, groupIndex) => (
            <div key={groupIndex} className="bg-white rounded-lg shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-2 text-lg font-bold text-gray-700 w-24">Date</th>
                    {employeeGroup.map(employee => (
                      <th key={employee.id} className="text-center p-2 min-w-[80px]">
                        <div className="text-sm font-bold text-gray-900">
                          {getFirstName(employee.nom)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    
                    return (
                      <tr key={`${groupIndex}-${day.toISOString()}`} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2">
                          <div className="text-sm font-bold text-gray-900">
                            {format(day, 'EEEE', { locale: fr })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {format(day, 'dd/MM')}
                          </div>
                        </td>
                        {employeeGroup.map(employee => {
                          const status = getEmployeeStatus(employee.id, dateKey);
                          
                          return (
                            <td key={employee.id} className="p-1 text-center">
                              <div 
                                className={`px-1 py-1 rounded text-white font-bold text-xs ${status.color}`}
                                style={status.type === 'vehicle' ? { backgroundColor: status.color } : {}}
                              >
                                {status.display}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-2xl text-gray-600">Chargement du mode TV...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Bouton de sortie discret */}
      <button
        onClick={() => navigate('/logistique/planning')}
        className="absolute top-4 left-4 z-50 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors opacity-20 hover:opacity-100"
        title="Retour au planning (ou Escape)"
      >
        <ArrowLeft className="w-6 h-6 text-gray-600" />
      </button>

      {/* Sélecteur de semaine */}
      <div className="absolute top-4 left-1/4 transform -translate-x-1/2 z-50 flex items-center space-x-3 bg-gray-900 bg-opacity-90 px-4 py-2 rounded-lg">
        {/* Semaine précédente */}
        <button
          onClick={goToPreviousWeek}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
          title="Semaine précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Affichage semaine courante */}
        <div className="flex items-center space-x-2 text-white min-w-[200px] text-center">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">
            Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
          </span>
        </div>

        {/* Bouton semaine courante */}
        <button
          onClick={goToCurrentWeek}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs font-medium transition-colors"
          title="Revenir à la semaine courante"
        >
          Aujourd'hui
        </button>

        {/* Semaine suivante */}
        <button
          onClick={goToNextWeek}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
          title="Semaine suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Contrôles TV */}
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-3 bg-gray-900 bg-opacity-80 px-4 py-2 rounded-lg">
        {/* Timer visuel */}
        <div className="flex items-center space-x-2 text-white">
          <div className="text-sm font-bold">{timeLeft}s</div>
          <div className="w-12 h-2 bg-gray-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Bouton pause/play */}
        <button
          onClick={togglePause}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
          title={isPaused ? "Reprendre" : "Pause"}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Bouton switch */}
        <button
          onClick={switchView}
          className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white"
          title="Changer de vue"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Bouton plein écran si échec */}
        {fullscreenFailed && (
          <button
            onClick={enterFullscreenManually}
            className="p-2 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors text-white"
            title="Activer le plein écran"
          >
            <Maximize className="w-4 h-4" />
          </button>
        )}

        {/* Indicateur de vue */}
        <div className="flex items-center space-x-2 text-white">
          <Monitor className="w-4 h-4" />
          <span className="text-sm font-medium">
            {currentView === 'vehicles-slide1' || currentView === 'vehicles-slide2' ? 'Véhicules' : 'Employés'}
          </span>
        </div>
      </div>

      {/* Contenu alternatif avec 2 vues */}
      {currentView === 'vehicles-slide1' || currentView === 'vehicles-slide2' ? renderVehicleView() : renderEmployeeView()}
    </div>
  );
};

export default LogistiqueTVView; 