-- Migration 002: Normalize user profiles and add search preferences table
-- Applies on top of the original 001_users_profiles.sql schema

BEGIN;

-- Drop old trigger/function hookups so we can recreate them with the new schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new table structure that matches shared/src/types/user.types.ts
CREATE TABLE public.user_profiles_new (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email_address TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate existing profile data into the new structure
INSERT INTO public.user_profiles_new (
  auth_user_id,
  first_name,
  last_name,
  email_address,
  phone_number,
  created_at,
  updated_at
)
SELECT
  p.id AS auth_user_id,
  p.first_name,
  p.last_name,
  COALESCE(u.email, CONCAT('unknown-', p.id::text, '@placeholder.local')) AS email_address,
  NULL::TEXT AS phone_number,
  p.created_at,
  p.updated_at
FROM public.user_profiles p
LEFT JOIN auth.users u ON u.id = p.id;

-- Replace the old table with the new structure
DROP TABLE public.user_profiles;
ALTER TABLE public.user_profiles_new RENAME TO user_profiles;

-- Ensure the auto-increment sequence follows the renamed table
ALTER SEQUENCE public.user_profiles_new_id_seq OWNED BY public.user_profiles.id;
ALTER SEQUENCE public.user_profiles_new_id_seq RENAME TO user_profiles_id_seq;

-- Enable RLS on the new profile table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create the normalized search preferences table that links back to user_profiles
CREATE TABLE public.user_search_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  target_type TEXT,
  subject_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  gender TEXT,
  ethnicity TEXT,
  min_award NUMERIC(10,2),
  geographic_restrictions TEXT,
  essay_required BOOLEAN,
  recommendation_required BOOLEAN,
  academic_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_search_preferences ENABLE ROW LEVEL SECURITY;

-- Row Level Security policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- RLS for user_search_preferences referencing the owning profile
CREATE POLICY "Users can view own search preferences" ON public.user_search_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = public.user_search_preferences.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own search preferences" ON public.user_search_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = public.user_search_preferences.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own search preferences" ON public.user_search_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = public.user_search_preferences.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Indexes to support lookups
CREATE INDEX idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX idx_user_profiles_email_address ON public.user_profiles(email_address);
CREATE INDEX idx_user_search_preferences_user_id ON public.user_search_preferences(user_id);

-- Recreate updated_at triggers using the existing helper function
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_search_preferences_updated_at
  BEFORE UPDATE ON public.user_search_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Recreate the signup hook to insert rows into the new schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (auth_user_id, email_address)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (auth_user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Documentation comments
COMMENT ON TABLE public.user_profiles IS 'Extended user account data linked to Supabase auth.users via auth_user_id';
COMMENT ON TABLE public.user_search_preferences IS 'Normalized storage of nested User.searchPreferences object';

COMMIT;
