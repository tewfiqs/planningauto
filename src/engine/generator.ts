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

// Retourne tous les jours du mois sous forme YYYY-MM-DD
function getDaysInMonth(annee: number, mois: number): string[] {
  const days: string[] = [];
  const count = new Date(annee, mois, 0).getDate();
  for (let d = 1; d <= count; d++) {
    const date = new Date(annee, mois - 1, d);
    days.push(date.toISOString().split('T')[0]);
  }
  return days;
}

// 1=Lundi ... 7=Dimanche (ISO)
function getISODayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function isWeekday(dateStr: string): boolean {
  const dow = getISODayOfWeek(dateStr);
  return dow >= 1 && dow <= 5;
}

function isWeekend(dateStr: string): boolean {
  return !isWeekday(dateStr);
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

// Verifie si un intervenant est en conge a une date donnee
function isEnConge(intervenantId: string, dateStr: string, conges: CongeApprouve[]): boolean {
  return conges.some(c =>
    c.intervenant_id === intervenantId &&
    dateStr >= c.date_debut &&
    dateStr <= c.date_fin
  );
}

// Determine quels creneaux doivent etre couverts un jour donne
function getCreneauxDuJour(dateStr: string, creneaux: Creneau[]): Creneau[] {
  const dow = getISODayOfWeek(dateStr);
  return creneaux.filter(c => c.jours_semaine.includes(dow));
}

// Verifie si une contrainte hard interdit un creneau pour un intervenant
function isInterdit(intervenant: IntervenantAvecContraintes, creneauCode: CreneauCode): boolean {
  return intervenant.contraintes.some(
    c => c.type === 'hard' && c.creneau_code === creneauCode && c.valeur === 'interdit'
  );
}

// Verifie si un intervenant a la priorite sur un creneau
function hasPriorite(intervenant: IntervenantAvecContraintes, creneauCode: CreneauCode): boolean {
  return intervenant.contraintes.some(
    c => c.type === 'hard' && c.creneau_code === creneauCode && c.valeur === 'priorité'
  );
}

// Compte les nuits d'un intervenant dans une semaine donnee
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

// Verifie la contrainte quota max nuits par semaine
function checkQuotaNuits(
  intervenant: IntervenantAvecContraintes,
  dateStr: string,
  affectations: AffectationResult[]
): boolean {
  const quotaContrainte = intervenant.contraintes.find(
    c => c.type === 'quota' && c.creneau_code === 'NUIT' && c.periode === 'semaine'
  );
  if (!quotaContrainte) return true;

  const maxStr = quotaContrainte.valeur.replace('max:', '');
  const max = parseInt(maxStr, 10);
  const current = countNuitsSemaine(intervenant.id, dateStr, affectations);
  return current < max;
}

// Verifie que Djima n'est pas affecte sur des jours consecutifs
function checkNoConsecutive(
  intervenantId: string,
  dateStr: string,
  affectations: AffectationResult[]
): boolean {
  const prevDay = addDays(dateStr, -1);
  const nextDay = addDays(dateStr, 1);
  return !affectations.some(
    a => a.intervenant_id === intervenantId && (a.date === prevDay || a.date === nextDay)
  );
}

// Verifie la contrainte conditionnelle Djima : APM si pas de NUIT le meme jour
function checkConditionalNoNuitSameDay(
  intervenantId: string,
  dateStr: string,
  affectations: AffectationResult[]
): boolean {
  return !affectations.some(
    a => a.intervenant_id === intervenantId && a.date === dateStr && a.creneau_code === 'NUIT'
  );
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

// Calcule le score composite d'equite
function calculerScore(state: ScoreEquiteState, poids: PoidsEquite): number {
  return (
    state.jours_travailles * poids.jours +
    state.nuits_effectuees * poids.nuits +
    state.weekends_travailles * poids.weekends
  );
}

// Compteur de rotation pour egalite de score
let rotationIndex = 0;

/**
 * MOTEUR PRINCIPAL DE GENERATION DU PLANNING
 *
 * Algorithme :
 * Pour chaque jour du mois, pour chaque creneau planifiable ce jour-la :
 *   1. AM_MENA : affecte fixe a AM (hors algorithme)
 *   2. Pour les autres creneaux :
 *      a. Filtrer les intervenants eligibles (pas AM, pas interdit, pas en conge)
 *      b. Exclure ceux en repos apres nuit
 *      c. Verifier les quotas (max nuits/semaine)
 *      d. Verifier les contraintes specifiques (Djima: no_consecutive, conditional APM)
 *      e. Prioriser Aide2/Aide3 en alternance pour les nuits
 *      f. Calculer le score d'equite et affecter le moins charge
 *      g. En cas d'egalite : rotation
 *      h. Si aucun candidat : alerte
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

  // Initialiser les scores d'equite a zero
  const scores: Map<string, ScoreEquiteState> = new Map();
  for (const interv of intervenants) {
    if (interv.role === 'am') continue; // AM hors scoring
    scores.set(interv.id, {
      intervenant_id: interv.id,
      jours_travailles: 0,
      nuits_effectuees: 0,
      weekends_travailles: 0,
      score_composite: 0,
    });
  }

  // Compteur d'alternance Aide2/Aide3 pour les nuits
  let dernierNuitAide: string | null = null;

  const days = getDaysInMonth(annee, mois);
  rotationIndex = 0;

  for (const dateStr of days) {
    const creneauxDuJour = getCreneauxDuJour(dateStr, creneaux);

    for (const creneau of creneauxDuJour) {
      // AM_MENA : affectation fixe a AM
      if (creneau.code === 'AM_MENA') {
        const am = intervenants.find(i => i.role === 'am' && i.actif);
        if (am && !isEnConge(am.id, dateStr, conges)) {
          affectations.push({
            intervenant_id: am.id,
            creneau_code: 'AM_MENA',
            date: dateStr,
          });
        }
        continue;
      }

      // --- Creneaux planifiables : APM, NUIT, WE ---

      // Etape 1 : filtrer les intervenants eligibles
      let candidats = intervenants.filter(i => {
        if (!i.actif) return false;
        if (i.role === 'am') return false; // AM hors planification
        if (isInterdit(i, creneau.code)) return false;
        if (isEnConge(i.id, dateStr, conges)) return false;
        return true;
      });

      // Etape 2 : exclure ceux en repos apres nuit
      candidats = candidats.filter(i => !isReposApresNuit(i.id, dateStr, affectations));

      // Etape 3 : verifier les quotas nuits par semaine
      if (creneau.code === 'NUIT') {
        candidats = candidats.filter(i => checkQuotaNuits(i, dateStr, affectations));
      }

      // Etape 4 : contraintes specifiques
      candidats = candidats.filter(i => {
        const hasNoConsecutive = i.contraintes.some(
          c => c.type === 'soft' && c.valeur === 'no_consecutive'
        );
        if (hasNoConsecutive && !checkNoConsecutive(i.id, dateStr, affectations)) {
          return false;
        }

        // Contrainte conditionnelle : APM seulement si pas de NUIT meme jour
        if (creneau.code === 'APM') {
          const hasConditional = i.contraintes.some(
            c => c.type === 'soft' && c.creneau_code === 'APM' && c.valeur === 'conditional:no_nuit_same_day'
          );
          if (hasConditional && !checkConditionalNoNuitSameDay(i.id, dateStr, affectations)) {
            return false;
          }
        }

        return true;
      });

      // Aucun candidat : alerte
      if (candidats.length === 0) {
        alertes.push({
          date: dateStr,
          creneau_code: creneau.code,
          message: `Aucun intervenant disponible pour ${creneau.label} le ${dateStr}`,
          niveau: 'error',
        });
        continue;
      }

      // Etape 5 : prioriser Aide2/Aide3 en alternance pour les nuits
      if (creneau.code === 'NUIT') {
        const prioritaires = candidats.filter(i => hasPriorite(i, 'NUIT'));
        if (prioritaires.length > 0) {
          // Alternance : choisir celui qui n'a pas fait la derniere nuit
          const nonDernier = prioritaires.filter(i => i.id !== dernierNuitAide);
          if (nonDernier.length > 0) {
            candidats = nonDernier;
          } else {
            candidats = prioritaires;
          }
        }
      }

      // Etape 6 : calculer le score d'equite et choisir le moins charge
      let meilleurScore = Infinity;
      let meilleursCandidats: IntervenantAvecContraintes[] = [];

      for (const c of candidats) {
        const s = scores.get(c.id);
        if (!s) continue;
        const score = calculerScore(s, poids);
        if (score < meilleurScore) {
          meilleurScore = score;
          meilleursCandidats = [c];
        } else if (score === meilleurScore) {
          meilleursCandidats.push(c);
        }
      }

      // Etape 7 : en cas d'egalite, rotation
      const choisi = meilleursCandidats[rotationIndex % meilleursCandidats.length];
      rotationIndex++;

      if (!choisi) {
        alertes.push({
          date: dateStr,
          creneau_code: creneau.code,
          message: `Impossible de selectionner un intervenant pour ${creneau.label} le ${dateStr}`,
          niveau: 'error',
        });
        continue;
      }

      // Creer l'affectation
      affectations.push({
        intervenant_id: choisi.id,
        creneau_code: creneau.code,
        date: dateStr,
      });

      // Mettre a jour le score d'equite
      const scoreState = scores.get(choisi.id);
      if (scoreState) {
        scoreState.jours_travailles++;
        if (creneau.code === 'NUIT') {
          scoreState.nuits_effectuees++;
          dernierNuitAide = choisi.id;
          // La nuit compte sur 2 jours : bloquer le lendemain est gere par isReposApresNuit
        }
        if (isWeekend(dateStr)) {
          scoreState.weekends_travailles++;
        }
        scoreState.score_composite = calculerScore(scoreState, poids);
      }
    }
  }

  // Alerte pre-generation : verifier si des nuits de semaine risquent d'etre non couvertes
  const nuitsParSemaine = new Map<number, number>();
  for (const dateStr of days) {
    if (isWeekday(dateStr)) {
      const week = getWeekNumber(dateStr);
      nuitsParSemaine.set(week, (nuitsParSemaine.get(week) ?? 0) + 1);
    }
  }

  // Capacite max nuits/semaine : Titi(2) + Djima(2) + Aide2(7) + Aide3(7) = 18
  // mais en pratique Aide2 et Aide3 n'ont pas de quota, ils sont prioritaires
  // On verifie juste que les affectations couvrent bien toutes les nuits
  const nuitsNonCouvertes = days.filter(d => {
    const dow = getISODayOfWeek(d);
    const hasNuit = creneaux.some(c => c.code === 'NUIT' && c.jours_semaine.includes(dow));
    if (!hasNuit) return false;
    return !affectations.some(a => a.date === d && a.creneau_code === 'NUIT');
  });

  if (nuitsNonCouvertes.length > 0) {
    alertes.push({
      date: nuitsNonCouvertes[0],
      creneau_code: 'NUIT',
      message: `${nuitsNonCouvertes.length} nuit(s) non couverte(s) ce mois`,
      niveau: 'warning',
    });
  }

  return {
    affectations,
    scores: Array.from(scores.values()),
    alertes,
  };
}
