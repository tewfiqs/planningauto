-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

ALTER TABLE intervenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contraintes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plannings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conges ENABLE ROW LEVEL SECURITY;
ALTER TABLE desistements ENABLE ROW LEVEL SECURITY;
ALTER TABLE remplacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores_equite ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils ENABLE ROW LEVEL SECURITY;
ALTER TABLE creneaux ENABLE ROW LEVEL SECURITY;

-- Fonction helper : est gestionnaire ?
CREATE OR REPLACE FUNCTION is_gestionnaire()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'gestionnaire'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Fonction helper : récupérer l'intervenant_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_my_intervenant_id()
RETURNS UUID AS $$
  SELECT intervenant_id FROM profils WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================
-- CRENEAUX : lecture publique
-- =====================
CREATE POLICY "creneaux_select_all" ON creneaux FOR SELECT USING (true);
CREATE POLICY "creneaux_manage_gestionnaire" ON creneaux FOR ALL USING (is_gestionnaire());

-- =====================
-- INTERVENANTS
-- =====================
CREATE POLICY "intervenants_select_all" ON intervenants FOR SELECT USING (true);
CREATE POLICY "intervenants_manage_gestionnaire" ON intervenants FOR ALL USING (is_gestionnaire());

-- =====================
-- CONTRAINTES
-- =====================
CREATE POLICY "contraintes_select_all" ON contraintes FOR SELECT USING (true);
CREATE POLICY "contraintes_manage_gestionnaire" ON contraintes FOR ALL USING (is_gestionnaire());

-- =====================
-- PLANNINGS
-- =====================
CREATE POLICY "plannings_select_all" ON plannings FOR SELECT USING (true);
CREATE POLICY "plannings_manage_gestionnaire" ON plannings FOR ALL USING (is_gestionnaire());

-- =====================
-- AFFECTATIONS
-- =====================
CREATE POLICY "affectations_select_own" ON affectations FOR SELECT
  USING (intervenant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "affectations_manage_gestionnaire" ON affectations FOR ALL USING (is_gestionnaire());

-- =====================
-- CONGES
-- =====================
CREATE POLICY "conges_select_own" ON conges FOR SELECT
  USING (intervenant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "conges_insert_own" ON conges FOR INSERT
  WITH CHECK (intervenant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "conges_update_gestionnaire" ON conges FOR UPDATE USING (is_gestionnaire());
CREATE POLICY "conges_delete_gestionnaire" ON conges FOR DELETE USING (is_gestionnaire());

-- =====================
-- DESISTEMENTS
-- =====================
CREATE POLICY "desistements_select_own" ON desistements FOR SELECT
  USING (intervenant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "desistements_insert_own" ON desistements FOR INSERT
  WITH CHECK (intervenant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "desistements_manage_gestionnaire" ON desistements FOR ALL USING (is_gestionnaire());

-- =====================
-- REMPLACEMENTS
-- =====================
CREATE POLICY "remplacements_select_concerned" ON remplacements FOR SELECT
  USING (intervenant_remplacant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "remplacements_update_own" ON remplacements FOR UPDATE
  USING (intervenant_remplacant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "remplacements_manage_gestionnaire" ON remplacements FOR ALL USING (is_gestionnaire());

-- =====================
-- SCORES EQUITE
-- =====================
CREATE POLICY "scores_select_all" ON scores_equite FOR SELECT USING (true);
CREATE POLICY "scores_manage_gestionnaire" ON scores_equite FOR ALL USING (is_gestionnaire());

-- =====================
-- NOTIFICATIONS
-- =====================
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (intervenant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (intervenant_id = get_my_intervenant_id() OR is_gestionnaire());
CREATE POLICY "notifications_manage_gestionnaire" ON notifications FOR ALL USING (is_gestionnaire());

-- =====================
-- PARAMETRES
-- =====================
CREATE POLICY "parametres_select_all" ON parametres FOR SELECT USING (true);
CREATE POLICY "parametres_manage_gestionnaire" ON parametres FOR ALL USING (is_gestionnaire());

-- =====================
-- PROFILS
-- =====================
CREATE POLICY "profils_select_own" ON profils FOR SELECT
  USING (id = auth.uid() OR is_gestionnaire());
CREATE POLICY "profils_manage_gestionnaire" ON profils FOR ALL USING (is_gestionnaire());
