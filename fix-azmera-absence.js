// Script pour supprimer l'absence d'Azmera du 2025-07-18

// Utiliser l'ID de l'absence vu dans les logs : id: 7
const absenceId = 7;

console.log(`🗑️ Suppression de l'absence ID ${absenceId} (Azmera - 2025-07-18)...`);
console.log('⚠️ ATTENTION: Cela va permettre à Azmera d\'apparaître dans le planning');
console.log('');
console.log('Pour exécuter la suppression, utilisez:');
console.log('1. Aller dans Supabase Dashboard');
console.log('2. Table: absences_cuisine_new');
console.log('3. Supprimer la ligne avec id = 7');
console.log('');
console.log('OU exécuter cette requête SQL:');
console.log('DELETE FROM absences_cuisine_new WHERE id = 7;'); 