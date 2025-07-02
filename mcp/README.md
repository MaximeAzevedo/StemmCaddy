# 🤖 MCP Caddy - Integration IA ↔ Supabase

## 🎯 Qu'est-ce que MCP ?

**Model Context Protocol (MCP)** permet à l'IA d'interagir directement avec Supabase pour gérer votre base de données Caddy de manière native et intelligente.

## 🚀 Avantages MCP vs Scripts classiques

| Classique | MCP |
|-----------|-----|
| Scripts fixes | IA adaptative |
| Erreurs obscures | Diagnostics intelligents |
| Une seule action | Actions composées |
| Configuration manuelle | Configuration assistée |

## 🔧 Configuration

1. **Variables d'environnement** (fichier `.env`)
```bash
REACT_APP_SUPABASE_URL=https://cmmfaatcdtbmcmjnegyn.supabase.co
SUPABASE_SERVICE_KEY=votre_cle_service
```

2. **Test de connexion**
```bash
npm run mcp:test
```

## 🎮 Commandes disponibles

### 📊 Diagnostic
```bash
npm run mcp:test        # Tester la connexion
npm run mcp:status      # État du serveur
```

### 🚀 Démarrage  
```bash
npm run mcp:start       # Démarrer le serveur MCP
```

## 🤖 Outils MCP disponibles

L'IA peut maintenant utiliser ces outils automatiquement :

### 🗄️ `create_caddy_database`
- Crée toutes les tables (vehicles, employees, competences, planning)
- Gère les contraintes et index automatiquement

### 📊 `insert_caddy_data`  
- Insère vos 5 véhicules de flotte
- Insère vos 14 employés avec profils/langues
- Configure les compétences selon vos tableaux Excel

### 🔍 `get_database_status`
- Vérifie l'état de chaque table
- Compte les enregistrements
- Détecte les problèmes

### 👤 `create_user_account`
- Crée des comptes Supabase
- Configure les métadonnées utilisateur
- Gère les permissions

### 🗑️ `reset_database`
- Vide toutes les tables (garde la structure)
- Utile pour recommencer à zéro

## 💡 Utilisation avec l'IA

Demandez simplement à l'IA :
- *"Crée ma base de données Caddy"*
- *"Vérifie l'état de ma base"*  
- *"Insère mes données d'employés"*
- *"Crée mon compte maxime@caddy.lu"*

L'IA utilisera automatiquement les bons outils MCP !

## 🔧 Dépannage

### Erreur "fetch failed"
✅ Normal si les tables n'existent pas encore
📝 Solution : Demander à l'IA de créer la base

### Variables d'environnement manquantes
```bash
❌ Variables d'environnement Supabase manquantes !
```
📝 Vérifiez votre fichier `.env`

### Erreurs de permissions
📝 Vérifiez que `SUPABASE_SERVICE_KEY` est correct

## 🎯 Prochaines étapes

1. **Démarrer MCP** : `npm run mcp:start`
2. **Demander à l'IA** de configurer votre base
3. **Profiter** de la gestion intelligente ! 🚀 