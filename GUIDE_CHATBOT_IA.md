# 🤖 Guide d'utilisation - Assistant IA Cuisine

## Vue d'ensemble

L'Assistant IA Cuisine est un chatbot intelligent qui permet de gérer toutes les opérations de planning cuisine via des commandes en langage naturel. Il est accessible via le bouton flottant violet en bas à droite de l'écran.

## 🚀 Fonctionnalités principales

### 1. Gestion des Absences
Déclarez facilement les absences et trouvez automatiquement des remplaçants.

**Commandes d'exemple :**
- `"Déclarer Jean absent demain"`
- `"Marie est absente le 15/12/2024"`
- `"Absence de Paul pour aujourd'hui"`
- `"Mettre Sophie en absence pour lundi"`

**Ce qui se passe :**
- ✅ L'absence est enregistrée automatiquement
- 🔄 L'IA supprime les assignations existantes
- 🎯 Des remplaçants qualifiés sont recherchés automatiquement
- 📊 Le planning est mis à jour en temps réel

### 2. Gestion des Compétences
Formez vos employés sur de nouveaux postes instantanément.

**Commandes d'exemple :**
- `"Former Paul sur Cuisine chaude"`
- `"Donner la compétence Vaisselle à Sophie"`
- `"Jean est formé sur Pain"`
- `"Certifier Emma en Légumerie"`

**Validation automatique :**
- ✅ Vérification que l'employé existe
- ✅ Vérification que le poste existe
- ✅ Détection des compétences déjà acquises
- 📝 Enregistrement avec date de validation

### 3. Modification de Profils
Changez le niveau de compétence des employés.

**Commandes d'exemple :**
- `"Changer le profil de Marc en Fort"`
- `"Julie devient Moyenne"`
- `"Passer Thomas en Faible"`

**Profils disponibles :** Faible, Moyen, Fort

### 4. Génération de Planning
Créez ou optimisez automatiquement les plannings.

**Commandes d'exemple :**
- `"Générer le planning cette semaine"`
- `"Créer planning pour demain"`
- `"Planning automatique"`
- `"Optimiser le planning"`

**Algorithme intelligent :**
- 🧠 Prise en compte des compétences
- ⚖️ Équilibrage de la charge de travail
- 🎯 Respect des préférences par profil
- 🚫 Gestion automatique des absences

### 5. Assignations Spécifiques
Assignez manuellement un employé à un poste.

**Commandes d'exemple :**
- `"Mettre Thomas sur Pain demain"`
- `"Assigner Emma à Légumerie"`
- `"Paul travaille sur Sandwichs aujourd'hui"`

### 6. Recherche d'Informations
Obtenez des informations sur les employés et les postes.

**Commandes d'exemple :**
- `"Qui est Pierre ?"`
- `"Quelles sont les compétences de Marie ?"`
- `"Qui peut travailler sur Vaisselle ?"`
- `"Employés disponibles pour Cuisine chaude"`

## 🎮 Interface utilisateur

### Bouton Flottant
- **Position :** Bas à droite de l'écran
- **Couleur :** Violet avec icône robot
- **Animation :** Clignotement pendant traitement
- **Clic :** Ouvre l'interface du chatbot

### Interface Chat
- **Mode Compact :** Vue réduite pour usage rapide
- **Mode Étendu :** Vue complète avec boutons rapides
- **Bouton agrandir/réduire :** Basculer entre les modes

### Commandes Rapides (mode étendu)
1. **Générer planning** - Lance la génération automatique
2. **Qui est absent ?** - Liste les absences du jour
3. **Optimiser** - Optimise le planning existant
4. **Aide** - Affiche l'aide complète

### Reconnaissance Vocale
- **Bouton micro :** Activer/désactiver la reconnaissance vocale
- **Langue :** Français (fr-FR)
- **Feedback visuel :** Bouton rouge pendant l'écoute
- **Synthèse vocale :** Les réponses sont lues automatiquement

## 📝 Format des Commandes

