import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { getSessionConfig } from '../planning/config';
import { supabase } from '../lib/supabase'; // ✅ Gardé pour compatibilité
import { supabaseCuisine } from '../lib/supabase-cuisine'; // ✅ NOUVEAU : Notre API robuste

const CuisinePlanningDisplay = () => {
  const [searchParams] = useSearchParams();
  const [planningData, setPlanningData] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentGroup, setCurrentGroup] = useState(1); // 1 ou 2 pour alterner
  const [timeLeft, setTimeLeft] = useState(15); // Compte à rebours
  const [isPaused, setIsPaused] = useState(false); // État de pause
  const [isNettoyageMode, setIsNettoyageMode] = useState(false); // Mode nettoyage
  const [nettoyageData, setNettoyageData] = useState({}); // Données planning nettoyage
  
  // ✅ CORRECTION : Paramètres URL avec date dynamique
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'); // Date du jour par défaut
  const sessionParam = searchParams.get('session') || 'matin';

  // ✅ POSTES SPÉCIFIQUES MODE TV (8 postes seulement)
  const POSTES_TV = [
    { id: 1, nom: 'Cuisine chaude', couleur: '#ef4444', icone: '🔥' },
    { id: 2, nom: 'Sandwichs', couleur: '#f59e0b', icone: '🥪' },
    { id: 3, nom: 'Pain', couleur: '#eab308', icone: '🍞' },
    { id: 4, nom: 'Jus de fruits', couleur: '#22c55e', icone: '🧃' },
    { id: 5, nom: 'Vaisselle', couleur: '#3b82f6', icone: '🍽️' },
    { id: 6, nom: 'Légumerie', couleur: '#10b981', icone: '🥬' },
    { id: 7, nom: 'Self Midi', couleur: '#8b5cf6', icone: '🍽️' },
    { id: 8, nom: 'Equipe Pina et Saskia', couleur: '#ec4899', icone: '👥' }
  ];

  // ✅ ZONES NETTOYAGE MODE TV
  const ZONES_NETTOYAGE = [
    { id: 1, nom: 'Plonge', couleur: '#3b82f6', image: '/images/nettoyage/plonge.jpg', icone: '🧽' },
    { id: 2, nom: 'Couloir sale et frigo', couleur: '#ef4444', image: '/images/nettoyage/couloir-sale-frigo.jpg', icone: '🚪' },
    { id: 3, nom: 'Légumerie', couleur: '#10b981', image: '/images/nettoyage/legumerie.jpg', icone: '🥬' },
    { id: 4, nom: 'Cuisine chaude', couleur: '#f59e0b', image: '/images/nettoyage/cuisine-chaude.jpg', icone: '🔥' },
    { id: 5, nom: 'Sandwicherie et sous vide', couleur: '#8b5cf6', image: '/images/nettoyage/sandwicherie-sous-vide.jpg', icone: '🥪' },
    { id: 6, nom: 'Couloir propre et frigo', couleur: '#22c55e', image: '/images/nettoyage/couloir-propre-frigo.jpg', icone: '✨' }
  ];

  // ✅ GROUPES DE ROTATION (4 postes par groupe)
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
  }, [isPaused, currentGroup]);

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
   * ✅ CORRECTION : Utiliser notre API robuste au lieu de la logique manuelle
   */
  const loadPlanningFromDB = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`📺 Chargement planning pour la date: ${dateParam}`);
      
      // ✅ UTILISER notre méthode robuste qui gère déjà tout
      const result = await supabaseCuisine.loadPlanningCuisine(new Date(dateParam));

      if (result.error) {
        console.error('❌ Erreur chargement planning TV:', result.error);
        setPlanningData({});
        return;
      }

      const planningData = result.data || {};
      console.log('📺 Planning data reçu:', Object.keys(planningData).length, 'postes');
      
      // 🔍 DEBUG TV : Afficher les données exactes reçues
      console.log('🔍 DEBUG TV - Données brutes reçues:', planningData);
      Object.entries(planningData).forEach(([posteId, employees]) => {
        console.log(`🔍 TV Poste "${posteId}":`, employees.map(emp => ({
          id: emp.id,
          nom: emp.prenom || emp.nom
        })));
      });
      
      // ✅ CONVERSION planning par posteId → planning par nom de poste pour la TV
      const planningByPoste = {};
      
      // ✅ MAPPING CORRECT : IDs vrais de CuisinePlanningSimple → noms TV
      const POSTE_ID_TO_NAME = {
        1: 'Sandwichs',                  // ✅ ID 1 vrai
        2: 'Self Midi',                  // ✅ ID 2 vrai (11h-11h45)
        3: 'Self Midi',                  // ✅ ID 3 vrai (11h45-12h45)  
        4: 'Cuisine chaude',             // ✅ ID 4 vrai
        5: 'Vaisselle',                  // ✅ ID 5 vrai (8h)
        6: 'Vaisselle',                  // ✅ ID 6 vrai (10h)
        7: 'Vaisselle',                  // ✅ ID 7 vrai (midi)
        8: 'Pain',                       // ✅ ID 8 vrai
        9: 'Légumerie',                  // ✅ ID 9 vrai
        10: 'Jus de fruits',             // ✅ ID 10 vrai
        11: 'Equipe Pina et Saskia'     // ✅ ID 11 vrai
      };

      Object.entries(planningData).forEach(([posteId, employees]) => {
        const posteIdNum = parseInt(posteId);
        const posteName = POSTE_ID_TO_NAME[posteIdNum];
        
        if (!posteName || !employees?.length) return;
            
        if (!planningByPoste[posteName]) {
          planningByPoste[posteName] = [];
        }
        
        // ✅ MAPPING ID → CRÉNEAU pour affichage TV
        const POSTE_ID_TO_CRENEAU = {
          5: '8h',           // Vaisselle 8h
          6: '10h',          // Vaisselle 10h
          7: 'midi',         // Vaisselle midi
          2: '11h',          // Self Midi 11h-11h45
          3: '11h45'         // Self Midi 11h45-12h45
        };
            
        // Ajouter tous les employés de ce poste avec leur créneau
        employees.forEach(emp => {
          planningByPoste[posteName].push({
            id: emp.id,
            prenom: emp.prenom || emp.nom,
            photo_url: emp.photo_url,
            poste: posteName,
            role: emp.role,
            creneau: POSTE_ID_TO_CRENEAU[posteIdNum] // ✅ Créneau seulement pour Vaisselle et Self Midi
          });
        });
      });
      
      setPlanningData(planningByPoste);
      console.log('📺 DEBUG TV - Planning final par poste:', planningByPoste);
      
    } catch (error) {
      console.error('❌ Erreur chargement planning TV:', error);
      setPlanningData({});
    } finally {
      setLoading(false);
    }
  }, [dateParam]); // ✅ CORRECTION : Dépendance sur dateParam

  /**
   * ✅ CHARGEMENT INITIAL avec refresh si la date change
   */
  useEffect(() => {
    loadPlanningFromDB();
  }, [loadPlanningFromDB, dateParam]); // ✅ CORRECTION : Recharger si la date change

  /**
   * ✅ VÉRIFIER s'il y a des données à afficher
   */
  const hasAnyData = () => {
    return Object.keys(planningData).length > 0 && 
           Object.values(planningData).some(employees => employees && employees.length > 0);
  };

  /**
   * ✅ NOUVEAU : Obtenir les employés directement par poste avec créneaux améliorés
   */
  const getEmployeesForPoste = (posteName) => {
    const employees = planningData[posteName] || [];
    
    // ✅ AMÉLIORATION : Trier par créneau pour un affichage cohérent
    return employees.sort((a, b) => {
      // Ordre des créneaux : 8h → 10h → 11h → 11h45 → midi → 8h-16h
      const creneauOrder = {
        '8h': 1,
        '10h': 2, 
        '11h': 3,
        '11h-11h45': 4,
        '11h45': 5,
        '11h45-12h45': 6,
        'midi': 7,
        '8h-16h': 8
      };
      
      return (creneauOrder[a.creneau] || 999) - (creneauOrder[b.creneau] || 999);
    });
  };

  /**
   * ✅ AMÉLIORATION : Formater les créneaux pour un affichage plus lisible
   */
  const formatCreneau = (creneau) => {
    const mappings = {
      '8h': '8h-10h',
      '10h': '10h-12h', 
      '11h': '11h-11h45',
      '11h45': '11h45-12h45',
      'midi': '12h-16h',
      '8h-16h': 'Service complet'
    };
    
    return mappings[creneau] || creneau;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Chargement du Mode TV</h2>
          <p className="text-blue-200 mb-2">
            📅 Planning du {format(new Date(dateParam), 'dd/MM/yyyy')} - Session {sessionParam}
          </p>
          <p className="text-blue-300 text-sm">
            Récupération des assignations depuis la base de données...
          </p>
        </div>
      </div>
    );
  }

  const conf = getSessionConfig(sessionParam);
  // ✅ CORRECTION : Afficher tous les postes du groupe actuel
  const postesActifs = POSTES_TV.filter(p => 
    postesGroups[currentGroup].includes(p.nom)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-100 text-gray-800 p-4">
      {/* ✅ Header Premium avec glassmorphism */}
      <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl p-6 mb-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-red-500 bg-clip-text text-transparent">
            🍽️ Planning Cuisine - Mode TV
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            📅 {format(new Date(dateParam), 'dd/MM/yyyy')} • 
            ⏰ Session {conf.label}
          </p>
          <div className="mt-6 flex justify-center items-center gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-8 py-3 text-lg font-semibold shadow-lg">
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

      {/* ✅ NOUVEAU : Message informatif si pas de données */}
      {!hasAnyData() && (
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-2xl p-6 mb-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-2xl font-bold text-amber-800 mb-2">Aucun planning trouvé</h3>
          <p className="text-amber-700 text-lg mb-4">
            Pas d'assignations pour le {format(new Date(dateParam), 'dd/MM/yyyy')} - Session {sessionParam}
          </p>
          <p className="text-amber-600 text-sm">
            💡 Utilisez l'interface de planning pour créer des assignations, puis revenez ici pour les visualiser.
          </p>
        </div>
      )}

      {/* ✅ Grid Premium avec cartes élégantes */}
      <div className="grid grid-cols-4 gap-8 h-[calc(100vh-250px)]">
        {postesActifs.map((poste) => {
          const allEmployeesForPoste = getEmployeesForPoste(poste.nom);

          return (
            <div key={poste.id} className="flex flex-col h-full">
              {/* Header du poste Premium */}
              <div 
                className="rounded-t-3xl p-4 text-white text-center mb-6 shadow-lg relative overflow-hidden"
                style={{ 
                  background: `linear-gradient(135deg, ${poste.couleur}DD, ${poste.couleur})`
                }}
              >
                {/* Effet de brillance subtil */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                
                <div className="flex flex-col items-center relative z-10">
                  <span className="text-4xl mb-2 drop-shadow-lg">{poste.icone}</span>
                  <h3 className="text-2xl font-bold drop-shadow">{poste.nom}</h3>
                  <div className="text-lg font-semibold mt-2 bg-white/20 rounded-full px-4 py-1">
                    {allEmployeesForPoste.length} employé{allEmployeesForPoste.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* ✅ Container des employés avec fond elegant */}
              <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-b-3xl p-4 shadow-xl border border-white/30">
                {allEmployeesForPoste.length === 0 ? (
                  <div className="text-gray-500 text-center py-12 text-lg italic">
                    Aucune assignation
                  </div>
                ) : (
                  <div className={`h-full ${
                    allEmployeesForPoste.length <= 2 
                      ? 'flex flex-col gap-6 justify-center' 
                      : allEmployeesForPoste.length <= 4
                      ? 'grid grid-cols-2 gap-4' 
                      : 'grid grid-cols-2 gap-3'
                  }`}>
                    {allEmployeesForPoste.map((employee, idx) => {
                      const photoSize = allEmployeesForPoste.length <= 2 ? 'w-40 h-40' : 
                                       allEmployeesForPoste.length <= 4 ? 'w-32 h-32' : 'w-24 h-24';
                      const photoSizePx = allEmployeesForPoste.length <= 2 ? '160px' : 
                                         allEmployeesForPoste.length <= 4 ? '128px' : '96px';
                      const textSize = allEmployeesForPoste.length <= 2 ? 'text-xl' : 
                                      allEmployeesForPoste.length <= 4 ? 'text-lg' : 'text-base';
                      
                      return (
                        <div
                          key={`${employee.id}-${employee.creneau}-${idx}`}
                          className="flex flex-col items-center text-center p-3 bg-white/40 rounded-2xl backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {/* ✅ Photo Premium avec bordure dégradée */}
                          <div className={`${photoSize} mx-auto mb-3 rounded-full overflow-hidden relative`}>
                            {/* Bordure dégradée */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 p-0.5">
                              <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                                {employee.photo_url ? (
                                  <img 
                                    src={employee.photo_url} 
                                    alt={employee.prenom}
                                    className="w-full h-full rounded-full object-cover"
                                    style={{ 
                                      width: `calc(${photoSizePx} - 4px)`, 
                                      height: `calc(${photoSizePx} - 4px)`,
                                      objectPosition: 'center 20%'
                                    }}
                                  />
                                ) : (
                                  <span className={`${allEmployeesForPoste.length <= 2 ? 'text-4xl' : 'text-2xl'} font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                                    {employee.prenom?.[0]}{employee.prenom?.[1] || ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Prénom Premium */}
                          <div className={`font-bold text-gray-800 ${textSize} mb-1 leading-tight break-words w-full`}>
                            {employee.prenom}
                          </div>
                          
                          {/* Horaires sous le nom pour Vaisselle et Self Midi */}
                          {(poste.nom === 'Vaisselle' || poste.nom === 'Self Midi') && employee.creneau && (
                            <div className="text-gray-600 text-sm font-medium mb-2">
                              {formatCreneau(employee.creneau)}
                            </div>
                          )}
                          
                          {/* Créneau avec badge pour les autres postes (pas de badge si pas d'horaires spécifiques) */}
                          {!(poste.nom === 'Vaisselle' || poste.nom === 'Self Midi') && employee.creneau && (
                            <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full font-medium">
                              {formatCreneau(employee.creneau)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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