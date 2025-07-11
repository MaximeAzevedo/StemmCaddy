// Configuration Azure Speech Services pour l'assistant IA Caddy
const AZURE_SPEECH_KEY = process.env.REACT_APP_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.REACT_APP_AZURE_SPEECH_REGION;
const AZURE_SPEECH_VOICE_NAME = process.env.REACT_APP_AZURE_SPEECH_VOICE_NAME || 'fr-FR-DeniseNeural';

// SDK Azure Speech Services (à installer avec npm si besoin)
let SpeechSDK = null;
try {
  // Tentative d'import du SDK Microsoft
  SpeechSDK = require('microsoft-cognitiveservices-speech-sdk');
} catch (error) {
  console.warn('SDK Azure Speech non installé. Utilisation des APIs Web natives.');
}

export const azureSpeechAPI = {
  // ============ RECONNAISSANCE VOCALE ============
  
  /**
   * Créer un recognizer Azure Speech (si SDK disponible)
   */
  createSpeechRecognizer() {
    if (!SpeechSDK || !AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      console.log('🗣️ Utilisation des APIs Web natives pour la reconnaissance vocale');
      return this.createWebSpeechRecognizer();
    }

    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
      speechConfig.speechRecognitionLanguage = 'fr-FR';
      speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
      
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      
      console.log('✅ Azure Speech Recognition configurée');
      return recognizer;
      
    } catch (error) {
      console.error('Erreur Azure Speech:', error);
      return this.createWebSpeechRecognizer();
    }
  },

  /**
   * Fallback vers Web Speech API
   */
  createWebSpeechRecognizer() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognizer = new SpeechRecognition();
      
      recognizer.continuous = false;
      recognizer.interimResults = false;
      recognizer.lang = 'fr-FR';
      
      console.log('✅ Web Speech Recognition configurée');
      return recognizer;
    }
    
    console.warn('Aucune reconnaissance vocale disponible');
    return null;
  },

  // ============ SYNTHÈSE VOCALE ============

  /**
   * Lire un texte avec Azure Speech (si disponible) ou Web Speech API
   */
  async speak(text, options = {}) {
    const cleanText = this.cleanTextForSpeech(text);
    
    // Essayer Azure Speech d'abord
    if (SpeechSDK && AZURE_SPEECH_KEY && AZURE_SPEECH_REGION) {
      try {
        return await this.speakWithAzure(cleanText, options);
      } catch (error) {
        console.error('Erreur Azure TTS:', error);
        console.log('Fallback vers Web Speech API');
      }
    }

    // Fallback vers Web Speech API
    return this.speakWithWebAPI(cleanText, options);
  },

  /**
   * Synthèse vocale avec Azure
   */
  async speakWithAzure(text, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        speechConfig.speechSynthesisVoiceName = options.voice || AZURE_SPEECH_VOICE_NAME;
        speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

        // SSML pour contrôler la vitesse et le ton
        const ssml = `
          <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-FR">
            <voice name="${options.voice || AZURE_SPEECH_VOICE_NAME}">
              <prosody rate="${options.rate || '0.9'}" pitch="${options.pitch || 'medium'}">
                ${text}
              </prosody>
            </voice>
          </speak>
        `;

        synthesizer.speakSsmlAsync(
          ssml,
          result => {
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              console.log('✅ Azure TTS réussie');
              resolve(result);
            } else {
              reject(new Error(`Erreur Azure TTS: ${result.errorDetails}`));
            }
            synthesizer.close();
          },
          error => {
            console.error('❌ Erreur Azure TTS:', error);
            synthesizer.close();
            reject(error);
          }
        );

      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Synthèse vocale avec Web Speech API
   */
  speakWithWebAPI(text, options = {}) {
    return new Promise((resolve, reject) => {
      if ('speechSynthesis' in window) {
        try {
          // Arrêter toute synthèse en cours
          speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'fr-FR';
          utterance.rate = options.rate || 0.9;
          utterance.pitch = options.pitch || 1.1;
          utterance.volume = options.volume || 1.0;
          
          utterance.onend = () => {
            console.log('✅ Web Speech TTS réussie');
            resolve();
          };
          
          utterance.onerror = (error) => {
            console.error('❌ Erreur Web Speech TTS:', error);
            reject(error);
          };
          
          speechSynthesis.speak(utterance);
          
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Synthèse vocale non supportée par ce navigateur'));
      }
    });
  },

  /**
   * Nettoyer le texte pour la synthèse vocale
   */
  cleanTextForSpeech(text) {
    return text
      .replace(/\*\*/g, '') // Supprimer le markdown gras
      .replace(/[📍✅❌⚠️🎯👤🤖💡⚡🗣️📊👨‍🍳🔍🚀🎉🔧]/g, '') // Supprimer les emojis
      .replace(/\n+/g, ' ') // Remplacer les retours à la ligne par des espaces
      .replace(/\s+/g, ' ') // Normaliser les espaces multiples
      .trim();
  },

  // ============ TESTS ET DIAGNOSTICS ============

  /**
   * Tester la configuration Azure Speech
   */
  async testConfiguration() {
    const results = {
      sdk: !!SpeechSDK,
      key: !!AZURE_SPEECH_KEY,
      region: !!AZURE_SPEECH_REGION,
      voice: AZURE_SPEECH_VOICE_NAME,
      webSpeechSupport: 'speechSynthesis' in window && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    };

    console.log('🔍 Configuration Azure Speech:', results);

    if (results.sdk && results.key && results.region) {
      try {
        await this.speak('Test de configuration Azure Speech réussi', { rate: 1.0 });
        results.testSuccess = true;
        results.method = 'Azure Speech Services';
      } catch (error) {
        console.error('Test Azure Speech échoué:', error);
        results.testSuccess = false;
        results.error = error.message;
      }
    } else if (results.webSpeechSupport) {
      try {
        await this.speak('Test de configuration Web Speech réussi', { rate: 1.0 });
        results.testSuccess = true;
        results.method = 'Web Speech API';
      } catch (error) {
        results.testSuccess = false;
        results.error = error.message;
      }
    } else {
      results.testSuccess = false;
      results.error = 'Aucune API vocale disponible';
    }

    return results;
  },

  /**
   * Obtenir les voix disponibles
   */
  getAvailableVoices() {
    if ('speechSynthesis' in window) {
      const voices = speechSynthesis.getVoices();
      const frenchVoices = voices.filter(voice => voice.lang.startsWith('fr'));
      
      console.log('🗣️ Voix françaises disponibles:', frenchVoices.map(v => ({
        name: v.name,
        lang: v.lang,
        gender: v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('denise') || v.name.toLowerCase().includes('marie') ? 'female' : 'male'
      })));
      
      return frenchVoices;
    }
    return [];
  }
};

// Initialisation
if (typeof window !== 'undefined') {
  // Charger les voix disponibles au démarrage
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
      azureSpeechAPI.getAvailableVoices();
    };
  }
}

export default azureSpeechAPI; 