### Dates
L'IA comprend plusieurs formats de dates :
- **Naturel :** "aujourd'hui", "demain", "lundi"
- **Français :** "15/12/2024", "le 25 janvier"
- **ISO :** "2024-12-15"
- **Relatif :** "cette semaine", "la semaine prochaine"

### Noms d'Employés
- **Prénom seul :** "Jean", "Marie"
- **Nom seul :** "Dupont", "Martin"
- **Prénom + Nom :** "Jean Dupont"
- **Nom + Prénom :** "Dupont Jean"

### Postes de Cuisine
Postes reconnus automatiquement :
- Cuisine chaude
- Sandwichs
- Pain
- Jus de fruits
- Vaisselle
- Légumerie

## ⚡ Exemples de Conversations

### Scénario 1 : Gestion d'absence avec remplacement
```
👤 Utilisateur: "Paul est absent aujourd'hui"
🤖 Assistant: "✅ Paul Dubois déclaré absent le 15/12/2024. 2 remplacements trouvés automatiquement."
```

### Scénario 2 : Formation sur nouveau poste
```
👤 Utilisateur: "Former Marie sur Cuisine chaude"
🤖 Assistant: "✅ Marie Martin est maintenant formée sur Cuisine chaude !"
```

### Scénario 3 : Génération de planning
```
👤 Utilisateur: "Générer le planning cette semaine"
🤖 Assistant: "✅ Planning généré avec succès ! 45 assignations créées. Semaine du 11/12/2024."
```

### Scénario 4 : Recherche d'informations
```
👤 Utilisateur: "Qui peut travailler sur Vaisselle ?"
🤖 Assistant: "👥 Employés formés sur Vaisselle :
• Jean Dupont (Fort)
• Sophie Martin (Moyen)
• Paul Dubois (Moyen)"
```

## 🔧 Fonctionnalités Techniques

### Intelligence Artificielle
- **Reconnaissance de patterns :** Expressions régulières avancées
- **Parsing de dates :** Compréhension du langage naturel
- **Recherche floue :** Trouve les employés même avec fautes de frappe
- **Gestion d'erreurs :** Messages d'aide contextuels

### Intégration Supabase
- **Temps réel :** Modifications instantanées en base
- **Transactions :** Opérations atomiques
- **Rollback :** Gestion des erreurs avec restauration
- **Cache local :** Performance optimisée

### Feedback Utilisateur
- **Toasts :** Notifications visuelles
- **Sons :** Synthèse vocale des réponses
- **Icônes :** Code couleur pour le statut des messages
- **Temps :** Horodatage de chaque interaction

## 🆘 Aide et Support

### Commande d'aide
Tapez `"aide"` pour obtenir la liste complète des commandes disponibles.

### Gestion d'erreurs
L'IA fournit des messages d'erreur explicites :
- ❌ Employé non trouvé → Liste des employés similaires
- ❌ Poste invalide → Liste des postes disponibles
- ❌ Date incorrecte → Formats acceptés
- ❌ Erreur technique → Suggestion de réessayer

### Messages de feedback
- ✅ **Succès :** Opération réussie
- ❌ **Erreur :** Problème rencontré
- ℹ️ **Information :** Détails supplémentaires
- ❓ **Aide :** Commande non reconnue

## 🔮 Évolutions Futures

### Fonctionnalités prévues
- 📊 Génération de rapports automatiques
- 📱 Notifications push pour les changements
- 🔄 Synchronisation multi-appareils
- 🎯 Suggestions proactives
- 📈 Analyses prédictives

### Améliorations de l'IA
- 🧠 Apprentissage des préférences utilisateur
- 🔍 Recherche sémantique avancée
- 💬 Contexte de conversation étendu
- 🌐 Support multilingue

---

**💡 Astuce :** L'Assistant IA est conçu pour être intuitif. N'hésitez pas à utiliser un langage naturel - il comprendra très bien vos intentions !

**🚀 Raccourci :** Pour un accès rapide, utilisez les boutons de commandes rapides en mode étendu.

**🎯 Performance :** L'IA traite les commandes en quelques secondes et met à jour le planning en temps réel. 