import type { Intervenant, Contrainte, CreneauCode } from '../types/database';

export interface IntervenantAvecContraintes extends Intervenant {
  contraintes: Contrainte[];
}

export interface ScoreEquiteState {
  intervenant_id: string;
  jours_travailles: number;
  nuits_effectuees: number;
  weekends_travailles: number;
  score_composite: number;
}

export interface AffectationResult {
  intervenant_id: string;
  creneau_code: CreneauCode;
  date: string;
}

export interface AlerteGeneration {
  date: string;
  creneau_code: CreneauCode;
  message: string;
  niveau: 'warning' | 'error';
}

export interface PlanningGenerationResult {
  affectations: AffectationResult[];
  scores: ScoreEquiteState[];
  alertes: AlerteGeneration[];
}

export interface CongeApprouve {
  intervenant_id: string;
  date_debut: string;
  date_fin: string;
}

export interface PoidsEquite {
  jours: number;
  nuits: number;
  weekends: number;
}
