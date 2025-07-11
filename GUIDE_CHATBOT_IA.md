# 🤖 Guide d'utilisation - Assistant IA Cuisine **AUTONOME**

## Vue d'ensemble

L'Assistant IA Cuisine est un chatbot intelligent **complètement autonome** qui permet de gérer toutes les opérations de planning cuisine via des commandes en langage naturel. Il est accessible via le bouton flottant orange en bas à droite de l'écran et peut maintenant **modifier directement la base de données**.

## 🚀 Fonctionnalités principales

### 1. Gestion des Absences ✅ **COMPLÈTE**
Déclarez facilement les absences et trouvez automatiquement des remplaçants.

**Commandes d'exemple :**
- `"Déclarer Jean absent demain"`
- `"Marie est absente le 15/12/2024"`
- `"Absence de Paul pour aujourd'hui"`
- `"Mettre Sophie en absence pour lundi"`
- `"Qui peut remplacer Paul ?"`

**Ce qui se passe automatiquement :**
- ✅ L'absence est enregistrée en base de données
- 🔄 L'IA supprime les assignations existantes conflictuelles
- 🎯 Des remplaçants qualifiés sont recherchés automatiquement avec scoring
- 📊 Le planning est mis à jour en temps réel
- 🔍 Suggestions priorisées par compatibilité (profil, langues, compétences)

### 2. Gestion des Compétences ✅ **COMPLÈTE**
Formez vos employés sur de nouveaux postes instantanément.

**Commandes d'exemple :**
- `"Former Paul sur Cuisine chaude"`
- `"Donner la compétence Vaisselle à Sophie"`
- `"Jean est formé sur Pain"`
- `"Certifier Emma en Légumerie"`
- `"Julie maîtrise maintenant la pâtisserie"`

**Validation automatique :**
- ✅ Vérification que l'employé existe
- ✅ Vérification que le poste existe
- ✅ Détection des compétences déjà acquises
- 📝 Enregistrement avec date de validation automatique
- 🎯 Mise à jour immédiate pour le planning

### 3. **🆕 Gestion Complète des Employés (NOUVEAU)**

#### ➕ **Ajout d'Employés**
Créez de nouveaux employés directement par la voix !

**Commandes d'exemple :**
- `"Ajouter employé Marie Dupont profil Moyen service Cuisine"`
- `"Créer employé Jean Martin profil Fort"`
- `"Embaucher Sophie Leblanc en Cuisine"`
- `"Recruter Paul Durand profil Faible"`

**Ce qui est créé automatiquement :**
- ✅ Enregistrement employé général
- ✅ Intégration au service cuisine si spécifié
- ✅ Profil et langues par défaut (Français)
- ✅ Date d'embauche automatique
- ✅ Statut "Actif" par défaut

#### ✏️ **Modification d'Employés**
Changez les profils et informations des employés existants.

**Commandes d'exemple :**
- `"Modifier Paul profil Fort"`
- `"Changer le profil de Marie en Moyen"`
- `"Paul devient statut Inactif"`
- `"Ajouter langue Anglais à Sophie"`
- `"Julie devient profil Faible"`

**Modifications possibles :**
- 🏷️ **Profils :** Faible, Moyen, Fort
- 📊 **Statuts :** Actif, Inactif, Formation
- 🌍 **Langues :** Ajout de nouvelles langues
- 📝 **Notes :** Informations additionnelles

#### ⚠️ **Suppression d'Employés (Sécurisée)**
Suppression avec confirmation obligatoire pour éviter les erreurs.

**Commandes d'exemple :**
- `"Supprimer employé Paul"`
- `"Retirer Marie de l'équipe"`
- `"Enlever employé Jean"`

**Processus de sécurité :**
1. 🔍 **Recherche et identification** de l'employé
2. ⚠️ **Affichage des impacts** (compétences, plannings, etc.)
3. 🔒 **Demande de confirmation explicite**
4. 💡 **Suggestion d'alternatives** (passer en "Inactif")

### 4. **🧠 Génération de Planning IA (RÉVOLUTIONNAIRE)**
Créez ou optimisez automatiquement les plannings avec intelligence artificielle avancée.

