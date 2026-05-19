-- ============================================
-- Trigger : creation automatique du profil
-- quand un utilisateur s'inscrit via Supabase Auth
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_intervenant_id UUID;
BEGIN
  -- Le role est passe via les metadata lors de la creation
  v_role := COALESCE(NEW.raw_user_meta_data->>'app_role', 'intervenant');

  -- Chercher l'intervenant par email
  SELECT id INTO v_intervenant_id
  FROM intervenants
  WHERE email = NEW.email;

  INSERT INTO profils (id, role, intervenant_id)
  VALUES (NEW.id, v_role, v_intervenant_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
