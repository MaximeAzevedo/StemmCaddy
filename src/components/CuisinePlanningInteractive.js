import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { sessionsConfig, getSessionConfig } from '../planning/config';
import { getCreneauxForPoste } from '../lib/supabase-cuisine';
import { 
  usePlanningDataLoader, 
  usePlanningBoard, 
  useLocalPlanningSync, 
  usePlanningAI 
} from '../planning/hooks';

const CuisinePlanningInteractive = () => {
  // ✅ États locaux simplifiés
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentSession, setCurrentSession] = useState('matin');
  const [showAIMenu, setShowAIMenu] = useState(false);

  // ✅ HOOKS HYBRIDES - Données métier DB + Planning localStorage
  const { 
    loading, 
    postes, 
    loadData, 
    runDataDiagnostic 
  } = usePlanningDataLoader(selectedDate, currentSession);

  const { 
    board,
    lastSaved,
    resetPlanning,
    exportPlanning,
    getStats,
    setBoard
  } = useLocalPlanningSync(selectedDate);

  const { 
    availableEmployees, 
    buildSmartBoard, 
    onDragEnd, 
    resetBoard,
    mergeAIBoard,
    updateBoard
  } = usePlanningBoard(selectedDate, currentSession, setBoard);

  const { 
    aiLoading, 
    generateAIPlanning, 
    optimizeExistingPlanning 
  } = usePlanningAI(selectedDate, currentSession, mergeAIBoard);

  // ✅ Chargement initial et reconstruction du board
  useEffect(() => {
    const initializeData = async () => {
      try {
        const data = await loadData();
        if (data) {
          // Construire le board vide avec les données métier
          const emptyBoard = await buildSmartBoard(
            data.postes, 
            data.creneaux, 
            data.employees, 
            data.absences
          );
          
          // Si le board localStorage est vide, initialiser avec structure vide
          if (Object.keys(board).length === 0) {
            updateBoard(emptyBoard);
          }
        }
      } catch (error) {
        console.error('Erreur initialisation:', error);
        toast.error('Erreur de chargement des données');
      }
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, currentSession, loadData, buildSmartBoard]);

  // ✅ Gestion des sessions
  const handleSessionChange = (newSession) => {
    setCurrentSession(newSession);
  };

  // ✅ Menu IA avec nouvelle architecture
  const handleAIAction = (action) => {
    setShowAIMenu(false);
    if (action === 'new') {
      // Reset puis génération
      resetBoard();
      generateAIPlanning();
    } else if (action === 'optimize') {
      optimizeExistingPlanning(board);
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

  // ✅ Diagnostic des données métier
  const handleDiagnostic = async () => {
    const result = await runDataDiagnostic();
    const stats = getStats();
    
    console.log('📊 STATISTIQUES PLANNING LOCAL:', stats);
    toast[result.success ? 'success' : 'error'](
      `${result.message}\n\n📊 Planning local: ${stats.totalAssignments} assignations (${stats.fillRate}% rempli)`, 
      { duration: 4000 }
    );
  };

  // ✅ Reset complet
  const handleResetAll = () => {
    resetPlanning(); // Reset localStorage
    resetBoard();    // Reset UI
  };

  // ✅ Export du planning
  const handleExport = () => {
    exportPlanning();
  };

  // ✅ Fermer le menu IA quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAIMenu && !event.target.closest('.ai-menu-container')) {
        setShowAIMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAIMenu]);

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
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600 mx-auto mb-6"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Chargement des données métier</h3>
          <p className="text-gray-600">Préparation de l'interface hybride...</p>
        </div>
      </div>
    );
  }

  const conf = getSessionConfig(currentSession);
  const postesActifs = postes.filter(p => conf.postesActifs.includes(p.nom));
  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ✅ Header avec nouvelles fonctionnalités */}
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
            <button
              onClick={handleResetAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white font-medium text-sm hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>
            
            {/* Menu IA */}
            <div className="relative ai-menu-container">
              <button
                onClick={() => setShowAIMenu(!showAIMenu)}
                disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>{aiLoading ? 'IA en cours...' : 'IA Auto'}</span>
              </button>
              
              {showAIMenu && (
                <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                  <button
                    onClick={() => handleAIAction('new')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                  >
                    ✨ Nouveau Planning
                  </button>
                  <button
                    onClick={() => handleAIAction('optimize')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ⚡ Optimiser Existant
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={openTVMode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Mode TV</span>
            </button>
            
            <button
              onClick={handleDiagnostic}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white font-medium text-sm hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Diagnostic</span>
            </button>
          </div>
        </div>
        
        {/* Indicateur de sauvegarde localStorage */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg text-green-700 text-sm border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>
              📱 Planning local actif • {stats.totalAssignments} assignations • Taux: {stats.fillRate}%
              {lastSaved && ` • Sauvé: ${format(lastSaved, 'HH:mm:ss')}`}
            </span>
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
                        <p className="text-white text-opacity-80 text-sm">Planning local</p>
                      </div>
                    </div>
                  </div>

                  {/* Créneaux */}
                  <div className="p-4 space-y-3">
                    {creneauxForPoste.map((cr) => {
                      const cellId = `${poste.id}-${cr}`;
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
    </div>
  );
};

export default CuisinePlanningInteractive; 