**Commandes d'exemple :**
- `"Générer le planning de la semaine"`
- `"Créer planning pour cette semaine"`
- `"Planning automatique optimisé"`
- `"Optimiser le planning"`

**Algorithme intelligent inclut :**
- 🎯 **Contraintes métier spécifiques** par poste
- ⚖️ **Équilibrage de la charge** de travail
- 🧠 **Respect des compétences** requises
- 🚫 **Gestion automatique** des absences
- 🔄 **Rotation intelligente** des employés
- 📈 **Priorisation** des postes critiques (Sandwiches)

**Contraintes Métier Intégrées :**
```
🥪 Sandwiches: 5-6 personnes (PRIORITÉ MAXIMALE)
🍽️ Vaisselle: exactement 3 personnes
🍛 Self Midi: exactement 2 personnes (créneaux spécifiques)
🍞 Pain: 2-3 personnes (très tôt le matin)
🔥 Cuisine chaude: 1-2 personnes (compétents uniquement)
🥤 Jus de fruits: 1-2 personnes
🥬 Légumerie: 1-2 personnes (préparation matinale)
👥 Équipe Pina et Saskia: 2-3 personnes (flexible)
```

**Résultats automatiques :**
- 📅 **Planning complet** Lundi-Vendredi
- 🌅 **Sessions** matin et après-midi
- ⏰ **Créneaux horaires** respectés par métier
- 💾 **Sauvegarde automatique** en base de données
- 📊 **Statistiques** de performance

### 5. Assignations Spécifiques ✅ **AMÉLIORÉE**
Assignez manuellement un employé à un poste avec validation intelligente.

**Commandes d'exemple :**
- `"Mettre Thomas sur Pain demain"`
- `"Assigner Emma à Légumerie"`
- `"Paul travaille sur Sandwichs aujourd'hui"`

### 6. Recherche d'Informations ✅ **ENRICHIE**
Obtenez des informations détaillées sur les employés et les postes.

**Commandes d'exemple :**
- `"Qui est Pierre ?"`
- `"Quelles sont les compétences de Marie ?"`
- `"Qui peut travailler sur Vaisselle ?"`
- `"Employés disponibles pour Cuisine chaude"`
- `"Analyser l'équipe"`
- `"Statistiques de compétences"`

## 🎮 Interface utilisateur

### Bouton Flottant **🆕 Amélioré**
- **Position :** Bas à droite de l'écran
- **Couleur :** Dégradé orange-rouge avec icône chef
- **Animation :** Étoile verte clignotante + rotation pendant traitement
- **Clic :** Ouvre l'interface du chatbot autonome

### Interface Chat **🆕 Modernisée**
- **Mode Compact :** Vue réduite pour usage rapide
- **Mode Expert :** Vue complète avec boutons rapides et options avancées
- **Bouton agrandir/réduire :** Basculer entre les modes
- **Indicateurs en temps réel :** Étapes de traitement IA visibles

### Commandes Rapides (mode expert) **🆕**
1. **Planning Auto** - Lance la génération automatique intelligente
2. **Analyser équipe** - Statistiques complètes avec recommandations
3. **Absence test** - Test rapide de déclaration d'absence
4. **Compétence test** - Test de formation employé

### Reconnaissance Vocale **🆕 Améliorée**
- **Bouton micro :** Activer/désactiver la reconnaissance vocale
- **Langue :** Français (fr-FR) optimisé
- **Feedback visuel :** Bouton rouge pulsant pendant l'écoute
- **Synthèse vocale :** Les réponses sont lues automatiquement
- **Nettoyage intelligent :** Suppression des emojis pour la lecture

## 📝 Format des Commandes **🆕 Étendues**

### Formats d'Employés
L'IA comprend plusieurs formats pour les employés :
- **Prénom seul :** "Jean", "Marie"
- **Nom seul :** "Dupont", "Martin"
- **Prénom + Nom :** "Jean Dupont"
- **Nom + Prénom :** "Dupont Jean"
- **Recherche floue :** Trouve même avec fautes de frappe

