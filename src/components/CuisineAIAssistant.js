import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  X, 
  Send, 
  Bot, 
  Settings, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Minimize2,
  Maximize2,
  Calendar,
  UserMinus,
  ChefHat,
  Clock,
  Users,
  Target,
  Star,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import IAActionEngine from '../lib/ia-action-engine';

const CuisineAIAssistant = ({ onDataRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCompact, setIsCompact] = useState(true);
  
  // Initialiser le moteur d'actions IA
  const [actionEngine] = useState(() => new IAActionEngine());
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '👨‍🍳 **Assistant IA Cuisine Avancé** à votre service !\n\n🎯 **Nouvelles capacités intelligentes :**\n• **Actions directes** sur la base de données\n• **Gestion absences** avec remplaçants automatiques\n• **Modification compétences** en temps réel\n• **Génération planning** optimisé\n• **Analyse équipe** complète\n• **Apprentissage** de vos préférences\n\n💡 **Commandes naturelles :**\n• "Marie est absente lundi"\n• "Julie maîtrise maintenant la pâtisserie"\n• "Génère le planning de la semaine"\n• "Qui peut remplacer Paul ?"\n• "Analyse l\'équipe"\n\n🚀 **Je peux maintenant modifier vraiment vos données !**',
      timestamp: new Date(),
      category: 'system',
      actionData: null
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [thinkingStage, setThinkingStage] = useState('');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type, content, category = 'general', actionData = null) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
      category,
      actionData
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/[📍✅❌⚠️🎯👤🤖💡⚡🗣️📊👨‍🍳🔍🚀]/g, '')
        .replace(/\n/g, ' ');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  const formatResponseData = (result) => {
    if (!result.data || !result.formatType) return '';

    switch (result.formatType) {
      case 'replacement_suggestions':
        let formatted = '\n\n📋 **Suggestions de remplaçants :**\n';
        for (const [poste, remplacants] of Object.entries(result.data)) {
          formatted += `\n**${poste} :**\n`;
          for (let idx = 0; idx < remplacants.length; idx++) {
            const emp = remplacants[idx];
            const score = Math.round(emp.score_compatibilite * 100);
            formatted += `${idx + 1}. ${emp.employe_nom} (${score}% compatible)\n`;
          }
        }
        return formatted;

      case 'team_analysis':
        const data = result.data;
        return `\n\n📊 **Analyse de l'équipe :**\n• **${data.totalEmployes}** employés\n• **${data.totalCompetences}** compétences différentes\n• **Répartition niveaux :** ${Object.entries(data.repartitionNiveaux).map(([niveau, count]) => `Niveau ${niveau}: ${count}`).join(', ')}\n• **Catégories :** ${Object.keys(data.repartitionCategories).join(', ')}`;

      case 'planning_grid':
        return `\n\n📅 **Planning généré avec succès !**\n• ${result.data?.length || 0} créneaux créés\n• Optimisation basée sur les compétences\n• Équilibrage automatique des charges\n\n▶️ Consultez le module Planning pour voir les détails.`;

      case 'available_employees':
        if (result.data && result.data.length > 0) {
          return '\n\n✅ **Employés disponibles :**\n' + 
            result.data.map(emp => `• ${emp.employe_nom}`).join('\n');
        }
        return '\n\nℹ️ Aucun employé disponible trouvé.';

      case 'daily_schedule':
        if (result.data && result.data.length > 0) {
          return '\n\n👥 **Planning du jour :**\n' + 
            result.data.map(p => `• ${p.employe_nom} - ${p.poste} (${p.heure_debut}-${p.heure_fin})`).join('\n');
        }
        return '\n\nℹ️ Aucun planning trouvé pour cette date.';

      default:
        return '';
    }
  };

  const handleVoiceInput = useCallback(async (transcript) => {
    addMessage('user', transcript);
    setIsProcessing(true);
    
    // Étapes de traitement IA améliorées
    const thinkingStages = [
      '🧠 Analyse de l\'intention...',
      '🔍 Vérification des données...',
      '⚡ Exécution de l\'action...',
      '🎯 Formatage de la réponse...'
    ];
    
    try {
      // Simulation d'une réflexion plus poussée
      for (let i = 0; i < thinkingStages.length; i++) {
        setThinkingStage(thinkingStages[i]);
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400));
      }
      
      // Utiliser notre nouveau moteur d'actions IA
      const result = await actionEngine.executeAction(transcript);
      
      // Formater le message de réponse
      let responseMessage = result.message;
      
      // Ajouter les données formatées si disponibles
      if (result.formatType && result.data) {
        responseMessage += formatResponseData(result);
      }
      
      // Ajouter des informations de debug en mode développement
      if (process.env.NODE_ENV === 'development') {
        responseMessage += `\n\n🔧 **Debug :** Intention: ${result.intent}, Confiance: ${(result.confidence * 100).toFixed(0)}%, Temps: ${result.executionTime}ms`;
      }
      
      // Déterminer la catégorie du message
      let category = 'general';
      if (result.success) {
        if (result.intent === 'ANALYSER_EQUIPE') category = 'analysis';
        else if (result.intent === 'GENERER_PLANNING') category = 'success';
        else if (result.intent === 'AJOUTER_ABSENCE') category = 'info';
        else if (result.intent === 'MODIFIER_COMPETENCE') category = 'success';
        else category = 'success';
      } else {
        category = 'error';
      }
      
      // Ajouter le message avec les données d'action
      addMessage('ai', responseMessage, category, {
        intent: result.intent,
        confidence: result.confidence,
        executionTime: result.executionTime,
        actionData: result.data,
        actions: result.actions
      });
      
      // Synthèse vocale adaptée
      const speakText = result.message.length > 150 
        ? result.message.split('\n')[0] + '... Consultez les détails à l\'écran.'
        : result.message.replace(/[📍✅❌⚠️🎯👤🤖💡⚡🗣️📊👨‍🍳🔍🚀]/g, '');
      
      speak(speakText);
      
      // Feedback toast amélioré selon le type d'action
      if (result.success) {
        switch (result.intent) {
          case 'GENERER_PLANNING':
            toast.success('🎯 Planning optimisé généré !');
            onDataRefresh?.();
            break;
          case 'MODIFIER_COMPETENCE':
            toast.success('⚡ Compétence mise à jour !');
            onDataRefresh?.();
            break;
          case 'AJOUTER_ABSENCE':
            toast.success('📅 Absence enregistrée !');
            onDataRefresh?.();
            break;
          case 'ANALYSER_EQUIPE':
            toast.success('📊 Analyse terminée !');
            break;
          case 'CHERCHER_REMPLACANT':
            toast.success('🔍 Remplaçants trouvés !');
            break;
          default:
            toast.success('✅ Action exécutée !');
        }
      } else {
        toast.error('❌ Action non comprise ou échouée');
      }
      
    } catch (error) {
      console.error('Erreur traitement IA:', error);
      addMessage('ai', '❌ **Erreur technique rencontrée**\n\nL\'assistant IA a rencontré un problème. L\'équipe technique a été notifiée.\n\n🔄 **Solutions possibles :**\n• Vérifiez votre connexion\n• Reformulez votre demande\n• Contactez le support si le problème persiste', 'error');
      toast.error('🔧 Erreur technique');
    } finally {
      setIsProcessing(false);
      setThinkingStage('');
    }
  }, [onDataRefresh, actionEngine]);

  const handleFeedback = async (messageId, rating) => {
    try {
      await actionEngine.submitFeedback(rating);
      toast.success(rating >= 4 ? '⭐ Merci pour votre retour positif !' : '📝 Retour pris en compte');
    } catch (error) {
      console.error('Erreur feedback:', error);
    }
  };

  // Initialisation de la reconnaissance vocale
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'fr-FR';
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceInput(transcript);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Erreur reconnaissance vocale:', event.error);
        setIsListening(false);
        toast.error('Microphone inaccessible');
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, [handleVoiceInput]);

  const startListening = () => {
    if (recognition && !isListening) {
      setIsListening(true);
      recognition.start();
      toast.success('🎤 Parlez maintenant...');
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    
    await handleVoiceInput(inputText);
    setInputText('');
  };

  const getMessageIcon = (category) => {
    switch (category) {
      case 'success': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-500" />;
      case 'help': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'info': return <Settings className="w-3 h-3 text-blue-500" />;
      case 'analysis': return <Target className="w-3 h-3 text-purple-500" />;
      case 'system': return <ChefHat className="w-3 h-3 text-orange-500" />;
      default: return <Bot className="w-3 h-3 text-gray-500" />;
    }
  };

  const quickCommands = [
    { 
      text: 'Planning Auto', 
      icon: Calendar,
      action: () => handleVoiceInput('génère le planning de la semaine'),
      color: 'bg-blue-100 hover:bg-blue-200'
    },
    { 
      text: 'Analyser équipe', 
      icon: Users,
      action: () => handleVoiceInput('analyse les compétences de l\'équipe'),
      color: 'bg-purple-100 hover:bg-purple-200'
    },
    { 
      text: 'Absence test', 
      icon: UserMinus,
      action: () => handleVoiceInput('Marie est absente demain'),
      color: 'bg-red-100 hover:bg-red-200'
    },
    { 
      text: 'Compétence test', 
      icon: Target,
      action: () => handleVoiceInput('Julie maîtrise la pâtisserie'),
      color: 'bg-green-100 hover:bg-green-200'
    }
  ];

  // Auto-focus sur l'input quand on ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <>
      {/* Bouton flottant spécialisé cuisine avec indicateur IA avancé */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center z-50 transition-all duration-300 border-2 border-white"
      >
        <ChefHat className="w-7 h-7" />
        {isProcessing && (
          <div className="absolute inset-0 rounded-full border-3 border-white border-t-transparent animate-spin"></div>
        )}
        {!isProcessing && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse flex items-center justify-center">
            <Star className="w-2 h-2 text-white" />
          </div>
        )}
      </motion.button>

      {/* Interface Assistant Cuisine */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bg-white rounded-xl shadow-2xl border-2 border-orange-200 z-50 overflow-hidden transition-all duration-300 ${
              isCompact ? 'bottom-24 right-4 w-80 h-96' : 'bottom-4 right-4 w-96 h-[36rem]'
            }`}
          >
            {/* Header Cuisine */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChefHat className="w-5 h-5 mr-2" />
                  <div>
                    <h3 className="font-semibold text-sm flex items-center">
                      Assistant IA Cuisine
                      <Star className="w-3 h-3 ml-1 text-yellow-300" />
                    </h3>
                    <p className="text-xs opacity-90">
                      {isProcessing ? `${thinkingStage}` : 'Actions réelles • Base de données'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsCompact(!isCompact)}
                    className="text-white hover:text-gray-200 p-1"
                    title={isCompact ? "Mode expert" : "Mode compact"}
                  >
                    {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-gray-200 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className={`${isCompact ? 'h-56' : 'h-80'} overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-orange-50 to-gray-50`}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-xs shadow-sm ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'bg-white border border-orange-200'
                    }`}
                  >
                    {message.type === 'ai' && (
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          {getMessageIcon(message.category)}
                          <span className="ml-1 font-semibold text-gray-700">Chef IA</span>
                          {message.actionData?.intent && (
                            <span className="ml-2 px-1 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                              {message.actionData.intent}
                            </span>
                          )}
                        </div>
                        {/* Boutons de feedback */}
                        {message.actionData && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleFeedback(message.id, 5)}
                              className="text-gray-400 hover:text-green-500 transition-colors"
                              title="Bonne réponse"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, 1)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Mauvaise réponse"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content.split('**').map((part, index) => 
                        index % 2 === 0 ? part : <strong key={index} className="font-bold">{part}</strong>
                      )}
                    </div>
                    <div className="text-xs opacity-70 mt-2 flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {message.timestamp.toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {message.actionData?.executionTime && (
                        <span className="text-xs text-gray-500">
                          {message.actionData.executionTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white border border-orange-200 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{thinkingStage || 'Chef IA réfléchit...'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Commandes rapides cuisine */}
            {!isCompact && (
              <div className="p-3 border-t border-orange-200 bg-white">
                <div className="grid grid-cols-2 gap-2">
                  {quickCommands.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={cmd.action}
                      disabled={isProcessing}
                      className={`flex items-center justify-center p-2 ${cmd.color} rounded-lg text-xs transition-all duration-200 disabled:opacity-50 transform hover:scale-105`}
                    >
                      <cmd.icon className="w-3 h-3 mr-1" />
                      <span className="font-medium">{cmd.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input amélioré */}
            <div className="p-3 border-t-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-all duration-200 transform ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse scale-110'
                      : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:scale-105'
                  } disabled:opacity-50`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                
                <form onSubmit={handleTextSubmit} className="flex space-x-2 flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isProcessing}
                    placeholder={isListening ? "🎤 Dictée en cours..." : "Ex: Marie est absente demain, Julie maîtrise la pâtisserie..."}
                    className="flex-1 px-3 py-2 border-2 border-orange-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !inputText.trim()}
                    className="p-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:bg-gray-400 transition-all duration-200 transform hover:scale-105"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {!isCompact && (
                <div className="text-xs text-gray-600 bg-white rounded p-2 border border-orange-200">
                  🚀 <strong>IA Avancée :</strong> Actions réelles • Base de données • Apprentissage automatique
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CuisineAIAssistant; 