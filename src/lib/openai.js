// Configuration OpenAI pour l'assistant IA Caddy
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('Clé API OpenAI manquante. L\'assistant IA utilisera les réponses simulées.');
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

export const openaiAPI = {
  async generateResponse(userMessage) {
    if (!OPENAI_API_KEY) {
      return await this.getFallbackResponse(userMessage);
    }

    try {
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
      
    } catch (error) {
      console.error('Erreur OpenAI:', error);
      return await this.getFallbackResponse(userMessage);
    }
  },

  // Réponses de secours si OpenAI n'est pas disponible
  async getFallbackResponse(input) {
    const lowerInput = input.toLowerCase();
    
    // Détection d'absences
    if (lowerInput.includes('absent') || lowerInput.includes('maladie')) {
      const nameMatch = this.extractEmployeeName(input);
      const durationMatch = this.extractDuration(input);
      
      if (nameMatch) {
        return `J'ai bien noté que ${nameMatch} est absent${durationMatch ? ` ${durationMatch}` : ''}. Je vais réorganiser les équipes automatiquement selon les règles d'insertion sociale.`;
      }
      return "Pouvez-vous me préciser qui est absent et pour combien de temps ?";
    }
    
    // Génération de planning
    if (lowerInput.includes('planning') || lowerInput.includes('planifier')) {
      if (lowerInput.includes('semaine prochaine') || lowerInput.includes('générer')) {
        return "Je génère le planning de la semaine prochaine en respectant les règles d'insertion. Les profils faibles seront associés aux profils forts, et je mélangerai les langues pour favoriser l'apprentissage.";
      }
      return "Voulez-vous que je génère le planning de la semaine prochaine ou modifier le planning actuel ?";
    }
    
    // Suggestions d'équipes
    if (lowerInput.includes('remplacer') || lowerInput.includes('équipe') || lowerInput.includes('qui peut')) {
      return "Pour optimiser les équipes, je suggère toujours des combinaisons respectant les règles d'insertion : profil fort + profil faible/moyen + mélange linguistique.";
    }
    
    // Compétences
    if (lowerInput.includes('compétence') || lowerInput.includes('validation') || lowerInput.includes('progression')) {
      return "Je peux vous aider à valider les compétences véhicules (X/XX) et gérer la progression des employés. Précisez-moi l'employé concerné.";
    }
    
    // Statistiques
    if (lowerInput.includes('stat') || lowerInput.includes('rapport') || lowerInput.includes('combien')) {
      return "Accès aux statistiques : employés actifs, véhicules en tournée, efficacité des équipes. Que souhaitez-vous savoir ?";
    }
    
    // Réponse générale
    return "Je peux vous aider avec les plannings, les absences, les validations de compétences, et les statistiques. Que souhaitez-vous faire ?";
  },

  extractEmployeeName(input) {
    const names = ['shadi', 'tamara', 'ahmad', 'soroosh', 'imad', 'margot', 'martial', 'basel', 'firas', 'josé', 'juan', 'emaha', 'medha', 'tesfa', 'deazevedo'];
    for (const name of names) {
      if (input.toLowerCase().includes(name)) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    return null;
  },

  extractDuration(input) {
    if (input.includes('semaine')) return 'pour une semaine';
    if (input.includes('jour')) return 'pour quelques jours';
    if (input.includes('mois')) return 'pour un mois';
    return null;
  }
};

export default openaiAPI; 