### Formats de Profils
- **Profils valides :** Faible, Moyen, Fort
- **Variations acceptées :** "faible", "FORT", "moyen"
- **Reconnaissance contextuelle :** "Paul devient fort" = "Paul profil Fort"

### Formats de Services
- **Services cuisine :** Cuisine, Mixte, Logistique
- **Auto-détection :** Intégration automatique selon le contexte

### Dates **🆕 Intelligence améliorée**
L'IA comprend plusieurs formats de dates :
- **Naturel :** "aujourd'hui", "demain", "lundi", "cette semaine"
- **Français :** "15/12/2024", "le 25 janvier"
- **ISO :** "2024-12-15"
- **Relatif :** "cette semaine", "la semaine prochaine"
- **Implicite :** Si pas de date = aujourd'hui

### Postes de Cuisine **🆕 Complets**
Postes reconnus automatiquement avec variantes :
- **Cuisine chaude** (variations: "cuisine", "chaude", "cuisson")
- **Sandwichs** (variations: "sandwich", "sandwiches", "froid")
- **Pain** (variations: "boulangerie", "viennoiserie")
- **Jus de fruits** (variations: "jus", "fruits", "boissons")
- **Vaisselle** (variations: "plonge", "nettoyage")
- **Légumerie** (variations: "légumes", "légumerie", "préparation")
- **Self Midi** (variations: "self", "service midi")
- **Equipe Pina et Saskia** (variations: "pina", "saskia", "équipe spéciale")

## ⚡ Exemples de Conversations **🆕 Avancées**

### Scénario 1 : Gestion d'absence avec remplacement automatique
```
👤 Utilisateur: "Paul est absent aujourd'hui"
🤖 Assistant: "✅ Paul Dubois déclaré absent le 15/12/2024. 
             J'ai trouvé 3 remplaçants qualifiés :
             1. Sophie (Fort) - Score 95% - Langues communes
             2. Marie (Moyen) - Score 87% - Même profil
             3. Jean (Moyen) - Score 82% - Disponible
             
             ⚡ Planning automatiquement réorganisé.
             🥪 Sandwiches: couverture maintenue (5 personnes)
             🍽️ Tous les postes critiques assurés"
```

### Scénario 2 : Formation sur nouveau poste avec impact
```
👤 Utilisateur: "Former Marie sur Cuisine chaude"
🤖 Assistant: "✅ Marie Martin est maintenant formée sur Cuisine chaude !
             🎯 Compétence validée et enregistrée
             📅 Date: 15/12/2024
             
             💡 Impact immédiat:
             • Disponible pour ce poste dès maintenant
             • +1 personne qualifiée Cuisine chaude
             • Rotation d'équipe améliorée
             • Prise en compte dans les futurs plannings IA"
```

### Scénario 3 : Génération de planning complet
```
👤 Utilisateur: "Générer le planning de la semaine"
🤖 Assistant: "🎯 Planning IA généré avec succès !
             📅 Semaine du 16/12/2024
             
             📊 Résultats:
             • 87 assignations créées
             • 42 créneaux matin, 45 créneaux après-midi
             • 15 employés disponibles utilisés
             • 28 compétences utilisées
             
             🎯 Optimisations appliquées:
             • Sandwiches: priorité maximale respectée
             • Équilibrage: charge équitable par employé
             • Compétences: 100% respectées
             • Absences: automatiquement gérées
             • Rotation: intelligente et équitable
             
             ▶️ Le planning est maintenant actif et visible dans l'interface."
```

### Scénario 4 : Ajout d'employé complet
```
👤 Utilisateur: "Ajouter employé Sophie Durand profil Fort service Cuisine"
🤖 Assistant: "✅ Employé ajouté avec succès !
             
             👤 Sophie Durand
             🏷️ Profil: Fort
             🍳 Service: Cuisine
             📅 Date d'embauche: 15/12/2024
             
             💡 Prochaines étapes :
             • Former l'employé sur les postes nécessaires
             • Ajouter les compétences spécifiques
             • Intégrer au planning de la semaine prochaine"
```

