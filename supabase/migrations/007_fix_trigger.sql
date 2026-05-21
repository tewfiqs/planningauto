-- ============================================
-- 007: Correction du trigger handle_new_user
--
-- Probleme : le trigger original echouait car
--   1. La table profils n'a pas de colonne email
--   2. Le lookup intervenant_id pouvait retourner NULL
--      et d'autres contraintes pouvaient bloquer l'insert
--
-- Cette migration :
--   - Ajoute la colonne email a profils (si absente)
--   - Recree le trigger de facon defensive (ON CONFLICT + EXCEPTION)
-- ============================================

-- Etape 1 : Ajouter la colonne email si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profils'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profils ADD COLUMN email TEXT;
  END IF;
END
$$;

-- Etape 2 : S'assurer que intervenant_id est bien nullable (pas de NOT NULL)
-- (deja nullable dans 001_schema.sql, mais on verifie)
ALTER TABLE public.profils ALTER COLUMN intervenant_id DROP NOT NULL;

-- Etape 3 : Recreer la fonction trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profils (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'app_role', 'intervenant')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Etape 4 : Recreer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
