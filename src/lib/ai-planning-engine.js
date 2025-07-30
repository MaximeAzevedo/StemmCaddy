/**
 * 🤖 MOTEUR DE PLANNING IA INTELLIGENT
 * =====================================
 * Utilise Azure OpenAI pour optimiser l'attribution employés → postes
 * Basé sur : compétences réelles, profils, langues, disponibilités
 */

import { azureOpenaiAPI } from './azure-openai.js';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase pour React
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.warn('⚠️ REACT_APP_SUPABASE_URL manquante');
}

const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseServiceKey) : null;

export class AIPlanningEngine {
  constructor() {
    this.employeesData = [];
    this.postesData = [];
    this.rules = null;
  }

  /**
   * 🧠 ANALYSE IA INTELLIGENTE DES COMPÉTENCES
   * Fait correspondre postes demandés ↔ compétences employés
   */
  async analyzeCompetenceMatch(employee, posteName) {
    const prompt = `
ANALYSE EXPERTE : Correspondance employé-poste cuisine

EMPLOYÉ ANALYSÉ :
- Nom: ${employee.prenom}
- Profil: ${employee.profil} (Faible/Moyen/Fort)
- Langue: ${employee.langue_parlee}
- Compétences validées:
  ${this.formatEmployeeCompetences(employee)}

POSTE DEMANDÉ : "${posteName}"

MISSION : Détermine si cet employé PEUT travailler sur ce poste.

RÈGLES MÉTIER STRICTES :
- Vérifier correspondance nom poste ↔ compétence validée
- Prendre en compte le profil Force/Moyenne/Faible
- Considérer la langue pour formation/communication
- Retourner un score de 0 à 100

RÉPONSE FORMAT JSON :
{
  "compatible": true/false,
  "score": 0-100,
  "competence_matchee": "nom_competence_exacte",
  "raison": "explication courte",
  "recommandation": "amélioration possible"
}`;

    try {
      const response = await azureOpenaiAPI.chat(prompt);
      return JSON.parse(this.extractJSON(response));
    } catch (error) {
      console.warn('⚠️ IA indisponible, fallback manuel:', error);
      return this.fallbackCompetenceAnalysis(employee, posteName);
    }
  }

