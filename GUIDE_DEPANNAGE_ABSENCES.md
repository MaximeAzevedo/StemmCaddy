# 🔧 Guide de Dépannage - Gestion des Absences

## 🚨 Problèmes Courants & Solutions

### ❌ Erreur "table absences n'existe pas"

**Symptôme :** Message d'erreur rouge dans l'interface + notification "La table des absences n'existe pas encore"

**Solution rapide :**
1. Ouvrir Supabase SQL Editor
2. Exécuter le fichier `database/fix-absences-db.sql`
3. Actualiser l'application (bouton ↻ en haut à droite)

---

### ❌ Liste d'employés vide ou incomplète

**Symptôme :** Dropdown "Sélectionner un employé" vide ou manque des employés

**Solutions :**
1. **Vérifier les données :** Exécuter `SELECT * FROM employees;` dans Supabase
2. **Ajouter des employés manquants :**
   ```sql
   INSERT INTO employees (nom, profil, statut) VALUES 
   ('NOM_EMPLOYÉ', 'Moyen', 'Actif');
   ```
3. **Réinitialiser complètement :** Exécuter `database/fix-absences-db.sql`

---

### ❌ Erreur lors de la sauvegarde d'absence

**Messages possibles :**
- "Employé invalide sélectionné" 
- "Erreur lors de la sauvegarde"

**Solutions :**
1. **Vérifier l'ID employé :** Assurez-vous que l'employé existe
2. **Dates incohérentes :** Vérifier que date_fin >= date_debut  
3. **Contraintes :** Durée max 365 jours respectée

---

### ❌ Assistant IA ne reconnaît pas les commandes d'absence

**Symptôme :** L'IA répond de manière générique aux commandes d'absence

**Solutions :**
1. **Utiliser les bonnes formulations :**
   - ✅ "Déclarer Shadi absent aujourd'hui"
   - ✅ "Qui est absent cette semaine ?"
   - ❌ "Shadi n'est pas là"

2. **Vérifier l'orthographe des noms**

3. **Commandes exactes supportées :**
   ```
   "Déclarer [nom] absent [quand] [motif]"
   "Supprimer absence de [nom]"
   "Qui est absent [période] ?"
   "[Nom] est disponible ?"
   "Employés disponibles"
   ```

---

### ❌ Vue calendrier affiche incorrectement

**Symptôme :** Employés marqués absent/présent incorrectement

**Solution :**
1. Actualiser les données (bouton ↻)
2. Vérifier les dates dans la base :
   ```sql
   SELECT e.nom, a.date_debut, a.date_fin, a.statut 
   FROM absences a 
   JOIN employees e ON a.employee_id = e.id 
   WHERE a.statut = 'Confirmée';
   ```

---

## 🔍 Vérifications Système

### ✅ Checklist Base de Données

```sql
-- 1. Vérifier table employees
SELECT COUNT(*) as nb_employees FROM employees;

-- 2. Vérifier table absences
SELECT COUNT(*) as nb_absences FROM absences;

-- 3. Tester fonction disponibilité
SELECT est_disponible(1, CURRENT_DATE);

-- 4. Lister employés disponibles aujourd'hui
SELECT * FROM get_employes_disponibles(CURRENT_DATE);
```

### ✅ Test API Supabase

Ouvrir la console navigateur et tester :
```javascript
// Test connection
console.log(await supabaseAPI.getEmployees());

// Test absences
console.log(await supabaseAPI.getAbsences());

// Test création absence
console.log(await supabaseAPI.createAbsence({
  employee_id: 1,
  date_debut: '2024-01-15',
  date_fin: '2024-01-15',
  type_absence: 'Absent',
  statut: 'Confirmée'
}));
```

---

## 🛠️ Réparation Complète

Si tous les problèmes persistent :

1. **Sauvegarder** les données existantes
2. **Exécuter** `database/fix-absences-db.sql`
3. **Vider le cache** navigateur (Ctrl+Shift+R)
4. **Tester** les fonctionnalités de base

---

## 🤖 Tests Assistant IA

### Commandes à tester :

```
✅ "Aide" → Doit afficher la liste des commandes
✅ "Déclarer Ahmad absent aujourd'hui" → Doit créer une absence
✅ "Qui est absent ?" → Doit lister les absences actuelles
✅ "Shadi est disponible ?" → Doit vérifier la disponibilité
✅ "Employés disponibles" → Doit lister les employés présents
✅ "Supprimer absence de Ahmad" → Doit supprimer l'absence
```

### Réponses attendues :
- ✅ Messages avec emojis (✅ ❌ ℹ️ 👥)
- ✅ Noms d'employés reconnus
- ✅ Pas d'erreurs dans la console

---

## 📞 Support Urgence

Si le problème persiste après tous ces tests :

1. **Vérifier variables d'environnement** Supabase
2. **Consulter logs** Supabase (Authentication > Logs)
3. **Tester connexion** depuis Supabase Dashboard
4. **Réinstaller** les dépendances npm

---

**💡 Astuce :** La plupart des problèmes sont résolus en exécutant `database/fix-absences-db.sql` puis en actualisant l'application ! 