-- Update QR code URLs to use /polls path
UPDATE public.panels
SET qr_code_url = regexp_replace(qr_code_url, '/questions$', '/polls')
WHERE qr_code_url LIKE '%/questions';
