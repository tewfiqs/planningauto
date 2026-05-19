-- Fonction publique : verifie si un gestionnaire existe deja
-- Accessible sans authentification (anon key)
CREATE OR REPLACE FUNCTION has_gestionnaire()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profils WHERE role = 'gestionnaire'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
