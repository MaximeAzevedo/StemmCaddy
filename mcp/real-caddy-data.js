#!/usr/bin/env node

// Données réelles de Caddy basées sur le tableau de Maxime
export const realEmployees = [
  { nom: 'Abdelaziz', profil: 'Moyen', langues: ['Arabe'], permis: false, etoiles: 1, email: 'abdelaziz@caddy.lu' },
  { nom: 'Tesfaldet', profil: 'Moyen', langues: ['Tigrinya'], permis: false, etoiles: 1, email: 'tesfaldet@caddy.lu' },
  { nom: 'Shadi', profil: 'Fort', langues: ['Arabe', 'Anglais', 'Français'], permis: false, etoiles: 2, email: 'shadi@caddy.lu' },
  { nom: 'Emahaston', profil: 'Fort', langues: ['Tigrinya', 'Français'], permis: false, etoiles: 2, email: 'emahaston@caddy.lu' },
  { nom: 'Hamed', profil: 'Moyen', langues: ['Perse', 'Anglais', 'Arabe'], permis: true, etoiles: 1, email: 'hamed@caddy.lu' },
  { nom: 'Soroosh', profil: 'Fort', langues: ['Perse'], permis: true, etoiles: 2, email: 'soroosh@caddy.lu' },
  { nom: 'Cemalettin', profil: 'Moyen', langues: ['Turc'], permis: false, etoiles: 1, email: 'cemalettin@caddy.lu' },
  { nom: 'Ahmad', profil: 'Moyen', langues: ['Arabe'], permis: true, etoiles: 1, email: 'ahmad@caddy.lu' },
  { nom: 'Juan', profil: 'Fort', langues: ['Arabe'], permis: true, etoiles: 2, email: 'juan@caddy.lu' },
  { nom: 'Basel', profil: 'Moyen', langues: ['Arabe', 'Anglais', 'Allemand'], permis: true, etoiles: 1, email: 'basel@caddy.lu' },
  { nom: 'Firas', profil: 'Fort', langues: ['Arabe'], permis: true, etoiles: 2, email: 'firas@caddy.lu' },
  { nom: 'José', profil: 'Fort', langues: ['Créole', 'Français'], permis: true, etoiles: 2, email: 'jose@caddy.lu' },
  { nom: 'Imad', profil: 'Moyen', langues: ['Arabe'], permis: true, etoiles: 1, email: 'imad@caddy.lu' },
  { nom: 'Mejrema', profil: 'Faible', langues: ['Yougoslave', 'Allemand'], permis: false, etoiles: 1, email: 'mejrema@caddy.lu' },
  { nom: 'Hassene', profil: 'Faible', langues: ['Arabe', 'Français'], permis: true, etoiles: 1, email: 'hassene@caddy.lu' },
  { nom: 'Tamara', profil: 'Faible', langues: ['Lux', 'Français'], permis: true, etoiles: 1, email: 'tamara@caddy.lu' },
  { nom: 'Elton', profil: 'Faible', langues: ['Yougoslave', 'Français'], permis: false, etoiles: 1, email: 'elton@caddy.lu' },
  { nom: 'Mersad', profil: 'Faible', langues: ['Yougoslave', 'Français'], permis: false, etoiles: 1, email: 'mersad@caddy.lu' },
  { nom: 'Siamak', profil: 'Fort', langues: ['Perse', 'Français', 'Anglais'], permis: true, etoiles: 2, email: 'siamak@caddy.lu' },
  { nom: 'Mojoos', profil: 'Faible', langues: ['Tigrinya'], permis: false, etoiles: 1, email: 'mojoos@caddy.lu' },
  { nom: 'Medhanie', profil: 'Fort', langues: ['Tigrinya', 'Anglais', 'Français'], permis: true, etoiles: 2, email: 'medhanie@caddy.lu' }
];

// Configuration des compétences selon le tableau réel
export const realCompetences = {
  'Crafter 23': {
    'XX': ['Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak'],
    'X': ['Abdelaziz', 'Tesfaldet', 'Cemalettin', 'Mojoos']
  },
  'Crafter 21': {
    'XX': ['Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak'],
    'X': ['Abdelaziz', 'Tesfaldet', 'Shadi', 'Cemalettin', 'Mojoos']
  },
  'Jumper': {
    'XX': ['Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak'],
    'X': ['Abdelaziz', 'Tesfaldet', 'Shadi', 'Cemalettin', 'Hassene', 'Tamara']
  },
  'Ducato': {
    'XX': ['Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Emahaston', 'Hamed', 'Soroosh', 'Siamak'],
    'X': ['Abdelaziz', 'Tesfaldet', 'Shadi', 'Cemalettin', 'Hassene', 'Tamara']
  },
  'Transit': {
    'X': ['Abdelaziz', 'Tesfaldet', 'Shadi', 'Emahaston', 'Hamed', 'Soroosh', 'Cemalettin', 'Ahmad', 'Juan', 'Basel', 'Firas', 'José', 'Imad', 'Mejrema', 'Hassene', 'Tamara', 'Elton', 'Mersad', 'Siamak', 'Mojoos', 'Medhanie']
  }
};

export const vehicles = [
  { nom: 'Crafter 21', capacite: 3, type: 'Collecte', couleur: '#3b82f6' },
  { nom: 'Crafter 23', capacite: 3, type: 'Collecte', couleur: '#10b981' },
  { nom: 'Jumper', capacite: 3, type: 'Collecte', couleur: '#8b5cf6' },
  { nom: 'Ducato', capacite: 3, type: 'Collecte', couleur: '#f59e0b' },
  { nom: 'Transit', capacite: 8, type: 'Formation', couleur: '#ef4444' }
]; 