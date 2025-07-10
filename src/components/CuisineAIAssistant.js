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
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import { aiChatbot } from '../lib/ai-chatbot';

const CuisineAIAssistant = ({ onDataRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCompact, setIsCompact] = useState(true);
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '👨‍🍳 **Assistant IA Cuisine** à votre service !\n\n🎯 **Spécialisé en gestion de cuisine :**\n• Planning automatique intelligent\n• Gestion des absences avec remplaçants\n• Formation des employés sur postes\n• Optimisation charge de travail\n• Analyse des compétences équipe\n\n💡 **Exemples de commandes avancées :**\n• "Analyse le planning de cette semaine"\n• "Qui peut remplacer Paul sur Cuisine chaude ?"\n• "Équilibrer la charge de travail"\n• "Former les nouveaux sur Pain"\n• "Statistiques de compétences de l\'équipe"\n\nParlez-moi naturellement ! 🗣️',
      timestamp: new Date(),
      category: 'system'
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

  const addMessage = (type, content, category = 'general') => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
      category
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/[📍✅❌⚠️🎯👤🤖💡⚡🗣️📊👨‍🍳🔍]/g, '')
        .replace(/\n/g, ' ');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceInput = useCallback(async (transcript) => {
    addMessage('user', transcript);
    setIsProcessing(true);
    
    // Simulation d'étapes de réflexion plus détaillées
    const thinkingStages = [
      '🧠 Analyse de votre demande...',
      '🔍 Vérification des données...',
      '⚡ Traitement intelligent...',
      '🎯 Préparation de la réponse...'
    ];
    
    try {
      // Simuler une réflexion plus poussée
      for (let i = 0; i < thinkingStages.length; i++) {
        setThinkingStage(thinkingStages[i]);
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      }
      
      // Traiter avec notre chatbot IA amélioré
      const response = await aiChatbot.processMessage(transcript);
      
      let category = 'general';
      if (response.success) {
        if (response.message.includes('✅')) category = 'success';
        else if (response.message.includes('ℹ️')) category = 'info';
        else if (response.message.includes('📊')) category = 'analysis';
      } else {
        if (response.message.includes('❌')) category = 'error';
        else if (response.message.includes('❓')) category = 'help';
      }
      
      addMessage('ai', response.message, category);
      
      // Synthèse vocale adaptée
      const speakText = response.message.length > 200 
        ? response.message.split('\n')[0] + '... Consultez les détails à l\'écran.'
        : response.message;
      
      speak(speakText);
      
      // Feedback avec plus de variété
      if (response.success) {
        if (response.message.includes('généré') || response.message.includes('optimisé')) {
          toast.success('🎯 Planning optimisé !');
          onDataRefresh?.();
        } else if (response.message.includes('formé') || response.message.includes('compétence')) {
          toast.success('⚡ Compétence mise à jour !');
          onDataRefresh?.();
        } else if (response.message.includes('absent')) {
          toast.success('📅 Absence gérée automatiquement !');
          onDataRefresh?.();
        } else if (response.message.includes('profil')) {
          toast.success('👤 Profil employé modifié !');
          onDataRefresh?.();
        } else if (response.message.includes('assigné')) {
          toast.success('✅ Assignation créée !');
          onDataRefresh?.();
        }
      }
      
    } catch (error) {
      console.error('Erreur traitement IA:', error);
      addMessage('ai', '❌ Problème technique rencontré. L\'équipe technique a été notifiée. Veuillez réessayer dans quelques instants.', 'error');
      toast.error('🔧 Erreur technique');
    } finally {
      setIsProcessing(false);
      setThinkingStage('');
    }
  }, [onDataRefresh]);

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
      action: () => handleVoiceInput('générer le planning cette semaine'),
      color: 'bg-blue-100 hover:bg-blue-200'
    },
    { 
      text: 'Qui absent ?', 
      icon: UserMinus,
      action: () => handleVoiceInput('qui est absent aujourd\'hui'),
      color: 'bg-red-100 hover:bg-red-200'
    },
    { 
      text: 'Optimiser', 
      icon: Target,
      action: () => handleVoiceInput('optimiser le planning'),
      color: 'bg-green-100 hover:bg-green-200'
    },
    { 
      text: 'Analyser équipe', 
      icon: Users,
      action: () => handleVoiceInput('analyse des compétences de l\'équipe'),
      color: 'bg-purple-100 hover:bg-purple-200'
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
      {/* Bouton flottant spécialisé cuisine */}
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
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
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
                    <h3 className="font-semibold text-sm">Assistant IA Cuisine</h3>
                    <p className="text-xs opacity-90">
                      {isProcessing ? `${thinkingStage}` : 'Spécialiste planning cuisine'}
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
                      <div className="flex items-center mb-1">
                        {getMessageIcon(message.category)}
                        <span className="ml-1 font-semibold text-gray-700">Chef IA</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content.split('**').map((part, index) => 
                        index % 2 === 0 ? part : <strong key={index} className="font-bold">{part}</strong>
                      )}
                    </div>
                    <div className="text-xs opacity-70 mt-2 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {message.timestamp.toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
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
                    placeholder={isListening ? "🎤 Dictée en cours..." : "Ex: Former Jean sur Pain, Optimiser planning..."}
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
                  💡 <strong>Spécialités cuisine :</strong> "Équilibrer charge travail", "Analyser compétences équipe", "Suggestions d'amélioration"
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