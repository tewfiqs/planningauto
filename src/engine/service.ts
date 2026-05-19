import { supabase } from '../lib/supabase';
import { genererPlanning } from './generator';
import type { IntervenantAvecContraintes, PoidsEquite, PlanningGenerationResult } from './types';
import type { Creneau, Intervenant, Contrainte } from '../types/database';

export async function genererEtSauvegarderPlanning(
  annee: number,
  mois: number
): Promise<PlanningGenerationResult & { planning_id: string }> {
  // Charger les donnees depuis Supabase
  const [
    { data: intervData },
    { data: contData },
    { data: creneauxData },
    { data: congesData },
    { data: paramsData },
  ] = await Promise.all([
    supabase.from('intervenants').select('*').eq('actif', true),
    supabase.from('contraintes').select('*'),
    supabase.from('creneaux').select('*'),
    supabase.from('conges').select('*').eq('statut', 'approuvé'),
    supabase.from('parametres').select('*'),
  ]);

  const intervenants: IntervenantAvecContraintes[] = ((intervData as Intervenant[]) ?? []).map(i => ({
    ...i,
    contraintes: ((contData as Contrainte[]) ?? []).filter(c => c.intervenant_id === i.id),
  }));

  const creneaux = (creneauxData as Creneau[]) ?? [];

  // Filtrer les conges approuves qui chevauchent le mois
  const debutMois = `${annee}-${String(mois).padStart(2, '0')}-01`;
  const finMois = `${annee}-${String(mois).padStart(2, '0')}-${new Date(annee, mois, 0).getDate()}`;

  const conges = ((congesData as any[]) ?? [])
    .filter((c: any) => c.date_fin >= debutMois && c.date_debut <= finMois)
    .map((c: any) => ({
      intervenant_id: c.intervenant_id as string,
      date_debut: c.date_debut as string,
      date_fin: c.date_fin as string,
    }));

  // Recuperer les poids d'equite
  const params = (paramsData as any[]) ?? [];
  const getParam = (cle: string, defaut: number) => {
    const p = params.find((p: any) => p.cle === cle);
    return p ? parseFloat(p.valeur) : defaut;
  };

  const poids: PoidsEquite = {
    jours: getParam('equite_poids_jours', 0.4),
    nuits: getParam('equite_poids_nuits', 0.35),
    weekends: getParam('equite_poids_weekends', 0.25),
  };

  // Generer le planning
  const result = genererPlanning(annee, mois, intervenants, creneaux, conges, poids);

  // Creer ou mettre a jour le planning en BDD
  const { data: existingPlanning } = await supabase
    .from('plannings')
    .select('id')
    .eq('mois', mois)
    .eq('annee', annee)
    .single();

  let planningId: string;

  if (existingPlanning) {
    planningId = existingPlanning.id;
    // Supprimer les anciennes affectations
    await supabase.from('affectations').delete().eq('planning_id', planningId);
    await supabase.from('scores_equite').delete().eq('planning_id', planningId);
    // Remettre en brouillon
    await supabase.from('plannings').update({ statut: 'brouillon', validated_at: null }).eq('id', planningId);
  } else {
    const { data: newPlanning } = await supabase
      .from('plannings')
      .insert({ mois, annee, statut: 'brouillon' })
      .select('id')
      .single();
    planningId = newPlanning!.id;
  }

  // Sauvegarder les affectations
  if (result.affectations.length > 0) {
    const affectationsToInsert = result.affectations.map(a => ({
      planning_id: planningId,
      intervenant_id: a.intervenant_id,
      creneau_code: a.creneau_code,
      date: a.date,
      statut: 'confirmé',
    }));

    // Inserer par lots de 500
    for (let i = 0; i < affectationsToInsert.length; i += 500) {
      const batch = affectationsToInsert.slice(i, i + 500);
      await supabase.from('affectations').insert(batch);
    }
  }

  // Sauvegarder les scores
  if (result.scores.length > 0) {
    const scoresToInsert = result.scores.map(s => ({
      planning_id: planningId,
      intervenant_id: s.intervenant_id,
      jours_travailles: s.jours_travailles,
      nuits_effectuees: s.nuits_effectuees,
      weekends_travailles: s.weekends_travailles,
      score_composite: s.score_composite,
    }));
    await supabase.from('scores_equite').insert(scoresToInsert);
  }

  return { ...result, planning_id: planningId };
}

export async function validerPlanning(planningId: string): Promise<void> {
  await supabase.from('plannings').update({
    statut: 'validé',
    validated_at: new Date().toISOString(),
  }).eq('id', planningId);
}
