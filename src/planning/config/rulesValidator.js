/**
 * Validateur de règles pour s'assurer de la cohérence
 * ✅ UNIFICATION COMPLÈTE - Toutes les compétences obligatoires
 */

import { POSTES_RULES, getPostesByPriority } from './postesRules';

/**
 * Valide que toutes les règles sont cohérentes et complètes
 */
export const validateAllRules = () => {
  const errors = [];
  const warnings = [];
  const info = [];

  // Vérifier que tous les postes ont des règles complètes
  const postes = getPostesByPriority();
  
  info.push(`🎯 Validation de ${postes.length} postes définis`);

  postes.forEach(poste => {
    const name = poste.name;
    
    // Vérifications obligatoires
    if (!poste.min || poste.min < 1) {
      errors.push(`❌ ${name}: min manquant ou invalide (${poste.min})`);
    }
    
    if (!poste.max || poste.max < poste.min) {
      errors.push(`❌ ${name}: max manquant ou invalide (${poste.max})`);
    }
    
    if (!poste.priority || poste.priority < 1) {
      errors.push(`❌ ${name}: priority manquante ou invalide (${poste.priority})`);
    }
    
    // Vérification NOUVELLE RÈGLE : toutes les compétences obligatoires
    if (poste.needsCompetence !== true) {
      errors.push(`❌ ${name}: needsCompetence doit être true (règle unifiée)`);
    }
    
    // Vérifications cohérence
    if (poste.min > poste.max) {
      errors.push(`❌ ${name}: min (${poste.min}) > max (${poste.max})`);
    }
    
    // Informations
    info.push(`✅ ${name}: min=${poste.min}, max=${poste.max}, priorité=${poste.priority}, compétence=${poste.needsCompetence}`);
  });

  // Vérifier les priorités uniques
  const priorities = postes.map(p => p.priority);
  const duplicatePriorities = priorities.filter((p, i) => priorities.indexOf(p) !== i);
  if (duplicatePriorities.length > 0) {
    warnings.push(`⚠️ Priorités dupliquées : ${duplicatePriorities.join(', ')}`);
  }

  // Vérifier l'équipe Pina et Saskia spécifiquement
  const equipePS = postes.find(p => p.name === 'Equipe Pina et Saskia');
  if (!equipePS) {
    errors.push(`❌ Équipe Pina et Saskia manquante dans les règles`);
  } else {
    if (equipePS.min !== 2 || equipePS.max !== 3) {
      warnings.push(`⚠️ Équipe Pina et Saskia: effectifs ${equipePS.min}-${equipePS.max} (attendu: 2-3)`);
    }
    if (equipePS.needsCompetence !== true) {
      errors.push(`❌ Équipe Pina et Saskia: needsCompetence doit être true`);
    }
    info.push(`✅ Équipe Pina et Saskia: règles correctes`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    summary: `${errors.length} erreurs, ${warnings.length} avertissements, ${postes.length} postes validés`
  };
};

/**
 * Affiche un rapport complet de validation
 */
export const printValidationReport = () => {
  const result = validateAllRules();
  
  console.log('\n🔍 === RAPPORT DE VALIDATION DES RÈGLES ===');
  console.log(`Statut: ${result.isValid ? '✅ VALIDE' : '❌ ERREURS DÉTECTÉES'}`);
  console.log(`Résumé: ${result.summary}\n`);
  
  if (result.errors.length > 0) {
    console.log('🚨 ERREURS:');
    result.errors.forEach(error => console.log(error));
    console.log('');
  }
  
  if (result.warnings.length > 0) {
    console.log('⚠️ AVERTISSEMENTS:');
    result.warnings.forEach(warning => console.log(warning));
    console.log('');
  }
  
  if (result.info.length > 0) {
    console.log('📋 DÉTAILS:');
    result.info.forEach(info => console.log(info));
  }
  
  console.log('\n=== FIN DU RAPPORT ===\n');
  
  return result;
};

/**
 * Exporte pour utilisation dans les tests
 */
export default {
  validateAllRules,
  printValidationReport
}; 