-- Revert QR code URLs back to /questions
UPDATE public.panels
SET qr_code_url = regexp_replace(qr_code_url, '/polls$', '/questions')
WHERE qr_code_url LIKE '%/polls';
