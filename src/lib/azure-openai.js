// Configuration Azure OpenAI pour l'assistant IA Caddy
const AZURE_OPENAI_ENDPOINT = process.env.REACT_APP_AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.REACT_APP_AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT_NAME = process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME;
const AZURE_OPENAI_API_VERSION = process.env.REACT_APP_AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

// Fallback vers OpenAI standard si Azure n'est pas configuré
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT_NAME) {
  console.warn('Configuration Azure OpenAI incomplète. Tentative avec OpenAI standard...');
  if (!OPENAI_API_KEY) {
    console.warn('Aucune clé IA trouvée. L\'assistant utilisera les réponses simulées.');
  }
}

// Configuration de l'assistant IA avec le contexte Caddy
const SYSTEM_PROMPT = `Tu es l'assistant IA de Caddy, une application de gestion d'équipes pour le service de lutte contre le gaspillage alimentaire au Luxembourg.

CONTEXTE CADDY :
- Flotte de 5 véhicules : Crafter 21, Crafter 23, Jumper, Ducato, Transit
- 21 employés avec profils : Faible/Moyen/Fort
- Langues : Français, Arabe, Perse, Espagnol
- Compétences véhicules : X (accompagné) / XX (autonome)

RÈGLES D'INSERTION SOCIALE :
1. Jamais de profils faibles seuls
2. Associer profils faibles avec profils forts
3. Mélanger les langues pour favoriser l'apprentissage
4. Respecter les compétences véhicules

EMPLOYÉS ACTUELS :
- Profils Forts : Martial, Margot, Soroosh, José, Deazevedo
- Profils Moyens : Ahmad, Imad, Firas, Juan
- Profils Faibles : Shadi, Tamara, Basel, Tesfa, et autres

TU PEUX AIDER AVEC :
- Gestion des absences et réorganisation automatique
- Génération de plannings optimisés
- Suggestions d'équipes respectant les règles
- Validation de compétences et progression
- Statistiques et rapports

RÉPONDS TOUJOURS EN FRANÇAIS, de manière concise et professionnelle.`;

export const azureOpenaiAPI = {
  async generateResponse(userMessage) {
    // Essayer Azure OpenAI en priorité
    if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY && AZURE_OPENAI_DEPLOYMENT_NAME) {
      try {
        return await this.callAzureOpenAI(userMessage);
      } catch (error) {
        console.error('Erreur Azure OpenAI:', error);
        console.log('Tentative avec OpenAI standard...');
      }
    }

    // Fallback vers OpenAI standard
    if (OPENAI_API_KEY) {
      try {
        return await this.callOpenAIStandard(userMessage);
      } catch (error) {
        console.error('Erreur OpenAI standard:', error);
      }
    }

    // Dernier fallback vers réponses simulées
    return await this.getFallbackResponse(userMessage);
  },

  async callAzureOpenAI(userMessage) {
    // Nettoyer l'endpoint (supprimer les slashes en trop)
    const cleanEndpoint = AZURE_OPENAI_ENDPOINT.replace(/\/+$/, '');
    
    // Construire l'URL Azure OpenAI
    const url = `${cleanEndpoint}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
    
    console.log('🔍 Appel Azure OpenAI:', {
      endpoint: cleanEndpoint,
      deployment: AZURE_OPENAI_DEPLOYMENT_NAME,
      apiVersion: AZURE_OPENAI_API_VERSION
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY // Azure utilise 'api-key' au lieu de 'Authorization'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Azure OpenAI (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.';
  },

  async callOpenAIStandard(userMessage) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.';
  },

  async getFallbackResponse(userMessage) {
    // Système de réponses simulées intelligent selon le contexte
    const command = userMessage.toLowerCase();
    
    if (command.includes('absent') || command.includes('absence')) {
      return `🤖 **Assistant IA Caddy (Mode local)**\n\nJe comprends que vous voulez gérer une absence. En mode local, je ne peux pas accéder aux données temps réel, mais voici la procédure recommandée :\n\n1. **Identifier l'employé** et sa fonction\n2. **Vérifier les règles d'insertion sociale**\n3. **Proposer un remplaçant** avec profil compatible\n\n💡 *Configurez Azure OpenAI pour des réponses intelligentes !*`;
    }
    
    if (command.includes('planning')) {
      return `🤖 **Assistant IA Caddy (Mode local)**\n\nGénération de planning en mode simplifié :\n\n✅ **Règles appliquées :**\n• Jamais de profils faibles seuls\n• Mélange des langues\n• Respect des compétences véhicules\n\n📊 **Suggestion :** Utilisez l'interface de planning pour créer manuellement, ou configurez Azure OpenAI pour la génération automatique.`;
    }
    
    if (command.includes('statistique') || command.includes('rapport')) {
      return `🤖 **Assistant IA Caddy (Mode local)**\n\n📊 **Aperçu statistiques :**\n• 21 employés dans l'équipe\n• 5 véhicules en service\n• Règles d'insertion sociale actives\n\n💡 *Azure OpenAI permettrait des analyses temps réel de vos données !*`;
    }
    
    return `🤖 **Assistant IA Caddy (Mode local)**\n\nJe fonctionne actuellement en mode local. Mes capacités sont limitées sans Azure OpenAI.\n\n🔧 **Pour une IA complète :**\n• Vérifiez votre configuration Azure\n• Redémarrez l'application\n• Testez avec des commandes vocales\n\n💬 **Je peux quand même vous aider** avec des conseils généraux sur Caddy !`;
  },

  // Test de connexion Azure
  async testConnection() {
    try {
      if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT_NAME) {
        return {
          success: false,
          error: 'Configuration Azure OpenAI incomplète',
          details: {
            endpoint: !!AZURE_OPENAI_ENDPOINT,
            apiKey: !!AZURE_OPENAI_API_KEY,
            deployment: !!AZURE_OPENAI_DEPLOYMENT_NAME
          }
        };
      }

      const response = await this.callAzureOpenAI('Test de connexion');
      
      return {
        success: true,
        message: 'Azure OpenAI opérationnel',
        response: response.substring(0, 100) + '...'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback: 'OpenAI standard disponible : ' + !!OPENAI_API_KEY
      };
    }
  }
};

// Export pour compatibilité avec l'ancien code
export const openaiAPI = azureOpenaiAPI; 