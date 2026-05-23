-- Rename legacy directory phone columns (phone_2 / phone_3) to home_phone.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_phone text;

UPDATE public.profiles
SET home_phone = COALESCE(home_phone, phone_2)
WHERE phone_2 IS NOT NULL;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_2;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_3;

COMMENT ON COLUMN public.profiles.home_phone IS 'Home phone for officials directory.';
