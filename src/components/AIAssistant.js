import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Send, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiService } from '../lib/aiService';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Bonjour ! Je suis votre assistant IA Caddy. Je peux vous aider à gérer les plannings, les absences, et optimiser les équipes. Dites-moi ce dont vous avez besoin !',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVoiceInput = React.useCallback(async (transcript) => {
    // Ajouter le message utilisateur
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: transcript,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Traiter la commande avec le service IA avancé
      const aiResponse = await aiService.processVoiceCommand(transcript);
      
      // Ajouter la réponse IA
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Parler la réponse
      speak(aiResponse);
    } catch (error) {
      console.error('Erreur traitement IA:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Désolé, j\'ai rencontré un problème. Pouvez-vous répéter votre demande ?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

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

  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full shadow-lg hover:shadow-glow-blue flex items-center justify-center z-50"
      >
        <Bot className="w-8 h-8" />
      </motion.button>

      {/* Interface Assistant */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 right-6 w-96 h-96 bg-white rounded-2xl shadow-premium border border-gray-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center">
                <Bot className="w-6 h-6 mr-2" />
                <h3 className="font-semibold">Assistant IA Caddy</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 h-64">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.type === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 max-w-xs px-3 py-2 rounded-lg text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                      <span>L'IA réfléchit...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contrôles */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white pulse-glow'
                      : isProcessing
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <span className="text-sm text-gray-600">
                  {isProcessing ? 'Traitement...' : isListening ? 'À l\'écoute...' : 'Cliquez pour parler'}
                </span>
              </div>
              
              <form onSubmit={handleTextSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isProcessing}
                  placeholder="Ou tapez votre message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !inputText.trim()}
                  className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant; 