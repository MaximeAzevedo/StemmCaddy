// ========================================
// INTERFACE CHATBOT RH AUTONOME
// ========================================
// Interface React simple pour tester le service HR autonome

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  MessageSquare,
  X,
  Mic,
  MicOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { hrChatbot } from '../lib/hr-chatbot-service';
import { azureSpeechAPI } from '../lib/azure-speech';

const HRChatbotAutonome = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognizer, setSpeechRecognizer] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '👋 **Salut ! Moi c\'est Rémy !** 👨‍🍳\n\nJe suis ton collègue assistant RH cuisine !\n\n🎯 **Ce que je peux faire :**\n• 🏠 Gérer les absences (maladie, congé...)\n• 📋 Organiser le planning\n• 🔍 Trouver des remplaçants\n• 📊 Te dire qui bosse aujourd\'hui\n\n💬 **Parle-moi naturellement !**\nEx: "Marie malade demain" ou "Qui travaille ?"',
      timestamp: new Date(),
      functionCalled: null,
      functionResult: null
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Initialisation de la reconnaissance vocale
  useEffect(() => {
    const initSpeechRecognition = async () => {
      try {
        const recognizer = azureSpeechAPI.createSpeechRecognizer();
        if (recognizer) {
          setSpeechRecognizer(recognizer);
          console.log('✅ Reconnaissance vocale initialisée');
        }
      } catch (error) {
        console.warn('⚠️ Reconnaissance vocale non disponible:', error);
      }
    };

    initSpeechRecognition();
  }, []);

  // Fonction pour démarrer/arrêter l'écoute
  const toggleListening = () => {
    if (!speechRecognizer) {
      toast.error('🎤 Reconnaissance vocale non disponible');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Démarrer l'écoute
  const startListening = () => {
    if (!speechRecognizer) return;

    setIsListening(true);
    toast('🎤 Dictez votre demande...', { icon: '👂' });

    if (speechRecognizer.recognizeOnceAsync) {
      // Azure Speech SDK
      speechRecognizer.recognizeOnceAsync(
        result => {
          console.log('🎤 Résultat Azure Speech:', result.text);
          if (result.text) {
            setInputText(result.text);
            toast.success('✅ Dicté avec succès !');
          }
          setIsListening(false);
        },
        error => {
          console.error('❌ Erreur reconnaissance:', error);
          toast.error('❌ Erreur de reconnaissance vocale');
          setIsListening(false);
        }
      );
    } else {
      // Web Speech API
      speechRecognizer.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Résultat Web Speech:', transcript);
        setInputText(transcript);
        toast.success('✅ Dicté avec succès !');
        setIsListening(false);
      };

      speechRecognizer.onerror = (error) => {
        console.error('❌ Erreur reconnaissance:', error);
        toast.error('❌ Erreur de reconnaissance vocale');
        setIsListening(false);
      };

      speechRecognizer.onend = () => {
        setIsListening(false);
      };

      speechRecognizer.start();
    }
  };

  // Arrêter l'écoute
  const stopListening = () => {
    if (!speechRecognizer) return;

    setIsListening(false);
    
    if (speechRecognizer.stopContinuousRecognitionAsync) {
      // Azure Speech SDK
      speechRecognizer.stopContinuousRecognitionAsync();
    } else {
      // Web Speech API
      speechRecognizer.stop();
    }
    
    toast('🔇 Écoute arrêtée', { icon: '✋' });
  };

  // Traitement des messages
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    // Ajouter le message utilisateur
    const userMsg = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Appel au service HR autonome avec historique
      console.log('🚀 Envoi au HR Chatbot:', userMessage);
      console.log('📜 Historique envoyé:', messages.length, 'messages');
      const result = await hrChatbot.processUserMessage(userMessage, messages);
      
      // Ajouter la réponse du bot
      const botMsg = {
        id: Date.now() + 1,
        type: 'bot',
        content: result.message,
        timestamp: new Date(),
        functionCalled: result.functionCalled,
        functionResult: result.functionResult,
        success: result.success
      };
      
      setMessages(prev => [...prev, botMsg]);
      
             // Toast notification
       if (result.success && result.functionCalled) {
         toast.success(`✅ Rémy a exécuté: ${result.functionCalled}`);
       } else if (!result.success) {
         toast.error('❌ Rémy n\'a pas pu traiter votre demande');
       }
      
    } catch (error) {
      console.error('❌ Erreur handleSubmit:', error);
      
             const errorMsg = {
         id: Date.now() + 1,
         type: 'bot',
         content: `❌ **Désolé, j'ai un problème technique !**\n\n${error.message}\n\nPouvez-vous vérifier ma configuration OpenAI et Supabase ?`,
         timestamp: new Date(),
         success: false
       };
      
      setMessages(prev => [...prev, errorMsg]);
             toast.error('❌ Rémy a un problème technique');
    } finally {
      setIsProcessing(false);
    }
  };

  // Exemples de commandes rapides - Style Notion
  const quickCommands = [
    { 
      text: '📋 Absences', 
      command: 'Qui est absent aujourd\'hui ?'
    },
    { 
      text: '📅 Planning', 
      command: 'Montre-moi le planning d\'aujourd\'hui'
    }
  ];

  const executeQuickCommand = (command) => {
    setInputText(command);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = (message) => {
    if (message.type === 'user') return <User className="w-4 h-4" />;
    
    if (message.success === false) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (message.functionCalled) return <CheckCircle className="w-4 h-4 text-green-500" />;
    
    return <Bot className="w-4 h-4 text-blue-500" />;
  };

  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-50 transition-all duration-300"
      >
        <MessageSquare className="w-7 h-7" />
        {isProcessing && (
          <div className="absolute inset-0 rounded-full border-3 border-white border-t-transparent animate-spin"></div>
        )}
                 <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
           <span className="text-[10px] font-bold text-white">R</span>
         </div>
      </motion.button>

      {/* Interface Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-20 right-6 w-96 h-[550px] bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden transition-all duration-300"
          >
                        {/* Header */}
            <div className="bg-orange-500 text-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-3" />
                  <div>
                    <h3 className="font-semibold text-sm">
                      Rémy Assistant RH
                    </h3>
                    <p className="text-xs opacity-90">
                      {isProcessing ? 'Rémy réfléchit...' : 'Absences • Planning • Équipe'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
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
            <div className="h-[380px] overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                          message.type === 'user'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white border border-gray-200 shadow-sm'
                        }`}
                      >
                        {message.type === 'bot' && (
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              {getMessageIcon(message)}
                              <span className="ml-2 font-semibold text-gray-700">Rémy</span>
                              {message.functionCalled && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                  {message.functionCalled}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="whitespace-pre-line text-gray-800">
                          {message.content}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                          <span>{formatTimestamp(message.timestamp)}</span>
                          {message.functionResult && message.functionResult.success && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Action réussie
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white border border-gray-200 p-3 rounded-2xl text-sm shadow-sm">
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin text-orange-500 mr-2" />
                                                     <span className="text-gray-600">Rémy réfléchit...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Commandes rapides - Style Notion */}
                <div className="px-4 py-2 border-t border-gray-200">
                  <div className="flex gap-2">
                    {quickCommands.map((cmd, index) => (
                      <button
                        key={index}
                        onClick={() => executeQuickCommand(cmd.command)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cmd.text}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input - Style Notion */}
                <div className="p-3 border-t border-gray-200">
                  <form onSubmit={handleSubmit} className="flex space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isProcessing || isListening}
                      placeholder={isListening ? "🎤 Dictez votre demande..." : "Parlez à Rémy..."}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={isProcessing}
                      className={`p-2 rounded-xl transition-colors ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title={isListening ? "Arrêter l'écoute" : "Dicter"}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing || isListening || !inputText.trim()}
                      className="p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                  
                </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HRChatbotAutonome; 