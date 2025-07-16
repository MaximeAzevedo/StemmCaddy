# 🚀 GUIDE DE MIGRATION - SCHÉMA CUISINE UNIFIÉ

## 📋 RÉSUMÉ

Cette migration unifie toutes vos bases de données cuisine en 3 tables simples :
- **`employes_cuisine_unifie`** : Profils complets (horaires + compétences intégrés)
- **`planning_cuisine_unifie`** : Planning simplifié (postes + créneaux dans une table)
- **`absences_cuisine_unifie`** : Absences simples

## 🎯 AVANTAGES

✅ **Simplicité** : 3 tables au lieu de 7+  
✅ **Performance** : Moins de jointures nécessaires  
✅ **Facilité d'usage** : Idéal pour les non-techniques  
✅ **Compétences binaires** : Validé/Non validé (plus simple que les niveaux)  
✅ **Horaires intégrés** : Plus besoin de table séparée pour les disponibilités  

## 📝 INSTRUCTIONS D'EXÉCUTION

### OPTION 1 : Via l'interface Supabase (RECOMMANDÉ)

1. **Ouvrez votre dashboard Supabase**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet Caddy

2. **Accédez au SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu de gauche

3. **Copiez-collez le script**
   - Ouvrez le fichier `database/schema-cuisine-unifie.sql`
   - Copiez tout le contenu
   - Collez dans l'éditeur SQL

4. **Exécutez la migration**
   - Cliquez sur "RUN" ou Ctrl+Enter
   - Attendez la fin de l'exécution

### OPTION 2 : Via l'API Supabase (pour les développeurs)

```javascript
// Exécuter section par section dans l'API
// À faire manuellement car l'API ne supporte pas les scripts complets
```

## 📊 STRUCTURE DES NOUVELLES TABLES

### 1. `employes_cuisine_unifie`
```sql
- id (clé primaire)
- nom, prenom
- photo_url
- lundi_debut, lundi_fin (horaires)
- mardi_debut, mardi_fin
- mercredi_debut, mercredi_fin
- jeudi_debut, jeudi_fin
- vendredi_debut, vendredi_fin
- cuisine_chaude (boolean)
- sandwichs (boolean)
- pain (boolean)
- jus_fruits (boolean)
- legumerie (boolean)
- vaisselle (boolean)
- cuisine_froide (boolean)
- chef_sandwichs (boolean)
- actif (boolean)
```

### 2. `planning_cuisine_unifie`
```sql
- id (clé primaire)
- employee_id (référence)
- date
- poste ("Cuisine chaude", "Sandwichs", etc.)
- creneau ("11h00-11h45", etc.)
- heure_debut, heure_fin
- poste_couleur, poste_icone
- role ("Équipier", etc.)
```

### 3. `absences_cuisine_unifie`
```sql
- id (clé primaire)
- employee_id (référence)
- date_debut, date_fin
- type_absence ("Absent", "Congé", etc.)
- motif
```

## 👁️ VUES CRÉÉES

### `absences_aujourd_hui`
Affiche les employés absents aujourd'hui avec leurs prénoms et motifs.

### `planning_aujourd_hui`
Affiche le planning du jour avec tous les détails (employé, poste, créneau, disponibilité).

### `competences_employes`
Liste des employés avec leurs compétences validées et un comptage.

## 🔧 FONCTIONS UTILES

### `peut_affecter_poste(employee_id, poste)`
Vérifie si un employé peut être affecté à un poste donné.

```sql
SELECT peut_affecter_poste(1, 'Cuisine chaude');
```

### `get_employes_disponibles_poste(poste, date)`
Retourne la liste des employés disponibles et compétents pour un poste à une date.

```sql
SELECT * FROM get_employes_disponibles_poste('Sandwichs', CURRENT_DATE);
```

## 🔄 QUE FAIT LA MIGRATION ?

1. **Sauvegarde** les données existantes
2. **Crée** les nouvelles tables unifiées
3. **Migre** automatiquement :
   - Les employés depuis `employees` + `employees_cuisine`
   - Les horaires depuis `disponibilites`
   - Les compétences depuis `competences_cuisine`
   - Les absences depuis `absences_cuisine`
4. **Crée** les vues et fonctions utiles
5. **Configure** les index pour les performances

## ✅ VÉRIFICATION POST-MIGRATION

Après la migration, vérifiez que tout fonctionne :

```sql
-- Vérifier les employés migrés
SELECT COUNT(*) FROM employes_cuisine_unifie;

-- Voir les absences d'aujourd'hui
SELECT * FROM absences_aujourd_hui;

-- Voir le planning d'aujourd'hui
SELECT * FROM planning_aujourd_hui;

-- Voir les compétences
SELECT prenom, nom, nb_competences FROM competences_employes ORDER BY nb_competences DESC;
```

## 🎯 UTILISATION APRÈS MIGRATION

### Ajouter un employé
```sql
INSERT INTO employes_cuisine_unifie (
    nom, prenom, 
    lundi_debut, lundi_fin,
    mardi_debut, mardi_fin,
    mercredi_debut, mercredi_fin,
    jeudi_debut, jeudi_fin,
    vendredi_debut, vendredi_fin,
    sandwichs, vaisselle
) VALUES (
    'Dupont', 'Jean',
    '08:00', '17:00',
    '08:00', '17:00', 
    '08:00', '17:00',
    '08:00', '17:00',
    '08:00', '17:00',
    true, true
);
```

### Ajouter une absence
```sql
INSERT INTO absences_cuisine_unifie (employee_id, date_debut, date_fin, type_absence, motif)
VALUES (1, '2025-01-20', '2025-01-22', 'Congé', 'Vacances');
```

### Ajouter au planning
```sql
INSERT INTO planning_cuisine_unifie (
    employee_id, date, poste, creneau, heure_debut, heure_fin,
    poste_couleur, poste_icone
) VALUES (
    1, CURRENT_DATE, 'Sandwichs', '11h00-11h45', '11:00', '11:45',
    '#f59e0b', '🥪'
);
```

## 🚨 IMPORTANT

- ⚠️ **Sauvegarde automatique** : La migration crée une table `backup_ancien_schema`
- 🔒 **Sécurité** : RLS activé avec politiques permissives (à ajuster selon vos besoins)
- 📈 **Performance** : Index créés automatiquement
- 🔄 **Réversible** : Les anciennes tables restent intactes

## 🆘 EN CAS DE PROBLÈME

Si quelque chose ne va pas :
1. Les anciennes tables sont toujours là
2. Vous pouvez supprimer les nouvelles tables
3. Contactez le support technique

---

**🎉 Bon courage pour votre migration !** 