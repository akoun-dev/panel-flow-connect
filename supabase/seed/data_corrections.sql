-- Data corrections extracted from the consolidated schema migration

UPDATE panels
SET
  start_time = (date + time::interval),
  end_time = (date + time::interval + (duration || ' minutes')::interval),
  moderator_name = 'Modérateur',
  moderator_email = (SELECT email FROM users WHERE users.id = panels.user_id)
WHERE start_time IS NULL;

UPDATE panel_invitations
SET user_id = panels.user_id
FROM panels
WHERE panels.id = panel_invitations.panel_id
  AND panel_invitations.user_id IS NULL;

-- Fix mismatched panelist email
UPDATE panel_invitations
SET panelist_email = 'tmerguez1@gmail.com'
WHERE panelist_email = 'tmerguez@gmail.com';
