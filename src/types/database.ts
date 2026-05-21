export type CreneauCode = 'AM_MENA' | 'APM' | 'NUIT' | 'WE';
export type RoleIntervenant = 'principale' | 'aide' | 'am';
export type RoleApp = 'gestionnaire' | 'intervenant';
export type ContrainteType = 'hard' | 'soft' | 'quota';
export type PlanningStatut = 'brouillon' | 'validé';
export type AffectationStatut = 'confirmé' | 'remplacé' | 'absent';
export type CongeStatut = 'en_attente' | 'approuvé' | 'refusé';
export type RemplacementStatut = 'proposé' | 'accepté' | 'refusé';

export interface Creneau {
  id: string;
  code: CreneauCode;
  label: string;
  heure_debut: string;
  heure_fin: string;
  jours_semaine: number[];
  created_at: string;
}

export interface Intervenant {
  id: string;
  user_id: string | null;
  nom: string;
  prenom: string;
  email: string;
  role: RoleIntervenant;
  actif: boolean;
  created_at: string;
}

export interface Contrainte {
  id: string;
  intervenant_id: string;
  type: ContrainteType;
  creneau_code: CreneauCode;
  valeur: string;
  periode: 'jour' | 'semaine' | 'mois' | null;
  jours_semaine: number[] | null;
  description: string | null;
  created_at: string;
}

export interface Planning {
  id: string;
  mois: number;
  annee: number;
  statut: PlanningStatut;
  created_at: string;
  validated_at: string | null;
}

export interface Affectation {
  id: string;
  planning_id: string;
  intervenant_id: string;
  creneau_code: CreneauCode;
  date: string;
  statut: AffectationStatut;
  created_at: string;
}

export interface Conge {
  id: string;
  intervenant_id: string;
  date_debut: string;
  date_fin: string;
  motif: string | null;
  statut: CongeStatut;
  created_at: string;
}

export interface Desistement {
  id: string;
  affectation_id: string;
  intervenant_id: string;
  date_declaration: string;
  motif: string | null;
  created_at: string;
}

export interface Remplacement {
  id: string;
  desistement_id: string;
  intervenant_remplacant_id: string;
  statut: RemplacementStatut;
  notifie_le: string;
  repondu_le: string | null;
  created_at: string;
}

export interface ScoreEquite {
  id: string;
  planning_id: string;
  intervenant_id: string;
  jours_travailles: number;
  nuits_effectuees: number;
  weekends_travailles: number;
  score_composite: number;
  updated_at: string;
}

export interface Notification {
  id: string;
  intervenant_id: string;
  type: string;
  message: string;
  lu: boolean;
  created_at: string;
}

export interface Parametre {
  id: string;
  cle: string;
  valeur: string;
  description: string | null;
  created_at: string;
}

export interface Profil {
  id: string;
  role: RoleApp;
  intervenant_id: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      creneaux: { Row: Creneau; Insert: Omit<Creneau, 'id' | 'created_at'>; Update: Partial<Omit<Creneau, 'id'>> };
      intervenants: { Row: Intervenant; Insert: Omit<Intervenant, 'id' | 'created_at'>; Update: Partial<Omit<Intervenant, 'id'>> };
      contraintes: { Row: Contrainte; Insert: Omit<Contrainte, 'id' | 'created_at'>; Update: Partial<Omit<Contrainte, 'id'>> };
      plannings: { Row: Planning; Insert: Omit<Planning, 'id' | 'created_at'>; Update: Partial<Omit<Planning, 'id'>> };
      affectations: { Row: Affectation; Insert: Omit<Affectation, 'id' | 'created_at'>; Update: Partial<Omit<Affectation, 'id'>> };
      conges: { Row: Conge; Insert: Omit<Conge, 'id' | 'created_at'>; Update: Partial<Omit<Conge, 'id'>> };
      desistements: { Row: Desistement; Insert: Omit<Desistement, 'id' | 'created_at'>; Update: Partial<Omit<Desistement, 'id'>> };
      remplacements: { Row: Remplacement; Insert: Omit<Remplacement, 'id' | 'created_at'>; Update: Partial<Omit<Remplacement, 'id'>> };
      scores_equite: { Row: ScoreEquite; Insert: Omit<ScoreEquite, 'id'>; Update: Partial<Omit<ScoreEquite, 'id'>> };
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Omit<Notification, 'id'>> };
      parametres: { Row: Parametre; Insert: Omit<Parametre, 'id' | 'created_at'>; Update: Partial<Omit<Parametre, 'id'>> };
      profils: { Row: Profil; Insert: Omit<Profil, 'created_at'>; Update: Partial<Omit<Profil, 'id'>> };
    };
  };
}
