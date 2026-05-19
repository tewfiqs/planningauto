-- ============================================
-- SEED DATA : Créneaux, Intervenants, Contraintes, Paramètres
-- ============================================

-- =====================
-- CRÉNEAUX
-- =====================
-- jours_semaine : 1=Lundi, 2=Mardi, ..., 5=Vendredi, 6=Samedi, 7=Dimanche

INSERT INTO creneaux (code, label, heure_debut, heure_fin, jours_semaine) VALUES
  ('AM_MENA', 'Aide ménagère (Lun-Ven 11h-14h)', '11:00', '14:00', ARRAY[1,2,3,4,5]),
  ('APM', 'Après-midi (Lun-Ven 14h-19h)', '14:00', '19:00', ARRAY[1,2,3,4,5]),
  ('NUIT', 'Nuit (19h-11h lendemain)', '19:00', '11:00', ARRAY[1,2,3,4,5,6,7]),
  ('WE', 'Weekend (Sam-Dim 11h-19h)', '11:00', '19:00', ARRAY[6,7]);

-- =====================
-- INTERVENANTS
-- =====================
INSERT INTO intervenants (id, nom, prenom, email, role) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Malika', 'Malika', 'malika@planningauto.fr', 'principale'),
  ('a1000000-0000-0000-0000-000000000002', 'Yasmina', 'Yasmina', 'yasmina@planningauto.fr', 'principale'),
  ('a1000000-0000-0000-0000-000000000003', 'Titi', 'Titi', 'titi@planningauto.fr', 'principale'),
  ('a1000000-0000-0000-0000-000000000004', 'Djima', 'Djima', 'djima@planningauto.fr', 'principale'),
  ('a1000000-0000-0000-0000-000000000005', 'Aide1', 'Aide1', 'aide1@planningauto.fr', 'aide'),
  ('a1000000-0000-0000-0000-000000000006', 'Aide2', 'Aide2', 'aide2@planningauto.fr', 'aide'),
  ('a1000000-0000-0000-0000-000000000007', 'Aide3', 'Aide3', 'aide3@planningauto.fr', 'aide'),
  ('a1000000-0000-0000-0000-000000000008', 'AM', 'AM', 'am@planningauto.fr', 'am');

-- =====================
-- CONTRAINTES
-- =====================
-- Format valeur :
--   "interdit"  = hard constraint, ne peut pas travailler ce créneau
--   "autorisé"  = explicitement autorisé
--   "priorité"  = affecté en priorité à ce créneau
--   "max:N"     = quota max (ex: "max:2" = max 2 par période)
--   "no_consecutive" = pas de jours consécutifs
--   "conditional:no_nuit_same_day" = APM autorisé seulement si pas de NUIT ce jour

-- Malika : interdit NUIT, autorisé APM et WE
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, periode, description) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'hard', 'NUIT', 'interdit', NULL, 'Malika ne peut pas faire les nuits'),
  ('a1000000-0000-0000-0000-000000000001', 'hard', 'APM', 'autorisé', NULL, 'Malika peut faire les APM'),
  ('a1000000-0000-0000-0000-000000000001', 'hard', 'WE', 'autorisé', NULL, 'Malika peut faire les WE');

-- Yasmina : interdit NUIT, autorisé APM et WE
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, periode, description) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'hard', 'NUIT', 'interdit', NULL, 'Yasmina ne peut pas faire les nuits'),
  ('a1000000-0000-0000-0000-000000000002', 'hard', 'APM', 'autorisé', NULL, 'Yasmina peut faire les APM'),
  ('a1000000-0000-0000-0000-000000000002', 'hard', 'WE', 'autorisé', NULL, 'Yasmina peut faire les WE');

-- Titi : interdit APM semaine, autorisé NUIT (max 2/semaine), autorisé WE
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, periode, description) VALUES
  ('a1000000-0000-0000-0000-000000000003', 'hard', 'APM', 'interdit', NULL, 'Titi ne peut pas faire les APM en semaine'),
  ('a1000000-0000-0000-0000-000000000003', 'hard', 'NUIT', 'autorisé', NULL, 'Titi peut faire les nuits en semaine'),
  ('a1000000-0000-0000-0000-000000000003', 'quota', 'NUIT', 'max:2', 'semaine', 'Titi max 2 nuits par semaine'),
  ('a1000000-0000-0000-0000-000000000003', 'hard', 'WE', 'autorisé', NULL, 'Titi peut faire les WE (11h-19h)');

