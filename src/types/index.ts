/**
 * ========================================
 * TYPES TYPESCRIPT - CADDY API
 * ========================================
 * 
 * Définit toutes les interfaces et types utilisés
 * dans l'application pour assurer la cohérence
 */

// ==================== TYPES DE BASE ====================

export type ServiceType = 'cuisine' | 'logistique' | 'secretariat';
export type SessionType = 'matin' | 'apres-midi';
export type ProfileType = 'Fort' | 'Moyen' | 'Faible';
export type AbsenceType = 'Maladie' | 'Congé' | 'Formation' | 'Absent';
export type AbsenceStatus = 'En attente' | 'Confirmée' | 'Refusée';

// ==================== EMPLOYÉS ====================

export interface EmployeeCuisine {
  id: number;
  prenom: string;
  langue_parlee?: string;
  photo_url?: string;
  actif: boolean;
  
  // Horaires de travail
  lundi_debut?: string;
  lundi_fin?: string;
  mardi_debut?: string;
  mardi_fin?: string;
  mercredi_debut?: string;
  mercredi_fin?: string;
  jeudi_debut?: string;
  jeudi_fin?: string;
  vendredi_debut?: string;
  vendredi_fin?: string;
  samedi_debut?: string;
  samedi_fin?: string;
  dimanche_debut?: string;
  dimanche_fin?: string;
  
