ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_format;
-- NOT VALID keeps older local-format rows untouched; new and updated rows must be E.164
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_format CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$') NOT VALID;