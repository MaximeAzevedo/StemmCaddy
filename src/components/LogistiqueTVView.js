import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Monitor, ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabaseLogistique } from '../lib/supabase-logistique';

const LogistiqueTVView = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('vehicles'); // 'vehicles', 'employees'
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  
  // Données
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [planning, setPlanning] = useState({});
  const [absences, setAbsences] = useState([]);

  /**
   * Chargement des données complètes
   */
  const loadAllData = useCallback(async () => {
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
        supabaseLogistique.loadPlanningHebdomadaire(currentWeek),
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
  }, [currentWeek]);

  /**
   * Alternance automatique des vues avec timer (3 vues maintenant)
   */
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Cycle entre les 2 vues : vehicles -> employees -> vehicles
          setCurrentView(prevView => {
            if (prevView === 'vehicles') return 'employees';
            if (prevView === 'employees') return 'vehicles';
            return 'vehicles';
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
      if (prev === 'vehicles') return 'employees';
      if (prev === 'employees') return 'vehicles';
      return 'vehicles';
    });
    setTimeLeft(15); // Reset timer
  };

  const resetTimer = () => {
    setTimeLeft(15);
  };

  /**
   * Chargement initial et au changement de semaine
   */
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  /**
   * Plein écran au montage
   */
  useEffect(() => {
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    };

    enterFullscreen();

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
   * Obtenir le statut d'un employé pour une date
   */
  const getEmployeeStatus = (employeeId, date) => {
    // Vérifier les absences
    const isAbsent = absences.some(absence => 
      absence.employee_id === employeeId &&
      absence.date_debut <= date &&
      absence.date_fin >= date
    );

    if (isAbsent) {
      return { type: 'absent', display: 'Absent', color: 'bg-red-500' };
    }

    // Vérifier les assignations de véhicules
    const dateKey = date;
    if (planning[dateKey]) {
      for (const [vehicleId, assignedEmployees] of Object.entries(planning[dateKey])) {
        const isAssigned = assignedEmployees.some(emp => emp.id === employeeId);
        if (isAssigned) {
          const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
          if (vehicle) {
            if (vehicle.nom === 'Caddy') {
              return { type: 'caddy', display: 'Caddy', color: 'bg-gray-500' };
            } else {
              return { type: 'vehicle', display: vehicle.nom, color: vehicle.couleur || '#6b7280' };
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

    return (
      <div className="h-full p-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Planning Véhicules</h1>
          <p className="text-xl text-gray-600">
            Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
          </p>
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
          {vehicles.map(vehicle => (
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
                              employee.role === 'conducteur' ? 'text-red-600' :
                              employee.role === 'assistant' ? 'text-green-600' :
                              'text-gray-900'
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

        {/* Indicateur de vue */}
        <div className="flex items-center space-x-2 text-white">
          <Monitor className="w-4 h-4" />
          <span className="text-sm font-medium">
            {currentView === 'vehicles' ? 'Véhicules' : 'Employés'}
          </span>
        </div>
      </div>

      {/* Contenu alternatif avec 2 vues */}
      {currentView === 'vehicles' ? renderVehicleView() : renderEmployeeView()}
    </div>
  );
};

export default LogistiqueTVView; 