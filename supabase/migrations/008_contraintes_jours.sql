-- ============================================
-- 008: Ajout colonne jours_semaine a contraintes
-- Idempotent : IF NOT EXISTS
-- Convention : 0=Lundi, 1=Mardi, ..., 6=Dimanche
-- NULL = tous les jours
-- ============================================

ALTER TABLE contraintes
ADD COLUMN IF NOT EXISTS jours_semaine integer[];
