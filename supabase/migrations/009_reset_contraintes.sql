-- ============================================
-- 009: Reset et insertion des contraintes metier
-- Idempotent : DELETE + INSERT
--
-- Convention jours_semaine : 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim
-- Convention valeur :
--   obligatoire = doit travailler ce creneau ces jours
--   optionnel   = dernier recours uniquement
--   interdit    = ne peut jamais travailler ce creneau ces jours
-- ============================================

DELETE FROM contraintes;

-- =====================
-- AIDE 1
-- =====================
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000005', 'hard', 'APM', 'obligatoire', ARRAY[0,1,3,4], 'Aide1 obligatoire APM lun/mar/jeu/ven');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000005', 'soft', 'WE', 'optionnel', ARRAY[5,6], 'Aide1 WE en dernier recours');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000005', 'hard', 'NUIT', 'interdit', NULL, 'Aide1 interdit nuit');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000005', 'hard', 'APM', 'interdit', ARRAY[2], 'Aide1 interdit mercredi');

-- =====================
-- YASMINA
-- =====================
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000002', 'hard', 'APM', 'obligatoire', ARRAY[2], 'Yasmina obligatoire APM mercredi (ou Malika)');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000002', 'hard', 'WE', 'autorisé', ARRAY[5,6], 'Yasmina autorisee WE');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000002', 'hard', 'NUIT', 'interdit', NULL, 'Yasmina interdit nuit');

-- =====================
-- MALIKA
-- =====================
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000001', 'hard', 'APM', 'obligatoire', ARRAY[2], 'Malika obligatoire APM mercredi (ou Yasmina)');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000001', 'hard', 'WE', 'autorisé', ARRAY[5,6], 'Malika autorisee WE');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000001', 'hard', 'NUIT', 'interdit', NULL, 'Malika interdit nuit');

-- =====================
-- AIDE 2
-- =====================
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000006', 'hard', 'NUIT', 'obligatoire', ARRAY[4,5,6], 'Aide2 obligatoire nuit ven/sam/dim');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000006', 'soft', 'WE', 'optionnel', ARRAY[5,6], 'Aide2 WE en dernier recours');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000006', 'hard', 'APM', 'interdit', ARRAY[0,1,2,3,4], 'Aide2 interdit APM semaine');

-- =====================
-- AIDE 3
-- =====================
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000007', 'hard', 'NUIT', 'obligatoire', ARRAY[4,5,6], 'Aide3 obligatoire nuit ven/sam/dim');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000007', 'soft', 'WE', 'optionnel', ARRAY[5,6], 'Aide3 WE en dernier recours');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000007', 'hard', 'APM', 'interdit', ARRAY[0,1,2,3,4], 'Aide3 interdit APM semaine');

-- =====================
-- DJIMA
-- =====================
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000004', 'hard', 'NUIT', 'obligatoire', ARRAY[0,1,3], 'Djima obligatoire nuit lun/mar/jeu');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000004', 'hard', 'WE', 'autorisé', ARRAY[5,6], 'Djima autorise WE');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000004', 'hard', 'APM', 'interdit', ARRAY[0,1,2,3,4], 'Djima interdit APM semaine');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000004', 'hard', 'NUIT', 'interdit', ARRAY[2,4], 'Djima interdit nuit mer/ven');

-- =====================
-- TITI
-- =====================
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000003', 'hard', 'NUIT', 'obligatoire', ARRAY[0,1,3], 'Titi obligatoire nuit lun/mar/jeu');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000003', 'hard', 'WE', 'autorisé', ARRAY[5,6], 'Titi autorise WE');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000003', 'hard', 'APM', 'interdit', ARRAY[0,1,2,3,4], 'Titi interdit APM semaine');

INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000003', 'hard', 'NUIT', 'interdit', ARRAY[2,4], 'Titi interdit nuit mer/ven');

-- =====================
-- AM
-- =====================
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000008', 'hard', 'AM_MENA', 'obligatoire', ARRAY[0,1,2,3,4], 'AM fixe AM_MENA lun-ven');
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000008', 'hard', 'APM', 'interdit', NULL, 'AM interdit APM');
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000008', 'hard', 'NUIT', 'interdit', NULL, 'AM interdit nuit');
INSERT INTO contraintes (intervenant_id, type, creneau_code, valeur, jours_semaine, description)
VALUES ('a1000000-0000-0000-0000-000000000008', 'hard', 'WE', 'interdit', NULL, 'AM interdit WE');
