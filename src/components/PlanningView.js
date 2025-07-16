import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Calendar, 
  Save, 
  Download,
  Zap,
  Home,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const PlanningView = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [planning, setPlanning] = useState({});
  const [employees] = useState([
    { id: 1, nom: 'Martial', profil: 'Fort', langues: ['Français'], permis: true },
    { id: 2, nom: 'Margot', profil: 'Moyen', langues: ['Français'], permis: true },
    { id: 3, nom: 'Shadi', profil: 'Fort', langues: ['Arabe', 'Anglais', 'Français'], permis: false },
    { id: 4, nom: 'Ahmad', profil: 'Moyen', langues: ['Arabe'], permis: true },
    { id: 5, nom: 'Tamara', profil: 'Faible', langues: ['Luxembourgeois', 'Français'], permis: true },
    { id: 6, nom: 'Soroosh', profil: 'Fort', langues: ['Perse'], permis: true },
    { id: 7, nom: 'Imad', profil: 'Moyen', langues: ['Arabe'], permis: true }
  ]);

  const vehicles = [
    { id: 'cr21', name: 'Crafter 21', capacity: 3, color: 'bg-blue-500' },
    { id: 'cr23', name: 'Crafter 23', capacity: 3, color: 'bg-green-500' },
    { id: 'jumper', name: 'Jumper', capacity: 3, color: 'bg-purple-500' },
    { id: 'ducato', name: 'Ducato', capacity: 3, color: 'bg-orange-500' },
    { id: 'transit', name: 'Transit', capacity: 8, color: 'bg-red-500' },
    { id: 'caddy', name: 'Reste Caddy', capacity: 10, color: 'bg-gray-500' }
  ];

  const initializePlanning = useCallback(() => {
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
    const newPlanning = {};
    
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      newPlanning[dateKey] = {
        cr21: [
          { id: 2, nom: 'Margot', status: 'assigned' },
          { id: 7, nom: 'Imad', status: 'assigned' }
        ],
        cr23: [
          { id: 6, nom: 'Soroosh', status: 'assigned' },
          { id: 4, nom: 'Ahmad', status: 'assigned' }
        ],
        jumper: [
          { id: 5, nom: 'Tamara', status: 'assigned' }
        ],
        ducato: [],
        transit: [
          { id: 3, nom: 'Shadi', status: 'absent' }
        ],
        caddy: [
          { id: 1, nom: 'Martial', status: 'assigned' }
        ]
      };
    });
    
    setPlanning(newPlanning);
  }, [currentWeek]);

  // Calculer weekDays au niveau du composant pour l'affichage
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));

  useEffect(() => {
    // Initialiser le planning avec des données de démonstration
    initializePlanning();
  }, [currentWeek, initializePlanning]);

  const generateAIPlanning = async () => {
    toast.loading('Génération automatique du planning...', { id: 'ai-planning' });
    
    // Simulation de l'IA qui génère un planning optimal
    setTimeout(() => {
      const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
      const optimizedPlanning = {};
      
      weekDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        
        // Algorithme simplifié de génération de planning
        const availableEmployees = [...employees];
        
        optimizedPlanning[dateKey] = {
          cr21: getOptimalTeam(availableEmployees, 3, 'cr21'),
          cr23: getOptimalTeam(availableEmployees, 3, 'cr23'),
          jumper: getOptimalTeam(availableEmployees, 3, 'jumper'),
          ducato: getOptimalTeam(availableEmployees, 3, 'ducato'),
          transit: getOptimalTeam(availableEmployees, 6, 'transit'),
          caddy: availableEmployees.slice(0, 4).map(emp => ({ ...emp, status: 'assigned' }))
        };
      });
      
      setPlanning(optimizedPlanning);
      toast.success('Planning optimisé généré avec succès !', { id: 'ai-planning' });
    }, 2000);
  };

  const getOptimalTeam = (employees, maxSize, vehicleType) => {
    // Logique simplifiée pour équilibrer les profils et langues
    const forts = employees.filter(e => e.profil === 'Fort');
    const moyens = employees.filter(e => e.profil === 'Moyen');
    const faibles = employees.filter(e => e.profil === 'Faible');
    
    const team = [];
    
    // Assurer un profil fort si possible
    if (forts.length > 0 && team.length < maxSize) {
      team.push({ ...forts[0], status: 'assigned' });
    }
    
    // Ajouter un profil faible avec un fort
    if (faibles.length > 0 && team.length > 0 && team.length < maxSize) {
      team.push({ ...faibles[0], status: 'assigned' });
    }
    
    // Compléter avec des moyens
    while (team.length < maxSize && moyens.length > 0) {
      team.push({ ...moyens[team.length % moyens.length], status: 'assigned' });
    }
    
    return team;
  };

  const onDragEnd = (result) => {
    const { destination, source } = result;
    
    if (!destination) return;
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    
    const sourceDate = source.droppableId.split('-')[0];
    const sourceVehicle = source.droppableId.split('-')[1];
    const destDate = destination.droppableId.split('-')[0];
    const destVehicle = destination.droppableId.split('-')[1];
    
    const newPlanning = { ...planning };
    
    // Vérifier si les objets existent avant d'y accéder
    if (!newPlanning[sourceDate] || !newPlanning[sourceDate][sourceVehicle]) {
      console.error('❌ Source invalide:', { sourceDate, sourceVehicle });
      toast.error('Erreur: Source de déplacement invalide');
      return;
    }
    
    if (!newPlanning[destDate]) {
      newPlanning[destDate] = {};
    }
    
    if (!newPlanning[destDate][destVehicle]) {
      newPlanning[destDate][destVehicle] = [];
    }
    
    // Vérifier si l'index source est valide
    if (source.index >= newPlanning[sourceDate][sourceVehicle].length) {
      console.error('❌ Index source invalide:', { sourceIndex: source.index, arrayLength: newPlanning[sourceDate][sourceVehicle].length });
      toast.error('Erreur: Index de déplacement invalide');
      return;
    }
    
    // Retirer de la source
    const draggedEmployee = newPlanning[sourceDate][sourceVehicle][source.index];
    if (!draggedEmployee) {
      console.error('❌ Employé non trouvé à l\'index:', source.index);
      toast.error('Erreur: Employé non trouvé');
      return;
    }
    
    newPlanning[sourceDate][sourceVehicle].splice(source.index, 1);
    
    // Vérifier la capacité du véhicule de destination
    const destVehicleInfo = vehicles.find(v => v.id === destVehicle);
    if (destVehicleInfo && newPlanning[destDate][destVehicle].length >= destVehicleInfo.capacity) {
      toast.error(`Le véhicule ${destVehicleInfo.name} est à pleine capacité (${destVehicleInfo.capacity})`);
      // Remettre l'employé à sa place
      newPlanning[sourceDate][sourceVehicle].splice(source.index, 0, draggedEmployee);
      return;
    }
    
    // Ajouter à la destination
    const destIndex = Math.min(destination.index, newPlanning[destDate][destVehicle].length);
    newPlanning[destDate][destVehicle].splice(destIndex, 0, draggedEmployee);
    
    setPlanning(newPlanning);
    toast.success('Planning mis à jour');
  };

  const getEmployeeCard = (employee, index, dateKey, vehicleId) => (
    <Draggable key={employee.id} draggableId={`${employee.id}-${dateKey}-${vehicleId}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-2 mb-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            snapshot.isDragging ? 'shadow-lg scale-105' : ''
          } ${
            employee.status === 'absent' 
              ? 'bg-red-100 text-red-800 border border-red-200' 
              : 'bg-white text-gray-900 border border-gray-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{employee.nom}</span>
            {employee.status === 'absent' && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
      )}
    </Draggable>
  );

  const getVehicleColumn = (vehicle, date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const droppableId = `${dateKey}-${vehicle.id}`;
    const teamMembers = planning[dateKey]?.[vehicle.id] || [];
    
    return (
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-32 p-3 rounded-lg border-2 transition-all duration-200 ${
              snapshot.isDraggingOver 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-3 h-3 rounded-full ${vehicle.color}`}></div>
              <span className="text-xs text-gray-600">{teamMembers.length}/{vehicle.capacity}</span>
            </div>
            
            {teamMembers.map((employee, index) => 
              getEmployeeCard(employee, index, dateKey, vehicle.id)
            )}
            
            {provided.placeholder}
            
            {teamMembers.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">
                Glissez un employé ici
              </div>
            )}
          </div>
        )}
      </Droppable>
    );
  };

  const getWeekStats = () => {
    let totalAssigned = 0;
    let totalAbsent = 0;
    let alerts = [];
    
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayPlanning = planning[dateKey];
      
      if (dayPlanning) {
        Object.entries(dayPlanning).forEach(([vehicleId, team]) => {
          team.forEach(employee => {
            if (employee.status === 'assigned') totalAssigned++;
            if (employee.status === 'absent') totalAbsent++;
          });
          
          // Vérifier les alertes
          const vehicle = vehicles.find(v => v.id === vehicleId);
          if (team.length > vehicle.capacity) {
            alerts.push(`${vehicle.name} - ${format(day, 'EEEE', { locale: fr })} : Trop d'employés`);
          }
        });
      }
    });
    
    return { totalAssigned, totalAbsent, alerts };
  };

  const stats = getWeekStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <Home className="w-5 h-5" />
              </button>
              <Calendar className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Planning des Équipes</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{user.name}</span>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contrôles et Stats */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Contrôles */}
          <div className="lg:w-2/3">
            <div className="card-premium p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
                  </h2>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      ← Semaine précédente
                    </button>
                    <button
                      onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      Semaine suivante →
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={generateAIPlanning}
                    className="btn-primary flex items-center"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Générer avec IA
                  </button>
                  <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:w-1/3">
            <div className="card-premium p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Employés assignés:</span>
                  <span className="font-semibold text-green-600">{stats.totalAssigned}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Absences:</span>
                  <span className="font-semibold text-red-600">{stats.totalAbsent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Alertes:</span>
                  <span className="font-semibold text-yellow-600">{stats.alerts.length}</span>
                </div>
              </div>
              
              {stats.alerts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Alertes:</h4>
                  {stats.alerts.map((alert, index) => (
                    <div key={index} className="text-xs text-red-600 mb-1">{alert}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Légende véhicules */}
        <div className="card-premium p-4 mb-8">
          <div className="flex flex-wrap gap-4">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full ${vehicle.color}`}></div>
                <span className="text-sm text-gray-700">{vehicle.name}</span>
                <span className="text-xs text-gray-500">({vehicle.capacity} max)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Planning Drag & Drop */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="card-premium p-6">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* En-têtes des jours */}
                <div className="grid grid-cols-6 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700">Véhicules</div>
                  {weekDays.map(day => (
                    <div key={day.toISOString()} className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {format(day, 'EEEE', { locale: fr })}
                      </div>
                      <div className="text-xs text-gray-600">
                        {format(day, 'dd/MM')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lignes véhicules */}
                {vehicles.map(vehicle => (
                  <div key={vehicle.id} className="grid grid-cols-6 gap-4 mb-4">
                    <div className="flex items-center space-x-2 py-2">
                      <div className={`w-3 h-3 rounded-full ${vehicle.color}`}></div>
                      <span className="text-sm font-medium text-gray-900">{vehicle.name}</span>
                    </div>
                    {weekDays.map(day => (
                      <div key={`${vehicle.id}-${day.toISOString()}`}>
                        {getVehicleColumn(vehicle, day)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DragDropContext>

        {/* Pool d'employés disponibles */}
        <div className="mt-8 card-premium p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employés Disponibles</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {employees.map(employee => (
              <div key={employee.id} className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm font-bold text-primary-600">
                    {employee.nom.charAt(0)}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900">{employee.nom}</div>
                <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                  employee.profil === 'Fort' ? 'bg-green-100 text-green-700' :
                  employee.profil === 'Moyen' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {employee.profil}
                </div>
                <div className="flex items-center justify-center mt-1">
                  {employee.permis ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningView; 