-- Consolidate QR code fields
ALTER TABLE public.panels DROP COLUMN IF EXISTS qr_code;
DROP TABLE IF EXISTS public.panel_questions;

-- Ensure qr_code_url is populated for existing rows
UPDATE public.panels
SET qr_code_url = '/panel/' || id || '/questions'
WHERE qr_code_url IS NULL;
