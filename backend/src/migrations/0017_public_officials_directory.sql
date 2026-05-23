-- Officials contact directory: home phone + visibility flag.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_phone text,
  ADD COLUMN IF NOT EXISTS directory_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.home_phone IS 'Home phone for officials directory.';
COMMENT ON COLUMN public.profiles.directory_visible IS 'When true, official appears in the signed-in officials contact directory.';