### Scénario 5 : Recherche d'informations avancée
```
👤 Utilisateur: "Qui peut travailler sur Vaisselle ?"
🤖 Assistant: "👥 Employés qualifiés pour Vaisselle :

             🌟 Jean Dupont (Fort) - Expert vaisselle
             ⭐ Sophie Martin (Moyen) - Formée récemment
             ⭐ Paul Dubois (Moyen) - Expérience solide
             📍 Marie Leblanc (Faible) - En formation
             
             📊 4 employés disponibles sur ce poste.
             💡 Recommandation: Jean ou Sophie pour les heures de pointe."
```

## 🔧 Fonctionnalités Techniques **🆕 Avancées**

### Intelligence Artificielle Multi-Niveaux
- **Niveau 1 :** Reconnaissance de patterns (+15 nouveaux patterns)
- **Niveau 2 :** Parsing de dates et noms avec intelligence contextuelle
- **Niveau 3 :** Recherche floue avec suggestions de correction
- **Niveau 4 :** Gestion d'erreurs avec messages d'aide contextuels
- **Niveau 5 :** Apprentissage des préférences utilisateur

### Intégration Supabase **🆕 Robuste**
- **Temps réel :** Modifications instantanées en base
- **Transactions atomiques :** Opérations sécurisées
- **Rollback automatique :** Gestion des erreurs avec restauration
- **Cache local optimisé :** Performance maximale
- **Validation des contraintes :** Respect des règles métier

### Feedback Utilisateur **🆕 Enrichi**
- **Toasts intelligents :** Notifications visuelles contextuelles
- **Synthèse vocale :** Lecture automatique des réponses
- **Icônes dynamiques :** Code couleur pour le statut des messages
- **Horodatage :** Chaque interaction est datée
- **Métriques de performance :** Temps d'exécution affiché
- **Feedback direct :** Pouces haut/bas pour l'apprentissage

### Sécurité et Traçabilité **🆕**
- **Logging complet :** Toutes les actions sont enregistrées
- **Confirmation obligatoire :** Pour les actions critiques (suppression)
- **Audit trail :** Historique des modifications
- **Gestion d'erreurs :** Messages explicites et solutions proposées

## 🆘 Aide et Support **🆕 Contextuelle**

### Commande d'aide intelligente
Tapez `"aide"` pour obtenir la liste complète des commandes disponibles avec exemples contextuels.

### Gestion d'erreurs proactive
L'IA fournit des messages d'erreur explicites et constructifs :
- ❌ **Employé non trouvé** → Liste des employés similaires
- ❌ **Poste non reconnu** → Postes disponibles avec suggestions
- ❌ **Format incorrect** → Exemples de formats valides
- ❌ **Contrainte violée** → Explication de la règle métier

### Auto-apprentissage
- 📚 **Mémorisation** des commandes utilisées fréquemment
- 🎯 **Adaptation** aux préférences de l'utilisateur
- 📈 **Amélioration continue** des suggestions
- 🔄 **Feedback loop** pour optimiser les réponses

## 🎉 **NOUVEAUTÉS MAJEURES 2024**

### 🚀 **Autonomie Complète**
L'assistant peut maintenant :
- ✅ Créer, modifier, supprimer des employés
- ✅ Générer des plannings complets automatiquement
- ✅ Prendre des décisions intelligentes en autonomie
- ✅ Apprendre et s'améliorer continuellement

### 🧠 **Intelligence Artificielle Avancée**
- ✅ Algorithmes d'optimisation multi-critères
- ✅ Scoring intelligent pour suggestions de remplacements
- ✅ Apprentissage des préférences utilisateur
- ✅ Prédiction et prévention des conflits

### 🔧 **Intégration Métier Poussée**
- ✅ Contraintes métier spécifiques par poste
- ✅ Règles de priorisation des services critiques
- ✅ Gestion automatique des compétences requises
- ✅ Optimisation de la charge de travail

---

## 📞 **Support et Formation**

Pour toute question ou formation à ces nouvelles fonctionnalités, n'hésitez pas à :
1. **Utiliser la commande** `"aide"` dans le chat
2. **Tester les exemples** fournis dans ce guide
3. **Explorer progressivement** les nouvelles capacités
4. **Donner du feedback** avec les pouces haut/bas

**💡 L'assistant apprend de vos interactions et s'améliore automatiquement !** 