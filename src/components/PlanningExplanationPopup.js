import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Brain,
  Users,
  Target,
  CheckCircle,
  TrendingUp,
  Award,
  Clock,
  Lightbulb
} from 'lucide-react';

const PlanningExplanationPopup = ({ 
  planningData, 
  isVisible, 
  onClose,
  duration = "3.2s" 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Animation automatique des slides
  useEffect(() => {
    if (!isVisible) return;
    
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 3);
    }, 2500);
    
    return () => clearInterval(timer);
  }, [isVisible]);

  if (!planningData || !isVisible) return null;

  // Analyser les données pour créer l'explication
  const analysis = analyzeaPlanningData(planningData);

  const slides = [
    {
      icon: Brain,
      title: "IA Planning Optimisé",
      content: analysis.overview,
      accent: "from-purple-500 to-blue-500"
    },
    {
      icon: Users,
      title: "Mix Profils Équilibré", 
      content: analysis.profileMix,
      accent: "from-green-500 to-teal-500"
    },
    {
      icon: Target,
      title: "Stratégie Appliquée",
      content: analysis.strategy,
      accent: "from-orange-500 to-red-500"
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 100 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: 100 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className="fixed top-4 right-4 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        {/* Header Premium */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Planning IA Premium</h3>
                <p className="text-indigo-100 text-sm">Analyse intelligente en {duration}</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Barre de progression */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <motion.div
              className="h-full bg-white/60"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 8, ease: "linear" }}
            />
          </div>
        </div>

        {/* Contenu avec slides animés */}
        <div className="relative h-80 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 p-6"
            >
              {/* Icône et titre du slide */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${slides[currentSlide].accent} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                  {React.createElement(slides[currentSlide].icon, { className: "w-6 h-6" })}
                </div>
                <h4 className="text-xl font-bold text-gray-800">
                  {slides[currentSlide].title}
                </h4>
              </div>

              {/* Contenu du slide */}
              <div className="space-y-3">
                {slides[currentSlide].content.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm leading-relaxed">
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer avec statistiques */}
        <div className="bg-gray-50 p-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600">
                {planningData.statistiques?.employes_utilises || 0}
              </div>
              <div className="text-xs text-gray-500">Employés</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {planningData.statistiques?.postes_couverts || 0}
              </div>
              <div className="text-xs text-gray-500">Postes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {planningData.statistiques?.score_global || 0}
              </div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
          </div>
        </div>

        {/* Indicateurs de slides */}
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentSlide === index ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Fonction d'analyse des données de planning
function analyzeaPlanningData(planningData) {
  const { planning_optimal, statistiques, recommandations, source } = planningData;
  
  // Analyse des profils utilisés
  const profiles = [];
  const postes = new Set();
  
  if (planning_optimal) {
    planning_optimal.forEach(poste => {
      postes.add(poste.poste);
      if (poste.employes_assignes) {
        poste.employes_assignes.forEach(emp => {
          if (emp.raison && emp.raison.includes('Fort')) profiles.push('Fort');
          else if (emp.raison && emp.raison.includes('Moyen')) profiles.push('Moyen');
          else if (emp.raison && emp.raison.includes('Faible')) profiles.push('Faible');
        });
      }
    });
  }
  
  const profileCounts = {
    Fort: profiles.filter(p => p === 'Fort').length,
    Moyen: profiles.filter(p => p === 'Moyen').length,
    Faible: profiles.filter(p => p === 'Faible').length
  };

  return {
    overview: [
      `${statistiques?.employes_utilises || 0} employés assignés automatiquement`,
      `${statistiques?.postes_couverts || 0} postes couverts selon priorités`,
      `Score global de ${statistiques?.score_global || 0}/100 obtenu`,
      source === 'MANUAL_FALLBACK' ? 'Fallback manuel activé pour robustesse' : 'Optimisation IA Azure OpenAI'
    ],
    
    profileMix: [
      `${profileCounts.Fort} profils Fort sur postes critiques`,
      `${profileCounts.Moyen} profils Moyen pour équilibrage`,
      `${profileCounts.Faible} profils Faible en apprentissage`,
      'Mix optimal formation/performance respecté'
    ],
    
    strategy: [
      'Sandwichs priorisés avec équipe renforcée',
      'Self Midi couvert pour service client',
      'Compétences validées respectées',
      'Employés restants assignés en Légumerie'
    ]
  };
}

export default PlanningExplanationPopup; 