-- Ajout du champ QR code à la table panels
ALTER TABLE public.panels
  ADD COLUMN qr_code TEXT UNIQUE DEFAULT gen_random_uuid()::text;
