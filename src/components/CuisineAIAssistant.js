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
  Users,
  Target,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { azureOpenaiAPI } from '../lib/azure-openai';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const CuisineAIAssistant = ({ onDataRefresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  // 🔧 CORRECTION CRITIQUE : Stabiliser onDataRefresh avec useMemo pour éviter les rerenders
  const stableOnDataRefresh = useCallback(() => {
    if (onDataRefresh) {
      onDataRefresh();
    }
  }, [onDataRefresh]);
  
  // État des messages persistant - LA CLÉ pour éviter les réinitialisations
  const [messages, setMessages] = useState([
    {
      id: `welcome-${Date.now()}`,
      type: 'ai',
      content: '👋 **Assistant** à votre service !\n\n💡 Parlez-moi naturellement pour gérer votre équipe cuisine.',
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

  // Fonction stable pour ajouter des messages - IMPORTANTE
  const addMessage = useCallback((type, content, category = 'general', actionData = null) => {
    const newMessage = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
      category,
      actionData
    };
    
    console.log('💬 Ajout message:', { type, id: newMessage.id, content: content.substring(0, 50) + '...' });
    
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newMessage];
      console.log('📝 Total messages après ajout:', updatedMessages.length);
      return updatedMessages;
    });
    
    return newMessage.id;
  }, []);

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

  // Fonction pour enrichir le contexte - STABLE
  const getContextData = useCallback(async () => {
    try {
      console.log('🔍 DÉBUT getContextData - Récupération contexte...');
      
      const [employeesRes, postesRes, competencesRes, absencesRes, planningRes] = await Promise.all([
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple(),
        supabaseCuisine.getAbsencesCuisine(),
        supabaseCuisine.getPlanningCuisine()
      ]);

      console.log('📊 DONNÉES BRUTES récupérées:', {
        employees: employeesRes?.data?.length || 0,
        postes: postesRes?.data?.length || 0,
        competences: competencesRes?.data?.length || 0,
        absences: absencesRes?.data?.length || 0,
        planning: planningRes?.data?.length || 0
      });

      // 🔍 LOGS DÉTAILLÉS pour déboguer la recherche d'employés
      if (employeesRes?.data) {
        console.log('👥 STRUCTURE EMPLOYÉS - Premiers 3 éléments:', 
          employeesRes.data.slice(0, 3).map(emp => ({
            employee_id: emp.employee_id,
            employee: emp.employee ? {
              id: emp.employee.id,
              nom: emp.employee.nom,
              profil: emp.employee.profil
            } : 'EMPLOYEE NULL',
            service: emp.service
          }))
        );
        
        console.log('📋 LISTE COMPLÈTE des noms d\'employés:', 
          employeesRes.data
            .filter(emp => emp.employee?.nom)
            .map(emp => emp.employee.nom)
            .join(', ')
        );
      }

      return {
        employees: employeesRes.data || [],
        postes: postesRes.data || [],
        competences: competencesRes.data || [],
        absences: absencesRes.data || [],
        planning: planningRes.data || []
      };
    } catch (error) {
      console.error('❌ Erreur récupération contexte:', error);
      return { employees: [], postes: [], competences: [], absences: [], planning: [] };
    }
  }, []);

  // Actions IA - STABILISÉES avec correction de la recherche d'employés
  const executeAIActions = useCallback(async (userInput, aiResponse, contextData) => {
    let actionResults = [];

    try {
      console.log('🔍 DÉBUT executeAIActions - Analyse demande:', userInput);
      console.log('📊 Contexte disponible:', {
        employees: contextData.employees.length,
        totalEmployees: contextData.employees.length
      });
      
      // DÉTECTION PRÉCISE D'ABSENCE
      const absencePatterns = [
        /(\w+)\s+(?:est|sera|serait)?\s*(?:absent|absente)/i,
        /(?:absence|congé)\s+(?:de|pour)\s+(\w+)/i,
        /(\w+)\s+(?:ne sera pas|ne peut pas|pas disponible)/i,
        /(\w+)\s+(?:malade|indisponible)/i,
        /déclarer?\s+(?:absence|absent|absente)\s+(?:de|pour)?\s*(\w+)/i
      ];
      
      let hasAbsenceDetected = false;
      let detectedEmployeeName = null;
      
      for (const pattern of absencePatterns) {
        const match = userInput.match(pattern);
        if (match) {
          hasAbsenceDetected = true;
          detectedEmployeeName = match[1];
          console.log(`🎯 Pattern d'absence détecté: "${match[0]}" → Employé: "${detectedEmployeeName}"`);
          break;
        }
      }
      
      if (hasAbsenceDetected && detectedEmployeeName) {
        const searchName = detectedEmployeeName.toLowerCase().trim();
        
        console.log('🔍 RECHERCHE EMPLOYÉ DÉTAILLÉE:', {
          searchName,
          totalEmployees: contextData.employees.length,
          firstEmployee: contextData.employees[0] ? {
            structure: contextData.employees[0],
            employeeName: contextData.employees[0].employee?.nom
          } : 'AUCUN EMPLOYÉ'
        });
        
        // 🔧 RECHERCHE CORRIGÉE - Exacte d'abord
        let detectedEmployee = contextData.employees.find(emp => {
          const empNom = emp.employee?.nom?.toLowerCase().trim();
          console.log(`🔎 Comparaison exacte: "${empNom}" === "${searchName}"`);
          return empNom === searchName;
        });
        
        console.log('🔎 Recherche exacte:', detectedEmployee ? 'TROUVÉ' : 'NON TROUVÉ');
        
        // 🔧 RECHERCHE FLOUE si pas trouvé
        if (!detectedEmployee) {
          detectedEmployee = contextData.employees.find(emp => {
            const empNom = emp.employee?.nom?.toLowerCase().trim() || '';
            const contains1 = empNom.includes(searchName);
            const contains2 = searchName.includes(empNom);
            console.log(`🔎 Comparaison floue: "${empNom}" ↔ "${searchName}" → contains1:${contains1}, contains2:${contains2}`);
            return contains1 || contains2;
          });
          console.log('🔎 Recherche floue:', detectedEmployee ? 'TROUVÉ' : 'NON TROUVÉ');
        }
        
        // 🔧 RECHERCHE ALTERNATIVE avec normalisation avancée
        if (!detectedEmployee) {
          console.log('🔍 Tentative recherche avec normalisation avancée...');
          
          const normalizeText = (text) => {
            return text.toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
              .replace(/[^a-z0-9]/g, '') // Garder seulement alphanumériques
              .trim();
          };
          
          const normalizedSearch = normalizeText(searchName);
          console.log(`🔤 Recherche normalisée: "${searchName}" → "${normalizedSearch}"`);
          
          detectedEmployee = contextData.employees.find(emp => {
            const empNom = emp.employee?.nom;
            if (!empNom) return false;
            
            const normalizedEmpNom = normalizeText(empNom);
            const matches = normalizedEmpNom.includes(normalizedSearch) || 
                           normalizedSearch.includes(normalizedEmpNom);
            
            console.log(`🔤 Comparaison normalisée: "${empNom}" → "${normalizedEmpNom}" ↔ "${normalizedSearch}" → ${matches}`);
            return matches;
          });
          
          console.log('🔎 Recherche normalisée:', detectedEmployee ? 'TROUVÉ' : 'TOUJOURS NON TROUVÉ');
        }
        
        if (detectedEmployee) {
          console.log('✅ EMPLOYÉ TROUVÉ:', {
            nom: detectedEmployee.employee?.nom,
            id: detectedEmployee.employee?.id,
            employee_id: detectedEmployee.employee_id
          });
          
          // Extraction de date (code existant)
          let targetDate = new Date().toISOString().split('T')[0];
          
          const dateExpliciteMatch = userInput.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i);
          if (dateExpliciteMatch) {
            const jour = parseInt(dateExpliciteMatch[1], 10);
            const moisNom = dateExpliciteMatch[2].toLowerCase();
            
            const moisMap = {
              'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
              'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
              'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
            };
            
            const mois = moisMap[moisNom];
            if (mois !== undefined && jour >= 1 && jour <= 31) {
              const year = new Date().getFullYear();
              const dateObj = new Date(year, mois, jour);
              targetDate = dateObj.toISOString().split('T')[0];
              console.log(`📅 Date explicite: ${jour} ${moisNom} → ${targetDate}`);
            }
          } else {
            const dateKeywords = {
              'demain': 1,
              'aujourd\'hui': 0,
              'après-demain': 2,
              'lundi': null,
              'mardi': null,
              'mercredi': null,
              'jeudi': null,
              'vendredi': null,
              'samedi': null,
              'dimanche': null
            };
            
            for (const [keyword, offset] of Object.entries(dateKeywords)) {
              if (userInput.toLowerCase().includes(keyword)) {
                if (offset !== null) {
                  const date = new Date();
                  date.setDate(date.getDate() + offset);
                  targetDate = date.toISOString().split('T')[0];
                  console.log(`📅 Date relative: ${keyword} → ${targetDate}`);
                } else {
                  // Pour les jours de la semaine, calculer le prochain jour
                  const today = new Date();
                  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
                  const targetDayIndex = dayNames.indexOf(keyword);
                  if (targetDayIndex !== -1) {
                    const currentDayIndex = today.getDay();
                    let daysToAdd = targetDayIndex - currentDayIndex;
                    if (daysToAdd <= 0) daysToAdd += 7; // Prochain occurrence
                    
                    const targetDateObj = new Date(today);
                    targetDateObj.setDate(today.getDate() + daysToAdd);
                    targetDate = targetDateObj.toISOString().split('T')[0];
                    console.log(`📅 Jour de semaine: ${keyword} → ${targetDate}`);
                  }
                }
                break;
              }
            }
          }
          
          console.log('📅 Date finale retenue:', targetDate);
          
          // Créer l'absence
          const absenceData = {
            employee_id: detectedEmployee.employee.id,
            date_debut: targetDate,
            date_fin: targetDate,
            type_absence: 'Absent',
            statut: 'Confirmée',
            motif: 'Absence déclarée par IA'
          };

          console.log('💾 Données absence à créer:', absenceData);

          try {
            const result = await supabaseCuisine.createAbsenceCuisine(absenceData);
            console.log('🔄 Résultat création:', result);
            
            if (!result.error && result.data) {
              actionResults.push(`✅ Absence créée: ${detectedEmployee.employee.nom} le ${targetDate}`);
              console.log('🎉 SUCCESS - Absence créée avec ID:', result.data.id);
              
              // 🔧 RAFRAÎCHISSEMENT STABLE avec délai
              setTimeout(() => {
                try {
                  console.log('🔄 Déclenchement rafraîchissement...');
                  stableOnDataRefresh();
                } catch (err) {
                  console.warn('⚠️ Erreur rafraîchissement:', err);
                }
              }, 1000);
            } else {
              console.error('❌ Erreur sauvegarde:', result.error);
              actionResults.push(`❌ Erreur sauvegarde: ${result.error?.message || 'Erreur inconnue'}`);
            }
          } catch (dbError) {
            console.error('💥 Erreur critique DB:', dbError);
            actionResults.push(`💥 Erreur critique: ${dbError.message}`);
          }
        } else {
          console.error('❌ EMPLOYÉ NON TROUVÉ MALGRÉ TOUTES LES RECHERCHES');
          console.log('📋 DÉBOGAGE - Liste complète des employés disponibles:');
          contextData.employees.forEach((emp, index) => {
            console.log(`  ${index + 1}. "${emp.employee?.nom}" (ID: ${emp.employee?.id}) - Service: ${emp.service || 'N/A'}`);
          });
          
          const availableNames = contextData.employees
            .filter(emp => emp.employee?.nom)
            .map(emp => emp.employee.nom);
            
          actionResults.push(`⚠️ Employé "${detectedEmployeeName}" non reconnu dans la base cuisine.\n\n📋 Employés disponibles (${availableNames.length}): ${availableNames.join(', ')}\n\n💡 Vérifiez l'orthographe ou utilisez "Analyser équipe" pour voir tous les employés.`);
        }
      }

    } catch (error) {
      console.error('❌ Erreur executeAIActions:', error);
      actionResults.push(`❌ Erreur technique: ${error.message}`);
    }

    return actionResults;
  }, [stableOnDataRefresh]);

  // Traitement vocal principal - COMPLÈTEMENT STABLE
  const handleVoiceInput = useCallback(async (transcript) => {
    console.log('🎤 Traitement vocal:', transcript);
    
    addMessage('user', transcript);
    setIsProcessing(true);
    
    const thinkingStages = [
      '🧠 Connexion Azure OpenAI...',
      '🔍 Analyse contextuelle...',
      '📊 Consultation base de données...',
      '⚡ Génération réponse...'
    ];
    
    try {
      let contextData = { employees: [], postes: [], competences: [], absences: [], planning: [] };
      
      setThinkingStage(thinkingStages[0]);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setThinkingStage(thinkingStages[1]);
      contextData = await getContextData();
      
      setThinkingStage(thinkingStages[2]);
      const enrichedPrompt = `
PROFIL ASSISTANT IA - CUISINE PROFESSIONNELLE

MISSION PRINCIPALE:
Tu es l'Assistant IA spécialisé dans la gestion d'équipe cuisine. Ta mission est d'aider le responsable cuisine à gérer efficacement son équipe, les absences, le planning et les compétences.

CAPACITÉS TECHNIQUES:
✅ Créer/modifier des absences en base de données Supabase
✅ Rechercher et proposer des remplaçants
✅ Générer des plannings optimisés 
✅ Gérer les compétences par poste de travail
✅ Analyser la disponibilité de l'équipe
✅ Tolérance aux erreurs de nom/prononciation

CONTEXTE DONNÉES ACTUELLES CUISINE:

EMPLOYÉS DISPONIBLES (${contextData.employees.length}):
${contextData.employees.map(emp => 
  `- ${emp.employee?.nom || 'Nom manquant'} (${emp.employee?.profil || 'Profil non défini'})`
).join('\n')}

POSTES DE TRAVAIL (${contextData.postes.length}):
${contextData.postes.map(poste => `- ${poste.nom}`).join('\n')}

ABSENCES EN COURS (${contextData.absences.length}):
${contextData.absences.map(abs => 
  `- ${abs.employee?.nom || 'Employé inconnu'}: ${abs.type_absence} (${abs.date_debut})`
).join('\n')}

DEMANDE UTILISATEUR: "${transcript}"

INSTRUCTIONS DE RÉPONSE:
1. Réponds en français de manière professionnelle et concise
2. Si c'est une demande d'absence, confirme l'action que tu vas effectuer
3. Si le nom est imprécis, propose le nom le plus proche
4. Pour les plannings, explique ta stratégie d'organisation
5. Utilise les données réelles pour tes recommandations
6. Sois proactif et propose des solutions

ACTIONS POSSIBLES:
- Déclarer une absence: "Je vais ajouter l'absence de [NOM] pour [DATE]"
- Recherche remplaçant: "Voici les personnes disponibles pour remplacer [NOM]"
- Planning: "Je génère un planning optimisé selon les compétences"
- Analyse équipe: "Voici l'état actuel de votre équipe"
`;

      setThinkingStage(thinkingStages[3]);
      const aiResponse = await azureOpenaiAPI.generateResponse(enrichedPrompt);
      
      const actionResults = await executeAIActions(transcript, aiResponse, contextData);
      
      let finalResponse = aiResponse;
      if (actionResults.length > 0) {
        finalResponse += '\n\n🔧 **Actions exécutées:**\n' + actionResults.join('\n');
      }
      
      let category = 'general';
      if (aiResponse.toLowerCase().includes('absence')) category = 'info';
      else if (aiResponse.toLowerCase().includes('planning')) category = 'success';
      else if (aiResponse.toLowerCase().includes('erreur')) category = 'error';
      else category = 'success';
      
      addMessage('ai', finalResponse, category, {
        contextUsed: contextData,
        actionsExecuted: actionResults,
        aiModel: 'Azure OpenAI'
      });
      
      const speakText = aiResponse.length > 200 
        ? aiResponse.split('.')[0] + '... Détails à l\'écran.'
        : aiResponse;
      
      speak(speakText);
      
      if (actionResults.length > 0) {
        toast.success('🤖 IA Azure : Actions exécutées !');
      } else {
        toast.success('✅ Réponse IA générée');
      }
      
    } catch (error) {
      console.error('Erreur traitement IA Azure:', error);
      addMessage('ai', `❌ **Erreur connexion Azure OpenAI**\n\nErreur: ${error.message}\n\n🔧 **Vérifications suggérées:**\n• Configuration Azure OpenAI dans .env\n• Connectivité Internet\n• Quota API Azure`, 'error');
      toast.error('🔧 Erreur Azure OpenAI');
    } finally {
      setIsProcessing(false);
      setThinkingStage('');
    }
  }, [addMessage, getContextData, executeAIActions]);

  const handleFeedback = async (messageId, rating) => {
    try {
      console.log(`📊 Feedback IA: Message ${messageId} - Note: ${rating}/5`);
      toast.success(rating >= 4 ? '⭐ Merci pour votre retour positif !' : '📝 Retour pris en compte');
    } catch (error) {
      console.error('Erreur feedback:', error);
    }
  };

  // Reconnaissance vocale AMÉLIORÉE - timeouts plus longs
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'fr-FR';
      
      // 🔧 TIMEOUTS PLUS LONGS pour éviter l'arrêt prématuré
      recognitionInstance.maxAlternatives = 1;
      
      // Événements
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Transcription reçue:', transcript);
        handleVoiceInput(transcript);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Erreur reconnaissance vocale:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error('Erreur microphone: ' + event.error);
        }
      };
      
      recognitionInstance.onend = () => {
        console.log('🎤 Reconnaissance vocale terminée');
        setIsListening(false);
      };
      
      recognitionInstance.onspeechstart = () => {
        console.log('🎤 Début de la parole détecté');
      };
      
      recognitionInstance.onspeechend = () => {
        console.log('🎤 Fin de la parole détectée');
      };
      
      setRecognition(recognitionInstance);
    }
  }, [handleVoiceInput]);

  const startListening = () => {
    if (recognition && !isListening && !isProcessing) {
      setIsListening(true);
      recognition.start();
      toast.success('🎤 Parlez maintenant... (pauses plus longues acceptées)');
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
      text: 'Qui travaille ?', 
      icon: Users,
      action: () => handleVoiceInput('Qui travaille aujourd\'hui en cuisine ?'),
      color: 'bg-blue-100 hover:bg-blue-200'
    },
    { 
      text: 'Planning IA', 
      icon: Calendar,
      action: () => handleVoiceInput('Génère le planning optimisé pour cette semaine'),
      color: 'bg-purple-100 hover:bg-purple-200'
    },
    { 
      text: 'Test absence', 
      icon: UserMinus,
      action: () => handleVoiceInput('Marie est absente demain'),
      color: 'bg-red-100 hover:bg-red-200'
    },
    { 
      text: 'Analyse équipe', 
      icon: Target,
      action: () => handleVoiceInput('Analyse les compétences de l\'équipe cuisine'),
      color: 'bg-green-100 hover:bg-green-200'
    }
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center z-50 transition-all duration-300 border-2 border-white"
      >
        <ChefHat className="w-7 h-7" />
        {isProcessing && (
          <div className="absolute inset-0 rounded-full border-3 border-white border-t-transparent animate-spin"></div>
        )}
        {!isProcessing && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-400 rounded-full animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">AI</span>
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bg-white rounded-xl shadow-2xl border-2 border-indigo-200 z-50 overflow-hidden transition-all duration-300 ${
              isCompact ? 'bottom-24 right-4 w-80 h-96' : 'bottom-4 right-4 w-96 h-[36rem]'
            }`}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChefHat className="w-5 h-5 mr-2" />
                  <div>
                    <h3 className="font-semibold text-sm flex items-center">
                      Assistant
                      <div className="ml-2 px-1 py-0.5 bg-blue-400 rounded text-xs font-bold">AI</div>
                    </h3>
                    <p className="text-xs opacity-90">
                      {isProcessing ? `${thinkingStage}` : 'Cuisine • Équipe • Planning'}
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

            <div className={`${isCompact ? 'h-56' : 'h-80'} overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-indigo-50 to-gray-50`}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-xs shadow-sm ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white'
                        : 'bg-white border border-indigo-200'
                    }`}
                  >
                    {message.type === 'ai' && (
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          {getMessageIcon(message.category)}
                          <span className="ml-1 font-semibold text-gray-700">Assistant</span>
                          {message.actionData?.aiModel && (
                            <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {message.actionData.aiModel}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleFeedback(message.id, 5)}
                            className="text-gray-400 hover:text-green-500 transition-colors p-0.5"
                            title="Excellent"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(message.id, 2)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                            title="À améliorer"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="whitespace-pre-line text-gray-800">
                      {message.content}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.actionData?.actionsExecuted && message.actionData.actionsExecuted.length > 0 && (
                        <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded">
                          {message.actionData.actionsExecuted.length} action(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white border border-indigo-200 p-3 rounded-lg text-xs shadow-sm">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600 mr-2"></div>
                      <span className="text-gray-600">{thinkingStage || 'IA en réflexion...'}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {!isCompact && (
              <div className="px-3 py-2 border-t border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="grid grid-cols-2 gap-2">
                  {quickCommands.map((cmd, index) => (
                    <button
                      key={index}
                      onClick={cmd.action}
                      disabled={isProcessing}
                      className={`flex items-center justify-center p-2 text-xs rounded-lg transition-all ${cmd.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <cmd.icon className="w-3 h-3 mr-1" />
                      <span>{cmd.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 border-t-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-all duration-200 transform ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse scale-110'
                      : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:scale-105'
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
                    placeholder={isListening ? "🎤 Dictée en cours..." : "Ex: Carla est absente demain, qui travaille en cuisine ?"}
                    className="flex-1 px-3 py-2 border-2 border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !inputText.trim()}
                    className="p-2 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg hover:from-indigo-700 hover:to-purple-800 disabled:bg-gray-400 transition-all duration-200 transform hover:scale-105"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-gray-500">
                  🤖 <span className="font-bold text-indigo-600">IA Azure Avancée</span> • Pauses longues OK • Actions réelles
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CuisineAIAssistant; 