-- Djima : autorisé NUIT (max 2/semaine), APM conditionnel, WE, pas de jours consécutifs
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, periode, description) VALUES
  ('a1000000-0000-0000-0000-000000000004', 'hard', 'NUIT', 'autorisé', NULL, 'Djima peut faire les nuits en semaine'),
  ('a1000000-0000-0000-0000-000000000004', 'quota', 'NUIT', 'max:2', 'semaine', 'Djima max 2 nuits par semaine'),
  ('a1000000-0000-0000-0000-000000000004', 'soft', 'APM', 'conditional:no_nuit_same_day', 'jour', 'Djima peut faire APM seulement si pas de nuit ce jour'),
  ('a1000000-0000-0000-0000-000000000004', 'hard', 'WE', 'autorisé', NULL, 'Djima peut faire les WE'),
  ('a1000000-0000-0000-0000-000000000004', 'soft', 'NUIT', 'no_consecutive', 'jour', 'Djima : éviter les jours consécutifs'),
  ('a1000000-0000-0000-0000-000000000004', 'soft', 'APM', 'no_consecutive', 'jour', 'Djima : éviter les jours consécutifs'),
  ('a1000000-0000-0000-0000-000000000004', 'soft', 'WE', 'no_consecutive', 'jour', 'Djima : éviter les jours consécutifs');

-- Aide1 : interdit NUIT, autorisé APM et WE
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, periode, description) VALUES
  ('a1000000-0000-0000-0000-000000000005', 'hard', 'NUIT', 'interdit', NULL, 'Aide1 ne peut pas faire les nuits'),
  ('a1000000-0000-0000-0000-000000000005', 'hard', 'APM', 'autorisé', NULL, 'Aide1 peut faire les APM'),
  ('a1000000-0000-0000-0000-000000000005', 'hard', 'WE', 'autorisé', NULL, 'Aide1 peut faire les WE');

-- Aide2 : priorité NUIT, autorisé WE en complément
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, periode, description) VALUES
  ('a1000000-0000-0000-0000-000000000006', 'hard', 'NUIT', 'priorité', NULL, 'Aide2 prioritaire sur les nuits'),
  ('a1000000-0000-0000-0000-000000000006', 'hard', 'WE', 'autorisé', NULL, 'Aide2 peut faire les WE en complément'),
  ('a1000000-0000-0000-0000-000000000006', 'hard', 'APM', 'interdit', NULL, 'Aide2 ne fait pas les APM');

-- Aide3 : priorité NUIT, autorisé WE en complément
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, periode, description) VALUES
  ('a1000000-0000-0000-0000-000000000007', 'hard', 'NUIT', 'priorité', NULL, 'Aide3 prioritaire sur les nuits'),
  ('a1000000-0000-0000-0000-000000000007', 'hard', 'WE', 'autorisé', NULL, 'Aide3 peut faire les WE en complément'),
  ('a1000000-0000-0000-0000-000000000007', 'hard', 'APM', 'interdit', NULL, 'Aide3 ne fait pas les APM');

-- AM : uniquement AM_MENA, fixe
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, periode, description) VALUES
  ('a1000000-0000-0000-0000-000000000008', 'hard', 'AM_MENA', 'autorisé', NULL, 'AM affectée fixe au créneau AM_MENA'),
  ('a1000000-0000-0000-0000-000000000008', 'hard', 'APM', 'interdit', NULL, 'AM ne fait pas les APM'),
  ('a1000000-0000-0000-0000-000000000008', 'hard', 'NUIT', 'interdit', NULL, 'AM ne fait pas les nuits'),
  ('a1000000-0000-0000-0000-000000000008', 'hard', 'WE', 'interdit', NULL, 'AM ne fait pas les WE');

-- =====================
-- PARAMÈTRES
-- =====================
INSERT INTO parametres (cle, valeur, description) VALUES
  ('equite_poids_jours', '0.40', 'Pondération jours travaillés dans le score d''équité'),
  ('equite_poids_nuits', '0.35', 'Pondération nuits effectuées dans le score d''équité'),
  ('equite_poids_weekends', '0.25', 'Pondération weekends travaillés dans le score d''équité'),
  ('delai_reponse_remplacement', '24', 'Délai en heures pour répondre à une demande de remplacement'),
  ('email_expediteur', 'planning@planningauto.fr', 'Adresse email d''envoi des notifications'),
  ('nom_site', 'PlanningAuto', 'Nom du site affiché dans l''application');