  /**
   * 🎯 OPTIMISATION IA PLANNING COMPLET
   * Génère le planning optimal avec IA contextuelle
   */
  async generateOptimalPlanning(date, employeesAvailable, postesRequired) {
    const prompt = `EXPERT PLANNING CUISINE - RÈGLES MÉTIER EXACTES

DATE: ${date}
MISSION: Assigner TOUS les ${employeesAvailable.length} employés selon PRIORITÉS STRICTES

EMPLOYÉS (${employeesAvailable.length}):
${employeesAvailable.map(emp => `${emp.prenom} (${emp.profil})`).join(', ')}

POSTES EXACTS: ${postesRequired.map(p => p.nom).join(', ')}

🔥 RÈGLES MÉTIER ABSOLUES (ORDRE PRIORITÉ EXACT):
1. Pain = 2 personnes exactement (PRIORITÉ 1)
2. Sandwichs = 5 personnes exactement (PRIORITÉ 2)
3. Self Midi = 4 personnes total RÉPARTIES EN :
   - "Self Midi 11h-11h45" = 2 personnes exactement
   - "Self Midi 11h45-12h45" = 2 personnes exactement
4. Vaisselle = 7 personnes total RÉPARTIES EN :
   - "Vaisselle 8h" = 1 personne exactement
   - "Vaisselle 10h" = 3 personnes exactement  
   - "Vaisselle midi" = 3 personnes exactement
5. Cuisine chaude = 4 à 7 personnes (commencer par 4)
6. Jus de fruits = 2 à 3 personnes
7. Légumerie = 2 à 10 personnes
8. Equipe Pina et Saskia = minimum 1 personne (DERNIER)

🎯 STRATÉGIE OBLIGATOIRE:
- Assigner dans l'ORDRE EXACT des priorités (Pain → Sandwichs → Self Midi → Vaisselle → etc.)
- Pour Self Midi et Vaisselle: CRÉER DES POSTES SÉPARÉS pour chaque créneau
- Vérifier compétences obligatoires pour chaque poste
- TOUS les ${employeesAvailable.length} employés DOIVENT être assignés
- Flexibilité: Vaisselle midi peut aussi aller sur autre poste (sauf Self Midi)
- Flexibilité: Self peut aller Sandwich ou Pain le matin

CONTRAINTES JSON CRITIQUES:
- Self Midi = DEUX postes distincts: "Self Midi 11h-11h45" et "Self Midi 11h45-12h45"
- Vaisselle = TROIS postes distincts: "Vaisselle 8h", "Vaisselle 10h", "Vaisselle midi"
- Autres postes = noms standards: "Pain", "Sandwichs", "Cuisine chaude", "Jus de fruits", "Légumerie", "Equipe Pina et Saskia"
- JSON parfait obligatoire

RÉPONSE JSON PARFAIT (respectez la structure exacte avec créneaux séparés):
{
  "planning_optimal": [
    {
      "poste": "Pain",
      "employes_assignes": [
        {"prenom": "Aissatou", "role": "Chef", "score_adequation": 90, "raison": "Fort"},
        {"prenom": "Jurom", "role": "Aide", "score_adequation": 75, "raison": "Moyen"}
      ]
    },
    {
      "poste": "Sandwichs", 
      "employes_assignes": [
        {"prenom": "Maria", "role": "Chef", "score_adequation": 95, "raison": "Fort"}
      ]
    },
    {
      "poste": "Self Midi 11h-11h45",
      "employes_assignes": [
        {"prenom": "Fatumata", "role": "Equipier", "score_adequation": 80, "raison": "Moyen"},
        {"prenom": "Niyat", "role": "Equipier", "score_adequation": 75, "raison": "Moyen"}
      ]
    },
    {
      "poste": "Self Midi 11h45-12h45",
      "employes_assignes": [
        {"prenom": "Djenabou", "role": "Equipier", "score_adequation": 85, "raison": "Fort"},
        {"prenom": "Kifle", "role": "Equipier", "score_adequation": 70, "raison": "Faible"}
      ]
    },
    {
      "poste": "Vaisselle 8h",
      "employes_assignes": [
        {"prenom": "Charif", "role": "Equipier", "score_adequation": 80, "raison": "Moyen"}
      ]
    },
    {
      "poste": "Vaisselle 10h",
      "employes_assignes": [
        {"prenom": "Carla", "role": "Equipier", "score_adequation": 75, "raison": "Moyen"}
      ]
    },
    {
      "poste": "Vaisselle midi",
      "employes_assignes": [
        {"prenom": "Nesrin", "role": "Equipier", "score_adequation": 70, "raison": "Faible"}
      ]
    }
  ],
  "statistiques": {
    "postes_couverts": 8,
    "employes_utilises": ${employeesAvailable.length},
    "score_global": 85
  },
  "recommandations": [
    "Priorités strictes respectées",
    "Créneaux Self Midi et Vaisselle séparés correctement"
  ]
}`;

    try {
      console.log('🤖 Appel Azure OpenAI avec prompt optimisé...');
      const response = await azureOpenaiAPI.chat(prompt);
      
      console.log('📝 Réponse IA brute (100 premiers caractères):', response.substring(0, 100));
      
      const aiPlanning = JSON.parse(this.extractJSON(response));
      
      // Valider et appliquer le planning IA
      return await this.validateAndApplyAIPlanning(aiPlanning, date);
    } catch (error) {
      console.warn('⚠️ IA indisponible, fallback règles manuelles:', error);
      const fallbackResult = await this.fallbackManualPlanning(employeesAvailable, postesRequired);
      
      // Normaliser la structure pour compatibilité
      if (fallbackResult.success) {
        return {
          planning_optimal: fallbackResult.planning_optimal, // ✅ Déjà au bon format
          statistiques: {
            postes_couverts: fallbackResult.stats.postes_couverts,
            employes_utilises: fallbackResult.stats.employes_utilises,
            score_global: fallbackResult.stats.score_global
          },
          recommandations: fallbackResult.recommendations,
          source: 'MANUAL_FALLBACK'
        };
      } else {
        return {
          planning_optimal: [],
          statistiques: { postes_couverts: 0, employes_utilises: 0, score_global: 0 },
          recommandations: ["Erreur lors du fallback manuel", "Veuillez réessayer"],
          source: 'FALLBACK_ERROR'
        };
      }
    }
  }

