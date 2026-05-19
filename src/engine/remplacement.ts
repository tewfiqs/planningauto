import { supabase } from '../lib/supabase';
import type { Intervenant, Contrainte, Affectation } from '../types/database';

/**
 * Service de remplacement automatique.
 *
 * Flux :
 * 1. Un desistement est cree (deja fait dans Desistement.tsx)
 * 2. Ce service identifie les remplacants eligibles
 * 3. Cree des propositions de remplacement en cascade
 * 4. Notifie chaque candidat (le premier en priorite)
 * 5. Si refus ou non-reponse, passe au suivant
 * 6. Si tous refusent, alerte le gestionnaire
 */

interface RemplacantCandidat {
  intervenant: Intervenant;
  score: number;
}

export async function lancerRemplacement(desistementId: string): Promise<void> {
  // Recuperer le desistement et l'affectation associee
  const { data: desistement } = await supabase
    .from('desistements')
    .select('*, affectations(*)')
    .eq('id', desistementId)
    .single();

  if (!desistement) return;

  const affectation = (desistement as any).affectations as Affectation;
  if (!affectation) return;

  // Recuperer tous les intervenants actifs avec leurs contraintes
  const { data: intervData } = await supabase
    .from('intervenants')
    .select('*')
    .eq('actif', true);

  const { data: contData } = await supabase.from('contraintes').select('*');
  const { data: congesData } = await supabase
    .from('conges')
    .select('*')
    .eq('statut', 'approuvé');

  // Recuperer les affectations existantes pour ce jour
  const { data: affectationsDuJour } = await supabase
    .from('affectations')
    .select('*')
    .eq('date', affectation.date)
    .eq('statut', 'confirmé');

  // Recuperer les scores d'equite du planning
  const { data: scoresData } = await supabase
    .from('scores_equite')
    .select('*')
    .eq('planning_id', affectation.planning_id);

  const intervenants = (intervData as Intervenant[]) ?? [];
  const contraintes = (contData as Contrainte[]) ?? [];
  const conges = (congesData as any[]) ?? [];
  const scores = (scoresData as any[]) ?? [];

  // Filtrer les candidats eligibles
  const candidats: RemplacantCandidat[] = [];

  for (const interv of intervenants) {
    // Exclure la personne qui se desiste
    if (interv.id === desistement.intervenant_id) continue;
    // Exclure AM
    if (interv.role === 'am') continue;

    const intervContraintes = contraintes.filter(c => c.intervenant_id === interv.id);

    // Verifier hard constraints
    const estInterdit = intervContraintes.some(
      c => c.type === 'hard' && c.creneau_code === affectation.creneau_code && c.valeur === 'interdit'
    );
    if (estInterdit) continue;

    // Verifier conges
    const enConge = conges.some(
      c => c.intervenant_id === interv.id &&
        affectation.date >= c.date_debut &&
        affectation.date <= c.date_fin
    );
    if (enConge) continue;

    // Verifier si deja affecte ce jour
    const dejaAffecte = (affectationsDuJour ?? []).some(
      (a: any) => a.intervenant_id === interv.id
    );
    if (dejaAffecte) continue;

    // Score d'equite
    const scoreState = scores.find((s: any) => s.intervenant_id === interv.id);
    const score = scoreState ? Number(scoreState.score_composite) : 0;

    candidats.push({ intervenant: interv, score });
  }

  // Trier par score (le moins charge en premier)
  candidats.sort((a, b) => a.score - b.score);

  if (candidats.length === 0) {
    // Alerte gestionnaire : aucun remplacant disponible
    await notifierGestionnaire(
      `Aucun remplacant disponible pour le creneau ${affectation.creneau_code} du ${affectation.date}. Intervention manuelle requise.`
    );
    return;
  }

  // Creer les propositions de remplacement (cascade)
  for (const candidat of candidats) {
    await supabase.from('remplacements').insert({
      desistement_id: desistementId,
      intervenant_remplacant_id: candidat.intervenant.id,
      statut: 'proposé',
    });

    // Notifier le candidat
    await supabase.from('notifications').insert({
      intervenant_id: candidat.intervenant.id,
      type: 'remplacement',
      message: `Remplacement demande : creneau ${affectation.creneau_code} le ${new Date(affectation.date).toLocaleDateString('fr-FR')}. Rendez-vous dans vos notifications pour accepter ou refuser.`,
    });
  }
}

async function notifierGestionnaire(message: string): Promise<void> {
  // Trouver tous les gestionnaires
  const { data: profils } = await supabase
    .from('profils')
    .select('intervenant_id')
    .eq('role', 'gestionnaire');

  for (const profil of (profils ?? [])) {
    if (profil.intervenant_id) {
      await supabase.from('notifications').insert({
        intervenant_id: profil.intervenant_id,
        type: 'alerte_gestionnaire',
        message,
      });
    }
  }
}

/**
 * Traite la reponse a un remplacement.
 * Si accepte : met a jour l'affectation et notifie tout le monde.
 * Si refuse : verifie si d'autres candidats sont en attente.
 */
export async function traiterReponseRemplacement(
  remplacementId: string,
  statut: 'accepté' | 'refusé'
): Promise<void> {
  const { data: remplacement } = await supabase
    .from('remplacements')
    .select('*, desistements(*, affectations(*))')
    .eq('id', remplacementId)
    .single();

  if (!remplacement) return;

  // Mettre a jour le statut
  await supabase.from('remplacements').update({
    statut,
    repondu_le: new Date().toISOString(),
  }).eq('id', remplacementId);

  if (statut === 'accepté') {
    const affectation = (remplacement as any).desistements?.affectations;
    if (affectation) {
      // Mettre a jour l'affectation
      await supabase.from('affectations').update({
        intervenant_id: (remplacement as any).intervenant_remplacant_id,
        statut: 'confirmé',
      }).eq('id', affectation.id);
    }

    // Refuser automatiquement les autres propositions pour ce desistement
    await supabase.from('remplacements').update({
      statut: 'refusé',
      repondu_le: new Date().toISOString(),
    })
      .eq('desistement_id', (remplacement as any).desistement_id)
      .neq('id', remplacementId)
      .eq('statut', 'proposé');

    // Notifier le gestionnaire
    await notifierGestionnaire(
      `Remplacement accepte pour le creneau du ${affectation?.date ?? '?'}.`
    );
  } else {
    // Verifier s'il reste des candidats en attente
    const { count } = await supabase
      .from('remplacements')
      .select('*', { count: 'exact', head: true })
      .eq('desistement_id', (remplacement as any).desistement_id)
      .eq('statut', 'proposé');

    if ((count ?? 0) === 0) {
      // Plus aucun candidat : alerte gestionnaire
      await notifierGestionnaire(
        `Tous les candidats ont refuse le remplacement pour le desistement. Intervention manuelle requise.`
      );
    }
  }
}
