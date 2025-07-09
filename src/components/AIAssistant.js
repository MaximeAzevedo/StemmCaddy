import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  X, 
  Send, 
  Bot, 
  Settings, 
  Navigation,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Minimize2,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../lib/aiService';

const AIAssistant = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCompact, setIsCompact] = useState(true); // Mode compact par défaut
  const [autoNavigation, setAutoNavigation] = useState(true);
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: '👋 **Assistant IA Caddy** prêt !\n\nDites "aide" pour voir toutes mes capacités.\n\nExemples rapides:\n• "Qui est absent actuellement ?"\n• "Employés disponibles"\n• "Créer employé [nom]"',
      timestamp: new Date(),
      category: 'system'
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Gérer la navigation automatique
  useEffect(() => {
    const handlePopState = () => {
      if (autoNavigation) {
        const currentPath = window.location.pathname;
        const pageNames = {
          '/': 'Accueil',
          '/logistique': 'Logistique',
          '/employees': 'Employés',
          '/planning': 'Planning',
          '/absences': 'Absences',
          '/cuisine': 'Cuisine'
        };
        
        const pageName = pageNames[currentPath];
        if (pageName) {
          addMessage('system', `📍 Navigation vers **${pageName}**`);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [autoNavigation]);

  const addMessage = (type, content, category = 'general') => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date(),
      category
    };
    setMessages(prev => [...prev, newMessage]);

    // Détecter les confirmations en attente
    if (type === 'ai' && content.includes('CONFIRMATION REQUISE')) {
      const idMatch = content.match(/confirmer (\d+)/);
      if (idMatch) {
        setPendingConfirmations(prev => [...prev, {
          id: idMatch[1],
          message: content,
          timestamp: new Date()
        }]);
      }
    }
  };

  const handleVoiceInput = React.useCallback(async (transcript) => {
    addMessage('user', transcript);
    setIsProcessing(true);
    
    try {
      // Traiter avec l'IA avancée
      const aiResponse = await aiService.processVoiceCommand(transcript);
      
      // Détecter le type de réponse pour catégoriser
      let category = 'general';
      if (aiResponse.includes('CONFIRMATION REQUISE')) category = 'confirmation';
      else if (aiResponse.includes('Navigation vers')) category = 'navigation';
      else if (aiResponse.includes('créé avec succès') || aiResponse.includes('mis à jour')) category = 'success';
      else if (aiResponse.includes('❌')) category = 'error';
      else if (aiResponse.includes('⚠️')) category = 'warning';
      
      addMessage('ai', aiResponse, category);
      
      // Navigation automatique si activée
      if (autoNavigation && aiResponse.includes('📍 Navigation vers')) {
        const routeMatch = aiResponse.match(/route: (.+)/);
        if (routeMatch && navigate) {
          setTimeout(() => {
            navigate(routeMatch[1]);
          }, 1000);
        }
      }
      
      // Parler la réponse (version condensée pour les longues réponses)
      const speakText = aiResponse.length > 150 
        ? aiResponse.split('\n')[0] + '... Détails à l\'écran.'
        : aiResponse.replace(/\*\*/g, '').replace(/📍|✅|❌|⚠️|🎯|👤|🚛/g, '');
      
      speak(speakText);
      
    } catch (error) {
      console.error('Erreur traitement IA:', error);
      addMessage('ai', 'Désolé, problème technique. Réessayez s\'il vous plaît.', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [autoNavigation, navigate]);

  useEffect(() => {
    // Initialiser la reconnaissance vocale
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
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Erreur reconnaissance vocale:', event.error);
        setIsListening(false);
        toast.error('Erreur de reconnaissance vocale');
      };
      
      setRecognition(recognitionInstance);
    }
  }, [handleVoiceInput]);

  const startListening = () => {
    if (recognition) {
      setIsListening(true);
      recognition.start();
    } else {
      toast.error('Reconnaissance vocale non supportée');
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      // Essayer de trouver une voix française
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find(voice => voice.lang === 'fr-FR' || voice.lang.startsWith('fr'));
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    
    await handleVoiceInput(inputText);
    setInputText('');
  };

  const handleQuickConfirm = (confirmationId, confirmed) => {
    const command = confirmed ? `confirmer ${confirmationId}` : `annuler ${confirmationId}`;
    handleVoiceInput(command);
    setPendingConfirmations(prev => prev.filter(c => c.id !== confirmationId));
  };

  const getMessageIcon = (category) => {
    switch (category) {
      case 'confirmation': return <AlertTriangle className="w-3 h-3 text-orange-500" />;
      case 'success': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-500" />;
      case 'navigation': return <Navigation className="w-3 h-3 text-blue-500" />;
      case 'system': return <Settings className="w-3 h-3 text-purple-500" />;
      default: return <Bot className="w-3 h-3 text-gray-500" />;
    }
  };

  const quickCommands = [
    { text: 'Absents', action: () => handleVoiceInput('qui est absent actuellement') },
    { text: 'Disponibles', action: () => handleVoiceInput('employés disponibles') },
    { text: 'Stats', action: () => handleVoiceInput('statistiques') },
    { text: 'Planning', action: () => handleVoiceInput('générer planning demain') }
  ];

  return (
    <>
      {/* Bouton flottant optimisé */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 w-14 h-14 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-50 transition-all duration-200 ${
          pendingConfirmations.length > 0 ? 'animate-pulse ring-2 ring-orange-400' : ''
        }`}
      >
        <Bot className="w-6 h-6" />
        {pendingConfirmations.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
            {pendingConfirmations.length}
          </div>
        )}
      </motion.button>

      {/* Interface Assistant Optimisée */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden transition-all duration-300 ${
              isCompact ? 'bottom-20 right-4 w-80 h-96' : 'bottom-4 right-4 w-96 h-[32rem]'
            }`}
          >
            {/* Header Compact */}
            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bot className="w-5 h-5 mr-2" />
                  <div>
                    <h3 className="font-semibold text-sm">Assistant IA</h3>
                    <p className="text-xs opacity-80">Caddy Assistant</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {pendingConfirmations.length > 0 && (
                    <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs">
                      {pendingConfirmations.length}
                    </div>
                  )}
                  <button
                    onClick={() => setIsCompact(!isCompact)}
                    className="text-white hover:text-gray-200 p-1"
                    title={isCompact ? "Agrandir" : "Réduire"}
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

              {/* Options compactes */}
              {!isCompact && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoNavigation}
                      onChange={(e) => setAutoNavigation(e.target.checked)}
                      className="mr-1 scale-75"
                    />
                    Navigation auto
                  </label>
                  <div className="flex items-center text-blue-200">
                    <Navigation className="w-3 h-3 mr-1" />
                    {autoNavigation ? 'ON' : 'OFF'}
                  </div>
                </div>
              )}
            </div>

            {/* Messages optimisés */}
            <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${isCompact ? 'h-48' : 'h-64'}`}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.type === 'user' ? '' : 'flex items-start space-x-1'}`}>
                    {message.type === 'ai' && (
                      <div className="flex-shrink-0 mt-0.5">
                        {getMessageIcon(message.category)}
                      </div>
                    )}
                    <div
                      className={`px-2 py-1.5 rounded-lg text-xs whitespace-pre-wrap leading-relaxed ${
                        message.type === 'user'
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : message.category === 'confirmation'
                          ? 'bg-orange-50 text-orange-900 border border-orange-200'
                          : message.category === 'error'
                          ? 'bg-red-50 text-red-900 border border-red-200'
                          : message.category === 'success'
                          ? 'bg-green-50 text-green-900 border border-green-200'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Confirmations compactes */}
              {pendingConfirmations.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                  <p className="text-xs font-medium text-orange-900 mb-1">Actions en attente:</p>
                  {pendingConfirmations.map(conf => (
                    <div key={conf.id} className="flex items-center justify-between text-xs mb-1">
                      <span className="text-orange-700">#{conf.id.slice(-4)}</span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleQuickConfirm(conf.id, true)}
                          className="bg-green-500 text-white px-2 py-0.5 rounded text-xs hover:bg-green-600"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleQuickConfirm(conf.id, false)}
                          className="bg-red-500 text-white px-2 py-0.5 rounded text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-700 px-2 py-1.5 rounded-lg text-xs flex items-center">
                    <div className="animate-spin w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full mr-2"></div>
                    <span>Traitement...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Commandes rapides compactes */}
            {!isCompact && (
              <div className="border-t border-gray-200 p-2">
                <p className="text-xs text-gray-600 mb-1">Rapide:</p>
                <div className="grid grid-cols-2 gap-1">
                  {quickCommands.map((cmd, index) => (
                    <button
                      key={index}
                      onClick={cmd.action}
                      disabled={isProcessing}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded disabled:opacity-50 flex items-center"
                    >
                      <ChevronRight className="w-3 h-3 mr-1" />
                      {cmd.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contrôles optimisés */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : isProcessing
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <div className="flex-1 text-xs">
                  {isProcessing ? (
                    <span className="text-gray-600">Traitement...</span>
                  ) : isListening ? (
                    <span className="text-red-600 font-medium">🎤 À l'écoute</span>
                  ) : (
                    <span className="text-gray-600">Parlez ou tapez</span>
                  )}
                </div>
                {autoNavigation && (
                  <div className="flex items-center text-xs text-blue-600">
                    <Navigation className="w-3 h-3" />
                  </div>
                )}
              </div>
              
              <form onSubmit={handleTextSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isProcessing}
                  placeholder="Tapez votre question..."
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !inputText.trim()}
                  className="p-1.5 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:bg-gray-400"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {!isCompact && (
                <div className="mt-1 text-xs text-gray-500">
                  💡 "qui est absent", "créer employé [nom]", "aller à [page]"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant; 