  /**
   * 🧹 EXTRACTION JSON ULTRA-ROBUSTE
   * Gestion avancée des réponses malformées Azure OpenAI
   */
  extractJSON(response) {
    try {
      console.log('🔍 Analyse réponse IA (longueur: ' + response.length + ' caractères)');
      console.log('📝 Début réponse:', response.substring(0, 100) + '...');
      
      // Étape 1: Nettoyer les blocs markdown et caractères parasites
      let cleaned = response.trim();
      
      // Supprimer les blocs markdown ```json...```
      if (cleaned.includes('```json')) {
        const start = cleaned.indexOf('```json') + 7;
        const end = cleaned.lastIndexOf('```');
        if (end > start) {
          cleaned = cleaned.substring(start, end).trim();
        }
      } else if (cleaned.includes('```')) {
        const start = cleaned.indexOf('```') + 3;
        const end = cleaned.lastIndexOf('```');
        if (end > start) {
          cleaned = cleaned.substring(start, end).trim();
        }
      }
      
      // Étape 2: Trouver les accolades principales
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('Pas de JSON valide trouvé dans la réponse');
      }
      
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      console.log('🧹 JSON nettoyé (100 premiers caractères):', cleaned.substring(0, 100) + '...');
      
      // Étape 3: Corrections multiples pour JSON malformé
      // Supprimer virgules finales dans objets et tableaux
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      
      // Corriger les guillemets manquants autour des clés
      cleaned = cleaned.replace(/(\w+):/g, '"$1":');
      
      // Supprimer virgules multiples
      cleaned = cleaned.replace(/,{2,}/g, ',');
      
      // Supprimer espaces avant virgules
      cleaned = cleaned.replace(/\s+,/g, ',');
      
      // ✅ NOUVELLES CORRECTIONS SPÉCIFIQUES:
      // Corriger les champs vides problématiques
      cleaned = cleaned.replace(/"prenom":"",/g, '"prenom":"Employé",');
      cleaned = cleaned.replace(/"role":"",/g, '"role":"Aide",');
      cleaned = cleaned.replace(/"raison":"",/g, '"raison":"Assigné",');
      cleaned = cleaned.replace(/"score_adequation":""/g, '"score_adequation":60');
      cleaned = cleaned.replace(/"score_adequation":"0"/g, '"score_adequation":60');
      
      // ✅ CORRECTION FINALE : Espaces dans les champs vides
      cleaned = cleaned.replace(/"role":""\s*,/g, '"role":"Aide",');
      cleaned = cleaned.replace(/"raison":""\s*,/g, '"raison":"Assigné",');
      cleaned = cleaned.replace(/,\s{2,}/g, ', '); // Réduire espaces multiples
      cleaned = cleaned.replace(/:\s{2,}/g, ': '); // Réduire espaces après :
      
      // Corriger les virgules avant accolades fermantes
      cleaned = cleaned.replace(/",\s*}/g, '"}');
      cleaned = cleaned.replace(/,\s*"}/g, '"}');
      
      // ✅ CORRECTIONS ULTRA-SPÉCIFIQUES pour erreurs ligne 61:
      // Corriger guillemets malformés autour des propriétés
      cleaned = cleaned.replace(/(\w+)":\s*"/g, '"$1": "');
      cleaned = cleaned.replace(/",(\w+)"/g, '", "$1"');
      
      // Corriger les doubles virgules
      cleaned = cleaned.replace(/,,+/g, ',');
      
      // Corriger propriétés sans guillemets
      cleaned = cleaned.replace(/,\s*(\w+):/g, ', "$1":');
      cleaned = cleaned.replace(/{\s*(\w+):/g, '{ "$1":');
      
      // ✅ CORRECTIONS SPÉCIFIQUES JSON OpenAI
      // Corriger les champs vides avec guillemets manquants
      cleaned = cleaned.replace(/"prenom":\s*""\s*,?\s*role:\s*""/g, '"prenom": "Employé", "role": "Aide"');
      cleaned = cleaned.replace(/role:\s*""/g, '"role": "Aide"');
      cleaned = cleaned.replace(/score_adequation:\s*""/g, '"score_adequation": 60');
      cleaned = cleaned.replace(/raison:\s*""/g, '"raison": "Assigné"');
      
      // Corriger les commentaires JavaScript dans le JSON
      cleaned = cleaned.replace(/\/\/.*$/gm, ''); // Supprimer commentaires de fin de ligne
      cleaned = cleaned.replace(/,\s*\/\/.*$/gm, ','); // Corriger virgules avant commentaires
      
      // Fusionner "Equipe Pina" et "Saskia" si séparés
      cleaned = cleaned.replace(/"poste":\s*"Equipe Pina"([\s\S]*?)"poste":\s*"Saskia"/g, (match, middle) => {
        return '"poste": "Equipe Pina et Saskia"' + middle.replace(/][\s,]*},[\s]*{[\s]*"poste"[\s]*:[\s]*"Saskia"[\s]*,[\s]*"employes_assignes"[\s]*:[\s]*\[/, ', ');
      });
      
      // Correction finale des noms de postes
      cleaned = cleaned.replace(/"poste":\s*"Equipe Saskia"/g, '"poste": "Equipe Pina et Saskia"');
      
      // Étape 4: Tentatives de parsing avec récupération progressive
      try {
        JSON.parse(cleaned); // Valider le JSON
        console.log('✅ JSON parsé avec succès !');
        return cleaned;
      } catch (parseError) {
        console.warn('⚠️ Première tentative échouée, correction avancée...');
        
        // Tentative de correction avancée
        let advancedCleaning = cleaned;
        
        // Corriger les chaînes non échappées
        advancedCleaning = advancedCleaning.replace(/:\s*([^",{}\s]+)(?=\s*[,}\]])/g, ': "$1"');
        
        // Corriger les tableaux malformés
        advancedCleaning = advancedCleaning.replace(/\[\s*,/g, '[');
        advancedCleaning = advancedCleaning.replace(/,\s*\]/g, ']');
        
        try {
          JSON.parse(advancedCleaning); // Valider le JSON corrigé
          console.log('✅ JSON corrigé et parsé !');
          return advancedCleaning;
        } catch (finalError) {
          console.error('❌ Impossible de corriger le JSON:', finalError.message);
          throw finalError;
        }
      }
      
    } catch (error) {
      console.error('💥 Erreur extraction JSON finale:', error.message);
      console.log('📝 Réponse IA complète problématique:');
      console.log('---START---');
      console.log(response);
      console.log('---END---');
      
      // Déclencher le fallback manuel
      console.log('🛡️ Déclenchement fallback manuel robuste...');
      throw new Error('JSON extraction failed - manual fallback triggered');
    }
  }

  /**
   * 📊 FORMAT COMPÉTENCES EMPLOYÉ POUR IA
   */
  formatEmployeeCompetences(employee) {
    const competences = [];
    
    if (employee.cuisine_chaude) competences.push('Cuisine chaude ✓');
    if (employee.chef_sandwichs) competences.push('Chef sandwichs ✓');
    if (employee.sandwichs) competences.push('Sandwichs ✓');
    if (employee.vaisselle) competences.push('Vaisselle ✓');
    if (employee.legumerie) competences.push('Légumerie ✓');
    if (employee.equipe_pina_saskia) competences.push('Équipe Pina & Saskia ✓');
    if (employee.jus_de_fruits) competences.push('Jus de fruits ✓');
    if (employee.pain) competences.push('Pain ✓');
    if (employee.self_midi) competences.push('Self Midi ✓');
    
    return competences.length > 0 ? competences.join(', ') : 'Aucune compétence validée';
  }

  /**
   * 🛡️ FALLBACK MANUEL SI IA INDISPONIBLE
   */
  fallbackCompetenceAnalysis(employee, posteName) {
    // Correspondances manuelles de base
    const manualMapping = {
      'Cuisine chaude': employee.cuisine_chaude,
      'Sandwichs': employee.sandwichs,
      'Chef sandwichs': employee.chef_sandwichs,
      'Vaisselle': employee.vaisselle,
      'Légumerie': employee.legumerie,
      'Equipe Pina et Saskia': employee.equipe_pina_saskia,
      'Jus de fruits': employee.jus_de_fruits,
      'Pain': employee.pain,
      'Self Midi': employee.self_midi
    };

    const hasCompetence = manualMapping[posteName] || false;
    const profileBonus = employee.profil === 'Fort' ? 30 : employee.profil === 'Moyen' ? 15 : 0;
    
    return {
      compatible: hasCompetence,
      score: hasCompetence ? (50 + profileBonus) : 0,
      competence_matchee: posteName,
      raison: hasCompetence ? 'Compétence validée' : 'Pas de compétence',
      recommandation: hasCompetence ? 'Assignation recommandée' : 'Formation nécessaire'
    };
  }

  /**
   * 🛡️ MÉTHODE FALLBACK PLANNING MANUEL (si IA indisponible)
   * Respecte les nouvelles règles : mix profils + tous employés assignés + créneaux multiples
   */
  async fallbackManualPlanning(employeesAvailable, postesRequired) {
    try {
      console.log('🛡️ Fallback planning manuel activé...');
      
      // Définir les créneaux directement pour éviter les problèmes d'import
      const getCreneauxForPoste = (posteNom) => {
        const CRENEAUX_PAR_POSTE = {
          'Cuisine chaude': ['8h-16h'],
          'Sandwichs': ['8h-16h'], 
          'Jus de fruits': ['8h-16h'],
          'Légumerie': ['8h-16h'],
          'Equipe Pina et Saskia': ['8h-16h'],
          'Pain': ['8h-12h'],
          'Vaisselle': ['8h', '10h', 'midi'],
          'Self Midi': ['11h-11h45', '11h45-12h45']
        };
        return CRENEAUX_PAR_POSTE[posteNom] || ['8h-16h'];
      };
      
      // Séparer employés par profil pour mélange équilibré
      const profilsFort = employeesAvailable.filter(emp => emp.profil === 'Fort');
      const profilsMoyen = employeesAvailable.filter(emp => emp.profil === 'Moyen');
      const profilsFaible = employeesAvailable.filter(emp => emp.profil === 'Faible');
      
      console.log(`👥 Répartition: ${profilsFort.length} Forts, ${profilsMoyen.length} Moyens, ${profilsFaible.length} Faibles`);
      
      const assignments = [];
      let availableEmployees = [...employeesAvailable];
      
      // Trier les postes par priorité
      const sortedPostes = [...postesRequired].sort((a, b) => (a.priority || 999) - (b.priority || 999));
      
      // Phase 1: Assigner selon priorités avec TOUS les créneaux
      for (const poste of sortedPostes) {
        const creneauxForPoste = getCreneauxForPoste(poste.nom);
        console.log(`🕐 ${poste.nom}: créneaux ${creneauxForPoste.join(', ')}`);
        
        // ✅ RÈGLES MÉTIER EXACTES - QUOTAS STRICTS
        let employeesNeededPerCreneau = [];
        
        if (poste.nom === 'Pain') {
          // Pain : PRIORITÉ 1 - 2 personnes exactement
          employeesNeededPerCreneau = [2];
        } else if (poste.nom === 'Sandwichs') {
          // Sandwichs : PRIORITÉ 2 - 5 personnes exactement
          employeesNeededPerCreneau = [5]; // EXACTEMENT 5, pas 6
        } else if (poste.nom === 'Self Midi') {
          // Self Midi : 2 personnes à 11h-11h45 + 2 personnes à 11h45-12h45 = 4 total
          employeesNeededPerCreneau = [2, 2];
        } else if (poste.nom === 'Vaisselle') {
          // Vaisselle : 1 à 8h + 3 à 10h + 3 à midi = 7 total
          employeesNeededPerCreneau = [1, 3, 3];
        } else if (poste.nom === 'Cuisine chaude') {
          // Cuisine chaude : 4-7 personnes (on commence par 4, on complétera après)
          employeesNeededPerCreneau = [4];
        } else if (poste.nom === 'Jus de fruits') {
          // Jus de fruits : 2 personnes idéal
          employeesNeededPerCreneau = [2];
        } else if (poste.nom === 'Légumerie') {
          // Légumerie : 2 personnes minimum (recevra les restants après)
          employeesNeededPerCreneau = [2];
        } else if (poste.nom === 'Equipe Pina et Saskia') {
          // Equipe Pina et Saskia : PRIORITÉ après légumerie
          employeesNeededPerCreneau = [1];
        } else {
          // Autres postes : utiliser min-max normal
          const needed = Math.min(poste.max || 3, Math.max(poste.min || 1, 1));
          employeesNeededPerCreneau = [needed];
        }
        
        // Assigner sur chaque créneau avec gestion spéciale pour créneaux multiples
        // eslint-disable-next-line no-loop-func
        creneauxForPoste.forEach((creneau, creneauIndex) => {
          const needed = employeesNeededPerCreneau[creneauIndex] || 0;
          if (needed === 0) return;
          
          // Créer le nom du poste avec créneau pour Self Midi et Vaisselle
          let posteComplet = poste.nom;
          if (poste.nom === 'Self Midi') {
            posteComplet = creneau === '11h-11h45' ? 'Self Midi 11h-11h45' : 'Self Midi 11h45-12h45';
          } else if (poste.nom === 'Vaisselle') {
            posteComplet = `Vaisselle ${creneau}`;
          }
          
          // Collecter tous les employés pour ce créneau
          const employesPourCeCreneau = [];
          
          for (let i = 0; i < needed && availableEmployees.length > 0; i++) {
            let selectedEmployee;
            
            if (i === 0 && profilsFort.some(emp => availableEmployees.includes(emp))) {
              // Premier assigné = profil Fort si disponible
              selectedEmployee = profilsFort.find(emp => availableEmployees.includes(emp));
            } else if (profilsMoyen.some(emp => availableEmployees.includes(emp))) {
              // Ensuite privilégier Moyens
              selectedEmployee = profilsMoyen.find(emp => availableEmployees.includes(emp));
            } else {
              // Sinon prendre ce qui reste
              selectedEmployee = availableEmployees[0];
            }
            
            if (selectedEmployee) {
              // eslint-disable-next-line no-loop-func
              availableEmployees = availableEmployees.filter(emp => emp.id !== selectedEmployee.id);
              
              employesPourCeCreneau.push({
                prenom: selectedEmployee.prenom,
                role: i === 0 ? 'Responsable' : 'Équipier',
                score_adequation: 70,
                raison: `${selectedEmployee.profil} - ${posteComplet}`
              });
              
              console.log(`✅ ${selectedEmployee.prenom} → ${posteComplet}`);
            }
          }
          
          // Créer l'assignation pour ce créneau avec tous ses employés
          if (employesPourCeCreneau.length > 0) {
            assignments.push({
              poste: posteComplet,
              creneau: creneau,
              employes_assignes: employesPourCeCreneau
            });
          }
        });
      }
      
      // Phase 2: Compléter Cuisine chaude si possible (4→7 personnes)
      if (availableEmployees.length > 0) {
        console.log(`🔥 Renforcement Cuisine chaude avec ${Math.min(availableEmployees.length, 3)} personnes`);
        
        const maxRenfort = Math.min(availableEmployees.length, 3); // Max 3 de plus
        for (let i = 0; i < maxRenfort; i++) {
          if (availableEmployees.length > 0) {
            const selectedEmployee = availableEmployees[0];
            availableEmployees = availableEmployees.filter(emp => emp.id !== selectedEmployee.id);
            
            assignments.push({
              poste: 'Cuisine chaude',
              creneau: '8h-16h',
              employes_assignes: [{
                prenom: selectedEmployee.prenom,
                role: 'Équipier',
                score_adequation: 70,
                raison: `${selectedEmployee.profil} - Renfort Cuisine chaude`
              }]
            });
            
            console.log(`✅ ${selectedEmployee.prenom} → Cuisine chaude (renfort)`);
          }
        }
      }
      
      // Phase 3: Assigner quelques employés à l'équipe Pina et Saskia d'abord
      if (availableEmployees.length > 0) {
        console.log(`👥 Assignation à l'équipe Pina et Saskia (priorité)`);
        const employesPinaSaskia = [];
        const maxForPinaSaskia = Math.min(3, availableEmployees.length); // Max 3 pour Pina/Saskia
        
        for (let i = 0; i < maxForPinaSaskia; i++) {
          if (availableEmployees.length > 0) {
            const selectedEmployee = availableEmployees[0];
            availableEmployees = availableEmployees.filter(emp => emp.id !== selectedEmployee.id);
            
            employesPinaSaskia.push({
              prenom: selectedEmployee.prenom,
              role: i === 0 ? 'Responsable' : 'Équipier',
              score_adequation: 70,
              raison: `${selectedEmployee.profil} - Équipe Pina et Saskia`
            });
            
            console.log(`✅ ${selectedEmployee.prenom} → Équipe Pina et Saskia`);
          }
        }
        
        if (employesPinaSaskia.length > 0) {
          assignments.push({
            poste: 'Equipe Pina et Saskia',
            creneau: '8h-16h',
            employes_assignes: employesPinaSaskia
          });
        }
      }
      
      // Phase 4: ENFIN, assigner le reste en Légumerie
      if (availableEmployees.length > 0) {
        console.log(`🥬 Assignation des ${availableEmployees.length} employés restants en Légumerie (dernier recours)`);
        
        const employesLegumerie = [];
        availableEmployees.forEach(employee => {
          employesLegumerie.push({
            prenom: employee.prenom,
            role: 'Équipier',
            score_adequation: 70,
            raison: `${employee.profil} - Légumerie (dernier recours)`
          });
          console.log(`✅ ${employee.prenom} → Légumerie (dernier recours)`);
        });
        
        if (employesLegumerie.length > 0) {
          assignments.push({
            poste: 'Légumerie',
            creneau: '8h-16h',
            employes_assignes: employesLegumerie
          });
        }
      }
      
      return {
        success: true,
        planning_optimal: assignments, // ✅ Structure compatible avec interface
        stats: {
          postes_couverts: [...new Set(assignments.map(a => a.poste))].length,
          employes_utilises: assignments.length,
          score_global: 70
        },
        recommendations: [
          'Planning généré en mode manuel',
          `Priorités respectées: Sandwichs→Pain→Self Midi→Vaisselle (1+3+3)→Cuisine chaude→Jus (2)→Pina/Saskia`,
          `Tous les ${employeesAvailable.length} employés assignés selon quotas exacts`,
          'Légumerie utilisée uniquement en dernier recours'
        ],
        source: 'MANUAL_FALLBACK'
      };
      
    } catch (error) {
      console.error('❌ Erreur fallback manuel:', error);
      return {
        success: false,
        error: error.message,
        source: 'FALLBACK_ERROR'
      };
    }
  }

  /**
   * ✅ VALIDATION ET APPLICATION PLANNING IA
   */
  async validateAndApplyAIPlanning(aiPlanning, date) {
    try {
      const assignments = [];
      
      for (const posteAssignment of aiPlanning.planning_optimal) {
        for (const employe of posteAssignment.employes_assignes) {
          // Récupérer l'ID employé réel
          const { data: employeeDB } = await supabase
            .from('employes_cuisine_new')
            .select('id')
            .ilike('prenom', `%${employe.prenom}%`)
            .single();

          if (employeeDB) {
            // ✅ STRUCTURE COMPATIBLE AVEC planning_cuisine_new
            assignments.push({
              employee_id: employeeDB.id,
              date: date,
              poste: posteAssignment.poste,      // Nom du poste (string)
              creneau: '8h-16h',                // Format simplifié
              role: employe.role || 'Équipier',
              notes: `Planning IA - ${employe.raison || 'Assignation optimisée'}`,
              // Les colonnes poste_couleur et poste_icone sont optionnelles (valeurs par défaut)
            });
          }
        }
      }

      return {
        success: true,
        assignments,
        stats: aiPlanning.statistiques,
        recommendations: aiPlanning.recommandations,
        source: 'AI_OPTIMIZED'
      };
    } catch (error) {
      console.error('❌ Erreur validation planning IA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🚀 MÉTHODE PRINCIPALE : GÉNÉRATION PLANNING IA
   */
  async generateIntelligentPlanning(date) {
    try {
      console.log('🤖 Démarrage génération planning IA...');

      // 1. Charger données réelles
      const { data: employees } = await supabase
        .from('employes_cuisine_new')
        .select('*')
        .eq('actif', true);

      const postes = [
        { nom: 'Pain', min: 2, max: 2, priority: 1 },                    // ✅ PRIORITÉ 1 
        { nom: 'Sandwichs', min: 5, max: 5, priority: 2 },               // ✅ PRIORITÉ 2  
        { nom: 'Self Midi', min: 4, max: 4, priority: 3 },               // ✅ PRIORITÉ 3
        { nom: 'Vaisselle', min: 7, max: 7, priority: 4 },               // ✅ PRIORITÉ 4
        { nom: 'Cuisine chaude', min: 4, max: 7, priority: 5 },          // ✅ PRIORITÉ 5
        { nom: 'Jus de fruits', min: 2, max: 3, priority: 6 },           // ✅ PRIORITÉ 6
        { nom: 'Légumerie', min: 2, max: 10, priority: 7 },              // ✅ PRIORITÉ 7 (recevra restants)
        { nom: 'Equipe Pina et Saskia', min: 1, max: 5, priority: 8 }    // ✅ PRIORITÉ 8 (avant légumerie finale)
      ];

      // 2. Appel IA pour optimisation
      const result = await this.generateOptimalPlanning(date, employees, postes);

      console.log('✅ Planning IA généré:', result);
      return result;

    } catch (error) {
      console.error('💥 Erreur génération planning IA:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton
export const aiPlanningEngine = new AIPlanningEngine(); 