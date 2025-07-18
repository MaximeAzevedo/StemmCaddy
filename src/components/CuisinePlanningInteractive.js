import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { sessionsConfig, getSessionConfig, getCreneauxForPoste } from '../planning/config';
import { 
  usePlanningDataLoader, 
  usePlanningBoard, 
  useLocalPlanningSync, 
  usePlanningAI 
} from '../planning/hooks';
import { aiPlanningEngine } from '../lib/ai-planning-engine'; // ✅ NOUVEAU : Moteur IA intelligent
// import PlanningExplanationPopup from './PlanningExplanationPopup'; // ✅ MASQUÉ : Pop-up premium (temporairement désactivé)

const CuisinePlanningInteractive = () => {
  // ✅ États locaux simplifiés
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentSession, setCurrentSession] = useState('matin');
  
  // ✅ MASQUÉ : État pour le pop-up d'explication (temporairement désactivé)
  // const [showExplanation, setShowExplanation] = useState(false);
  // const [planningExplanationData, setPlanningExplanationData] = useState(null);

  // ✅ HOOKS CORRIGÉS - Planning manuel avec base de données
  const { 
    loading, 
    postes, 
    loadData, 
    // runDataDiagnostic // ✅ SUPPRIMÉ : Variable non utilisée
  } = usePlanningDataLoader(selectedDate, currentSession);

  const { 
    board,
    isLoading: planningLoading,
    isSaving,
    hasUnsavedChanges,
    saveToDatabase,
    resetPlanning,
    // exportPlanning, // Gardé disponible pour usage futur
    // getStats,       // Gardé disponible pour usage futur
    setBoard
  } = useLocalPlanningSync(selectedDate);

  const { 
    availableEmployees, 
    buildSmartBoard, 
    onDragEnd, 
    resetBoard,
    reloadAvailableEmployees,
    mergeAIBoard
  } = usePlanningBoard(selectedDate, currentSession, setBoard, board); // ✅ CORRECTION : Passer le board externe

  const { 
    aiLoading, 
    generateAIPlanning
  } = usePlanningAI(selectedDate, currentSession, mergeAIBoard);

  // ✅ Chargement initial et reconstruction du board
  useEffect(() => {
    const initializeData = async () => {
      try {
        const data = await loadData();
        await buildSmartBoard(
          data.postes, 
          data.creneaux, 
          data.employees, 
          data.absences
        );
        
        console.log('✅ Initialisation terminée');
      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        toast.error('Erreur lors du chargement des données');
      }
    };
    
    initializeData();
  }, [selectedDate, currentSession, loadData, buildSmartBoard]);

  // ✅ Handlers simplifiés
  const handleSessionChange = (newSession) => {
    setCurrentSession(newSession);
  };

  // ✅ Sauvegarde manuelle
  const handleSave = async () => {
    const result = await saveToDatabase();
    if (result.success) {
      console.log('✅ Planning sauvegardé avec succès');
    }
  };

  // ✅ Reset avec confirmation
  const handleResetAll = async () => {
    if (window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer tout le planning ? Cette action est irréversible.')) {
      await resetPlanning();
      resetBoard(); // Vider aussi les employés disponibles
    }
  };

  // ✅ Génération IA INTELLIGENTE avec Azure OpenAI
  const handleGenerateAI = async () => {
    try {
      console.log('🤖 Lancement de la génération IA intelligente...');
      toast.loading('🤖 Génération planning IA en cours...', { id: 'ai-generation' });

      // 1. Reset le board pour partir propre
      resetBoard();
      
      // 2. Recharger les données fraîches pour l'IA
      const data = await loadData();
      
      // 3. Utiliser notre nouveau moteur IA intelligent
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const aiResult = await aiPlanningEngine.generateIntelligentPlanning(dateString);
      
      if (aiResult.success || aiResult.planning_optimal) {
        // 4. Intégrer les résultats IA dans l'interface
        toast.success(`🎯 Planning IA généré ! ${aiResult.assignments?.length || aiResult.statistiques?.employes_utilises || 0} affectations créées`, { 
          id: 'ai-generation',
          duration: 4000 
        });
        
        // 5. ✅ NOUVEAU : Déclencher le pop-up d'explication premium
        // setPlanningExplanationData(aiResult);
        // setShowExplanation(true);
        
        // 6. Afficher les recommandations IA si disponibles
        if (aiResult.recommandations?.length > 0) {
          console.log('💡 Recommandations IA:', aiResult.recommandations);
        }
        
        // 7. ✅ CORRIGÉ : Intégrer directement les résultats IA au lieu de recharger la base
        if (aiResult.planning_optimal && aiResult.planning_optimal.length > 0) {
          // Convertir les résultats IA en format board pour l'interface
          const newBoard = {};
          const employeesUsed = [];
          
          aiResult.planning_optimal.forEach((posteAssignment, index) => {
            if (posteAssignment.employes_assignes && posteAssignment.employes_assignes.length > 0) {
              // ✅ CORRECTION : Gérer le créneau spécifique de l'assignment
              const creneauUtilise = posteAssignment.creneau || getCreneauxForPoste(posteAssignment.poste, currentSession)[0];
              const cellId = `${posteAssignment.poste}-${creneauUtilise}`;
              
              if (!newBoard[cellId]) {
                newBoard[cellId] = [];
              }
              
              posteAssignment.employes_assignes.forEach(emp => {
                // ✅ CORRECTION CRITIQUE : Récupérer l'ID réel de l'employé depuis les données
                const realEmployee = data.employees.find(realEmp => 
                  realEmp.prenom.toLowerCase() === emp.prenom.toLowerCase()
                );
                
                if (!realEmployee) {
                  console.warn(`⚠️ Employé "${emp.prenom}" non trouvé dans la base de données`);
                  return; // Ignorer cet employé s'il n'existe pas
                }
                
                // Créer un employé pour l'interface AVEC STRUCTURE COMPATIBLE ET ID RÉEL
                const employeeForBoard = {
                  id: `ai-${index}-${emp.prenom}`,
                  draggableId: `ai-${index}-${emp.prenom}`,
                  employeeId: realEmployee.id, // ✅ CORRECTION : Utiliser l'ID réel de la DB
                  // ✅ CORRECTION : Ajouter la propriété employee manquante
                  employee: {
                    id: realEmployee.id, // ✅ CORRECTION : ID réel
                    nom: emp.prenom,
                    profil: emp.raison || emp.role || 'IA',
                    statut: 'Actif'
                  },
                  // Propriétés directes pour compatibilité
                  prenom: emp.prenom,
                  nom: emp.prenom,
                  profil: emp.raison || emp.role,
                  generatedBy: 'ai',
                  score: emp.score_adequation,
                  role: emp.role,
                  photo_url: realEmployee.photo_url // ✅ CORRECTION : Utiliser la vraie photo
                };
                
                newBoard[cellId].push(employeeForBoard);
                employeesUsed.push(emp.prenom);
              });
            }
          });
          
          console.log('🎯 Board IA construit avec créneaux multiples:', newBoard);
          console.log('🗂️ Clés de cellules:', Object.keys(newBoard));
          setBoard(newBoard);
          
          // ✅ CORRECTION : Garder les employés disponibles pour permettre les modifications
          // au lieu de les vider complètement avec []
          await reloadAvailableEmployees(data.employees, data.absences);
        } else {
          // Si pas de planning_optimal, recharger normalement
          await buildSmartBoard(data.postes, data.creneaux, data.employees, data.absences);
        }
        
      } else {
        // Fallback vers l'ancienne méthode si IA échoue
        console.warn('⚠️ IA indisponible, fallback vers méthode classique...', aiResult.error);
        toast.error('⚠️ IA indisponible, génération avec règles prédéfinies', { id: 'ai-generation' });
        
        // Utiliser l'ancienne méthode en secours
        await reloadAvailableEmployees(data.employees, data.absences);
      await generateAIPlanning();
      }
      
    } catch (error) {
      console.error('❌ Erreur génération IA:', error);
      toast.error(`❌ Erreur génération IA: ${error.message}`, { id: 'ai-generation' });
    }
  };

  // ✅ Mode TV (utilise events pour sync localStorage)
  const openTVMode = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const tvUrl = `/cuisine/tv?date=${dateStr}&session=${currentSession}`;
    console.log('📺 Ouverture Mode TV avec:', { date: dateStr, session: currentSession });
    window.open(tvUrl, '_blank', 'fullscreen=yes,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
    toast.success('📺 Mode TV ouvert - Synchronisation automatique active');
  };

  // ✅ Rendu des cartes employés
  const renderEmployeeCard = (item, index) => (
    <Draggable draggableId={item.draggableId} index={index} key={item.draggableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`w-16 h-20 rounded-lg overflow-hidden bg-white border-2 cursor-pointer relative ${
            snapshot.isDragging 
              ? 'border-blue-400 shadow-lg' 
              : 'border-gray-300'
          }`}
        >
          {item.photo_url ? (
            <img 
              src={item.photo_url} 
              alt={item.prenom || item.nom || 'Employé'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {(item.prenom || item.nom || '??')?.[0]}{(item.prenom || item.nom || '??')?.[1] || ''}
              </span>
            </div>
          )}
          
          {/* Indicateur génération IA */}
          {item.generatedBy === 'ai' && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-purple-500 rounded-bl-md">
              <span className="text-white text-xs">🤖</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );

  // ✅ Écran de chargement
  if (loading || planningLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600 mx-auto mb-6"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Chargement des données</h3>
          <p className="text-gray-600">Préparation du planning cuisine...</p>
        </div>
      </div>
    );
  }

  const conf = getSessionConfig(currentSession);
  const postesActifs = postes.filter(p => conf.postesActifs.includes(p.nom));

  // 🔍 DEBUG : Afficher les détails des postes pour comprendre le problème
  console.log('🔍 DEBUG POSTES:', {
    session: currentSession,
    confPostesActifs: conf.postesActifs,
    postesDB: postes.map(p => ({ id: p.id, nom: p.nom })),
    postesActifs: postesActifs.map(p => ({ id: p.id, nom: p.nom })),
    nombrePostesActifs: postesActifs.length
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ✅ Header avec sauvegarde manuelle */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Section Date et Sessions */}
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            
            {Object.keys(sessionsConfig).map((key) => {
              const Icon = sessionsConfig[key].icon;
              return (
                <button
                  key={key}
                  onClick={() => handleSessionChange(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
                    currentSession === key 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{sessionsConfig[key].label}</span>
                </button>
              );
            })}
          </div>

          {/* Section Actions */}
          <div className="flex items-center gap-3">
            {/* Bouton SAUVEGARDER - Principal */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm ${
                hasUnsavedChanges 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{isSaving ? 'Sauvegarde...' : '💾 Sauvegarder'}</span>
            </button>
            
            <button
              onClick={handleResetAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>🗑️ Reset</span>
            </button>
            
            {/* Bouton IA */}
            <button
              onClick={handleGenerateAI}
              disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              <SparklesIcon className="w-4 h-4" />
              <span>{aiLoading ? 'Génération IA...' : '✨ Générer Planning IA'}</span>
            </button>
            
            <button
              onClick={openTVMode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Mode TV</span>
            </button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* ✅ Section Employés Disponibles */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="bg-blue-600 p-4 rounded-t-xl">
              <h2 className="text-lg font-bold text-white">
                👥 Équipe Disponible ({availableEmployees.length} personnes)
              </h2>
            </div>
            <div className="p-4">
              <Droppable droppableId="unassigned" key="unassigned">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`grid grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 2xl:grid-cols-20 gap-4 min-h-[140px] p-4 rounded-lg ${
                        snapshot.isDraggingOver 
                          ? 'bg-blue-100 border-2 border-blue-400' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                  >
                    {availableEmployees.map((item, idx) => renderEmployeeCard(item, idx))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>

        {/* ✅ Section Services */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {postesActifs.map((poste) => {
              const creneauxForPoste = getCreneauxForPoste(poste.nom, currentSession);
              
              return (
                <div
                  key={poste.id}
                  className="flex-shrink-0 w-80 bg-white rounded-xl shadow-lg border border-gray-200"
                >
                  {/* Header du poste */}
                  <div 
                    className="p-4 text-white rounded-t-xl"
                    style={{ backgroundColor: poste.couleur }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span className="text-xl">{poste.icone}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{poste.nom}</h3>
                        <p className="text-white text-opacity-80 text-sm">Planning manuel</p>
                      </div>
                    </div>
                  </div>

                  {/* Créneaux */}
                  <div className="p-4 space-y-3">
                    {creneauxForPoste.map((cr) => {
                      const cellId = `${poste.nom}-${cr}`;
                      const assignedCount = (board[cellId] || []).length;
                      
                      return (
                        <div key={cellId} className="bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between p-3 bg-white rounded-t-lg border-b border-gray-200">
                            <span className="font-semibold text-gray-800 text-sm">{cr}</span>
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {assignedCount}
                            </div>
                          </div>
                          <div className="p-3">
                            <Droppable droppableId={cellId} key={cellId}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`min-h-[140px] p-3 rounded-lg ${
                                    snapshot.isDraggingOver 
                                      ? 'bg-green-100 border-2 border-green-400' 
                                      : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  <div className="grid grid-cols-3 gap-3">
                                    {(board[cellId] || []).map((item, idx) => renderEmployeeCard(item, idx))}
                                  </div>
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* ✅ Pop-up d'explication premium */}
      {/* {showExplanation && planningExplanationData && (
        <PlanningExplanationPopup
          planningData={planningExplanationData}
          isVisible={showExplanation}
          onClose={() => setShowExplanation(false)}
          duration="3.2s"
        />
      )} */}
    </div>
  );
};

export default CuisinePlanningInteractive; 