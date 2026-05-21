import type { CreneauCode, Creneau } from '../types/database';
import type {
  IntervenantAvecContraintes,
  ScoreEquiteState,
  AffectationResult,
  AlerteGeneration,
  PlanningGenerationResult,
  CongeApprouve,
  PoidsEquite,
} from './types';

function getDaysInMonth(annee: number, mois: number): string[] {
  const days: string[] = [];
  const count = new Date(annee, mois, 0).getDate();
  for (let d = 1; d <= count; d++) {
    const date = new Date(annee, mois - 1, d);
    days.push(date.toISOString().split('T')[0]);
  }
  return days;
}

// 1=Lundi ... 7=Dimanche (ISO, utilise par la table creneaux.jours_semaine)
function getISODayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

// 0=Lundi ... 6=Dimanche (utilise par la table contraintes.jours_semaine)
function getContrainteDayOfWeek(dateStr: string): number {
  const iso = getISODayOfWeek(dateStr);
  return iso - 1; // 1-7 -> 0-6
}

function isWeekend(dateStr: string): boolean {
  const dow = getISODayOfWeek(dateStr);
  return dow >= 6;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function isEnConge(intervenantId: string, dateStr: string, conges: CongeApprouve[]): boolean {
  return conges.some(c =>
    c.intervenant_id === intervenantId &&
    dateStr >= c.date_debut &&
    dateStr <= c.date_fin
  );
}

function getCreneauxDuJour(dateStr: string, creneaux: Creneau[]): Creneau[] {
  const dow = getISODayOfWeek(dateStr);
  return creneaux.filter(c => c.jours_semaine.includes(dow));
}

// Verifie si une contrainte s'applique a un jour donne
// Si jours_semaine est null, la contrainte s'applique tous les jours
function contrainteAppliqueAuJour(contrainteJours: number[] | null, dateStr: string): boolean {
  if (!contrainteJours || contrainteJours.length === 0) return true;
  return contrainteJours.includes(getContrainteDayOfWeek(dateStr));
}

// Verifie si un creneau+jour est interdit pour un intervenant
function isInterditPourJour(
  intervenant: IntervenantAvecContraintes,
  creneauCode: CreneauCode,
  dateStr: string
): boolean {
  return intervenant.contraintes.some(
    c => c.type === 'hard' &&
      c.creneau_code === creneauCode &&
      c.valeur === 'interdit' &&
      contrainteAppliqueAuJour(c.jours_semaine, dateStr)
  );
}

// Verifie si un creneau+jour est obligatoire pour un intervenant
function isObligatoirePourJour(
  intervenant: IntervenantAvecContraintes,
  creneauCode: CreneauCode,
  dateStr: string
): boolean {
  return intervenant.contraintes.some(
    c => c.type === 'hard' &&
      c.creneau_code === creneauCode &&
      c.valeur === 'obligatoire' &&
      contrainteAppliqueAuJour(c.jours_semaine, dateStr)
  );
}

// Verifie si un creneau+jour est optionnel (dernier recours)
function isOptionnelPourJour(
  intervenant: IntervenantAvecContraintes,
  creneauCode: CreneauCode,
  dateStr: string
): boolean {
  return intervenant.contraintes.some(
    c => c.type === 'soft' &&
      c.creneau_code === creneauCode &&
      c.valeur === 'optionnel' &&
      contrainteAppliqueAuJour(c.jours_semaine, dateStr)
  );
}

function countNuitsSemaine(
  intervenantId: string,
  dateStr: string,
  affectations: AffectationResult[]
): number {
  const weekNum = getWeekNumber(dateStr);
  return affectations.filter(
    a => a.intervenant_id === intervenantId &&
      a.creneau_code === 'NUIT' &&
      getWeekNumber(a.date) === weekNum
  ).length;
}

function checkQuotaNuits(
  intervenant: IntervenantAvecContraintes,
  dateStr: string,
  affectations: AffectationResult[]
): boolean {
  const quotaContrainte = intervenant.contraintes.find(
    c => c.type === 'quota' && c.creneau_code === 'NUIT' && c.periode === 'semaine'
  );
  if (!quotaContrainte) return true;
  const max = parseInt(quotaContrainte.valeur.replace('max:', ''), 10);
  return countNuitsSemaine(intervenant.id, dateStr, affectations) < max;
}

// Repos obligatoire le lendemain d'une nuit
function isReposApresNuit(
  intervenantId: string,
  dateStr: string,
  affectations: AffectationResult[]
): boolean {
  const prevDay = addDays(dateStr, -1);
  return affectations.some(
    a => a.intervenant_id === intervenantId && a.date === prevDay && a.creneau_code === 'NUIT'
  );
}

function calculerScore(state: ScoreEquiteState, poids: PoidsEquite): number {
  return (
    state.jours_travailles * poids.jours +
    state.nuits_effectuees * poids.nuits +
    state.weekends_travailles * poids.weekends
  );
}

let rotationIndex = 0;

/**
 * MOTEUR DE GENERATION DU PLANNING
 *
 * Pour chaque jour du mois, pour chaque creneau planifiable :
 *   1. AM_MENA : fixe a AM
 *   2. Filtrer les eligibles (pas interdit CE JOUR, pas en conge, pas en repos post-nuit)
 *   3. Verifier quotas
 *   4. Separer : obligatoires > autorisés > optionnels (dernier recours)
 *   5. Contrainte mercredi APM : restreindre a Yasmina/Malika
 *   6. Alternance Aide2/Aide3 sur nuits weekend
 *   7. Score equite -> le moins charge
 *   8. Egalite -> rotation
 */
export function genererPlanning(
  annee: number,
  mois: number,
  intervenants: IntervenantAvecContraintes[],
  creneaux: Creneau[],
  conges: CongeApprouve[],
  poids: PoidsEquite
): PlanningGenerationResult {
  const affectations: AffectationResult[] = [];
  const alertes: AlerteGeneration[] = [];

  const scores: Map<string, ScoreEquiteState> = new Map();
  for (const interv of intervenants) {
    if (interv.role === 'am') continue;
    scores.set(interv.id, {
      intervenant_id: interv.id,
      jours_travailles: 0,
      nuits_effectuees: 0,
      weekends_travailles: 0,
      score_composite: 0,
    });
  }

  let dernierNuitWeekendAide: string | null = null;

  const days = getDaysInMonth(annee, mois);
  rotationIndex = 0;

  for (const dateStr of days) {
    const creneauxDuJour = getCreneauxDuJour(dateStr, creneaux);

    for (const creneau of creneauxDuJour) {
      // AM_MENA : affectation fixe a AM
      if (creneau.code === 'AM_MENA') {
        const am = intervenants.find(i => i.role === 'am' && i.actif);
        if (am && !isEnConge(am.id, dateStr, conges)) {
          affectations.push({ intervenant_id: am.id, creneau_code: 'AM_MENA', date: dateStr });
        }
        continue;
      }

      // Etape 1 : filtrer les eligibles
      let candidats = intervenants.filter(i => {
        if (!i.actif || i.role === 'am') return false;
        if (isInterditPourJour(i, creneau.code, dateStr)) return false;
        if (isEnConge(i.id, dateStr, conges)) return false;
        if (isReposApresNuit(i.id, dateStr, affectations)) return false;
        return true;
      });

      // Etape 2 : quotas
      if (creneau.code === 'NUIT') {
        candidats = candidats.filter(i => checkQuotaNuits(i, dateStr, affectations));
      }

      if (candidats.length === 0) {
        alertes.push({
          date: dateStr,
          creneau_code: creneau.code,
          message: `Aucun intervenant disponible pour ${creneau.label} le ${dateStr}`,
          niveau: 'error',
        });
        continue;
      }

      // Etape 3 : classer par priorite (obligatoire > autorise > optionnel)
      const obligatoires = candidats.filter(i => isObligatoirePourJour(i, creneau.code, dateStr));
      const optionnels = candidats.filter(i => isOptionnelPourJour(i, creneau.code, dateStr));
      const normaux = candidats.filter(
        i => !isObligatoirePourJour(i, creneau.code, dateStr) && !isOptionnelPourJour(i, creneau.code, dateStr)
      );

      // Prendre les obligatoires en priorite, sinon les normaux, sinon les optionnels
      let pool: IntervenantAvecContraintes[];
      if (obligatoires.length > 0) {
        pool = obligatoires;
      } else if (normaux.length > 0) {
        pool = normaux;
      } else {
        pool = optionnels;
      }

      if (pool.length === 0) {
        alertes.push({
          date: dateStr,
          creneau_code: creneau.code,
          message: `Aucun candidat prioritaire pour ${creneau.label} le ${dateStr}`,
          niveau: 'error',
        });
        continue;
      }

      // Etape 4 : alternance Aide2/Aide3 sur nuits weekend (ven/sam/dim)
      if (creneau.code === 'NUIT' && pool.length > 1) {
        const aides = pool.filter(i => i.nom === 'Aide2' || i.nom === 'Aide3');
        if (aides.length > 1) {
          const nonDernier = aides.filter(i => i.id !== dernierNuitWeekendAide);
          pool = nonDernier.length > 0 ? nonDernier : aides;
        }
      }

      // Etape 5 : score equite -> choisir le moins charge
      let meilleurScore = Infinity;
      let meilleurs: IntervenantAvecContraintes[] = [];

      for (const c of pool) {
        const s = scores.get(c.id);
        if (!s) continue;
        const score = calculerScore(s, poids);
        if (score < meilleurScore) {
          meilleurScore = score;
          meilleurs = [c];
        } else if (score === meilleurScore) {
          meilleurs.push(c);
        }
      }

      // Etape 6 : rotation en cas d'egalite
      const choisi = meilleurs[rotationIndex % meilleurs.length];
      rotationIndex++;

      if (!choisi) {
        alertes.push({
          date: dateStr,
          creneau_code: creneau.code,
          message: `Impossible de selectionner pour ${creneau.label} le ${dateStr}`,
          niveau: 'error',
        });
        continue;
      }

      affectations.push({
        intervenant_id: choisi.id,
        creneau_code: creneau.code,
        date: dateStr,
      });

      const scoreState = scores.get(choisi.id);
      if (scoreState) {
        scoreState.jours_travailles++;
        if (creneau.code === 'NUIT') {
          scoreState.nuits_effectuees++;
          if (choisi.nom === 'Aide2' || choisi.nom === 'Aide3') {
            dernierNuitWeekendAide = choisi.id;
          }
        }
        if (isWeekend(dateStr)) {
          scoreState.weekends_travailles++;
        }
        scoreState.score_composite = calculerScore(scoreState, poids);
      }
    }
  }

  // Verification finale : creneaux non couverts
  const nonCouverts = days.flatMap(d => {
    const creneauxDuJour = getCreneauxDuJour(d, creneaux);
    return creneauxDuJour
      .filter(c => c.code !== 'AM_MENA')
      .filter(c => !affectations.some(a => a.date === d && a.creneau_code === c.code))
      .map(c => ({ date: d, code: c.code }));
  });

  if (nonCouverts.length > 0) {
    const parType = new Map<string, number>();
    for (const nc of nonCouverts) {
      parType.set(nc.code, (parType.get(nc.code) ?? 0) + 1);
    }
    for (const [code, count] of parType) {
      alertes.push({
        date: nonCouverts.find(nc => nc.code === code)!.date,
        creneau_code: code as CreneauCode,
        message: `${count} creneau(x) ${code} non couvert(s) ce mois`,
        niveau: 'warning',
      });
    }
  }

  return {
    affectations,
    scores: Array.from(scores.values()),
    alertes,
  };
}