  // Compétences (colonnes booléennes)
  cuisine_chaude?: boolean;
  sandwichs?: boolean;
  pain?: boolean;
  jus_de_fruits?: boolean;
  vaisselle?: boolean;
  legumerie?: boolean;
  self_midi?: boolean;
  equipe_pina_saskia?: boolean;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeLogistique {
  id: number;
  nom: string;
  profil: ProfileType;
  langues: string[];
  permis: boolean;
  photo?: string | null;
  email?: string;
  telephone?: string;
  actif?: boolean;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// ==================== PLANNING ====================

export interface PosteCuisine {
  id: number;
  nom: string;
  couleur: string;
  icone: string;
  min_employes?: number;
  max_employes?: number;
  priorite?: number;
}

export interface CreneauCuisine {
  id: number;
  nom: string;
  heure_debut?: string;
  heure_fin?: string;
  session?: SessionType;
}

export interface PlanningCuisineEntry {
  id?: number;
  date: string;
  session: SessionType;
  poste_nom: string;
  creneau_nom: string;
  employee_id: number;
  notes?: string;
  
  // Jointures (optionnelles)
  employee?: EmployeeCuisine;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

export interface PlanningLogistiqueEntry {
  id?: number;
  date: string;
  employee_id: number;
  vehicle_id: number;
  role?: string;
  notes?: string;
  
  // Jointures (optionnelles)
  employee?: EmployeeLogistique;
  vehicle?: Vehicle;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// Structure pour l'état local du planning (drag & drop)
export interface PlanningBoard {
  [posteNom: string]: {
    [creneauNom: string]: EmployeeCuisine[];
  };
}

// ==================== ABSENCES ====================

export interface AbsenceCuisine {
  id?: number;
  employee_id: number;
  date_debut: string;
  date_fin: string;
  type_absence: AbsenceType;
  motif?: string;
  
  // Jointures (optionnelles)
  employee?: EmployeeCuisine;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

export interface AbsenceLogistique {
  id?: number;
  employee_id: number;
  date_debut: string;
  date_fin: string;
  type_absence: AbsenceType;
  statut: AbsenceStatus;
  motif?: string;
  
  // Jointures (optionnelles)
  employee?: EmployeeLogistique;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// ==================== LOGISTIQUE ====================

export interface Vehicle {
  id: number;
  nom: string;
  capacite: number;
  type?: string;
  actif?: boolean;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

export interface Competence {
  id?: number;
  employee_id: number;
  vehicle_id: number;
  niveau: number; // 0: Aucun, 1: Capable, 2: Expert (XX)
  date_obtention?: string;
  
  // Jointures (optionnelles)
  employee?: EmployeeLogistique;
  vehicle?: Vehicle;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// ==================== SECRÉTARIAT ====================

export interface DenreeAlimentaire {
  id?: number;
  fournisseur: string;
  mois: number;
  annee: number;
  quantite: number;
  unite?: string;
  type_denree?: string;
  prix?: number;
  notes?: string;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

// ==================== AUTHENTIFICATION ====================

export interface User {
  id: string;
  email?: string;
  nom?: string;
  role?: string;
  service?: ServiceType;
  
  // Métadonnées Supabase
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// ==================== RÉPONSES API ====================

export interface APIResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface APIListResponse<T> {
  data: T[];
  error: Error | null;
}

// Réponses spécialisées
export type EmployeesResponse = APIListResponse<EmployeeCuisine | EmployeeLogistique>;
export type PlanningResponse = APIListResponse<PlanningCuisineEntry | PlanningLogistiqueEntry>;
export type AbsencesResponse = APIListResponse<AbsenceCuisine | AbsenceLogistique>;
export type VehiclesResponse = APIListResponse<Vehicle>;
export type CompetencesResponse = APIListResponse<Competence>;
export type DenreesResponse = APIListResponse<DenreeAlimentaire>;

// ==================== ÉTAT GLOBAL (pour Zustand) ====================

export interface GlobalState {
  // Données
  employees: {
    cuisine: EmployeeCuisine[];
    logistique: EmployeeLogistique[];
  };
  planning: {
    cuisine: PlanningBoard;
    logistique: PlanningLogistiqueEntry[];
  };
  absences: {
    cuisine: AbsenceCuisine[];
    logistique: AbsenceLogistique[];
  };
  vehicles: Vehicle[];
  competences: Competence[];
  denrees: DenreeAlimentaire[];
  
  // États UI
  loading: {
    employees: boolean;
    planning: boolean;
    absences: boolean;
    vehicles: boolean;
    competences: boolean;
    denrees: boolean;
  };
  
  // Sélections actives
  selectedDate: Date;
  selectedSession: SessionType;
  selectedService: ServiceType;
  
  // Utilisateur connecté
  user: User | null;
  
  // Métadonnées
  lastUpdate: Date | null;
  hasUnsavedChanges: boolean;
}

// ==================== ACTIONS ZUSTAND ====================

export interface GlobalActions {
  // Chargement des données
  loadEmployees: (service: ServiceType) => Promise<void>;
  loadPlanning: (service: ServiceType, date: string, session?: SessionType) => Promise<void>;
  loadAbsences: (service: ServiceType, startDate: string, endDate: string) => Promise<void>;
  loadVehicles: () => Promise<void>;
  loadCompetences: () => Promise<void>;
  loadDenrees: (annee?: number) => Promise<void>;
  
  // Mise à jour des données
  updateEmployee: (service: ServiceType, id: number, updates: Partial<EmployeeCuisine | EmployeeLogistique>) => Promise<void>;
  updatePlanning: (service: ServiceType, planningData: PlanningBoard | PlanningLogistiqueEntry[]) => Promise<void>;
  createAbsence: (service: ServiceType, absenceData: Partial<AbsenceCuisine | AbsenceLogistique>) => Promise<void>;
  updateAbsence: (service: ServiceType, id: number, updates: Partial<AbsenceCuisine | AbsenceLogistique>) => Promise<void>;
  deleteAbsence: (service: ServiceType, id: number) => Promise<void>;
  
  // Sélections
  setSelectedDate: (date: Date) => void;
  setSelectedSession: (session: SessionType) => void;
  setSelectedService: (service: ServiceType) => void;
  
  // Authentification
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  
  // Utilitaires
  resetState: () => void;
  markAsUnsaved: () => void;
  markAsSaved: () => void;
}

// ==================== PROPS DE COMPOSANTS ====================

export interface BaseComponentProps {
  user?: User | null;
  onLogout?: () => void;
}

export interface EmployeeManagementProps extends BaseComponentProps {
  service: ServiceType;
  onEmployeeSelect?: (employee: EmployeeCuisine | EmployeeLogistique) => void;
}

export interface PlanningProps extends BaseComponentProps {
  service: ServiceType;
  date: Date;
  session?: SessionType;
  onPlanningChange?: (planning: PlanningBoard | PlanningLogistiqueEntry[]) => void;
}

export interface AbsenceManagementProps extends BaseComponentProps {
  service: ServiceType;
  employees: EmployeeCuisine[] | EmployeeLogistique[];
  onAbsenceCreate?: (absence: AbsenceCuisine | AbsenceLogistique) => void;
}

// ==================== CONFIGURATIONS ====================

export interface PosteRule {
  nom: string;
  min: number;
  max: number;
  priority: number;
  competencesRequises?: string[];
  languesPreferees?: string[];
}

export interface SessionConfig {
  nom: string;
  heureDebut: string;
  heureFin: string;
  creneaux: string[];
  postesActifs: string[];
}

export interface PlanningConfig {
  postes: PosteRule[];
  sessions: Record<SessionType, SessionConfig>;
  regles: {
    maxHeuresParSemaine: number;
    minReposEntreServices: number;
    rotationObligatoire: boolean;
  };
}

// ==================== EXPORT DES TYPES STORE ====================

export type CaddyStore = GlobalState & GlobalActions; 